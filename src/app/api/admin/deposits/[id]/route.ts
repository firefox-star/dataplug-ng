import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { adminAuth } from '@/lib/admin-auth';
import { z } from 'zod';

const updateSchema = z.object({
  status: z.enum(['approved', 'rejected']).optional(),
  adminNotes: z.string().optional(),
  message: z.string().optional(),
});

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await adminAuth(req);
  if (error) return error;
  const { id } = await params;
  try {
    const body = await req.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: 'Invalid data' }, { status: 400 });
    const deposit = await db.deposit.findUnique({ where: { id }, include: { user: true } });
    if (!deposit) return NextResponse.json({ error: 'Deposit not found' }, { status: 404 });
    if (parsed.data.status === 'approved') {
      await db.$transaction(async (tx) => {
        await tx.deposit.update({ where: { id }, data: { status: 'approved', adminNotes: parsed.data.adminNotes || '' } });
        await tx.user.update({ where: { id: deposit.userId }, data: { balance: { increment: deposit.amount } } });
      });
      await db.notification.create({ data: { userId: deposit.userId, title: 'Deposit Approved', message: parsed.data.message || `Your deposit of ₦${deposit.amount.toLocaleString()} has been approved.` } });
    } else if (parsed.data.status === 'rejected') {
      await db.deposit.update({ where: { id }, data: { status: 'rejected', adminNotes: parsed.data.adminNotes || '' } });
      await db.notification.create({ data: { userId: deposit.userId, title: 'Deposit Rejected', message: parsed.data.message || `Your deposit of ₦${deposit.amount.toLocaleString()} was rejected.` } });
    }
    return NextResponse.json({ message: 'Deposit updated' });
  } catch { return NextResponse.json({ error: 'Failed to update deposit' }, { status: 500 }); }
}
