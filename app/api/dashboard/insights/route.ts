import { createAnthropic } from '@ai-sdk/anthropic';
import { generateText } from 'ai';
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const dashboardData = body.dashboardData;

    if (!dashboardData) {
      return NextResponse.json({ error: 'Dashboard data is required' }, { status: 400 });
    }

    // Check for existing valid insight (not expired)
    const now = new Date();
    const existingInsight = await prisma.financialInsight.findUnique({
      where: { userId: session.user.id },
    });

    // If insight exists and hasn't expired (within 7 days), return it
    if (existingInsight && existingInsight.expiresAt > now) {
      return NextResponse.json({
        insights: existingInsight.insight,
      });
    }

    // Generate new insight
    const anthropic = createAnthropic();

    // Format the financial data for the prompt
    const kpis = dashboardData.kpis || {};
    const expenseBreakdown = dashboardData.expenseBreakdown || [];
    const timeframe = dashboardData.timeframe || {};
    
    // Build a structured summary of the data
    const financialSummary = `
Financial Overview (${timeframe.from || 'N/A'} to ${timeframe.to || 'N/A'}):
- Revenue: $${(kpis.revenue || 0).toLocaleString()}
- Expenses: $${(kpis.expenses || 0).toLocaleString()}
- Net Profit: $${(kpis.netProfit || 0).toLocaleString()}
- Net Margin: ${(kpis.netMargin || 0).toFixed(1)}%
- Cash Balance: $${(kpis.cashBalance || 0).toLocaleString()}

Top Expenses:
${expenseBreakdown.slice(0, 5).map((exp: any, idx: number) => 
  `${idx + 1}. ${exp.name}: $${exp.value.toLocaleString()} (${exp.percentage.toFixed(1)}% of total)`
).join('\n')}
`;

    const prompt = `You are a financial advisor. Analyze this data and provide ONE key insight in 2-3 sentences maximum.

Prioritize: cost savings opportunities, financial health concerns, or actionable recommendations.

Be direct and specific. Skip preambles like "based on the data" - deliver the insight immediately.

Use markdown formatting for readability: **bold** for emphasis on key numbers or actions, and structure your response clearly.

Financial Data:
${financialSummary}`;

    const result = await generateText({
      model: anthropic.languageModel('claude-opus-4-5-20251101'),
      prompt: prompt,
      maxOutputTokens: 100,
    });

    const insightText = result.text;
    
    // Calculate expiration date (7 days from now)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    // Save or update insight in database
    await prisma.financialInsight.upsert({
      where: { userId: session.user.id },
      update: {
        insight: insightText,
        expiresAt: expiresAt,
      },
      create: {
        userId: session.user.id,
        insight: insightText,
        expiresAt: expiresAt,
      },
    });

    return NextResponse.json({
      insights: insightText,
    });
  } catch (error) {
    console.error('Error generating financial insights:', error);
    return NextResponse.json(
      { error: 'Failed to generate insights' },
      { status: 500 }
    );
  }
}

