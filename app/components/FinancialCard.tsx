"use client";

import { Card, CardBody, Chip } from "@nextui-org/react";

interface FinancialCardProps {
  title: string;
  amount: number;
  trend?: string;
  trendUp?: boolean;
  showChart?: boolean;
  subtitle?: string;
}

export default function FinancialCard({
  title,
  amount,
  trend,
  trendUp = true,
  showChart = false,
  subtitle,
}: FinancialCardProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
    }).format(value);
  };

  return (
    <Card className="border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
      <CardBody className="p-5">
        <div className="flex items-start justify-between mb-3">
          <span className="text-sm text-gray-600 font-medium">{title}</span>
          {trend && (
            <Chip
              size="sm"
              variant="flat"
              color={trendUp ? "success" : "danger"}
              className="font-medium"
            >
              {trend}
            </Chip>
          )}
        </div>

        {showChart && title === "Total Balance" ? (
          <div className="relative">
            {/* Credit Card Style */}
            <div className="bg-primary rounded-xl p-4 relative overflow-hidden shadow-lg border border-gray-200">
              <div className="absolute top-0 right-0 w-24 h-24 bg-[#1D1D1D] opacity-5 rounded-full -mr-12 -mt-12"></div>
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-6">
                  <span className="text-lg font-bold text-[#1D1D1D]">VISA</span>
                  <svg className="w-6 h-6 text-[#1D1D1D]" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" />
                  </svg>
                </div>
                <div className="text-xs text-[#1D1D1D] opacity-60 mb-1">Credit Card</div>
                <div className="text-2xl font-bold mb-4 text-[#1D1D1D]">{formatCurrency(amount)}</div>
                <div className="flex items-center justify-between text-xs text-[#1D1D1D]">
                  <span>•••• 9090</span>
                  <span>09/26</span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div>
            <div className="text-2xl font-bold text-[#1D1D1D] mb-1">
              {formatCurrency(amount)}
            </div>
            {subtitle && (
              <p className="text-xs text-gray-600">{subtitle}</p>
            )}
          </div>
        )}
      </CardBody>
    </Card>
  );
}
