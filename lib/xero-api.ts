import axios from "axios";
import { getXeroToken, refreshXeroToken } from "./xero";

const XERO_API_URL = "https://api.xero.com/api.xro/2.0";

/**
 * Handle Xero API rate limits with exponential backoff
 * Xero limits: 60 calls/minute per organization, 5,000 calls/day
 */
async function handleRateLimit(
  requestFn: () => Promise<any>,
  maxRetries: number = 3
): Promise<any> {
  let lastError: any;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await requestFn();
    } catch (error: any) {
      lastError = error;
      
      // Check if it's a rate limit error (429)
      if (error.response?.status === 429) {
        const retryAfter = error.response?.headers?.['retry-after'] || 
                          error.response?.headers?.['Retry-After'];
        
        if (retryAfter && attempt < maxRetries) {
          const waitTime = parseInt(retryAfter, 10) * 1000; // Convert to milliseconds
          console.log(`Rate limit hit. Waiting ${waitTime}ms before retry (attempt ${attempt + 1}/${maxRetries})...`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
          continue;
        } else if (attempt < maxRetries) {
          // Exponential backoff: 2^attempt seconds
          const waitTime = Math.min(1000 * Math.pow(2, attempt), 30000); // Max 30 seconds
          console.log(`Rate limit hit. Exponential backoff: waiting ${waitTime}ms (attempt ${attempt + 1}/${maxRetries})...`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
          continue;
        }
      }
      
      // If not a rate limit error or max retries reached, throw
      throw error;
    }
  }
  
  throw lastError;
}

/**
 * Delay between requests to avoid hitting rate limits
 * Xero allows 60 calls/minute, so we need ~1 second between calls
 */
export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Get Xero Reports (Profit & Loss)
 */
export async function getXeroProfitAndLoss(
  userId: string,
  options?: {
    fromDate?: string;
    toDate?: string;
  }
) {
  let token = await getXeroToken(userId);
  if (!token) throw new Error("No Xero token found");

  try {
    const params = new URLSearchParams();
    if (options?.fromDate) params.append("fromDate", options.fromDate);
    if (options?.toDate) params.append("toDate", options.toDate);

    const response = await handleRateLimit(() =>
      axios.get(
        `${XERO_API_URL}/Reports/ProfitAndLoss?${params.toString()}`,
        {
          headers: {
            Authorization: `Bearer ${token.accessToken}`,
            "xero-tenant-id": token.tenantId,
            Accept: "application/json",
          },
        }
      )
    );

    return response.data;
  } catch (error: any) {
    // If 403 Forbidden (auth error), try refreshing token and retry ONCE
    if (error.response?.status === 403 && error.response?.data?.Detail === "AuthenticationUnsuccessful") {
      console.log("Token expired, attempting refresh...");
      try {
        token = await refreshXeroToken(token.id);
        
        const params = new URLSearchParams();
        if (options?.fromDate) params.append("fromDate", options.fromDate);
        if (options?.toDate) params.append("toDate", options.toDate);

        const retryResponse = await handleRateLimit(() =>
          axios.get(
            `${XERO_API_URL}/Reports/ProfitAndLoss?${params.toString()}`,
            {
              headers: {
                Authorization: `Bearer ${token.accessToken}`,
                "xero-tenant-id": token.tenantId,
                Accept: "application/json",
              },
            }
          )
        );

        return retryResponse.data;
      } catch (refreshError: any) {
        console.error("P&L report failed after token refresh:", refreshError.response?.status);
        // Return null instead of throwing - let caller handle gracefully
        return null;
      }
    }
    console.error("Error fetching P&L report:", error.message);
    // Return null instead of throwing - let caller handle gracefully
    return null;
  }
}

/**
 * Get Xero Reports (Balance Sheet)
 */
export async function getXeroBalanceSheet(
  userId: string,
  date?: string
) {
  let token = await getXeroToken(userId);
  if (!token) throw new Error("No Xero token found");

  try {
    const params = new URLSearchParams();
    if (date) params.append("date", date);

    const response = await handleRateLimit(() =>
      axios.get(
        `${XERO_API_URL}/Reports/BalanceSheet?${params.toString()}`,
        {
          headers: {
            Authorization: `Bearer ${token.accessToken}`,
            "xero-tenant-id": token.tenantId,
            Accept: "application/json",
          },
        }
      )
    );

    return response.data;
  } catch (error: any) {
    // If 403 Forbidden (auth error), try refreshing token and retry ONCE
    if (error.response?.status === 403 && error.response?.data?.Detail === "AuthenticationUnsuccessful") {
      console.log("Token expired, attempting refresh...");
      try {
        token = await refreshXeroToken(token.id);
        
        const params = new URLSearchParams();
        if (date) params.append("date", date);

        const retryResponse = await handleRateLimit(() =>
          axios.get(
            `${XERO_API_URL}/Reports/BalanceSheet?${params.toString()}`,
            {
              headers: {
                Authorization: `Bearer ${token.accessToken}`,
                "xero-tenant-id": token.tenantId,
                Accept: "application/json",
              },
            }
          )
        );

        return retryResponse.data;
      } catch (refreshError: any) {
        console.error("Balance sheet failed after token refresh:", refreshError.response?.status);
        // Return null instead of throwing - let caller handle gracefully
        return null;
      }
    }
    console.error("Error fetching balance sheet:", error.message);
    // Return null instead of throwing - let caller handle gracefully
    return null;
  }
}

/**
 * Get Xero Reports (Bank Summary)
 */
export async function getXeroBankSummary(
  userId: string,
  options?: {
    date?: string;
    fromDate?: string;
    toDate?: string;
  }
) {
  let token = await getXeroToken(userId);
  if (!token) throw new Error("No Xero token found");

  try {
    const params = new URLSearchParams();
    if (options?.date) {
      params.append("date", options.date);
    } else {
      if (options?.fromDate) params.append("fromDate", options.fromDate);
      if (options?.toDate) params.append("toDate", options.toDate);
    }

    const response = await handleRateLimit(() =>
      axios.get(
        `${XERO_API_URL}/Reports/BankSummary?${params.toString()}`,
        {
          headers: {
            Authorization: `Bearer ${token.accessToken}`,
            "xero-tenant-id": token.tenantId,
            Accept: "application/json",
          },
        }
      )
    );

    return response.data;
  } catch (error: any) {
    // If 403 Forbidden (auth error), try refreshing token and retry ONCE
    if (error.response?.status === 403 && error.response?.data?.Detail === "AuthenticationUnsuccessful") {
      console.log("Token expired, attempting refresh...");
      try {
        token = await refreshXeroToken(token.id);
        
        const params = new URLSearchParams();
        if (options?.date) {
          params.append("date", options.date);
        } else {
          if (options?.fromDate) params.append("fromDate", options.fromDate);
          if (options?.toDate) params.append("toDate", options.toDate);
        }

        const retryResponse = await handleRateLimit(() =>
          axios.get(
            `${XERO_API_URL}/Reports/BankSummary?${params.toString()}`,
            {
              headers: {
                Authorization: `Bearer ${token.accessToken}`,
                "xero-tenant-id": token.tenantId,
                Accept: "application/json",
              },
            }
          )
        );

        return retryResponse.data;
      } catch (refreshError: any) {
        console.error("Bank summary failed after token refresh:", refreshError.response?.status);
        // Return null instead of throwing - let caller handle gracefully
        return null;
      }
    }
    console.error("Error fetching bank summary:", error.message);
    // Return null instead of throwing - let caller handle gracefully
    return null;
  }
}

/**
 * Get Xero Invoices
 */
export async function getXeroInvoices(userId: string) {
  let token = await getXeroToken(userId);
  if (!token) throw new Error("No Xero token found");

  try {
    const response = await handleRateLimit(() =>
      axios.get(`${XERO_API_URL}/Invoices`, {
        headers: {
          Authorization: `Bearer ${token.accessToken}`,
          "xero-tenant-id": token.tenantId,
          Accept: "application/json",
        },
        params: {
          where: 'Status=="AUTHORISED" OR Status=="DRAFT"',
          order: "UpdatedDateUTC DESC",
        },
      })
    );

    return response.data;
  } catch (error: any) {
    // If 403 Forbidden (auth error), try refreshing token and retry ONCE
    if (error.response?.status === 403 && error.response?.data?.Detail === "AuthenticationUnsuccessful") {
      console.log("Token expired, attempting refresh...");
      try {
        token = await refreshXeroToken(token.id);

        const retryResponse = await handleRateLimit(() =>
          axios.get(`${XERO_API_URL}/Invoices`, {
            headers: {
              Authorization: `Bearer ${token.accessToken}`,
              "xero-tenant-id": token.tenantId,
              Accept: "application/json",
            },
            params: {
              where: 'Status=="AUTHORISED" OR Status=="DRAFT"',
              order: "UpdatedDateUTC DESC",
            },
          })
        );

        return retryResponse.data;
      } catch (refreshError: any) {
        console.error("Invoices failed after token refresh:", refreshError.response?.status);
        // Return null instead of throwing - let caller handle gracefully
        return null;
      }
    }
    console.error("Error fetching invoices:", error.message);
    // Return null instead of throwing - let caller handle gracefully
    return null;
  }
}

/**
 * Extract account value from report rows
 */
export function extractAccountValue(report: any, accountNames: string[]): number {
  if (!report?.Reports || !Array.isArray(report.Reports)) {
    return 0;
  }

  for (const reportData of report.Reports) {
    if (reportData.Rows && Array.isArray(reportData.Rows)) {
      for (const row of reportData.Rows) {
        if (row.Cells && Array.isArray(row.Cells) && row.Cells.length >= 2) {
          const rowName = row.Cells[0]?.Value || "";
          const rowValue = row.Cells[1]?.Value || "";

          if (
            accountNames.some((name) =>
              rowName.toLowerCase().includes(name.toLowerCase())
            )
          ) {
            const numericValue = typeof rowValue === "string" 
              ? parseFloat(rowValue.replace(/[^0-9.-]/g, ""))
              : rowValue;
            
            if (!isNaN(numericValue)) {
              return numericValue;
            }
          }
        }

        // Check nested rows
        if (row.Rows && Array.isArray(row.Rows)) {
          for (const nestedRow of row.Rows) {
            if (nestedRow.Cells && Array.isArray(nestedRow.Cells) && nestedRow.Cells.length >= 2) {
              const rowName = nestedRow.Cells[0]?.Value || "";
              const rowValue = nestedRow.Cells[1]?.Value || "";

              if (
                accountNames.some((name) =>
                  rowName.toLowerCase().includes(name.toLowerCase())
                )
              ) {
                const numericValue = typeof rowValue === "string"
                  ? parseFloat(rowValue.replace(/[^0-9.-]/g, ""))
                  : rowValue;
                
                if (!isNaN(numericValue)) {
                  return numericValue;
                }
              }
            }
          }
        }
      }
    }
  }

  return 0;
}

/**
 * Extract cash in and cash out from Bank Summary report
 * Structure: Reports[0].Rows contains Header, Section rows
 * Section.Rows contains Row (individual accounts) and SummaryRow (totals)
 * Cells: [Account Name, Opening Balance, Cash Received, Cash Spent, Closing Balance]
 */
export function extractCashMovements(bankSummary: any): { cashIn: number; cashOut: number } {
  if (!bankSummary?.Reports || !Array.isArray(bankSummary.Reports)) {
    return { cashIn: 0, cashOut: 0 };
  }

  let totalCashIn = 0;
  let totalCashOut = 0;
  let foundSummaryRow = false;

  for (const reportData of bankSummary.Reports) {
    if (reportData.Rows && Array.isArray(reportData.Rows)) {
      // First, try to find SummaryRow(s) which have the totals
      for (const row of reportData.Rows) {
        if (row.RowType === "Section" && row.Rows && Array.isArray(row.Rows)) {
          for (const nestedRow of row.Rows) {
            if (nestedRow.RowType === "SummaryRow" && nestedRow.Cells && Array.isArray(nestedRow.Cells) && nestedRow.Cells.length >= 4) {
              // Cells[2] = Cash Received (cashIn)
              // Cells[3] = Cash Spent (cashOut)
              const cashReceived = parseFloat(nestedRow.Cells[2]?.Value || "0");
              const cashSpent = parseFloat(nestedRow.Cells[3]?.Value || "0");
              
              if (!isNaN(cashReceived)) {
                totalCashIn += cashReceived;
              }
              if (!isNaN(cashSpent)) {
                totalCashOut += cashSpent;
              }
              
              foundSummaryRow = true;
            }
          }
        }
      }
      
      // If no SummaryRow found, sum individual Row entries
      if (!foundSummaryRow) {
        for (const row of reportData.Rows) {
          if (row.RowType === "Section" && row.Rows && Array.isArray(row.Rows)) {
            for (const nestedRow of row.Rows) {
              if (nestedRow.RowType === "Row" && nestedRow.Cells && Array.isArray(nestedRow.Cells) && nestedRow.Cells.length >= 4) {
                // Cells[2] = Cash Received (cashIn)
                // Cells[3] = Cash Spent (cashOut)
                const cashReceived = parseFloat(nestedRow.Cells[2]?.Value || "0");
                const cashSpent = parseFloat(nestedRow.Cells[3]?.Value || "0");
                
                if (!isNaN(cashReceived)) {
                  totalCashIn += cashReceived;
                }
                if (!isNaN(cashSpent)) {
                  totalCashOut += cashSpent;
                }
              }
            }
          }
        }
      }
    }
  }

  return { cashIn: totalCashIn, cashOut: totalCashOut };
}

