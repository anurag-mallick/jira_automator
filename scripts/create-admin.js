const { createClient } = require('@supabase/supabase-js');
const { PrismaClient } = require('./src/generated/prisma');

const supabaseUrl = 'https://netsgjeuzsnlchhwbqif.supabase.co';
const supabaseAnonKey = 'sb_publishable_OKG4htr-VJa65qNSXkhcNw_3AUx3ZjM';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: 'postgresql://postgres.netsgjeuzsnlchhwbqif:P%40ssw0rd_IT_Mgmt_99%21@aws-1-ap-southeast-2.pooler.supabase.com:5432/postgres'
    }
  }
});

async function run() {
  const email = 'admin@it-management.com';
  const password = 'AdminPassword123!@#';
  
  console.log('Registering user in Auth...');
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
  });
  
  if (authError) {
    console.error('Auth error:', authError);
    return;
  }
  
  console.log('User created in Auth:', authData.user?.id);
  
  console.log('Adding user to Prisma DB...');
  try {
    const user = await prisma.user.create({
      data: {
        email: email,
        username: email,
        name: 'System Admin',
        role: 'ADMIN',
        password: password, 
      }
    });
    console.log('User added to database:', user.id);
    console.log(`\nSUCCESS!\nEmail: ${email}\nPassword: ${password}\n`);
  } catch (dbError) {
    console.error('DB Error:', dbError);
  }
}

run();
