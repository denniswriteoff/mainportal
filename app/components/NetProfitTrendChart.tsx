'use client'

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

interface TrendData {
  month: string
  revenue: number
  expenses: number
}

interface NetProfitTrendChartProps {
  data: TrendData[]
  loading?: boolean
}

export default function NetProfitTrendChart({ data, loading = false }: NetProfitTrendChartProps) {
  if (loading) {
    return (
      <div className="bg-[#1D1D1D] rounded-3xl p-8 shadow-2xl">
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

  // Calculate net profit for each month
  const chartData = data.map(item => ({
    month: item.month,
    revenue: item.revenue,
    expenses: item.expenses,
    netProfit: item.revenue - item.expenses
  }))

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
      const data = payload[0].payload
      return (
        <div className="bg-white border border-gray-200 rounded-lg p-3 shadow-lg">
          <p className="text-sm font-medium text-[#1D1D1D] mb-1">{label}</p>
          <p className="text-sm text-gray-600">
            Net Profit: {formatCurrency(data.netProfit)}
          </p>
          <p className="text-xs text-gray-500">
            Revenue: {formatCurrency(data.revenue || 0)} | Expenses: {formatCurrency(data.expenses || 0)}
          </p>
        </div>
      )
    }
    return null
  }

  return (
    <div className="bg-[#1D1D1D] rounded-3xl p-8 shadow-2xl">
      <div className="mb-8">
        <div className="flex items-center space-x-3 mb-2">
          <div className="bg-[#E8E7BB] p-2 rounded-full">
            <div className="w-2 h-2 bg-[#1D1D1D] rounded-full"></div>
          </div>
          <h3 className="text-2xl font-bold text-white">Net Profit Trend</h3>
        </div>
        <p className="text-sm text-gray-400 ml-11">Monthly net profit over the past 12 months</p>
      </div>
      
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#ffffff15" vertical={false} />
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
            <Line 
              type="monotone" 
              dataKey="netProfit" 
              stroke="#3b82f6" 
              strokeWidth={3}
              dot={{ fill: '#3b82f6', strokeWidth: 2, r: 5 }}
              activeDot={{ r: 7, stroke: '#3b82f6', strokeWidth: 2 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

