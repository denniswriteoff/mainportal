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
    const year = parseInt(searchParams.get("year") || new Date().getFullYear().toString());

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

        const trendData = await generateQboMonthlyTrendData(oauthClient, realmId, year, base);

        return NextResponse.json({ trendData, year });
      } catch (error) {
        console.error("QBO monthly data error:", error);
        return NextResponse.json({ 
          trendData: [], 
          year,
          error: "Failed to fetch QBO monthly data" 
        });
      }
    } else if (accountingService === "XERO") {
      const trendData = await generateXeroMonthlyTrendData(session.user.id, year);
      
      return NextResponse.json({ trendData, year });
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

async function generateQboMonthlyTrendData(
  oauthClient: any,
  realmId: string,
  year: number,
  base: string
): Promise<Array<{ month: string; revenue: number; expenses: number }>> {
  const trendData = [];

  try {
    // Process months sequentially with delays to avoid rate limiting
    for (let month = 1; month <= 12; month++) {
      const monthStart = new Date(year, month - 1, 1);
      const monthEnd = new Date(year, month, 0);
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

        trendData.push({
          month: monthStart.toLocaleDateString("en-US", { month: "short" }).toUpperCase(),
          revenue: Math.abs(revenue),
          expenses: Math.abs(expenses),
        });
      } catch (error: any) {
        // Handle rate limiting with retry
        if (error?.response?.status === 429) {
          console.log(`Rate limited for month ${month}, waiting before retry...`);
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

            trendData.push({
              month: monthStart.toLocaleDateString("en-US", { month: "short" }).toUpperCase(),
              revenue: Math.abs(revenue),
              expenses: Math.abs(expenses),
            });
          } catch (retryError) {
            console.error(`Failed retry for month ${month}:`, retryError);
            trendData.push({
              month: monthStart.toLocaleDateString("en-US", { month: "short" }).toUpperCase(),
              revenue: 0,
              expenses: 0,
            });
          }
        } else {
          console.error(`Error fetching data for month ${month}:`, error);
          trendData.push({
            month: monthStart.toLocaleDateString("en-US", { month: "short" }).toUpperCase(),
            revenue: 0,
            expenses: 0,
          });
        }
      }

      // Add delay between requests to stay under rate limit (~8 requests per second)
      if (month < 12) {
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
  if (!report?.Reports || !Array.isArray(report.Reports)) {
    return 0;
  }
  const costOfSales = extractAccountValue(report, ["Total Cost of Sales"]);

  for (const reportData of report.Reports) {
    if (reportData.Rows) {
      for (const row of reportData.Rows) {
        if (
          row.RowType === "Section" &&
          row.Title &&
          row.Title.toLowerCase().includes("less operating expenses")
        ) {
          if (row.Rows && Array.isArray(row.Rows)) {
            for (const expenseRow of row.Rows) {
              if (
                expenseRow.RowType === "SummaryRow" &&
                expenseRow.Cells &&
                expenseRow.Cells.length >= 2
              ) {
                const name = expenseRow.Cells[0]?.Value;
                const value = expenseRow.Cells[1]?.Value;

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
  year: number
): Promise<Array<{ month: string; revenue: number; expenses: number }>> {
  const trendData = [];

  try {
    // Get data for each month of the year
    for (let month = 1; month <= 12; month++) {
      const monthStart = new Date(year, month - 1, 1);
      const monthEnd = new Date(year, month, 0);
      const fromDate = monthStart.toISOString().split("T")[0];
      const toDate = monthEnd.toISOString().split("T")[0];

      try {
        const profitLoss = await getXeroProfitAndLoss(userId, {
          fromDate,
          toDate,
        });

        const revenue = extractAccountValue(profitLoss, ["Total Income"]);
        const expenses = extractTotalOperatingExpenses(profitLoss);

        trendData.push({
          month: monthStart.toLocaleDateString("en-US", { month: "short" }).toUpperCase(),
          revenue: Math.abs(revenue),
          expenses: Math.abs(expenses),
        });
      } catch (error) {
        console.error(`Error fetching Xero data for ${month}/${year}:`, error);
        // Add zero values for months with errors
        trendData.push({
          month: monthStart.toLocaleDateString("en-US", { month: "short" }).toUpperCase(),
          revenue: 0,
          expenses: 0,
        });
      }
    }
  } catch (error) {
    console.error("Xero trend data generation error:", error);
  }

  return trendData;
}

