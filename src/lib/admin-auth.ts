import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import * as crypto from 'crypto';

export async function adminAuth(req: NextRequest) {
  const password = req.headers.get('x-admin-password');
  if (!password) {
    return { error: NextResponse.json({ error: 'Admin password required' }, { status: 401 }), user: null };
  }
  const hashed = crypto.createHash('sha256').update(password).digest('hex');
  const setting = await db.setting.findUnique({ where: { key: 'admin_password' } });
  if (!setting || setting.value !== hashed) {
    return { error: NextResponse.json({ error: 'Invalid admin password' }, { status: 403 }), user: null };
  }
  return { error: null, user: true };
}
