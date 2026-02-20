import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

export const runtime = 'nodejs';

const dataDir = path.join(process.cwd(), 'data/projects');

function ensureDir() {
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
}

export async function GET() {
  try {
    ensureDir();
    const files = fs.readdirSync(dataDir);

    const projects = files.map((file) => {
      const filePath = path.join(dataDir, file);
      const content = fs.readFileSync(filePath, 'utf-8');
      return JSON.parse(content);
    });

    return NextResponse.json(projects);
  } catch (error) {
    return NextResponse.json({ message: 'Failed to load projects' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    ensureDir();

    const project = await req.json();

    const id = project.id || crypto.randomUUID();
    project.id = id;

    const filePath = path.join(dataDir, `${id}.json`);

    fs.writeFileSync(filePath, JSON.stringify(project, null, 2));

    return NextResponse.json({ success: true, id });
  } catch (error) {
    return NextResponse.json({ message: 'Failed to save project' }, { status: 500 });
  }
}