import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const userId = req.headers.get('x-user-id');
    if (!userId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    const user = await db.user.findUnique({ where: { id: userId } });
    if (!user || !user.active) return NextResponse.json({ error: 'User not found' }, { status: 404 });
    return NextResponse.json({ userId: user.id, name: user.name, phone: user.phone, balance: user.balance });
  } catch (error) {
    return NextResponse.json({ error: 'Session check failed' }, { status: 500 });
  }
}
