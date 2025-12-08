'use client';

import { Building2, Users, FileText, Landmark, DollarSign, TrendingUp, Percent, Receipt, ShoppingCart, FileCheck, UserCheck, Briefcase, Calculator } from "lucide-react";

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
  getQboCompanyInfo: Building2,
  getQboCustomers: Users,
  getQboInvoices: FileText,
  getQboAccounts: Landmark,
  getQboPayments: DollarSign,
  getQboProfitAndLoss: TrendingUp,
  getQboSales: TrendingUp,
  getQboExpenses: Receipt,
  getQboEstimates: FileCheck,
  getQboPurchases: ShoppingCart,
  getQboBills: FileText,
  getQboVendors: UserCheck,
  getQboItemSales: Briefcase,
  getQboCustomerSales: Users,
  getQboVendorExpenses: Receipt,
  getQboTaxAgency: Percent,
  getQboTaxReport: Calculator
};

const toolLabels: Record<string, string> = {
  getQboCompanyInfo: 'company information',
  getQboCustomers: 'customers',
  getQboInvoices: 'invoices',
  getQboAccounts: 'accounts',
  getQboPayments: 'payments',
  getQboProfitAndLoss: 'profit & loss report',
  getQboSales: 'sales report',
  getQboExpenses: 'expenses report',
  getQboEstimates: 'estimates',
  getQboPurchases: 'purchases',
  getQboBills: 'bills',
  getQboVendors: 'vendors',
  getQboItemSales: 'item sales report',
  getQboCustomerSales: 'customer sales report',
  getQboVendorExpenses: 'vendor expenses report',
  getQboTaxAgency: 'tax agencies',
  getQboTaxReport: 'tax report'
};

export function QboTypedPart({ state, input, toolName }: TypedPartProps) {
  const Icon = toolIcons[toolName || ''] || Building2;
  const label = toolLabels[toolName || ''] || 'data';
  
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 py-2">
        <div className="animate-spin">
          <Icon className="size-4 text-blue-500 dark:text-blue-400" />
        </div>
        <span className="text-gray-600 dark:text-gray-400 text-sm">
          fetching QuickBooks {label}...
        </span>
      </div>
    </div>
  );
}

export function QboResultPart({ output, toolName }: ResultPartProps) {
  // Parse the result if it's a string
  const parsedResult = typeof output === "string" ? JSON.parse(output) : output;
  const Icon = toolIcons[toolName || ''] || Building2;
  const label = toolLabels[toolName || ''] || 'data';
  
  // Show static completion state
  if (parsedResult.success) {
    let resultCount = 0;
    let resultText = '';
    
    // Different result counting based on tool type
    if (toolName === 'getQboCompanyInfo') {
      resultCount = 1;
      resultText = 'company information';
    } else if (toolName === 'getQboCustomers') {
      resultCount = parsedResult.customers?.length || 0;
      resultText = `customer${resultCount !== 1 ? 's' : ''}`;
    } else if (toolName === 'getQboInvoices') {
      resultCount = parsedResult.invoices?.length || 0;
      resultText = `invoice${resultCount !== 1 ? 's' : ''}`;
    } else if (toolName === 'getQboAccounts') {
      resultCount = parsedResult.accounts?.length || 0;
      resultText = `account${resultCount !== 1 ? 's' : ''}`;
    } else if (toolName === 'getQboPayments') {
      resultCount = parsedResult.payments?.length || 0;
      resultText = `payment${resultCount !== 1 ? 's' : ''}`;
    } else if (toolName === 'getQboProfitAndLoss') {
      resultCount = 1;
      resultText = 'profit & loss report';
    } else if (toolName === 'getQboSales') {
      resultCount = 1;
      resultText = 'sales report';
    } else if (toolName === 'getQboExpenses') {
      resultCount = 1;
      resultText = 'expenses report';
    } else if (toolName === 'getQboEstimates') {
      resultCount = parsedResult.estimates?.length || 0;
      resultText = `estimate${resultCount !== 1 ? 's' : ''}`;
    } else if (toolName === 'getQboPurchases') {
      resultCount = parsedResult.purchases?.length || 0;
      resultText = `purchase${resultCount !== 1 ? 's' : ''}`;
    } else if (toolName === 'getQboBills') {
      resultCount = parsedResult.bills?.length || 0;
      resultText = `bill${resultCount !== 1 ? 's' : ''}`;
    } else if (toolName === 'getQboVendors') {
      resultCount = parsedResult.vendors?.length || 0;
      resultText = `vendor${resultCount !== 1 ? 's' : ''}`;
    } else if (toolName === 'getQboItemSales') {
      resultCount = 1;
      resultText = 'item sales report';
    } else if (toolName === 'getQboCustomerSales') {
      resultCount = 1;
      resultText = 'customer sales report';
    } else if (toolName === 'getQboVendorExpenses') {
      resultCount = 1;
      resultText = 'vendor expenses report';
    } else if (toolName === 'getQboTaxAgency') {
      resultCount = parsedResult.taxAgencies?.length || 0;
      resultText = `tax agenc${resultCount !== 1 ? 'ies' : 'y'}`;
    } else if (toolName === 'getQboTaxReport') {
      resultCount = 1;
      resultText = 'tax report';
    } else {
      resultCount = 1;
      resultText = 'result';
    }
    
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2 py-2">
          <Icon className="size-4 text-blue-600 dark:text-blue-400" />
          <span className="text-gray-600 dark:text-gray-400 text-sm">
            retrieved {resultCount} {resultText} from QuickBooks
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
            QuickBooks {label} fetch failed
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

// Specific tool components - matching the tool names from qbo/app/page.tsx
export function QboCompanyInfoTypedPart(props: TypedPartProps) {
  return <QboTypedPart {...props} toolName="getQboCompanyInfo" />;
}

export function QboCompanyInfoResultPart(props: ResultPartProps) {
  return <QboResultPart {...props} toolName="getQboCompanyInfo" />;
}

export function QboCustomersTypedPart(props: TypedPartProps) {
  return <QboTypedPart {...props} toolName="getQboCustomers" />;
}

export function QboCustomersResultPart(props: ResultPartProps) {
  return <QboResultPart {...props} toolName="getQboCustomers" />;
}

export function QboInvoicesTypedPart(props: TypedPartProps) {
  return <QboTypedPart {...props} toolName="getQboInvoices" />;
}

export function QboInvoicesResultPart(props: ResultPartProps) {
  return <QboResultPart {...props} toolName="getQboInvoices" />;
}

export function QboAccountsTypedPart(props: TypedPartProps) {
  return <QboTypedPart {...props} toolName="getQboAccounts" />;
}

export function QboAccountsResultPart(props: ResultPartProps) {
  return <QboResultPart {...props} toolName="getQboAccounts" />;
}

export function QboPaymentsTypedPart(props: TypedPartProps) {
  return <QboTypedPart {...props} toolName="getQboPayments" />;
}

export function QboPaymentsResultPart(props: ResultPartProps) {
  return <QboResultPart {...props} toolName="getQboPayments" />;
}

export function QboProfitAndLossTypedPart(props: TypedPartProps) {
  return <QboTypedPart {...props} toolName="getQboProfitAndLoss" />;
}

export function QboProfitAndLossResultPart(props: ResultPartProps) {
  return <QboResultPart {...props} toolName="getQboProfitAndLoss" />;
}

export function QboSalesTypedPart(props: TypedPartProps) {
  return <QboTypedPart {...props} toolName="getQboSales" />;
}

export function QboSalesResultPart(props: ResultPartProps) {
  return <QboResultPart {...props} toolName="getQboSales" />;
}

export function QboExpensesTypedPart(props: TypedPartProps) {
  return <QboTypedPart {...props} toolName="getQboExpenses" />;
}

export function QboExpensesResultPart(props: ResultPartProps) {
  return <QboResultPart {...props} toolName="getQboExpenses" />;
}

export function QboEstimatesTypedPart(props: TypedPartProps) {
  return <QboTypedPart {...props} toolName="getQboEstimates" />;
}

export function QboEstimatesResultPart(props: ResultPartProps) {
  return <QboResultPart {...props} toolName="getQboEstimates" />;
}

export function QboPurchasesTypedPart(props: TypedPartProps) {
  return <QboTypedPart {...props} toolName="getQboPurchases" />;
}

export function QboPurchasesResultPart(props: ResultPartProps) {
  return <QboResultPart {...props} toolName="getQboPurchases" />;
}

export function QboBillsTypedPart(props: TypedPartProps) {
  return <QboTypedPart {...props} toolName="getQboBills" />;
}

export function QboBillsResultPart(props: ResultPartProps) {
  return <QboResultPart {...props} toolName="getQboBills" />;
}

export function QboVendorsTypedPart(props: TypedPartProps) {
  return <QboTypedPart {...props} toolName="getQboVendors" />;
}

export function QboVendorsResultPart(props: ResultPartProps) {
  return <QboResultPart {...props} toolName="getQboVendors" />;
}

export function QboItemSalesTypedPart(props: TypedPartProps) {
  return <QboTypedPart {...props} toolName="getQboItemSales" />;
}

export function QboItemSalesResultPart(props: ResultPartProps) {
  return <QboResultPart {...props} toolName="getQboItemSales" />;
}

export function QboCustomerSalesTypedPart(props: TypedPartProps) {
  return <QboTypedPart {...props} toolName="getQboCustomerSales" />;
}

export function QboCustomerSalesResultPart(props: ResultPartProps) {
  return <QboResultPart {...props} toolName="getQboCustomerSales" />;
}

export function QboVendorExpensesTypedPart(props: TypedPartProps) {
  return <QboTypedPart {...props} toolName="getQboVendorExpenses" />;
}

export function QboVendorExpensesResultPart(props: ResultPartProps) {
  return <QboResultPart {...props} toolName="getQboVendorExpenses" />;
}

export function QboTaxAgencyTypedPart(props: TypedPartProps) {
  return <QboTypedPart {...props} toolName="getQboTaxAgency" />;
}

export function QboTaxAgencyResultPart(props: ResultPartProps) {
  return <QboResultPart {...props} toolName="getQboTaxAgency" />;
}

export function QboTaxReportTypedPart(props: TypedPartProps) {
  return <QboTypedPart {...props} toolName="getQboTaxReport" />;
}

export function QboTaxReportResultPart(props: ResultPartProps) {
  return <QboResultPart {...props} toolName="getQboTaxReport" />;
}

export default QboTypedPart;

