import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { userAuth } from '@/lib/user-auth';

export async function GET(req: NextRequest) {
  const { error, user } = await userAuth(req);
  if (error) return error;
  try {
    const fullUser = await db.user.findUnique({
      where: { id: user!.id },
      select: { referralCode: true, referralCount: true, referralReward: true, whatsappShareCount: true, referralCompleted: true, balance: true },
    });
    if (!fullUser) return NextResponse.json({ error: 'User not found' }, { status: 404 });
    const REQUIRED_SHARES = 3;
    const REWARD_AMOUNT = 3000;
    return NextResponse.json({
      referralCode: fullUser.referralCode, referralLink: 'https://ln.run/gfciL',
      whatsappShareCount: fullUser.whatsappShareCount, referralCompleted: fullUser.referralCompleted,
      requiredShares: REQUIRED_SHARES, rewardAmount: REWARD_AMOUNT,
      totalRewardEarned: fullUser.referralReward, totalReferrals: fullUser.referralCount, balance: fullUser.balance,
    });
  } catch (error) { return NextResponse.json({ error: 'Failed to fetch referral data' }, { status: 500 }); }
}

export async function POST(req: NextRequest) {
  const { error, user } = await userAuth(req);
  if (error) return error;
  try {
    const fullUser = await db.user.findUnique({ where: { id: user!.id }, select: { whatsappShareCount: true, referralCompleted: true } });
    if (!fullUser) return NextResponse.json({ error: 'User not found' }, { status: 404 });
    if (fullUser.referralCompleted) return NextResponse.json({ whatsappShareCount: fullUser.whatsappShareCount, referralCompleted: true, message: 'Already completed!' });
    const REQUIRED_SHARES = 3;
    const REWARD_AMOUNT = 3000;
    const newCount = fullUser.whatsappShareCount + 1;
    await db.user.update({ where: { id: user!.id }, data: { whatsappShareCount: newCount } });
    if (newCount >= REQUIRED_SHARES) {
      await db.user.update({ where: { id: user!.id }, data: { referralCompleted: true, balance: { increment: REWARD_AMOUNT }, referralReward: { increment: REWARD_AMOUNT } } });
      await db.notification.create({ data: { userId: user!.id, title: 'Reward Earned!', message: `You completed your WhatsApp shares! ₦${REWARD_AMOUNT.toLocaleString()} has been credited to your wallet.` } });
      return NextResponse.json({ whatsappShareCount: newCount, referralCompleted: true, rewardGranted: true, rewardAmount: REWARD_AMOUNT, message: 'Congratulations! You earned ₦3,000 wallet credit!' });
    }
    const remaining = REQUIRED_SHARES - newCount;
    return NextResponse.json({ whatsappShareCount: newCount, referralCompleted: false, remainingShares: remaining, message: `Share recorded! ${remaining} more to earn your reward.` });
  } catch (error) { return NextResponse.json({ error: 'Failed to record share' }, { status: 500 }); }
}