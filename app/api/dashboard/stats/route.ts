import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import {
  getXeroProfitAndLoss,
  getXeroBalanceSheet,
  extractAccountValue,
} from "@/lib/xero-api";

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

    if (!accountingService) {
      return NextResponse.json({
        kpis: {
          revenue: 0,
          expenses: 0,
          netProfit: 0,
          netMargin: 0,
          cashBalance: 0,
        },
        expenseBreakdown: [],
        trendData: [],
        payments: [],
        timeframe: {
          from: "",
          to: "",
          type: timeframe,
        },
      });
    }

    if (accountingService === "QBO") {
      // Import QBO helper functions
      const qboLib = await import("@/lib/qbo");
      
      try {
        // Get user's QBO token
        const token = await qboLib.getValidToken(session.user.id);
        
        if (!token?.access_token || !token?.realmId) {
          return NextResponse.json({
            kpis: {
              revenue: 0,
              expenses: 0,
              netProfit: 0,
              netMargin: 0,
              cashBalance: 0,
            },
            expenseBreakdown: [],
            timeframe: {
              from: fromDate || "",
              to: toDate || "",
              type: timeframe,
            },
            error: "No QBO connection found",
          });
        }

        // Calculate date ranges
        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth() + 1;

        let fromDateStr = fromDate;
        let toDateStr = toDate;

        if (!fromDateStr || !toDateStr) {
          if (timeframe === "YEAR") {
            fromDateStr = `${currentYear}-01-01`;
            toDateStr = `${currentYear}-12-31`;
          } else if (timeframe === "MONTH") {
            const monthStart = new Date(currentYear, currentMonth - 1, 1);
            const monthEnd = new Date(currentYear, currentMonth, 0);
            fromDateStr = monthStart.toISOString().split("T")[0];
            toDateStr = monthEnd.toISOString().split("T")[0];
          }
        }

        const { environment } = qboLib.getIntuitEnv();
        const base = environment === "sandbox"
          ? "https://sandbox-quickbooks.api.intuit.com"
          : "https://quickbooks.api.intuit.com";

        const oauthClient = qboLib.createOAuthClient();
        oauthClient.setToken(token);

        // Fetch P&L, Balance Sheet, and Company Info
        const realmId = encodeURIComponent(token.realmId);
        const profitLossUrl = `${base}/v3/company/${realmId}/reports/ProfitAndLoss?start_date=${fromDateStr}&end_date=${toDateStr}`;
        const balanceSheetUrl = `${base}/v3/company/${realmId}/reports/BalanceSheet?start_date=${fromDateStr}&end_date=${toDateStr}`;
        const companyInfoUrl = `${base}/v3/company/${realmId}/companyinfo/${realmId}`;
        
        const [profitLossRes, balanceSheetRes, companyInfoRes] = await Promise.all([
          oauthClient.makeApiCall({ url: profitLossUrl, method: "GET", headers: { Accept: "application/json" } }),
          oauthClient.makeApiCall({ url: balanceSheetUrl, method: "GET", headers: { Accept: "application/json" } }),
          oauthClient.makeApiCall({ url: companyInfoUrl, method: "GET", headers: { Accept: "application/json" } }),
        ]);

        const profitLoss = profitLossRes.json || JSON.parse(profitLossRes.body || "{}");
        const balanceSheet = balanceSheetRes.json || JSON.parse(balanceSheetRes.body || "{}");
        const companyInfo = companyInfoRes.json || JSON.parse(companyInfoRes.body || "{}");

        // Process P&L data
        const { revenue, operatingExpenses, costOfGoodsSold, netProfit } = extractQboProfitLossSummary(profitLoss);
        // Keep operating expenses and cost of goods sold separate for dashboard tiles
        const expenses = operatingExpenses;

        const netMargin = revenue > 0 ? (netProfit / revenue) * 100 : 0;

        // Process Balance Sheet data
        const { cashBalance } = extractQboBalanceSheetSummary(balanceSheet);

        // Process expense breakdown
        const expenseBreakdown = extractQboExpenseBreakdown(profitLoss);

        // Compute static cash runway based on current cash and last month's expenses
        let cashRunway: number | null = null;
        try {
          const now = new Date();
          const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
          const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
          const lastFrom = lastMonthStart.toISOString().split('T')[0];
          const lastTo = lastMonthEnd.toISOString().split('T')[0];

          const lastProfitLossRes = await oauthClient.makeApiCall({
            url: `${base}/v3/company/${realmId}/reports/ProfitAndLoss?start_date=${lastFrom}&end_date=${lastTo}`,
            method: 'GET',
            headers: { Accept: 'application/json' },
          });

          const lastProfitLoss = lastProfitLossRes.json || JSON.parse(lastProfitLossRes.body || '{}');
          const { operatingExpenses: lastOperatingExpenses, costOfGoodsSold: lastCogs } = extractQboProfitLossSummary(lastProfitLoss);
          const lastMonthExpenses = Math.abs((lastOperatingExpenses || 0) + (lastCogs || 0));

          if (lastMonthExpenses > 0) {
            cashRunway = (Math.abs(cashBalance) || 0) / lastMonthExpenses;
          }
        } catch (err) {
          console.warn('Failed to compute last month expenses for cash runway (QBO):', err);
          cashRunway = null;
        }

        return NextResponse.json({
          organisation: {
            name: companyInfo?.CompanyInfo?.CompanyName || "Unknown",
            shortCode: companyInfo?.CompanyInfo?.LegalName || "",
          },
          kpis: {
            revenue: Math.abs(revenue),
            // expose operating expenses separately
            expenses: Math.abs(expenses),
            costOfGoodsSold: Math.abs(costOfGoodsSold),
            netProfit: netProfit,
            netMargin,
            cashBalance: Math.abs(cashBalance),
            cashRunway,
          },
          expenseBreakdown,
          timeframe: {
            from: fromDateStr,
            to: toDateStr,
            type: timeframe,
          },
        });
      } catch (error) {
        console.error("QBO dashboard error:", error);
        return NextResponse.json({
          kpis: {
            revenue: 0,
            expenses: 0,
            netProfit: 0,
            netMargin: 0,
            cashBalance: 0,
          },
          expenseBreakdown: [],
          timeframe: {
            from: fromDate || "",
            to: toDate || "",
            type: timeframe,
          },
          error: "Failed to fetch QBO data",
        });
      }
    } else if (accountingService === "XERO") {
      // Calculate date ranges
      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth() + 1;

      let fromDateStr = fromDate;
      let toDateStr = toDate;

      if (!fromDateStr || !toDateStr) {
        if (timeframe === "YEAR") {
          fromDateStr = `${currentYear}-01-01`;
          toDateStr = `${currentYear}-12-31`;
        } else if (timeframe === "MONTH") {
          const monthStart = new Date(currentYear, currentMonth - 1, 1);
          const monthEnd = new Date(currentYear, currentMonth, 0);
          fromDateStr = monthStart.toISOString().split("T")[0];
          toDateStr = monthEnd.toISOString().split("T")[0];
        }
      }

      // Fetch data from Xero
      const [profitLoss, balanceSheet] = await Promise.all([
        getXeroProfitAndLoss(session.user.id, {
          fromDate: fromDateStr || undefined,
          toDate: toDateStr || undefined,
        }).catch(() => null),
        getXeroBalanceSheet(session.user.id, toDateStr || undefined).catch(
          () => null
        ),
      ]);

      // Handle null responses gracefully
      if (!profitLoss || !balanceSheet) {
        console.warn("Xero API returned null - authentication may need refresh");
        return NextResponse.json({
          kpis: {
            revenue: 0,
            expenses: 0,
            netProfit: 0,
            netMargin: 0,
            cashBalance: 0,
          },
          expenseBreakdown: [],
          timeframe: {
            from: fromDateStr || "",
            to: toDateStr || "",
            type: timeframe,
          },
          error:
            "Unable to fetch Xero data. Please re-authenticate your Xero account.",
        });
      }

      // Process P&L data
      const revenue = extractAccountValue(profitLoss, ["Total Income"]);
      const expenses = extractTotalOperatingExpenses(profitLoss);
      const netProfit = extractAccountValue(profitLoss, ["Net Profit"]);

      const netMargin = revenue > 0 ? (netProfit / revenue) * 100 : 0;

      // Process Balance Sheet data
      const cashBalance = extractAccountValue(balanceSheet, ["Total Bank"]);

      // Process expense breakdown
      const expenseBreakdown = extractExpenseBreakdown(profitLoss);

      // Compute static cash runway based on current cash and last month's expenses
      let cashRunway: number | null = null;
      try {
        const now = new Date();
        const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
        const lastFrom = lastMonthStart.toISOString().split('T')[0];
        const lastTo = lastMonthEnd.toISOString().split('T')[0];

        const lastProfitLoss = await getXeroProfitAndLoss(session.user.id, { fromDate: lastFrom, toDate: lastTo }).catch(() => null);
        if (lastProfitLoss) {
          const lastMonthExpenses = extractTotalOperatingExpenses(lastProfitLoss);
          if (lastMonthExpenses > 0) {
            cashRunway = (Math.abs(cashBalance) || 0) / lastMonthExpenses;
          }
        }
      } catch (err) {
        console.warn('Failed to compute last month expenses for cash runway (Xero):', err);
        cashRunway = null;
      }

      return NextResponse.json({
        kpis: {
          revenue,
          expenses,
          netProfit,
          netMargin,
          cashBalance,
          cashRunway,
        },
        expenseBreakdown,
        timeframe: {
          from: fromDateStr,
          to: toDateStr,
          type: timeframe,
        },
      });
    }

    return NextResponse.json({
      kpis: {
        revenue: 0,
        expenses: 0,
        netProfit: 0,
        netMargin: 0,
        cashBalance: 0,
      },
      expenseBreakdown: [],
      timeframe: {
        from: "",
        to: "",
        type: timeframe,
      },
    });
  } catch (error) {
    console.error("Dashboard stats error:", error);
    return NextResponse.json(
      { error: "Failed to fetch dashboard data" },
      { status: 500 }
    );
  }
}

// Helper functions for QBO
function extractQboProfitLossSummary(report: any): {
  revenue: number;
  operatingExpenses: number;
  costOfGoodsSold: number;
  otherExpenses: number;
  netProfit: number;
} {
  const result = {
    revenue: 0,
    operatingExpenses: 0,
    costOfGoodsSold: 0,
    otherExpenses: 0,
    netProfit: 0,
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
          case "PROFIT":
            result.netProfit = numericValue;
            break;
        }
      }
    }
  }

  return result;
}

function extractQboBalanceSheetSummary(report: any): {
  cashBalance: number;
} {
  const result = {
    cashBalance: 0,
  };

  if (!report?.Rows?.Row) {
    return result;
  }

  const rows = Array.isArray(report.Rows.Row) ? report.Rows.Row : [report.Rows.Row];

  // Recursive function to search through nested rows for the cash summary
  function findCashSummary(rows: any[]): number {
    for (const row of rows) {
      // Check if this is the Summary section for "Total Cash and Cash Equivalent"
      if (row.Summary && row.Summary.ColData) {
        const name = row.Summary.ColData[0]?.value || "";
        const value = row.Summary.ColData[1]?.value || "0";
        const numericValue = typeof value === "string" ? parseFloat(value.replace(/,/g, "")) : value;

        if (name === "Total Cash and Cash Equivalent" && !isNaN(numericValue)) {
          return numericValue;
        }
      }

      // Recursively search in nested rows
      let nestedRows = null;
      if (Array.isArray(row.Rows)) {
        nestedRows = row.Rows;
      } else if (row.Rows && row.Rows.Row) {
        nestedRows = Array.isArray(row.Rows.Row) ? row.Rows.Row : [row.Rows.Row];
      }

      if (nestedRows) {
        const nestedResult = findCashSummary(nestedRows);
        if (nestedResult !== 0) {
          return nestedResult;
        }
      }
    }
    return 0;
  }

  result.cashBalance = findCashSummary(rows);
  return result;
}

function extractQboExpenseBreakdown(report: any): Array<{ name: string; value: number; percentage: number }> {
  const expenses: Array<{ name: string; value: number }> = [];
  let totalExpenses = 0;

  if (!report?.Rows?.Row) {
    return [];
  }

  const rows = Array.isArray(report.Rows.Row) ? report.Rows.Row : [report.Rows.Row];

  // Find the EXPENSES, OTHER EXPENSES, and COST OF GOODS SOLD sections
  function findExpenseSections(rows: any[]): any[] {
    const sections = [];

    for (const row of rows) {
      // Check if this is an expense section
      if (row.Header && row.Header.ColData) {
        const headerValue = row.Header.ColData[0]?.value;
        if (
          headerValue === "EXPENSES" ||
          headerValue === "OTHER EXPENSES"
        ) {
          sections.push(row);
        }
      }

      // Recursively search in nested rows
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

  // Extract individual expense items from all expense sections
  for (const section of expenseSections) {
    if (section?.Rows?.Row) {
      const expenseRows = Array.isArray(section.Rows.Row) ? section.Rows.Row : [section.Rows.Row];

      for (const row of expenseRows) {
        if (row.type === "Data" && row.ColData) {
          const name = row.ColData[0]?.value || "";
          const value = row.ColData[1]?.value || "0";

          if (name && !name.toLowerCase().includes("total")) {
            const numericValue = typeof value === "string" ? parseFloat(value.replace(/,/g, "")) : value;

            if (!isNaN(numericValue)) {
              expenses.push({ name, value: Math.abs(numericValue) });
              totalExpenses += Math.abs(numericValue);
            }
          }
        }
      }
    }
  }

  // Calculate percentages and sort by value
  return expenses
    .map((expense) => ({
      ...expense,
      percentage: totalExpenses > 0 ? (expense.value / totalExpenses) * 100 : 0,
    }))
    .sort((a, b) => b.value - a.value);
}


// Helper functions for Xero
function extractTotalOperatingExpenses(report: any): number {
  if (!report?.reports || !Array.isArray(report.reports)) {
    return 0;
  }
  const costOfSales = extractAccountValue(report, ["Total Cost of Sales"]);

  for (const reportData of report.reports) {
    if (reportData.rows) {
      for (const row of reportData.rows) {
        // Check if this is the "Less Operating Expenses" section
        if (
          row.rowType === "Section" &&
          row.title &&
          row.title.toLowerCase().includes("less operating expenses")
        ) {
          if (row.rows && Array.isArray(row.rows)) {
            for (const expenseRow of row.rows) {
              // Look for the "Total Operating Expenses" summary row
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
                  const numericValue =
                    typeof value === "string" ? parseFloat(value) : value;
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

function extractExpenseBreakdown(
  report: any
): Array<{ name: string; value: number; percentage: number }> {
  const expenses: Array<{ name: string; value: number }> = [];
  const costOfSales = extractAccountValue(report, ["Total Cost of Sales"]);
  let totalExpenses = costOfSales || 0;

  if (costOfSales > 0) {
    expenses.push({ name: "Cost of Sales", value: costOfSales });
  }

  if (!report?.reports || !Array.isArray(report.reports)) {
    return [];
  }

  for (const reportData of report.reports) {
    if (reportData.rows) {
      for (const row of reportData.rows) {
        // Check if this is the "Less Operating Expenses" section
        if (
          row.rowType === "Section" &&
          row.title &&
          row.title.toLowerCase().includes("less operating expenses")
        ) {
          if (row.rows && Array.isArray(row.rows)) {
            for (const expenseRow of row.rows) {
              if (
                expenseRow.rowType === "Row" &&
                expenseRow.cells &&
                expenseRow.cells.length >= 2
              ) {
                const name = expenseRow.cells[0]?.value;
                const value = expenseRow.cells[1]?.value;

                if (name && value) {
                  const expenseName = name.toString();
                  const numericValue =
                    typeof value === "string" ? parseFloat(value) : value;

                  // Skip the "Total Operating Expenses" summary row
                  if (
                    !expenseName.toLowerCase().includes("total operating expenses") &&
                    !isNaN(numericValue)
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

  // Calculate percentages and sort by value
  return expenses
    .map((expense) => ({
      ...expense,
      percentage: totalExpenses > 0 ? (expense.value / totalExpenses) * 100 : 0,
    }))
    .sort((a, b) => b.value - a.value);
}

