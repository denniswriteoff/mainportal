"use client";

import { Button, ButtonGroup, Chip } from "@nextui-org/react";
import { useState } from "react";
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
  const [period, setPeriod] = useState<"monthly" | "annually">("annually");

  const defaultData = [
    { month: "JAN", value: 2500 },
    { month: "FEB", value: 4200 },
    { month: "MAR", value: 3200 },
    { month: "APR", value: 5000 },
    { month: "MAY", value: 3800 },
    { month: "JUN", value: 4500 },
  ];

  const chartData = data.length > 0 ? data : defaultData;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-base font-semibold text-[#1D1D1D]">Engagement Rate</h3>
        <ButtonGroup size="sm" variant="flat">
          <Button
            onPress={() => setPeriod("monthly")}
            color={period === "monthly" ? "primary" : "default"}
          >
            Monthly
          </Button>
          <Button
            onPress={() => setPeriod("annually")}
            color={period === "annually" ? "primary" : "default"}
          >
            Annually
          </Button>
        </ButtonGroup>
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
            tickFormatter={(value) => `${value / 1000}k`}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "white",
              border: "1px solid #e2e8f0",
              borderRadius: "12px",
              padding: "8px 12px",
            }}
            formatter={(value: any) => [`$${value.toLocaleString()}`, "Revenue"]}
          />
          <Bar 
            dataKey="value" 
            fill="#E8E7BB" 
            radius={[8, 8, 0, 0]}
            maxBarSize={40}
          />
        </BarChart>
      </ResponsiveContainer>

      <div className="mt-4 flex justify-center">
        <Chip color="success" variant="flat" size="sm" className="font-medium">
          +17.8%
        </Chip>
      </div>
    </div>
  );
}
