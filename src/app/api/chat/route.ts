import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import ZAI from 'z-ai-web-dev-sdk';
import { db } from '@/lib/db';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

async function getZAI() {
  const configPaths = [path.join(process.cwd(), '.z-ai-config'), path.join(os.homedir(), '.z-ai-config'), '/etc/.z-ai-config'];
  for (const p of configPaths) {
    try {
      const raw = await fs.readFile(p, 'utf-8');
      const config = JSON.parse(raw);
      if (config.baseUrl && config.apiKey) return new ZAI(config);
    } catch {}
  }
  return null;
}

const chatSchema = z.object({ message: z.string().min(1).max(2000) });

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = chatSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: 'Invalid message' }, { status: 400 });
    const userMessage = parsed.data.message;
    const networks = await db.network.findMany({ where: { active: true }, include: { plans: { where: { active: true }, orderBy: { sortOrder: 'asc' } } } });
    const settings = await db.setting.findMany();
    const settingsMap: Record<string, string> = {};
    for (const s of settings) settingsMap[s.key] = s.value;
    const siteName = settingsMap.site_name || 'DataPlug.ng';
    let plansInfo = '';
    for (const net of networks) { plansInfo += `${net.name}:\n`; for (const plan of net.plans) plansInfo += `  - ${plan.name}: ₦${plan.price} (${plan.validity})\n`; }
    const systemPrompt = `You are ${siteName} AI assistant. Help users with data plans, wallet funding, and general inquiries. Be friendly and concise.\n\nCurrent pricing:\n${plansInfo}\n\nBank: ${settingsMap.bank_name || 'N/A'}\nAccount: ${settingsMap.account_number || 'N/A'}\nName: ${settingsMap.account_name || 'N/A'}\nWhatsApp: ${settingsMap.whatsapp_number || 'N/A'}`;
    const zai = await getZAI();
    if (!zai) return NextResponse.json({ error: 'AI service unavailable' }, { status: 503 });
    const response = await zai.chat.completions.create({ messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: userMessage }] });
    const reply = response.choices?.[0]?.message?.content || 'Sorry, I could not process your message.';
    return NextResponse.json({ reply });
  } catch (error) { console.error('Chat error:', error); return NextResponse.json({ error: 'Failed to process message' }, { status: 500 }); }
}