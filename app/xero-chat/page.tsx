'use client';

import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport, lastAssistantMessageIsCompleteWithToolCalls } from 'ai';
import { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import { Button, Input } from '@nextui-org/react';
import { signOut, useSession } from 'next-auth/react';
import Markdown from '@/app/components/Markdown';
import { ChevronLeft, ChevronRight, ArrowDown, Brain } from 'lucide-react';
import AddDashboardWidgetTypedPart, { AddDashboardWidgetResultPart } from '@/app/components/fallback/AddDashboardWidgetFallback';
import { 
  XeroOrganisationTypedPart, 
  XeroOrganisationResultPart, 
  XeroContactsTypedPart, 
  XeroContactsResultPart,
  XeroInvoicesTypedPart,
  XeroInvoicesResultPart,
  XeroAccountsTypedPart,
  XeroAccountsResultPart,
  XeroItemsTypedPart,
  XeroItemsResultPart,
  XeroBankTransactionsTypedPart,
  XeroBankTransactionsResultPart,
  XeroProfitAndLossTypedPart,
  XeroProfitAndLossResultPart,
  XeroBalanceSheetTypedPart,
  XeroBalanceSheetResultPart,
  XeroCreditNotesTypedPart,
  XeroCreditNotesResultPart,
  XeroTaxRatesTypedPart,
  XeroTaxRatesResultPart,
  XeroPaymentsTypedPart,
  XeroPaymentsResultPart,
  XeroTrialBalanceTypedPart,
  XeroTrialBalanceResultPart,
  XeroPayrollEmployeesTypedPart,
  XeroPayrollEmployeesResultPart,
  XeroAgedPayablesTypedPart,
  XeroAgedPayablesResultPart,
  XeroLeaveTypesTypedPart,
  XeroLeaveTypesResultPart
} from '@/app/components/fallback/xero-fallback';
import RightPanelDashboard from '@/app/components/RightPanelDashboard';
import Sidebar from '@/app/components/Sidebar';
type UIMessageLike = {
  id?: string;
  role: 'user' | 'assistant' | 'system' | 'tool';
  parts?: Array<{ type: 'text'; text: string } | Record<string, unknown>>;
  content?: string; // fallback for older shape
};

type Conversation = {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
};

async function fetchConversations(): Promise<Conversation[]> {
  try {
    const res = await fetch('/api/conversations', { cache: 'no-store' });
    if (!res.ok) return [];
    return (await res.json()) as Conversation[];
  } catch {
    return [];
  }
}

async function createConversation(title: string): Promise<Conversation | null> {
  try {
    const res = await fetch('/api/conversations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title }),
    });
    if (!res.ok) return null;
    return (await res.json()) as Conversation;
  } catch {
    return null;
  }
}

async function deleteConversationFromDb(id: string): Promise<boolean> {
  try {
    const res = await fetch(`/api/conversations/${id}`, { method: 'DELETE' });
    return res.ok;
  } catch {
    return false;
  }
}

async function updateConversationTitle(id: string, title: string): Promise<boolean> {
  try {
    const res = await fetch(`/api/conversations/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

function getMessageText(message: UIMessageLike): string {
  if (message.parts && Array.isArray(message.parts)) {
    return message.parts
      .map((p: any) => (p && p.type === 'text' ? String(p.text ?? '') : ''))
      .join('');
  }
  return String(message.content ?? '');
}

async function loadMessagesFromDb(id: string): Promise<UIMessageLike[]> {
  try {
    const res = await fetch(`/api/conversations/${id}/messages`, { cache: 'no-store' });
    if (!res.ok) return [];
    const msgs = await res.json();
    return Array.isArray(msgs) ? msgs : [];
  } catch {
    return [];
  }
}

function TypingIndicator() {
  return (
    <div className="flex justify-start">
      <div className="typing-dots text-[#1D1D1D]">
        <div className="typing-dot"></div>
        <div className="typing-dot"></div>
        <div className="typing-dot"></div>
      </div>
    </div>
  );
}

function IOSToggle({ enabled, onChange, size = 'sm' }: { enabled: boolean; onChange: () => void; size?: 'sm' | 'md' }) {
  const sizeClasses = size === 'sm' ? 'w-8 h-4' : 'w-10 h-5';
  const thumbSizeClasses = size === 'sm' ? 'w-3 h-3' : 'w-4 h-4';
  const thumbTranslateClasses = size === 'sm' ? 'translate-x-4' : 'translate-x-5';
  
  return (
    <button
      type="button"
      onClick={onChange}
      className={`${sizeClasses} rounded-full transition-colors duration-200 ease-in-out ${
        enabled 
          ? 'bg-black dark:bg-white' 
          : 'bg-gray-300 dark:bg-gray-600'
      }`}
    >
      <div
        className={`${thumbSizeClasses} bg-white dark:bg-black rounded-full shadow-sm transition-transform duration-200 ease-in-out ${
          enabled ? thumbTranslateClasses : 'translate-x-0.5'
        }`}
      />
    </button>
  );
}

function ChatPane({ id, initialMessages, onMessagesChange, onToggleRightPanel, rightPanelCollapsed, rightPanelWidth, onToggleMobileDrawer }: { id: string; initialMessages: UIMessageLike[]; onMessagesChange: (m: UIMessageLike[]) => void; onToggleRightPanel?: () => void; rightPanelCollapsed?: boolean; rightPanelWidth?: number; onToggleMobileDrawer?: () => void; }) {
  const [input, setInput] = useState('');
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(0);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [isWaitingForResponse, setIsWaitingForResponse] = useState(false);
  const [showReasoning, setShowReasoning] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const mainRef = useRef<HTMLDivElement>(null);
  const { data: session } = useSession();
  const { messages, sendMessage } = useChat({
    id,
    messages: initialMessages as any,
    transport: new DefaultChatTransport({ api: '/api/chat' }),
    sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithToolCalls,
  });

  useEffect(() => {
    onMessagesChange(messages);
    
    // Check if we're waiting for a response
    const lastMessage = messages[messages.length - 1];
    if (lastMessage && lastMessage.role === 'user') {
      // User just sent a message, we're waiting for assistant response
      setIsWaitingForResponse(true);
    } else if (lastMessage && lastMessage.role === 'assistant') {
      // Assistant responded, stop waiting
      setIsWaitingForResponse(false);
    }
  }, [messages]); // Removed onMessagesChange from deps to prevent infinite loop

  // Auto-scroll to bottom when new messages arrive
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  // Check if user is at bottom of chat
  const checkIfAtBottom = useCallback(() => {
    if (!mainRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = mainRef.current;
    const threshold = 100; // pixels from bottom
    const atBottom = scrollHeight - scrollTop - clientHeight < threshold;
    setIsAtBottom(atBottom);
    setShowScrollButton(!atBottom);
  }, []);

  // Scroll to bottom when messages change (if user was at bottom)
  useEffect(() => {
    if (isAtBottom) {
      scrollToBottom();
    }
  }, [messages, isAtBottom, scrollToBottom]);

  // Handle scroll events
  useEffect(() => {
    const main = mainRef.current;
    if (!main) return;

    const handleScroll = () => {
      checkIfAtBottom();
    };

    main.addEventListener('scroll', handleScroll);
    return () => main.removeEventListener('scroll', handleScroll);
  }, [checkIfAtBottom]);


  // Handle input changes and command suggestions
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInput(value);
  }

  return (
    <div className="flex-1 flex flex-col bg-[#E8E7BB] text-[#1D1D1D] overflow-hidden zoom-container">
      <button
        onClick={() => onToggleRightPanel && onToggleRightPanel()}
        className={`fixed top-1/2 -translate-y-1/2 z-50 h-10 w-6 flex items-center justify-center rounded-l-md border border-r-0 border-[#1D1D1D]/20 bg-[#1D1D1D] text-[#E8E7BB] hover:bg-black transition-all duration-300 ease-in-out`}
        style={{ 
          right: rightPanelCollapsed ? 0 : (rightPanelWidth || 0) + 8,
          transition: 'right 300ms ease-in-out'
        }}
        aria-label={rightPanelCollapsed ? 'Open panel' : 'Close panel'}
      >
        {rightPanelCollapsed ? <ChevronLeft className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
      </button>
      
      {/* Mobile drawer button */}
      <div className="md:hidden shrink-0 px-6 py-3 bg-gradient-to-b from-[#E8E7BB]/50 to-transparent">
        <Button
          variant="light"
          className="border border-gray-800 rounded-full text-sm text-gray-300 hover:text-white hover:bg-white/10"
          onPress={onToggleMobileDrawer}
        >
          Conversations
        </Button>
      </div>

      <main ref={mainRef} className="flex-1 overflow-y-auto px-6">
        <div className="max-w-3xl mx-auto py-6 space-y-4">
          {messages.length === 0 && (
            <div className="py-24 text-center">
              <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-gradient-to-br from-[#E8E7BB] to-[#d4d3a7] flex items-center justify-center shadow-lg">
                <Brain className="w-8 h-8 text-[#1D1D1D]" />
              </div>
              <h2 className="text-xl font-semibold text-[#1D1D1D]">Start Your Conversation</h2>
              <p className="text-sm mt-2 text-[#1D1D1D]/70">Ask me anything about your Xero finances. I'm here to help!</p>
            </div>
          )}
          <div className="space-y-4">
            {(() => {
              const bubbles: JSX.Element[] = [];
              
              for (const m of messages as any[]) {
                const parts: any[] = Array.isArray(m.parts) ? m.parts : [];

                const pushBubble = (key: string, role: string, content: JSX.Element) => {
                  bubbles.push(
                    <div key={key} className={`flex ${role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div
                        className={`max-w-xl px-5 py-3 rounded-3xl leading-relaxed overflow-hidden shadow-md ${
                          role === 'user'
                            ? 'bg-gradient-to-br from-[#1D1D1D] to-[#2a2a2a] text-[#E8E7BB] rounded-tr-lg border border-gray-700'
                            : 'bg-gradient-to-br from-white to-gray-50 text-[#1D1D1D] border border-gray-200 rounded-tl-lg'
                        }`}
                      >
                        <div className="text-xs uppercase tracking-widest mb-2 font-semibold">
                          {role === 'user' ? (
                            <span className="text-gray-400">{role === 'user' ? 'You' : 'Assistant'}</span>
                          ) : (
                            <span className="text-gray-500">{role === 'user' ? 'You' : 'Assistant'}</span>
                          )}
                        </div>
                        <div className="overflow-x-auto wide-content-scroll message-content">{content}</div>
                      </div>
                    </div>
                  );
                };


                const pushTool = (key: string, role: string, content: JSX.Element) => {
                  bubbles.push(
                    <div key={key} className={`flex ${role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className="inline-flex">
                        {content}
                      </div>
                    </div>
                  );
                };

                if (parts.length === 0) {
                  pushBubble(String(m.id), m.role, (
                    <Markdown className="prose prose-sm dark:prose-invert max-w-none text-[15px]">{getMessageText(m as UIMessageLike)}</Markdown>
                  ));
                } else {
                  parts.forEach((part: any, idx: number) => {

                    // reasoning part - render as simple gray text
                    if (part?.type === 'reasoning') {
                      bubbles.push(
                        <div key={`${m.id}-reasoning-${idx}`} className="flex justify-start">
                          <div className="max-w-xl px-4 py-2">
                            <div className="text-xs text-[#8c8a66] flex items-center gap-1 mb-1">
                              <Brain className="w-3 h-3" />
                              Reasoning
                            </div>
                            <div className="text-sm text-[#6f6d4e] whitespace-pre-wrap">
                              {String(part.text ?? '')}
                            </div>
                          </div>
                        </div>
                      );
                      return;
                    }

                    // typed addDashboardWidget tool part
                    if (part?.type === 'tool-addDashboardWidget' && part.state !== 'output-available') {
                      pushTool(`${m.id}-addw-${idx}`, m.role, (
                        <AddDashboardWidgetTypedPart state={part.state} input={part.input} id={`${m.id}-addw-${idx}`} idx={idx} role={m.role} />
                      ));
                      return;
                    }

                    // Xero tool typed parts
                    if (part?.type === 'tool-getXeroOrganisation' && part.state !== 'output-available') {
                      pushTool(`${m.id}-getXeroOrganisation-${idx}`, m.role, (
                        <XeroOrganisationTypedPart state={part.state} input={part.input} id={`${m.id}-getXeroOrganisation-${idx}`} idx={idx} role={m.role} />
                      ));
                      return;
                    }

                    if (part?.type === 'tool-getXeroContacts' && part.state !== 'output-available') {
                      pushTool(`${m.id}-getXeroContacts-${idx}`, m.role, (
                        <XeroContactsTypedPart state={part.state} input={part.input} id={`${m.id}-getXeroContacts-${idx}`} idx={idx} role={m.role} />
                      ));
                      return;
                    }

                    if (part?.type === 'tool-getXeroInvoices' && part.state !== 'output-available') {
                      pushTool(`${m.id}-getXeroInvoices-${idx}`, m.role, (
                        <XeroInvoicesTypedPart state={part.state} input={part.input} id={`${m.id}-getXeroInvoices-${idx}`} idx={idx} role={m.role} />
                      ));
                      return;
                    }

                    if (part?.type === 'tool-getXeroAccounts' && part.state !== 'output-available') {
                      pushTool(`${m.id}-getXeroAccounts-${idx}`, m.role, (
                        <XeroAccountsTypedPart state={part.state} input={part.input} id={`${m.id}-getXeroAccounts-${idx}`} idx={idx} role={m.role} />
                      ));
                      return;
                    }

                    if (part?.type === 'tool-getXeroItems' && part.state !== 'output-available') {
                      pushTool(`${m.id}-getXeroItems-${idx}`, m.role, (
                        <XeroItemsTypedPart state={part.state} input={part.input} id={`${m.id}-getXeroItems-${idx}`} idx={idx} role={m.role} />
                      ));
                      return;
                    }

                    if (part?.type === 'tool-getXeroBankTransactions' && part.state !== 'output-available') {
                      pushTool(`${m.id}-getXeroBankTransactions-${idx}`, m.role, (
                        <XeroBankTransactionsTypedPart state={part.state} input={part.input} id={`${m.id}-getXeroBankTransactions-${idx}`} idx={idx} role={m.role} />
                      ));
                      return;
                    }

                    if (part?.type === 'tool-getXeroProfitAndLoss' && part.state !== 'output-available') {
                      pushTool(`${m.id}-getXeroProfitAndLoss-${idx}`, m.role, (
                        <XeroProfitAndLossTypedPart state={part.state} input={part.input} id={`${m.id}-getXeroProfitAndLoss-${idx}`} idx={idx} role={m.role} />
                      ));
                      return;
                    }

                    if (part?.type === 'tool-getXeroBalanceSheet' && part.state !== 'output-available') {
                      pushTool(`${m.id}-getXeroBalanceSheet-${idx}`, m.role, (
                        <XeroBalanceSheetTypedPart state={part.state} input={part.input} id={`${m.id}-getXeroBalanceSheet-${idx}`} idx={idx} role={m.role} />
                      ));
                      return;
                    }

                    if (part?.type === 'tool-getXeroCreditNotes' && part.state !== 'output-available') {
                      pushTool(`${m.id}-getXeroCreditNotes-${idx}`, m.role, (
                        <XeroCreditNotesTypedPart state={part.state} input={part.input} id={`${m.id}-getXeroCreditNotes-${idx}`} idx={idx} role={m.role} />
                      ));
                      return;
                    }

                    if (part?.type === 'tool-getXeroTaxRates' && part.state !== 'output-available') {
                      pushTool(`${m.id}-getXeroTaxRates-${idx}`, m.role, (
                        <XeroTaxRatesTypedPart state={part.state} input={part.input} id={`${m.id}-getXeroTaxRates-${idx}`} idx={idx} role={m.role} />
                      ));
                      return;
                    }

                    if (part?.type === 'tool-getXeroPayments' && part.state !== 'output-available') {
                      pushTool(`${m.id}-getXeroPayments-${idx}`, m.role, (
                        <XeroPaymentsTypedPart state={part.state} input={part.input} id={`${m.id}-getXeroPayments-${idx}`} idx={idx} role={m.role} />
                      ));
                      return;
                    }

                    if (part?.type === 'tool-getXeroTrialBalance' && part.state !== 'output-available') {
                      pushTool(`${m.id}-getXeroTrialBalance-${idx}`, m.role, (
                        <XeroTrialBalanceTypedPart state={part.state} input={part.input} id={`${m.id}-getXeroTrialBalance-${idx}`} idx={idx} role={m.role} />
                      ));
                      return;
                    }

                    if (part?.type === 'tool-getXeroPayrollEmployees' && part.state !== 'output-available') {
                      pushTool(`${m.id}-getXeroPayrollEmployees-${idx}`, m.role, (
                        <XeroPayrollEmployeesTypedPart state={part.state} input={part.input} id={`${m.id}-getXeroPayrollEmployees-${idx}`} idx={idx} role={m.role} />
                      ));
                      return;
                    }

                    if (part?.type === 'tool-getXeroAgedPayables' && part.state !== 'output-available') {
                      pushTool(`${m.id}-getXeroAgedPayables-${idx}`, m.role, (
                        <XeroAgedPayablesTypedPart state={part.state} input={part.input} id={`${m.id}-getXeroAgedPayables-${idx}`} idx={idx} role={m.role} />
                      ));
                      return;
                    }

                    if (part?.type === 'tool-getXeroLeaveTypes' && part.state !== 'output-available') {
                      pushTool(`${m.id}-getXeroLeaveTypes-${idx}`, m.role, (
                        <XeroLeaveTypesTypedPart state={part.state} input={part.input} id={`${m.id}-getXeroLeaveTypes-${idx}`} idx={idx} role={m.role} />
                      ));
                      return;
                    }

                    // Xero tool result parts
                    if (part?.type === 'tool-getXeroOrganisation' && part.state === 'output-available') {
                      pushTool(`${m.id}-tool-result-getXeroOrganisation-${idx}`, m.role, (
                        <XeroOrganisationResultPart output={part.output} id={`${m.id}-tool-result-getXeroOrganisation-${idx}`} idx={idx} role={m.role} />
                      ));
                      return;
                    }

                    if (part?.type === 'tool-getXeroContacts' && part.state === 'output-available') {
                      pushTool(`${m.id}-tool-result-getXeroContacts-${idx}`, m.role, (
                        <XeroContactsResultPart output={part.output} id={`${m.id}-tool-result-getXeroContacts-${idx}`} idx={idx} role={m.role} />
                      ));
                      return;
                    }

                    if (part?.type === 'tool-getXeroInvoices' && part.state === 'output-available') {
                      pushTool(`${m.id}-tool-result-getXeroInvoices-${idx}`, m.role, (
                        <XeroInvoicesResultPart output={part.output} id={`${m.id}-tool-result-getXeroInvoices-${idx}`} idx={idx} role={m.role} />
                      ));
                      return;
                    }

                    if (part?.type === 'tool-getXeroAccounts' && part.state === 'output-available') {
                      pushTool(`${m.id}-tool-result-getXeroAccounts-${idx}`, m.role, (
                        <XeroAccountsResultPart output={part.output} id={`${m.id}-tool-result-getXeroAccounts-${idx}`} idx={idx} role={m.role} />
                      ));
                      return;
                    }

                    if (part?.type === 'tool-getXeroItems' && part.state === 'output-available') {
                      pushTool(`${m.id}-tool-result-getXeroItems-${idx}`, m.role, (
                        <XeroItemsResultPart output={part.output} id={`${m.id}-tool-result-getXeroItems-${idx}`} idx={idx} role={m.role} />
                      ));
                      return;
                    }

                    if (part?.type === 'tool-getXeroBankTransactions' && part.state === 'output-available') {
                      pushTool(`${m.id}-tool-result-getXeroBankTransactions-${idx}`, m.role, (
                        <XeroBankTransactionsResultPart output={part.output} id={`${m.id}-tool-result-getXeroBankTransactions-${idx}`} idx={idx} role={m.role} />
                      ));
                      return;
                    }

                    if (part?.type === 'tool-getXeroProfitAndLoss' && part.state === 'output-available') {
                      pushTool(`${m.id}-tool-result-getXeroProfitAndLoss-${idx}`, m.role, (
                        <XeroProfitAndLossResultPart output={part.output} id={`${m.id}-tool-result-getXeroProfitAndLoss-${idx}`} idx={idx} role={m.role} />
                      ));
                      return;
                    }

                    if (part?.type === 'tool-getXeroBalanceSheet' && part.state === 'output-available') {
                      pushTool(`${m.id}-tool-result-getXeroBalanceSheet-${idx}`, m.role, (
                        <XeroBalanceSheetResultPart output={part.output} id={`${m.id}-tool-result-getXeroBalanceSheet-${idx}`} idx={idx} role={m.role} />
                      ));
                      return;
                    }

                    if (part?.type === 'tool-getXeroCreditNotes' && part.state === 'output-available') {
                      pushTool(`${m.id}-tool-result-getXeroCreditNotes-${idx}`, m.role, (
                        <XeroCreditNotesResultPart output={part.output} id={`${m.id}-tool-result-getXeroCreditNotes-${idx}`} idx={idx} role={m.role} />
                      ));
                      return;
                    }

                    if (part?.type === 'tool-getXeroTaxRates' && part.state === 'output-available') {
                      pushTool(`${m.id}-tool-result-getXeroTaxRates-${idx}`, m.role, (
                        <XeroTaxRatesResultPart output={part.output} id={`${m.id}-tool-result-getXeroTaxRates-${idx}`} idx={idx} role={m.role} />
                      ));
                      return;
                    }

                    if (part?.type === 'tool-getXeroPayments' && part.state === 'output-available') {
                      pushTool(`${m.id}-tool-result-getXeroPayments-${idx}`, m.role, (
                        <XeroPaymentsResultPart output={part.output} id={`${m.id}-tool-result-getXeroPayments-${idx}`} idx={idx} role={m.role} />
                      ));
                      return;
                    }

                    if (part?.type === 'tool-getXeroTrialBalance' && part.state === 'output-available') {
                      pushTool(`${m.id}-tool-result-getXeroTrialBalance-${idx}`, m.role, (
                        <XeroTrialBalanceResultPart output={part.output} id={`${m.id}-tool-result-getXeroTrialBalance-${idx}`} idx={idx} role={m.role} />
                      ));
                      return;
                    }

                    if (part?.type === 'tool-getXeroPayrollEmployees' && part.state === 'output-available') {
                      pushTool(`${m.id}-tool-result-getXeroPayrollEmployees-${idx}`, m.role, (
                        <XeroPayrollEmployeesResultPart output={part.output} id={`${m.id}-tool-result-getXeroPayrollEmployees-${idx}`} idx={idx} role={m.role} />
                      ));
                      return;
                    }

                    if (part?.type === 'tool-getXeroAgedPayables' && part.state === 'output-available') {
                      pushTool(`${m.id}-tool-result-getXeroAgedPayables-${idx}`, m.role, (
                        <XeroAgedPayablesResultPart output={part.output} id={`${m.id}-tool-result-getXeroAgedPayables-${idx}`} idx={idx} role={m.role} />
                      ));
                      return;
                    }

                    if (part?.type === 'tool-getXeroLeaveTypes' && part.state === 'output-available') {
                      pushTool(`${m.id}-tool-result-getXeroLeaveTypes-${idx}`, m.role, (
                        <XeroLeaveTypesResultPart output={part.output} id={`${m.id}-tool-result-getXeroLeaveTypes-${idx}`} idx={idx} role={m.role} />
                      ));
                      return;
                    }

                    if (part?.type === 'tool-addDashboardWidget' && part.state === 'output-available') {
                      pushTool(`${m.id}-tool-result-addDashboardWidget-${idx}`, m.role, (
                        <AddDashboardWidgetResultPart output={part.output} id={`${m.id}-tool-result-addDashboardWidget-${idx}`} idx={idx} role={m.role} />
                      ));
                      return;
                    }

                    // text part
                    if (part?.type === 'text') {
                      pushBubble(`${m.id}-text-${idx}`, m.role, (
                        <Markdown className="prose prose-sm max-w-none text-[15px] text-inherit">{String(part.text ?? '')}</Markdown>
                      ));
                    }
                  });
                }
              }
              return bubbles;
            })()}
          </div>
          
          {isWaitingForResponse && (
            <div className="space-y-4">
              <TypingIndicator />
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </main>

      <footer className="shrink-0 p-4 bg-gradient-to-t from-[#E8E7BB] via-[#E8E7BB]/95 to-transparent relative rounded-t-3xl shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
        {showScrollButton && (
          <div className="absolute -top-12 left-1/2 transform -translate-x-1/2 z-30">
            <button
              onClick={scrollToBottom}
              className="h-8 w-8 rounded-full bg-[#1D1D1D] text-[#E8E7BB] shadow-md hover:scale-105 transition flex items-center justify-center"
              aria-label="Scroll to bottom"
            >
              <ArrowDown className="w-3 h-3" />
            </button>
          </div>
        )}
        <div className="max-w-3xl mx-auto">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!input.trim()) return;
              let messageToSend = input;
              sendMessage({ text: messageToSend }, { body: { enableThinking: showReasoning } });
              setInput('');
              setIsAtBottom(true);
              setTimeout(scrollToBottom, 100);
            }}
            className="relative"
          >
            <input
              className="w-full h-12 rounded-full border border-[#1D1D1D]/20 bg-white text-[#1D1D1D] px-5 pr-44 no-zoom-input placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#1D1D1D]/20 shadow-md"
              value={input}
              placeholder="Ask about your Xero data..."
              onChange={handleInputChange}
            />
            <div className="absolute right-24 top-1/2 -translate-y-1/2 flex items-center gap-2 h-9">
              <Brain className="w-4 h-4 text-[#1D1D1D]/60" />
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setShowReasoning(!showReasoning);
                }}
                className="focus:outline-none flex items-center"
              >
                <IOSToggle enabled={showReasoning} onChange={() => {}} size="md" />
              </button>
            </div>
            <button
              type="submit"
              className="absolute right-1.5 top-1/2 -translate-y-1/2 h-9 px-5 rounded-full bg-gradient-to-r from-[#1D1D1D] to-[#2a2a2a] text-[#E8E7BB] text-sm hover:shadow-md transition-all disabled:opacity-50 font-medium"
              disabled={!input.trim()}
            >
              Send
            </button>
          </form>
        </div>
      </footer>
    </div>
  );
}

export default function Chat() {
  const { data: session, status } = useSession();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentId, setCurrentId] = useState<string>('');
  // Fallback UI moved into components

  // fetchers handled in fallback components
  const [rightPanelCollapsed, setRightPanelCollapsed] = useState(true);
  const [rightPanelWidth, setRightPanelWidth] = useState(360);
  const [lastRightPanelWidth, setLastRightPanelWidth] = useState(360);
  const [isResizingRight, setIsResizingRight] = useState(false);
  const [resizeStartX, setResizeStartX] = useState(0);
  const [resizeStartWidth, setResizeStartWidth] = useState(360);
  
  // Mobile drawer state
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  useEffect(() => {
    function onMouseMove(e: MouseEvent) {
      if (!isResizingRight) return;
      const delta = resizeStartX - e.clientX;
      const next = Math.min(800, Math.max(240, resizeStartWidth + delta));
      setRightPanelWidth(next);
      setLastRightPanelWidth(next);
    }
    function onMouseUp() {
      if (isResizingRight) setIsResizingRight(false);
    }
    if (isResizingRight) {
      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [isResizingRight, resizeStartX, resizeStartWidth]);

  const toggleRightPanel = () => {
    if (rightPanelCollapsed) {
      setRightPanelCollapsed(false);
      setRightPanelWidth(lastRightPanelWidth || 360);
    } else {
      setRightPanelCollapsed(true);
    }
  };

  // Load conversations on mount
  useEffect(() => {
    if (status === 'authenticated') {
      (async () => {
        const list = await fetchConversations();
        setConversations(list);
        setCurrentId(list[0]?.id ?? '');
      })();
    }
  }, [status]);

  const [loadedMessages, setLoadedMessages] = useState<Record<string, UIMessageLike[]>>({});
  
  useEffect(() => {
    if (!currentId) return;
    (async () => {
      const msgs = await loadMessagesFromDb(currentId);
      setLoadedMessages((prev) => ({ ...prev, [currentId]: msgs }));
    })();
  }, [currentId]);

  const initialMessages = useMemo(() => loadedMessages[currentId] ?? [], [loadedMessages, currentId]);

  const handleMessagesChange = useCallback(async (msgs: UIMessageLike[]) => {
    if (!currentId) return;
    
    setLoadedMessages((prev) => {
      const loaded = prev[currentId];
      
      // Skip initial empty sync until we've loaded from DB for this conversation
      if (loaded === undefined) {
        return { ...prev, [currentId]: msgs };
      }
      
      // Update conversation title if it's the first user message
      const firstUser = msgs.find((m) => m.role === 'user');
      if (firstUser) {
        const titleFromUser = getMessageText(firstUser).trim().slice(0, 42);
        setConversations((prevConvs) => {
          const conversation = prevConvs.find(c => c.id === currentId);
          if (conversation && conversation.title === 'New Chat' && titleFromUser) {
            updateConversationTitle(currentId, titleFromUser);
            return prevConvs.map((c) =>
              c.id === currentId ? { ...c, title: titleFromUser } : c
            );
          }
          return prevConvs;
        });
      }
      
      return { ...prev, [currentId]: msgs };
    });
  }, [currentId]);

  const startNewChat = async () => {
    const created = await createConversation('New Chat');
    if (!created) return;
    setConversations((prev) => [created, ...prev]);
    setCurrentId(created.id);
    setLoadedMessages((prev) => ({ ...prev, [created.id]: [] }));
  };

  const deleteConversation = async (id: string) => {
    const success = await deleteConversationFromDb(id);
    if (!success) return;
    
    setConversations((prev) => prev.filter((c) => c.id !== id));
    setLoadedMessages((prev) => {
      const { [id]: removed, ...rest } = prev;
      return rest;
    });
    
    if (id === currentId) {
      const nextId = conversations.find((c) => c.id !== id)?.id ?? '';
      setCurrentId(nextId);
    }
  };

  if (status === 'loading') {
    return (
      <div className="flex h-screen items-center justify-center bg-[#E8E7BB] text-[#1D1D1D]">
        <div className="text-sm text-[#6f6d4e]">Loading…</div>
      </div>
    );
  }

  const firstName = session?.user?.name?.split(' ')[0] ?? 'there';

  return (
    <div className="flex h-screen bg-[#E8E7BB] text-[#1D1D1D] overflow-hidden">
      <Sidebar accountingService={session?.user?.accountingService} />
      
      {!session ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-4">
            <div className="text-sm text-[#6f6d4e]">You are not signed in.</div>
            <a
              href="/login"
              className="inline-flex h-10 items-center rounded-full bg-[#1D1D1D] px-6 text-[#E8E7BB] hover:opacity-90"
            >
              Go to login
            </a>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Header - Original from main page */}
          <div className="sticky top-0 z-10 bg-[#1D1D1D] px-6 py-4 backdrop-blur-sm shrink-0 shadow-lg shadow-black/10">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-semibold text-white">
                  Welcome Back, <span className="text-gray-400">{firstName}</span>
                </h1>
              </div>
            </div>
          </div>

          {/* Main Content Area */}
          <div className="flex-1 flex overflow-hidden">
            {/* Mobile Drawer */}
            <div className={`fixed inset-0 z-50 md:hidden transition-opacity duration-300 ${mobileDrawerOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
              <div
                className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                onClick={() => setMobileDrawerOpen(false)}
              />
              <div className={`absolute left-0 top-0 h-full w-80 max-w-[85vw] bg-white dark:bg-black transform transition-transform duration-300 ease-in-out shadow-2xl ${mobileDrawerOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                <div className="flex flex-col h-full">
                  <div className="p-4 shrink-0 bg-gradient-to-b from-white/50 to-transparent dark:from-black/50">
                    <div className="flex items-center justify-between">
                      <h2 className="text-lg font-medium">Menu</h2>
                      <button
                        onClick={() => setMobileDrawerOpen(false)}
                        className="p-2 -m-2 rounded-md hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
                        aria-label="Close menu"
                      >
                        <span className="text-lg">×</span>
                      </button>
                    </div>
                  </div>
                  <div className="flex-1 overflow-y-auto p-4">
                    <button
                      onClick={() => {
                        startNewChat();
                        setMobileDrawerOpen(false);
                      }}
                      className="w-full h-10 rounded-xl bg-gradient-to-r from-gray-50 to-white dark:from-white/10 dark:to-white/5 text-sm hover:shadow-md transition-all duration-200 border border-gray-200/50 dark:border-white/10"
                    >
                      New Chat
                    </button>
                    <div className="mt-6">
                      <div className="text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">Conversations</div>
                      <nav className="space-y-2">
                        {conversations.map((c) => (
                          <div
                            key={c.id}
                            className={`group flex items-center justify-between rounded-xl px-3 py-2.5 text-sm cursor-pointer transition-all duration-200 ${c.id === currentId ? 'bg-gradient-to-r from-gray-100 to-gray-50 dark:from-white/10 dark:to-white/5 shadow-sm' : 'hover:bg-gray-50/50 dark:hover:bg-white/5 hover:shadow-sm'}`}
                            onClick={() => {
                              setCurrentId(c.id);
                              setMobileDrawerOpen(false);
                            }}
                          >
                            <span className="truncate pr-2">{c.title || 'New Chat'}</span>
                            <button
                              aria-label="Delete conversation"
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteConversation(c.id);
                              }}
                              className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-gray-700 dark:text-gray-400 dark:hover:text-white transition"
                            >
                              ×
                            </button>
                          </div>
                        ))}
                      </nav>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Desktop Sidebar - Conversations */}
            <aside className="hidden md:flex md:w-52 lg:w-60 flex-col shrink-0 relative bg-[#D9D8B0]/40">
              <div className="absolute right-0 top-0 bottom-0 w-px bg-gradient-to-b from-transparent via-gray-300/30 to-transparent"></div>
              <div className="flex-1 flex flex-col overflow-hidden">
                <div className="p-4 shrink-0 bg-gradient-to-b from-[#D9D8B0]/50 to-[#D9D8B0]/30 rounded-b-2xl">
                  <div className="text-xs uppercase tracking-wider text-gray-600 dark:text-gray-400 mb-3 font-medium">Conversations</div>
                  <button
                    onClick={startNewChat}
                    className="w-full h-10 rounded-xl bg-[#1D1D1D] text-[#E8E7BB] font-medium text-sm hover:bg-[#2a2a2a] hover:shadow-md transition-all duration-200"
                  >
                    New Chat
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto p-4">
                  <nav className="space-y-2">
                    {conversations.map((c) => (
                      <div
                        key={c.id}
                        className={`group flex items-center justify-between rounded-xl px-3 py-2.5 text-sm cursor-pointer transition-all duration-200 ${c.id === currentId ? 'bg-gradient-to-r from-gray-100 to-gray-50 dark:from-white/10 dark:to-white/5 shadow-sm' : 'hover:bg-gray-50/50 dark:hover:bg-white/5 hover:shadow-sm'}`}
                        onClick={() => setCurrentId(c.id)}
                      >
                        <span className="truncate pr-2">{c.title || 'New Chat'}</span>
                        <button
                          aria-label="Delete conversation"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteConversation(c.id);
                          }}
                          className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-gray-700 dark:text-gray-400 dark:hover:text-white transition"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </nav>
                </div>
              </div>
            </aside>

            {/* Chat Area */}
            <div className="flex-1 flex flex-col min-w-0">
            {currentId && loadedMessages[currentId] !== undefined ? (
              <ChatPane
                key={currentId}
                id={currentId}
                initialMessages={initialMessages}
                onMessagesChange={handleMessagesChange}
                onToggleRightPanel={toggleRightPanel}
                rightPanelCollapsed={rightPanelCollapsed}
                rightPanelWidth={rightPanelWidth}
                onToggleMobileDrawer={() => setMobileDrawerOpen(true)}
              />
            ) : conversations.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-sm text-gray-600 dark:text-gray-400">
                <div className="mb-4">No conversations yet</div>
                <button
                  onClick={startNewChat}
                  className="px-4 py-2 rounded-md bg-[#1D1D1D] text-[#E8E7BB] hover:opacity-90 transition-opacity"
                >
                  Start your first chat
                </button>
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center text-sm text-gray-600 dark:text-gray-400">
                Loading conversation…
              </div>
            )}
          </div>

          {/* Right Panel - Dashboard */}
          <div
            className="shrink-0 h-full overflow-hidden flex transition-all duration-300 ease-in-out"
            style={{ 
              width: rightPanelCollapsed ? 0 : rightPanelWidth + 8,
              opacity: rightPanelCollapsed ? 0 : 1,
            }}
          >
            {!rightPanelCollapsed && (
              <>
                <div
                  className="w-2 cursor-col-resize shrink-0 relative group h-full"
                  onMouseDown={(e) => {
                    setIsResizingRight(true);
                    setResizeStartX(e.clientX);
                    setResizeStartWidth(rightPanelWidth);
                  }}
                >
                  <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-px bg-gradient-to-b from-transparent via-gray-300/40 to-transparent group-hover:via-gray-400/60 transition-all rounded-full"></div>
                </div>
                <div
                  className="shrink-0 h-full bg-white dark:bg-black relative flex-1"
                  style={{ minWidth: rightPanelWidth }}
                >
                  <div className="absolute left-0 top-0 bottom-0 w-px bg-gradient-to-b from-transparent via-gray-200/50 to-transparent rounded-r-full"></div>
                  <RightPanelDashboard chatId={currentId} />
                </div>
              </>
            )}
          </div>
          </div>
        </div>
      )}
    </div>
  );
}