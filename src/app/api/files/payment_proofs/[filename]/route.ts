import { NextRequest, NextResponse } from 'next/server';
import { readFile, stat } from 'fs/promises';
import path from 'path';

export async function GET(req: NextRequest, { params }: { params: Promise<{ filename: string }> }) {
  try {
    const { filename } = await params;
    if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      return NextResponse.json({ error: 'Invalid filename' }, { status: 400 });
    }
    const filePath = path.join(process.cwd(), 'uploads', 'payment_proofs', filename);
    try { await stat(filePath); } catch { return NextResponse.json({ error: 'File not found' }, { status: 404 }); }
    const buffer = await readFile(filePath);
    const ext = filename.toLowerCase().split('.').pop();
    const contentTypes: Record<string, string> = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp' };
    const contentType = contentTypes[ext || ''] || 'application/octet-stream';
    return new NextResponse(buffer, {
      headers: { 'Content-Type': contentType, 'Cache-Control': 'public, max-age=31536000, immutable', 'Content-Length': String(buffer.length) },
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to serve file' }, { status: 500 });
  }
}
