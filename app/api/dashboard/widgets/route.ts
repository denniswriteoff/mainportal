import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/db';
import { authOptions } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ widgets: [] });
  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) return NextResponse.json({ widgets: [] });

  const chatId = req.nextUrl.searchParams.get('chatId') || undefined;
  // Defensive: in case Prisma client is stale during dev reload
  if (!(prisma as any).widget) return NextResponse.json({ widgets: [] });

  const widgets = await (prisma as any).widget.findMany({
    where: { userId: user.id, ...(chatId ? { conversationId: chatId } : {}) },
    orderBy: [{ y: 'asc' }, { x: 'asc' }, { createdAt: 'asc' }],
  });

  return NextResponse.json({ widgets });
}

export async function POST(req: NextRequest) {
  try {
    console.log('[widgets:POST] begin');
    const session = await getServerSession(authOptions);
    console.log('[widgets:POST] session email:', session?.user?.email);
    if (!session?.user?.email) {
      console.warn('[widgets:POST] no session email');
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }
    const user = await prisma.user.findUnique({ where: { email: session.user.email } });
    console.log('[widgets:POST] user:', user?.id);
    if (!user) {
      console.warn('[widgets:POST] user not found');
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    console.log('[widgets:POST] body keys:', Object.keys(body || {}));
    const title: string = body?.title ?? 'Untitled';
    const type: 'line' | 'bar' | 'pie' | 'gauge' | 'number' = (body?.type ?? 'line');
    const data = body?.data ?? {};
    const w = [1,2,3].includes(body?.w) ? body.w : 1;
    const h = [1,2,3].includes(body?.h) ? body.h : 1;
    const conversationId: string | undefined = body?.chatId || body?.conversationId || undefined;
    if (!conversationId) {
      console.warn('[widgets:POST] missing conversationId');
      return NextResponse.json({ error: 'missing_conversation' }, { status: 400 });
    }

    if (!(prisma as any).widget) {
      console.error('[widgets:POST] prisma.widget unavailable');
      return NextResponse.json({ error: 'unavailable' }, { status: 503 });
    }
    console.log('[widgets:POST] creating', { userId: user.id, conversationId, title, type, w, h });
    const created = await (prisma as any).widget.create({
      data: {
        title,
        type,
        data,
        w,
        h,
        userId: user.id,
        conversationId,
      },
    });
    console.log('[widgets:POST] created', { id: created?.id });
    return NextResponse.json(created, { status: 201 });
  } catch (e: any) {
    console.error('[widgets:POST] error', e);
    return NextResponse.json({ error: 'invalid_request', message: e?.message || 'Failed to create widget' }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const id = req.nextUrl.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'missing_id' }, { status: 400 });

  if ((prisma as any).widget) {
    await (prisma as any).widget.deleteMany({ where: { id, userId: user.id } });
  }
  return NextResponse.json({ ok: true });
}

// Save layout placements in bulk
export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const updates: Array<{ id: string; x: number; y: number; w: number; h: number }> = Array.isArray(body?.placements) ? body.placements : [];
  if (updates.length === 0) return NextResponse.json({ ok: true });

  // Update in a transaction
  if ((prisma as any).widget) {
    await prisma.$transaction(
      updates.map((u) =>
        (prisma as any).widget.updateMany({
          where: { id: u.id, userId: user.id },
          data: { x: u.x ?? 0, y: u.y ?? 0, w: u.w ?? 1, h: u.h ?? 1 },
        })
      )
    );
  }

  return NextResponse.json({ ok: true });
}



