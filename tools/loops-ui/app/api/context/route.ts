import { NextResponse } from 'next/server';
import fs from 'node:fs/promises';
import path from 'node:path';

const VAULT_ROOT = process.env.LOOPS_UI_VAULT_ROOT
  ? path.resolve(process.env.LOOPS_UI_VAULT_ROOT)
  : path.resolve(process.cwd(), '../..');
const WINDOW = 7; // lines before/after target

export async function GET(request: Request) {
  const url = new URL(request.url);
  const file = url.searchParams.get('file');
  const lineParam = url.searchParams.get('line');

  if (!file) {
    return NextResponse.json({ error: 'file param required' }, { status: 400 });
  }

  const abs = path.join(VAULT_ROOT, file);

  // Prevent path traversal outside the vault
  const resolved = path.resolve(abs);
  if (!resolved.startsWith(VAULT_ROOT)) {
    return NextResponse.json({ error: 'invalid path' }, { status: 400 });
  }

  try {
    const content = await fs.readFile(resolved, 'utf-8');
    const lines = content.split('\n');
    const totalLines = lines.length;
    const targetLine = lineParam ? Math.max(0, parseInt(lineParam, 10) - 1) : 0;
    const start = Math.max(0, targetLine - WINDOW);
    const end = Math.min(totalLines, targetLine + WINDOW + 1);
    const window = lines.slice(start, end);
    const relativeTarget = targetLine - start;

    return NextResponse.json({
      file,
      lines: window,
      startLine: start + 1,
      targetLineIndex: relativeTarget,
      totalLines,
      available: true,
    });
  } catch {
    return NextResponse.json({
      file,
      lines: [],
      startLine: 0,
      targetLineIndex: -1,
      totalLines: 0,
      available: false,
    });
  }
}
