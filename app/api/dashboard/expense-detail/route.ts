import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const expenseName = searchParams.get("expenseName");
    const fromDate = searchParams.get("fromDate");
    const toDate = searchParams.get("toDate");

    if (!expenseName || !fromDate || !toDate) {
      return NextResponse.json(
        { error: "Missing required parameters: expenseName, fromDate, toDate" },
        { status: 400 }
      );
    }

    const accountingService = session.user.accountingService;

    if (!accountingService || accountingService !== "QBO") {
      return NextResponse.json(
        { error: "Only QuickBooks Online is supported for expense details" },
        { status: 400 }
      );
    }

    // Import QBO helper functions
    const qboLib = await import("@/lib/qbo");

    // Get user's QBO token
    const token = await qboLib.getValidToken(session.user.id);

    if (!token?.access_token || !token?.realmId) {
      return NextResponse.json(
        { error: "No QBO connection found" },
        { status: 401 }
      );
    }

    const { environment } = qboLib.getIntuitEnv();
    const base =
      environment === "sandbox"
        ? "https://sandbox-quickbooks.api.intuit.com"
        : "https://quickbooks.api.intuit.com";

    const oauthClient = qboLib.createOAuthClient();
    oauthClient.setToken(token);

    // Fetch ProfitAndLossDetail report
    const realmId = encodeURIComponent(token.realmId);
    const profitLossDetailUrl = `${base}/v3/company/${realmId}/reports/ProfitAndLossDetail?start_date=${fromDate}&end_date=${toDate}&minorversion=75`;

    const profitLossDetailRes = await oauthClient.makeApiCall({
      url: profitLossDetailUrl,
      method: "GET",
      headers: { Accept: "application/json" },
    });

    const profitLossDetail =
      profitLossDetailRes.json || JSON.parse(profitLossDetailRes.body || "{}");

    // Extract expense details for the specific expense category
    const expenseDetails = extractExpenseDetails(profitLossDetail, expenseName);

    return NextResponse.json({
      expenseName,
      details: expenseDetails,
      report: profitLossDetail,
    });
  } catch (error) {
    console.error("Expense detail error:", error);
    return NextResponse.json(
      { error: "Failed to fetch expense details" },
      { status: 500 }
    );
  }
}

function extractExpenseDetails(
  report: any,
  expenseName: string
): Array<{
  date: string;
  transactionType: string;
  docNumber: string;
  name: string;
  class: string;
  memo: string;
  split: string;
  amount: number;
  balance: number;
}> {
  const details: Array<{
    date: string;
    transactionType: string;
    docNumber: string;
    name: string;
    class: string;
    memo: string;
    split: string;
    amount: number;
    balance: number;
  }> = [];

  if (!report?.Rows?.Row) {
    return details;
  }

  const rows = Array.isArray(report.Rows.Row)
    ? report.Rows.Row
    : [report.Rows.Row];

  // Recursive function to find the expense category and extract its details
  function findExpenseCategory(rows: any[]): void {
    for (const row of rows) {
      // Check if this is the expense category we're looking for
      if (row.Header && row.Header.ColData) {
        const headerValue = row.Header.ColData[0]?.value || "";
        const headerId = row.Header.ColData[0]?.id || "";

        // Check if this matches the expense name (exact match, case-insensitive)
        const normalizedHeader = headerValue.toLowerCase().trim();
        const normalizedExpense = expenseName.toLowerCase().trim();
        
        if (normalizedHeader === normalizedExpense) {
          // Found the expense category, extract all data rows
          if (row.Rows && row.Rows.Row) {
            const dataRows = Array.isArray(row.Rows.Row)
              ? row.Rows.Row
              : [row.Rows.Row];

            for (const dataRow of dataRows) {
              if (dataRow.type === "Data" && dataRow.ColData) {
                const colData = dataRow.ColData;
                const date = colData[0]?.value || "";
                const transactionType = colData[1]?.value || "";
                const docNumber = colData[2]?.value || "";
                const name = colData[3]?.value || "";
                const klass = colData[4]?.value || "";
                const memo = colData[5]?.value || "";
                const split = colData[6]?.value || "";
                const amountStr = colData[7]?.value || "0";
                const balanceStr = colData[8]?.value || "0";

                const amount =
                  typeof amountStr === "string"
                    ? parseFloat(amountStr.replace(/,/g, ""))
                    : amountStr;
                const balance =
                  typeof balanceStr === "string"
                    ? parseFloat(balanceStr.replace(/,/g, ""))
                    : balanceStr;

                if (!isNaN(amount)) {
                  details.push({
                    date,
                    transactionType,
                    docNumber,
                    name,
                    class: klass,
                    memo,
                    split,
                    amount: Math.abs(amount),
                    balance: Math.abs(balance),
                  });
                }
              }
            }
          }
        }
      }

      // Recursively search in nested rows
      let nestedRows = null;
      if (Array.isArray(row.Rows)) {
        nestedRows = row.Rows;
      } else if (row.Rows && row.Rows.Row) {
        nestedRows = Array.isArray(row.Rows.Row)
          ? row.Rows.Row
          : [row.Rows.Row];
      }

      if (nestedRows) {
        findExpenseCategory(nestedRows);
      }
    }
  }

  findExpenseCategory(rows);
  return details;
}
