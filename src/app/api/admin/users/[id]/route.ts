import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { adminAuth } from '@/lib/admin-auth';
import { z } from 'zod';

const updateSchema = z.object({
  active: z.boolean().optional(),
  balanceAdjustment: z.number().optional(),
});

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await adminAuth(req);
  if (error) return error;
  const { id } = await params;
  try {
    const body = await req.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: 'Invalid data' }, { status: 400 });
    const user = await db.user.findUnique({ where: { id } });
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });
    if (parsed.data.active !== undefined) await db.user.update({ where: { id }, data: { active: parsed.data.active } });
    if (parsed.data.balanceAdjustment !== undefined && parsed.data.balanceAdjustment !== 0) {
      await db.user.update({ where: { id }, data: { balance: { increment: parsed.data.balanceAdjustment } } });
    }
    return NextResponse.json({ message: 'User updated' });
  } catch { return NextResponse.json({ error: 'Failed to update user' }, { status: 500 }); }
}
