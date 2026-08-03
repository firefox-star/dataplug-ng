import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { adminAuth } from '@/lib/admin-auth';

export async function GET(req: NextRequest) {
  const { error } = await adminAuth(req);
  if (error) return error;
  const networks = await db.network.findMany({ orderBy: { name: 'asc' } });
  return NextResponse.json({ networks });
}
