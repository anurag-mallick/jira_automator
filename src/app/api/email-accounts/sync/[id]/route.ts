export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth';
import { pollEmailsForAccount, pollAllEmailAccounts } from '@/lib/imap';

export const POST = withAuth(async (req: NextRequest, user: any, { params }: { params: Promise<{ id: string }> }) => {
  try {
    const { id } = await params;
    
    if (id === 'all') {
      await pollAllEmailAccounts();
      return NextResponse.json({ success: true, message: 'All email accounts synced' });
    }

    await pollEmailsForAccount(parseInt(id));
    return NextResponse.json({ success: true, message: 'Email account synced' });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Sync failed' }, { status: 500 });
  }
});
