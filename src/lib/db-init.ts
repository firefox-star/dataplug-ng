import { PrismaClient } from '@prisma/client';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

let initPromise: Promise<void> | null = null;

function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password).digest('hex');
}

const SEED_VERSION = 'v5-prices-up';

async function seedDefaults(db: PrismaClient): Promise<void> {
  const networkDefs = [
    { name: 'MTN', slug: 'mtn', color: '#FFC300', icon: '/logos/mtn.png' },
    { name: 'Airtel', slug: 'airtel', color: '#ED1C24', icon: '/logos/airtel.png' },
    { name: 'Glo', slug: 'glo', color: '#50B651', icon: '/logos/glo.png' },
    { name: '9Mobile', slug: '9mobile', color: '#006B53', icon: '/logos/9mobile.png' },
  ];

  const existingNetworks = await db.network.findMany({ select: { id: true, slug: true } });
  const existingSlugs = new Set(existingNetworks.map(n => n.slug));
  const networkMap = new Map(existingNetworks.map(n => [n.slug, n.id]));

  const newNetworks = networkDefs.filter(n => !existingSlugs.has(n.slug));
  if (newNetworks.length > 0) {
    for (const net of newNetworks) {
      await db.network.create({ data: net }).catch(() => {});
    }
    const created = await db.network.findMany({ where: { slug: { in: newNetworks.map(n => n.slug) } } });
    for (const n of created) networkMap.set(n.slug, n.id);
    console.log(`[db-init] Created ${newNetworks.length} networks`);
  }

  const planTemplates = [
    { name: '500MB', size: 0.5, validity: '7 days', sortOrder: 1 },
    { name: '1GB', size: 1, validity: '7 days', sortOrder: 2 },
    { name: '2GB', size: 2, validity: '7 days', sortOrder: 3 },
    { name: '3GB', size: 3, validity: '7 days', sortOrder: 4 },
    { name: '5GB', size: 5, validity: '7 days', sortOrder: 5 },
    { name: '10GB', size: 10, validity: '30 days', sortOrder: 6 },
  ];

  const prices: Record<string, number[]> = {
    mtn:      [120, 240, 456, 648, 1020, 3360],
    airtel:   [132, 252, 480, 684, 1080, 3600],
    glo:      [120, 234, 444, 636, 1020, 3360],
    '9mobile': [126, 246, 468, 666, 1056, 3480],
  };

  const versionSetting = await db.setting.findUnique({ where: { key: '_seed_version' } });
  const currentVersion = versionSetting?.value || '';

  if (currentVersion !== SEED_VERSION) {
    console.log(`[db-init] Seed version changed: ${currentVersion} -> ${SEED_VERSION}`);
    const validSizes = planTemplates.map(t => t.size);
    await db.dataPlan.updateMany({
      where: { size: { notIn: validSizes } },
      data: { active: false },
    });

    const allNetworks = await db.network.findMany();
    const netIdMap = new Map(allNetworks.map(n => [n.slug, n.id]));

    for (const net of networkDefs) {
      const networkId = netIdMap.get(net.slug);
      if (!networkId) continue;
      for (let i = 0; i < planTemplates.length; i++) {
        const template = planTemplates[i];
        const existing = await db.dataPlan.findFirst({
          where: { networkId, name: template.name, active: true },
        });
        if (existing) {
          await db.dataPlan.update({
            where: { id: existing.id },
            data: { price: prices[net.slug][i], validity: template.validity, sortOrder: template.sortOrder },
          }).catch(() => {});
        } else {
          await db.dataPlan.create({
            data: {
              networkId, name: template.name, size: template.size,
              price: prices[net.slug][i], validity: template.validity,
              active: true, sortOrder: template.sortOrder,
            },
          }).catch(() => {});
        }
      }
    }

    await db.setting.upsert({
      where: { key: '_seed_version' },
      update: { value: SEED_VERSION },
      create: { key: '_seed_version', value: SEED_VERSION },
    });
    console.log(`[db-init] Plans migrated to ${SEED_VERSION}`);
  } else {
    const existingPlans = await db.dataPlan.findMany({ select: { id: true } });
    if (existingPlans.length === 0) {
      const allNetworks = await db.network.findMany();
      const netIdMap = new Map(allNetworks.map(n => [n.slug, n.id]));
      for (const net of networkDefs) {
        const networkId = netIdMap.get(net.slug);
        if (!networkId) continue;
        for (let i = 0; i < planTemplates.length; i++) {
          await db.dataPlan.create({
            data: {
              networkId, name: planTemplates[i].name, size: planTemplates[i].size,
              price: prices[net.slug][i], validity: planTemplates[i].validity,
              active: true, sortOrder: planTemplates[i].sortOrder,
            },
          }).catch(() => {});
        }
      }
      console.log('[db-init] Created initial plans');
    }
  }

  const settings = [
    { key: 'site_name', value: 'DataPlug.ng' },
    { key: 'site_tagline', value: 'Your Reliable Plug for Cheap Data' },
    { key: 'bank_name', value: 'Opay Microfinance Bank' },
    { key: 'account_number', value: '8091234567' },
    { key: 'account_name', value: 'DataPlug Ventures in' },
    { key: 'whatsapp_number', value: '+234 801 234 5678' },
    { key: 'support_email', value: 'support@dataplug.ng' },
    { key: 'payment_instructions', value: 'Transfer the exact amount to the account below, then upload your payment proof. Your wallet will be credited within minutes after confirmation.' },
    { key: 'admin_password', value: hashPassword('5656') },
  ];

  for (const s of settings) {
    await db.setting.upsert({
      where: { key: s.key },
      update: {},
      create: s,
    }).catch(() => {});
  }
}

export async function initDatabase(db: PrismaClient): Promise<void> {
  if (initPromise) return initPromise;
  initPromise = (async () => {
    const dbDir = path.join(process.cwd(), 'db');
    if (!fs.existsSync(dbDir)) { try { fs.mkdirSync(dbDir, { recursive: true }); } catch {} }
    const uploadsDir = path.join(process.cwd(), 'uploads', 'payment_proofs');
    if (!fs.existsSync(uploadsDir)) { try { fs.mkdirSync(uploadsDir, { recursive: true }); } catch {} }
    try {
      await seedDefaults(db);
      console.log('[db-init] Database ready (SQLite)');
    } catch (err) {
      console.error('[db-init] Seed error:', (err as Error).message);
      initPromise = null;
    }
  })();
  return initPromise;
}
