export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth';
import { testEmailAccountConnection, EMAIL_PROVIDER_CONFIGS } from '@/lib/imap';

export const POST = withAuth(async (req: NextRequest, user: any) => {
  try {
    const body = await req.json();
    const { provider, imapHost, imapPort, imapSSL, username, password } = body;

    if (!username || !password) {
      return NextResponse.json({ error: 'Username and password are required' }, { status: 400 });
    }

    const providerConfig = EMAIL_PROVIDER_CONFIGS[provider] || {};
    
    const result = await testEmailAccountConnection({
      provider,
      imapHost: imapHost || providerConfig.imapHost,
      imapPort: imapPort || providerConfig.imapPort || 993,
      imapSSL: imapSSL !== undefined ? imapSSL : (providerConfig.imapSSL ?? true),
      username,
      password
    });

    if (result.success) {
      return NextResponse.json({ success: true, message: 'Connection successful' });
    } else {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 });
    }
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Test failed' }, { status: 500 });
  }
});
