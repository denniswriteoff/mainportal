import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/db';
import { authOptions } from '@/lib/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
  });

  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  const conversation = await prisma.conversation.findFirst({
    where: {
      id: params.id,
      userId: user.id,
    },
  });

  if (!conversation) {
    return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
  }

  const messages = await prisma.message.findMany({
    where: { conversationId: params.id },
    orderBy: { createdAt: 'asc' },
  });

  // Prefer full json blob if present, otherwise reconstruct
  const formattedMessages = messages.map((msg: any) => (
    msg.json ?? {
      id: msg.id,
      role: msg.role,
      content: msg.content,
      parts: msg.parts,
    }
  ));

  return NextResponse.json(formattedMessages);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
  });

  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  const conversation = await prisma.conversation.findFirst({
    where: {
      id: params.id,
      userId: user.id,
    },
  });

  if (!conversation) {
    return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
  }

  const { messages } = await request.json();

  // Delete existing messages and create new ones
  await prisma.message.deleteMany({
    where: { conversationId: params.id },
  });

  if (messages && messages.length > 0) {
    await prisma.message.createMany({
      data: messages.map((msg: any) => ({
        conversationId: params.id,
        role: msg.role,
        content: msg.content || null,
        parts: msg.parts || null,
        json: msg,
      })),
    });
  }

  // Update conversation timestamp
  await prisma.conversation.update({
    where: { id: params.id },
    data: { updatedAt: new Date() },
  });

  return NextResponse.json({ success: true });
}



