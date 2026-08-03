import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { userAuth } from '@/lib/user-auth';

export async function GET(req: NextRequest) {
  const { error, user } = await userAuth(req);
  if (error) return error;
  const notifications = await db.notification.findMany({ where: { userId: user!.id }, orderBy: { createdAt: 'desc' } });
  return NextResponse.json({ notifications });
}

export async function PUT(req: NextRequest) {
  const { error, user } = await userAuth(req);
  if (error) return error;
  try {
    const body = await req.json();
    const { notificationId } = body as { notificationId: string };
    if (notificationId) {
      await db.notification.update({ where: { id: notificationId, userId: user!.id }, data: { read: true } });
    } else {
      await db.notification.updateMany({ where: { userId: user!.id, read: false }, data: { read: true } });
    }
    return NextResponse.json({ message: 'Notification updated' });
  } catch { return NextResponse.json({ error: 'Failed to update notification' }, { status: 500 }); }
}
