import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { userAuth } from '@/lib/user-auth';
import { z } from 'zod';

const depositSchema = z.object({ amount: z.number().positive(), paymentProof: z.string().min(1) });

export async function GET(req: NextRequest) {
  const { error, user } = await userAuth(req);
  if (error) return error;
  const deposits = await db.deposit.findMany({ where: { userId: user!.id }, orderBy: { createdAt: 'desc' } });
  return NextResponse.json({ deposits });
}

export async function POST(req: NextRequest) {
  const { error, user } = await userAuth(req);
  if (error) return error;
  const body = await req.json();
  const parsed = depositSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'Invalid deposit data' }, { status: 400 });
  const { amount, paymentProof } = parsed.data;
  const deposit = await db.deposit.create({ data: { userId: user!.id, amount, paymentProof, status: 'pending' } });
  return NextResponse.json({ deposit, message: 'Deposit request submitted' });
}