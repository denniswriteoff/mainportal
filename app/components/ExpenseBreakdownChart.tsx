'use client'
import { useState, useEffect } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts'

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

  const toggleHidden = (name: string) => {
    const k = keyFromName(name)
    setHiddenKeys(prev => ({ ...prev, [k]: !prev[k] }))
  }

  const visibleData = data.filter(d => !hiddenKeys[keyFromName(d.name)])

  const CustomLegend = ({ payload }: any) => {
    return (
      <div className="flex flex-wrap gap-2 mt-4">
        {payload.map((entry: any, index: number) => {
          const expenseEntry = data.find(d => d.name === entry.value)
          return (
            <div 
              key={index} 
              className={`flex items-center space-x-2 text-xs ${onExpenseClick ? 'cursor-pointer hover:opacity-80 transition-opacity' : ''}`}
              onClick={onExpenseClick && expenseEntry ? () => handleCellClick(expenseEntry) : undefined}
            >
              <div 
                className="w-3 h-3 rounded-full" 
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-white">
                {entry.value}
              </span>
            </div>
          )
        })}
      </div>
    )
  }

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
              {data.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={COLORS[index % COLORS.length]}
                  style={onExpenseClick ? { cursor: 'pointer' } : undefined}
                />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            <Legend content={<CustomLegend />} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      {/* Breakdown toggles drawer */}
      <div className="mt-6 pt-6 border-t border-white/10">
        <div className="flex justify-center">
          <button
            onClick={() => setDrawerOpen(!drawerOpen)}
            className="text-sm text-gray-400 hover:text-white px-3 py-2 rounded-md transition-all"
          >
            {drawerOpen ? 'Hide breakdown toggles' : 'Show breakdown toggles'}
          </button>
        </div>

        {drawerOpen && (
          <div className="mt-4 grid grid-cols-2 gap-2">
            {data.map((d, idx) => {
              const k = keyFromName(d.name)
              return (
                <label key={k} className="flex items-center space-x-2 px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 transition-all border border-white/5 hover:border-white/20">
                  <input
                    type="checkbox"
                    checked={!hiddenKeys[k]}
                    onChange={() => toggleHidden(d.name)}
                    className="w-4 h-4"
                  />
                  <span
                    className={`text-xs font-medium ${hiddenKeys[k] ? 'text-gray-500' : 'text-gray-300'} cursor-pointer`}
                    onClick={() => onExpenseClick && onExpenseClick(d.name)}
                  >
                    {d.name}
                  </span>
                </label>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

