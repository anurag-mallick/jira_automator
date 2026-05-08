# Performance Improvement Plan: IT Project Management

This plan outlines 10 prioritized performance optimizations for the Next.js application to resolve latency, redundant network calls, and inefficient database queries.

## User Review Required

> [!IMPORTANT]
> This plan involves changing the authentication method from `getUser()` to `getSession()` for non-admin routes. This may affect real-time security updates for user sessions but will significantly reduce network latency for authorized requests.

> [!WARNING]
> Database migrations (indexes) will be applied. Ensure a backup is taken before execution in production.

## Proposed Changes

### [API Layer]

#### [NEW] [kanban/route.ts](file:///Users/anurag.mallick/Desktop/Hacker%20Bhai/Antigravity/IT-Project-Mangement/app/src/app/api/tickets/kanban/route.ts)
*   Create a specialized endpoint for Kanban board fetching.
*   Use Prisma `select` to fetch only required fields: `id, title, status, priority, assignedTo{name}, slaBreachAt, tags`.
*   Group by `status` to reduce frontend processing.

#### [MODIFY] [[id]/route.ts](file:///Users/anurag.mallick/Desktop/Hacker%20Bhai/Antigravity/IT-Project-Mangement/app/src/app/api/tickets/%5Bid%5D/route.ts)
*   Optimize `PATCH` handler by batching DB calls using `Promise.all()`.
*   Remove redundant `comment.create` (already handled by `activityLog`).

#### [MODIFY] [users/route.ts](file:///Users/anurag.mallick/Desktop/Hacker%20Bhai/Antigravity/IT-Project-Mangement/app/src/app/api/users/route.ts)
*   Replace `force-dynamic` with `export const revalidate = 60` for caching.

#### [MODIFY] [assets/route.ts](file:///Users/anurag.mallick/Desktop/Hacker%20Bhai/Antigravity/IT-Project-Mangement/app/src/app/api/assets/route.ts)
*   Apply route caching (`revalidate = 60`).

#### [NEW] [stats/route.ts](file:///Users/anurag.mallick/Desktop/Hacker%20Bhai/Antigravity/IT-Project-Mangement/app/src/app/api/stats/route.ts)
*   Create optimized stats endpoint using `prisma.ticket.groupBy` and `DATE_TRUNC`.

---

### [Frontend Layer]

#### [MODIFY] [KanbanBoard.tsx](file:///Users/anurag.mallick/Desktop/Hacker%20Bhai/Antigravity/IT-Project-Mangement/app/src/components/KanbanBoard.tsx)
*   Update to call the new `/api/tickets/kanban` endpoint.
*   Fix realtime `UPDATE` handler to merge payloads: `{ ...existingTicket, ...payload.new }`.

#### [MODIFY] [page.tsx](file:///Users/anurag.mallick/Desktop/Hacker%20Bhai/Antigravity/IT-Project-Mangement/app/src/app/page.tsx)
*   Remove the `key` prop from `<KanbanBoard>` to prevent unnecessary remounts.
*   Implement 200ms debounce for search query.
*   Lift user and asset fetches from `TicketDetailModal` to the page level.
*   Apply dynamic imports for heavy components: `CalendarView`, `ReportsView`, `IntelligenceDashboard`.

#### [MODIFY] [TicketDetailModal.tsx](file:///Users/anurag.mallick/Desktop/Hacker%20Bhai/Antigravity/IT-Project-Mangement/app/src/components/TicketDetailModal.tsx)
*   Accept users and assets as props instead of fetching them internally.

#### [MODIFY] [IntelligenceDashboard.tsx](file:///Users/anurag.mallick/Desktop/Hacker%20Bhai/Antigravity/IT-Project-Mangement/app/src/components/IntelligenceDashboard.tsx)
*   Update to use the new `/api/stats` endpoint instead of `?all=true`.

---

### [Auth & Config]

#### [MODIFY] [auth.ts](file:///Users/anurag.mallick/Desktop/Hacker%20Bhai/Antigravity/IT-Project-Mangement/app/src/lib/auth.ts)
*   Switch `supabase.auth.getUser()` to `supabase.auth.getSession()` for non-admin routes in `withAuth`.

#### [MODIFY] [schema.prisma](file:///Users/anurag.mallick/Desktop/Hacker%20Bhai/Antigravity/IT-Project-Mangement/app/prisma/schema.prisma)
*   Add indexes: `@@index([status])`, `@@index([assignedToId])`, `@@index([priority])`, `@@index([createdAt])`.

#### [MODIFY] [next.config.ts](file:///Users/anurag.mallick/Desktop/Hacker%20Bhai/Antigravity/IT-Project-Mangement/app/next.config.ts)
*   Enable `optimizePackageImports` for `lucide-react`, `recharts`, `framer-motion`, and `date-fns`.

---

## Verification Plan

### Automated Tests
*   Run `npx prisma validate` to check schema changes.
*   Use browser tool to verify Kanban board loads correctly after removing the key prop.
*   Verify API response times for `/api/tickets/kanban` vs old `?all=true` call.

### Manual Verification
1.  Open the Kanban board and perform a search; verify no full board flicker occurs (debouncing check).
2.  Update a ticket via a separate tab and verify real-time merge works without losing UI state.
3.  Check Vercel Deployment logs to confirm caching is active (`HIT`) for users/assets endpoints.
4.  Confirm `DATABASE_URL` in Vercel settings contains `?pgbouncer=true&connection_limit=1`.
