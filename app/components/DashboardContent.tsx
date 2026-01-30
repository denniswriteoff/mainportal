"use client";

import { Session } from "next-auth";
import { useState, useEffect, useRef, useCallback } from "react";
import { useSession } from "next-auth/react";
import { Card, CardBody, Button, Spinner } from "@nextui-org/react";
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  Wallet, 
  BarChart3,
  Download,
  ArrowUpDown,
  ArrowUp,
  ArrowDown
} from 'lucide-react';
import RevenueExpensesChart from "./RevenueExpensesChart";
import ExpenseBreakdownChart from "./ExpenseBreakdownChart";
import NetProfitTrendChart from "./NetProfitTrendChart";
import ExpenseDetailModal from "./ExpenseDetailModal";
import FinancialInsightPopup from "./FinancialInsightPopup";
import AnnouncementPopup from "./AnnouncementPopup";

interface DashboardContentProps {
  session: Session;
}

export default function DashboardContent({ session: initialSession }: DashboardContentProps) {
  const { data: session } = useSession();
  const currentSession = session || initialSession;
  
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMonthly, setLoadingMonthly] = useState(true);
  const [loadingPrevious, setLoadingPrevious] = useState(true);
  const [timeframe, setTimeframe] = useState<'YEAR' | 'MONTH' | 'CUSTOM' | 'L12'>('YEAR');
  const [customFromDate, setCustomFromDate] = useState<string>('');
  const [customToDate, setCustomToDate] = useState<string>('');
  const [sortField, setSortField] = useState<'name' | 'value' | 'percentage'>('value');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [selectedExpense, setSelectedExpense] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [insights, setInsights] = useState<string | null>(null);
  const [loadingInsights, setLoadingInsights] = useState(true);
  const [showInsightsPopup, setShowInsightsPopup] = useState(false);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [currentAnnouncementIndex, setCurrentAnnouncementIndex] = useState(0);
  
  // Check sessionStorage after mount to avoid hydration mismatch
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const wasClosed = sessionStorage.getItem('financial-insights-popup-closed') === 'true';
      if (wasClosed) {
        setShowInsightsPopup(false);
      } else {
        setShowInsightsPopup(true);
      }
    }
  }, []);
  const isFetchingRef = useRef(false);

  const fetchDashboardData = useCallback(async () => {
    // Prevent duplicate calls
    // if (isFetchingRef.current) {
    //   return;
    // }
    
    // Skip fetching if CUSTOM is selected but dates are not set
    if (timeframe === 'CUSTOM' && (!customFromDate || !customToDate)) {
      return;
    }

    isFetchingRef.current = true;
    try {
      setLoading(true);
      setLoadingMonthly(true);
      setLoadingPrevious(true);
      
      // Compute from/to dates for stats and monthly endpoints
      let fromDateStr: string | undefined;
      let toDateStr: string | undefined;
      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth();

      if (timeframe === 'CUSTOM') {
        if (!customFromDate || !customToDate) {
          return;
        }
        fromDateStr = customFromDate;
        toDateStr = customToDate;
      } else if (timeframe === 'YEAR') {
        fromDateStr = `${currentYear}-01-01`;
        toDateStr = `${currentYear}-12-31`;
      } else if (timeframe === 'MONTH') {
        const monthStart = new Date(currentYear, currentMonth, 1);
        const monthEnd = new Date(currentYear, currentMonth + 1, 0);
        fromDateStr = monthStart.toISOString().split('T')[0];
        toDateStr = monthEnd.toISOString().split('T')[0];
      } else if (timeframe === 'L12') {
        // Last 12 months (including current month)
        const start = new Date(now.getFullYear(), now.getMonth() - 11, 1);
        const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        fromDateStr = start.toISOString().split('T')[0];
        toDateStr = end.toISOString().split('T')[0];
      }

      // Build query string with optional date parameters
      let statsUrl = `/api/dashboard/stats?timeframe=${timeframe}`;
      if (fromDateStr && toDateStr) {
        statsUrl += `&fromDate=${fromDateStr}&toDate=${toDateStr}`;
      }
      
      // Fetch main stats (fast - KPIs and expense breakdown)
      const statsResponse = await fetch(statsUrl);
      let statsData: any = null;
      if (statsResponse.ok) {
        statsData = await statsResponse.json();
        setDashboardData((prev: any) => ({ 
          ...prev, 
          ...statsData,
          trendData: prev?.trendData || [],
          previousPeriodData: prev?.previousPeriodData || [],
        }));
      }
      setLoading(false);

      // Fetch monthly trend data (slower - multiple API calls with rate limiting)
      if (fromDateStr && toDateStr) {
        const monthlyResponse = await fetch(`/api/dashboard/monthly?fromDate=${fromDateStr}&toDate=${toDateStr}`);
        if (monthlyResponse.ok) {
          const monthlyData = await monthlyResponse.json();
          setDashboardData((prev: any) => ({ 
            ...prev, 
            trendData: monthlyData.trendData || [],
          }));
        } else {
          setDashboardData((prev: any) => ({ ...prev, trendData: [] }));
        }
      } else {
        setDashboardData((prev: any) => ({ 
          ...prev, 
          trendData: [],
        }));
      }
      setLoadingMonthly(false);

      // Fetch previous period data (slow - additional API call)
      if (statsResponse.ok && statsData) {
        const timeframeData = statsData.timeframe;
        if (timeframeData?.from && timeframeData?.to) {
          let previousUrl = `/api/dashboard/previous?timeframe=${timeframe}&fromDate=${timeframeData.from}&toDate=${timeframeData.to}`;
          const previousResponse = await fetch(previousUrl);
          if (previousResponse.ok) {
            const previousData = await previousResponse.json();
            setDashboardData((prev: any) => ({ 
              ...prev, 
              previousPeriodData: previousData.previousPeriodData || [],
            }));
          }
        }
      }
      setLoadingPrevious(false);
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
      setLoading(false);
      setLoadingMonthly(false);
      setLoadingPrevious(false);
    } finally {
      isFetchingRef.current = false;
    }
  }, [timeframe, customFromDate, customToDate]);

  useEffect(() => {
    // Only auto-fetch for MTD and YTD, not for CUSTOM
    if (timeframe !== 'CUSTOM') {
      fetchDashboardData();
    }
  }, [timeframe, fetchDashboardData]);

  useEffect(() => {
    console.log('timeframe', timeframe);
  }, [timeframe]);

  // Fetch announcements on mount
  useEffect(() => {
    fetchAnnouncements();
  }, []);

  // Fetch insights when dashboard data is fully loaded and setting is enabled
  useEffect(() => {
    if (
      dashboardData &&
      !loading &&
      !loadingMonthly &&
      !loadingPrevious &&
      currentSession.user.accountingService &&
      currentSession.user.enableAiFinancialInsights
    ) {
      fetchInsights();
    }
  }, [loading, loadingMonthly, loadingPrevious, dashboardData, currentSession.user.accountingService, currentSession.user.enableAiFinancialInsights]);

  const fetchInsights = async () => {
    if (!dashboardData) return;
    
    try {
      setLoadingInsights(true);
      const response = await fetch('/api/dashboard/insights', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ dashboardData }),
      });

      if (response.ok) {
        const data = await response.json();
        setInsights(data.insights);
      } else {
        console.error('Failed to fetch insights');
      }
    } catch (error) {
      console.error('Error fetching insights:', error);
    } finally {
      setLoadingInsights(false);
    }
  };

  const fetchAnnouncements = async () => {
    try {
      const response = await fetch('/api/announcements/unread');
      if (response.ok) {
        const data = await response.json();
        setAnnouncements(data.announcements || []);
      }
    } catch (error) {
      console.error('Error fetching announcements:', error);
    }
  };

  const handleMarkAnnouncementRead = async (announcementId: string) => {
    try {
      await fetch('/api/announcements/mark-read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ announcementId }),
      });
      
      // Move to next announcement or close
      if (currentAnnouncementIndex < announcements.length - 1) {
        setCurrentAnnouncementIndex(currentAnnouncementIndex + 1);
      } else {
        setAnnouncements([]);
        setCurrentAnnouncementIndex(0);
      }
    } catch (error) {
      console.error('Error marking announcement as read:', error);
    }
  };

  const handleCloseAnnouncement = () => {
    if (currentAnnouncementIndex < announcements.length - 1) {
      setCurrentAnnouncementIndex(currentAnnouncementIndex + 1);
    } else {
      setAnnouncements([]);
      setCurrentAnnouncementIndex(0);
    }
  };

  const handleSort = (field: 'name' | 'value' | 'percentage') => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const getSortedExpenses = () => {
    if (!dashboardData?.expenseBreakdown) return [];
    
    return [...dashboardData.expenseBreakdown].sort((a: any, b: any) => {
      let aValue: string | number;
      let bValue: string | number;
      
      if (sortField === 'name') {
        aValue = a.name.toLowerCase();
        bValue = b.name.toLowerCase();
      } else if (sortField === 'value') {
        aValue = a.value;
        bValue = b.value;
      } else {
        aValue = a.percentage;
        bValue = b.percentage;
      }
      
      if (sortDirection === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });
  };

  const calculatePercentageChange = (currentValue: number, previousValue: number) => {
    if (previousValue === 0) {
      return currentValue > 0 ? 100 : 0;
    }
    return ((currentValue - previousValue) / previousValue) * 100;
  };

  const getExpenseChange = (expenseName: string) => {
    if (!dashboardData?.previousPeriodData) {
      return { change: 0, hasData: false };
    }
    
    const previousExpense = dashboardData.previousPeriodData.find((prev: any) => 
      prev.name.toLowerCase() === expenseName.toLowerCase()
    );
    
    if (!previousExpense) {
      return { change: 0, hasData: false };
    }
    
    const currentExpense = dashboardData.expenseBreakdown.find((current: any) => 
      current.name.toLowerCase() === expenseName.toLowerCase()
    );
    
    if (!currentExpense) {
      return { change: 0, hasData: false };
    }
    
    const change = calculatePercentageChange(currentExpense.value, previousExpense.value);
    return { change, hasData: true };
  };

  const handleApplyCustomDateRange = () => {
    if (customFromDate && customToDate) {
      if (new Date(customFromDate) > new Date(customToDate)) {
        alert('From date must be before To date');
        return;
      }
      fetchDashboardData();
    } else {
      alert('Please select both From and To dates');
    }
  };

  const handleExport = async (format: 'csv' | 'json') => {
    try {
      let exportUrl = `/api/dashboard/export?format=${format}&timeframe=${timeframe}`;
      if (timeframe === 'CUSTOM' && customFromDate && customToDate) {
        exportUrl += `&fromDate=${customFromDate}&toDate=${customToDate}`;
      }
      
      const response = await fetch(exportUrl);
      
      if (!response.ok) {
        throw new Error('Export failed');
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const dateSuffix = timeframe === 'CUSTOM' && customFromDate && customToDate 
        ? `${customFromDate}-to-${customToDate}` 
        : timeframe.toLowerCase();
      a.download = `financial-report-${dateSuffix}.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error('Export failed:', err);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  // Cash Runway calculation (months) = cashBalance / lastMonthExpenses
  const cashRunwayMonths = (() => {
    const cash = dashboardData?.kpis?.cashBalance || 0;
    const trend = dashboardData?.trendData || [];
    if (!trend || trend.length === 0) return null;
    const last = trend[trend.length - 1];
    if (!last) return null;
    // if explicit `expenses` field exists use it, otherwise sum other numeric keys
    let lastMonthExpenses = 0;
    if (typeof last.expenses === 'number') {
      lastMonthExpenses = last.expenses;
    } else {
      for (const k of Object.keys(last)) {
        if (k === 'month' || k === 'revenue') continue;
        const v = Number((last as any)[k]);
        if (!isNaN(v)) lastMonthExpenses += v;
      }
    }

    if (!lastMonthExpenses || lastMonthExpenses === 0) return null;
    return cash / lastMonthExpenses;
  })();

  const handleExpenseClick = (expenseName: string) => {
    setSelectedExpense(expenseName);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedExpense(null);
  };

  const firstName = currentSession.user.name?.split(" ")[0] || "User";

    return (
      <div className="flex-1 overflow-y-auto bg-gradient-to-br from-[#0f0f0f] via-[#171714] to-[#1a1a1a]">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-[#1D1D1D]/80 backdrop-blur-xl border-b border-white/5 px-6 py-5">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white tracking-tight">
              Welcome back, <span className="text-[#E8E7BB]">{firstName}</span>
            </h1>
            <p className="text-sm text-gray-400 mt-1">Monitor your business financial health</p>
          </div>
          <div className="flex items-center gap-3">
            {!currentSession.user.accountingService && (
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
        {!currentSession.user.accountingService ? (
          <div className="flex items-center justify-center min-h-[500px]">
            <Card className="max-w-2xl w-full bg-[#1D1D1D] shadow-2xl">
              <CardBody className="p-12 text-center">
                <div className="w-16 h-16 bg-[#E8E7BB] rounded-full flex items-center justify-center mx-auto mb-6">
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
                <h2 className="text-xl font-semibold mb-2 text-white">
                  Connect Your Accounting Service
                </h2>
                <p className="text-gray-400 mb-6 text-sm">
                  To get started, please connect either QuickBooks Online or Xero
                  to view your financial overview.
                </p>
                <div className="flex justify-center gap-3">
                  <Button
                    as="a"
                    href="/api/auth/qbo/connect"
                    className="font-medium bg-white/10 text-white hover:bg-white/20"
                  >
                    Connect QuickBooks
                  </Button>
                  <Button
                    as="a"
                    href="/api/auth/xero/connect"
                    className="font-medium bg-[#E8E7BB] text-[#1D1D1D] hover:bg-[#d4d3a7]"
                  >
                    Connect Xero
                  </Button>
                </div>
              </CardBody>
            </Card>
          </div>
        ) : (
          <div className="space-y-6 animate-slide-in">
            {/* Timeframe Toggle - Always visible */}
            <div className="flex items-center justify-between bg-white/5 backdrop-blur-sm rounded-2xl px-6 py-4 border border-white/10 shadow-lg">
              <div className="flex items-center space-x-3">
                <h2 className="text-xl font-semibold text-white">
                  {dashboardData?.organisation?.name || 'Financial'} Overview
                </h2>
                {dashboardData?.timeframe && timeframe !== 'CUSTOM' && (
                  <span className="text-xs text-gray-300 bg-[#E8E7BB]/10 px-3 py-1.5 rounded-full border border-[#E8E7BB]/20">
                    {dashboardData.timeframe.from} to {dashboardData.timeframe.to}
                  </span>
                )}
              </div>
              
              <div className="flex items-center space-x-3">
                <div className="flex items-center space-x-2 bg-white/5 rounded-xl p-1.5 border border-white/10">
                  <button
                    onClick={() => {
                      setTimeframe('MONTH');
                      if (timeframe === 'CUSTOM') {
                        setCustomFromDate('');
                        setCustomToDate('');
                      }
                    }}
                    className={`px-4 py-2 text-sm rounded-lg font-medium transition-all ${
                      timeframe === 'MONTH'
                        ? 'bg-[#E8E7BB] text-[#1D1D1D] shadow-lg'
                        : 'text-gray-300 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    MTD
                  </button>
                  <button
                    onClick={() => {
                      setTimeframe('YEAR');
                      if (timeframe === 'CUSTOM') {
                        setCustomFromDate('');
                        setCustomToDate('');
                      }
                    }}
                    className={`px-4 py-2 text-sm rounded-lg font-medium transition-all ${
                      timeframe === 'YEAR'
                        ? 'bg-[#E8E7BB] text-[#1D1D1D] shadow-lg'
                        : 'text-gray-300 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    YTD
                  </button>
                  <button
                    onClick={() => {
                      setTimeframe('L12');
                      if (timeframe === 'CUSTOM') {
                        setCustomFromDate('');
                        setCustomToDate('');
                      }
                    }}
                    className={`px-4 py-2 text-sm rounded-lg font-medium transition-all ${
                      timeframe === 'L12'
                        ? 'bg-[#E8E7BB] text-[#1D1D1D] shadow-lg'
                        : 'text-gray-300 hover:text-white'
                    }`}
                  >
                    L12M
                  </button>
                  <button
                    onClick={() => setTimeframe('CUSTOM')}
                    className={`px-5 py-2 text-sm rounded-full font-medium transition-all ${
                      timeframe === 'CUSTOM'
                        ? 'bg-[#E8E7BB] text-[#1D1D1D] shadow-md'
                        : 'text-gray-300 hover:text-white'
                    }`}
                  >
                    Custom
                  </button>
                </div>
                
                {timeframe === 'CUSTOM' && (
                  <div className="flex items-center space-x-2">
                    <div className="flex items-center space-x-2 bg-white/10 rounded-full px-4 py-2">
                      <input
                        type="date"
                        value={customFromDate}
                        onChange={(e) => setCustomFromDate(e.target.value)}
                        max={customToDate || undefined}
                        className="bg-transparent text-white text-sm border-none outline-none focus:ring-2 focus:ring-[#E8E7BB] rounded px-2 py-1"
                        style={{ colorScheme: 'dark' }}
                      />
                      <span className="text-gray-400 text-sm font-medium">to</span>
                      <input
                        type="date"
                        value={customToDate}
                        onChange={(e) => setCustomToDate(e.target.value)}
                        min={customFromDate || undefined}
                        className="bg-transparent text-white text-sm border-none outline-none focus:ring-2 focus:ring-[#E8E7BB] rounded px-2 py-1"
                        style={{ colorScheme: 'dark' }}
                      />
                    </div>
                    <button
                      onClick={handleApplyCustomDateRange}
                      disabled={!customFromDate || !customToDate || loading}
                      className="px-4 py-2 text-sm rounded-full font-medium transition-all bg-[#E8E7BB] text-[#1D1D1D] hover:bg-[#d4d3a7] shadow-md disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-[#E8E7BB]"
                    >
                      Apply
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Loading State for Content */}
            {loading ? (
              <div className="flex items-center justify-center min-h-[400px]">
                <div className="flex flex-col items-center space-y-4">
                  <Spinner size="lg" color="default" className="text-[#1D1D1D]" />
                  <p className="text-sm text-[#1D1D1D]/70">Loading your dashboard...</p>
                </div>
              </div>
            ) : (
              <>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
              <div className="group bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10 hover:border-[#E8E7BB]/30 hover:bg-gray-400/10 transition-all duration-300 shadow-lg">
                <div className="flex items-center justify-between mb-4">
                  <div className="bg-[#E8E7BB]/20 p-3 rounded-xl">
                    <DollarSign className="w-6 h-6 text-[#E8E7BB]" />
                  </div>
                </div>
                <p className="text-xs text-gray-400 mb-2 uppercase tracking-widest font-semibold">Revenue</p>
                <p className="text-2xl font-bold text-white">{formatCurrency(dashboardData?.kpis?.revenue || 0)}</p>
              </div>

              <div className="group bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10 hover:border-red-500/30 hover:bg-gray-400/10 transition-all duration-300 shadow-lg">
                <div className="flex items-center justify-between mb-4">
                  <div className="bg-red-500/20 p-3 rounded-xl">
                    <TrendingDown className="w-6 h-6 text-red-400" />
                  </div>
                </div>
                <p className="text-xs text-gray-400 mb-2 uppercase tracking-widest font-semibold">Expenses</p>
                <p className="text-2xl font-bold text-white">{formatCurrency(dashboardData?.kpis?.expenses || 0)}</p>
              </div>

              <div className="group bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10 hover:border-blue-500/30 hover:bg-gray-400/10 transition-all duration-300 shadow-lg">
                <div className="flex items-center justify-between mb-4">
                  <div className="bg-blue-500/20 p-3 rounded-xl">
                    <TrendingUp className="w-6 h-6 text-blue-400" />
                  </div>
                </div>
                <p className="text-xs text-gray-400 mb-2 uppercase tracking-widest font-semibold">Net Profit</p>
                <p className="text-2xl font-bold text-white">{formatCurrency(dashboardData?.kpis?.netProfit || 0)}</p>
              </div>

              <div className="group bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10 hover:border-purple-500/30 hover:bg-gray-400/10 transition-all duration-300 shadow-lg">
                <div className="flex items-center justify-between mb-4">
                  <div className="bg-purple-500/20 p-3 rounded-xl">
                    <Wallet className="w-6 h-6 text-purple-400" />
                  </div>
                </div>
                <p className="text-xs text-gray-400 mb-2 uppercase tracking-widest font-semibold">Cash Balance</p>
                <p className="text-2xl font-bold text-white">{formatCurrency(dashboardData?.kpis?.cashBalance || 0)}</p>
              </div>
            </div>

            {/* Net Margin & Cash Runway - Side by Side */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {/* Net Margin */}
              <div className="group bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10 hover:border-[#E8E7BB]/30 hover:bg-gray-400/10 transition-all duration-300 shadow-lg">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center space-x-4">
                    <div className="bg-[#E8E7BB]/20 p-3 rounded-xl">
                      <BarChart3 className="w-6 h-6 text-[#E8E7BB]" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-400 uppercase tracking-widest font-semibold">Net Margin</p>
                      <p className="text-3xl font-bold text-white mt-1">{formatPercentage(dashboardData?.kpis?.netMargin || 0)}</p>
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <p className="text-xs text-gray-400 uppercase tracking-widest font-semibold">Performance</p>
                  <div className="h-2 flex-1 bg-white/5 rounded-full overflow-hidden border border-white/10">
                    <div 
                      className="h-full bg-gradient-to-r from-[#E8E7BB] to-green-400"
                      style={{ width: `${Math.min(Math.max((dashboardData?.kpis?.netMargin || 0), 0), 100)}%` }}
                    ></div>
                  </div>
                </div>
              </div>

              {/* Cash Runway */}
              <div className="group bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10 hover:border-purple-500/30 hover:bg-gray-400/10 transition-all duration-300 shadow-lg">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-4">
                    <div className="bg-purple-500/20 p-3 rounded-xl">
                      <Wallet className="w-6 h-6 text-purple-400" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-400 uppercase tracking-widest font-semibold">Cash Runway</p>
                      <p className="text-3xl font-bold text-white mt-1">{cashRunwayMonths ? `${cashRunwayMonths.toFixed(1)} months` : '—'}</p>
                    </div>
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-3">Based on last month's expenses</p>
              </div>
            </div>

            {/* Revenue vs Expenses Trend Chart */}
            {timeframe !== 'CUSTOM' && (
              <RevenueExpensesChart data={dashboardData?.trendData || []} loading={loadingMonthly} />
            )}

            {/* Net Profit Trend Chart */}
            {timeframe !== 'CUSTOM' && (
              <NetProfitTrendChart data={dashboardData?.trendData || []} loading={loadingMonthly} />
            )}

            {/* Expense Breakdown Chart */}
            <ExpenseBreakdownChart 
              data={dashboardData?.expenseBreakdown || []} 
              loading={loading}
              onExpenseClick={handleExpenseClick}
            />

            {/* Category Highlights Table */}
            <div className="group bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10 hover:border-purple-500/30 hover:bg-gray-400/10 transition-all duration-300 shadow-lg">
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center space-x-3">
                    <div className="bg-purple-500/20 p-3 rounded-xl">
                      <div className="w-2 h-2 bg-purple-400 rounded-full"></div>
                  </div>
                    <h3 className="text-2xl font-bold text-white tracking-wide">Category Highlights</h3>
                </div>
                <div className="flex items-center space-x-2">
                  <button 
                    onClick={() => handleExport('csv')}
                      className="flex items-center space-x-2 text-sm text-gray-400 hover:text-white hover:bg-gray-400/10 px-3 py-2 rounded-lg transition-all font-medium border border-white/5 hover:border-white/20"
                  >
                    <Download className="w-4 h-4" />
                    <span>CSV</span>
                  </button>
                  <button 
                    onClick={() => handleExport('json')}
                      className="flex items-center space-x-2 text-sm text-gray-400 hover:text-white hover:bg-gray-400/10 px-3 py-2 rounded-lg transition-all font-medium border border-white/5 hover:border-white/20"
                  >
                    <Download className="w-4 h-4" />
                    <span>JSON</span>
                  </button>
                </div>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b-2 border-white/10">
                      <th 
                        className="text-left py-4 px-4 cursor-pointer hover:bg-white/5 rounded-lg transition-colors"
                        onClick={() => handleSort('name')}
                      >
                        <div className="flex items-center space-x-2">
                          <span className="text-sm font-semibold text-gray-400 uppercase tracking-wide">Category</span>
                          <ArrowUpDown className="w-3 h-3 text-gray-500" />
                        </div>
                      </th>
                      <th 
                        className="text-right py-4 px-4 cursor-pointer hover:bg-white/5 rounded-lg transition-colors"
                        onClick={() => handleSort('value')}
                      >
                        <div className="flex items-center justify-end space-x-2">
                          <span className="text-sm font-semibold text-gray-400 uppercase tracking-wide">Amount</span>
                          <ArrowUpDown className="w-3 h-3 text-gray-500" />
                        </div>
                      </th>
                      <th 
                        className="text-right py-4 px-4 cursor-pointer hover:bg-white/5 rounded-lg transition-colors"
                        onClick={() => handleSort('percentage')}
                      >
                        <div className="flex items-center justify-end space-x-2">
                          <span className="text-sm font-semibold text-gray-400 uppercase tracking-wide">% of Total</span>
                          <ArrowUpDown className="w-3 h-3 text-gray-500" />
                        </div>
                      </th>
                      <th className="text-right py-4 px-4">
                        <span className="text-sm font-semibold text-gray-400 uppercase tracking-wide">Change</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {getSortedExpenses().map((expense: any, index: number) => (
                      <tr 
                        key={index} 
                        className="border-b border-white/5 hover:bg-white/5 transition-colors cursor-pointer"
                        onClick={() => handleExpenseClick(expense.name)}
                      >
                        <td className="py-4 px-4">
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#E8E7BB] to-[#d4d3a7] flex items-center justify-center shadow-md">
                              <span className="text-[#1D1D1D] font-bold text-sm">
                                {expense.name.substring(0, 2).toUpperCase()}
                              </span>
                            </div>
                            <span className="text-sm font-semibold text-white">
                              {expense.name}
                            </span>
                          </div>
                        </td>
                        <td className="py-4 px-4 text-right">
                          <span className="text-base font-bold text-white">
                            {formatCurrency(expense.value)}
                          </span>
                        </td>
                        <td className="py-4 px-4 text-right">
                          <span className="text-sm font-medium text-gray-400">
                            {formatPercentage(expense.percentage)}
                          </span>
                        </td>
                        <td className="py-4 px-4 text-right">
                          {(() => {
                            const { change, hasData } = getExpenseChange(expense.name);
                            if (!hasData) {
                              return (
                                <span className="text-sm text-gray-500">—</span>
                              );
                            }
                            
                            const isPositive = change > 0;
                            const isNegative = change < 0;
                            const colorClass = isPositive ? 'bg-red-500/20 text-red-400' : isNegative ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400';
                            
                            return (
                              <div className="flex items-center justify-end">
                                <span className={`inline-flex items-center space-x-1 px-3 py-1 rounded-full text-sm font-semibold ${colorClass}`}>
                                  {isPositive && <ArrowUp className="w-3 h-3" />}
                                  {isNegative && <ArrowDown className="w-3 h-3" />}
                                  <span>{isPositive ? '+' : ''}{change.toFixed(1)}%</span>
                                </span>
                              </div>
                            );
                          })()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Expense Detail Modal */}
      {selectedExpense && dashboardData?.timeframe && (
        <ExpenseDetailModal
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          expenseName={selectedExpense}
          fromDate={dashboardData.timeframe.from}
          toDate={dashboardData.timeframe.to}
        />
      )}

      {/* Financial Insights Popup */}
      {currentSession.user.accountingService && currentSession.user.enableAiFinancialInsights && (
        <FinancialInsightPopup
          insights={insights}
          loading={loadingInsights}
          isOpen={showInsightsPopup}
          onClose={() => setShowInsightsPopup(false)}
          onOpen={() => setShowInsightsPopup(true)}
        />
      )}

      {/* Announcement Popup */}
      {announcements.length > 0 && announcements[currentAnnouncementIndex] && (
        <AnnouncementPopup
          announcement={announcements[currentAnnouncementIndex]}
          onClose={handleCloseAnnouncement}
          onMarkRead={handleMarkAnnouncementRead}
        />
      )}
    </div>
  );
}
