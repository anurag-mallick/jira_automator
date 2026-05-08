export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withAuth } from '@/lib/auth';
import { testEmailAccountConnection, pollEmailsForAccount } from '@/lib/imap';

export const GET = withAuth(async (req: NextRequest, user: any, { params }: { params: Promise<{ id: string }> }) => {
  try {
    const { id } = await params;
    const account = await prisma.emailAccount.findUnique({
      where: { id: parseInt(id) }
    });

    if (!account) {
      return NextResponse.json({ error: 'Email account not found' }, { status: 404 });
    }

    const { password, ...safeAccount } = account;
    return NextResponse.json(safeAccount);
  } catch (err) {
    return NextResponse.json({ error: 'Failed to fetch email account' }, { status: 500 });
  }
});

export const PUT = withAuth(async (req: NextRequest, user: any, { params }: { params: Promise<{ id: string }> }) => {
  try {
    const { id } = await params;
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
      enableInboxing,
      isActive
    } = body;

    const existingAccount = await prisma.emailAccount.findUnique({
      where: { id: parseInt(id) }
    });

    if (!existingAccount) {
      return NextResponse.json({ error: 'Email account not found' }, { status: 404 });
    }

    const updateData: any = {};
    if (email !== undefined) updateData.email = email;
    if (emailAccountName !== undefined) updateData.emailAccountName = emailAccountName;
    if (provider !== undefined) updateData.provider = provider;
    if (imapHost !== undefined) updateData.imapHost = imapHost;
    if (imapPort !== undefined) updateData.imapPort = imapPort;
    if (imapSSL !== undefined) updateData.imapSSL = imapSSL;
    if (smtpHost !== undefined) updateData.smtpHost = smtpHost;
    if (smtpPort !== undefined) updateData.smtpPort = smtpPort;
    if (smtpSSL !== undefined) updateData.smtpSSL = smtpSSL;
    if (smtpTls !== undefined) updateData.smtpTls = smtpTls;
    if (username !== undefined) updateData.username = username;
    if (password) updateData.password = password;
    if (appendTo !== undefined) updateData.appendTo = appendTo;
    if (isDefault !== undefined) updateData.isDefault = isDefault;
    if (syncType !== undefined) updateData.syncType = syncType;
    if (initialSyncCount !== undefined) updateData.initialSyncCount = initialSyncCount;
    if (autoResponse !== undefined) updateData.autoResponse = autoResponse;
    if (enableInboxing !== undefined) updateData.enableInboxing = enableInboxing;
    if (isActive !== undefined) updateData.isActive = isActive;

    const account = await prisma.emailAccount.update({
      where: { id: parseInt(id) },
      data: updateData
    });

    if (account.isDefault) {
      await prisma.emailAccount.updateMany({
        where: { id: { not: account.id }, isDefault: true },
        data: { isDefault: false }
      });
    }

    const { password: _, ...safeAccount } = account;
    return NextResponse.json(safeAccount);
  } catch (err: any) {
    return NextResponse.json({ error: 'Failed to update email account' }, { status: 500 });
  }
});

export const DELETE = withAuth(async (req: NextRequest, user: any, { params }: { params: Promise<{ id: string }> }) => {
  try {
    const { id } = await params;
    await prisma.emailAccount.delete({
      where: { id: parseInt(id) }
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: 'Failed to delete email account' }, { status: 500 });
  }
});
