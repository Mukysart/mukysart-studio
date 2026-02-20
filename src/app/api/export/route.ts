import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

export const runtime = 'nodejs';

const exportDir = path.join(process.cwd(), 'public/exports');

function ensureDir() {
  if (!fs.existsSync(exportDir)) {
    fs.mkdirSync(exportDir, { recursive: true });
  }
}

export async function POST(req: NextRequest) {
  try {
    ensureDir();

    const { html, name } = await req.json();

    if (!html) {
      return NextResponse.json({ message: 'No HTML provided' }, { status: 400 });
    }

    const safeName = name?.replace(/[^a-z0-9]/gi, '_').toLowerCase() || 'export';
    const filename = `${safeName}_${crypto.randomUUID()}.html`;

    const filePath = path.join(exportDir, filename);

    fs.writeFileSync(filePath, html);

    return NextResponse.json({
      url: `/exports/${filename}`,
    });
  } catch {
    return NextResponse.json({ message: 'Export failed' }, { status: 500 });
  }
}