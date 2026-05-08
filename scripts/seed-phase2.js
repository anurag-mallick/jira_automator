const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });

const client = new Client({
  connectionString: process.env.DATABASE_URL,
});

async function main() {
  await client.connect();
  console.log('Connected to DB');

  // Insert SLAs
  const slas = [
    { name: 'Critical Response', priority: 'P0', responseTimeMins: 30 },
    { name: 'High Response', priority: 'P1', responseTimeMins: 120 },
    { name: 'Normal Response', priority: 'P2', responseTimeMins: 1440 },
    { name: 'Low Response', priority: 'P3', responseTimeMins: 2880 },
  ];

  for (const sla of slas) {
    await client.query(
      `INSERT INTO "SLAPolicy" (name, priority, "responseTimeMins", "createdAt", "updatedAt") 
       VALUES ($1, $2, $3, NOW(), NOW()) 
       ON CONFLICT (priority) DO NOTHING;`,
      [sla.name, sla.priority, sla.responseTimeMins]
    );
  }
  console.log('SLA Policies seeded.');

  // Insert Default Automation
  await client.query(
    `INSERT INTO "Automation" (name, trigger, condition, action, "isActive", "createdAt", "updatedAt")
     VALUES ($1, $2, $3, $4, $5, NOW(), NOW());`,
    ['Auto-assign Critical Bugs to Admin', 'ON_TICKET_CREATED', 'priority=P0', 'ASSIGN_TO,1', true]
  );
  console.log('Automations seeded.');

  await client.end();
}

main().catch(console.error);
