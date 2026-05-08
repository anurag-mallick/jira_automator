import nodemailer from 'nodemailer';
import { Ticket, Communication } from '@/types';
import { prisma } from './prisma';

let transporters: Map<number, nodemailer.Transporter> = new Map();

interface EmailAccountConfig {
  id: number;
  smtpHost: string | null;
  smtpPort: number;
  smtpSSL: boolean;
  smtpTls: boolean;
  username: string;
  password: string;
}

async function getTransporter(accountId?: number) {
  if (accountId && transporters.has(accountId)) {
    return transporters.get(accountId)!;
  }

  let config: EmailAccountConfig | null = null;
  
  if (accountId) {
    config = await prisma.emailAccount.findUnique({
      where: { id: accountId },
      select: {
        id: true,
        smtpHost: true,
        smtpPort: true,
        smtpSSL: true,
        smtpTls: true,
        username: true,
        password: true
      }
    }) as EmailAccountConfig | null;
  }

  const host = config?.smtpHost || process.env.SMTP_HOST;
  const port = config?.smtpPort || parseInt(process.env.SMTP_PORT || '587');
  const secure = config?.smtpSSL ?? (process.env.SMTP_SECURE === 'true');
  const user = config?.username || process.env.SMTP_USER;
  const pass = config?.password || process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    throw new Error('SMTP configuration missing');
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: {
      user,
      pass,
    },
    tls: {
      rejectUnauthorized: false
    }
  });

  if (accountId) {
    transporters.set(accountId, transporter);
  }

  return transporter;
}

export async function getDefaultEmailAccount() {
  return prisma.emailAccount.findFirst({
    where: { isActive: true, isDefault: true }
  });
}

export async function sendEmailFromAccount(
  accountId: number,
  options: {
    to: string;
    cc?: string;
    bcc?: string;
    subject: string;
    html: string;
    inReplyTo?: string;
    references?: string;
    attachments?: Array<{ filename: string; content: Buffer; contentType: string }>;
  }
) {
  const account = await prisma.emailAccount.findUnique({
    where: { id: accountId }
  });

  if (!account) {
    throw new Error('Email account not found');
  }

  const transporter = await getTransporter(accountId);
  
  const info = await transporter.sendMail({
    from: `"${account.emailAccountName}" <${account.email}>`,
    to: options.to,
    cc: options.cc,
    bcc: options.bcc,
    subject: options.subject,
    html: options.html,
    inReplyTo: options.inReplyTo,
    references: options.references,
    attachments: options.attachments
  });

  return info;
}

function getBaseTemplate(title: string, content: string, actionUrl?: string, actionLabel?: string) {
  const primaryColor = '#2563eb';
  const bgColor = '#f8fafc';
  
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: 'Inter', system-ui, -apple-system, sans-serif; line-height: 1.6; color: #1e293b; background-color: ${bgColor}; margin: 0; padding: 0; }
          .container { max-width: 600px; margin: 40px auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1); border: 1px solid #e2e8f0; }
          .header { background: ${primaryColor}; padding: 32px; text-align: center; color: white; }
          .header h1 { margin: 0; font-size: 24px; font-weight: 700; letter-spacing: -0.025em; }
          .content { padding: 32px; }
          .footer { padding: 24px; text-align: center; font-size: 12px; color: #64748b; background: #f1f5f9; }
          .button { display: inline-block; padding: 12px 24px; background-color: ${primaryColor}; color: white; text-decoration: none; border-radius: 8px; font-weight: 600; margin-top: 24px; }
          .meta-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 20px 0; }
          .meta-item { display: flex; margin-bottom: 8px; font-size: 14px; }
          .meta-label { font-weight: 600; width: 100px; color: #64748b; }
          .badge { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 12px; font-weight: 600; border: 1px solid currentColor; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header"><h1>${title}</h1></div>
          <div class="content">
            ${content}
            ${actionUrl ? `<div style="text-align: center;"><a href="${actionUrl}" class="button">${actionLabel || 'View Details'}</a></div>` : ''}
          </div>
          <div class="footer">
            &copy; ${new Date().getFullYear()} Horizon IT Management Suite. All rights reserved.<br/>
            This is an automated notification. Please do not reply directly to this email.
          </div>
        </div>
      </body>
    </html>
  `;
}

export async function sendTicketEmail({
  type,
  ticket,
  recipient,
  password,
  comment,
  emailAccountId,
  inReplyTo,
  references,
}: {
  type: 'CREATED' | 'UPDATED' | 'ASSIGNED' | 'RESOLVED' | 'USER_CREATED' | 'NEW_COMMENT' | 'SLA_WARNING' | 'REPLY';
  ticket?: Ticket;
  recipient: { email: string; name: string };
  password?: string;
  comment?: string;
  emailAccountId?: number;
  inReplyTo?: string;
  references?: string;
}) {
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER) {
    console.warn('SMTP settings not configured. Skipping email notification.');
    return;
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const ticketUrl = ticket ? `${appUrl}/tickets/${ticket.id}` : appUrl;
  let subject = '';
  let html = '';

  switch (type) {
    case 'USER_CREATED':
      subject = `Welcome to Horizon IT Management Suite`;
      html = getBaseTemplate(
        'Account Created',
        `<p>Hello ${recipient.name},</p>
         <p>Your account has been successfully set up. You can now access the IT Management Suite using the credentials below:</p>
         <div class="meta-box">
           <div class="meta-item"><span class="meta-label">Email:</span> ${recipient.email}</div>
           <div class="meta-item"><span class="meta-label">Password:</span> <code>${password || 'Welcome@123'}</code></div>
         </div>
         <p>For security reasons, please update your password after your first login.</p>`,
        appUrl,
        'Login to Dashboard'
      );
      break;

    case 'CREATED':
      if (!ticket) return;
      subject = `[Ticket #${ticket.id}] New Ticket: ${ticket.title}`;
      html = getBaseTemplate(
        'New Ticket Created',
        `<p>A new ticket has been generated in the system:</p>
         <div class="meta-box">
           <div class="meta-item"><span class="meta-label">ID:</span> #${ticket.id}</div>
           <div class="meta-item"><span class="meta-label">Title:</span> ${ticket.title}</div>
           <div class="meta-item"><span class="meta-label">Priority:</span> ${ticket.priority}</div>
           <div class="meta-item"><span class="meta-label">Status:</span> ${ticket.status}</div>
         </div>`,
        ticketUrl
      );
      break;

    case 'ASSIGNED':
      if (!ticket) return;
      subject = `[Ticket #${ticket.id}] Assigned to You: ${ticket.title}`;
      html = getBaseTemplate(
        'Ticket Assigned',
        `<p>Hello ${recipient.name}, you have been assigned to the following ticket:</p>
         <div class="meta-box">
           <div class="meta-item"><span class="meta-label">ID:</span> #${ticket.id}</div>
           <div class="meta-item"><span class="meta-label">Title:</span> ${ticket.title}</div>
           <div class="meta-item"><span class="meta-label">Priority:</span> ${ticket.priority}</div>
         </div>`,
        ticketUrl
      );
      break;

    case 'RESOLVED':
      if (!ticket) return;
      subject = `[Ticket #${ticket.id}] Ticket Resolved: ${ticket.title}`;
      html = getBaseTemplate(
        'Ticket Resolved',
        `<p>Good news! Ticket #${ticket.id} has been marked as <strong>RESOLVED</strong>.</p>
         <div class="meta-box">
           <div class="meta-item"><span class="meta-label">Title:</span> ${ticket.title}</div>
         </div>`,
        ticketUrl
      );
      break;

    case 'UPDATED':
      if (!ticket) return;
      subject = `[Ticket #${ticket.id}] status update: ${ticket.title}`;
      html = getBaseTemplate(
        'Ticket Update',
        `<p>Ticket #${ticket.id} has been updated to <strong>${ticket.status}</strong>.</p>`,
        ticketUrl
      );
      break;

    case 'NEW_COMMENT':
      if (!ticket) return;
      subject = `[Ticket #${ticket.id}] New Comment: ${ticket.title}`;
      html = getBaseTemplate(
        'New Comment',
        `<p>A new comment has been added to ticket #${ticket.id}:</p>
         <div class="meta-box">
           <p style="font-style: italic; color: #475569;">"${comment || 'No content'}"</p>
         </div>`,
        ticketUrl
      );
      break;

    case 'SLA_WARNING':
      if (!ticket) return;
      subject = `[URGENT] SLA Warning: Ticket #${ticket.id}`;
      html = getBaseTemplate(
        'SLA Breach Warning',
        `<p style="color: #dc2626; font-weight: 600;">Attention: This ticket is approaching its SLA breach time.</p>
         <div class="meta-box">
           <div class="meta-item"><span class="meta-label">ID:</span> #${ticket.id}</div>
           <div class="meta-item"><span class="meta-label">Title:</span> ${ticket.title}</div>
           <div class="meta-item"><span class="meta-label">Priority:</span> ${ticket.priority}</div>
         </div>`,
        ticketUrl,
        'Resolve Now'
      );
      break;

    case 'REPLY':
      if (!ticket) return;
      subject = `Re: [Ticket #${ticket.id}] ${ticket.title}`;
      html = getBaseTemplate(
        'New Reply',
        `<p>Hello ${recipient.name},</p>
         <p>You have a new reply on your ticket:</p>
         <div class="meta-box">
           <div class="meta-item"><span class="meta-label">Ticket:</span> #${ticket.id}</div>
           <div class="meta-item"><span class="meta-label">Status:</span> ${ticket.status}</div>
         </div>
         ${comment ? `<div style="margin-top: 20px; padding: 16px; background: #f8fafc; border-radius: 8px;">
           <p style="margin: 0;">${comment}</p>
         </div>` : ''}`,
        ticketUrl,
        'View Reply'
      );
      break;
  }

  try {
    let info: nodemailer.SentMessageInfo;
    
    if (emailAccountId) {
      info = await sendEmailFromAccount(emailAccountId, {
        to: recipient.email,
        subject,
        html,
        inReplyTo,
        references
      });
    } else {
      info = await getTransporter().sendMail({
        from: process.env.SMTP_FROM || '"IT Support" <support@yourdomain.com>',
        to: recipient.email,
        subject,
        html,
      });
    }

    console.log('Email sent successfully:', info.messageId);
    return info;
  } catch (err) {
    console.error('Error sending email via SMTP:', err);
    throw err;
  }
}
