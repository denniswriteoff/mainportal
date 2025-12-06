import { AnthropicProviderOptions, createAnthropic } from '@ai-sdk/anthropic';
import { streamText, type UIMessage, convertToModelMessages, tool, consumeStream } from 'ai';
import { prisma } from '@/lib/db';
import { getXeroOrganisationTool, getXeroContactsTool, getXeroInvoicesTool, getXeroAccountsTool, getXeroItemsTool, getXeroBankTransactionsTool, getXeroProfitAndLossTool, getXeroBalanceSheetTool, getXeroCreditNotesTool, getXeroTaxRatesTool, getXeroPaymentsTool, getXeroTrialBalanceTool, getXeroPayrollEmployeesTool, getXeroAgedPayablesTool, getXeroLeaveTypesTool } from '@/lib/tools';
import { z } from 'zod';

// Allow streaming responses up to 30 seconds
export const maxDuration = 300;

export async function POST(req: Request) {
  const body = await req.json();
  const incoming = (body?.messages ?? null) as unknown;
  const single = (body?.message ?? null) as unknown;
  let messages: UIMessage[] = [];
  if (Array.isArray(incoming)) {
    messages = incoming.filter(Boolean) as UIMessage[];
  } else if (incoming && typeof incoming === 'object') {
    messages = [incoming as UIMessage];
  } else if (single && typeof single === 'object') {
    messages = [single as UIMessage];
  }
  const chatId: string = body.chatId ?? body.id ?? 'default';
  const enableThinking: boolean = body.enableThinking ?? false;
  const origin = (() => {
    try { return new URL(req.url).origin; } catch { return ''; }
  })();
  const cookieHeader = req.headers.get('cookie') || '';


  // Get global system prompt
  let systemPrompt = `You are a helpful AI assistant powered by Claude. You are knowledgeable, friendly, and provide accurate information. Feel free to ask follow-up questions to better understand what the user needs. Today's date is ${new Date().toLocaleDateString()}.`;

  try {
    const settings = await prisma.systemSettings.findFirst();
    if (settings?.settings && typeof settings.settings === 'object' && 'systemPrompt' in settings.settings) {
      const customPrompt = (settings.settings as any).systemPrompt;
      if (typeof customPrompt === 'string' && customPrompt.trim()) {
        systemPrompt = customPrompt;
      }
    }
  } catch (error) {
    console.error('Error loading system settings:', error);
    // Continue with default system prompt
  }    

  // Add Xero integration information
  const xeroSection = `

**Xero Integration:**
You have access to Xero accounting tools to retrieve financial data:
- **getXeroOrganisation**: Get company/organization details from Xero
- **getXeroContacts**: Get customers, suppliers, and contacts
- **getXeroInvoices**: Get sales invoices, bills, and credit notes  
- **getXeroAccounts**: Get chart of accounts (assets, liabilities, etc.)
- **getXeroItems**: Get inventory items, products, and services
- **getXeroBankTransactions**: Get bank transactions and transfers
- **getXeroProfitAndLoss**: Get profit and loss report showing revenue, expenses, and net profit/loss
- **getXeroBalanceSheet**: Get balance sheet report showing assets, liabilities, and equity at a specific date
- **getXeroCreditNotes**: Get credit notes including customer refunds, supplier credits, and adjustments
- **getXeroTaxRates**: Get tax rates including GST, VAT, sales tax, and other tax configurations
- **getXeroPayments**: Get payments including customer payments, supplier payments, and account transfers
- **getXeroTrialBalance**: Get trial balance report showing all account balances at a specific date
- **getXeroPayrollEmployees**: Get New Zealand payroll employees including personal details and employment information
- **getXeroAgedPayables**: Get aged payables by contact report showing outstanding supplier invoices grouped by age brackets
- **getXeroLeaveTypes**: Get New Zealand payroll leave types including annual leave, sick leave, and other leave categories

**Important Notes:**
- These are read-only tools - you can only retrieve data, not create or modify
- Use filters and sorting to get specific data the user needs
- Results are limited to 20-50 items per request for performance`;

  systemPrompt += xeroSection;
  systemPrompt = systemPrompt + `

Today's date is ${new Date().toLocaleDateString()}.`;

  const anthropic = createAnthropic({
    fetch: async (url, options) => {
      const maxRetries = 3;
      const maxWaitTime = 60; // Maximum seconds to wait per retry

      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
          console.log(`Fetching (attempt ${attempt + 1}/${maxRetries + 1}):`, url);

          const response = await fetch(url, options);

          // Check if we hit a rate limit
          if (response.status === 429) {
            const retryAfter = response.headers.get('retry-after');
            const waitTime = retryAfter ? parseInt(retryAfter, 10) : Math.pow(2, attempt); // Exponential backoff fallback

            // Log rate limit information
            console.log('Rate limit hit:', {
              attempt: attempt + 1,
              retryAfter: retryAfter,
              waitTime: waitTime,
              requestsRemaining: response.headers.get('anthropic-ratelimit-requests-remaining'),
              tokensRemaining: response.headers.get('anthropic-ratelimit-tokens-remaining'),
              inputTokensRemaining: response.headers.get('anthropic-ratelimit-input-tokens-remaining'),
              outputTokensRemaining: response.headers.get('anthropic-ratelimit-output-tokens-remaining')
            });

            // Don't retry if this is the last attempt
            if (attempt === maxRetries) {
              console.log('Max retries reached, returning rate limit response');
              return response;
            }

            // Cap the wait time for safety
            const actualWaitTime = Math.min(waitTime, maxWaitTime);
            console.log(`Waiting ${actualWaitTime} seconds before retry...`);

            // Wait before retrying
            await new Promise(resolve => setTimeout(resolve, actualWaitTime * 1000));
            continue;
          }

          // Log successful request with rate limit info
          console.log('Request successful:', {
            status: response.status,
            requestsRemaining: response.headers.get('anthropic-ratelimit-requests-remaining'),
            tokensRemaining: response.headers.get('anthropic-ratelimit-tokens-remaining'),
            inputTokensRemaining: response.headers.get('anthropic-ratelimit-input-tokens-remaining'),
            outputTokensRemaining: response.headers.get('anthropic-ratelimit-output-tokens-remaining')
          });

          return response;

        } catch (error) {
          console.error(`Request failed (attempt ${attempt + 1}):`, error);

          // Don't retry on the last attempt
          if (attempt === maxRetries) {
            throw error;
          }

          // Wait before retrying on network errors
          const waitTime = Math.pow(2, attempt);
          console.log(`Waiting ${waitTime} seconds before retry due to error...`);
          await new Promise(resolve => setTimeout(resolve, waitTime * 1000));
        }
      }

      // This should never be reached, but just in case
      throw new Error('Max retries exceeded');
    },
  });


  const result = streamText({
    model: anthropic.languageModel('claude-sonnet-4-5-20250929'),
    messages: convertToModelMessages(messages),
    system: systemPrompt,
    providerOptions: {
      anthropic: {
        thinking: enableThinking ? { type: 'enabled', budgetTokens: 2000 } : { type: 'disabled' },
      } satisfies AnthropicProviderOptions,
    },
    tools: {
      getXeroOrganisation: getXeroOrganisationTool,
      getXeroContacts: getXeroContactsTool,
      getXeroInvoices: getXeroInvoicesTool,
      getXeroAccounts: getXeroAccountsTool,
      getXeroItems: getXeroItemsTool,
      getXeroBankTransactions: getXeroBankTransactionsTool,
      getXeroProfitAndLoss: getXeroProfitAndLossTool,
      getXeroBalanceSheet: getXeroBalanceSheetTool,
      getXeroCreditNotes: getXeroCreditNotesTool,
      getXeroTaxRates: getXeroTaxRatesTool,
      getXeroPayments: getXeroPaymentsTool,
      getXeroTrialBalance: getXeroTrialBalanceTool,
      getXeroPayrollEmployees: getXeroPayrollEmployeesTool,
      getXeroAgedPayables: getXeroAgedPayablesTool,
      getXeroLeaveTypes: getXeroLeaveTypesTool,
      addDashboardWidget: tool<{ title: string; type: 'line' | 'bar' | 'pie' | 'gauge' | 'number'; data?: unknown; w?: 1 | 2 | 3; h?: 1 | 2 | 3; chatId?: string }, any>({
        description: 'Add a dashboard widget to the right panel. Provide title, type, data, and optional size w/h in grid units (1-3). Types: line, bar, pie (charts), gauge (circular progress), number (single value display).',
        inputSchema: z.object({
          title: z.string().describe('Widget title'),
          type: z.enum(['line', 'bar', 'pie', 'gauge', 'number']).describe('Widget type: line/bar/pie charts, gauge (circular progress), or number (single value)'),
          data: z.unknown().describe('Data payload - for charts: {labels, values} or Chart.js format; for gauge: {value, min?, max?}; for number: {value, unit?, subtitle?}').optional(),
          w: z.union([z.literal(1), z.literal(2), z.literal(3)]).optional(),
          h: z.union([z.literal(1), z.literal(2), z.literal(3)]).optional(),
        }),
        execute: async (input) => {
          const url = `${origin}/api/dashboard/widgets`;
          const body = { ...input, chatId: input.chatId ?? chatId };
          const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', cookie: cookieHeader } as any, body: JSON.stringify(body) });
          if (!res.ok) {
            const error = await res.json().catch(() => ({}));
            return { error: true, status: res.status, ...error };
          }
          const json = await res.json();
          return JSON.stringify(json, null, 2);
        },
      }),
    }
  });

  // consume the stream to ensure it runs to completion & triggers onFinish
  // even when the client response is aborted:
  result.consumeStream(); // no await

  return result.toUIMessageStreamResponse({
    originalMessages: messages,
    sendReasoning: true,
    onFinish: async ({ messages, isAborted }) => {
      try {
        if (isAborted) {
          console.log('Stream was aborted for chatId:', chatId);
        } else {
          console.log('Stream completed normally for chatId:', chatId);
        }
        
        console.log("onFinish triggered for chatId:", chatId, "with", messages.length, "messages");
        console.log("Messages to save:", messages.map(m => ({ role: m.role, id: m.id })));
        
        const saveResponse = await fetch(`${origin}/api/conversations/${chatId}/messages`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', cookie: cookieHeader } as any,
          body: JSON.stringify({ messages }),
        });
        
        if (!saveResponse.ok) {
          const errorText = await saveResponse.text();
          console.error('Failed to save messages:', saveResponse.status, saveResponse.statusText, errorText);
        } else {
          console.log("Messages saved successfully for chatId:", chatId);
        }
      } catch (error) {
        console.error('Error saving messages for chatId:', chatId, error);
      }
    },
    consumeSseStream: consumeStream, // This enables onFinish to be called on abort
  });
}



