import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { adminAuth } from '@/lib/admin-auth';
import { z } from 'zod';

const updateSchema = z.object({
  status: z.enum(['processing', 'delivered', 'failed']).optional(),
  notes: z.string().optional(),
});

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await adminAuth(req);
  if (error) return error;
  const { id } = await params;
  try {
    const body = await req.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: 'Invalid data' }, { status: 400 });
    const order = await db.order.findUnique({ where: { id } });
    if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    const updateData: Record<string, string> = {};
    if (parsed.data.status) updateData.status = parsed.data.status;
    if (parsed.data.notes !== undefined) updateData.notes = parsed.data.notes;
    await db.order.update({ where: { id }, data: updateData });
    return NextResponse.json({ message: 'Order updated' });
  } catch { return NextResponse.json({ error: 'Failed to update order' }, { status: 500 }); }
}