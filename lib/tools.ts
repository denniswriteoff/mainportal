import { tool } from "ai";
import { z } from "zod";
import { prisma } from '@/lib/db';
import { getOrganisation, getContacts, getInvoices, getAccounts, getItems, getBankTransactions, getProfitAndLossReport, getBalanceSheetReport, getCreditNotes, getTaxRates, getPayments, getTrialBalanceReport, getPayrollEmployees, getAgedPayablesByContact, getLeaveTypes } from './xero-api';
import { getCompanyInfo, getCustomers, getVendors, getInvoices as getQboInvoices, getInvoiceById, getPayments as getQboPayments, getPaymentById, getPurchases, getPurchaseById, getBills, getBillById, getAccounts as getQboAccounts, getAccountById, getEstimates, getProfitAndLossReport as getQboProfitAndLossReport, getSalesReport, getExpensesReport, getItemSalesReport, getCustomerSalesReport, getVendorExpensesReport, getTaxAgency, getTaxReport } from './qbo-api';
import { authOptions } from '@/lib/auth';

// Xero Tools - Read-only operations
export const getXeroOrganisationTool = tool({
  description: "Get Xero organization information including name, address, tax settings, and other business details. Automatically uses your connected Xero organization.",
  inputSchema: z.object({}),
  execute: async () => {
    try {
      // Get the current user ID from session
      const { getServerSession } = await import('next-auth');
      const session = await getServerSession(authOptions);
      
      if (!session?.user?.email) {
        return {
          success: false,
          error: "Authentication required. Please log in to use Xero tools."
        };
      }

      // Get user ID from database
      const user = await prisma.user.findUnique({
        where: { email: session.user.email },
        select: { id: true }
      });

      if (!user) {
        return {
          success: false,
          error: "User not found. Please contact support."
        };
      }

      const userId = user.id;
      
      // Get the connected tenant ID from user's tokens
      const userTokens = await prisma.xeroToken.findFirst({
        where: { userId }
      });
      if (!userTokens) {
        return {
          success: false,
          error: "No Xero connection found. Please connect to Xero first in your profile settings."
        };
      }
      
      // Auto-refresh token if expired and get organization
      const organisation = await getOrganisation(userId, userTokens.tenantId);
      
      if (!organisation) {
        return {
          success: false,
          error: "No organization found"
        };
      }

      return {
        success: true,
        organisation: organisation
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get organization'
      };
    }
  }
});

export const getXeroContactsTool = tool({
  description: "Get contacts from Xero including customers, suppliers, and other business contacts. Use filters to get specific types of contacts.",
  inputSchema: z.object({
    page: z.number().optional().describe("Page number for pagination (default: 1), page size is 20"),
    where: z.string().optional().describe("Filter criteria (e.g., 'IsCustomer==true' or 'IsSupplier==true')"),
    order: z.string().optional().describe("Sort order (e.g., 'Name ASC' or 'UpdatedDateUTC DESC')")
  }),
  execute: async ({ page = 1, where, order }) => {
    try {
      // Get the current user ID from session
      const { getServerSession } = await import('next-auth');
      const session = await getServerSession(authOptions);
      
      if (!session?.user?.email) {
        return {
          success: false,
          error: "Authentication required. Please log in to use Xero tools."
        };
      }

      // Get user ID from database
      const user = await prisma.user.findUnique({
        where: { email: session.user.email },
        select: { id: true }
      });

      if (!user) {
        return {
          success: false,
          error: "User not found. Please contact support."
        };
      }

      const userId = user.id;
      
      // Get the connected tenant ID from user's tokens
      const userTokens = await prisma.xeroToken.findFirst({
        where: { userId }
      });
      if (!userTokens) {
        return {
          success: false,
          error: "No Xero connection found. Please connect to Xero first in your profile settings."
        };
      }
      
      // Auto-refresh token if expired and get contacts
      const contactsResponse = await getContacts(userId, userTokens.tenantId, { page, where, order });
      
      if (!contactsResponse || !contactsResponse.contacts) {
        return {
          success: false,
          error: "No contacts found"
        };
      }

      const contacts = contactsResponse.contacts;

      return {
        success: true,
        contacts
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get contacts'
      };
    }
  }
});

export const getXeroInvoicesTool = tool({
  description: "Get invoices from Xero including sales invoices, purchase bills, and credit notes. Use filters to get specific types or statuses.",
  inputSchema: z.object({
    page: z.number().optional().describe("Page number for pagination (default: 1), page size is 20"),
    where: z.string().optional().describe("Filter criteria (e.g., 'Type=\"ACCREC\"' for sales invoices or 'Status=\"AUTHORISED\"')"),
    order: z.string().optional().describe("Sort order (e.g., 'InvoiceNumber ASC' or 'Date DESC')"),
    statuses: z.array(z.string()).optional().describe("Filter by status (e.g., ['AUTHORISED', 'PAID'])")
  }),
  execute: async ({ page = 1, where, order, statuses }) => {
    try {
      // Get the current user ID from session
      const { getServerSession } = await import('next-auth');
      const session = await getServerSession(authOptions);
      
      if (!session?.user?.email) {
        return {
          success: false,
          error: "Authentication required. Please log in to use Xero tools."
        };
      }

      // Get user ID from database
      const user = await prisma.user.findUnique({
        where: { email: session.user.email },
        select: { id: true }
      });

      if (!user) {
        return {
          success: false,
          error: "User not found. Please contact support."
        };
      }

      const userId = user.id;
      
      // Get the connected tenant ID from user's tokens
      const userTokens = await prisma.xeroToken.findFirst({
        where: { userId }
      });
      if (!userTokens) {
        return {
          success: false,
          error: "No Xero connection found. Please connect to Xero first in your profile settings."
        };
      }
      
      // Auto-refresh token if expired and get invoices
      const invoicesResponse = await getInvoices(userId, userTokens.tenantId, { page, where, order, statuses });
      
      if (!invoicesResponse || !invoicesResponse.invoices) {
        return {
          success: false,
          error: "No invoices found"
        };
      }

      const invoices = invoicesResponse.invoices

      return {
        success: true,
        invoices
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get invoices'
      };
    }
  }
});

export const getXeroAccountsTool = tool({
  description: "Get chart of accounts from Xero including assets, liabilities, equity, revenue, and expense accounts.",
  inputSchema: z.object({
    where: z.string().optional().describe("Filter criteria (e.g., 'Status=\"ACTIVE\"' or 'Type=\"REVENUE\"')"),
    order: z.string().optional().describe("Sort order (e.g., 'Name ASC' or 'Code ASC')")
  }),
  execute: async ({ where, order }) => {
    try {
      // Get the current user ID from session
      const { getServerSession } = await import('next-auth');
      const session = await getServerSession(authOptions);
      
      if (!session?.user?.email) {
        return {
          success: false,
          error: "Authentication required. Please log in to use Xero tools."
        };
      }

      // Get user ID from database
      const user = await prisma.user.findUnique({
        where: { email: session.user.email },
        select: { id: true }
      });

      if (!user) {
        return {
          success: false,
          error: "User not found. Please contact support."
        };
      }

      const userId = user.id;
      
      // Get the connected tenant ID from user's tokens
      const userTokens = await prisma.xeroToken.findFirst({
        where: { userId }
      });
      if (!userTokens) {
        return {
          success: false,
          error: "No Xero connection found. Please connect to Xero first in your profile settings."
        };
      }
      
      // Auto-refresh token if expired and get accounts
      const accountsResponse = await getAccounts(userId, userTokens.tenantId, { where, order });
      
      if (!accountsResponse || !accountsResponse.accounts) {
        return {
          success: false,
          error: "No accounts found"
        };
      }

      const accounts = accountsResponse.accounts;

      return {
        success: true,
        accounts
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get accounts'
      };
    }
  }
});

export const getXeroItemsTool = tool({
  description: "Get items/products from Xero including inventory items, services, and other sellable products.",
  inputSchema: z.object({
    where: z.string().optional().describe("Filter criteria (e.g., 'IsTrackedAsInventory==true' or 'IsSold==true')"),
    order: z.string().optional().describe("Sort order (e.g., 'Name ASC' or 'UpdatedDateUTC DESC')"),
    unitdp: z.number().optional().describe("Unit decimal places (default: 2)")
  }),
  execute: async ({ where, order, unitdp }) => {
    try {
      // Get the current user ID from session
      const { getServerSession } = await import('next-auth');
      const session = await getServerSession(authOptions);
      
      if (!session?.user?.email) {
        return {
          success: false,
          error: "Authentication required. Please log in to use Xero tools."
        };
      }

      // Get user ID from database
      const user = await prisma.user.findUnique({
        where: { email: session.user.email },
        select: { id: true }
      });

      if (!user) {
        return {
          success: false,
          error: "User not found. Please contact support."
        };
      }

      const userId = user.id;
      
      // Get the connected tenant ID from user's tokens
      const userTokens = await prisma.xeroToken.findFirst({
        where: { userId }
      });
      if (!userTokens) {
        return {
          success: false,
          error: "No Xero connection found. Please connect to Xero first in your profile settings."
        };
      }
      
      // Auto-refresh token if expired and get items
      const itemsResponse = await getItems(userId, userTokens.tenantId, { where, order, unitdp });
      
      if (!itemsResponse || !itemsResponse.items) {
        return {
          success: false,
          error: "No items found"
        };
      }

      const items = itemsResponse.items;

      return {
        success: true,
        items
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get items'
      };
    }
  }
});

export const getXeroBankTransactionsTool = tool({
  description: "Get bank transactions from Xero including bank account transactions, deposits, withdrawals, and transfers.",
  inputSchema: z.object({
    page: z.number().optional().describe("Page number for pagination (default: 1), page size is 20"),
    where: z.string().optional().describe("Filter criteria (e.g., 'Type=\"SPEND\"' or 'BankAccount.Code=\"090\"')"),
    order: z.string().optional().describe("Sort order (e.g., 'Date DESC' or 'UpdatedDateUTC DESC')")
  }),
  execute: async ({ page = 1, where, order }) => {
    try {
      // Get the current user ID from session
      const { getServerSession } = await import('next-auth');
      const session = await getServerSession(authOptions);
      
      if (!session?.user?.email) {
        return {
          success: false,
          error: "Authentication required. Please log in to use Xero tools."
        };
      }

      // Get user ID from database
      const user = await prisma.user.findUnique({
        where: { email: session.user.email },
        select: { id: true }
      });

      if (!user) {
        return {
          success: false,
          error: "User not found. Please contact support."
        };
      }

      const userId = user.id;
      
      // Get the connected tenant ID from user's tokens
      const userTokens = await prisma.xeroToken.findFirst({
        where: { userId }
      });
      if (!userTokens) {
        return {
          success: false,
          error: "No Xero connection found. Please connect to Xero first in your profile settings."
        };
      }
      
      // Auto-refresh token if expired and get bank transactions
      const transactionsResponse = await getBankTransactions(userId, userTokens.tenantId, { page, where, order });
      
      if (!transactionsResponse || !transactionsResponse.bankTransactions) {
        return {
          success: false,
          error: "No bank transactions found"
        };
      }

      const transactions = transactionsResponse.bankTransactions;

      return {
        success: true,
        transactions
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get bank transactions'
      };
    }
  }
});

export const getXeroProfitAndLossTool = tool({
  description: "Get Xero profit and loss report showing revenue, expenses, and net profit/loss over a specified period. Useful for financial analysis and reporting.",
  inputSchema: z.object({
    fromDate: z.string().optional().describe("Start date for the report (YYYY-MM-DD format). If not provided, defaults to start of current financial year."),
    toDate: z.string().optional().describe("End date for the report (YYYY-MM-DD format). If not provided, defaults to current date."),
    periods: z.number().optional().describe("Number of periods to compare (1-12). Default is 1 for single period."),
    timeframe: z.enum(['MONTH', 'QUARTER', 'YEAR']).optional().describe("Time frame for the report periods. Default is MONTH."),
    standardLayout: z.boolean().optional().describe("Use standard layout format (true) or detailed layout (false). Default is true."),
    paymentsOnly: z.boolean().optional().describe("Show only cash-based transactions (true) or accrual-based (false). Default is false.")
  }),
  execute: async ({ fromDate, toDate, periods, timeframe, standardLayout, paymentsOnly }) => {
    try {
      // Get the current user ID from session
      const { getServerSession } = await import('next-auth');
      const session = await getServerSession(authOptions);
      
      if (!session?.user?.email) {
        return {
          success: false,
          error: "Authentication required. Please log in to use Xero tools."
        };
      }

      // Get user ID from database
      const user = await prisma.user.findUnique({
        where: { email: session.user.email },
        select: { id: true }
      });

      if (!user) {
        return {
          success: false,
          error: "User not found. Please contact support."
        };
      }

      const userId = user.id;
      
      // Get the connected tenant ID from user's tokens
      const userTokens = await prisma.xeroToken.findFirst({
        where: { userId }
      });
      if (!userTokens) {
        return {
          success: false,
          error: "No Xero connection found. Please connect to Xero first in your profile settings."
        };
      }
      
      const reportResponse = await getProfitAndLossReport(userId, userTokens.tenantId, {
        fromDate,
        toDate,
        periods,
        timeframe,
        standardLayout,
        paymentsOnly
      });
      
      return {
        success: true,
        report: reportResponse
      };
    } catch (error) {
      console.error('Error getting profit and loss report:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get profit and loss report'
      };
    }
  }
});

export const getXeroBalanceSheetTool = tool({
  description: "Get Xero balance sheet report showing assets, liabilities, and equity at a specific date. Useful for understanding financial position and net worth.",
  inputSchema: z.object({
    date: z.string().optional().describe("Date for the balance sheet report (YYYY-MM-DD format). If not provided, defaults to current date."),
    periods: z.number().optional().describe("Number of periods to compare (1-12). Default is 1 for single period."),
    timeframe: z.enum(['MONTH', 'QUARTER', 'YEAR']).optional().describe("Time frame for the report periods. Default is MONTH."),
    trackingOptionID1: z.string().optional().describe("The tracking option 1 for the balance sheet report"),
    trackingOptionID2: z.string().optional().describe("The tracking option 2 for the balance sheet report"),
    standardLayout: z.boolean().optional().describe("Use standard layout format (true) or detailed layout (false). Default is true."),
    paymentsOnly: z.boolean().optional().describe("Show only cash-based transactions (true) or accrual-based (false). Default is false.")
  }),
  execute: async ({ date, periods, timeframe, trackingOptionID1, trackingOptionID2, standardLayout, paymentsOnly }) => {
    try {
      // Get the current user ID from session
      const { getServerSession } = await import('next-auth');
      const session = await getServerSession(authOptions);
      
      if (!session?.user?.email) {
        return {
          success: false,
          error: "Authentication required. Please log in to use Xero tools."
        };
      }

      // Get user ID from database
      const user = await prisma.user.findUnique({
        where: { email: session.user.email },
        select: { id: true }
      });

      if (!user) {
        return {
          success: false,
          error: "User not found. Please contact support."
        };
      }

      const userId = user.id;
      
      // Get the connected tenant ID from user's tokens
      const userTokens = await prisma.xeroToken.findFirst({
        where: { userId }
      });
      if (!userTokens) {
        return {
          success: false,
          error: "No Xero connection found. Please connect to Xero first in your profile settings."
        };
      }
      
      const reportResponse = await getBalanceSheetReport(userId, userTokens.tenantId, {
        date,
        periods,
        timeframe,
        trackingOptionID1,
        trackingOptionID2,
        standardLayout,
        paymentsOnly
      });
      
      return {
        success: true,
        report: reportResponse
      };
    } catch (error) {
      console.error('Error getting balance sheet report:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get balance sheet report'
      };
    }
  }
});

export const getXeroCreditNotesTool = tool({
  description: "Get Xero credit notes including customer refunds, supplier credit notes, and adjustments. Useful for tracking refunds and account credits.",
  inputSchema: z.object({
    where: z.string().optional().describe("Filter criteria (e.g., 'Status=\"AUTHORISED\"', 'Contact.Name=\"ABC Company\"')"),
    order: z.string().optional().describe("Sort order (e.g., 'Date ASC', 'CreditNoteNumber DESC')"),
    page: z.number().optional().describe("Page number for pagination (starts at 1), page size is 20"),
    unitdp: z.number().optional().describe("Unit decimal places for amounts (0-4)")
  }),
  execute: async ({ where, order, page, unitdp }) => {
    try {
      // Get the current user ID from session
      const { getServerSession } = await import('next-auth');
      const session = await getServerSession(authOptions);
      
      if (!session?.user?.email) {
        return {
          success: false,
          error: "Authentication required. Please log in to use Xero tools."
        };
      }

      // Get user ID from database
      const user = await prisma.user.findUnique({
        where: { email: session.user.email },
        select: { id: true }
      });

      if (!user) {
        return {
          success: false,
          error: "User not found. Please contact support."
        };
      }

      const userId = user.id;
      
      // Get the connected tenant ID from user's tokens
      const userTokens = await prisma.xeroToken.findFirst({
        where: { userId }
      });
      if (!userTokens) {
        return {
          success: false,
          error: "No Xero connection found. Please connect to Xero first in your profile settings."
        };
      }
      
      const creditNotesResponse = await getCreditNotes(userId, userTokens.tenantId, {
        where,
        order,
        page,
        unitdp
      });
      
      return {
        success: true,
        creditNotes: creditNotesResponse
      };
    } catch (error) {
      console.error('Error getting credit notes:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get credit notes'
      };
    }
  }
});

export const getXeroTaxRatesTool = tool({
  description: "Get Xero tax rates including GST, VAT, sales tax, and other tax configurations. Useful for understanding tax settings and compliance requirements.",
  inputSchema: z.object({
    where: z.string().optional().describe("Filter criteria (e.g., 'Name=\"GST\"', 'Status=\"ACTIVE\"')"),
    order: z.string().optional().describe("Sort order (e.g., 'Name ASC', 'TaxType DESC')")
  }),
  execute: async ({ where, order }) => {
    try {
      // Get the current user ID from session
      const { getServerSession } = await import('next-auth');
      const session = await getServerSession(authOptions);
      
      if (!session?.user?.email) {
        return {
          success: false,
          error: "Authentication required. Please log in to use Xero tools."
        };
      }

      // Get user ID from database
      const user = await prisma.user.findUnique({
        where: { email: session.user.email },
        select: { id: true }
      });

      if (!user) {
        return {
          success: false,
          error: "User not found. Please contact support."
        };
      }

      const userId = user.id;
      
      // Get the connected tenant ID from user's tokens
      const userTokens = await prisma.xeroToken.findFirst({
        where: { userId }
      });
      if (!userTokens) {
        return {
          success: false,
          error: "No Xero connection found. Please connect to Xero first in your profile settings."
        };
      }
      
      const taxRatesResponse = await getTaxRates(userId, userTokens.tenantId, {
        where,
        order
      });
      return {
        success: true,
        taxRates: taxRatesResponse
      };
    } catch (error) {
      console.error('Error getting tax rates:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get tax rates'
      };
    }
  }
});

export const getXeroPaymentsTool = tool({
  description: "Get Xero payments including customer payments, supplier payments, and account transfers. Useful for tracking cash flow and payment history.",
  inputSchema: z.object({
    where: z.string().optional().describe("Filter criteria (e.g., 'Status=\"AUTHORISED\"', 'Contact.Name=\"ABC Company\"')"),
    order: z.string().optional().describe("Sort order (e.g., 'Date ASC', 'Amount DESC')"),
    page: z.number().optional().describe("Page number for pagination (starts at 1), page size is 20"),
    ifModifiedSince: z.string().optional().describe("Only return payments modified since this date (ISO format)")
  }),
  execute: async ({ where, order, page, ifModifiedSince }) => {
    try {
      // Get the current user ID from session
      const { getServerSession } = await import('next-auth');
      const session = await getServerSession(authOptions);
      
      if (!session?.user?.email) {
        return {
          success: false,
          error: "Authentication required. Please log in to use Xero tools."
        };
      }

      // Get user ID from database
      const user = await prisma.user.findUnique({
        where: { email: session.user.email },
        select: { id: true }
      });

      if (!user) {
        return {
          success: false,
          error: "User not found. Please contact support."
        };
      }

      const userId = user.id;
      
      // Get the connected tenant ID from user's tokens
      const userTokens = await prisma.xeroToken.findFirst({
        where: { userId }
      });
      if (!userTokens) {
        return {
          success: false,
          error: "No Xero connection found. Please connect to Xero first in your profile settings."
        };
      }
      
      const paymentsResponse = await getPayments(userId, userTokens.tenantId, {
        where,
        order,
        page,
        ifModifiedSince: ifModifiedSince ? new Date(ifModifiedSince) : undefined
      });
      
      return {
        success: true,
        payments: paymentsResponse
      };
    } catch (error) {
      console.error('Error getting payments:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get payments'
      };
    }
  }
});

export const getXeroTrialBalanceTool = tool({
  description: "Get Xero trial balance report showing all account balances at a specific date. Useful for verifying accounting accuracy and preparing financial statements.",
  inputSchema: z.object({
    date: z.string().optional().describe("Date for the trial balance report (YYYY-MM-DD format). If not provided, defaults to current date."),
    paymentsOnly: z.boolean().optional().describe("Show only cash-based transactions (true) or accrual-based (false). Default is false.")
  }),
  execute: async ({ date, paymentsOnly }) => {
    try {
      // Get the current user ID from session
      const { getServerSession } = await import('next-auth');
      const session = await getServerSession(authOptions);
      
      if (!session?.user?.email) {
        return {
          success: false,
          error: "Authentication required. Please log in to use Xero tools."
        };
      }

      // Get user ID from database
      const user = await prisma.user.findUnique({
        where: { email: session.user.email },
        select: { id: true }
      });

      if (!user) {
        return {
          success: false,
          error: "User not found. Please contact support."
        };
      }

      const userId = user.id;
      
      // Get the connected tenant ID from user's tokens
      const userTokens = await prisma.xeroToken.findFirst({
        where: { userId }
      });
      if (!userTokens) {
        return {
          success: false,
          error: "No Xero connection found. Please connect to Xero first in your profile settings."
        };
      }
      
      const trialBalanceResponse = await getTrialBalanceReport(userId, userTokens.tenantId, {
        date,
        paymentsOnly
      });
      
      return {
        success: true,
        trialBalance: trialBalanceResponse
      };
    } catch (error) {
      console.error('Error getting trial balance report:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get trial balance report'
      };
    }
  }
});

export const getXeroPayrollEmployeesTool = tool({
  description: "Get Xero New Zealand payroll employees including their personal details, employment information, and payroll settings. Useful for managing staff and payroll operations.",
  inputSchema: z.object({
    filter: z.string().optional().describe("Filter criteria (e.g., 'Status=\"ACTIVE\"', 'FirstName=\"John\"')"),
    page: z.number().optional().describe("Page number for pagination (starts at 1)")
  }),
  execute: async ({ filter, page }) => {
    try {
      // Get the current user ID from session
      const { getServerSession } = await import('next-auth');
      const session = await getServerSession(authOptions);
      
      if (!session?.user?.email) {
        return {
          success: false,
          error: "Authentication required. Please log in to use Xero tools."
        };
      }

      // Get user ID from database
      const user = await prisma.user.findUnique({
        where: { email: session.user.email },
        select: { id: true }
      });

      if (!user) {
        return {
          success: false,
          error: "User not found. Please contact support."
        };
      }

      const userId = user.id;
      
      // Get the connected tenant ID from user's tokens
      const userTokens = await prisma.xeroToken.findFirst({
        where: { userId }
      });
      if (!userTokens) {
        return {
          success: false,
          error: "No Xero connection found. Please connect to Xero first in your profile settings."
        };
      }
      
      const payrollEmployeesResponse = await getPayrollEmployees(userId, userTokens.tenantId, {
        filter,
        page
      });
      
      return {
        success: true,
        payrollEmployees: payrollEmployeesResponse
      };
    } catch (error) {
      console.error('Error getting payroll employees:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get payroll employees'
      };
    }
  }
});

export const getXeroAgedPayablesTool = tool({
  description: "Get Xero aged payables by contact report showing outstanding supplier invoices grouped by age brackets. Useful for managing supplier payments and cash flow planning.",
  inputSchema: z.object({
    contactId: z.string().optional().describe("Specific contact/supplier ID to filter by. If not provided, shows all suppliers."),
    date: z.string().optional().describe("Date for the aged payables report (YYYY-MM-DD format). If not provided, defaults to current date."),
    fromDate: z.string().optional().describe("Start date for the report period (YYYY-MM-DD format)"),
    toDate: z.string().optional().describe("End date for the report period (YYYY-MM-DD format)")
  }),
  execute: async ({ contactId, date, fromDate, toDate }) => {
    try {
      // Get the current user ID from session
      const { getServerSession } = await import('next-auth');
      const session = await getServerSession(authOptions);
      
      if (!session?.user?.email) {
        return {
          success: false,
          error: "Authentication required. Please log in to use Xero tools."
        };
      }

      // Get user ID from database
      const user = await prisma.user.findUnique({
        where: { email: session.user.email },
        select: { id: true }
      });

      if (!user) {
        return {
          success: false,
          error: "User not found. Please contact support."
        };
      }

      const userId = user.id;
      
      // Get the connected tenant ID from user's tokens
      const userTokens = await prisma.xeroToken.findFirst({
        where: { userId }
      });
      if (!userTokens) {
        return {
          success: false,
          error: "No Xero connection found. Please connect to Xero first in your profile settings."
        };
      }
      
      const agedPayablesResponse = await getAgedPayablesByContact(userId, userTokens.tenantId, {
        contactId,
        date,
        fromDate,
        toDate
      });
      
      return {
        success: true,
        agedPayables: agedPayablesResponse
      };
    } catch (error) {
      console.error('Error getting aged payables by contact:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get aged payables by contact'
      };
    }
  }
});

export const getXeroLeaveTypesTool = tool({
  description: "Get Xero New Zealand payroll leave types including annual leave, sick leave, personal leave, and other leave categories. Useful for managing employee leave policies and entitlements.",
  inputSchema: z.object({
    page: z.number().optional().describe("Page number for pagination (starts at 1)"),
    activeOnly: z.boolean().optional().describe("Show only active leave types (true) or all leave types (false). Default is false.")
  }),
  execute: async ({ page, activeOnly }) => {
    try {
      // Get the current user ID from session
      const { getServerSession } = await import('next-auth');
      const session = await getServerSession(authOptions);
      
      if (!session?.user?.email) {
        return {
          success: false,
          error: "Authentication required. Please log in to use Xero tools."
        };
      }

      // Get user ID from database
      const user = await prisma.user.findUnique({
        where: { email: session.user.email },
        select: { id: true }
      });

      if (!user) {
        return {
          success: false,
          error: "User not found. Please contact support."
        };
      }

      const userId = user.id;
      
      // Get the connected tenant ID from user's tokens
      const userTokens = await prisma.xeroToken.findFirst({
        where: { userId }
      });
      if (!userTokens) {
        return {
          success: false,
          error: "No Xero connection found. Please connect to Xero first in your profile settings."
        };
      }
      
      const leaveTypesResponse = await getLeaveTypes(userId, userTokens.tenantId, {
        page,
        activeOnly
      });
      
      return {
        success: true,
        leaveTypes: leaveTypesResponse
      };
    } catch (error) {
      console.error('Error getting leave types:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get leave types'
      };
    }
  }
});

// QBO Tools - Read-only operations
export const getQboCompanyInfoTool = tool({
  description: "Get QuickBooks Online company information including name, address, tax settings, and other business details. Automatically uses your connected QBO company.",
  inputSchema: z.object({}),
  execute: async () => {
    try {
      const { getServerSession } = await import('next-auth');
      const session = await getServerSession(authOptions);
      
      if (!session?.user?.email) {
        return {
          success: false,
          error: "Authentication required. Please log in to use QBO tools."
        };
      }

      const user = await prisma.user.findUnique({
        where: { email: session.user.email },
        select: { id: true }
      });

      if (!user) {
        return {
          success: false,
          error: "User not found. Please contact support."
        };
      }

      const userId = user.id;
      
      const userTokens = await prisma.qboToken.findFirst({
        where: { userId }
      });
      if (!userTokens) {
        return {
          success: false,
          error: "No QBO connection found. Please connect to QuickBooks Online first in your profile settings."
        };
      }
      
      const companyInfo = await getCompanyInfo(userId, userTokens.realmId);
      
      if (!companyInfo) {
        return {
          success: false,
          error: "No company information found"
        };
      }

      return {
        success: true,
        companyInfo: companyInfo
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get company information'
      };
    }
  }
});

export const getQboCustomersTool = tool({
  description: "Get customers from QuickBooks Online. Use filters to get specific customers.",
  inputSchema: z.object({
    maxResults: z.number().optional().describe("Maximum number of results (default: 20)"),
    startPosition: z.number().optional().describe("Starting position for pagination (default: 1)"),
    where: z.string().optional().describe("Filter criteria (e.g., 'Active = true')")
  }),
  execute: async ({ maxResults = 20, startPosition = 1, where }) => {
    try {
      const { getServerSession } = await import('next-auth');
      const session = await getServerSession(authOptions);
      
      if (!session?.user?.email) {
        return {
          success: false,
          error: "Authentication required. Please log in to use QBO tools."
        };
      }

      const user = await prisma.user.findUnique({
        where: { email: session.user.email },
        select: { id: true }
      });

      if (!user) {
        return {
          success: false,
          error: "User not found. Please contact support."
        };
      }

      const userId = user.id;
      
      const userTokens = await prisma.qboToken.findFirst({
        where: { userId }
      });
      if (!userTokens) {
        return {
          success: false,
          error: "No QBO connection found. Please connect to QuickBooks Online first in your profile settings."
        };
      }
      
      const customersResponse = await getCustomers(userId, userTokens.realmId, { maxResults, startPosition, where });
      
      return {
        success: true,
        customers: customersResponse.customers || []
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get customers'
      };
    }
  }
});

export const getQboInvoicesTool = tool({
  description: "Get invoices from QuickBooks Online including sales invoices. Use filters to get specific invoices.",
  inputSchema: z.object({
    maxResults: z.number().optional().describe("Maximum number of results (default: 20)"),
    startPosition: z.number().optional().describe("Starting position for pagination (default: 1)"),
    where: z.string().optional().describe("Filter criteria (e.g., 'TxnDate >= '2024-01-01'')")
  }),
  execute: async ({ maxResults = 20, startPosition = 1, where }) => {
    try {
      const { getServerSession } = await import('next-auth');
      const session = await getServerSession(authOptions);
      
      if (!session?.user?.email) {
        return {
          success: false,
          error: "Authentication required. Please log in to use QBO tools."
        };
      }

      const user = await prisma.user.findUnique({
        where: { email: session.user.email },
        select: { id: true }
      });

      if (!user) {
        return {
          success: false,
          error: "User not found. Please contact support."
        };
      }

      const userId = user.id;
      
      const userTokens = await prisma.qboToken.findFirst({
        where: { userId }
      });
      if (!userTokens) {
        return {
          success: false,
          error: "No QBO connection found. Please connect to QuickBooks Online first in your profile settings."
        };
      }
      
      const invoicesResponse = await getQboInvoices(userId, userTokens.realmId, { maxResults, startPosition, where });
      
      return {
        success: true,
        invoices: invoicesResponse.invoices || []
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get invoices'
      };
    }
  }
});

export const getQboInvoiceByIdTool = tool({
  description: "Get a specific invoice from QuickBooks Online by its ID.",
  inputSchema: z.object({
    invoiceId: z.string().describe("The ID of the invoice to retrieve")
  }),
  execute: async ({ invoiceId }) => {
    try {
      const { getServerSession } = await import('next-auth');
      const session = await getServerSession(authOptions);
      
      if (!session?.user?.email) {
        return {
          success: false,
          error: "Authentication required. Please log in to use QBO tools."
        };
      }

      const user = await prisma.user.findUnique({
        where: { email: session.user.email },
        select: { id: true }
      });

      if (!user) {
        return {
          success: false,
          error: "User not found. Please contact support."
        };
      }

      const userId = user.id;
      
      const userTokens = await prisma.qboToken.findFirst({
        where: { userId }
      });
      if (!userTokens) {
        return {
          success: false,
          error: "No QBO connection found. Please connect to QuickBooks Online first in your profile settings."
        };
      }
      
      const invoice = await getInvoiceById(userId, userTokens.realmId, invoiceId);
      
      if (!invoice) {
        return {
          success: false,
          error: "Invoice not found"
        };
      }

      return {
        success: true,
        invoice: invoice
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get invoice'
      };
    }
  }
});

export const getQboPaymentsTool = tool({
  description: "Get payments from QuickBooks Online including customer payments. Use filters to get specific payments.",
  inputSchema: z.object({
    maxResults: z.number().optional().describe("Maximum number of results (default: 20)"),
    startPosition: z.number().optional().describe("Starting position for pagination (default: 1)"),
    where: z.string().optional().describe("Filter criteria")
  }),
  execute: async ({ maxResults = 20, startPosition = 1, where }) => {
    try {
      const { getServerSession } = await import('next-auth');
      const session = await getServerSession(authOptions);
      
      if (!session?.user?.email) {
        return {
          success: false,
          error: "Authentication required. Please log in to use QBO tools."
        };
      }

      const user = await prisma.user.findUnique({
        where: { email: session.user.email },
        select: { id: true }
      });

      if (!user) {
        return {
          success: false,
          error: "User not found. Please contact support."
        };
      }

      const userId = user.id;
      
      const userTokens = await prisma.qboToken.findFirst({
        where: { userId }
      });
      if (!userTokens) {
        return {
          success: false,
          error: "No QBO connection found. Please connect to QuickBooks Online first in your profile settings."
        };
      }
      
      const paymentsResponse = await getQboPayments(userId, userTokens.realmId, { maxResults, startPosition, where });
      
      return {
        success: true,
        payments: paymentsResponse.payments || []
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get payments'
      };
    }
  }
});

export const getQboPaymentByIdTool = tool({
  description: "Get a specific payment from QuickBooks Online by its ID.",
  inputSchema: z.object({
    paymentId: z.string().describe("The ID of the payment to retrieve")
  }),
  execute: async ({ paymentId }) => {
    try {
      const { getServerSession } = await import('next-auth');
      const session = await getServerSession(authOptions);
      
      if (!session?.user?.email) {
        return {
          success: false,
          error: "Authentication required. Please log in to use QBO tools."
        };
      }

      const user = await prisma.user.findUnique({
        where: { email: session.user.email },
        select: { id: true }
      });

      if (!user) {
        return {
          success: false,
          error: "User not found. Please contact support."
        };
      }

      const userId = user.id;
      
      const userTokens = await prisma.qboToken.findFirst({
        where: { userId }
      });
      if (!userTokens) {
        return {
          success: false,
          error: "No QBO connection found. Please connect to QuickBooks Online first in your profile settings."
        };
      }
      
      const payment = await getPaymentById(userId, userTokens.realmId, paymentId);
      
      if (!payment) {
        return {
          success: false,
          error: "Payment not found"
        };
      }

      return {
        success: true,
        payment: payment
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get payment'
      };
    }
  }
});

export const getQboPurchasesTool = tool({
  description: "Get purchases from QuickBooks Online. Use filters to get specific purchases.",
  inputSchema: z.object({
    maxResults: z.number().optional().describe("Maximum number of results (default: 20)"),
    startPosition: z.number().optional().describe("Starting position for pagination (default: 1)"),
    where: z.string().optional().describe("Filter criteria")
  }),
  execute: async ({ maxResults = 20, startPosition = 1, where }) => {
    try {
      const { getServerSession } = await import('next-auth');
      const session = await getServerSession(authOptions);
      
      if (!session?.user?.email) {
        return {
          success: false,
          error: "Authentication required. Please log in to use QBO tools."
        };
      }

      const user = await prisma.user.findUnique({
        where: { email: session.user.email },
        select: { id: true }
      });

      if (!user) {
        return {
          success: false,
          error: "User not found. Please contact support."
        };
      }

      const userId = user.id;
      
      const userTokens = await prisma.qboToken.findFirst({
        where: { userId }
      });
      if (!userTokens) {
        return {
          success: false,
          error: "No QBO connection found. Please connect to QuickBooks Online first in your profile settings."
        };
      }
      
      const purchasesResponse = await getPurchases(userId, userTokens.realmId, { maxResults, startPosition, where });
      
      return {
        success: true,
        purchases: purchasesResponse.purchases || []
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get purchases'
      };
    }
  }
});

export const getQboPurchaseByIdTool = tool({
  description: "Get a specific purchase from QuickBooks Online by its ID.",
  inputSchema: z.object({
    purchaseId: z.string().describe("The ID of the purchase to retrieve")
  }),
  execute: async ({ purchaseId }) => {
    try {
      const { getServerSession } = await import('next-auth');
      const session = await getServerSession(authOptions);
      
      if (!session?.user?.email) {
        return {
          success: false,
          error: "Authentication required. Please log in to use QBO tools."
        };
      }

      const user = await prisma.user.findUnique({
        where: { email: session.user.email },
        select: { id: true }
      });

      if (!user) {
        return {
          success: false,
          error: "User not found. Please contact support."
        };
      }

      const userId = user.id;
      
      const userTokens = await prisma.qboToken.findFirst({
        where: { userId }
      });
      if (!userTokens) {
        return {
          success: false,
          error: "No QBO connection found. Please connect to QuickBooks Online first in your profile settings."
        };
      }
      
      const purchase = await getPurchaseById(userId, userTokens.realmId, purchaseId);
      
      if (!purchase) {
        return {
          success: false,
          error: "Purchase not found"
        };
      }

      return {
        success: true,
        purchase: purchase
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get purchase'
      };
    }
  }
});

export const getQboBillsTool = tool({
  description: "Get bills from QuickBooks Online. Use filters to get specific bills.",
  inputSchema: z.object({
    maxResults: z.number().optional().describe("Maximum number of results (default: 20)"),
    startPosition: z.number().optional().describe("Starting position for pagination (default: 1)"),
    where: z.string().optional().describe("Filter criteria")
  }),
  execute: async ({ maxResults = 20, startPosition = 1, where }) => {
    try {
      const { getServerSession } = await import('next-auth');
      const session = await getServerSession(authOptions);
      
      if (!session?.user?.email) {
        return {
          success: false,
          error: "Authentication required. Please log in to use QBO tools."
        };
      }

      const user = await prisma.user.findUnique({
        where: { email: session.user.email },
        select: { id: true }
      });

      if (!user) {
        return {
          success: false,
          error: "User not found. Please contact support."
        };
      }

      const userId = user.id;
      
      const userTokens = await prisma.qboToken.findFirst({
        where: { userId }
      });
      if (!userTokens) {
        return {
          success: false,
          error: "No QBO connection found. Please connect to QuickBooks Online first in your profile settings."
        };
      }
      
      const billsResponse = await getBills(userId, userTokens.realmId, { maxResults, startPosition, where });
      
      return {
        success: true,
        bills: billsResponse.bills || []
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get bills'
      };
    }
  }
});

export const getQboBillByIdTool = tool({
  description: "Get a specific bill from QuickBooks Online by its ID.",
  inputSchema: z.object({
    billId: z.string().describe("The ID of the bill to retrieve")
  }),
  execute: async ({ billId }) => {
    try {
      const { getServerSession } = await import('next-auth');
      const session = await getServerSession(authOptions);
      
      if (!session?.user?.email) {
        return {
          success: false,
          error: "Authentication required. Please log in to use QBO tools."
        };
      }

      const user = await prisma.user.findUnique({
        where: { email: session.user.email },
        select: { id: true }
      });

      if (!user) {
        return {
          success: false,
          error: "User not found. Please contact support."
        };
      }

      const userId = user.id;
      
      const userTokens = await prisma.qboToken.findFirst({
        where: { userId }
      });
      if (!userTokens) {
        return {
          success: false,
          error: "No QBO connection found. Please connect to QuickBooks Online first in your profile settings."
        };
      }
      
      const bill = await getBillById(userId, userTokens.realmId, billId);
      
      if (!bill) {
        return {
          success: false,
          error: "Bill not found"
        };
      }

      return {
        success: true,
        bill: bill
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get bill'
      };
    }
  }
});

export const getQboAccountsTool = tool({
  description: "Get chart of accounts from QuickBooks Online including assets, liabilities, equity, revenue, and expense accounts.",
  inputSchema: z.object({
    maxResults: z.number().optional().describe("Maximum number of results (default: 50)"),
    startPosition: z.number().optional().describe("Starting position for pagination (default: 1)"),
    where: z.string().optional().describe("Filter criteria (e.g., 'Active = true')")
  }),
  execute: async ({ maxResults = 50, startPosition = 1, where }) => {
    try {
      const { getServerSession } = await import('next-auth');
      const session = await getServerSession(authOptions);
      
      if (!session?.user?.email) {
        return {
          success: false,
          error: "Authentication required. Please log in to use QBO tools."
        };
      }

      const user = await prisma.user.findUnique({
        where: { email: session.user.email },
        select: { id: true }
      });

      if (!user) {
        return {
          success: false,
          error: "User not found. Please contact support."
        };
      }

      const userId = user.id;
      
      const userTokens = await prisma.qboToken.findFirst({
        where: { userId }
      });
      if (!userTokens) {
        return {
          success: false,
          error: "No QBO connection found. Please connect to QuickBooks Online first in your profile settings."
        };
      }
      
      const accountsResponse = await getQboAccounts(userId, userTokens.realmId, { maxResults, startPosition, where });
      
      return {
        success: true,
        accounts: accountsResponse.accounts || []
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get accounts'
      };
    }
  }
});

export const getQboAccountByIdTool = tool({
  description: "Get a specific account from QuickBooks Online by its ID.",
  inputSchema: z.object({
    accountId: z.string().describe("The ID of the account to retrieve")
  }),
  execute: async ({ accountId }) => {
    try {
      const { getServerSession } = await import('next-auth');
      const session = await getServerSession(authOptions);
      
      if (!session?.user?.email) {
        return {
          success: false,
          error: "Authentication required. Please log in to use QBO tools."
        };
      }

      const user = await prisma.user.findUnique({
        where: { email: session.user.email },
        select: { id: true }
      });

      if (!user) {
        return {
          success: false,
          error: "User not found. Please contact support."
        };
      }

      const userId = user.id;
      
      const userTokens = await prisma.qboToken.findFirst({
        where: { userId }
      });
      if (!userTokens) {
        return {
          success: false,
          error: "No QBO connection found. Please connect to QuickBooks Online first in your profile settings."
        };
      }
      
      const account = await getAccountById(userId, userTokens.realmId, accountId);
      
      if (!account) {
        return {
          success: false,
          error: "Account not found"
        };
      }

      return {
        success: true,
        account: account
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get account'
      };
    }
  }
});

export const getQboVendorsTool = tool({
  description: "Get vendors from QuickBooks Online. Use filters to get specific vendors.",
  inputSchema: z.object({
    maxResults: z.number().optional().describe("Maximum number of results (default: 20)"),
    startPosition: z.number().optional().describe("Starting position for pagination (default: 1)")
  }),
  execute: async ({ maxResults = 20, startPosition = 1 }) => {
    try {
      const { getServerSession } = await import('next-auth');
      const session = await getServerSession(authOptions);
      
      if (!session?.user?.email) {
        return {
          success: false,
          error: "Authentication required. Please log in to use QBO tools."
        };
      }

      const user = await prisma.user.findUnique({
        where: { email: session.user.email },
        select: { id: true }
      });

      if (!user) {
        return {
          success: false,
          error: "User not found. Please contact support."
        };
      }

      const userId = user.id;
      
      const userTokens = await prisma.qboToken.findFirst({
        where: { userId }
      });
      if (!userTokens) {
        return {
          success: false,
          error: "No QBO connection found. Please connect to QuickBooks Online first in your profile settings."
        };
      }
      
      const vendorsResponse = await getVendors(userId, userTokens.realmId, { maxResults, startPosition });
      
      return {
        success: true,
        vendors: vendorsResponse.vendors || []
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get vendors'
      };
    }
  }
});

export const getQboVendorByIdTool = tool({
  description: "Get a specific vendor from QuickBooks Online by its ID.",
  inputSchema: z.object({
    vendorId: z.string().describe("The ID of the vendor to retrieve")
  }),
  execute: async ({ vendorId }) => {
    try {
      const { getServerSession } = await import('next-auth');
      const session = await getServerSession(authOptions);
      
      if (!session?.user?.email) {
        return {
          success: false,
          error: "Authentication required. Please log in to use QBO tools."
        };
      }

      const user = await prisma.user.findUnique({
        where: { email: session.user.email },
        select: { id: true }
      });

      if (!user) {
        return {
          success: false,
          error: "User not found. Please contact support."
        };
      }

      const userId = user.id;
      
      const userTokens = await prisma.qboToken.findFirst({
        where: { userId }
      });
      if (!userTokens) {
        return {
          success: false,
          error: "No QBO connection found. Please connect to QuickBooks Online first in your profile settings."
        };
      }
      
      // QBO doesn't have a direct get vendor by ID endpoint, so we'll query
      const vendorsResponse = await getVendors(userId, userTokens.realmId, { maxResults: 1000 });
      const vendor = vendorsResponse.vendors?.find((v: any) => v.Id === vendorId);
      
      if (!vendor) {
        return {
          success: false,
          error: "Vendor not found"
        };
      }

      return {
        success: true,
        vendor: vendor
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get vendor'
      };
    }
  }
});

export const getQboCustomerByIdTool = tool({
  description: "Get a specific customer from QuickBooks Online by its ID.",
  inputSchema: z.object({
    customerId: z.string().describe("The ID of the customer to retrieve")
  }),
  execute: async ({ customerId }) => {
    try {
      const { getServerSession } = await import('next-auth');
      const session = await getServerSession(authOptions);
      
      if (!session?.user?.email) {
        return {
          success: false,
          error: "Authentication required. Please log in to use QBO tools."
        };
      }

      const user = await prisma.user.findUnique({
        where: { email: session.user.email },
        select: { id: true }
      });

      if (!user) {
        return {
          success: false,
          error: "User not found. Please contact support."
        };
      }

      const userId = user.id;
      
      const userTokens = await prisma.qboToken.findFirst({
        where: { userId }
      });
      if (!userTokens) {
        return {
          success: false,
          error: "No QBO connection found. Please connect to QuickBooks Online first in your profile settings."
        };
      }
      
      // QBO doesn't have a direct get customer by ID endpoint, so we'll query
      const customersResponse = await getCustomers(userId, userTokens.realmId, { maxResults: 1000 });
      const customer = customersResponse.customers?.find((c: any) => c.Id === customerId);
      
      if (!customer) {
        return {
          success: false,
          error: "Customer not found"
        };
      }

      return {
        success: true,
        customer: customer
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get customer'
      };
    }
  }
});

export const getQboEstimatesTool = tool({
  description: "Get estimates from QuickBooks Online. Use filters to get specific estimates.",
  inputSchema: z.object({
    maxResults: z.number().optional().describe("Maximum number of results (default: 20)"),
    startPosition: z.number().optional().describe("Starting position for pagination (default: 1)"),
    where: z.string().optional().describe("Filter criteria")
  }),
  execute: async ({ maxResults = 20, startPosition = 1, where }) => {
    try {
      const { getServerSession } = await import('next-auth');
      const session = await getServerSession(authOptions);
      
      if (!session?.user?.email) {
        return {
          success: false,
          error: "Authentication required. Please log in to use QBO tools."
        };
      }

      const user = await prisma.user.findUnique({
        where: { email: session.user.email },
        select: { id: true }
      });

      if (!user) {
        return {
          success: false,
          error: "User not found. Please contact support."
        };
      }

      const userId = user.id;
      
      const userTokens = await prisma.qboToken.findFirst({
        where: { userId }
      });
      if (!userTokens) {
        return {
          success: false,
          error: "No QBO connection found. Please connect to QuickBooks Online first in your profile settings."
        };
      }
      
      const estimatesResponse = await getEstimates(userId, userTokens.realmId, { maxResults, startPosition, where });
      
      return {
        success: true,
        estimates: estimatesResponse.estimates || []
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get estimates'
      };
    }
  }
});

export const getQboProfitAndLossTool = tool({
  description: "Get QuickBooks Online profit and loss report showing revenue, expenses, and net profit/loss over a specified period. Useful for financial analysis and reporting.",
  inputSchema: z.object({
    startDate: z.string().optional().describe("Start date for the report (YYYY-MM-DD format). If not provided, defaults to start of current fiscal year."),
    endDate: z.string().optional().describe("End date for the report (YYYY-MM-DD format). If not provided, defaults to current date."),
    summarizeColumnBy: z.string().optional().describe("How to summarize columns (e.g., 'Month', 'Quarter', 'Year')"),
    columns: z.string().optional().describe("Columns to include in the report")
  }),
  execute: async ({ startDate, endDate, summarizeColumnBy, columns }) => {
    try {
      const { getServerSession } = await import('next-auth');
      const session = await getServerSession(authOptions);
      
      if (!session?.user?.email) {
        return {
          success: false,
          error: "Authentication required. Please log in to use QBO tools."
        };
      }

      const user = await prisma.user.findUnique({
        where: { email: session.user.email },
        select: { id: true }
      });

      if (!user) {
        return {
          success: false,
          error: "User not found. Please contact support."
        };
      }

      const userId = user.id;
      
      const userTokens = await prisma.qboToken.findFirst({
        where: { userId }
      });
      if (!userTokens) {
        return {
          success: false,
          error: "No QBO connection found. Please connect to QuickBooks Online first in your profile settings."
        };
      }
      
      const reportResponse = await getQboProfitAndLossReport(userId, userTokens.realmId, {
        startDate,
        endDate,
        summarizeColumnBy,
        columns
      });
      
      return {
        success: true,
        report: reportResponse
      };
    } catch (error) {
      console.error('Error getting profit and loss report:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get profit and loss report'
      };
    }
  }
});

export const getQboSalesTool = tool({
  description: "Get QuickBooks Online sales report showing sales by customer over a specified period.",
  inputSchema: z.object({
    startDate: z.string().optional().describe("Start date for the report (YYYY-MM-DD format)"),
    endDate: z.string().optional().describe("End date for the report (YYYY-MM-DD format)"),
    summarizeColumnBy: z.string().optional().describe("How to summarize columns (e.g., 'Month', 'Quarter', 'Year')"),
    columns: z.string().optional().describe("Columns to include in the report")
  }),
  execute: async ({ startDate, endDate, summarizeColumnBy, columns }) => {
    try {
      const { getServerSession } = await import('next-auth');
      const session = await getServerSession(authOptions);
      
      if (!session?.user?.email) {
        return {
          success: false,
          error: "Authentication required. Please log in to use QBO tools."
        };
      }

      const user = await prisma.user.findUnique({
        where: { email: session.user.email },
        select: { id: true }
      });

      if (!user) {
        return {
          success: false,
          error: "User not found. Please contact support."
        };
      }

      const userId = user.id;
      
      const userTokens = await prisma.qboToken.findFirst({
        where: { userId }
      });
      if (!userTokens) {
        return {
          success: false,
          error: "No QBO connection found. Please connect to QuickBooks Online first in your profile settings."
        };
      }
      
      const reportResponse = await getSalesReport(userId, userTokens.realmId, {
        startDate,
        endDate,
        summarizeColumnBy,
        columns
      });
      
      return {
        success: true,
        report: reportResponse
      };
    } catch (error) {
      console.error('Error getting sales report:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get sales report'
      };
    }
  }
});

export const getQboExpensesTool = tool({
  description: "Get QuickBooks Online expenses report showing expenses over a specified period.",
  inputSchema: z.object({
    startDate: z.string().optional().describe("Start date for the report (YYYY-MM-DD format)"),
    endDate: z.string().optional().describe("End date for the report (YYYY-MM-DD format)"),
    summarizeColumnBy: z.string().optional().describe("How to summarize columns (e.g., 'Month', 'Quarter', 'Year')"),
    columns: z.string().optional().describe("Columns to include in the report")
  }),
  execute: async ({ startDate, endDate, summarizeColumnBy, columns }) => {
    try {
      const { getServerSession } = await import('next-auth');
      const session = await getServerSession(authOptions);
      
      if (!session?.user?.email) {
        return {
          success: false,
          error: "Authentication required. Please log in to use QBO tools."
        };
      }

      const user = await prisma.user.findUnique({
        where: { email: session.user.email },
        select: { id: true }
      });

      if (!user) {
        return {
          success: false,
          error: "User not found. Please contact support."
        };
      }

      const userId = user.id;
      
      const userTokens = await prisma.qboToken.findFirst({
        where: { userId }
      });
      if (!userTokens) {
        return {
          success: false,
          error: "No QBO connection found. Please connect to QuickBooks Online first in your profile settings."
        };
      }
      
      const reportResponse = await getExpensesReport(userId, userTokens.realmId, {
        startDate,
        endDate,
        summarizeColumnBy,
        columns
      });
      
      return {
        success: true,
        report: reportResponse
      };
    } catch (error) {
      console.error('Error getting expenses report:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get expenses report'
      };
    }
  }
});

export const getQboItemSalesTool = tool({
  description: "Get QuickBooks Online item sales report showing sales by item over a specified period.",
  inputSchema: z.object({
    startDate: z.string().optional().describe("Start date for the report (YYYY-MM-DD format)"),
    endDate: z.string().optional().describe("End date for the report (YYYY-MM-DD format)"),
    summarizeColumnBy: z.string().optional().describe("How to summarize columns (e.g., 'Month', 'Quarter', 'Year')"),
    columns: z.string().optional().describe("Columns to include in the report")
  }),
  execute: async ({ startDate, endDate, summarizeColumnBy, columns }) => {
    try {
      const { getServerSession } = await import('next-auth');
      const session = await getServerSession(authOptions);
      
      if (!session?.user?.email) {
        return {
          success: false,
          error: "Authentication required. Please log in to use QBO tools."
        };
      }

      const user = await prisma.user.findUnique({
        where: { email: session.user.email },
        select: { id: true }
      });

      if (!user) {
        return {
          success: false,
          error: "User not found. Please contact support."
        };
      }

      const userId = user.id;
      
      const userTokens = await prisma.qboToken.findFirst({
        where: { userId }
      });
      if (!userTokens) {
        return {
          success: false,
          error: "No QBO connection found. Please connect to QuickBooks Online first in your profile settings."
        };
      }
      
      const reportResponse = await getItemSalesReport(userId, userTokens.realmId, {
        startDate,
        endDate,
        summarizeColumnBy,
        columns
      });
      
      return {
        success: true,
        report: reportResponse
      };
    } catch (error) {
      console.error('Error getting item sales report:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get item sales report'
      };
    }
  }
});

export const getQboCustomerSalesTool = tool({
  description: "Get QuickBooks Online customer sales report showing sales by customer over a specified period.",
  inputSchema: z.object({
    startDate: z.string().optional().describe("Start date for the report (YYYY-MM-DD format)"),
    endDate: z.string().optional().describe("End date for the report (YYYY-MM-DD format)"),
    summarizeColumnBy: z.string().optional().describe("How to summarize columns (e.g., 'Month', 'Quarter', 'Year')"),
    columns: z.string().optional().describe("Columns to include in the report")
  }),
  execute: async ({ startDate, endDate, summarizeColumnBy, columns }) => {
    try {
      const { getServerSession } = await import('next-auth');
      const session = await getServerSession(authOptions);
      
      if (!session?.user?.email) {
        return {
          success: false,
          error: "Authentication required. Please log in to use QBO tools."
        };
      }

      const user = await prisma.user.findUnique({
        where: { email: session.user.email },
        select: { id: true }
      });

      if (!user) {
        return {
          success: false,
          error: "User not found. Please contact support."
        };
      }

      const userId = user.id;
      
      const userTokens = await prisma.qboToken.findFirst({
        where: { userId }
      });
      if (!userTokens) {
        return {
          success: false,
          error: "No QBO connection found. Please connect to QuickBooks Online first in your profile settings."
        };
      }
      
      const reportResponse = await getCustomerSalesReport(userId, userTokens.realmId, {
        startDate,
        endDate,
        summarizeColumnBy,
        columns
      });
      
      return {
        success: true,
        report: reportResponse
      };
    } catch (error) {
      console.error('Error getting customer sales report:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get customer sales report'
      };
    }
  }
});

export const getQboVendorExpensesTool = tool({
  description: "Get QuickBooks Online vendor expenses report showing expenses by vendor over a specified period.",
  inputSchema: z.object({
    startDate: z.string().optional().describe("Start date for the report (YYYY-MM-DD format)"),
    endDate: z.string().optional().describe("End date for the report (YYYY-MM-DD format)"),
    summarizeColumnBy: z.string().optional().describe("How to summarize columns (e.g., 'Month', 'Quarter', 'Year')"),
    columns: z.string().optional().describe("Columns to include in the report")
  }),
  execute: async ({ startDate, endDate, summarizeColumnBy, columns }) => {
    try {
      const { getServerSession } = await import('next-auth');
      const session = await getServerSession(authOptions);
      
      if (!session?.user?.email) {
        return {
          success: false,
          error: "Authentication required. Please log in to use QBO tools."
        };
      }

      const user = await prisma.user.findUnique({
        where: { email: session.user.email },
        select: { id: true }
      });

      if (!user) {
        return {
          success: false,
          error: "User not found. Please contact support."
        };
      }

      const userId = user.id;
      
      const userTokens = await prisma.qboToken.findFirst({
        where: { userId }
      });
      if (!userTokens) {
        return {
          success: false,
          error: "No QBO connection found. Please connect to QuickBooks Online first in your profile settings."
        };
      }
      
      const reportResponse = await getVendorExpensesReport(userId, userTokens.realmId, {
        startDate,
        endDate,
        summarizeColumnBy,
        columns
      });
      
      return {
        success: true,
        report: reportResponse
      };
    } catch (error) {
      console.error('Error getting vendor expenses report:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get vendor expenses report'
      };
    }
  }
});

export const getQboTaxAgencyTool = tool({
  description: "Get tax agencies from QuickBooks Online.",
  inputSchema: z.object({
    maxResults: z.number().optional().describe("Maximum number of results (default: 20)"),
    startPosition: z.number().optional().describe("Starting position for pagination (default: 1)")
  }),
  execute: async ({ maxResults = 20, startPosition = 1 }) => {
    try {
      const { getServerSession } = await import('next-auth');
      const session = await getServerSession(authOptions);
      
      if (!session?.user?.email) {
        return {
          success: false,
          error: "Authentication required. Please log in to use QBO tools."
        };
      }

      const user = await prisma.user.findUnique({
        where: { email: session.user.email },
        select: { id: true }
      });

      if (!user) {
        return {
          success: false,
          error: "User not found. Please contact support."
        };
      }

      const userId = user.id;
      
      const userTokens = await prisma.qboToken.findFirst({
        where: { userId }
      });
      if (!userTokens) {
        return {
          success: false,
          error: "No QBO connection found. Please connect to QuickBooks Online first in your profile settings."
        };
      }
      
      const taxAgencyResponse = await getTaxAgency(userId, userTokens.realmId, { maxResults, startPosition });
      
      return {
        success: true,
        taxAgencies: taxAgencyResponse.taxAgencies || []
      };
    } catch (error) {
      console.error('Error getting tax agency:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get tax agency'
      };
    }
  }
});

export const getQboTaxReportTool = tool({
  description: "Get QuickBooks Online tax summary report showing tax information over a specified period.",
  inputSchema: z.object({
    startDate: z.string().optional().describe("Start date for the report (YYYY-MM-DD format)"),
    endDate: z.string().optional().describe("End date for the report (YYYY-MM-DD format)"),
    summarizeColumnBy: z.string().optional().describe("How to summarize columns (e.g., 'Month', 'Quarter', 'Year')"),
    columns: z.string().optional().describe("Columns to include in the report")
  }),
  execute: async ({ startDate, endDate, summarizeColumnBy, columns }) => {
    try {
      const { getServerSession } = await import('next-auth');
      const session = await getServerSession(authOptions);
      
      if (!session?.user?.email) {
        return {
          success: false,
          error: "Authentication required. Please log in to use QBO tools."
        };
      }

      const user = await prisma.user.findUnique({
        where: { email: session.user.email },
        select: { id: true }
      });

      if (!user) {
        return {
          success: false,
          error: "User not found. Please contact support."
        };
      }

      const userId = user.id;
      
      const userTokens = await prisma.qboToken.findFirst({
        where: { userId }
      });
      if (!userTokens) {
        return {
          success: false,
          error: "No QBO connection found. Please connect to QuickBooks Online first in your profile settings."
        };
      }
      
      const reportResponse = await getTaxReport(userId, userTokens.realmId, {
        startDate,
        endDate,
        summarizeColumnBy,
        columns
      });
      
      return {
        success: true,
        report: reportResponse
      };
    } catch (error) {
      console.error('Error getting tax report:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get tax report'
      };
    }
  }
});



