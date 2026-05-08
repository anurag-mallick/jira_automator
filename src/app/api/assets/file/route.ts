import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth';
import { readFile } from 'fs/promises';
import path from 'path';

export const GET = withAuth(async (req: NextRequest) => {
  try {
    const filePath = req.nextUrl.searchParams.get('path');
    if (!filePath) return NextResponse.json({ error: 'No path' }, { status: 400 });

    // Prevent path traversal
    const safePath = path.normalize(filePath).replace(/^(\.\.(\/|\\|$))+/, '');
    const uploadsDir = path.join(process.cwd(), 'uploads');
    const fullPath = path.join(uploadsDir, safePath);

    if (!fullPath.startsWith(uploadsDir + path.sep)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const buffer = await readFile(fullPath);
    const ext = path.extname(fullPath).toLowerCase();
    const mimeTypes: Record<string, string> = {
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.gif': 'image/gif',
      '.pdf': 'application/pdf',
      '.txt': 'text/plain',
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      '.csv': 'text/csv',
      '.json': 'application/json'
    };
    const contentType = mimeTypes[ext] || 'application/octet-stream';

    return new NextResponse(buffer, {
      headers: { 'Content-Type': contentType }
    });
  } catch {
    return NextResponse.json({ error: 'File not found' }, { status: 404 });
  }
});
