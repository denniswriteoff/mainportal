import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { getXeroProfitAndLoss, extractAccountValue } from "@/lib/xero-api";

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const yearParam = searchParams.get("year");
    const fromDateParam = searchParams.get("fromDate");
    const toDateParam = searchParams.get("toDate");
    const year = yearParam ? parseInt(yearParam) : undefined;

    const accountingService = session.user.accountingService;

    if (!accountingService) {
      return NextResponse.json({ trendData: [], year });
    }

    if (accountingService === "QBO") {
      const qboLib = await import("@/lib/qbo");
      
      try {
        const token = await qboLib.getValidToken(session.user.id);
        
        if (!token?.access_token || !token?.realmId) {
          return NextResponse.json({ 
            trendData: [], 
            year,
            error: "No QBO connection found" 
          });
        }

        const { environment } = qboLib.getIntuitEnv();
        const base = environment === "sandbox"
          ? "https://sandbox-quickbooks.api.intuit.com"
          : "https://quickbooks.api.intuit.com";

        const oauthClient = qboLib.createOAuthClient();
        oauthClient.setToken(token);
        const realmId = encodeURIComponent(token.realmId);

        const trendData = await generateQboMonthlyTrendData(oauthClient, realmId, year, base, fromDateParam, toDateParam);

        return NextResponse.json({ trendData, year, fromDate: fromDateParam, toDate: toDateParam });
      } catch (error) {
        console.error("QBO monthly data error:", error);
        return NextResponse.json({ 
          trendData: [], 
          year,
          error: "Failed to fetch QBO monthly data" 
        });
      }
    } else if (accountingService === "XERO") {
      const trendData = await generateXeroMonthlyTrendData(session.user.id, year, fromDateParam, toDateParam);
      
      return NextResponse.json({ trendData, year, fromDate: fromDateParam, toDate: toDateParam });
    }

    return NextResponse.json({ trendData: [], year });
  } catch (error) {
    console.error("Monthly trend data error:", error);
    return NextResponse.json(
      { error: "Failed to fetch monthly trend data" },
      { status: 500 }
    );
  }
}

// QBO Helper Functions
function extractQboProfitLossSummary(report: any): {
  revenue: number;
  operatingExpenses: number;
  costOfGoodsSold: number;
  otherExpenses: number;
} {
  const result = {
    revenue: 0,
    operatingExpenses: 0,
    costOfGoodsSold: 0,
    otherExpenses: 0,
  };

  if (!report?.Rows?.Row) {
    return result;
  }

  const rows = Array.isArray(report.Rows.Row) ? report.Rows.Row : [report.Rows.Row];

  for (const row of rows) {
    if (row.Summary && row.Summary.ColData) {
      const name = row.Summary.ColData[0]?.value || "";
      const value = row.Summary.ColData[1]?.value || "0";
      const numericValue = typeof value === "string" ? parseFloat(value.replace(/,/g, "")) : value;

      if (!isNaN(numericValue)) {
        switch (name) {
          case "Total Income":
            result.revenue = numericValue;
            break;
          case "Total Expenses":
            result.operatingExpenses = numericValue;
            break;
          case "Total Cost of Goods Sold":
            result.costOfGoodsSold = numericValue;
            break;
          case "Total Other Expenses":
            result.otherExpenses = numericValue;
            break;
        }
      }
    }
  }

  return result;
}

// Extract grouped expense categories (best-effort heuristic): cogs, subcontractors, ownerRelated, otherExpenses
function extractQboExpenseCategories(report: any): { cogs: number; subcontractors: number; ownerRelated: number; otherExpenses: number } {
  let cogs = 0;
  let subcontractors = 0;
  let ownerRelated = 0;
  let otherExpenses = 0;

  if (!report?.Rows?.Row) return { cogs, subcontractors, ownerRelated, otherExpenses };

  const rows = Array.isArray(report.Rows.Row) ? report.Rows.Row : [report.Rows.Row];

  function findExpenseSections(rows: any[]): any[] {
    const sections: any[] = [];
    for (const row of rows) {
      if (row.Header && row.Header.ColData) {
        const headerValue = row.Header.ColData[0]?.value;
        if (
          headerValue === "EXPENSES" ||
          headerValue === "OTHER EXPENSES" ||
          headerValue === "COST OF GOODS SOLD" ||
          headerValue === "COST OF SALES" ||
          headerValue === "COGS"
        ) {
          sections.push(row);
        }
      }

      let nestedRows = null;
      if (Array.isArray(row.Rows)) {
        nestedRows = row.Rows;
      } else if (row.Rows && row.Rows.Row) {
        nestedRows = Array.isArray(row.Rows.Row) ? row.Rows.Row : [row.Rows.Row];
      }

      if (nestedRows) {
        sections.push(...findExpenseSections(nestedRows));
      }
    }
    return sections;
  }

  const expenseSections = findExpenseSections(rows);

  for (const section of expenseSections) {
    if (section?.Rows?.Row) {
      const expenseRows = Array.isArray(section.Rows.Row) ? section.Rows.Row : [section.Rows.Row];
      for (const row of expenseRows) {
        if (row.type === "Data" && row.ColData) {
          const name = (row.ColData[0]?.value || "").toString();
          const valueRaw = row.ColData[1]?.value || "0";
          const numericValue = typeof valueRaw === 'string' ? parseFloat(valueRaw.replace(/,/g, '')) : valueRaw;
          if (!isNaN(numericValue) && numericValue > 0) {
            const lname = name.toLowerCase();
            if (lname.includes('subcontract')) {
              subcontractors += Math.abs(numericValue);
            } else if (lname.includes('owner')) {
              ownerRelated += Math.abs(numericValue);
            } else if (lname.includes('cost of goods') || lname.includes('cost of sales') || lname === 'cogs') {
              cogs += Math.abs(numericValue);
            } else {
              otherExpenses += Math.abs(numericValue);
            }
          }
        }
      }
    }
  }

  return { cogs, subcontractors, ownerRelated, otherExpenses };
}

async function generateQboMonthlyTrendData(
  oauthClient: any,
  realmId: string,
  year: number | undefined,
  base: string,
  fromDate?: string | null,
  toDate?: string | null
): Promise<Array<{ month: string; revenue: number; expenses: number; cogs?: number; subcontractors?: number; ownerRelated?: number; otherExpenses?: number }>> {
  const trendData = [];

  try {
    // Build month ranges based on fromDate/toDate or year
    const months: Array<{ start: Date; end: Date }> = [];
    if (fromDate && toDate) {
      const start = new Date(fromDate + 'T00:00:00');
      const end = new Date(toDate + 'T00:00:00');
      const cursor = new Date(start.getFullYear(), start.getMonth(), 1);
      while (cursor <= end) {
        const monthStart = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
        const monthEnd = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0);
        months.push({ start: monthStart, end: monthEnd });
        cursor.setMonth(cursor.getMonth() + 1);
      }
    } else if (typeof year === 'number') {
      for (let m = 0; m < 12; m++) {
        const monthStart = new Date(year, m, 1);
        const monthEnd = new Date(year, m + 1, 0);
        months.push({ start: monthStart, end: monthEnd });
      }
    }

    // Process months sequentially with delays to avoid rate limiting
    for (let mi = 0; mi < months.length; mi++) {
      const monthStart = months[mi].start;
      const monthEnd = months[mi].end;
      const fromDate = monthStart.toISOString().split("T")[0];
      const toDate = monthEnd.toISOString().split("T")[0];

      const profitLossUrl = `${base}/v3/company/${realmId}/reports/ProfitAndLoss?start_date=${fromDate}&end_date=${toDate}`;

      try {
        const response = await oauthClient.makeApiCall({
          url: profitLossUrl,
          method: "GET",
          headers: { Accept: "application/json" },
        });

        const profitLoss = response.json || JSON.parse(response.body || "{}");
        const { revenue, operatingExpenses, costOfGoodsSold, otherExpenses } = extractQboProfitLossSummary(profitLoss);
        const expenses = operatingExpenses + costOfGoodsSold + otherExpenses;
        const categories = extractQboExpenseCategories(profitLoss);

        trendData.push({
          month: monthStart.toLocaleDateString("en-US", { month: "short" }).toUpperCase(),
          revenue: Math.abs(revenue),
          expenses: Math.abs(expenses),
          cogs: Math.abs(categories.cogs || 0),
          subcontractors: Math.abs(categories.subcontractors || 0),
          ownerRelated: Math.abs(categories.ownerRelated || 0),
          otherExpenses: Math.abs(categories.otherExpenses || 0),
        });
      } catch (error: any) {
        // Handle rate limiting with retry
        if (error?.response?.status === 429) {
          console.log(`Rate limited for ${monthStart.toLocaleDateString('en-US', { month: 'short' })}, waiting before retry...`);
          const retryAfter = error.response.headers?.["retry-after"] || "1";
          const waitTime = parseInt(retryAfter) * 1000;
          await new Promise((resolve) => setTimeout(resolve, waitTime));

          // Retry the request
          try {
            const retryResponse = await oauthClient.makeApiCall({
              url: profitLossUrl,
              method: "GET",
              headers: { Accept: "application/json" },
            });

            const retryProfitLoss = retryResponse.json || JSON.parse(retryResponse.body || "{}");
            const { revenue, operatingExpenses, costOfGoodsSold, otherExpenses } = extractQboProfitLossSummary(retryProfitLoss);
            const expenses = operatingExpenses + costOfGoodsSold + otherExpenses;
            const categories = extractQboExpenseCategories(retryProfitLoss);

            trendData.push({
              month: monthStart.toLocaleDateString("en-US", { month: "short" }).toUpperCase(),
              revenue: Math.abs(revenue),
              expenses: Math.abs(expenses),
              cogs: Math.abs(categories.cogs || 0),
              subcontractors: Math.abs(categories.subcontractors || 0),
              ownerRelated: Math.abs(categories.ownerRelated || 0),
              otherExpenses: Math.abs(categories.otherExpenses || 0),
            });
          } catch (retryError) {
            console.error(`Failed retry for ${monthStart.toLocaleDateString('en-US', { month: 'short' })}:`, retryError);
            trendData.push({
              month: monthStart.toLocaleDateString("en-US", { month: "short" }).toUpperCase(),
              revenue: 0,
              expenses: 0,
              cogs: 0,
              subcontractors: 0,
              ownerRelated: 0,
              otherExpenses: 0,
            });
          }
        } else {
          console.error(`Error fetching data for ${monthStart.toLocaleDateString('en-US', { month: 'short' })}:`, error);
          trendData.push({
            month: monthStart.toLocaleDateString("en-US", { month: "short" }).toUpperCase(),
            revenue: 0,
            expenses: 0,
            cogs: 0,
            subcontractors: 0,
            ownerRelated: 0,
            otherExpenses: 0,
          });
        }
      }

      // Add delay between requests to stay under rate limit (~8 requests per second)
      if (mi < months.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 125));
      }
    }
  } catch (error) {
    console.error("QBO trend data generation error:", error);
  }

  return trendData;
}

// Xero Helper Functions
function extractTotalOperatingExpenses(report: any): number {
  if (!report?.reports || !Array.isArray(report.reports)) {
    return 0;
  }
  const costOfSales = extractAccountValue(report, ["Total Cost of Sales"]);

  for (const reportData of report.reports) {
    if (reportData.rows) {
      for (const row of reportData.rows) {
        if (
          row.rowType === "Section" &&
          row.title &&
          row.title.toLowerCase().includes("less operating expenses")
        ) {
          if (row.rows && Array.isArray(row.rows)) {
            for (const expenseRow of row.rows) {
              if (
                expenseRow.rowType === "SummaryRow" &&
                expenseRow.cells &&
                expenseRow.cells.length >= 2
              ) {
                const name = expenseRow.cells[0]?.value;
                const value = expenseRow.cells[1]?.value;

                if (
                  name &&
                  name.toString().toLowerCase().includes("total operating expenses")
                ) {
                  const numericValue = typeof value === "string" ? parseFloat(value) : value;
                  if (!isNaN(numericValue)) {
                    return Math.abs(numericValue) + costOfSales;
                  }
                }
              }
            }
          }
        }
      }
    }
  }
  return costOfSales;
}

async function generateXeroMonthlyTrendData(
  userId: string,
  year?: number | undefined,
  fromDateParam?: string | null,
  toDateParam?: string | null
): Promise<Array<{ month: string; revenue: number; expenses: number; cogs?: number; subcontractors?: number; ownerRelated?: number; otherExpenses?: number }>> {
  const trendData = [];

  try {
    const months: Array<{ start: Date; end: Date }> = [];
    if (fromDateParam && toDateParam) {
      const start = new Date(fromDateParam + 'T00:00:00');
      const end = new Date(toDateParam + 'T00:00:00');
      const cursor = new Date(start.getFullYear(), start.getMonth(), 1);
      while (cursor <= end) {
        const monthStart = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
        const monthEnd = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0);
        months.push({ start: monthStart, end: monthEnd });
        cursor.setMonth(cursor.getMonth() + 1);
      }
    } else if (typeof year === 'number') {
      for (let m = 0; m < 12; m++) {
        const monthStart = new Date(year, m, 1);
        const monthEnd = new Date(year, m + 1, 0);
        months.push({ start: monthStart, end: monthEnd });
      }
    }

    for (let mi = 0; mi < months.length; mi++) {
      const monthStart = months[mi].start;
      const monthEnd = months[mi].end;
      const fromDate = monthStart.toISOString().split('T')[0];
      const toDate = monthEnd.toISOString().split('T')[0];

      try {
        const profitLoss = await getXeroProfitAndLoss(userId, { fromDate, toDate });

        const revenue = extractAccountValue(profitLoss, ['Total Income']);
        const expenses = extractTotalOperatingExpenses(profitLoss);

        trendData.push({
          month: monthStart.toLocaleDateString('en-US', { month: 'short' }).toUpperCase(),
          revenue: Math.abs(revenue),
          expenses: Math.abs(expenses),
          cogs: Math.abs(extractAccountValue(profitLoss, ['Total Cost of Sales']) || 0),
          subcontractors: 0,
          ownerRelated: 0,
          otherExpenses: Math.abs(expenses - (extractAccountValue(profitLoss, ['Total Cost of Sales']) || 0)),
        });
      } catch (error) {
        console.error(`Error fetching Xero data for ${monthStart.getMonth() + 1}/${monthStart.getFullYear()}:`, error);
        trendData.push({
          month: monthStart.toLocaleDateString('en-US', { month: 'short' }).toUpperCase(),
          revenue: 0,
          expenses: 0,
          cogs: 0,
          subcontractors: 0,
          ownerRelated: 0,
          otherExpenses: 0,
        });
      }
    }
  } catch (error) {
    console.error('Xero trend data generation error:', error);
  }

  return trendData;
}

