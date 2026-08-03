import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { userAuth } from '@/lib/user-auth';

export async function GET(req: NextRequest) {
  const { error, user } = await userAuth(req);
  if (error) return error;
  return NextResponse.json({ name: user!.name, phone: user!.phone, balance: user!.balance });
}