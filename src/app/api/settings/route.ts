import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  try {
    const settings = await db.setting.findMany();
    const settingsMap: Record<string, string> = {};
    for (const s of settings) settingsMap[s.key] = s.value;
    return NextResponse.json({
      site_name: settingsMap.site_name || 'DataPlug.ng',
      site_tagline: settingsMap.site_tagline || '',
      bank_name: settingsMap.bank_name || '',
      account_number: settingsMap.account_number || '',
      account_name: settingsMap.account_name || '',
      whatsapp_number: settingsMap.whatsapp_number || '',
      support_email: settingsMap.support_email || '',
      payment_instructions: settingsMap.payment_instructions || '',
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 });
  }
}
