import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { adminAuth } from '@/lib/admin-auth';

export async function GET(req: NextRequest) {
  const { error } = await adminAuth(req);
  if (error) return error;
  const [users, pendingDeposits, orders, deposits] = await Promise.all([
    db.user.count(),
    db.deposit.count({ where: { status: 'pending' } }),
    db.order.count(),
    db.deposit.aggregate({ where: { status: 'approved' }, _sum: { amount: true } }),
  ]);
  return NextResponse.json({ totalUsers: users, pendingDeposits, totalOrders: orders, totalRevenue: deposits._sum.amount || 0 });
}
