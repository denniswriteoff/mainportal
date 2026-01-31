"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface EngagementChartProps {
  data: any[];
}

export default function EngagementChart({ data }: EngagementChartProps) {
  const chartData = data.length > 0 ? data : [];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-base font-semibold text-[#1D1D1D]">Revenue & Expenses</h3>
        <div className="flex gap-4 items-center">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-[#E8E7BB]"></div>
            <span className="text-xs text-gray-600">Revenue</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-[#EF4444]"></div>
            <span className="text-xs text-gray-600">Expenses</span>
          </div>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
          <XAxis
            dataKey="month"
            axisLine={false}
            tickLine={false}
            tick={{ fill: "#6b7280", fontSize: 12, fontWeight: 500 }}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{ fill: "#6b7280", fontSize: 12, fontWeight: 500 }}
            tickFormatter={(value) => `$${value / 1000}k`}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "white",
              border: "1px solid #e2e8f0",
              borderRadius: "12px",
              padding: "8px 12px",
            }}
            formatter={(value: any) => [`$${value.toLocaleString()}`]}
          />
          <Bar 
            dataKey="revenue" 
            fill="#E8E7BB" 
            radius={[8, 8, 0, 0]}
            maxBarSize={30}
            name="Revenue"
          />
          <Bar 
            dataKey="expenses" 
            fill="#EF4444" 
            radius={[8, 8, 0, 0]}
            maxBarSize={30}
            name="Expenses"
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
