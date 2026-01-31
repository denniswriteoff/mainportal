'use client'

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { useState, useMemo } from 'react'

interface TrendData {
  month: string
  revenue: number
  expenses: number
}

interface RevenueExpensesChartProps {
  data: TrendData[]
  loading?: boolean
  // expenseBreakdown prop is optional; component will derive breakdowns from `data` if present
  expenseBreakdown?: { name: string; value?: number }[]
}

export default function RevenueExpensesChart({ data, loading = false, expenseBreakdown = [] }: RevenueExpensesChartProps) {
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

  const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '')

  const keyFromName = (name: string) => {
    return name.toLowerCase().replace(/[^a-z0-9]+/g, '_')
  }

  // Derive breakdown items from `data` (per-month expenseBreakdown inside each row)
  const derivedBreakdown = (() => {
    const map = new Map<string, { name: string; value: number }>()
    for (const row of data || []) {
      const items = (row as any).expenseBreakdown || []
      for (const it of items) {
        if (!it || !it.name) continue
        if (!map.has(it.name)) {
          map.set(it.name, { name: it.name, value: Math.abs(it.value || 0) })
        } else {
          // keep the latest value (override) so legend shows recent magnitude
          map.set(it.name, { name: it.name, value: Math.abs(it.value || 0) })
        }
      }
    }
    // Fallback to expenseBreakdown prop if no per-month breakdowns
    if (map.size === 0 && expenseBreakdown && expenseBreakdown.length) {
      for (const b of expenseBreakdown) {
        map.set(b.name, { name: b.name, value: Math.abs(b.value || 0) })
      }
    }
    return Array.from(map.values())
  })()

  // Initialize hidden keys: revenue & expenses visible by default, other series hidden
  const initHiddenKeys = () => {
    const hidden: Record<string, boolean> = {}
    // revenue & expenses visible
    hidden['revenue'] = false
    hidden['expenses'] = false

    // include derived breakdown keys (default hidden)
    for (const b of derivedBreakdown || []) {
      hidden[keyFromName(b.name)] = true
    }
    return hidden
  }
  const [hiddenKeys, setHiddenKeys] = useState<Record<string, boolean>>(initHiddenKeys())

  const [drawerOpen, setDrawerOpen] = useState(false)

  const labelForKey = (key: string) => {
    if (key === 'revenue') return 'Revenue'
    if (key === 'expenses') return 'Expenses'
    const nk = normalize(key)

    // try to map using derivedBreakdown (per-month) first
    if (derivedBreakdown && derivedBreakdown.length) {
      for (const item of derivedBreakdown) {
        const nn = normalize(item.name)
        if (!nn) continue
        if (nn.includes(nk) || nk.includes(nn) || nn.includes(nk.replace(/s$/, '')) || nk.includes(nn.replace(/s$/, ''))) {
          return prettifyLabel(item.name)
        }
      }
    }

    // then try top-level prop fallback
    if (expenseBreakdown && expenseBreakdown.length) {
      for (const item of expenseBreakdown) {
        const nn = normalize(item.name)
        if (!nn) continue
        if (nn.includes(nk) || nk.includes(nn) || nn.includes(nk.replace(/s$/, '')) || nk.includes(nn.replace(/s$/, ''))) {
          return prettifyLabel(item.name)
        }
      }
    }

    // Fallback: prettify the key itself
    return prettifyLabel(key)
  }

  function prettifyLabel(s: string) {
    if (!s) return s
    // replace underscores/hyphens and camelCase boundaries with spaces
    const replaced = s.replace(/[_-]+/g, ' ').replace(/([a-z])([A-Z])/g, '$1 $2')
    return replaced.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ')
  }

  // Precompute color assignments for breakdown keys to avoid runtime computation in render
  const assignedColors = useMemo(() => {
    const palette = [
      '#f59e0b','#6366f1','#ec4899','#06b6d4','#ff7f50','#ffa500','#ffb347','#ff7bac','#8a2be2',
      '#7b68ee','#483d8b','#1e90ff','#6495ed','#00bfff','#4682b4','#5f9ea0','#40e0d0','#48d1cc',
      '#00ced1','#7fffd4','#dda0dd','#da70d6','#ff69b4','#ff1493','#c71585','#db7093','#ffcc00',
      '#ffd700','#f4a261','#e76f51','#9b5de5','#f15bb5','#fee440','#f8961e','#ffb703','#8d99ae',
      '#2b2d42','#b56576','#6a4c93','#3a86ff','#8338ec','#ff8fab','#ffb4a2','#e9c46a','#355070',
      '#a3a0fb','#f72585','#7209b7','#3f37c9','#ff9f1c','#ffbf69','#c08497','#7c3aed','#4cc9f0'
    ]

    const keys = (derivedBreakdown || []).map((b) => keyFromName(b.name))
    const map: Record<string, string> = {}
    // reserve revenue/expenses
    map['revenue'] = '#10b981'
    map['expenses'] = '#ef4444'

    if (keys.length === 0) return map

    // pick spread indices from palette to avoid similar adjacent colors
    const step = Math.max(1, Math.floor(palette.length / keys.length))
    for (let i = 0; i < keys.length; i++) {
      map[keys[i]] = palette[(i * step) % palette.length]
    }
    return map
  }, [derivedBreakdown])

  const getColorForKey = (key: string): string => {
    if (key === 'revenue') return '#10b981'
    if (key === 'expenses') return '#ef4444'
    return assignedColors[key] || '#9ca3af'
  }

  const toggleKey = (key: string) => {
    setHiddenKeys((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  // Build augmented data by injecting expenseBreakdown values into each month's object
  const expenseKeys = (derivedBreakdown || []).map((b) => keyFromName(b.name))

  // Build augmented data by injecting per-month expenseBreakdown values into each month's object
  const augmentedData = data.map((row: any) => {
    const newRow = { ...row } as any
    // initialize keys to 0
    for (const k of expenseKeys) newRow[k] = 0
    const items = (row as any).expenseBreakdown || []
    for (const it of items) {
      const k = keyFromName(it.name)
      newRow[k] = Math.abs(it.value || 0)
    }
    // remove the raw expenseBreakdown array so it doesn't create an invalid series
    if (newRow.expenseBreakdown !== undefined) delete newRow.expenseBreakdown
    return newRow
  })

  const seriesFirst = (augmentedData[0] || {}) as any
  const seriesKeys = Object.keys(seriesFirst).filter(k => k !== 'month')
  const extraKeys = expenseKeys

  return (
    <div className="group bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10 hover:border-green-500/30 hover:bg-gray-400/10 transition-all duration-300 shadow-lg">
      <div className="mb-8">
        <div className="flex items-center space-x-3 mb-2">
          <div className="bg-[#0fb881]/20 p-2.5 rounded-xl">
            <div className="w-2 h-2 bg-[#0fb881] rounded-full"></div>
          </div>
          <h3 className="text-2xl font-bold text-white">Revenue & Expenses Trend</h3>
        </div>
        <p className="text-sm text-gray-400 ml-12">Monthly comparison over the selected period</p>
      </div>
      
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={augmentedData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
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
              const first = augmentedData[0] || {} as any
              const keys = Object.keys(first).filter(k => k !== 'month' && k !== 'revenue' && k !== 'expenseBreakdown')
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
        <div className="flex justify-center gap-4">
          <button
            onClick={() => toggleKey('revenue')}
            style={{ width: '40%' }}
            className={`flex items-center justify-center space-x-2 px-4 py-3 rounded-lg bg-white/5 hover:bg-white/10 transition-all border border-white/5 hover:border-white/20 ${hiddenKeys['revenue'] ? 'opacity-60' : ''}`}
          >
            <div
              className="w-3.5 h-3.5 rounded-full"
              style={{ backgroundColor: getColorForKey('revenue') }}
            />
            <span className={`text-sm font-medium ${hiddenKeys['revenue'] ? 'text-gray-500' : 'text-gray-300'}`}>
              {labelForKey('revenue')}
            </span>
          </button>

          <button
            onClick={() => toggleKey('expenses')}
            style={{ width: '40%' }}
            className={`flex items-center justify-center space-x-2 px-4 py-3 rounded-lg bg-white/5 hover:bg-white/10 transition-all border border-white/5 hover:border-white/20 ${hiddenKeys['expenses'] ? 'opacity-60' : ''}`}
          >
            <div
              className="w-3.5 h-3.5 rounded-full"
              style={{ backgroundColor: getColorForKey('expenses') }}
            />
            <span className={`text-sm font-medium ${hiddenKeys['expenses'] ? 'text-gray-500' : 'text-gray-300'}`}>
              {labelForKey('expenses')}
            </span>
          </button>
        </div>

        {extraKeys.length > 0 && (
          <>
            <div className="flex justify-center mt-3">
              <button
                onClick={() => setDrawerOpen(!drawerOpen)}
                className="flex items-center space-x-2 text-sm text-gray-400 hover:text-white px-3 py-2 rounded-md transition-all"
              >
                <span>{drawerOpen ? 'Hide breakdown' : 'Show breakdown'}</span>
                <span className={`transform transition-transform ${drawerOpen ? 'rotate-180' : ''}`}>
                  ▼
                </span>
              </button>
            </div>

            {drawerOpen && (
              <div className="mt-4 grid grid-cols-2 gap-2">
                {extraKeys.map((key) => (
                  <button
                    key={key}
                    onClick={() => toggleKey(key)}
                    className={`flex items-center space-x-2 px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 transition-all border border-white/5 hover:border-white/20`}
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
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

