import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { userAuth } from '@/lib/user-auth';
import { z } from 'zod';

const orderSchema = z.object({ phone: z.string().min(1), networkId: z.string().min(1), planId: z.string().min(1), amount: z.number().positive() });

export async function GET(req: NextRequest) {
  const { error, user } = await userAuth(req);
  if (error) return error;
  const orders = await db.order.findMany({ where: { userId: user!.id }, include: { network: true, plan: true }, orderBy: { createdAt: 'desc' } });
  return NextResponse.json({ orders });
}

export async function POST(req: NextRequest) {
  const { error, user } = await userAuth(req);
  if (error) return error;
  const body = await req.json();
  const parsed = orderSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'Invalid order data' }, { status: 400 });
  const { phone, networkId, planId, amount } = parsed.data;
  if (user!.balance < amount) return NextResponse.json({ error: 'Insufficient balance' }, { status: 400 });
  const plan = await db.dataPlan.findUnique({ where: { id: planId } });
  if (!plan || !plan.active) return NextResponse.json({ error: 'Plan not available' }, { status: 404 });
  const order = await db.$transaction(async (tx) => {
    const newOrder = await tx.order.create({ data: { userId: user!.id, phone, networkId, planId, amount, status: 'processing' } });
    await tx.user.update({ where: { id: user!.id }, data: { balance: { decrement: amount } } });
    return newOrder;
  });
  return NextResponse.json({ order, message: 'Order placed successfully' });
}