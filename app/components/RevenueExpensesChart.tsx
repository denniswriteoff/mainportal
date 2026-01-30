'use client'

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { useState } from 'react'

interface TrendData {
  month: string
  revenue: number
  expenses: number
}

interface RevenueExpensesChartProps {
  data: TrendData[]
  loading?: boolean
}

export default function RevenueExpensesChart({ data, loading = false }: RevenueExpensesChartProps) {
  if (loading) {
      return (
        <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10 shadow-lg">
        <div className="flex items-center justify-center h-72">
          <div className="text-sm text-gray-400">Loading chart data...</div>
        </div>
      </div>
    )
  }

  if (!data || data.length === 0) {
    return (
      <div className="bg-[#1D1D1D] rounded-3xl p-8 shadow-2xl">
        <div className="flex items-center justify-center h-72">
          <div className="text-sm text-gray-400">No trend data available</div>
        </div>
      </div>
    )
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value)
  }

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white border border-gray-200 rounded-lg p-3 shadow-lg">
          <p className="text-sm font-medium text-[#1D1D1D] mb-2">{label}</p>
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center space-x-2">
              <div 
                className="w-3 h-3 rounded-full" 
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-sm text-gray-600">
                {labelForKey(entry.dataKey)}: {formatCurrency(entry.value)}
              </span>
            </div>
          ))}
        </div>
      )
    }
    return null
  }

  // Initialize hidden keys: default series off if they have no data
  const initHiddenKeys = () => {
    const first = (data[0] || {}) as any
    const hidden: Record<string, boolean> = {}
    const keysToCheck = ['revenue', 'expenses', 'cogs', 'subcontractors', 'ownerRelated', 'otherExpenses']
    
    for (const key of keysToCheck) {
      if (typeof first[key] === 'number' && first[key] === 0) {
        hidden[key] = true
      }
    }
    return hidden
  }
  const [hiddenKeys, setHiddenKeys] = useState<Record<string, boolean>>(initHiddenKeys())

  const labelForKey = (key: string) => {
    if (key === 'revenue') return 'Revenue'
    if (key === 'expenses') return 'Expenses'
    if (key === 'cogs') return 'Cost of Goods Sold'
    if (key === 'subcontractors') return 'Subcontractors'
    if (key === 'ownerRelated') return 'Owner Related'
    if (key === 'otherExpenses') return 'Other Expenses'
    // Fallback: prettify
    return key.replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase())
  }

  const getColorForKey = (key: string): string => {
    if (key === 'revenue') return '#10b981'
    if (key === 'expenses') return '#ef4444'
    const palette = ['#f59e0b', '#6366f1', '#ec4899', '#06b6d4']
    const allKeys = (() => {
      const first = data[0] || {} as any
      return Object.keys(first).filter(k => k !== 'month' && k !== 'revenue')
    })()
    const idx = allKeys.indexOf(key)
    return palette[idx % palette.length]
  }

  const toggleKey = (key: string) => {
    setHiddenKeys((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  return (
    <div className="group bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10 hover:border-green-500/30 hover:bg-gray-400/10 transition-all duration-300 shadow-lg">
      <div className="mb-8">
        <div className="flex items-center space-x-3 mb-2">
          <div className="bg-[#0fb881]/20 p-2.5 rounded-xl">
            <div className="w-2 h-2 bg-[#0fb881] rounded-full"></div>
          </div>
          <h3 className="text-2xl font-bold text-white">Revenue vs Expenses Trend</h3>
        </div>
        <p className="text-sm text-gray-400 ml-12">Monthly comparison over the selected period</p>
      </div>
      
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" vertical={false} />
            <XAxis 
              dataKey="month" 
              stroke="#6b7280"
              fontSize={12}
              tickLine={false}
              axisLine={false}
            />
            <YAxis 
              stroke="#6b7280"
              fontSize={12}
              tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip content={<CustomTooltip />} />
            {/* Revenue always rendered */}
            {!hiddenKeys['revenue'] && (
              <Line 
                type="monotone" 
                dataKey="revenue" 
                stroke="#10b981" 
                strokeWidth={2.5}
                dot={{ fill: '#10b981', strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6, stroke: '#10b981', strokeWidth: 2 }}
                name={labelForKey('revenue')}
              />
            )}

            {/* Dynamically render expense series (detect keys from data) */}
            {(() => {
              const first = data[0] || {} as any
              const keys = Object.keys(first).filter(k => k !== 'month' && k !== 'revenue')
              return keys.map((key, idx) => {
                const color = getColorForKey(key)
                return !hiddenKeys[key] ? (
                  <Line
                    key={key}
                    type="monotone"
                    dataKey={key}
                    stroke={color}
                    strokeWidth={2}
                    dot={{ fill: color, strokeWidth: 1.5, r: 3.5 }}
                    activeDot={{ r: 5 }}
                    name={labelForKey(key)}
                  />
                ) : null
              })
            })()}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Custom Interactive Legend */}
      <div className="mt-8 pt-6 border-t border-white/10">
        <p className="text-xs text-gray-400 uppercase tracking-widest font-semibold mb-4">Toggle Series</p>
        <div className="flex flex-wrap gap-2">
          {/* Revenue */}
          <button
            onClick={() => toggleKey('revenue')}
            className="flex items-center space-x-2 px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 transition-all border border-white/5 hover:border-white/20"
          >
            <div
              className="w-2.5 h-2.5 rounded-full transition-opacity"
              style={{
                backgroundColor: getColorForKey('revenue'),
                opacity: hiddenKeys['revenue'] ? 0.3 : 1,
              }}
            />
            <span className={`text-xs font-medium transition-opacity ${hiddenKeys['revenue'] ? 'text-gray-500' : 'text-gray-300'}`}>
              {labelForKey('revenue')}
            </span>
          </button>

          {/* Expense categories */}
          {(() => {
            const first = data[0] || {} as any
            const keys = Object.keys(first).filter(k => k !== 'month' && k !== 'revenue')
            return keys.map((key) => (
              <button
                key={key}
                onClick={() => toggleKey(key)}
                className="flex items-center space-x-2 px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 transition-all border border-white/5 hover:border-white/20"
              >
                <div
                  className="w-2.5 h-2.5 rounded-full transition-opacity"
                  style={{
                    backgroundColor: getColorForKey(key),
                    opacity: hiddenKeys[key] ? 0.3 : 1,
                  }}
                />
                <span className={`text-xs font-medium transition-opacity ${hiddenKeys[key] ? 'text-gray-500' : 'text-gray-300'}`}>
                  {labelForKey(key)}
                </span>
              </button>
            ))
          })()}
        </div>
      </div>
    </div>
  )
}

