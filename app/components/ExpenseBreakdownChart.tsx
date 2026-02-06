'use client'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'
import { useMemo, useState } from 'react'

interface ExpenseData {
  name: string
  value: number
  percentage: number
}

interface ExpenseBreakdownChartProps {
  data: ExpenseData[]
  loading?: boolean
  onExpenseClick?: (expenseName: string) => void
}

// Color palette for the pie chart segments - NO Beige
const COLORS = [
  '#f59e0b','#6366f1','#ec4899','#06b6d4','#ff7f50','#ffa500','#ffb347','#4cc9f0','#8a2be2',
  '#7b68ee','#483d8b','#1e90ff','#6495ed','#00bfff','#4682b4','#5f9ea0','#40e0d0','#48d1cc',
  '#00ced1','#7fffd4','#dda0dd','#da70d6','#ff69b4','#ff1493','#c71585','#db7093','#ffcc00',
  '#ffd700','#f4a261','#e76f51','#9b5de5','#f15bb5','#fee440','#f8961e','#ffb703','#8d99ae',
  '#2b2d42','#b56576','#6a4c93','#3a86ff','#8338ec','#ff8fab','#ffb4a2','#e9c46a','#355070',
  '#a3a0fb','#f72585','#7209b7','#3f37c9','#ff9f1c','#ffbf69','#c08497','#7c3aed','#4cc9f0'
]

export default function ExpenseBreakdownChart({ data, loading = false, onExpenseClick }: ExpenseBreakdownChartProps) {
  if (loading) {
      return (
        <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10 shadow-lg">
        <div className="flex items-center justify-center h-80">
          <div className="text-sm text-gray-400">Loading chart data...</div>
        </div>
      </div>
    )
  }

  if (!data || data.length === 0) {
      return (
        <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10 shadow-lg">
        <div className="flex items-center justify-center h-80">
          <div className="text-sm text-gray-400">No expense data available</div>
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

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0]
      return (
        <div className="bg-white border border-gray-200 rounded-lg p-3 shadow-lg">
          <p className="text-sm font-medium text-[#1D1D1D] mb-1">
            {data.name}
          </p>
          <p className="text-sm text-gray-600">
            Amount: {formatCurrency(data.value)}
          </p>
          <p className="text-sm text-gray-600">
            Percentage: {data.payload.percentage.toFixed(1)}%
          </p>
          {onExpenseClick && (
            <p className="text-xs text-blue-600 mt-2 cursor-pointer hover:underline">
              Click to view details
            </p>
          )}
        </div>
      )
    }
    return null
  }

  const handleCellClick = (entry: ExpenseData) => {
    if (onExpenseClick) {
      onExpenseClick(entry.name)
    }
  }

  // visibility toggles for each expense category
  const keyFromName = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, '_')
  const names = data.map(d => d.name)
  const initHidden: Record<string, boolean> = {}
  for (const n of names) initHidden[keyFromName(n)] = false
  const [hiddenKeys, setHiddenKeys] = useState<Record<string, boolean>>(initHidden)
  const [drawerOpen, setDrawerOpen] = useState(false)

  // slider to filter out low-value expense categories (min threshold)
  const maxValue = Math.max(...data.map(d => d.value), 0)
  const [minThreshold, setMinThreshold] = useState<number>(0)

  const toggleHidden = (name: string) => {
    const k = keyFromName(name)
    setHiddenKeys(prev => ({ ...prev, [k]: !prev[k] }))
  }

  const visibleData = data.filter(d => !hiddenKeys[keyFromName(d.name)] && d.value >= minThreshold)

  // color assignment for pie segments and chips
  const assignedColors = useMemo(() => {
    const map: Record<string, string> = {}
    for (let i = 0; i < names.length; i++) {
      map[keyFromName(names[i])] = COLORS[i % COLORS.length]
    }
    return map
  }, [data])

  const getColorForKey = (name: string) => assignedColors[keyFromName(name)] || '#9ca3af'

  // Chips under the chart (toggle visibility). Label click opens details, chip click toggles visibility.
  const Chips = () => (
    <div className="flex flex-wrap gap-2 mt-4 justify-center">
      {data.map((d) => {
        const k = keyFromName(d.name)
        const hidden = !!hiddenKeys[k]
        return (
          <button
            key={k}
            onClick={(e) => { e.stopPropagation(); if (onExpenseClick) onExpenseClick(d.name) }}
            className={`flex items-center space-x-2 px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 transition-all border border-white/5 hover:border-white/20 ${hidden ? 'opacity-60' : ''}`}
          >
            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: getColorForKey(d.name) }} />
            <span
              className={`text-xs font-medium ${hidden ? 'text-gray-500' : 'text-gray-300'} cursor-pointer`}
              onClick={(e) => { e.stopPropagation(); if (onExpenseClick) onExpenseClick(d.name) }}
            >
              {d.name}
            </span>
          </button>
        )
      })}
    </div>
  )

  return (
    <div className="group bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10 hover:border-yellow-500/30 hover:bg-gray-400/10 transition-all duration-300 shadow-lg">
      <div className="mb-8">
        <div className="flex items-center space-x-3 mb-2">
            <div className="bg-amber-500/20 p-3 rounded-xl">
              <div className="w-2 h-2 bg-amber-400 rounded-full"></div>
          </div>
            <h3 className="text-2xl font-bold text-white tracking-wide">Expense Breakdown</h3>
        </div>
          <p className="text-xs text-gray-500 ml-11 tracking-wide">Distribution of operating expenses by category</p>
      </div>
      
      <div className="h-80">
            <div className="mb-4">
              <div className="flex items-center justify-between mb-1">
                <div className="text-xs text-gray-400">Minimum category value to include</div>
                <div className="text-xs text-gray-300 font-medium">{formatCurrency(minThreshold)}</div>
              </div>
              <input
                type="range"
                min={0}
                max={Math.ceil(maxValue)}
                value={minThreshold}
                onChange={(e) => setMinThreshold(Number(e.target.value))}
                className="w-full"
              />
            </div>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={visibleData}
              cx="50%"
              cy="45%"
              innerRadius={70}
              outerRadius={110}
              paddingAngle={3}
              dataKey="value"
              onClick={onExpenseClick ? (data, index) => handleCellClick(data) : undefined}
              style={onExpenseClick ? { cursor: 'pointer' } : undefined}
            >
              {visibleData.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={getColorForKey(entry.name)}
                  style={onExpenseClick ? { cursor: 'pointer' } : undefined}
                />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            {/* custom chips legend below */}
          </PieChart>
        </ResponsiveContainer>
      </div>
      <Chips />
      {/* Breakdown toggles drawer */}
      <div className="mt-6 border-t border-white/10">
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
            {data.map((key) => {
              const k = keyFromName(key.name)
              const hidden = !!hiddenKeys[k]  

              return (
              <button
                key={key.name}
                onClick={() => toggleHidden(key.name)}
                className={`flex items-center space-x-2 px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 transition-all border border-white/5 hover:border-white/20`}
              >
                <div
                  className="w-2.5 h-2.5 rounded-full transition-opacity"
                  style={{
                    backgroundColor: getColorForKey(key.name),
                    opacity: hidden ? 0.3 : 1,
                  }}
                />
                <span className={`text-xs font-medium transition-opacity ${hidden ? 'text-gray-500' : 'text-gray-300'}`}>
                  {key.name}
                </span>
              </button>
            )})}
          </div>
        )}
      </div>
    </div>
  )
}

