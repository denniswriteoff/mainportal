"use client";

import { Avatar, Chip } from "@nextui-org/react";

interface Payment {
  name: string;
  date: string;
  time: string;
  amount: number;
  status: string;
  icon?: string;
  change?: string;
}

interface PaymentHistoryProps {
  payments: Payment[];
}

export default function PaymentHistory({ payments }: PaymentHistoryProps) {
  const defaultPayments: Payment[] = [
    {
      name: "Dribbble Design",
      date: "16 Jun 2025",
      time: "10:30 PM",
      amount: 89345.23,
      status: "Successful",
      change: "+18.67%",
    },
    {
      name: "Google Pay",
      date: "15 Jun 2025",
      time: "11:45 PM",
      amount: 12345.89,
      status: "Successful",
      change: "+9.84%",
    },
    {
      name: "Amazon Shopping",
      date: "14 Jun 2025",
      time: "10:15 PM",
      amount: 32123.67,
      status: "Successful",
      change: "+12.23%",
    },
  ];

  const displayPayments = payments.length > 0 ? payments : defaultPayments;

  const getStatusColor = (status: string): "success" | "warning" | "danger" | "default" => {
    switch (status.toLowerCase()) {
      case "successful":
        return "success";
      case "pending":
        return "warning";
      case "failed":
        return "danger";
      default:
        return "default";
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((word) => word[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const getColorFromName = (name: string) => {
    const colors = ["primary", "secondary", "success", "warning", "danger"];
    const index = name.length % colors.length;
    return colors[index];
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-base font-semibold text-[#1D1D1D]">Payment History</h3>
          <p className="text-xs text-gray-600 mt-0.5">Recent payments history</p>
        </div>
      </div>

      <div className="space-y-3 mt-4">
        {displayPayments.map((payment, index) => (
          <div
            key={index}
            className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg transition-colors"
          >
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <Avatar
                name={getInitials(payment.name)}
                size="sm"
                classNames={{
                  base: `bg-${getColorFromName(payment.name)}-100`,
                  name: `text-${getColorFromName(payment.name)}-700 text-xs font-medium`,
                }}
              />
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium text-[#1D1D1D] truncate">
                  {payment.name}
                </div>
                {payment.change && (
                  <div className="text-xs text-gray-600">{payment.change}</div>
                )}
              </div>
            </div>

            <div className="flex items-center gap-4 flex-shrink-0">
              <div className="text-right hidden sm:block">
                <div className="text-xs text-gray-600">{payment.date}</div>
                <div className="text-xs text-gray-500">{payment.time}</div>
              </div>
              
              <Chip
                size="sm"
                variant="flat"
                color={getStatusColor(payment.status)}
                className="hidden md:flex"
              >
                {payment.status}
              </Chip>

              <div className="text-sm font-semibold text-[#1D1D1D] text-right min-w-[90px]">
                {new Intl.NumberFormat("en-US", {
                  style: "currency",
                  currency: "USD",
                  minimumFractionDigits: 2,
                }).format(payment.amount)}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
