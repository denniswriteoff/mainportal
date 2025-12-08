import { getValidToken, createOAuthClient, getIntuitEnv, QboToken } from './qbo';
import { prisma } from './db';

/**
 * Creates an authenticated QBO API client for a specific user and realm
 */
async function getQboApiClient(userId: string, realmId?: string) {
  try {
    const token = await getValidToken(userId, realmId);
    
    if (!token?.access_token || !token?.realmId) {
      throw new Error('No QBO token found');
    }

    const oauthClient = createOAuthClient();
    oauthClient.setToken(token);

    const { environment } = getIntuitEnv();
    const base = environment === 'sandbox'
      ? 'https://sandbox-quickbooks.api.intuit.com'
      : 'https://quickbooks.api.intuit.com';

    return { oauthClient, base, realmId: token.realmId };
  } catch (error) {
    console.error('Error creating QBO API client:', error);
    throw error;
  }
}

/**
 * Make an authenticated API call to QBO
 */
async function makeQboApiCall(
  userId: string,
  realmId: string | undefined,
  endpoint: string,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
  body?: any
) {
  const { oauthClient, base } = await getQboApiClient(userId, realmId);
  const url = `${base}${endpoint}`;
  
  const response = await oauthClient.makeApiCall({
    url,
    method,
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  return response.json || JSON.parse(response.body || '{}');
}

/**
 * Get company information
 */
export async function getCompanyInfo(userId: string, realmId?: string) {
  try {
    const { realmId: actualRealmId } = await getQboApiClient(userId, realmId);
    const endpoint = `/v3/company/${encodeURIComponent(actualRealmId)}/companyinfo/${encodeURIComponent(actualRealmId)}`;
    const result = await makeQboApiCall(userId, realmId, endpoint);
    return result.CompanyInfo || null;
  } catch (error) {
    console.error('Error fetching company info:', error);
    throw error;
  }
}

/**
 * Get customers from QBO
 */
export async function getCustomers(userId: string, realmId: string | undefined, options?: {
  maxResults?: number;
  startPosition?: number;
  where?: string;
}) {
  try {
    const { realmId: actualRealmId } = await getQboApiClient(userId, realmId);
    let endpoint = `/v3/company/${encodeURIComponent(actualRealmId)}/query?query=SELECT * FROM Customer`;
    
    if (options?.maxResults) {
      endpoint += ` MAXRESULTS ${options.maxResults}`;
    }
    if (options?.startPosition) {
      endpoint += ` STARTPOSITION ${options.startPosition}`;
    }
    
    const result = await makeQboApiCall(userId, realmId, endpoint);
    return {
      QueryResponse: result.QueryResponse || {},
      customers: result.QueryResponse?.Customer || []
    };
  } catch (error) {
    console.error('Error fetching customers:', error);
    throw error;
  }
}

/**
 * Get vendors from QBO
 */
export async function getVendors(userId: string, realmId: string | undefined, options?: {
  maxResults?: number;
  startPosition?: number;
}) {
  try {
    const { realmId: actualRealmId } = await getQboApiClient(userId, realmId);
    let endpoint = `/v3/company/${encodeURIComponent(actualRealmId)}/query?query=SELECT * FROM Vendor`;
    
    if (options?.maxResults) {
      endpoint += ` MAXRESULTS ${options.maxResults}`;
    }
    if (options?.startPosition) {
      endpoint += ` STARTPOSITION ${options.startPosition}`;
    }
    
    const result = await makeQboApiCall(userId, realmId, endpoint);
    return {
      QueryResponse: result.QueryResponse || {},
      vendors: result.QueryResponse?.Vendor || []
    };
  } catch (error) {
    console.error('Error fetching vendors:', error);
    throw error;
  }
}

/**
 * Get invoices from QBO
 */
export async function getInvoices(userId: string, realmId: string | undefined, options?: {
  maxResults?: number;
  startPosition?: number;
  where?: string;
}) {
  try {
    const { realmId: actualRealmId } = await getQboApiClient(userId, realmId);
    let endpoint = `/v3/company/${encodeURIComponent(actualRealmId)}/query?query=SELECT * FROM Invoice`;
    
    if (options?.where) {
      endpoint += ` WHERE ${options.where}`;
    }
    if (options?.maxResults) {
      endpoint += ` MAXRESULTS ${options.maxResults}`;
    }
    if (options?.startPosition) {
      endpoint += ` STARTPOSITION ${options.startPosition}`;
    }
    
    const result = await makeQboApiCall(userId, realmId, endpoint);
    return {
      QueryResponse: result.QueryResponse || {},
      invoices: result.QueryResponse?.Invoice || []
    };
  } catch (error) {
    console.error('Error fetching invoices:', error);
    throw error;
  }
}

/**
 * Get a specific invoice by ID
 */
export async function getInvoiceById(userId: string, realmId: string | undefined, invoiceId: string) {
  try {
    const { realmId: actualRealmId } = await getQboApiClient(userId, realmId);
    const endpoint = `/v3/company/${encodeURIComponent(actualRealmId)}/invoice/${invoiceId}`;
    const result = await makeQboApiCall(userId, realmId, endpoint);
    return result.QueryResponse?.Invoice?.[0] || result.Invoice || null;
  } catch (error) {
    console.error('Error fetching invoice by ID:', error);
    throw error;
  }
}

/**
 * Get payments from QBO
 */
export async function getPayments(userId: string, realmId: string | undefined, options?: {
  maxResults?: number;
  startPosition?: number;
  where?: string;
}) {
  try {
    const { realmId: actualRealmId } = await getQboApiClient(userId, realmId);
    let endpoint = `/v3/company/${encodeURIComponent(actualRealmId)}/query?query=SELECT * FROM Payment`;
    
    if (options?.where) {
      endpoint += ` WHERE ${options.where}`;
    }
    if (options?.maxResults) {
      endpoint += ` MAXRESULTS ${options.maxResults}`;
    }
    if (options?.startPosition) {
      endpoint += ` STARTPOSITION ${options.startPosition}`;
    }
    
    const result = await makeQboApiCall(userId, realmId, endpoint);
    return {
      QueryResponse: result.QueryResponse || {},
      payments: result.QueryResponse?.Payment || []
    };
  } catch (error) {
    console.error('Error fetching payments:', error);
    throw error;
  }
}

/**
 * Get a specific payment by ID
 */
export async function getPaymentById(userId: string, realmId: string | undefined, paymentId: string) {
  try {
    const { realmId: actualRealmId } = await getQboApiClient(userId, realmId);
    const endpoint = `/v3/company/${encodeURIComponent(actualRealmId)}/payment/${paymentId}`;
    const result = await makeQboApiCall(userId, realmId, endpoint);
    return result.QueryResponse?.Payment?.[0] || result.Payment || null;
  } catch (error) {
    console.error('Error fetching payment by ID:', error);
    throw error;
  }
}

/**
 * Get purchases from QBO
 */
export async function getPurchases(userId: string, realmId: string | undefined, options?: {
  maxResults?: number;
  startPosition?: number;
  where?: string;
}) {
  try {
    const { realmId: actualRealmId } = await getQboApiClient(userId, realmId);
    let endpoint = `/v3/company/${encodeURIComponent(actualRealmId)}/query?query=SELECT * FROM Purchase`;
    
    if (options?.where) {
      endpoint += ` WHERE ${options.where}`;
    }
    if (options?.maxResults) {
      endpoint += ` MAXRESULTS ${options.maxResults}`;
    }
    if (options?.startPosition) {
      endpoint += ` STARTPOSITION ${options.startPosition}`;
    }
    
    const result = await makeQboApiCall(userId, realmId, endpoint);
    return {
      QueryResponse: result.QueryResponse || {},
      purchases: result.QueryResponse?.Purchase || []
    };
  } catch (error) {
    console.error('Error fetching purchases:', error);
    throw error;
  }
}

/**
 * Get a specific purchase by ID
 */
export async function getPurchaseById(userId: string, realmId: string | undefined, purchaseId: string) {
  try {
    const { realmId: actualRealmId } = await getQboApiClient(userId, realmId);
    const endpoint = `/v3/company/${encodeURIComponent(actualRealmId)}/purchase/${purchaseId}`;
    const result = await makeQboApiCall(userId, realmId, endpoint);
    return result.QueryResponse?.Purchase?.[0] || result.Purchase || null;
  } catch (error) {
    console.error('Error fetching purchase by ID:', error);
    throw error;
  }
}

/**
 * Get bills from QBO
 */
export async function getBills(userId: string, realmId: string | undefined, options?: {
  maxResults?: number;
  startPosition?: number;
  where?: string;
}) {
  try {
    const { realmId: actualRealmId } = await getQboApiClient(userId, realmId);
    let endpoint = `/v3/company/${encodeURIComponent(actualRealmId)}/query?query=SELECT * FROM Bill`;
    
    if (options?.where) {
      endpoint += ` WHERE ${options.where}`;
    }
    if (options?.maxResults) {
      endpoint += ` MAXRESULTS ${options.maxResults}`;
    }
    if (options?.startPosition) {
      endpoint += ` STARTPOSITION ${options.startPosition}`;
    }
    
    const result = await makeQboApiCall(userId, realmId, endpoint);
    return {
      QueryResponse: result.QueryResponse || {},
      bills: result.QueryResponse?.Bill || []
    };
  } catch (error) {
    console.error('Error fetching bills:', error);
    throw error;
  }
}

/**
 * Get a specific bill by ID
 */
export async function getBillById(userId: string, realmId: string | undefined, billId: string) {
  try {
    const { realmId: actualRealmId } = await getQboApiClient(userId, realmId);
    const endpoint = `/v3/company/${encodeURIComponent(actualRealmId)}/bill/${billId}`;
    const result = await makeQboApiCall(userId, realmId, endpoint);
    return result.QueryResponse?.Bill?.[0] || result.Bill || null;
  } catch (error) {
    console.error('Error fetching bill by ID:', error);
    throw error;
  }
}

/**
 * Get accounts from QBO
 */
export async function getAccounts(userId: string, realmId: string | undefined, options?: {
  maxResults?: number;
  startPosition?: number;
  where?: string;
}) {
  try {
    const { realmId: actualRealmId } = await getQboApiClient(userId, realmId);
    let endpoint = `/v3/company/${encodeURIComponent(actualRealmId)}/query?query=SELECT * FROM Account`;
    
    if (options?.where) {
      endpoint += ` WHERE ${options.where}`;
    }
    if (options?.maxResults) {
      endpoint += ` MAXRESULTS ${options.maxResults}`;
    }
    if (options?.startPosition) {
      endpoint += ` STARTPOSITION ${options.startPosition}`;
    }
    
    const result = await makeQboApiCall(userId, realmId, endpoint);
    return {
      QueryResponse: result.QueryResponse || {},
      accounts: result.QueryResponse?.Account || []
    };
  } catch (error) {
    console.error('Error fetching accounts:', error);
    throw error;
  }
}

/**
 * Get a specific account by ID
 */
export async function getAccountById(userId: string, realmId: string | undefined, accountId: string) {
  try {
    const { realmId: actualRealmId } = await getQboApiClient(userId, realmId);
    const endpoint = `/v3/company/${encodeURIComponent(actualRealmId)}/account/${accountId}`;
    const result = await makeQboApiCall(userId, realmId, endpoint);
    return result.QueryResponse?.Account?.[0] || result.Account || null;
  } catch (error) {
    console.error('Error fetching account by ID:', error);
    throw error;
  }
}

/**
 * Get estimates from QBO
 */
export async function getEstimates(userId: string, realmId: string | undefined, options?: {
  maxResults?: number;
  startPosition?: number;
  where?: string;
}) {
  try {
    const { realmId: actualRealmId } = await getQboApiClient(userId, realmId);
    let endpoint = `/v3/company/${encodeURIComponent(actualRealmId)}/query?query=SELECT * FROM Estimate`;
    
    if (options?.where) {
      endpoint += ` WHERE ${options.where}`;
    }
    if (options?.maxResults) {
      endpoint += ` MAXRESULTS ${options.maxResults}`;
    }
    if (options?.startPosition) {
      endpoint += ` STARTPOSITION ${options.startPosition}`;
    }
    
    const result = await makeQboApiCall(userId, realmId, endpoint);
    return {
      QueryResponse: result.QueryResponse || {},
      estimates: result.QueryResponse?.Estimate || []
    };
  } catch (error) {
    console.error('Error fetching estimates:', error);
    throw error;
  }
}

/**
 * Get profit and loss report from QBO
 */
export async function getProfitAndLossReport(userId: string, realmId: string | undefined, options?: {
  startDate?: string;
  endDate?: string;
  summarizeColumnBy?: string;
  columns?: string;
}) {
  try {
    const { realmId: actualRealmId } = await getQboApiClient(userId, realmId);
    let endpoint = `/v3/company/${encodeURIComponent(actualRealmId)}/reports/ProfitAndLoss`;
    
    const params: string[] = [];
    if (options?.startDate) {
      params.push(`start_date=${encodeURIComponent(options.startDate)}`);
    }
    if (options?.endDate) {
      params.push(`end_date=${encodeURIComponent(options.endDate)}`);
    }
    if (options?.summarizeColumnBy) {
      params.push(`summarize_column_by=${encodeURIComponent(options.summarizeColumnBy)}`);
    }
    if (options?.columns) {
      params.push(`columns=${encodeURIComponent(options.columns)}`);
    }
    
    if (params.length > 0) {
      endpoint += `?${params.join('&')}`;
    }
    
    const result = await makeQboApiCall(userId, realmId, endpoint);
    return result;
  } catch (error) {
    console.error('Error fetching profit and loss report:', error);
    throw error;
  }
}

/**
 * Get sales report from QBO
 */
export async function getSalesReport(userId: string, realmId: string | undefined, options?: {
  startDate?: string;
  endDate?: string;
  summarizeColumnBy?: string;
  columns?: string;
}) {
  try {
    const { realmId: actualRealmId } = await getQboApiClient(userId, realmId);
    let endpoint = `/v3/company/${encodeURIComponent(actualRealmId)}/reports/SalesByCustomer`;
    
    const params: string[] = [];
    if (options?.startDate) {
      params.push(`start_date=${encodeURIComponent(options.startDate)}`);
    }
    if (options?.endDate) {
      params.push(`end_date=${encodeURIComponent(options.endDate)}`);
    }
    if (options?.summarizeColumnBy) {
      params.push(`summarize_column_by=${encodeURIComponent(options.summarizeColumnBy)}`);
    }
    if (options?.columns) {
      params.push(`columns=${encodeURIComponent(options.columns)}`);
    }
    
    if (params.length > 0) {
      endpoint += `?${params.join('&')}`;
    }
    
    const result = await makeQboApiCall(userId, realmId, endpoint);
    return result;
  } catch (error) {
    console.error('Error fetching sales report:', error);
    throw error;
  }
}

/**
 * Get expenses report from QBO
 */
export async function getExpensesReport(userId: string, realmId: string | undefined, options?: {
  startDate?: string;
  endDate?: string;
  summarizeColumnBy?: string;
  columns?: string;
}) {
  try {
    const { realmId: actualRealmId } = await getQboApiClient(userId, realmId);
    let endpoint = `/v3/company/${encodeURIComponent(actualRealmId)}/reports/Expenses`;
    
    const params: string[] = [];
    if (options?.startDate) {
      params.push(`start_date=${encodeURIComponent(options.startDate)}`);
    }
    if (options?.endDate) {
      params.push(`end_date=${encodeURIComponent(options.endDate)}`);
    }
    if (options?.summarizeColumnBy) {
      params.push(`summarize_column_by=${encodeURIComponent(options.summarizeColumnBy)}`);
    }
    if (options?.columns) {
      params.push(`columns=${encodeURIComponent(options.columns)}`);
    }
    
    if (params.length > 0) {
      endpoint += `?${params.join('&')}`;
    }
    
    const result = await makeQboApiCall(userId, realmId, endpoint);
    return result;
  } catch (error) {
    console.error('Error fetching expenses report:', error);
    throw error;
  }
}

/**
 * Get item sales report from QBO
 */
export async function getItemSalesReport(userId: string, realmId: string | undefined, options?: {
  startDate?: string;
  endDate?: string;
  summarizeColumnBy?: string;
  columns?: string;
}) {
  try {
    const { realmId: actualRealmId } = await getQboApiClient(userId, realmId);
    let endpoint = `/v3/company/${encodeURIComponent(actualRealmId)}/reports/ItemSales`;
    
    const params: string[] = [];
    if (options?.startDate) {
      params.push(`start_date=${encodeURIComponent(options.startDate)}`);
    }
    if (options?.endDate) {
      params.push(`end_date=${encodeURIComponent(options.endDate)}`);
    }
    if (options?.summarizeColumnBy) {
      params.push(`summarize_column_by=${encodeURIComponent(options.summarizeColumnBy)}`);
    }
    if (options?.columns) {
      params.push(`columns=${encodeURIComponent(options.columns)}`);
    }
    
    if (params.length > 0) {
      endpoint += `?${params.join('&')}`;
    }
    
    const result = await makeQboApiCall(userId, realmId, endpoint);
    return result;
  } catch (error) {
    console.error('Error fetching item sales report:', error);
    throw error;
  }
}

/**
 * Get customer sales report from QBO
 */
export async function getCustomerSalesReport(userId: string, realmId: string | undefined, options?: {
  startDate?: string;
  endDate?: string;
  summarizeColumnBy?: string;
  columns?: string;
}) {
  try {
    const { realmId: actualRealmId } = await getQboApiClient(userId, realmId);
    let endpoint = `/v3/company/${encodeURIComponent(actualRealmId)}/reports/SalesByCustomer`;
    
    const params: string[] = [];
    if (options?.startDate) {
      params.push(`start_date=${encodeURIComponent(options.startDate)}`);
    }
    if (options?.endDate) {
      params.push(`end_date=${encodeURIComponent(options.endDate)}`);
    }
    if (options?.summarizeColumnBy) {
      params.push(`summarize_column_by=${encodeURIComponent(options.summarizeColumnBy)}`);
    }
    if (options?.columns) {
      params.push(`columns=${encodeURIComponent(options.columns)}`);
    }
    
    if (params.length > 0) {
      endpoint += `?${params.join('&')}`;
    }
    
    const result = await makeQboApiCall(userId, realmId, endpoint);
    return result;
  } catch (error) {
    console.error('Error fetching customer sales report:', error);
    throw error;
  }
}

/**
 * Get vendor expenses report from QBO
 */
export async function getVendorExpensesReport(userId: string, realmId: string | undefined, options?: {
  startDate?: string;
  endDate?: string;
  summarizeColumnBy?: string;
  columns?: string;
}) {
  try {
    const { realmId: actualRealmId } = await getQboApiClient(userId, realmId);
    let endpoint = `/v3/company/${encodeURIComponent(actualRealmId)}/reports/VendorExpenses`;
    
    const params: string[] = [];
    if (options?.startDate) {
      params.push(`start_date=${encodeURIComponent(options.startDate)}`);
    }
    if (options?.endDate) {
      params.push(`end_date=${encodeURIComponent(options.endDate)}`);
    }
    if (options?.summarizeColumnBy) {
      params.push(`summarize_column_by=${encodeURIComponent(options.summarizeColumnBy)}`);
    }
    if (options?.columns) {
      params.push(`columns=${encodeURIComponent(options.columns)}`);
    }
    
    if (params.length > 0) {
      endpoint += `?${params.join('&')}`;
    }
    
    const result = await makeQboApiCall(userId, realmId, endpoint);
    return result;
  } catch (error) {
    console.error('Error fetching vendor expenses report:', error);
    throw error;
  }
}

/**
 * Get tax agency from QBO
 */
export async function getTaxAgency(userId: string, realmId: string | undefined, options?: {
  maxResults?: number;
  startPosition?: number;
}) {
  try {
    const { realmId: actualRealmId } = await getQboApiClient(userId, realmId);
    let endpoint = `/v3/company/${encodeURIComponent(actualRealmId)}/query?query=SELECT * FROM TaxAgency`;
    
    if (options?.maxResults) {
      endpoint += ` MAXRESULTS ${options.maxResults}`;
    }
    if (options?.startPosition) {
      endpoint += ` STARTPOSITION ${options.startPosition}`;
    }
    
    const result = await makeQboApiCall(userId, realmId, endpoint);
    return {
      QueryResponse: result.QueryResponse || {},
      taxAgencies: result.QueryResponse?.TaxAgency || []
    };
  } catch (error) {
    console.error('Error fetching tax agency:', error);
    throw error;
  }
}

/**
 * Get tax report from QBO
 */
export async function getTaxReport(userId: string, realmId: string | undefined, options?: {
  startDate?: string;
  endDate?: string;
  summarizeColumnBy?: string;
  columns?: string;
}) {
  try {
    const { realmId: actualRealmId } = await getQboApiClient(userId, realmId);
    let endpoint = `/v3/company/${encodeURIComponent(actualRealmId)}/reports/TaxSummary`;
    
    const params: string[] = [];
    if (options?.startDate) {
      params.push(`start_date=${encodeURIComponent(options.startDate)}`);
    }
    if (options?.endDate) {
      params.push(`end_date=${encodeURIComponent(options.endDate)}`);
    }
    if (options?.summarizeColumnBy) {
      params.push(`summarize_column_by=${encodeURIComponent(options.summarizeColumnBy)}`);
    }
    if (options?.columns) {
      params.push(`columns=${encodeURIComponent(options.columns)}`);
    }
    
    if (params.length > 0) {
      endpoint += `?${params.join('&')}`;
    }
    
    const result = await makeQboApiCall(userId, realmId, endpoint);
    return result;
  } catch (error) {
    console.error('Error fetching tax report:', error);
    throw error;
  }
}

