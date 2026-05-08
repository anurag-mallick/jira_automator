import { ImapFlow } from 'imapflow';
import { simpleParser, ParsedMail } from 'mailparser';
import { prisma } from './prisma';

export interface EmailProviderConfig {
  email: string;
  emailAccountName: string;
  provider: 'GMAIL' | 'OUTLOOK' | 'YAHOO' | 'YANDEX' | 'SENDGRID' | 'CUSTOM';
  imapHost: string;
  imapPort: number;
  imapSSL: boolean;
  smtpHost: string;
  smtpPort: number;
  smtpSSL: boolean;
  smtpTls: boolean;
  username: string;
  password: string;
}

export const EMAIL_PROVIDER_CONFIGS: Record<string, Partial<EmailProviderConfig>> = {
  GMAIL: {
    provider: 'GMAIL',
    imapHost: 'imap.gmail.com',
    imapPort: 993,
    imapSSL: true,
    smtpHost: 'smtp.gmail.com',
    smtpPort: 465,
    smtpSSL: true,
    smtpTls: false,
  },
  OUTLOOK: {
    provider: 'OUTLOOK',
    imapHost: 'imap-mail.outlook.com',
    imapPort: 993,
    imapSSL: true,
    smtpHost: 'smtp-mail.outlook.com',
    smtpPort: 587,
    smtpSSL: false,
    smtpTls: true,
  },
  YAHOO: {
    provider: 'YAHOO',
    imapHost: 'imap.mail.yahoo.com',
    imapPort: 993,
    imapSSL: true,
    smtpHost: 'smtp.mail.yahoo.com',
    smtpPort: 587,
    smtpSSL: false,
    smtpTls: true,
  },
  YANDEX: {
    provider: 'YANDEX',
    imapHost: 'imap.yandex.com',
    imapPort: 993,
    imapSSL: true,
    smtpHost: 'smtp.yandex.com',
    smtpPort: 465,
    smtpSSL: true,
    smtpTls: false,
  },
};

export async function createImapClient(account: {
  imapHost: string;
  imapPort: number;
  imapSSL: boolean;
  username: string;
  password: string;
}): Promise<ImapFlow> {
  const client = new ImapFlow({
    host: account.imapHost,
    port: account.imapPort,
    secure: account.imapSSL,
    auth: {
      user: account.username,
      pass: account.password,
    },
    tls: {
      rejectUnauthorized: false
    }
  });

  return client;
}

function isAutoReply(email: ParsedMail): boolean {
  const autoSubmitHeaders = ['auto-submitted', 'auto-generated'];
  const headers = email.headers;
  
  for (const header of autoSubmitHeaders) {
    const value = headers.get(header);
    if (value && (value.toLowerCase() === 'auto-replied' || value.toLowerCase() === 'auto-generated')) {
      return true;
    }
  }

  const subject = email.subject?.toLowerCase() || '';
  if (subject.includes('autoreply') || subject.includes('auto-reply') || subject.includes('out of office') || subject.includes('away')) {
    return true;
  }

  return false;
}

function extractEmailAddress(contact: { address?: string; name?: string } | string): { address: string; name?: string } {
  if (typeof contact === 'string') {
    return { address: contact };
  }
  return {
    address: contact.address || '',
    name: contact.name
  };
}

async function findOrCreateCustomer(senderEmail: string, senderName?: string): Promise<number> {
  let customer = await prisma.customer.findUnique({
    where: { email: senderEmail.toLowerCase() }
  });

  if (!customer) {
    customer = await prisma.customer.create({
      data: {
        email: senderEmail.toLowerCase(),
        name: senderName || null
      }
    });
  }

  return customer.id;
}

async function findExistingTicketByReferences(references: string | undefined, inReplyTo: string | undefined): Promise<number | null> {
  if (!references && !inReplyTo) return null;

  const searchReferences = (references || inReplyTo || '').split(' ').map(r => r.trim().replace(/[<>]/g, ''));
  
  for (const messageId of searchReferences) {
    if (messageId) {
      const communication = await prisma.communication.findFirst({
        where: {
          messageId: messageId
        },
        select: { ticketId: true }
      });
      
      if (communication?.ticketId) {
        return communication.ticketId;
      }
    }
  }

  return null;
}

export async function pollEmailsForAccount(accountId: number) {
  const account = await prisma.emailAccount.findUnique({
    where: { id: accountId }
  });

  if (!account || !account.isActive) {
    console.log(`Email account ${accountId} not found or inactive`);
    return;
  }

  const client = await createImapClient({
    imapHost: account.imapHost || '',
    imapPort: account.imapPort,
    imapSSL: account.imapSSL,
    username: account.username,
    password: account.password
  });

  try {
    await client.connect();

    const mailbox = await client.mailboxOpen(account.appendTo || 'INBOX');
    console.log(`Polling emails for ${account.email} in ${mailbox.path}`);

    const seenUids = new Set<string>();
    const existingComms = await prisma.communication.findMany({
      where: { emailAccountId: accountId },
      select: { uid: true }
    });
    existingComms.forEach(c => {
      if (c.uid) seenUids.add(c.uid);
    });

    const query: any = account.syncType === 'ALL' ? {} : { seen: false };
    
    for await (const message of client.fetch(query, { source: true, headers: true })) {
      if (!message.source) continue;
      
      const uid = message.uid.toString();
      if (seenUids.has(uid)) continue;

      const parsed: any = await simpleParser(message.source);
      
      if (isAutoReply(parsed)) {
        console.log(`Skipping auto-reply email: ${parsed.subject}`);
        await client.messageFlagsAdd(message.uid, ['\\Seen']);
        continue;
      }

      const from = extractEmailAddress(parsed.from?.value[0] || '');
      const to = extractEmailAddress(parsed.to?.value[0] || { address: account.email });
      
      const subject = parsed.subject || 'No Subject';
      const content = parsed.text || parsed.html || '';
      const htmlContent = parsed.html || null;
      
      const messageId = parsed.messageId || `<${uid}@${account.email}>`;
      const inReplyTo = parsed.inReplyTo || undefined;
      const references = parsed.references?.join(' ') || undefined;
      const cc = parsed.cc?.value.map((c: any) => c.address).join(', ');
      const bcc = parsed.bcc?.value.map((c: any) => c.address).join(', ');

      const customerId = await findOrCreateCustomer(from.address, from.name || undefined);

      let ticketId: number | null = null;
      ticketId = await findExistingTicketByReferences(references, inReplyTo);

      if (!ticketId) {
        const ticket = await prisma.ticket.create({
          data: {
            title: `[Email] ${subject}`,
            description: content.substring(0, 5000),
            requesterName: from.name || from.address,
            requesterEmail: from.address,
            status: 'TODO',
            priority: 'P2',
            customerId,
            emailAccountId: accountId,
            viaCustomerPortal: true,
          }
        });
        ticketId = ticket.id;
      }

      await prisma.communication.create({
        data: {
          uid,
          messageId,
          inReplyTo,
          references,
          subject,
          content: content.substring(0, 65535),
          htmlContent: htmlContent?.substring(0, 65535) || null,
          sender: from.address,
          senderName: from.name || null,
          recipient: to.address,
          cc,
          bcc,
          emailAccountId: accountId,
          ticketId,
          customerId,
          direction: 'INBOUND',
          isAutoReply: false,
          isRead: true
        }
      });

      await prisma.ticket.update({
        where: { id: ticketId },
        data: {
          status: ticketId ? await shouldReopen(accountId) ? 'IN_PROGRESS' : undefined : undefined
        }
      }).catch(() => {});

      await client.messageFlagsAdd(message.uid, ['\\Seen']);
      seenUids.add(uid);
    }

    await prisma.emailAccount.update({
      where: { id: accountId },
      data: { lastSyncAt: new Date() }
    });

    await client.logout();
  } catch (err) {
    console.error(`IMAP Error for account ${accountId}:`, err);
    throw err;
  }
}

async function shouldReopen(emailAccountId: number): Promise<boolean> {
  return true;
}

export async function pollAllEmailAccounts() {
  const accounts = await prisma.emailAccount.findMany({
    where: { isActive: true }
  });

  for (const account of accounts) {
    try {
      await pollEmailsForAccount(account.id);
    } catch (err) {
      console.error(`Failed to poll account ${account.email}:`, err);
    }
  }
}

export async function testEmailAccountConnection(accountData: Partial<EmailProviderConfig>): Promise<{ success: boolean; error?: string }> {
  try {
    const client = await createImapClient({
      imapHost: accountData.imapHost || '',
      imapPort: accountData.imapPort || 993,
      imapSSL: accountData.imapSSL ?? true,
      username: accountData.username || '',
      password: accountData.password || ''
    });

    await client.connect();
    await client.logout();
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Connection failed' };
  }
}
