import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { adminAuth } from '@/lib/admin-auth';

export async function GET(req: NextRequest) {
  const { error } = await adminAuth(req);
  if (error) return error;
  const users = await db.user.findMany({ orderBy: { createdAt: 'desc' } });
  return NextResponse.json({ users });
}
