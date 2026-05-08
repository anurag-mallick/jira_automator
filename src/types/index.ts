export type Priority = 'P0' | 'P1' | 'P2' | 'P3';

export interface ChecklistItem {
  id: number;
  title: string;
  isCompleted: boolean;
  ticketId: number;
  createdAt: string;
  updatedAt: string;
}

export type TicketStatus = 'TODO' | 'IN_PROGRESS' | 'AWAITING_USER' | 'RESOLVED' | 'CLOSED';
export type UserRole = 'ADMIN' | 'STAFF' | 'USER';

export interface User {
  id: number;
  username: string;
  email: string;
  name: string | null;
  role: UserRole;
  isActive: boolean;
}

export interface Comment {
  id: number;
  content: string;
  createdAt: string;
  authorId: number;
  ticketId: number;
  author: {
    username: string;
    name: string;
  };
  authorName?: string;
}

export interface Task {
  id: number;
  title: string;
  description: string;
  status: string;
  ticketId: number;
  createdAt: string;
  updatedAt: string;
}

export interface Asset {
  id: number;
  name: string;
  type: string;
  status: string;
  description: string | null;
  serialNumber: string | null;
  manufacturer: string | null;
  model: string | null;
  location: string | null;
  purchaseDate: string | null;
  warrantyExpiry: string | null;
  purchaseCost: number | null;
  specs: any | null;
  assignedTo?: {
    id: number;
    username: string;
    name: string | null;
  } | null;
  assignedToId?: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface Ticket {
  id: number;
  title: string;
  description: string;
  status: TicketStatus;
  priority: Priority;
  requesterName: string | null;
  requesterEmail?: string | null;
  assignedToId?: number | null;
  assignedTo?: {
    id: number;
    username: string;
    name: string | null;
  } | null;
  comments?: Comment[];
  tasks?: Task[];
  tags?: string[];
  checklists?: ChecklistItem[];
  assetId?: number | null;
  asset?: Asset;
  authorName?: string | null;
  createdAt: string | Date;
  updatedAt: string | Date;
  dueDate?: string | Date | null;
  slaBreachAt?: string | Date | null;
  responseBy?: string | Date | null;
  resolutionBy?: string | Date | null;
  firstResponseAt?: string | Date | null;
  teamId?: number | null;
  team?: Team | null;
  customerId?: number | null;
  customer?: Customer | null;
  emailAccountId?: number | null;
  viaCustomerPortal?: boolean;
  ticketType?: string;
  resolution?: string;
  feedbackRating?: number;
  feedbackComment?: string;
  _count?: {
    comments: number;
    checklists: number;
    communications?: number;
  };
  communications?: Communication[];
}

export interface Team {
  id: number;
  name: string;
  description: string | null;
  isActive: boolean;
  roundRobin: boolean;
  agents?: User[];
  createdAt: string | Date;
  updatedAt: string | Date;
}

export interface Customer {
  id: number;
  email: string;
  name: string | null;
  phone: string | null;
  company: string | null;
  isBlocked: boolean;
  createdAt: string | Date;
  updatedAt: string | Date;
}

export type EmailProvider = 'GMAIL' | 'OUTLOOK' | 'YAHOO' | 'YANDEX' | 'SENDGRID' | 'CUSTOM';

export interface EmailAccount {
  id: number;
  email: string;
  emailAccountName: string;
  provider: EmailProvider;
  imapHost: string | null;
  imapPort: number;
  imapSSL: boolean;
  smtpHost: string | null;
  smtpPort: number;
  smtpSSL: boolean;
  smtpTls: boolean;
  isActive: boolean;
  isDefault: boolean;
  syncType: string;
  initialSyncCount: number;
  lastSyncAt: string | Date | null;
  autoResponse: boolean;
  enableInboxing: boolean;
  createdAt: string | Date;
  updatedAt: string | Date;
}

export interface Communication {
  id: number;
  uid: string | null;
  messageId: string | null;
  inReplyTo: string | null;
  references: string | null;
  subject: string;
  content: string;
  htmlContent: string | null;
  sender: string;
  senderName: string | null;
  recipient: string;
  cc: string | null;
  bcc: string | null;
  emailAccountId: number | null;
  ticketId: number | null;
  customerId: number | null;
  direction: 'INBOUND' | 'OUTBOUND';
  isAutoReply: boolean;
  isRead: boolean;
  createdAt: string | Date;
  attachments?: EmailAttachment[];
}

export interface EmailAttachment {
  id: number;
  fileName: string;
  contentType: string;
  size: number;
  cid: string | null;
  communicationId: number;
  createdAt: string | Date;
}

export interface SavedReply {
  id: number;
  title: string;
  content: string;
  isPublic: boolean;
  teamId: number | null;
  createdById: number | null;
  createdAt: string | Date;
  updatedAt: string | Date;
}

export interface EmailTemplate {
  id: number;
  name: string;
  subject: string;
  content: string;
  type: string;
  isActive: boolean;
  createdAt: string | Date;
  updatedAt: string | Date;
}
