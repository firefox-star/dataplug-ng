import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function userAuth(req: NextRequest) {
  const userId = req.headers.get('x-user-id');
  if (!userId) {
    return { error: NextResponse.json({ error: 'Authentication required' }, { status: 401 }), user: null };
  }
  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user) {
    return { error: NextResponse.json({ error: 'User not found' }, { status: 404 }), user: null };
  }
  if (!user.active) {
    return { error: NextResponse.json({ error: 'Account is disabled' }, { status: 403 }), user: null };
  }
  return { error: null, user };
}
