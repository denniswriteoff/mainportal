"use client";

import { Session } from "next-auth";
import { useState, useEffect } from "react";
import { Card, CardBody, Button, Chip, Spinner } from "@nextui-org/react";
import FinancialCard from "./FinancialCard";
import EngagementChart from "./EngagementChart";
import PaymentHistory from "./PaymentHistory";

interface DashboardContentProps {
  session: Session;
}

export default function DashboardContent({ session }: DashboardContentProps) {
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const response = await fetch("/api/dashboard/stats");
      if (response.ok) {
        const data = await response.json();
        setDashboardData(data);
      }
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  const firstName = session.user.name?.split(" ")[0] || "User";

  return (
    <div className="flex-1 overflow-y-auto bg-[#fafafa]">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-[#1D1D1D]">
              Welcome Back, <span className="text-gray-600">{firstName}</span>
            </h1>
          </div>
          <div className="flex items-center gap-3">
            {!session.user.accountingService && (
              <Button 
                color="primary" 
                variant="flat"
                size="sm"
                className="font-medium"
              >
                Connect Service
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto p-6">
        {!session.user.accountingService ? (
          <div className="flex items-center justify-center min-h-[500px]">
            <Card className="max-w-2xl w-full">
              <CardBody className="p-12 text-center">
                <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center mx-auto mb-6">
                  <svg
                    className="w-8 h-8 text-[#1D1D1D]"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 10V3L4 14h7v7l9-11h-7z"
                    />
                  </svg>
                </div>
                <h2 className="text-xl font-semibold mb-2 text-[#1D1D1D]">
                  Connect Your Accounting Service
                </h2>
                <p className="text-gray-600 mb-6 text-sm">
                  To get started, please connect either QuickBooks Online or Xero
                  to view your financial dashboard.
                </p>
                <div className="flex justify-center gap-3">
                  <Button
                    as="a"
                    href="/api/auth/qbo/connect"
                    color="primary"
                    variant="flat"
                    className="font-medium"
                  >
                    Connect QuickBooks
                  </Button>
                  <Button
                    as="a"
                    href="/api/auth/xero/connect"
                    color="primary"
                    className="font-medium"
                  >
                    Connect Xero
                  </Button>
                </div>
              </CardBody>
            </Card>
          </div>
        ) : loading ? (
          <div className="flex items-center justify-center min-h-[500px]">
            <Spinner size="lg" color="primary" />
          </div>
        ) : (
          <div className="space-y-6 animate-slide-in">
            {/* Financial Cards Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FinancialCard
                title="Total Balance"
                amount={dashboardData?.totalBalance || 0}
                trend="+12.8%"
                trendUp={true}
                showChart={true}
              />
              <FinancialCard
                title="Weekly Revenue"
                amount={dashboardData?.weeklyRevenue || 0}
                trend="+12.8%"
                trendUp={true}
              />
              <FinancialCard
                title="Credit Amount"
                amount={dashboardData?.creditAmount || 0}
                trend="+12.8%"
                trendUp={true}
                subtitle="Total refund amount with fee"
              />
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card className="border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                <CardBody className="p-4">
                  <EngagementChart data={dashboardData?.engagementData || []} />
                </CardBody>
              </Card>
              <Card className="border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                <CardBody className="p-4">
                  <PaymentHistory payments={dashboardData?.payments || []} />
                </CardBody>
              </Card>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
