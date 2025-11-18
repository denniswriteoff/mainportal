import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { getXeroBankSummary, extractCashMovements, delay } from "@/lib/xero-api";

// Helper function to generate cash flow trend
async function generateCashFlowTrend(userId: string): Promise<any[]> {
  const today = new Date();
  const monthNames = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
  
  // Calculate the last 6 months dynamically
  const monthData: Array<{ month: string; fromDate: Date; toDate: Date }> = [];
  for (let i = 5; i >= 0; i--) {
    const monthStart = new Date(today.getFullYear(), today.getMonth() - i, 1);
    const monthEnd = new Date(today.getFullYear(), today.getMonth() - i + 1, 0);
    const monthName = monthNames[monthStart.getMonth()];
    monthData.push({ month: monthName, fromDate: monthStart, toDate: monthEnd });
  }
  
  // Fetch Bank Summary for each month individually (sequentially)
  // Add delays between requests to avoid hitting rate limits (60 calls/minute = ~1s between calls)
  const results = [];
  for (let i = 0; i < monthData.length; i++) {
    const { month, fromDate, toDate } = monthData[i];
    
    // Add delay before each request (except the first one)
    if (i > 0) {
      await delay(1200); // 1.2 seconds between requests to stay well within 60/min limit
    }
    
    try {
      const bankSummary = await getXeroBankSummary(userId, {
        fromDate: fromDate.toISOString().split("T")[0],
        toDate: toDate.toISOString().split("T")[0],
      });
      
      if (bankSummary) {
        const { cashIn, cashOut } = extractCashMovements(bankSummary);
        
        results.push({
          month,
          cashIn: Math.round(cashIn),
          cashOut: Math.round(cashOut),
        });
      } else {
        // Fallback to zero if data not available
        results.push({
          month,
          cashIn: 0,
          cashOut: 0,
        });
      }
    } catch (error) {
      console.error(`Error fetching Bank Summary for ${month}:`, error);
      results.push({
        month,
        cashIn: 0,
        cashOut: 0,
      });
    }
  }

  return results;
}

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const accountingService = session.user.accountingService;

    if (!accountingService || accountingService !== "XERO") {
      return NextResponse.json({
        data: [],
      });
    }

    const cashFlowData = await generateCashFlowTrend(session.user.id);

    return NextResponse.json({
      data: cashFlowData,
    });
  } catch (error) {
    console.error("Cash flow chart error:", error);
    return NextResponse.json(
      { error: "Failed to fetch cash flow data" },
      { status: 500 }
    );
  }
}

