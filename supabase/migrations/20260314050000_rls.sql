-- Enable RLS on all tables
ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Ticket" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Comment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Attachment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ActivityLog" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Task" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SLAPolicy" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Automation" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ChecklistItem" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "KanbanColumn" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Space" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Folder" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Asset" ENABLE ROW LEVEL SECURITY;

-- Create a function to check if the user is an admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (
    SELECT role = 'ADMIN'
    FROM "User"
    WHERE email = auth.jwt()->>'email'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a function to check if the user is staff
CREATE OR REPLACE FUNCTION is_staff()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (
    SELECT role = 'STAFF'
    FROM "User"
    WHERE email = auth.jwt()->>'email'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Policies for User table
CREATE POLICY "Admins can do everything on User" ON "User"
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "Users can view their own profile" ON "User"
  FOR SELECT
  USING (email = auth.jwt()->>'email');

-- Policies for Ticket table
CREATE POLICY "Admins can do everything on Ticket" ON "Ticket"
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "Staff can view all tickets" ON "Ticket"
  FOR SELECT
  USING (is_staff() OR is_admin());

CREATE POLICY "Staff can update assigned tickets" ON "Ticket"
  FOR UPDATE
  USING (
    assignedToId IN (
      SELECT id FROM "User" WHERE email = auth.jwt()->>'email'
    )
  );

-- Policies for other tables (simplified for Phase 1)
-- Most tables should be viewable by all authenticated users (Staff/Admin) 
-- and editable only by Admin or specific owners.

CREATE POLICY "Authenticated users can view most tables" ON "Comment" FOR SELECT USING (true);
CREATE POLICY "Authenticated users can view most tables" ON "Attachment" FOR SELECT USING (true);
CREATE POLICY "Authenticated users can view most tables" ON "Space" FOR SELECT USING (true);
CREATE POLICY "Authenticated users can view most tables" ON "Folder" FOR SELECT USING (true);
CREATE POLICY "Authenticated users can view most tables" ON "Asset" FOR SELECT USING (true);

-- Deny all by default for other operations
-- (Supabase default is deny if no policy matches)
