'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
// @ts-ignore
import * as domtoimage from 'dom-to-image';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
import GridLayout, { Layout, WidthProvider } from 'react-grid-layout';
import { Card, CardBody, Button } from "@nextui-org/react";
import { Trash2 } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, TooltipProps } from 'recharts';

type Widget = {
  id: string;
  title: string;
  type: 'line' | 'bar' | 'pie' | 'gauge' | 'number';
  data: any;
  w?: number;
  h?: number;
  x?: number;
  y?: number;
};

async function fetchWidgets(chatId?: string): Promise<Widget[]> {
  try {
    const res = await fetch(`/api/dashboard/widgets${chatId ? `?chatId=${encodeURIComponent(chatId)}` : ''}`, { cache: 'no-store' });
    const j = await res.json();
    return Array.isArray(j?.widgets) ? j.widgets : [];
  } catch {
    return [];
  }
}

async function deleteWidget(id: string) {
  try {
    await fetch(`/api/dashboard/widgets?id=${id}`, { method: 'DELETE' });
  } catch (err) {
    console.error('Failed to delete widget:', err);
  }
}

const AutoWidthGrid: any = WidthProvider(GridLayout as any);

// Custom tooltip for pie chart with white text
const CustomPieTooltip = ({ active, payload }: TooltipProps<any, any>) => {
  if (active && payload && payload.length) {
    return (
      <div style={{
        backgroundColor: '#1D1D1D',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: '8px',
        padding: '8px 12px',
        color: '#fff'
      }}>
        <p style={{ color: '#fff', margin: '0 0 4px 0', fontSize: '12px' }}>
          {payload[0].name}
        </p>
        <p style={{ color: '#fff', margin: 0, fontSize: '14px', fontWeight: 'bold' }}>
          {payload[0].value}
        </p>
      </div>
    );
  }
  return null;
};

export default function RightPanelDashboard({ chatId }: { chatId?: string }) {
  const [widgets, setWidgets] = useState<Widget[]>([]);
  const [loading, setLoading] = useState(true);
  const dashRef = useRef<HTMLDivElement | null>(null);
  
  // Refresh widgets function
  const refreshWidgets = useCallback(async () => {
    setLoading(true);
    try {
      const newWidgets = await fetchWidgets(chatId);
      setWidgets(newWidgets);
    } finally {
      setLoading(false);
    }
  }, [chatId]);

  // Load widgets from server (per chat)
  useEffect(() => {
    fetchWidgets(chatId)
      .then(setWidgets)
      .finally(() => setLoading(false));
  }, [chatId]);

  // Listen for dashboard widget added events
  useEffect(() => {
    const handleWidgetAdded = (event: CustomEvent) => {
      console.log('[dashboard] Widget added event received:', event.detail);
      refreshWidgets();
    };

    window.addEventListener('dashboard-widget-added', handleWidgetAdded as EventListener);
    return () => {
      window.removeEventListener('dashboard-widget-added', handleWidgetAdded as EventListener);
    };
  }, [refreshWidgets]);

  // Remove widget
  const removeWidget = useCallback(async (id: string) => {
    await deleteWidget(id);
    setWidgets((prev) => prev.filter((w) => w.id !== id));
  }, []);

  // Generate layout from widgets (use stored positions if available)
  const layout: Layout[] = widgets.map((w, index) => ({
    i: w.id,
    x: w.x ?? ((index * (w.w || 1)) % 3),
    y: w.y ?? (Math.floor((index * (w.w || 1)) / 3) * (w.h || 1)),
    w: w.w || 1,
    h: w.h || 1,
    minW: 1,
    minH: 1,
    maxW: 3,
    maxH: 3,
  }));

  const [hasInitialized, setHasInitialized] = useState(false);

  // Mark as initialized after first render
  useEffect(() => {
    if (widgets.length > 0) {
      setHasInitialized(true);
    }
  }, [widgets]);

  const savePlacements = useCallback(async (next: Layout[]) => {
    // Only save after initial render and if we have widgets
    if (!hasInitialized || widgets.length === 0) {
      return;
    }

    // Check if layout actually changed
    const currentLayout = layout;
    const hasChanged = next.some((newItem) => {
      const current = currentLayout.find(c => c.i === newItem.i);
      return !current || current.x !== newItem.x || current.y !== newItem.y || current.w !== newItem.w || current.h !== newItem.h;
    });

    if (!hasChanged) {
      return;
    }

    try {
      const placements = next.map((l) => ({ id: l.i, x: l.x, y: l.y, w: l.w, h: l.h }));
      await fetch('/api/dashboard/widgets', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ placements }),
      });
    } catch (err) {
      console.error('Failed to save placements', err);
    }
  }, [hasInitialized, widgets.length, layout]);

  const downloadDashboardPng = useCallback(async () => {
    try {
      const node = dashRef.current as HTMLElement;
      if (!node) {
        console.error('Dashboard node not found');
        return;
      }
      
      // Save original styles
      const originalOverflow = node.style.overflow;
      const originalHeight = node.style.height;
      const originalMaxHeight = node.style.maxHeight;
      
      // Temporarily show all content
      node.style.overflow = 'visible';
      node.style.height = 'auto';
      node.style.maxHeight = 'none';
      
      // Wait for layout to settle
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const dataUrl = await (domtoimage as any).toPng(node, {
        bgcolor: '#ffffff',
        quality: 0.95,
        width: node.scrollWidth,
        height: node.scrollHeight,
        style: {
          transform: 'scale(1)',
          transformOrigin: 'top left',
        }
      });
      
      // Restore original styles
      node.style.overflow = originalOverflow;
      node.style.height = originalHeight;
      node.style.maxHeight = originalMaxHeight;
      
      // Convert data URL to blob
      const response = await fetch(dataUrl);
      const blob = await response.blob();
      
      // Copy to clipboard
      if (navigator.clipboard && window.ClipboardItem) {
        await navigator.clipboard.write([
          new ClipboardItem({
            [blob.type]: blob
          })
        ]);
        alert('Dashboard image copied to clipboard!');
      } else {
        // Fallback: download if clipboard not supported
        const link = document.createElement('a');
        link.download = `dashboard-${Date.now()}.png`;
        link.href = dataUrl;
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();
        setTimeout(() => {
          document.body.removeChild(link);
          URL.revokeObjectURL(dataUrl);
        }, 100);
      }
    } catch (err) {
      console.error('Download failed:', err);
      alert('Failed to download dashboard image. Please try again.');
    }
  }, []);

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center bg-[#E8E7BB]">
        <div className="text-sm text-[#1D1D1D]/70">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="py-2 px-4 border-b border-white/10 flex items-center justify-between bg-[#1D1D1D]">
        <div className="text-xs uppercase tracking-wider text-gray-400 font-medium">Dashboard</div>
        <div className="inline-flex items-center gap-2">
          <Button 
            size="sm" 
            variant="flat" 
            onPress={downloadDashboardPng}
            className="h-7 px-3 text-xs font-medium bg-white/10 text-gray-300 hover:bg-[#E8E7BB] hover:text-[#1D1D1D] transition-all rounded-full"
          >
            Copy
          </Button>
        </div>
      </div>
      <div
        ref={dashRef}
        className="flex-1 min-h-0 overflow-auto relative bg-[#E8E7BB]"
        style={{
          backgroundImage: 'radial-gradient(rgba(29, 29, 29, 0.1) 1px, transparent 1px)',
          backgroundSize: '20px 20px',
        }}
      >
        {widgets.length === 0 ? (
          <div className="flex items-center justify-center h-32">
            <div className="text-sm text-[#1D1D1D]/70">No widgets yet</div>
          </div>
        ) : (
          <AutoWidthGrid
            className="layout"
            layout={layout}
            cols={3}
            rowHeight={120}
            isResizable
            isDraggable
            isBounded={false}
            compactType={null}
            margin={[8, 8]}
            containerPadding={[0, 0]}
            autoSize={true}
            maxRows={100}
            resizeHandles={['n','s','e','w','ne','nw','se','sw']}
            useCSSTransforms={false}
            transformScale={1}
            preventCollision={true}
            draggableHandle=".drag-handle"
            draggableCancel=".no-drag"
            onLayoutChange={savePlacements}
          >
            {widgets.map((w) => (
              <div key={w.id} className="p-1 h-full">
                <Card className="h-full border border-white/10 bg-[#1D1D1D] shadow-2xl rounded-2xl">
                  <CardBody className="p-3 h-full flex flex-col overflow-hidden">
                    <div className="drag-handle flex items-center justify-between select-none h-8 -mx-1 px-2 cursor-move shrink-0">
                      <div className="text-xs text-gray-300 truncate pr-2 font-medium">{w.title || w.type.toUpperCase()}</div>
                      <Button
                        isIconOnly
                        size="sm"
                        variant="light"
                        className="no-drag h-6 w-6 min-w-6 text-gray-400 hover:text-red-400 hover:bg-red-500/20 rounded-full transition-all"
                        onPress={(e) => { 
                          removeWidget(w.id); 
                        }}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                    <div className="flex-1 min-h-0 w-full">
                      <ChartContainer widget={w} />
                    </div>
                  </CardBody>
                </Card>
              </div>
            ))}
          </AutoWidthGrid>
        )}
      </div>
    </div>
  );
}

function ChartContainer({ widget }: { widget: Widget }) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [size, setSize] = useState<{ width: number; height: number }>({ width: 0, height: 0 });

  useEffect(() => {
    if (!ref.current) return;
    const ro = new ResizeObserver((entries) => {
      for (const e of entries) {
        setSize({ width: e.contentRect.width, height: e.contentRect.height });
      }
    });
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, []);

  const chartData = useMemo(() => {
    const { data, type } = widget;
    if (!data) return null;

    if (type === 'gauge' || type === 'number') {
      return data; // Pass raw data for these
    }

    // Convert Chart.js/MUI format to Recharts format (array of objects)
    if (data.labels && data.datasets && data.datasets.length > 0) {
      const labels = data.labels;
      const dataset = data.datasets[0];
      return labels.map((label: string, i: number) => ({
        name: label,
        value: dataset.data[i]
      }));
    }
    
    if (Array.isArray(data.labels) && Array.isArray(data.values)) {
      return data.labels.map((label: string, i: number) => ({
        name: label,
        value: data.values[i]
      }));
    }

    return [];
  }, [widget]);

  if (!chartData && widget.type !== 'number' && widget.type !== 'gauge') {
    return (
      <div ref={ref} className="mt-2 h-full flex items-center justify-center">
        <div className="text-xs text-gray-400">No data available</div>
      </div>
    );
  }

  const COLORS = ['#E8E7BB', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16', '#f97316'];

  return (
    <div ref={ref} className={`h-full w-full ${widget.type === 'number' || widget.type === 'pie' || widget.type === 'gauge' ? 'min-h-0' : 'mt-2'}`}>
      {size.width > 0 && size.height > 0 && (
        <>
          {widget.type === 'line' && (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255, 255, 255, 0.1)" />
                <XAxis dataKey="name" hide={size.width < 200} tick={{fontSize: 10, fill: '#9ca3af'}} />
                <YAxis width={30} tick={{fontSize: 10, fill: '#9ca3af'}} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1D1D1D', 
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '8px',
                    color: '#fff'
                  }}
                />
                <Line type="monotone" dataKey="value" stroke="#E8E7BB" strokeWidth={2} dot={{r: 3, fill: '#E8E7BB'}} />
              </LineChart>
            </ResponsiveContainer>
          )}
          {widget.type === 'bar' && (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255, 255, 255, 0.1)" />
                <XAxis dataKey="name" hide={size.width < 200} tick={{fontSize: 10, fill: '#9ca3af'}} />
                <YAxis width={30} tick={{fontSize: 10, fill: '#9ca3af'}} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1D1D1D', 
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '8px',
                    color: '#fff'
                  }}
                />
                <Bar dataKey="value" fill="#E8E7BB" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
          {widget.type === 'pie' && (
            <div className="h-full w-full flex items-center justify-center min-h-0 p-2">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={Math.max(0, Math.min(size.width, size.height) * 0.15)}
                    outerRadius={Math.max(10, Math.min(size.width, size.height) * 0.4)}
                    fill="#E8E7BB"
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {chartData.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomPieTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
          {widget.type === 'gauge' && (
            <GaugeWidget data={chartData} width={size.width} height={size.height} />
          )}
          {widget.type === 'number' && (
            <NumberWidget data={chartData} width={size.width} height={size.height} />
          )}
        </>
      )}
    </div>
  );
}

function GaugeWidget({ data, width, height }: { data: any, width: number, height: number }) {
  const { value, min = 0, max = 100, unit, label } = data;
  const normalizedValue = Math.min(Math.max(value, min), max);
  const percentage = ((normalizedValue - min) / (max - min)) * 100;
  
  // Calculate size more conservatively with padding
  const size = Math.min(width, height);
  const padding = 16;
  const radius = (size - padding * 2) / 2 - 8;
  const centerX = width / 2;
  const centerY = height / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;
  
  // Calculate font sizes based on available space
  const valueFontSize = Math.max(16, Math.min(size / 5, 32));
  const unitFontSize = Math.max(10, valueFontSize * 0.5);
  const labelFontSize = Math.max(10, valueFontSize * 0.4);

  // Format value
  const formatValue = (val: any) => {
    if (typeof val === 'number') {
      return val.toLocaleString(undefined, { maximumFractionDigits: 1 });
    }
    return String(val);
  };

  return (
    <div className="flex flex-col items-center justify-center h-full w-full min-h-0 p-3">
      <svg width={width} height={height - (label ? 20 : 0)} viewBox={`0 0 ${width} ${height - (label ? 20 : 0)}`} className="flex-shrink-0">
        {/* Background circle */}
        <circle
          cx={centerX}
          cy={centerY - (label ? 10 : 0)}
          r={radius}
          fill="none"
          stroke="rgba(255, 255, 255, 0.1)"
          strokeWidth="8"
        />
        {/* Progress circle */}
        <circle
          cx={centerX}
          cy={centerY - (label ? 10 : 0)}
          r={radius}
          fill="none"
          stroke="#E8E7BB"
          strokeWidth="8"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          transform={`rotate(-90 ${centerX} ${centerY - (label ? 10 : 0)})`}
          style={{ transition: 'stroke-dashoffset 0.3s ease' }}
        />
        {/* Value text */}
        <text
          x={centerX}
          y={centerY - (label ? 10 : 0)}
          dy="0"
          textAnchor="middle"
          fill="#fff"
          fontSize={valueFontSize}
          fontWeight="bold"
          dominantBaseline="middle"
        >
          {formatValue(value)}
        </text>
        {/* Unit text */}
        {unit && (
          <text
            x={centerX}
            y={centerY - (label ? 10 : 0) + valueFontSize * 0.6}
            textAnchor="middle"
            fill="#9ca3af"
            fontSize={unitFontSize}
            dominantBaseline="middle"
          >
            {unit}
          </text>
        )}
      </svg>
      {/* Label below gauge */}
      {label && (
        <div className="text-center mt-2 flex-shrink-0">
          <span className="text-gray-400 text-xs truncate block px-2" title={label}>
            {label}
          </span>
        </div>
      )}
    </div>
  );
}

function NumberWidget({ data, width, height }: { data: any, width: number, height: number }) {
  const { value, unit, subtitle } = data;
  
  // Format the value
  const formatValue = (val: any) => {
    if (typeof val === 'number') {
      if (val >= 1000000) return (val / 1000000).toFixed(1) + 'M';
      if (val >= 1000) return (val / 1000).toFixed(1) + 'K';
      return val.toLocaleString();
    }
    return String(val);
  };

  // Calculate font size more conservatively, accounting for padding and unit/subtitle
  const availableHeight = height - (subtitle ? 40 : 20); // Reserve space for subtitle
  const availableWidth = width - 16; // Reserve padding
  const fontSize = Math.min(
    Math.min(availableWidth / 6, availableHeight / 2.5), // More conservative calculation
    Math.min(width / 5, height / 3) // Cap at reasonable max
  );

  const formattedValue = formatValue(value);

  return (
    <div className="flex flex-col items-center justify-center h-full w-full text-center px-2 py-1 min-h-0 overflow-hidden">
      <div className="flex items-baseline gap-1 justify-center flex-shrink-0" style={{ maxWidth: '100%' }}>
        <span 
          className="font-bold text-white leading-tight" 
          style={{ 
            fontSize: `${Math.max(12, fontSize)}px`,
            lineHeight: '1.2',
            wordBreak: 'break-word',
            overflowWrap: 'break-word'
          }}
        >
          {formattedValue}
        </span>
        {unit && (
          <span 
            className="text-gray-400 flex-shrink-0" 
            style={{ fontSize: `${Math.max(10, fontSize * 0.4)}px` }}
          >
            {unit}
          </span>
        )}
      </div>
      {subtitle && (
        <span 
          className="text-gray-400 mt-1 flex-shrink-0 truncate w-full px-1" 
          style={{ fontSize: `${Math.max(10, fontSize * 0.35)}px` }}
          title={subtitle}
        >
          {subtitle}
        </span>
      )}
    </div>
  );
}



