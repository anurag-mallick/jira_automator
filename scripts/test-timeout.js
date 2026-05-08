require('dotenv').config({ path: '.env.example' }); // Ignore .env
const fetch = require('node-fetch');

async function testTimeout() {
  console.log('Sending request to /api/tickets without token. Should return 401 JSON quickly...');
  const start = Date.now();
  const res = await fetch('https://it-project-mangement.vercel.app/api/tickets');
  console.log('Status:', res.status, 'Time:', Date.now() - start, 'ms');
  console.log('Body:', await res.text());
}

testTimeout();
