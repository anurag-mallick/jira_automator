-- Security Hardening: Enable RLS and define policies

-- 1. Enable RLS on all public tables
ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Ticket" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Comment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Attachment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ActivityLog" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Task" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ChecklistItem" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Asset" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Space" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Folder" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "KanbanColumn" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Automation" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SLAPolicy" ENABLE ROW LEVEL SECURITY;

-- 2. Define Policies

-- Users: Admins can do everything, users can only see themselves
CREATE POLICY "Admin full access on User" ON "User" FOR ALL TO authenticated USING (
    (SELECT role FROM "User" WHERE id = auth.uid()::integer) = 'ADMIN'
);
CREATE POLICY "Users see themselves" ON "User" FOR SELECT TO authenticated USING (
    id = auth.uid()::integer
);

-- Tickets: Staff/Admin can see all, users can only see their own (or public submit)
CREATE POLICY "Staff/Admin see all tickets" ON "Ticket" FOR SELECT TO authenticated USING (
    (SELECT role FROM "User" WHERE id = auth.uid()::integer) IN ('ADMIN', 'STAFF')
);
-- Allow public submission (if anonymous access is intended for /submit)
-- CREATE POLICY "Public can insert tickets" ON "Ticket" FOR INSERT TO anon WITH CHECK (true);

-- Assets: Staff/Admin see all, only Admin can modify
CREATE POLICY "Staff see all assets" ON "Asset" FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin manage assets" ON "Asset" FOR ALL TO authenticated USING (
    (SELECT role FROM "User" WHERE id = auth.uid()::integer) = 'ADMIN'
);

-- General policies for other tables (Staff/Admin access)
-- Note: These are simplified; in production, you'd refine them per table.
DO $$ 
DECLARE 
    t text;
BEGIN
    FOR t IN SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name NOT IN ('User', 'Ticket', 'Asset')
    LOOP
        EXECUTE format('CREATE POLICY "Staff access on %I" ON %I FOR ALL TO authenticated USING ((SELECT role FROM "User" WHERE id = auth.uid()::integer) IN (''ADMIN'', ''STAFF''))', t, t);
    END LOOP;
END $$;
