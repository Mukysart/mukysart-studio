import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

export const runtime = 'nodejs';

const uploadDir = path.join(process.cwd(), 'public/uploads');

function ensureDir() {
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }
}

export async function POST(req: NextRequest) {
  try {
    ensureDir();

    const formData = await req.formData();
    const file = formData.get('image') as File;

    if (!file) {
      return NextResponse.json({ message: 'No file provided' }, { status: 400 });
    }

    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ message: 'Invalid file type' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    const ext = file.name.split('.').pop();
    const filename = `${crypto.randomUUID()}.${ext}`;

    const filePath = path.join(uploadDir, filename);

    fs.writeFileSync(filePath, buffer);

    const publicUrl = `/uploads/${filename}`;

    return NextResponse.json({
      src: publicUrl,
      width: 0,
      height: 0,
    });
  } catch {
    return NextResponse.json({ message: 'Upload failed' }, { status: 500 });
  }
}