-- Forcefully Reset Admin User Password in Supabase Auth and Prisma DB
BEGIN;

DO $$
DECLARE
    admin_uid UUID := '5fb7e6de-4079-49ac-9858-8b65981dc3fd';
    admin_email TEXT := 'admin@it-management.com';
BEGIN
    -- 1. Upsert into auth.users (Supabase Auth)
    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = admin_email) THEN
        INSERT INTO auth.users (
            instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at
        ) VALUES (
            '00000000-0000-0000-0000-000000000000', admin_uid, 'authenticated', 'authenticated', admin_email, crypt('Quess@123', gen_salt('bf')), NOW(), '{"provider":"email","providers":["email"]}', '{"name":"System Admin"}', NOW(), NOW()
        );
        
        INSERT INTO auth.identities (
            id, user_id, identity_data, provider, created_at, updated_at
        ) VALUES (
            admin_uid, admin_uid, format('{"sub":"%s","email":"%s"}', admin_uid, admin_email)::jsonb, 'email', NOW(), NOW()
        );
    ELSE
        -- Force update the password and confirm the email if the account already exists
        UPDATE auth.users 
        SET encrypted_password = crypt('Quess@123', gen_salt('bf')), 
            email_confirmed_at = COALESCE(email_confirmed_at, NOW()) 
        WHERE email = admin_email;
    END IF;
END $$;

-- 2. Upsert into public."User" (Prisma Database)
INSERT INTO public."User" (username, password, name, role, "isActive", "createdAt", "updatedAt")
VALUES (
    'admin@it-management.com',
    crypt('Quess@123', gen_salt('bf')),
    'System Admin',
    'ADMIN',
    true,
    NOW(),
    NOW()
)
ON CONFLICT (username) DO UPDATE SET 
    password = EXCLUDED.password,
    role = EXCLUDED.role,
    "isActive" = EXCLUDED."isActive";

COMMIT;
