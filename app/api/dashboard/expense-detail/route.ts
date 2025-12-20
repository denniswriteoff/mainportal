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

  // Build column index mapping from Columns metadata
  const columnMap: Record<string, number> = {};
  if (report.Columns && report.Columns.Column) {
    const columns = Array.isArray(report.Columns.Column)
      ? report.Columns.Column
      : [report.Columns.Column];
    
    columns.forEach((col: any, index: number) => {
      if (col.MetaData) {
        const metaDataArray = Array.isArray(col.MetaData)
          ? col.MetaData
          : [col.MetaData];
        
        const colKeyMeta = metaDataArray.find(
          (meta: any) => meta.Name === "ColKey"
        );
        if (colKeyMeta && colKeyMeta.Value) {
          columnMap[colKeyMeta.Value] = index;
        }
      }
    });
  }

  // Helper function to get column value by ColKey
  const getColumnValue = (colData: any[], colKey: string): string => {
    const index = columnMap[colKey];
    if (index !== undefined && colData[index] !== undefined) {
      return colData[index]?.value || "";
    }
    return "";
  };

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
                
                // Extract values using column mapping
                const date = getColumnValue(colData, "tx_date");
                const transactionType = getColumnValue(colData, "txn_type");
                const docNumber = getColumnValue(colData, "doc_num");
                const name = getColumnValue(colData, "name");
                const klass = getColumnValue(colData, "klass_name");
                const memo = getColumnValue(colData, "memo");
                const split = getColumnValue(colData, "split_acc");
                const amountStr = getColumnValue(colData, "subt_nat_amount_nt") || "0";
                const balanceStr = getColumnValue(colData, "rbal_nat_amount_nt") || "0";

                const amount =
                  typeof amountStr === "string"
                    ? parseFloat(amountStr.replace(/,/g, ""))
                    : amountStr;
                const balance =
                  typeof balanceStr === "string"
                    ? parseFloat(balanceStr.replace(/,/g, ""))
                    : balanceStr;

                // Only add if we have an amount (or at least some data)
                if (!isNaN(amount) || date || transactionType || name) {
                  details.push({
                    date,
                    transactionType,
                    docNumber,
                    name,
                    class: klass,
                    memo,
                    split,
                    amount: !isNaN(amount) ? Math.abs(amount) : 0,
                    balance: !isNaN(balance) ? Math.abs(balance) : 0,
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
