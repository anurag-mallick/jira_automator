
const SLACK_WEBHOOK_URL = process.env.SLACK_WEBHOOK_URL;

interface NotificationTicket {
  id: number;
  title: string;
  priority: string;
  status: string;
  assignedTo?: {
    name: string;
  };
}

export async function sendSlackNotification(ticket: NotificationTicket) {
  if (!SLACK_WEBHOOK_URL) {
    console.log('Slack webhook URL not configured, skipping notification.');
    return;
  }

  const priorityColor = {
    P0: '#ff0000',
    P1: '#ff8c00',
    P2: '#4b0082',
    P3: '#808080',
  }[ticket.priority as 'P0'|'P1'|'P2'|'P3'] || '#cccccc';

  const message = {
    attachments: [
      {
        fallback: `New Critical Ticket: ${ticket.title}`,
        color: priorityColor,
        pretext: "🚀 *New Ticket Triaged*",
        title: `Ticket #${ticket.id}: ${ticket.title}`,
        title_link: `${process.env.NEXT_PUBLIC_APP_URL}/tickets/${ticket.id}`,
        fields: [
          {
            title: "Priority",
            value: ticket.priority,
            short: true
          },
          {
            title: "Status",
            value: ticket.status,
            short: true
          },
          {
            title: "Assigned To",
            value: ticket.assignedTo?.name || "Unassigned",
            short: true
          }
        ],
        footer: "Horizon IT Intelligence Dashboard",
        ts: Math.floor(Date.now() / 1000)
      }
    ]
  };

  try {
    const res = await fetch(SLACK_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(message),
    });
    if (!res.ok) throw new Error(`Slack API error: ${res.statusText}`);
  } catch (err) {
    console.error('Failed to send Slack notification:', err);
  }
}
