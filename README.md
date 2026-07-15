# ConnectAI Portal — Scheduled Calls

A TanStack Start build of the ConnectAI Portal's **Scheduled Calls** feature,
evaluating a full **TypeScript** stack as a successor to the current
**Laravel 12 + Inertia.js + React** monolith.

- **Goal:** validate the full-stack replacement path end-to-end on one feature.
- **Stack:** TanStack Start · Drizzle ORM · PostgreSQL · Better Auth.
- **Design:** mirrors the ConnectAI Portal — inset sidebar for the app, a clean
  centered logo layout for auth.

## Stack

- **TanStack Start** + TanStack Router — file-based routing, SSR, server functions
  (replacing Laravel controllers/routes)
- **Drizzle ORM** + **PostgreSQL** — replacing Eloquent + MySQL
- **Better Auth** (email/password + sessions) — replacing Fortify/Sanctum
- React 19, Tailwind CSS v4, shadcn-style UI primitives
- Bun as the package manager

## Prerequisites

- [Bun](https://bun.sh) and Docker (for local Postgres)

## Setup

```bash
cp .env.example .env      # then set a real BETTER_AUTH_SECRET
bun install
bun run db:up             # start Postgres in Docker
bun run db:migrate        # apply Drizzle migrations
bun run db:seed           # create demo user + demo data
bun run dev               # http://localhost:3000
```

Demo login (created by the seed): **demo@connectai.test** / **password123**
(prefilled on the login page).

### Scripts

| Script | What it does |
| --- | --- |
| `bun run dev` | Dev server on :3000 |
| `bun run db:up` / `db:down` | Start / stop the Postgres container |
| `bun run db:generate` | Generate a migration from schema changes |
| `bun run db:migrate` | Apply migrations |
| `bun run db:push` | Push schema directly (no migration file) |
| `bun run db:seed` | Seed demo user + data |
| `bun run db:studio` | Drizzle Studio (DB browser) |
| `bun run types` | Typecheck |

## Routes

- `/login` — sign in / sign up (Better Auth), centered logo layout
- `/` — agent list (auth-gated, scoped to the signed-in user): portal-style
  table (Name / Extension / Production / Created), search box, **New Agent**
  button, and a per-row actions menu (Edit / Delete)
- `/agents/new` — create an agent ("New Agent" header + Cancel + the shared
  agent form in create mode)
- `/api-keys` — personal access tokens: create (token shown once, copy),
  list (name / prefix / created / last used), and revoke
- `/agents/$agentId` — agent page, styled like the portal (header with
  Edit / Back / Delete, card-wrapped 8-tab form):
  - **Agent** — production toggle, name, system prompt (with placeholders
    tooltip), welcome message, ConnectWare extension, timezone, and cascading
    voice provider / model / voice — update + save
  - **ConnectWare** — domain, extension, failover extension (partial save) plus
    a reseller field with a ConnectWare "sync" (simulated)
  - **Tools** — MCP Servers and HTTP Tools sections with per-row actions:
    HTTP tools have **Copy JSON**, **Test** (typed parameter form with
    required-field validation, PATH/QUERY/BODY badges → runs the real request,
    shows status + headers + body, toast feedback), **Edit**, **Delete**;
    MCP servers have **Test Connection**,
    **Copy JSON**, **Edit**, **Delete**; plus an enable toggle — all with
    tooltips and a slide-over add/edit sheet. The HTTP tool sheet mirrors the
    portal: **Form**/**JSON** tabs, **cURL import**, parameters grouped into
    **Body / Path / Query** sections (each row: name, type incl. array/object,
    description, **Source** AI vs **Static** with a static-value editor,
    required), **headers**, **authentication** (None / AWS SigV4), and a
    **System Tool** toggle
  - **Call Logs** — paginated, read-only table (Call ID / Caller / Dialed /
    Provider / Start / Duration / Status / Topics) with search + status filter
    and a transcript sheet (AI summary, topics, conversation)
  - **Scheduled Calls** — list, create, and cancel scheduled calls
  - **Knowledge Base / Metrics / Advanced** — present for design fidelity; show
    a placeholder (not implemented)
- `/api/auth/$` — Better Auth handler (do not call directly)

Authenticated routes render inside the inset-sidebar shell (`src/routes/_app.tsx`);
`/login` renders standalone with no chrome.

## What maps to what

| ConnectAI Portal (Laravel)                          | This POC                                            |
| --------------------------------------------------- | --------------------------------------------------- |
| `App\Http\Controllers\AgentController` (index/create/store/show/update/destroy) | `src/server/agents.ts` (`getAgents` / `getAgent` / `createAgent` / `updateAgent` / `deleteAgent`) |
| `Pages/agents/index.tsx` + `agent-list.tsx`         | `src/routes/_app.index.tsx` (table, search, actions) |
| `Pages/agents/create.tsx`                           | `src/routes/_app.agents.new.tsx`                    |
| `Pages/agents/show.tsx` + `agent-form.tsx`          | `src/routes/_app.agents.$agentId.tsx` + `src/components/agents/agent-form.tsx` (shared create/edit) |
| `agent-form.tsx` ConnectWare tab                    | `src/components/agents/connectware-tab.tsx`         |
| `http-tool-table.tsx` + `mcp-server-table.tsx`      | `src/components/agents/{http-tool-table,mcp-server-table,tools-tab}.tsx` + `src/server/tools.ts` |
| `call-logs-table.tsx` + `CallLogController`         | `src/components/agents/call-logs-tab.tsx` + `src/server/call-logs.ts` (paginated) |
| `ApiKeyController` + `api-keys/index.tsx`           | `src/routes/_app.api-keys.tsx` + `src/server/api-keys.ts` |
| `routes/api.php` scheduled-call endpoints           | `src/server/scheduled-calls.ts` (server functions)  |
| `App\Http\Controllers\Api\ScheduledCallController`  | `getScheduledCalls` / `createScheduledCall` / `cancelScheduledCall` |
| `App\Http\Requests\ScheduleCallRequest`             | `.validator()` blocks in the server functions       |
| `App\Http\Resources\ScheduledCallResource`          | `toScheduledCallResource()` + `src/types/scheduled-call.ts` |
| Eloquent + MySQL `agents` / `scheduled_calls`       | `src/db/schema.ts` (Drizzle) + Postgres             |
| `User hasMany Agent` ownership scoping              | `agents.userId` FK + `requireUser()` in every fn    |
| Fortify / Sanctum auth                              | Better Auth (`src/lib/auth.ts`, `/api/auth/$`)      |
| `resources/js/components/agents/scheduled-calls-tab.tsx` | `src/routes/agents.$agentId.scheduled-calls.tsx` |

Business rules ported verbatim: newest-first ordering, `scheduled_at` must be a
future date, and only `pending`/`failed` calls can be cancelled (cancelling sets
status to `cancelled` rather than deleting). Every server function requires an
authenticated session and scopes data to the user's own agents.

## Known gaps (out of scope for the POC)

- **Background jobs** — Laravel's queue/scheduler (`DispatchScheduledCallJob`,
  cron dispatch) has no TanStack Start equivalent and needs a separate answer
  (e.g. a worker process or a hosted queue). Scheduled calls here are stored but
  not actually dispatched.
- **Email flows** — password reset / email verification are not wired up.
- **Roles/permissions** — matches the portal (ownership-based scoping only).
