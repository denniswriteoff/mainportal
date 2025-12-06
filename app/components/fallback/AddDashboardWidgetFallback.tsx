'use client';

import { useEffect } from 'react';
import { LineChart, BarChart3, PieChart, Gauge, Hash } from 'lucide-react';

// Global set to track emitted tool call IDs
const emittedToolCalls = new Set<string>();

// Helper function to get icon for widget type
const getWidgetIcon = (type: string) => {
  switch (type) {
    case 'line':
      return LineChart;
    case 'bar':
      return BarChart3;
    case 'pie':
      return PieChart;
    case 'gauge':
      return Gauge;
    case 'number':
      return Hash;
    default:
      return LineChart;
  }
};

type TypedProps = {
  state: 'input-streaming' | 'input-available' | 'output-available';
  input?: { title?: string; type?: 'line' | 'bar' | 'pie' | 'gauge' | 'number' } | any;
  role?: string;
  id?: string | number;
  idx?: number;
};

type ResultProps = {
  output: unknown;
  role?: string;
  id?: string | number;
  idx?: number;
};

export function AddDashboardWidgetTypedPart({ state, input, id }: TypedProps) {
  // Emit event when widget creation is completed
  useEffect(() => {
    if (state === 'output-available' && id) {
      const toolCallId = String(id);
      
      // Check if we've already emitted an event for this tool call
      if (emittedToolCalls.has(toolCallId)) {
        console.log('[AddDashboardWidgetTypedPart] Event already emitted for tool call:', toolCallId);
        return;
      }
      
      console.log('[AddDashboardWidgetTypedPart] Widget creation completed, emitting dashboard-widget-added event for:', toolCallId);
      emittedToolCalls.add(toolCallId);
      
      const event = new CustomEvent('dashboard-widget-added', {
        detail: { 
          title: input?.title || '',
          type: input?.type || '',
          source: 'typed-part',
          toolCallId
        }
      });
      window.dispatchEvent(event);
    }
  }, [state, input, id]);

  if (state === 'input-streaming') {
    return (
      <div className="text-xs text-gray-500 dark:text-gray-400 px-2 py-1">Preparing widget…</div>
    );
  }
  if (state === 'input-available') {
    const title = input?.title || '';
    const type = input?.type || '';
    return (
      <div className="text-xs text-gray-500 dark:text-gray-400 px-2 py-1">Creating widget {title ? `"${String(title)}"` : ''} {type ? `(${String(type)})` : ''}…</div>
    );
  }
  return (
    <div className="inline-flex items-center gap-2 text-[13px] text-gray-700 dark:text-gray-200">
      <span className="text-xs text-gray-500 dark:text-gray-400">Widget</span>
      <span className="rounded-md bg-gray-100 dark:bg-white/10 px-2 py-1">Created</span>
    </div>
  );
}

export function AddDashboardWidgetResultPart({ output, id: toolCallId }: ResultProps) {
  let title = '';
  let type = '';
  let id = '';
  try {
    const j = typeof output === 'string' ? JSON.parse(output) : (output as any);
    title = String(j?.title ?? '');
    type = String(j?.type ?? '');
    id = String(j?.id ?? '');
  } catch {
    // Fallback for non-JSON output
    title = 'Widget';
    type = 'unknown';
  }

  // Emit event when widget is successfully created
  useEffect(() => {
    if (id && toolCallId) {
      const toolCallIdStr = String(toolCallId);
      
      // Check if we've already emitted an event for this tool call
      if (emittedToolCalls.has(toolCallIdStr)) {
        console.log('[AddDashboardWidgetResultPart] Event already emitted for tool call:', toolCallIdStr);
        return;
      }
      
      console.log('[AddDashboardWidgetResultPart] Emitting dashboard-widget-added event for widget:', id, 'tool call:', toolCallIdStr);
      emittedToolCalls.add(toolCallIdStr);
      
      const event = new CustomEvent('dashboard-widget-added', {
        detail: { 
          id, 
          title, 
          type, 
          source: 'result-part',
          toolCallId: toolCallIdStr
        }
      });
      window.dispatchEvent(event);
    }
  }, [id, title, type, toolCallId]);

  const IconComponent = getWidgetIcon(type);

  return (
    <div className="inline-flex items-center gap-2 text-[13px] text-gray-700 dark:text-gray-200">
      <IconComponent className="w-4 h-4 text-gray-500 dark:text-gray-400" />
      <span className="text-xs text-gray-500 dark:text-gray-400">Widget created -</span>
      <span className="font-medium text-gray-500 dark:text-gray-400">{title}</span>
    </div>
  );
}

export default AddDashboardWidgetTypedPart;



