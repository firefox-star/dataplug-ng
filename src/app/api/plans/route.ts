import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  try {
    const networks = await db.network.findMany({
      where: { active: true },
      include: { plans: { where: { active: true }, orderBy: { sortOrder: 'asc' } } },
      orderBy: { name: 'asc' },
    });
    return NextResponse.json({ networks });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch plans' }, { status: 500 });
  }
}
