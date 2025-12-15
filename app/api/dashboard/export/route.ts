import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const format = searchParams.get("format") || "json";
    const timeframe = searchParams.get("timeframe") || "YEAR";
    const fromDate = searchParams.get("fromDate");
    const toDate = searchParams.get("toDate");

    // Fetch the dashboard data
    const statsUrl = new URL("/api/dashboard/stats", request.url);
    statsUrl.searchParams.set("timeframe", timeframe);
    if (fromDate) {
      statsUrl.searchParams.set("fromDate", fromDate);
    }
    if (toDate) {
      statsUrl.searchParams.set("toDate", toDate);
    }

    const response = await fetch(statsUrl, {
      headers: {
        Cookie: request.headers.get("cookie") || "",
      },
    });

    if (!response.ok) {
      throw new Error("Failed to fetch dashboard data");
    }

    const data = await response.json();

    // Generate filename based on timeframe and dates
    let filename = `financial-report-${timeframe.toLowerCase()}`;
    if (timeframe === "CUSTOM" && fromDate && toDate) {
      filename = `financial-report-${fromDate}-to-${toDate}`;
    }

    if (format === "csv") {
      // Generate CSV
      let csv = "Category,Amount,Percentage\n";
      
      if (data.expenseBreakdown && Array.isArray(data.expenseBreakdown)) {
        data.expenseBreakdown.forEach((expense: any) => {
          csv += `"${expense.name}",${expense.value},${expense.percentage}\n`;
        });
      }

      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": `attachment; filename="${filename}.csv"`,
        },
      });
    } else {
      // Return JSON
      const jsonData = JSON.stringify(data, null, 2);
      
      return new NextResponse(jsonData, {
        headers: {
          "Content-Type": "application/json",
          "Content-Disposition": `attachment; filename="${filename}.json"`,
        },
      });
    }
  } catch (error) {
    console.error("Export error:", error);
    return NextResponse.json(
      { error: "Failed to export data" },
      { status: 500 }
    );
  }
}

