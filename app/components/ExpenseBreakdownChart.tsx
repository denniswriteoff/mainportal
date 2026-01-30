'use client'

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
  '#3b82f6', // blue
  '#ef4444', // red
  '#10b981', // green
  '#f59e0b', // amber
  '#8b5cf6', // violet
  '#06b6d4', // cyan
  '#ec4899', // pink
  '#6366f1', // indigo
  '#f97316', // orange
  '#84cc16', // lime
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
              <span className="text-gray-700">
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
              data={data}
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
    </div>
  )
}

