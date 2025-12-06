import { tool } from "ai";
import { z } from "zod";
import { prisma } from '@/lib/db';
import { getOrganisation, getContacts, getInvoices, getAccounts, getItems, getBankTransactions, getProfitAndLossReport, getBalanceSheetReport, getCreditNotes, getTaxRates, getPayments, getTrialBalanceReport, getPayrollEmployees, getAgedPayablesByContact, getLeaveTypes } from './xero-api';
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



