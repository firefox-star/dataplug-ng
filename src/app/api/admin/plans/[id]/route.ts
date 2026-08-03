import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { adminAuth } from '@/lib/admin-auth';
import { z } from 'zod';

const updateSchema = z.object({
  name: z.string().optional(), size: z.number().positive().optional(),
  price: z.number().positive().optional(), validity: z.string().optional(),
  active: z.boolean().optional(), sortOrder: z.number().optional(), networkId: z.string().optional(),
});

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await adminAuth(req);
  if (error) return error;
  const { id } = await params;
  try {
    const body = await req.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: 'Invalid data' }, { status: 400 });
    const plan = await db.dataPlan.findUnique({ where: { id } });
    if (!plan) return NextResponse.json({ error: 'Plan not found' }, { status: 404 });
    await db.dataPlan.update({ where: { id }, data: parsed.data });
    return NextResponse.json({ message: 'Plan updated' });
  } catch { return NextResponse.json({ error: 'Failed to update plan' }, { status: 500 }); }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await adminAuth(req);
  if (error) return error;
  const { id } = await params;
  try {
    const plan = await db.dataPlan.findUnique({ where: { id } });
    if (!plan) return NextResponse.json({ error: 'Plan not found' }, { status: 404 });
    await db.dataPlan.delete({ where: { id } });
    return NextResponse.json({ message: 'Plan deleted' });
  } catch { return NextResponse.json({ error: 'Failed to delete plan' }, { status: 500 }); }
}