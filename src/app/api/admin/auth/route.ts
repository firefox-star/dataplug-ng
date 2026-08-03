import { NextRequest, NextResponse } from 'next/server';
import { adminAuth } from '@/lib/admin-auth';

export async function POST(req: NextRequest) {
  const { error } = await adminAuth(req);
  if (error) return error;
  return NextResponse.json({ authenticated: true });
}
