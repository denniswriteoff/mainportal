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
    const timeframe = searchParams.get("timeframe") || "YEAR";
    const fromDate = searchParams.get("fromDate");
    const toDate = searchParams.get("toDate");

    const accountingService = session.user.accountingService;

    if (!accountingService || !fromDate || !toDate) {
      return NextResponse.json({ 
        previousPeriodData: [],
        timeframe: { from: fromDate, to: toDate, type: timeframe }
      });
    }

    if (accountingService === "QBO") {
      const qboLib = await import("@/lib/qbo");
      
      try {
        const token = await qboLib.getValidToken(session.user.id);
        
        if (!token?.access_token || !token?.realmId) {
          return NextResponse.json({ 
            previousPeriodData: [],
            timeframe: { from: fromDate, to: toDate, type: timeframe },
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

        const previousPeriodData = await getQboPreviousPeriodData(
          oauthClient,
          realmId,
          timeframe,
          fromDate,
          toDate,
          base
        );

        return NextResponse.json({ 
          previousPeriodData,
          timeframe: { from: fromDate, to: toDate, type: timeframe }
        });
      } catch (error) {
        console.error("QBO previous period data error:", error);
        return NextResponse.json({ 
          previousPeriodData: [],
          timeframe: { from: fromDate, to: toDate, type: timeframe },
          error: "Failed to fetch QBO previous period data" 
        });
      }
    } else if (accountingService === "XERO") {
      const previousPeriodData = await getXeroPreviousPeriodData(
        session.user.id,
        timeframe,
        fromDate,
        toDate
      );

      return NextResponse.json({ 
        previousPeriodData,
        timeframe: { from: fromDate, to: toDate, type: timeframe }
      });
    }

    return NextResponse.json({ 
      previousPeriodData: [],
      timeframe: { from: fromDate, to: toDate, type: timeframe }
    });
  } catch (error) {
    console.error("Previous period data error:", error);
    return NextResponse.json(
      { error: "Failed to fetch previous period data" },
      { status: 500 }
    );
  }
}

// QBO Helper Functions
function extractQboExpenseBreakdown(report: any): Array<{ name: string; value: number; percentage: number }> {
  const expenses: Array<{ name: string; value: number }> = [];
  let totalExpenses = 0;

  if (!report?.Rows?.Row) {
    return [];
  }

  const rows = Array.isArray(report.Rows.Row) ? report.Rows.Row : [report.Rows.Row];

  function findExpenseSections(rows: any[]): any[] {
    const sections = [];

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
          const name = row.ColData[0]?.value || "";
          const value = row.ColData[1]?.value || "0";

          if (name && !name.toLowerCase().includes("total")) {
            const numericValue = typeof value === "string" ? parseFloat(value.replace(/,/g, "")) : value;

            if (!isNaN(numericValue) && numericValue > 0) {
              expenses.push({ name, value: Math.abs(numericValue) });
              totalExpenses += Math.abs(numericValue);
            }
          }
        }
      }
    }
  }

  return expenses
    .map((expense) => ({
      ...expense,
      percentage: totalExpenses > 0 ? (expense.value / totalExpenses) * 100 : 0,
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 10);
}

async function getQboPreviousPeriodData(
  oauthClient: any,
  realmId: string,
  timeframe: string,
  fromDate: string,
  toDate: string,
  base: string
): Promise<Array<{ name: string; value: number }>> {
  try {
    let previousFromDate: string;
    let previousToDate: string;

    if (timeframe === "YEAR") {
      const currentYear = new Date(fromDate).getFullYear();
      const previousYear = currentYear - 1;
      previousFromDate = `${previousYear}-01-01`;
      previousToDate = `${previousYear}-12-31`;
    } else {
      const currentDate = new Date(fromDate);
      const previousMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);
      const previousMonthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth(), 0);
      previousFromDate = previousMonth.toISOString().split("T")[0];
      previousToDate = previousMonthEnd.toISOString().split("T")[0];
    }

    const profitLossUrl = `${base}/v3/company/${realmId}/reports/ProfitAndLoss?start_date=${previousFromDate}&end_date=${previousToDate}`;
    const response = await oauthClient.makeApiCall({
      url: profitLossUrl,
      method: "GET",
      headers: { Accept: "application/json" },
    });

    const previousProfitLoss = response.json || JSON.parse(response.body || "{}");
    return extractQboExpenseBreakdown(previousProfitLoss);
  } catch (error) {
    console.error("QBO previous period data fetch error:", error);
    return [];
  }
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

function extractXeroExpenseBreakdown(
  report: any
): Array<{ name: string; value: number; percentage: number }> {
  const expenses: Array<{ name: string; value: number }> = [];
  const costOfSales = extractAccountValue(report, ["Total Cost of Sales"]);
  let totalExpenses = costOfSales || 0;

  if (costOfSales > 0) {
    expenses.push({ name: "Cost of Sales", value: costOfSales });
  }

  if (!report?.Reports || !Array.isArray(report.Reports)) {
    return [];
  }

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
                expenseRow.RowType === "Row" &&
                expenseRow.Cells &&
                expenseRow.Cells.length >= 2
              ) {
                const name = expenseRow.Cells[0]?.Value;
                const value = expenseRow.Cells[1]?.Value;

                if (name && value) {
                  const expenseName = name.toString();
                  const numericValue = typeof value === "string" ? parseFloat(value) : value;

                  if (
                    !expenseName.toLowerCase().includes("total operating expenses") &&
                    !isNaN(numericValue) &&
                    numericValue > 0
                  ) {
                    expenses.push({ name: expenseName, value: numericValue });
                    totalExpenses += numericValue;
                  }
                }
              }
            }
          }
        }
      }
    }
  }

  return expenses
    .map((expense) => ({
      ...expense,
      percentage: totalExpenses > 0 ? (expense.value / totalExpenses) * 100 : 0,
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 10);
}

async function getXeroPreviousPeriodData(
  userId: string,
  timeframe: string,
  fromDate: string,
  toDate: string
): Promise<Array<{ name: string; value: number }>> {
  try {
    let previousFromDate: string;
    let previousToDate: string;

    if (timeframe === "YEAR") {
      const currentYear = new Date(fromDate).getFullYear();
      const previousYear = currentYear - 1;
      previousFromDate = `${previousYear}-01-01`;
      previousToDate = `${previousYear}-12-31`;
    } else {
      const currentDate = new Date(fromDate);
      const previousMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);
      const previousMonthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth(), 0);
      previousFromDate = previousMonth.toISOString().split("T")[0];
      previousToDate = previousMonthEnd.toISOString().split("T")[0];
    }

    const previousProfitLoss = await getXeroProfitAndLoss(userId, {
      fromDate: previousFromDate,
      toDate: previousToDate,
    });

    if (!previousProfitLoss) {
      return [];
    }

    return extractXeroExpenseBreakdown(previousProfitLoss);
  } catch (error) {
    console.error("Xero previous period data fetch error:", error);
    return [];
  }
}

