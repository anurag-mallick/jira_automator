const { Client } = require('pg');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const client = new Client({
  connectionString: process.env.DATABASE_URL,
});

async function main() {
  await client.connect();
  console.log('Connected to DB');

  const email = 'admin@horizon-it.local';
  const password = 'AdminPassword123!';
  const hashedPassword = await bcrypt.hash(password, 10);

  // 1. Create Admin
  await client.query(`
    INSERT INTO "User" (username, email, password, name, role, "isActive", "createdAt", "updatedAt")
    VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
    ON CONFLICT (email) DO UPDATE SET password = $3, role = $5;
  `, ['admin', email, hashedPassword, 'System Admin', 'ADMIN', true]);
  console.log('Admin user seeded');

  // 2. Insert SLAs
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
       ON CONFLICT (priority) DO UPDATE SET "responseTimeMins" = $3;`,
      [sla.name, sla.priority, sla.responseTimeMins]
    );
  }
  console.log('SLA Policies seeded.');

  // 3. Kanban Columns
  const columns = [
    { title: 'TODO', order: 10 },
    { title: 'IN_PROGRESS', order: 20 },
    { title: 'AWAITING_USER', order: 30 },
    { title: 'RESOLVED', order: 40 },
    { title: 'CLOSED', order: 50 },
  ];

  for (const col of columns) {
    await client.query(`
      INSERT INTO "KanbanColumn" (title, "order", "createdAt", "updatedAt")
      VALUES ($1, $2, NOW(), NOW())
      ON CONFLICT (title) DO UPDATE SET "order" = $2;
    `, [col.title, col.order]);
  }
  console.log('Kanban Columns seeded.');

  await client.end();
  console.log('Success!');
}

main().catch(console.error);
