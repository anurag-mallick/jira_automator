export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withAuth } from '@/lib/auth';
import { testEmailAccountConnection, EMAIL_PROVIDER_CONFIGS } from '@/lib/imap';

export const GET = withAuth(async (req: NextRequest, user: any) => {
  try {
    const accounts = await prisma.emailAccount.findMany({
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
      select: {
        id: true,
        email: true,
        emailAccountName: true,
        provider: true,
        imapHost: true,
        imapPort: true,
        imapSSL: true,
        smtpHost: true,
        smtpPort: true,
        smtpSSL: true,
        smtpTls: true,
        isActive: true,
        isDefault: true,
        syncType: true,
        initialSyncCount: true,
        lastSyncAt: true,
        autoResponse: true,
        enableInboxing: true,
        createdAt: true,
        updatedAt: true
      }
    });

    return NextResponse.json({ accounts });
  } catch (err) {
    return NextResponse.json({ error: 'Failed to fetch email accounts' }, { status: 500 });
  }
});

export const POST = withAuth(async (req: NextRequest, user: any) => {
  try {
    const body = await req.json();
    const {
      email,
      emailAccountName,
      provider,
      imapHost,
      imapPort,
      imapSSL,
      smtpHost,
      smtpPort,
      smtpSSL,
      smtpTls,
      username,
      password,
      appendTo,
      isDefault,
      syncType,
      initialSyncCount,
      autoResponse,
      enableInboxing
    } = body;

    if (!email || !username || !password) {
      return NextResponse.json({ error: 'Email, username, and password are required' }, { status: 400 });
    }

    const providerConfig = EMAIL_PROVIDER_CONFIGS[provider] || {};
    
    const account = await prisma.emailAccount.create({
      data: {
        email,
        emailAccountName: emailAccountName || email,
        provider: provider || 'CUSTOM',
        imapHost: imapHost || providerConfig.imapHost,
        imapPort: imapPort || providerConfig.imapPort || 993,
        imapSSL: imapSSL !== undefined ? imapSSL : (providerConfig.imapSSL ?? true),
        smtpHost: smtpHost || providerConfig.smtpHost,
        smtpPort: smtpPort || providerConfig.smtpPort || 587,
        smtpSSL: smtpSSL !== undefined ? smtpSSL : (providerConfig.smtpSSL ?? false),
        smtpTls: smtpTls !== undefined ? smtpTls : (providerConfig.smtpTls ?? true),
        username,
        password,
        appendTo: appendTo || 'INBOX',
        isDefault: isDefault || false,
        syncType: syncType || 'UNSEEN',
        initialSyncCount: initialSyncCount || 100,
        autoResponse: autoResponse !== false,
        enableInboxing: enableInboxing !== false
      }
    });

    if (account.isDefault) {
      await prisma.emailAccount.updateMany({
        where: { id: { not: account.id }, isDefault: true },
        data: { isDefault: false }
      });
    }

    return NextResponse.json(account);
  } catch (err: any) {
    if (err.code === 'P2002') {
      return NextResponse.json({ error: 'Email account with this email already exists' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to create email account' }, { status: 500 });
  }
});
