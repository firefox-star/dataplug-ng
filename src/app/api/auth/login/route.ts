import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import * as crypto from 'crypto';
import { z } from 'zod';

const loginSchema = z.object({
  phone: z.string().min(10).max(15),
  password: z.string().min(1).max(100),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = loginSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: 'Invalid login data' }, { status: 400 });
    const { phone, password } = parsed.data;
    const hashedPassword = crypto.createHash('sha256').update(password).digest('hex');
    const user = await db.user.findUnique({ where: { phone } });
    if (!user || user.password !== hashedPassword) return NextResponse.json({ error: 'Invalid phone or password' }, { status: 401 });
    if (!user.active) return NextResponse.json({ error: 'Account is disabled' }, { status: 403 });
    return NextResponse.json({ userId: user.id, name: user.name, balance: user.balance });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ error: 'Login failed' }, { status: 500 });
  }
}
