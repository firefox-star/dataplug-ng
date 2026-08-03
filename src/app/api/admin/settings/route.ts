import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { adminAuth } from '@/lib/admin-auth';
import * as crypto from 'crypto';

export async function GET(req: NextRequest) {
  const { error } = await adminAuth(req);
  if (error) return error;
  const settings = await db.setting.findMany();
  const settingsMap: Record<string, string> = {};
  for (const s of settings) settingsMap[s.key] = s.value;
  return NextResponse.json(settingsMap);
}

export async function PUT(req: NextRequest) {
  const { error } = await adminAuth(req);
  if (error) return error;
  try {
    const body = await req.json();
    for (const [key, value] of Object.entries(body)) {
      if (key === 'admin_password') {
        if (!value || (value as string).trim() === '') continue;
        const hashed = crypto.createHash('sha256').update(value as string).digest('hex');
        await db.setting.upsert({ where: { key }, update: { value: hashed }, create: { key, value: hashed } });
      } else {
        await db.setting.upsert({ where: { key }, update: { value: value as string }, create: { key, value: value as string } });
      }
    }
    return NextResponse.json({ message: 'Settings saved' });
  } catch { return NextResponse.json({ error: 'Failed to save settings' }, { status: 500 }); }
}