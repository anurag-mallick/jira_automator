const { Client } = require('pg');
const client = new Client({
  host: 'aws-1-ap-southeast-2.pooler.supabase.com',
  port: 6543,
  user: 'postgres.netsgjeuzsnlchhwbqif',
  password: 'Charizard903@',
  database: 'postgres',
  ssl: { rejectUnauthorized: false }
});

client.connect()
  .then(() => {
    console.log('Connected successfully!');
    return client.query('SELECT 1');
  })
  .then(res => {
    console.log(res.rows);
    client.end();
  })
  .catch(err => {
    console.error('Connection error', err.message);
    client.end();
  });
