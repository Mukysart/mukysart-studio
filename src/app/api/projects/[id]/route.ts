import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export const runtime = 'nodejs';

const dataDir = path.join(process.cwd(), 'data/projects');

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const filePath = path.join(dataDir, `${params.id}.json`);

    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ message: 'Not found' }, { status: 404 });
    }

    const content = fs.readFileSync(filePath, 'utf-8');
    return NextResponse.json(JSON.parse(content));
  } catch {
    return NextResponse.json({ message: 'Failed to load project' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const filePath = path.join(dataDir, `${params.id}.json`);

    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ message: 'Failed to delete project' }, { status: 500 });
  }
}