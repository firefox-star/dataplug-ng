import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import * as crypto from 'crypto';
import { z } from 'zod';

const registerSchema = z.object({
  name: z.string().min(2).max(100),
  phone: z.string().min(10).max(15),
  password: z.string().min(6).max(100),
  referralCode: z.string().optional(),
});

function generateReferralCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 8; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = registerSchema.safeParse(body);
    if (!parsed.success) {
      const errors = parsed.error.issues.map(i => i.message).join(', ');
      return NextResponse.json({ error: `Invalid registration data: ${errors}` }, { status: 400 });
    }
    const { name, phone, password, referralCode } = parsed.data;
    const existing = await db.user.findUnique({ where: { phone } });
    if (existing) return NextResponse.json({ error: 'Phone number already registered' }, { status: 409 });
    const hashedPassword = crypto.createHash('sha256').update(password).digest('hex');
    const newReferralCode = generateReferralCode();
    let referrerId = '';
    if (referralCode) {
      const referrer = await db.user.findUnique({ where: { referralCode } });
      if (referrer) referrerId = referrer.id;
    }
    const user = await db.user.create({
      data: { name, phone, password: hashedPassword, referralCode: newReferralCode, referredBy: referrerId },
    });
    if (referrerId) {
      await db.referral.create({ data: { referrerId, referredId: user.id, rewardGranted: false } });
      await db.user.update({ where: { id: referrerId }, data: { referralCount: { increment: 1 } } });
      const updatedReferrer = await db.user.findUnique({ where: { id: referrerId } });
      if (updatedReferrer && updatedReferrer.referralCount >= 10 && updatedReferrer.referralCount % 10 === 0) {
        await db.user.update({ where: { id: referrerId }, data: { balance: { increment: 3000 }, referralReward: { increment: 3000 } } });
        await db.referral.updateMany({ where: { referrerId, rewardGranted: false }, data: { rewardGranted: true } });
        await db.notification.create({
          data: { userId: referrerId, title: 'Referral Reward!', message: `You have referred ${updatedReferrer.referralCount} friends! You have earned ₦3,000 in wallet credit.` },
        });
      }
    }
    return NextResponse.json({ userId: user.id, referralCode: newReferralCode, message: 'Registration successful' });
  } catch (error) {
    console.error('Register error:', error);
    return NextResponse.json({ error: 'Registration failed' }, { status: 500 });
  }
}
