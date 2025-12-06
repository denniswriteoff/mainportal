import { XeroClient } from 'xero-node';
import { getXeroTokens, refreshXeroToken, createXeroClient } from './xero';
import { prisma } from './db';

/**
 * Creates an authenticated Xero API client for a specific user and tenant
 */
export async function getXeroApiClient(userId: string, tenantId: string): Promise<XeroClient | null> {
  try {
    const tokenRecord = await getXeroTokens(userId, tenantId);
    
    if (!tokenRecord || Array.isArray(tokenRecord)) {
      console.error('No Xero token found for user and tenant');
      return null;
    }

    // Check if token is expired and refresh if needed
    if (tokenRecord.accessTokenExpiresAt < new Date()) {
      try {
        await refreshXeroToken(userId, tenantId);
        // Get the refreshed token
        const refreshedToken = await getXeroTokens(userId, tenantId);
        if (!refreshedToken || Array.isArray(refreshedToken)) {
          console.error('Failed to get refreshed token');
          return null;
        }
        tokenRecord.accessToken = refreshedToken.accessToken;
        tokenRecord.refreshToken = refreshedToken.refreshToken;
        tokenRecord.expiresIn = refreshedToken.expiresIn;
        tokenRecord.tokenType = refreshedToken.tokenType;
        tokenRecord.scope = refreshedToken.scope;
      } catch (error) {
        console.error('Failed to refresh token:', error);
        return null;
      }
    }

    const xero = createXeroClient();
    await xero.initialize();

    // Set the token set for the API client
    xero.setTokenSet({
      access_token: tokenRecord.accessToken,
      refresh_token: tokenRecord.refreshToken,
      expires_in: tokenRecord.expiresIn,
      token_type: tokenRecord.tokenType,
      scope: tokenRecord.scope || undefined
    });

    return xero;
  } catch (error) {
    console.error('Error creating Xero API client:', error);
    return null;
  }
}

/**
 * Get organization information
 */
export async function getOrganisation(userId: string, tenantId: string) {
  const xero = await getXeroApiClient(userId, tenantId);
  if (!xero) {
    throw new Error('Failed to create Xero API client');
  }

  try {
    const response = await xero.accountingApi.getOrganisations(tenantId);
    return response.body.organisations?.[0] || null;
  } catch (error) {
    console.error('Error fetching organisation:', error);
    throw error;
  }
}

/**
 * Get contacts from Xero
 */
export async function getContacts(userId: string, tenantId: string, options?: {
  page?: number;
  where?: string;
  order?: string;
}) {
  const xero = await getXeroApiClient(userId, tenantId);
  if (!xero) {
    throw new Error('Failed to create Xero API client');
  }

  try {
    const response = await xero.accountingApi.getContacts(
      tenantId,
      undefined, // ifModifiedSince
      options?.where,
      options?.order,
      undefined, // IDs
      options?.page,
      undefined, // includeArchived
      undefined, // summaryOnly
      undefined,  // searchTerm,
      20
    );
    return response.body;
  } catch (error) {
    console.error('Error fetching contacts:', error);
    throw error;
  }
}

/**
 * Get invoices from Xero
 */
export async function getInvoices(userId: string, tenantId: string, options?: {
  page?: number;
  where?: string;
  order?: string;
  statuses?: string[];
}) {
  const xero = await getXeroApiClient(userId, tenantId);
  if (!xero) {
    throw new Error('Failed to create Xero API client');
  }

  try {
    const response = await xero.accountingApi.getInvoices(
      tenantId,
      undefined, // ifModifiedSince
      options?.where,
      options?.order,
      undefined, // IDs
      undefined, // invoiceNumbers
      undefined, // contactIDs
      options?.statuses,
      options?.page,
      undefined, // includeArchived
      undefined, // createdByMyApp
      undefined, // unitdp
      undefined,  // summaryOnly,
      20
    );
    return response.body;
  } catch (error) {
    console.error('Error fetching invoices:', error);
    throw error;
  }
}

/**
 * Get accounts from Xero
 */
export async function getAccounts(userId: string, tenantId: string, options?: {
  where?: string;
  order?: string;
}) {
  const xero = await getXeroApiClient(userId, tenantId);
  if (!xero) {
    throw new Error('Failed to create Xero API client');
  }

  try {
    const response = await xero.accountingApi.getAccounts(
      tenantId,
      undefined, // ifModifiedSince
      options?.where,
      options?.order
    );
    return response.body;
  } catch (error) {
    console.error('Error fetching accounts:', error);
    throw error;
  }
}

/**
 * Get items from Xero
 */
export async function getItems(userId: string, tenantId: string, options?: {
  where?: string;
  order?: string;
  unitdp?: number;
}) {
  const xero = await getXeroApiClient(userId, tenantId);
  if (!xero) {
    throw new Error('Failed to create Xero API client');
  }

  try {
    const response = await xero.accountingApi.getItems(
      tenantId,
      undefined, // ifModifiedSince
      options?.where,
      options?.order,
      options?.unitdp
    );
    return response.body;
  } catch (error) {
    console.error('Error fetching items:', error);
    throw error;
  }
}

/**
 * Create a contact in Xero
 */
export async function createContact(userId: string, tenantId: string, contactData: any) {
  const xero = await getXeroApiClient(userId, tenantId);
  if (!xero) {
    throw new Error('Failed to create Xero API client');
  }

  try {
    const response = await xero.accountingApi.createContacts(tenantId, {
      contacts: [contactData]
    });
    return response.body;
  } catch (error) {
    console.error('Error creating contact:', error);
    throw error;
  }
}

/**
 * Create an invoice in Xero
 */
export async function createInvoice(userId: string, tenantId: string, invoiceData: any) {
  const xero = await getXeroApiClient(userId, tenantId);
  if (!xero) {
    throw new Error('Failed to create Xero API client');
  }

  try {
    const response = await xero.accountingApi.createInvoices(tenantId, {
      invoices: [invoiceData]
    }, undefined, 4); // unitdp = 4 for 4 decimal places
    return response.body;
  } catch (error) {
    console.error('Error creating invoice:', error);
    throw error;
  }
}

/**
 * Get bank transactions from Xero
 */
export async function getBankTransactions(userId: string, tenantId: string, options?: {
  page?: number;
  where?: string;
  order?: string;
}) {
  const xero = await getXeroApiClient(userId, tenantId);
  if (!xero) {
    throw new Error('Failed to create Xero API client');
  }

  try {
    const response = await xero.accountingApi.getBankTransactions(
      tenantId,
      undefined, // ifModifiedSince
      options?.where,
      options?.order,
      options?.page,
      undefined, 
      20  // page size
    );
    return response.body;
  } catch (error) {
    console.error('Error fetching bank transactions:', error);
    throw error;
  }
}

/**
 * Get reports from Xero
 */
export async function getReports(userId: string, tenantId: string, reportName: string, options?: Record<string, any>) {
  const xero = await getXeroApiClient(userId, tenantId);
  if (!xero) {
    throw new Error('Failed to create Xero API client');
  }

  try {
    const response = await xero.accountingApi.getReportsList(tenantId);
    // This is a basic implementation - you'd need to implement specific report methods
    // based on the Xero API documentation for the specific reports you need
    return response.body;
  } catch (error) {
    console.error('Error fetching reports:', error);
    throw error;
  }
}

export async function getProfitAndLossReport(userId: string, tenantId: string, options?: {
  fromDate?: string;
  toDate?: string;
  periods?: number;
  timeframe?: string;
  trackingCategoryID?: string;
  trackingCategoryID2?: string;
  trackingOptionID?: string;
  trackingOptionID2?: string;
  standardLayout?: boolean;
  paymentsOnly?: boolean;
}) {
  const xero = await getXeroApiClient(userId, tenantId);
  if (!xero) {
    throw new Error('Failed to create Xero API client');
  }

  try {
    console.log('Getting profit and loss report');

    const response = await xero.accountingApi.getReportProfitAndLoss(
      tenantId,
      options?.fromDate,
      options?.toDate,
      options?.periods,
      options?.timeframe as any,
      options?.trackingCategoryID,
      options?.trackingCategoryID2,
      options?.trackingOptionID,
      options?.trackingOptionID2,
      options?.standardLayout,
      options?.paymentsOnly
    );
    console.log('Profit and loss report response');
    console.log(response.body);
    return response.body;
  } catch (error) {
    console.error('Error fetching profit and loss report:', error);
    throw error;
  }
}

export async function getBalanceSheetReport(userId: string, tenantId: string, options?: {
  date?: string;
  periods?: number;
  timeframe?: string;
  trackingOptionID1?: string;
  trackingOptionID2?: string;
  standardLayout?: boolean;
  paymentsOnly?: boolean;
}) {
  const xero = await getXeroApiClient(userId, tenantId);
  if (!xero) {
    throw new Error('Failed to create Xero API client');
  }

  try {
    const response = await xero.accountingApi.getReportBalanceSheet(
      tenantId,
      options?.date,
      options?.periods,
      options?.timeframe as any,
      options?.trackingOptionID1,
      options?.trackingOptionID2,
      options?.standardLayout,
      options?.paymentsOnly
    );
    console.log('Balance sheet report response');
    console.log(response.body);
    return response.body;
  } catch (error) {
    console.error('Error fetching balance sheet report:', error);
    throw error;
  }
}

export async function getCreditNotes(userId: string, tenantId: string, options?: {
  ifModifiedSince?: Date;
  where?: string;
  order?: string;
  page?: number;
  unitdp?: number;
}) {
  const xero = await getXeroApiClient(userId, tenantId);
  if (!xero) {
    throw new Error('Failed to create Xero API client');
  }

  try {
    const response = await xero.accountingApi.getCreditNotes(
      tenantId,
      options?.ifModifiedSince,
      options?.where,
      options?.order,
      options?.page,
      options?.unitdp,
     20
    );
    console.log('Credit notes response');
    console.log(response.body);
    return response.body;
  } catch (error) {
    console.error('Error fetching credit notes:', error);
    throw error;
  }
}

export async function getTaxRates(userId: string, tenantId: string, options?: {
  where?: string;
  order?: string;
}) {
  const xero = await getXeroApiClient(userId, tenantId);
  if (!xero) {
    throw new Error('Failed to create Xero API client');
  }

  try {
    const response = await xero.accountingApi.getTaxRates(
      tenantId,
      options?.where,
      options?.order
    );
    console.log('Tax rates response');
    console.log(response.body);
    return response.body;
  } catch (error) {
    console.error('Error fetching tax rates:', error);
    throw error;
  }
}

export async function getPayments(userId: string, tenantId: string, options?: {
  ifModifiedSince?: Date;
  where?: string;
  order?: string;
  page?: number;
}) {
  const xero = await getXeroApiClient(userId, tenantId);
  if (!xero) {
    throw new Error('Failed to create Xero API client');
  }
  try {
    const response = await xero.accountingApi.getPayments(
      tenantId,
      options?.ifModifiedSince,
      options?.where,
      options?.order,
      options?.page,
      20
    );
    console.log('Payments response');
    console.log(response.body);
    return response.body;
  } catch (error) {
    console.error('Error fetching payments:', error);
    throw error;
  }
}

export async function getTrialBalanceReport(userId: string, tenantId: string, options?: {
  date?: string;
  paymentsOnly?: boolean;
}) {
  const xero = await getXeroApiClient(userId, tenantId);
  if (!xero) {
    throw new Error('Failed to create Xero API client');
  }

  try {
    const response = await xero.accountingApi.getReportTrialBalance(
      tenantId,
      options?.date,
      options?.paymentsOnly
    );
    console.log('Trial balance report response');
    console.log(response.body);
    return response.body;
  } catch (error) {
    console.error('Error fetching trial balance report:', error);
    throw error;
  }
}

export async function getPayrollEmployees(userId: string, tenantId: string, options?: {
  filter?: string;
  page?: number;
}) {
  const xero = await getXeroApiClient(userId, tenantId);
  if (!xero) {
    throw new Error('Failed to create Xero API client');
  }

  try {
    const response = await xero.payrollNZApi.getEmployees(
      tenantId,
      options?.filter,
      options?.page
    );
    console.log('Payroll employees response');
    console.log(response.body);
    return response.body;
  } catch (error) {
    console.error('Error fetching payroll employees:', error);
    throw error;
  }
}

export async function getAgedPayablesByContact(userId: string, tenantId: string, options?: {
  contactId?: string;
  date?: string;
  fromDate?: string;
  toDate?: string;
}) {
  const xero = await getXeroApiClient(userId, tenantId);
  if (!xero) {
    throw new Error('Failed to create Xero API client');
  }

  try {
    const response = await xero.accountingApi.getReportAgedPayablesByContact(
      tenantId,
      options?.contactId || '',
      options?.date,
      options?.fromDate,
      options?.toDate
    );
    console.log('Aged payables by contact response');
    console.log(response.body);
    return response.body;
  } catch (error) {
    console.error('Error fetching aged payables by contact:', error);
    throw error;
  }
}

export async function getLeaveTypes(userId: string, tenantId: string, options?: {
  page?: number;
  activeOnly?: boolean;
}) {
  const xero = await getXeroApiClient(userId, tenantId);
  if (!xero) {
    throw new Error('Failed to create Xero API client');
  }

  try {
    const response = await xero.payrollNZApi.getLeaveTypes(
      tenantId,
      options?.page,
      options?.activeOnly
    );
    console.log('Leave types response');
    console.log(response.body);
    return response.body;
  } catch (error) {
    console.error('Error fetching leave types:', error);
    throw error;
  }
}

// Wrapper functions for use in API routes without tenantId context
export async function getXeroProfitAndLoss(userId: string, options: any) {
  const userTokens = await prisma.xeroToken.findFirst({
    where: { userId }
  });
  if (!userTokens) {
    throw new Error("No Xero connection found");
  }
  return getProfitAndLossReport(userId, userTokens.tenantId, options);
}

export async function getXeroBalanceSheet(userId: string, date?: string) {
  const userTokens = await prisma.xeroToken.findFirst({
    where: { userId }
  });
  if (!userTokens) {
    throw new Error("No Xero connection found");
  }
  return getBalanceSheetReport(userId, userTokens.tenantId, { date });
}

export function extractAccountValue(report: any, accountNames: string[]): number {
  if (!report?.Reports || !Array.isArray(report.Reports)) {
    return 0
  }

  for (const reportData of report.Reports) {
    if (reportData.Rows) {
      for (const row of reportData.Rows) {
        if ((row.RowType === 'Row' || row.RowType === 'SummaryRow') && row.Cells) {
          const name = row.Cells[0]?.Value
          const value = row.Cells[1]?.Value

          if (name && accountNames.some(accountName => 
            name.toLowerCase().includes(accountName.toLowerCase())
          )) {
            const numericValue = typeof value === 'string' ? parseFloat(value) : value
            if (!isNaN(numericValue)) {
              return numericValue
            }
          }
        }
        
        // Check nested rows in sections
        if (row.Rows && Array.isArray(row.Rows)) {
          for (const nestedRow of row.Rows) {
            if ((nestedRow.RowType === 'Row' || nestedRow.RowType === 'SummaryRow') && nestedRow.Cells) {
              const name = nestedRow.Cells[0]?.Value
              const value = nestedRow.Cells[1]?.Value

              if (name && accountNames.some(accountName => 
                name.toLowerCase().includes(accountName.toLowerCase())
              )) {
                const numericValue = typeof value === 'string' ? parseFloat(value) : value
                if (!isNaN(numericValue)) {
                  return numericValue
                }
              }
            }
          }
        }
      }
    }
  }
  return 0
}

/**
 * Utility function to delay execution
 */
export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Get bank summary report from Xero
 * Wrapper function that automatically gets tenantId from user's tokens
 */
export async function getXeroBankSummary(userId: string, options?: {
  fromDate?: string;
  toDate?: string;
}) {
  const userTokens = await prisma.xeroToken.findFirst({
    where: { userId }
  });
  if (!userTokens) {
    throw new Error("No Xero connection found");
  }
  
  const xero = await getXeroApiClient(userId, userTokens.tenantId);
  if (!xero) {
    throw new Error('Failed to create Xero API client');
  }

  try {
    const response = await xero.accountingApi.getReportBankSummary(
      userTokens.tenantId,
      options?.fromDate,
      options?.toDate
    );
    return response.body;
  } catch (error) {
    console.error('Error fetching bank summary report:', error);
    throw error;
  }
}

/**
 * Extract cash movements (cash in and cash out) from bank summary report
 */
export function extractCashMovements(bankSummary: any): {
  cashIn: number;
  cashOut: number;
} {
  const result = {
    cashIn: 0,
    cashOut: 0,
  };

  if (!bankSummary?.Reports || !Array.isArray(bankSummary.Reports)) {
    return result;
  }

  for (const reportData of bankSummary.Reports) {
    if (reportData.Rows) {
      for (const row of reportData.Rows) {
        // Check for cash in (receipts, deposits, etc.)
        if (row.RowType === 'SummaryRow' && row.Cells) {
          const name = row.Cells[0]?.Value?.toString().toLowerCase() || '';
          const value = row.Cells[1]?.Value;
          
          if (name.includes('total receipts') || name.includes('total cash in') || name.includes('total deposits')) {
            const numericValue = typeof value === 'string' ? parseFloat(value.replace(/,/g, '')) : value;
            if (!isNaN(numericValue)) {
              result.cashIn = Math.abs(numericValue);
            }
          }
          
          // Check for cash out (payments, withdrawals, etc.)
          if (name.includes('total payments') || name.includes('total cash out') || name.includes('total withdrawals')) {
            const numericValue = typeof value === 'string' ? parseFloat(value.replace(/,/g, '')) : value;
            if (!isNaN(numericValue)) {
              result.cashOut = Math.abs(numericValue);
            }
          }
        }
        
        // Check nested rows
        if (row.Rows && Array.isArray(row.Rows)) {
          for (const nestedRow of row.Rows) {
            if (nestedRow.RowType === 'SummaryRow' && nestedRow.Cells) {
              const name = nestedRow.Cells[0]?.Value?.toString().toLowerCase() || '';
              const value = nestedRow.Cells[1]?.Value;
              
              if (name.includes('total receipts') || name.includes('total cash in') || name.includes('total deposits')) {
                const numericValue = typeof value === 'string' ? parseFloat(value.replace(/,/g, '')) : value;
                if (!isNaN(numericValue)) {
                  result.cashIn = Math.abs(numericValue);
                }
              }
              
              if (name.includes('total payments') || name.includes('total cash out') || name.includes('total withdrawals')) {
                const numericValue = typeof value === 'string' ? parseFloat(value.replace(/,/g, '')) : value;
                if (!isNaN(numericValue)) {
                  result.cashOut = Math.abs(numericValue);
                }
              }
            }
          }
        }
      }
    }
  }

  return result;
}
