'use client';

import { Building2, Users, FileText, Landmark, Package, CreditCard, TrendingUp, BarChart3, FileX, Percent, DollarSign, Calculator, UserCheck, Clock, Calendar } from "lucide-react";

type TypedPartProps = {
  state: 'input-streaming' | 'input-available' | 'output-available';
  input?: any;
  role?: string;
  id?: string | number;
  idx?: number;
  toolName?: string;
};

type ResultPartProps = {
  output: unknown;
  role?: string;
  id?: string | number;
  idx?: number;
  toolName?: string;
};

const toolIcons: Record<string, React.ComponentType<any>> = {
  getXeroOrganisation: Building2,
  getXeroContacts: Users,
  getXeroInvoices: FileText,
  getXeroAccounts: Landmark,
  getXeroItems: Package,
  getXeroBankTransactions: CreditCard,
  getXeroProfitAndLoss: TrendingUp,
  getXeroBalanceSheet: BarChart3,
  getXeroCreditNotes: FileX,
  getXeroTaxRates: Percent,
  getXeroPayments: DollarSign,
  getXeroTrialBalance: Calculator,
  getXeroPayrollEmployees: UserCheck,
  getXeroAgedPayables: Clock,
  getXeroLeaveTypes: Calendar
};

const toolLabels: Record<string, string> = {
  getXeroOrganisation: 'organization',
  getXeroContacts: 'contacts',
  getXeroInvoices: 'invoices',
  getXeroAccounts: 'accounts',
  getXeroItems: 'items',
  getXeroBankTransactions: 'bank transactions',
  getXeroProfitAndLoss: 'profit & loss report',
  getXeroBalanceSheet: 'balance sheet report',
  getXeroCreditNotes: 'credit notes',
  getXeroTaxRates: 'tax rates',
  getXeroPayments: 'payments',
  getXeroTrialBalance: 'trial balance report',
  getXeroPayrollEmployees: 'payroll employees',
  getXeroAgedPayables: 'aged payables report',
  getXeroLeaveTypes: 'leave types'
};

export function XeroTypedPart({ state, input, toolName }: TypedPartProps) {
  const Icon = toolIcons[toolName || ''] || Building2;
  const label = toolLabels[toolName || ''] || 'data';
  
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 py-2">
        <div className="animate-spin">
          <Icon className="size-4 text-blue-500 dark:text-blue-400" />
        </div>
        <span className="text-gray-600 dark:text-gray-400 text-sm">
          fetching Xero {label}...
        </span>
      </div>
    </div>
  );
}

export function XeroResultPart({ output, toolName }: ResultPartProps) {
  // Parse the result if it's a string
  const parsedResult = typeof output === "string" ? JSON.parse(output) : output;
  const Icon = toolIcons[toolName || ''] || Building2;
  const label = toolLabels[toolName || ''] || 'data';
  
  // Show static completion state
  if (parsedResult.success) {
    let resultCount = 0;
    let resultText = '';
    
    // Different result counting based on tool type
    if (toolName === 'getXeroOrganisation') {
      resultCount = 1;
      resultText = 'organization details';
    } else if (toolName === 'getXeroContacts') {
      resultCount = parsedResult.contacts.length || 0;
      resultText = `contact${resultCount !== 1 ? 's' : ''}`;
    } else if (toolName === 'getXeroInvoices') {
      resultCount = parsedResult.invoices.length || 0;
      resultText = `invoice${resultCount !== 1 ? 's' : ''}`;
    } else if (toolName === 'getXeroAccounts') {
      resultCount = parsedResult.accounts.length || 0;
      resultText = `account${resultCount !== 1 ? 's' : ''}`;
    } else if (toolName === 'getXeroItems') {
      resultCount = parsedResult.items.length || 0;
      resultText = `item${resultCount !== 1 ? 's' : ''}`;
    } else if (toolName === 'getXeroBankTransactions') {
      resultCount = parsedResult.transactions.length || 0;
      resultText = `transaction${resultCount !== 1 ? 's' : ''}`;
    } else if (toolName === 'getXeroProfitAndLoss') {
      resultCount = 1;
      resultText = 'profit & loss report';
    } else if (toolName === 'getXeroBalanceSheet') {
      resultCount = 1;
      resultText = 'balance sheet report';
    } else if (toolName === 'getXeroCreditNotes') {
      resultCount = parsedResult.creditNotes.creditNotes.length || 0;
      resultText = `credit note${resultCount !== 1 ? 's' : ''}`;
    } else if (toolName === 'getXeroTaxRates') {
      resultCount = parsedResult.taxRates.taxRates.length || 0;
      resultText = `tax rate${resultCount !== 1 ? 's' : ''}`;
    } else if (toolName === 'getXeroPayments') {
      resultCount = parsedResult.payments.payments.length || 0;
      resultText = `payment${resultCount !== 1 ? 's' : ''}`;
    } else if (toolName === 'getXeroTrialBalance') {
      resultCount = 1;
      resultText = 'trial balance report';
    } else if (toolName === 'getXeroPayrollEmployees') {
      resultCount = parsedResult.payrollEmployees.employees.length || 0;
      resultText = `employee${resultCount !== 1 ? 's' : ''}`;
    } else if (toolName === 'getXeroAgedPayables') {
      resultCount = 1;
      resultText = 'aged payables report';
    } else if (toolName === 'getXeroLeaveTypes') {
      resultCount = parsedResult.leaveTypes.leaveTypes.length || 0;
      resultText = `leave type${resultCount !== 1 ? 's' : ''}`;
    } else {
      resultCount = 1;
      resultText = 'result';
    }
    
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2 py-2">
          <Icon className="size-4 text-blue-600 dark:text-blue-400" />
          <span className="text-gray-600 dark:text-gray-400 text-sm">
            retrieved {resultCount} {resultText} from Xero
          </span>
        </div>
        
      </div>
    );
  } else {
    // Handle error case
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2 py-2">
          <Icon className="size-4 text-red-500 dark:text-red-400" />
          <span className="text-gray-600 dark:text-gray-400 text-sm">
            Xero {label} fetch failed
            {parsedResult.error && (
              <span className="block text-red-600 dark:text-red-400 mt-1">
                {parsedResult.error}
              </span>
            )}
          </span>
        </div>
      </div>
    );
  }
}

// Specific tool components
export function XeroOrganisationTypedPart(props: TypedPartProps) {
  return <XeroTypedPart {...props} toolName="getXeroOrganisation" />;
}

export function XeroOrganisationResultPart(props: ResultPartProps) {
  return <XeroResultPart {...props} toolName="getXeroOrganisation" />;
}

export function XeroContactsTypedPart(props: TypedPartProps) {
  return <XeroTypedPart {...props} toolName="getXeroContacts" />;
}

export function XeroContactsResultPart(props: ResultPartProps) {
  return <XeroResultPart {...props} toolName="getXeroContacts" />;
}

export function XeroInvoicesTypedPart(props: TypedPartProps) {
  return <XeroTypedPart {...props} toolName="getXeroInvoices" />;
}

export function XeroInvoicesResultPart(props: ResultPartProps) {
  return <XeroResultPart {...props} toolName="getXeroInvoices" />;
}

export function XeroAccountsTypedPart(props: TypedPartProps) {
  return <XeroTypedPart {...props} toolName="getXeroAccounts" />;
}

export function XeroAccountsResultPart(props: ResultPartProps) {
  return <XeroResultPart {...props} toolName="getXeroAccounts" />;
}

export function XeroItemsTypedPart(props: TypedPartProps) {
  return <XeroTypedPart {...props} toolName="getXeroItems" />;
}

export function XeroItemsResultPart(props: ResultPartProps) {
  return <XeroResultPart {...props} toolName="getXeroItems" />;
}

export function XeroBankTransactionsTypedPart(props: TypedPartProps) {
  return <XeroTypedPart {...props} toolName="getXeroBankTransactions" />;
}

export function XeroBankTransactionsResultPart(props: ResultPartProps) {
  return <XeroResultPart {...props} toolName="getXeroBankTransactions" />;
}

export function XeroProfitAndLossTypedPart(props: TypedPartProps) {
  return <XeroTypedPart {...props} toolName="getXeroProfitAndLoss" />;
}

export function XeroProfitAndLossResultPart(props: ResultPartProps) {
  return <XeroResultPart {...props} toolName="getXeroProfitAndLoss" />;
}

export function XeroBalanceSheetTypedPart(props: TypedPartProps) {
  return <XeroTypedPart {...props} toolName="getXeroBalanceSheet" />;
}

export function XeroBalanceSheetResultPart(props: ResultPartProps) {
  return <XeroResultPart {...props} toolName="getXeroBalanceSheet" />;
}

export function XeroCreditNotesTypedPart(props: TypedPartProps) {
  return <XeroTypedPart {...props} toolName="getXeroCreditNotes" />;
}

export function XeroCreditNotesResultPart(props: ResultPartProps) {
  return <XeroResultPart {...props} toolName="getXeroCreditNotes" />;
}

export function XeroTaxRatesTypedPart(props: TypedPartProps) {
  return <XeroTypedPart {...props} toolName="getXeroTaxRates" />;
}

export function XeroTaxRatesResultPart(props: ResultPartProps) {
  return <XeroResultPart {...props} toolName="getXeroTaxRates" />;
}

export function XeroPaymentsTypedPart(props: TypedPartProps) {
  return <XeroTypedPart {...props} toolName="getXeroPayments" />;
}

export function XeroPaymentsResultPart(props: ResultPartProps) {
  return <XeroResultPart {...props} toolName="getXeroPayments" />;
}

export function XeroTrialBalanceTypedPart(props: TypedPartProps) {
  return <XeroTypedPart {...props} toolName="getXeroTrialBalance" />;
}

export function XeroTrialBalanceResultPart(props: ResultPartProps) {
  return <XeroResultPart {...props} toolName="getXeroTrialBalance" />;
}

export function XeroPayrollEmployeesTypedPart(props: TypedPartProps) {
  return <XeroTypedPart {...props} toolName="getXeroPayrollEmployees" />;
}

export function XeroPayrollEmployeesResultPart(props: ResultPartProps) {
  return <XeroResultPart {...props} toolName="getXeroPayrollEmployees" />;
}

export function XeroAgedPayablesTypedPart(props: TypedPartProps) {
  return <XeroTypedPart {...props} toolName="getXeroAgedPayables" />;
}

export function XeroAgedPayablesResultPart(props: ResultPartProps) {
  return <XeroResultPart {...props} toolName="getXeroAgedPayables" />;
}

export function XeroLeaveTypesTypedPart(props: TypedPartProps) {
  return <XeroTypedPart {...props} toolName="getXeroLeaveTypes" />;
}

export function XeroLeaveTypesResultPart(props: ResultPartProps) {
  return <XeroResultPart {...props} toolName="getXeroLeaveTypes" />;
}

export default XeroTypedPart;



