import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { adminAuth } from '@/lib/admin-auth';

export async function GET(req: NextRequest) {
  const { error } = await adminAuth(req);
  if (error) return error;
  const { searchParams } = new URL(req.url);
  const status = searchParams.get('status');
  const where: Record<string, string> = {};
  if (status && status !== 'all') where.status = status;
  const orders = await db.order.findMany({
    where: Object.keys(where).length > 0 ? where : undefined,
    include: { user: true, network: true, plan: true },
    orderBy: { createdAt: 'desc' },
  });
  return NextResponse.json({ orders });
}