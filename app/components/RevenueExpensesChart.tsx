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

  // Initialize hidden keys: revenue & expenses visible by default, other series hidden
  const initHiddenKeys = () => {
    const hidden: Record<string, boolean> = {}
    // revenue & expenses visible
    hidden['revenue'] = false
    hidden['expenses'] = false

    // include expenseBreakdown keys (default hidden)
    for (const b of expenseBreakdown || []) {
      hidden[keyFromName(b.name)] = true
    }
    return hidden
  }
  const [hiddenKeys, setHiddenKeys] = useState<Record<string, boolean>>(initHiddenKeys())

  const [drawerOpen, setDrawerOpen] = useState(false)

  const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '')

  const keyFromName = (name: string) => {
    return name.toLowerCase().replace(/[^a-z0-9]+/g, '_')
  }

  const labelForKey = (key: string) => {
    if (key === 'revenue') return 'Revenue'
    if (key === 'expenses') return 'Expenses'

    const nk = normalize(key)

    // try to map using expenseBreakdown prop
    if (expenseBreakdown && expenseBreakdown.length) {
      for (const item of expenseBreakdown) {
        const nn = normalize(item.name)
        if (!nn) continue
        // match if normalized strings contain each other (handles plurals)
        if (nn.includes(nk) || nk.includes(nn) || nn.includes(nk.replace(/s$/, '')) || nk.includes(nn.replace(/s$/, ''))) {
          return item.name
        }
      }
    }

    // Fallback: prettify
    return key.replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase())
  }

  const getColorForKey = (key: string): string => {
    if (key === 'revenue') return '#10b981'
    if (key === 'expenses') return '#ef4444'

    // build ordered expense keys from expenseBreakdown
    const expenseKeys = (expenseBreakdown || []).map((b) => keyFromName(b.name))

    // palette (no pure greens or reds)
    const palette = [
      '#f59e0b','#6366f1','#ec4899','#06b6d4','#ff7f50','#ffa500','#ffb347','#ff7bac','#8a2be2',
      '#7b68ee','#483d8b','#1e90ff','#6495ed','#00bfff','#4682b4','#5f9ea0','#40e0d0','#48d1cc',
      '#00ced1','#7fffd4','#dda0dd','#da70d6','#ff69b4','#ff1493','#c71585','#db7093','#ffcc00',
      '#ffd700','#f4a261','#e76f51','#9b5de5','#f15bb5','#fee440','#f8961e','#ffb703','#8d99ae',
      '#2b2d42','#b56576','#6a4c93','#3a86ff','#8338ec','#ff8fab','#ffb4a2','#e9c46a','#355070',
      '#a3a0fb','#f72585','#7209b7','#3f37c9','#ff9f1c','#ffbf69','#c08497','#7c3aed','#4cc9f0'
    ]

    // helper: hex -> rgb
    const hexToRgb = (hex: string) => {
      let hexClean = (hex || '').replace('#', '')
      if (hexClean.length === 3) {
        hexClean = hexClean.split('').map((c) => c + c).join('')
      }
      const bigint = parseInt(hexClean, 16) || 0
      return [(bigint >> 16) & 255, (bigint >> 8) & 255, bigint & 255]
    }

    const colorDistance = (a: string, b: string) => {
      const ra = hexToRgb(a), rb = hexToRgb(b)
      return Math.sqrt(
        Math.pow(ra[0] - rb[0], 2) + Math.pow(ra[1] - rb[1], 2) + Math.pow(ra[2] - rb[2], 2)
      )
    }

    // assigned map cache
    const assigned: Record<string, string> = {}
    assigned['revenue'] = '#10b981'
    assigned['expenses'] = '#ef4444'

    // greedy assign palette to expenseKeys trying to maximize distance to already assigned colors
    const remaining = [...palette]
    for (const ek of expenseKeys) {
      if (assigned[ek]) continue
      let bestIdx = 0
      let bestScore = -Infinity
      for (let i = 0; i < remaining.length; i++) {
        const candidate = remaining[i]
        // score = min distance to all already assigned colors
        let minDist = Infinity
        for (const ac of Object.values(assigned)) {
          const d = colorDistance(candidate, ac)
          if (d < minDist) minDist = d
        }
        if (minDist > bestScore) {
          bestScore = minDist
          bestIdx = i
        }
      }
      const chosen = remaining.splice(bestIdx, 1)[0]
      assigned[ek] = chosen
    }

    // return assigned color if exists, otherwise fall back to a deterministic pick
    return assigned[key] || palette[Math.abs(key.length) % palette.length]
  }

  const toggleKey = (key: string) => {
    setHiddenKeys((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  // Build augmented data by injecting expenseBreakdown values into each month's object
  const expenseKeys = (expenseBreakdown || []).map((b) => keyFromName(b.name))

  const augmentedData = data.map((row: any, idx: number) => {
    const newRow = { ...row } as any
    // assign breakdown values to the month that has non-zero expenses (fallback to index 0)
    const targetIndex = data.findIndex((r: any) => (r.expenses || 0) > 0)
    const setOnIndex = targetIndex >= 0 ? targetIndex : 0
    for (let i = 0; i < (expenseBreakdown || []).length; i++) {
      const key = expenseKeys[i]
      newRow[key] = idx === setOnIndex ? (expenseBreakdown[i]?.value || 0) : 0
    }
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

