import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { adminAuth } from '@/lib/admin-auth';
import { z } from 'zod';

export async function GET(req: NextRequest) {
  const { error } = await adminAuth(req);
  if (error) return error;
  const plans = await db.dataPlan.findMany({ include: { network: true }, orderBy: [{ networkId: 'asc' }, { sortOrder: 'asc' }] });
  return NextResponse.json({ plans });
}

const createSchema = z.object({
  networkId: z.string().min(1), name: z.string().min(1), size: z.number().positive(),
  price: z.number().positive(), validity: z.string().min(1),
  active: z.boolean().optional(), sortOrder: z.number().optional(),
});

export async function POST(req: NextRequest) {
  const { error } = await adminAuth(req);
  if (error) return error;
  try {
    const body = await req.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: 'Invalid plan data' }, { status: 400 });
    const network = await db.network.findUnique({ where: { id: parsed.data.networkId } });
    if (!network) return NextResponse.json({ error: 'Network not found' }, { status: 404 });
    const maxSort = await db.dataPlan.aggregate({ where: { networkId: parsed.data.networkId }, _max: { sortOrder: true } });
    const sortOrder = parsed.data.sortOrder ?? (maxSort._max.sortOrder ?? 0) + 1;
    const plan = await db.dataPlan.create({ data: { ...parsed.data, sortOrder } });
    return NextResponse.json({ plan, message: 'Plan created successfully' });
  } catch (err) { return NextResponse.json({ error: 'Failed to create plan' }, { status: 500 }); }
}