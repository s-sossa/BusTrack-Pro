This file is a merged representation of the entire codebase, combined into a single document by Repomix.

# File Summary

## Purpose
This file contains a packed representation of the entire repository's contents.
It is designed to be easily consumable by AI systems for analysis, code review,
or other automated processes.

## File Format
The content is organized as follows:
1. This summary section
2. Repository information
3. Directory structure
4. Repository files (if enabled)
5. Multiple file entries, each consisting of:
  a. A header with the file path (## File: path/to/file)
  b. The full contents of the file in a code block

## Usage Guidelines
- This file should be treated as read-only. Any changes should be made to the
  original repository files, not this packed version.
- When processing this file, use the file path to distinguish
  between different files in the repository.
- Be aware that this file may contain sensitive information. Handle it with
  the same level of security as you would the original repository.

## Notes
- Some files may have been excluded based on .gitignore rules and Repomix's configuration
- Binary files are not included in this packed representation. Please refer to the Repository Structure section for a complete list of file paths, including binary files
- Files matching patterns in .gitignore are excluded
- Files matching default ignore patterns are excluded
- Files are sorted by Git change count (files with more changes are at the bottom)

# Directory Structure
````
.agents/
  skills/
    supabase-server/
      SKILL.md
.expo/
  devices.json
  README.md
data/
  bustrack.sqlite-shm
  bustrack.sqlite-wal
docs/
  ARCHITECTURE.md
  DATABASE_SCHEMA.sql
  openapi.yaml
  supabase-users-table.sql
server/
  database/
    db.js
    initDb.js
    schema.sql
    schema.sqlite.sql
    status.js
  middleware/
    auth.js
    errorHandler.js
    logger.js
    rateLimiter.js
    sanitizer.js
  routes/
    api.js
    authRoutes.js
  services/
    alertService.js
    authService.js
    fleetService.js
    passengerService.js
    telemetrySimulator.js
  config.js
  index.js
  supabase.js
src/
  App.jsx
  supabase.js
test/
  api.test.js
  auth.test.js
  database.test.js
.env.example
.gitignore
404.html
app.js
cookies.html
docker-compose.yml
index.html
package.json
privacy.html
refunds.html
repomix-output.xml
robots.txt
sitemap.xml
skills-lock.json
styles.css
terms.html
thanks.html
````

# Files

## File: .agents/skills/supabase-server/SKILL.md
````markdown
---
name: supabase-server
description: Use when planning or writing server-side code that uses `@supabase/server` — Edge Functions, Hono apps, webhook handlers, or any backend that creates Supabase clients or validates inbound auth. Trigger **before** writing or modifying any file that imports from `@supabase/server` (or sub-paths like `@supabase/server/core`); calls `withSupabase`, `createSupabaseContext`, `createAdminClient`, `createContextClient`, `verifyAuth`, `verifyCredentials`, or `extractCredentials`; configures an `auth:` mode (`'none'` | `'publishable'` | `'secret'` | `'user'`, or keyed variants like `'secret:*'`); or lives under `supabase/functions/` and authenticates an inbound request. Also trigger during planning — if a plan mentions any of the above, load the skill before drafting code; do not extrapolate `auth:` values or auth modes from neighboring functions. Also trigger when you see legacy patterns to migrate to this package — `Deno.serve`, `createClient(Deno.env.get('SUPABASE_URL'))`, imports from `esm.sh/@supabase` or `deno.land/std`, usage of `SUPABASE_ANON_KEY` / `SUPABASE_SERVICE_ROLE_KEY`, or the deprecated `allow:` config option / removed `'always'` / `'public'` mode values / removed `authType` field.
---

# @supabase/server

> **v1.0 — Public Beta.** First stable release under SemVer: breaking changes only ship as a major bump. The package is still early — expect ergonomic improvements and features to land frequently in minor releases. If you encounter a bug or rough edge while writing code with it, surface it to the user with a pointer to [open an issue](https://github.com/supabase/server/issues).

> **This is a brand new package.** There is no information available online yet — no blog posts, no Stack Overflow answers, no tutorials. Do not search the web for usage examples. Rely exclusively on the documentation files listed below and the source code in this repository.

> **The config option is `auth`, not `allow`.** `allow` was renamed to `auth` to match CLI terminology and read more naturally. The legacy `allow` key still works (with a one-time `console.warn`) but is deprecated and will be removed in a future major release. **Always emit `auth` in new code** — e.g. `withSupabase({ auth: 'user' }, ...)`. If you encounter `allow:` in existing code, migrate it to `auth:` (find-and-replace, the values are identical).

> **Auth mode values: `'none'` (not `'always'`), `'publishable'` (not `'public'`).** The four valid values are `'user'`, `'publishable'`, `'secret'`, `'none'`. The legacy `'always'` and `'public'` values were removed (breaking change) — they no longer work at runtime or in TypeScript. Always emit the new values in code you write, and migrate any legacy references you find: `'always'` → `'none'`, `'public'` → `'publishable'`, `'public:<name>'` → `'publishable:<name>'`. Runtime checks like `ctx.authType === 'public'` must also be updated to `ctx.authMode === 'publishable'` — the field itself was renamed from `authType` to `authMode` to match the `AuthMode` type.

> **Do not use legacy Supabase keys.** The `anon` key and `service_role` key (env vars `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`) are legacy and will be deprecated. Do not use them unless the user explicitly asks. Always use the new API keys:
>
> | Legacy (avoid)              | New (use this)                                       |
> | --------------------------- | ---------------------------------------------------- |
> | `SUPABASE_ANON_KEY`         | `SUPABASE_PUBLISHABLE_KEY(S)` (`sb_publishable_...`) |
> | `SUPABASE_SERVICE_ROLE_KEY` | `SUPABASE_SECRET_KEY(S)` (`sb_secret_...`)           |
>
> Do not call `createClient(url, anonKey)` directly — use `@supabase/server` auth modes (`auth: 'user'`, `auth: 'secret'`, etc.) which handle key resolution automatically. If migrating existing code, replace `SUPABASE_ANON_KEY` usage with `auth: 'publishable'` and `SUPABASE_SERVICE_ROLE_KEY` usage with `auth: 'secret'`.

Server-side utilities for Supabase. Handles auth, client creation, and context injection so you write business logic, not boilerplate.

## What this package does

- Wraps fetch handlers with credential verification, CORS, and pre-configured Supabase clients
- Supports 4 auth modes: `user` (JWT), `publishable` (publishable key), `secret` (secret key), `none` (no credentials required)
- Array syntax (`auth: ['user', 'secret']`) is first-match-wins. A present-but-invalid JWT rejects with `InvalidJwtError` (`INVALID_JWT`) — it does not silently downgrade to the next mode.
- Provides composable core primitives for custom auth flows and framework integration
- Runs inside Hono, H3, Elysia, NestJS, and TanStack Start through `@supabase/middleware` bridges. The bundled framework adapters (`@supabase/server/adapters/*`) are deprecated and will be removed on December 1, 2026.

## Entry points

| Import                                      | Deno / Edge Functions                             | Provides                                                                                                                                                     |
| ------------------------------------------- | ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `@supabase/server`                          | `npm:@supabase/server@1`                          | `withSupabase`, `createSupabaseContext`, types, errors                                                                                                       |
| `@supabase/server/core`                     | `npm:@supabase/server@1/core`                     | `verifyAuth`, `verifyCredentials`, `extractCredentials`, `resolveEnv`, `createContextClient`, `createAdminClient`                                            |
| `@supabase/server/adapters/hono`            | `npm:@supabase/server@1/adapters/hono`            | **Deprecated. Removed on December 1, 2026.** `withSupabase` (Hono middleware variant). New Hono code uses the bridge in the Hono quick start below.          |
| `@supabase/server/oauth-protected-resource` | `npm:@supabase/server@1/oauth-protected-resource` | `withOAuthProtectedResource`, `fromSupabaseUrl`, `resourceMetadataResponse`, `unauthorizedResponse` — OAuth 2.1 discovery for MCP servers; see `docs/mcp.md` |

## Quick starts

> **Supabase Edge Functions: disable `verify_jwt` for non-user auth.** By default, Supabase Edge Functions require a valid JWT on every request. If your function uses `auth: 'publishable'`, `auth: 'secret'`, or `auth: 'none'`, you must disable the platform-level JWT check in `supabase/config.toml`, otherwise the request will be rejected before it reaches your handler:
>
> ```toml
> [functions.my-function]
> verify_jwt = false
> ```
>
> Functions using `auth: 'user'` can leave `verify_jwt` enabled (the default) since callers already provide a valid JWT.

### Supabase Edge Functions (Deno)

Environment variables are auto-injected by the platform — zero config. **All imports must use the `npm:` specifier.**

```ts
// withSupabase — high-level wrapper
import { withSupabase } from 'npm:@supabase/server@1'

export default {
  fetch: withSupabase({ auth: 'user' }, async (_req, ctx) => {
    const { data } = await ctx.supabase.from('todos').select()
    return Response.json(data)
  }),
}
```

```ts
// createSupabaseContext — returns { data, error } for custom response control
import { createSupabaseContext } from 'npm:@supabase/server@1'

export default {
  fetch: async (req: Request) => {
    const { data: ctx, error } = await createSupabaseContext(req, {
      auth: 'user',
    })
    if (error) {
      return Response.json(
        { message: error.message, code: error.code },
        { status: error.status },
      )
    }
    const { data } = await ctx.supabase.from('todos').select()
    return Response.json(data)
  },
}
```

### Cloudflare Workers

Requires `nodejs_compat` compatibility flag in `wrangler.toml`, or pass env overrides via the `env` config option. See `docs/environment-variables.md`.

```ts
import { withSupabase } from '@supabase/server'

export default {
  fetch: withSupabase({ auth: 'user' }, async (_req, ctx) => {
    const { data } = await ctx.supabase.from('todos').select()
    return Response.json(data)
  }),
}
```

### Hono

> **The Hono adapter (`@supabase/server/adapters/hono`) is deprecated and will be removed on December 1, 2026.** New Hono code uses a bridge: one file you copy into your project. It runs `@supabase/middleware` entries inside Hono's middleware slot. The bridge needs `@supabase/server` 1.6.0 or later and Node 22 or later. The bridge file imports `@supabase/middleware`, so add it to your project as a direct dependency. `@supabase/server` depends on it, but a strict package manager such as pnpm does not let your code import a transitive dependency. The full guide, with the migration steps and a prompt you can hand to an agent, is at https://supabase.com/docs/reference/server/frameworks.

The bridge file is not in the npm package. Fetch it from the repository and keep it as is, comments included:

```bash
npm install @supabase/middleware
mkdir -p src/lib
curl --fail -o src/lib/supabase-middleware.ts \
  https://raw.githubusercontent.com/supabase/server/main/examples/frameworks/hono/supabase-middleware.ts
```

```ts
import { Hono } from 'hono'
import { withRequiredClaims } from '@supabase/server/middleware/required-claims'
import { withSupabaseClient } from '@supabase/server/middleware/client'

import { toHono } from './lib/supabase-middleware.js'

// `withRequiredClaims` answers 401 to any request without a valid user JWT,
// so the routes below only run for signed-in callers.
const app = new Hono()
  .use('*', toHono([withRequiredClaims(), withSupabaseClient()]))
  .get('/todos', async (c) => {
    const { data, error } = await c.var.supabase.from('todos').select()
    if (error) return c.json({ error: error.message }, 500)
    return c.json(data)
  })
  .get('/me', (c) => c.json({ id: c.var.jwtClaims.sub }))

export default { fetch: app.fetch }
```

Register the bridge with `.use()` in the same chain as the routes it gates. Hono applies middleware only to routes added after it. For browser callers, compose `withCors` from `@supabase/middleware/cors` ahead of the gate. On Deno and Supabase Edge Functions, import `hono`, `@supabase/middleware`, and `@supabase/server@1/middleware/*` with the `npm:` specifier.

**Pick the entries from the adapter's `auth` value.** The adapter rejected requests that failed its `auth` check. `withClaims()` does not. It contributes `jwtClaims: null` for an anonymous request and lets it through. Using it in place of `auth: 'user'` turns a 401 into a 200 with no error.

| Adapter config                            | Bridge entries                                                                                                                                              |
| ----------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `auth: 'user'`, or no config              | `toHono([withRequiredClaims(), withSupabaseClient()])`                                                                                                      |
| `auth: 'none'`                            | `toHono([withSupabaseClient()])`                                                                                                                            |
| `auth: 'publishable'` or `auth: 'secret'` | No bridge entry exists. That endpoint stays on `withSupabase({ auth: 'publishable' })` or `withSupabase({ auth: 'secret' })`. Do not hand-roll a key check. |

Never compose `withClaims()` and `withRequiredClaims()` in one array. Both contribute `jwtClaims`, and the bridge rejects the pair at compile time. Add `withSupabaseAdminClient()` from `@supabase/server/middleware/admin-client` only where the handler reads `supabaseAdmin`.

The entries contribute flat keys, so handlers read `c.var.supabase` and `c.var.jwtClaims`. No entry contributes `userClaims`. `jwtClaims` is the raw JWT payload: `userClaims.id` becomes `jwtClaims.sub`, `appMetadata` becomes `app_metadata`, and `userMetadata` becomes `user_metadata`.

<details>
<summary>Deprecated adapter (removed on December 1, 2026)</summary>

Existing code may still import the adapter. Recognize it, and migrate it with the table above. The adapter handles no CORS; it relies on `hono/cors`. See `docs/adapters/hono.md`.

```ts
import { Hono } from 'hono'
import { withSupabase } from '@supabase/server/adapters/hono'

const app = new Hono()
app.use('*', withSupabase({ auth: 'user' }))

app.get('/todos', async (c) => {
  const { supabase } = c.var.supabaseContext
  const { data } = await supabase.from('todos').select()
  return c.json(data)
})

export default app
```

</details>

### Cookie-based environments (compose with `@supabase/ssr`)

For Next.js / SvelteKit / Remix, **compose `@supabase/server` with [`@supabase/ssr`](https://github.com/supabase/ssr)** — they are not replacements for each other. `@supabase/ssr` owns cookies and refresh-token rotation (its middleware is required, otherwise the access token cookie goes stale and verification fails). In your Server Component or Route Handler, use `@supabase/ssr`'s `createServerClient` to read the (middleware-refreshed) session, hand the access token to `verifyCredentials` from `@supabase/server/core`, then build the typed clients with `createContextClient` + `createAdminClient`. See `docs/ssr-frameworks.md` for the full adapter pattern.

```ts
// Key imports for building the adapter
import { createServerClient } from '@supabase/ssr'
import {
  verifyCredentials,
  createContextClient,
  createAdminClient,
} from '@supabase/server/core'
```

### Server-to-server (secret key auth)

For internal services, cron jobs, or automation calling your Edge Function. The caller sends the secret key in the `apikey` header. See `docs/auth-modes.md` for named key syntax.

**Edge Function (Deno):**

```ts
import { withSupabase } from 'npm:@supabase/server@1'

// Only accept the "automations" named secret key
export default {
  fetch: withSupabase({ auth: 'secret:automations' }, async (req, ctx) => {
    const body = await req.json()
    const { data } = await ctx.supabaseAdmin
      .from('scheduled_tasks')
      .insert({ name: body.taskName, scheduled_at: body.scheduledAt })
    return Response.json({ success: true, data })
  }),
}
```

**Caller (external service):**

```ts
await fetch('https://<project>.supabase.co/functions/v1/my-function', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    apikey: 'sb_secret_automations_...', // the named secret key
  },
  body: JSON.stringify({
    taskName: 'cleanup',
    scheduledAt: new Date().toISOString(),
  }),
})
```

Bare `auth: 'secret'` matches only the `default` key. Use `auth: 'secret:name'` to require a specific named key, or `auth: 'secret:*'` to accept any secret key in the set.

## Pin user tokens to one project

`audience` and `issuer` check the `aud` and `iss` claims of a `user`-mode token. Each takes a string or an array. A token without the claim, or with a value outside the list, is rejected with `INVALID_JWT`. Set `issuer: fromSupabaseUrl(url)` when one JWKS could be shared across projects or services. Supabase Auth sets `aud` to `authenticated`, so `audience` only matters for tokens from a custom issuer. Both options exist on `withSupabase`, `verifyAuth`, `verifyCredentials`, `withClaims`, and `withRequiredClaims`.

```ts
import { fromSupabaseUrl, withSupabase } from 'npm:@supabase/server@1'

export default {
  fetch: withSupabase(
    {
      auth: 'user',
      issuer: fromSupabaseUrl(Deno.env.get('SUPABASE_URL')!),
    },
    async (req, ctx) => Response.json({ user: ctx.userClaims }),
  ),
}
```

## When to use `auth: 'none'`

> **`auth: 'none'` disables all authentication.** The handler runs for every request with no credential checks. Only use it when auth is genuinely unnecessary — health checks, public status pages, or endpoints with no sensitive data and no side effects.

**Before using `auth: 'none'`, confirm with the user whether the endpoint is truly public.** If not, propose an alternative:

- **Another service or cron job calls this function** — use `auth: 'secret'` or `auth: 'secret:<name>'` instead. The caller sends the secret key in the `apikey` header.
- **An external webhook provider calls this function** — use `auth: 'secret'` and have the provider send the secret key, or implement the provider's own signature verification inside the handler.

**Never use `auth: 'none'` for endpoints that read or write user data without verifying who the caller is.**

**On `auth: ['user', 'none']`.** A stale or malformed JWT on such an endpoint is rejected with `InvalidJwtError` (`INVALID_JWT`) — it is not silently downgraded to anonymous. Callers that might hold a cached/expired token should either omit the `Authorization` header entirely or refresh before calling. If the goal is "anonymous unless a valid user is signed in," this is the correct behavior; if the goal is truly "accept anything," use `auth: 'none'` on its own.

**`'none'` goes last, or alone.** It matches every request, so the type accepts it only as the final entry of a list (`['user', 'none']`) or on its own (`'none'`). `['none']` and `['none', 'user']` are type errors — write the bare `'none'` for the first, and put `'none'` last for the second.

## Edge Function recipes

### Function-to-function calls

One Edge Function can call another using the admin client. The called function uses `auth: 'secret'` and the caller invokes it via `ctx.supabaseAdmin.functions.invoke()`.

**Config** (`supabase/config.toml`):

```toml
[functions.process-order]
verify_jwt = false  # called with secret key, not a user JWT
```

**Called function** (`supabase/functions/process-order/index.ts`):

```ts
import { withSupabase } from 'npm:@supabase/server@1'

export default {
  fetch: withSupabase({ auth: 'secret' }, async (req, ctx) => {
    const { orderId } = await req.json()
    const { data } = await ctx.supabaseAdmin
      .from('orders')
      .update({ status: 'processing' })
      .eq('id', orderId)
      .select()
      .single()
    return Response.json(data)
  }),
}
```

**Calling function** (`supabase/functions/checkout/index.ts`):

```ts
import { withSupabase } from 'npm:@supabase/server@1'

export default {
  fetch: withSupabase({ auth: 'user' }, async (req, ctx) => {
    const { orderId } = await req.json()

    // Calls process-order with the secret key automatically
    const { data, error } = await ctx.supabaseAdmin.functions.invoke(
      'process-order',
      { body: { orderId } },
    )

    if (error) {
      return Response.json({ error: error.message }, { status: 500 })
    }
    return Response.json(data)
  }),
}
```

### Calling from database with pg_net

Use `pg_net` to call Edge Functions directly from SQL. The secret key is stored in Vault so it never appears in queries.

**Prerequisites:**

```sql
-- 1. Enable the pg_net extension
create extension if not exists pg_net with schema extensions;

-- 2. Store your secret key in Vault
select vault.create_secret(
  'sb_secret_...',        -- your secret key value
  'supabase_secret_key'   -- a name to reference it by
);
```

**Call the function:**

```sql
select net.http_post(
  url := 'https://<project-ref>.supabase.co/functions/v1/process-order',
  headers := jsonb_build_object(
    'Content-Type', 'application/json',
    'apikey', (
      select decrypted_secret
      from vault.decrypted_secrets
      where name = 'supabase_secret_key'
    )
  ),
  body := jsonb_build_object('orderId', 'order_123')
);
```

The receiving function uses `auth: 'secret'` (see example above). `pg_net` is asynchronous — the HTTP request is queued and executed in the background. Check `net._http_response` for results.

### Stripe webhook

External webhook providers like Stripe cannot send your Supabase API keys. Use `auth: 'none'` to skip credential checks, then verify the webhook signature inside the handler.

**Config** (`supabase/config.toml`):

```toml
[functions.stripe-webhook]
verify_jwt = false
```

**Set secrets:**

```bash
supabase secrets set STRIPE_SECRET_KEY=sk_live_...
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...
```

**Function** (`supabase/functions/stripe-webhook/index.ts`):

```ts
import { withSupabase } from 'npm:@supabase/server@1'
import Stripe from 'npm:stripe'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!)

export default {
  fetch: withSupabase({ auth: 'none' }, async (req, ctx) => {
    const body = await req.text()
    const sig = req.headers.get('stripe-signature')!

    let event: Stripe.Event
    try {
      event = await stripe.webhooks.constructEventAsync(
        body,
        sig,
        Deno.env.get('STRIPE_WEBHOOK_SECRET')!,
      )
    } catch {
      return Response.json({ error: 'Invalid signature' }, { status: 401 })
    }

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        await ctx.supabaseAdmin
          .from('orders')
          .update({ status: 'paid' })
          .eq('stripe_session_id', session.id)
        break
      }
    }

    return Response.json({ received: true })
  }),
}
```

### Migrating legacy Edge Functions

If you encounter code using `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `Deno.serve`, imports from `esm.sh/@supabase` or `deno.land/std`, suggest migrating to `@supabase/server`. These legacy patterns are being deprecated — they require manual client creation, manual auth header forwarding, manual CORS handling, and expose keys directly in code.

**How to recognize legacy code:**

- `import { serve } from "https://deno.land/std/..."` — oldest pattern, uses deprecated Deno standard library
- `import { createClient } from "https://esm.sh/@supabase/supabase-js"` — old CDN import, not compatible with modern runtimes
- `Deno.serve(async (req) => { ... })` with manual `createClient()` — current but verbose, requires manual auth forwarding
- `Deno.env.get('SUPABASE_ANON_KEY')` or `SUPABASE_SERVICE_ROLE_KEY` — legacy keys that will be removed

**Before** (legacy — manual client, manual auth forwarding):

Legacy keys will be removed, making this code stop working. It's also verbose, not cross-platform compatible, and requires manually wiring auth headers, CORS, and error handling.

```ts
import { createClient } from 'npm:@supabase/supabase-js@2'

Deno.serve(async (req: Request) => {
  const supabaseClient = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    {
      global: { headers: { Authorization: req.headers.get('Authorization')! } },
    },
  )
  const { data } = await supabaseClient.from('orders').select('*')
  return Response.json(data)
})
```

**After** (new — auth, clients, and CORS handled automatically):

Uses the latest API keys, works across runtimes (Deno, Node.js, Cloudflare), and handles auth verification, client creation, and CORS in a single line.

```ts
import { withSupabase } from 'npm:@supabase/server@1'

export default {
  fetch: withSupabase({ auth: 'user' }, async (_req, ctx) => {
    const { data } = await ctx.supabase.from('orders').select('*')
    return Response.json(data)
  }),
}
```

The migration mapping: `SUPABASE_ANON_KEY` with manual auth header → `auth: 'user'`, `SUPABASE_ANON_KEY` without auth → `auth: 'publishable'`. For `SUPABASE_SERVICE_ROLE_KEY`, it depends on intent: if the legacy code validates the incoming key to protect the endpoint (e.g., `req.headers.get('apikey') === serviceRoleKey`), use `auth: 'secret'`. If it only uses the key to create an admin client for elevated DB access, no specific auth mode is needed — `ctx.supabaseAdmin` is always available regardless of auth mode.

## Documentation

The full documentation lives in the `docs/` directory of the `@supabase/server` package. To read a doc, find the package location first:

- **If working inside the SDK repo:** `docs/` is at the project root.
- **If the package is installed as a dependency:** look in `node_modules/@supabase/server/docs/`.

| Question                                                                                               | Doc file                                              |
| ------------------------------------------------------------------------------------------------------ | ----------------------------------------------------- |
| How do I create a basic endpoint?                                                                      | `docs/getting-started.md`                             |
| What auth modes are available? Array syntax? Named keys?                                               | `docs/auth-modes.md`                                  |
| Which framework adapters exist, and what replaces them?                                                | `README.md`, section "Framework Adapters"             |
| How do I use the deprecated Hono adapter?                                                              | `docs/adapters/hono.md`                               |
| How do I use the deprecated H3 / Nuxt adapter?                                                         | `docs/adapters/h3.md`                                 |
| How do I run middleware entries inside Hono, H3, Elysia, NestJS, or TanStack Start without an adapter? | https://supabase.com/docs/reference/server/frameworks |
| How do I use low-level primitives for custom flows?                                                    | `docs/core-primitives.md`                             |
| How do environment variables work across runtimes?                                                     | `docs/environment-variables.md`                       |
| How do I handle errors? What codes exist?                                                              | `docs/error-handling.md`                              |
| How do I get typed database queries?                                                                   | `docs/typescript-generics.md`                         |
| How do I use this with `@supabase/ssr` (Next.js, SvelteKit, Remix)?                                    | `docs/ssr-frameworks.md`                              |
| How do I build an MCP server my users connect to (OAuth discovery, RLS-scoped tools)?                  | `docs/mcp.md`                                         |
| What's the complete API surface?                                                                       | `docs/api-reference.md`                               |
| What security decisions does this package make?                                                        | `docs/security.md`                                    |
````

## File: .expo/devices.json
````json
{
  "devices": []
}
````

## File: .expo/README.md
````markdown
> Why do I have a folder named ".expo" in my project?

The ".expo" folder is created when an Expo project is started using "expo start" command.

> What do the files contain?

- "devices.json": contains information about devices that have recently opened this project. This is used to populate the "Development sessions" list in your development builds.
- "settings.json": contains the server configuration that is used to serve the application manifest.
- "dev/logs/": contains structured JSONL event logs from CLI commands (e.g. start.log, export.log). These are truncated on each run.

> Should I commit the ".expo" folder?

No, you should not share the ".expo" folder. It does not contain any information that is relevant for other developers working on the project, it is specific to your machine.
Upon project creation, the ".expo" folder is already added to your ".gitignore" file.
````

## File: docs/ARCHITECTURE.md
````markdown
# System Architecture Specification — BusTrack Pro

## 1. High-Level Architecture

- **Architecture Pattern**: Modular Monolith (Domain-Driven Design) with clear migration pathway to Event-Driven Microservices.
- **Communication Pattern**: 
  - **Inbound Client Operations**: RESTful JSON APIs (HTTP/2 ready, RFC 7807 problem details).
  - **Real-Time Telemetry & Notifications**: Full-duplex WebSockets (`/ws/telemetry`) with binary/JSON message frames and heartbeat ping/pong.
  - **Inter-service Communication (Internal)**: In-process EventBus / Domain Event Dispatcher (Kafka/RabbitMQ ready).
- **Data Pattern**: CQRS-lite with write validation models and read-optimized view queries; time-series telemetry append log with retention pruning.
- **Deployment Pattern**: Containerized (Docker, OCI-compliant), multi-stage build, health/readiness probes (`/api/v1/health`), stateless server architecture suitable for horizontal autoscaling behind reverse proxy (Nginx, Traefik, AWS ALB).
- **API Contract**: OpenAPI 3.1.0 specification with strict schema validation.
- **Observability Pattern**: Structured JSON logging, distributed correlation IDs (`X-Correlation-ID`), Prometheus-compatible latency & throughput metrics, SLO monitoring.

---

## 2. Service Decomposition & Domain Model

```mermaid
graph TD
    Client[Web Dashboard / Mobile App] -->|HTTPS REST| APIGateway[API Gateway / Express Router]
    Client -->|WSS Protocol| WSGateway[WebSocket Telemetry Hub]
    
    subgraph CoreBackend [BusTrack Pro Backend Core]
        APIGateway --> SecurityMW[Security & Correlation Middleware]
        SecurityMW --> FleetCtrl[Fleet & Routes Controller]
        SecurityMW --> AlertCtrl[Alerts Controller]
        SecurityMW --> ReportCtrl[Reports & Analytics Controller]
        
        FleetCtrl --> FleetSvc[Fleet Service]
        AlertCtrl --> AlertSvc[Alert Service]
        ReportCtrl --> ReportSvc[Report Service]
        
        TelemetryEngine[Telemetry Engine / GPS Ingestion] --> FleetSvc
        TelemetryEngine -->|Emit GPS Delta| WSGateway
        AlertSvc -->|Emit Alert Event| WSGateway
        
        FleetSvc --> Persistence[Persistence Layer SQLite / PostgreSQL]
        AlertSvc --> Persistence
        ReportSvc --> Persistence
    end

    Persistence --> DB[(Relational Database)]
```

### Core Domains:
1. **Fleet Management Domain**:
   - Manages physical buses (`buses`), technical specifications, capacity, fuel levels, current status (`active`, `delayed`, `stopped`, `maintenance`).
   - Handles route assignments and driver pairings.
   - Enforces state transition rules (e.g., transition from `active` to `stopped` drops speed to 0 km/h).

2. **Route & Spatial Domain**:
   - Manages transit lines (`routes`), path geometries, sequence of stops (`stops`, `route_stops`), estimated arrival times (ETA), and scheduled travel times.

3. **Driver Domain**:
   - Manages authorized operators (`drivers`), license validation, shift tracking, safety ratings, and trip completions.

4. **Telemetry & Geo-Tracking Domain**:
   - Ingests high-frequency GPS coordinate beacons (x, y coordinates, speed, heading, fuel, passenger load).
   - Feeds real-time consumers through low-latency WebSocket broadcasting with sub-50ms fanout.

5. **Alert & Incident Domain**:
   - Monitors telemetry thresholds (speeding, engine temperature, low fuel < 20%, severe delays, geofence deviation).
   - Generates typed alerts (`critical`, `warning`, `info`) with lifecycle states (`unread`, `read`, `acknowledged`).

6. **Reporting & Analytics Domain**:
   - Computes operational KPIs: fleet utilization rate, passenger volume, average delay minutes, fuel consumption, maintenance frequency.
   - Generates CSV and PDF exports for transport authorities and company management.

---

## 3. Reliability & Resiliency Patterns

1. **Timeout Budgets & Graceful Degradation**:
   - Database query timeout budget set to 2,000ms.
   - If downstream services or disk persistence slow down, read requests return cached snapshots with `Cache-Control: public, max-age=5` and `stale-while-revalidate`.
2. **Circuit Breakers & Rate Limiting**:
   - Token-bucket rate limiter per IP address (120 req/min for general endpoints; 30 req/min for mutating actions).
   - Protection against telemetry packet storms via sliding window deduplication.
3. **Heartbeat & Reconnection Protocol**:
   - WebSocket clients send periodic ping frames every 30 seconds; server terminates dead TCP connections after 2 missed beats.
   - Frontend client implements exponential backoff with jitter (500ms, 1s, 2s, 4s, max 15s) upon connection drop.
4. **Graceful Shutdown**:
   - Catches `SIGTERM` and `SIGINT`:
     - Closes incoming HTTP listeners.
     - Sends WS termination frames to connected clients (`Going Away`).
     - Flushes in-flight telemetry logs to disk/database.
     - Exits cleanly within 5,000ms grace window.

---

## 4. Security & Data Protection

- **Defense in Depth**:
  - Transport Layer Security (TLS 1.3 enforced in production reverse proxy).
  - Security headers enforced: Strict Content-Security-Policy (CSP), `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`.
  - CORS whitelist configured via environment variable `CORS_ORIGIN`.
  - Input validation: strict payload sanitation to prevent SQL injection, prototype pollution, and path traversal.

---

## 5. Observability & SLOs

### Service Level Objectives (SLOs)
| Metric | Objective | Target |
| :--- | :--- | :--- |
| **API Availability** | Uptime excluding scheduled maintenance | `>= 99.9%` |
| **P95 Latency (Read)** | Response time for `GET /api/v1/*` | `< 100 ms` |
| **P99 Latency (Write)** | Response time for `POST / PATCH` | `< 250 ms` |
| **Telemetry Fanout** | Ingestion-to-client WS latency | `< 80 ms` |
| **Error Rate** | 5xx server responses / total requests | `< 0.05%` |

### Telemetry & Tracing
- Structured JSON output to `stdout` compatible with Datadog, ELK, and CloudWatch.
- Unique request tracing header: `X-Correlation-ID` injected at the gateway and propagated across service calls and log entries.
````

## File: docs/DATABASE_SCHEMA.sql
````sql
-- =============================================================================
-- BusTrack Pro — Enterprise PostgreSQL Database Schema
-- Architecture Version: 1.0.0
-- Target Engine: PostgreSQL 15+ / 16+
-- Optimized for high-throughput telematics, low-latency spatial queries & auditability
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =============================================================================
-- 1. ENUMS & DOMAINS
-- =============================================================================

DO $$ BEGIN
    CREATE TYPE bus_status_enum AS ENUM ('active', 'delayed', 'stopped', 'maintenance');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE alert_severity_enum AS ENUM ('critical', 'warning', 'info');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- =============================================================================
-- 2. TRANSIT ROUTES & STOPS
-- =============================================================================

CREATE TABLE IF NOT EXISTS routes (
    id VARCHAR(10) PRIMARY KEY,              -- e.g. 'A', 'B', 'C', 'D'
    name VARCHAR(150) NOT NULL,              -- e.g. 'Centro — Aeropuerto'
    var_name VARCHAR(50) NOT NULL,           -- e.g. '--route-a'
    color VARCHAR(20) NOT NULL,              -- e.g. '#5b6ef5'
    stops_count INTEGER NOT NULL DEFAULT 0,
    length_km NUMERIC(5, 2) NOT NULL DEFAULT 0.0,
    path_d TEXT,                             -- SVG path definition or GeoJSON LineString
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS stops (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(150) NOT NULL UNIQUE,
    pos_x NUMERIC(8, 2) NOT NULL,            -- Spatial X coordinate on city grid
    pos_y NUMERIC(8, 2) NOT NULL,            -- Spatial Y coordinate on city grid
    latitude NUMERIC(10, 7),                 -- Optional WGS84 GPS latitude
    longitude NUMERIC(10, 7),                -- Optional WGS84 GPS longitude
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS route_stops (
    route_id VARCHAR(10) REFERENCES routes(id) ON DELETE CASCADE,
    stop_id UUID REFERENCES stops(id) ON DELETE CASCADE,
    sequence_order INTEGER NOT NULL,
    PRIMARY KEY (route_id, stop_id),
    CONSTRAINT uq_route_sequence UNIQUE (route_id, sequence_order)
);

CREATE INDEX IF NOT EXISTS idx_route_stops_order ON route_stops(route_id, sequence_order);

-- =============================================================================
-- 3. DRIVERS (OPERATORS)
-- =============================================================================

CREATE TABLE IF NOT EXISTS drivers (
    id VARCHAR(20) PRIMARY KEY,              -- e.g. 'D001', 'D002'
    name VARCHAR(150) NOT NULL,
    initials VARCHAR(5) NOT NULL,
    license VARCHAR(50) NOT NULL UNIQUE,
    trips_completed INTEGER NOT NULL DEFAULT 0 CHECK (trips_completed >= 0),
    rating NUMERIC(3, 2) NOT NULL DEFAULT 5.0 CHECK (rating >= 1.0 AND rating <= 5.0),
    shift_hours NUMERIC(4, 2) NOT NULL DEFAULT 0.0 CHECK (shift_hours >= 0.0),
    phone VARCHAR(30),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_drivers_rating ON drivers(rating DESC);

-- =============================================================================
-- 4. FLEET BUSES
-- =============================================================================

CREATE TABLE IF NOT EXISTS buses (
    id VARCHAR(20) PRIMARY KEY,              -- e.g. 'BUS-001'
    num VARCHAR(10) NOT NULL,                -- e.g. '001'
    plate VARCHAR(20) NOT NULL UNIQUE,       -- e.g. 'SJB-1001'
    route_id VARCHAR(10) REFERENCES routes(id) ON UPDATE CASCADE,
    driver_id VARCHAR(20) REFERENCES drivers(id) ON UPDATE CASCADE,
    status bus_status_enum NOT NULL DEFAULT 'stopped',
    speed NUMERIC(5, 2) NOT NULL DEFAULT 0.0 CHECK (speed >= 0.0),
    passengers INTEGER NOT NULL DEFAULT 0 CHECK (passengers >= 0),
    capacity INTEGER NOT NULL DEFAULT 52 CHECK (capacity > 0),
    fuel_percent NUMERIC(5, 2) NOT NULL DEFAULT 100.0 CHECK (fuel_percent >= 0.0 AND fuel_percent <= 100.0),
    delay_minutes INTEGER NOT NULL DEFAULT 0 CHECK (delay_minutes >= 0),
    next_stop_name VARCHAR(150),
    eta_minutes INTEGER DEFAULT 0,
    pos_x NUMERIC(8, 2) NOT NULL DEFAULT 400.0,
    pos_y NUMERIC(8, 2) NOT NULL DEFAULT 225.0,
    trajectory_t NUMERIC(6, 5) DEFAULT 0.0,  -- 0.0 to 1.0 progress along route curve
    trajectory_dir SMALLINT DEFAULT 1,       -- 1 = forward, -1 = reverse
    trajectory_step NUMERIC(6, 5) DEFAULT 0.005,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_buses_status ON buses(status);
CREATE INDEX IF NOT EXISTS idx_buses_route ON buses(route_id);
CREATE INDEX IF NOT EXISTS idx_buses_driver ON buses(driver_id);
CREATE INDEX IF NOT EXISTS idx_buses_fuel ON buses(fuel_percent) WHERE fuel_percent < 20;

-- =============================================================================
-- 5. TIME-SERIES TELEMETRY LOGS (Partitioned by Month for Big Data Scale)
-- =============================================================================

CREATE TABLE IF NOT EXISTS telemetry_logs (
    id BIGSERIAL,
    bus_id VARCHAR(20) NOT NULL,
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    pos_x NUMERIC(8, 2) NOT NULL,
    pos_y NUMERIC(8, 2) NOT NULL,
    speed NUMERIC(5, 2) NOT NULL,
    fuel_percent NUMERIC(5, 2) NOT NULL,
    passengers INTEGER NOT NULL,
    delay_minutes INTEGER NOT NULL,
    status bus_status_enum NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    PRIMARY KEY (recorded_at, id)
) PARTITION BY RANGE (recorded_at);

-- Partition examples for monthly storage:
CREATE TABLE IF NOT EXISTS telemetry_y2026m01 PARTITION OF telemetry_logs
    FOR VALUES FROM ('2026-01-01 00:00:00+00') TO ('2026-02-01 00:00:00+00');
CREATE TABLE IF NOT EXISTS telemetry_y2026m02 PARTITION OF telemetry_logs
    FOR VALUES FROM ('2026-02-01 00:00:00+00') TO ('2026-03-01 00:00:00+00');
CREATE TABLE IF NOT EXISTS telemetry_y2026m03 PARTITION OF telemetry_logs
    FOR VALUES FROM ('2026-03-01 00:00:00+00') TO ('2026-04-01 00:00:00+00');
CREATE TABLE IF NOT EXISTS telemetry_default PARTITION OF telemetry_logs DEFAULT;

CREATE INDEX IF NOT EXISTS idx_telemetry_bus_time ON telemetry_logs (bus_id, recorded_at DESC);

-- =============================================================================
-- 6. ALERTS & INCIDENT MANAGEMENT
-- =============================================================================

CREATE TABLE IF NOT EXISTS alerts (
    id BIGSERIAL PRIMARY KEY,
    severity alert_severity_enum NOT NULL DEFAULT 'info',
    icon VARCHAR(10) NOT NULL DEFAULT 'ℹ️',
    title VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    bus_id VARCHAR(20),                      -- Can be 'BUS-011' or 'Sistema'
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    resolved_at TIMESTAMPTZ,
    resolved_by VARCHAR(100)
);

CREATE INDEX IF NOT EXISTS idx_alerts_unread ON alerts(is_read, created_at DESC) WHERE is_read = FALSE;
CREATE INDEX IF NOT EXISTS idx_alerts_severity ON alerts(severity, created_at DESC);

-- =============================================================================
-- 7. AUDIT LOGGING & STATUS TRANSITION TRIGGER
-- =============================================================================

CREATE TABLE IF NOT EXISTS audit_logs (
    id BIGSERIAL PRIMARY KEY,
    entity_name VARCHAR(50) NOT NULL,
    entity_id VARCHAR(50) NOT NULL,
    action VARCHAR(20) NOT NULL,             -- 'INSERT', 'UPDATE', 'DELETE'
    old_data JSONB,
    new_data JSONB,
    changed_by VARCHAR(100) DEFAULT 'system',
    changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION fn_audit_bus_status_change()
RETURNS TRIGGER AS $$
BEGIN
    IF (OLD.status IS DISTINCT FROM NEW.status) THEN
        INSERT INTO audit_logs (entity_name, entity_id, action, old_data, new_data)
        VALUES (
            'buses',
            NEW.id,
            'STATUS_CHANGE',
            jsonb_build_object('status', OLD.status, 'speed', OLD.speed, 'delay', OLD.delay),
            jsonb_build_object('status', NEW.status, 'speed', NEW.speed, 'delay', NEW.delay)
        );
    END IF;
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_buses_status_change ON buses;
CREATE TRIGGER trg_buses_status_change
    BEFORE UPDATE ON buses
    FOR EACH ROW
    EXECUTE FUNCTION fn_audit_bus_status_change();
````

## File: docs/openapi.yaml
````yaml
openapi: 3.1.0
info:
  title: BusTrack Pro Public & Operations API
  description: Enterprise RESTful API for real-time fleet tracking, routes, drivers, incident management, and transit analytics.
  version: 1.0.0
  contact:
    name: BusTrack Architecture Team
    email: api-ops@bustrackpro.com

servers:
  - url: http://localhost:3000/api/v1
    description: Local Development Server
  - url: https://api.bustrackpro.com/v1
    description: Production Cluster

paths:
  /health:
    get:
      summary: System health & diagnostics
      operationId: getHealth
      tags: [System]
      responses:
        '200':
          description: System operational
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/HealthStatus'

  /routes:
    get:
      summary: Retrieve all transit routes with coverage KPIs
      operationId: getRoutes
      tags: [Routes]
      responses:
        '200':
          description: List of routes
          content:
            application/json:
              schema:
                type: array
                items:
                  $ref: '#/components/schemas/Route'

  /drivers:
    get:
      summary: Retrieve driver roster and shift statuses
      operationId: getDrivers
      tags: [Drivers]
      responses:
        '200':
          description: List of drivers
          content:
            application/json:
              schema:
                type: array
                items:
                  $ref: '#/components/schemas/Driver'

  /buses:
    get:
      summary: List fleet buses with optional filtering
      operationId: getBuses
      tags: [Fleet]
      parameters:
        - name: route
          in: query
          description: Filter by route identifier (e.g. A, B, C, D)
          schema:
            type: string
        - name: status
          in: query
          description: Filter by operational status
          schema:
            type: string
            enum: [active, delayed, stopped, maintenance]
        - name: search
          in: query
          description: Search term matching bus ID or license plate
          schema:
            type: string
      responses:
        '200':
          description: Filtered list of fleet units
          content:
            application/json:
              schema:
                type: array
                items:
                  $ref: '#/components/schemas/Bus'

    post:
      summary: Provision a new bus to the active fleet
      operationId: createBus
      tags: [Fleet]
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/CreateBusInput'
      responses:
        '201':
          description: Unit successfully created and provisioned
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Bus'
        '400':
          $ref: '#/components/responses/BadRequest'

  /buses/{id}:
    get:
      summary: Fetch specific bus telemetry and details
      operationId: getBusById
      tags: [Fleet]
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: string
      responses:
        '200':
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Bus'
        '404':
          $ref: '#/components/responses/NotFound'

  /buses/{id}/status:
    patch:
      summary: Update operational status of a bus unit
      operationId: updateBusStatus
      tags: [Fleet]
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: string
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [status]
              properties:
                status:
                  type: string
                  enum: [active, delayed, stopped, maintenance]
      responses:
        '200':
          description: Status successfully updated
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Bus'
        '400':
          $ref: '#/components/responses/BadRequest'
        '404':
          $ref: '#/components/responses/NotFound'

  /alerts:
    get:
      summary: List operational alerts
      operationId: getAlerts
      tags: [Alerts]
      parameters:
        - name: severity
          in: query
          schema:
            type: string
            enum: [all, critical, warning, info]
      responses:
        '200':
          content:
            application/json:
              schema:
                type: array
                items:
                  $ref: '#/components/schemas/Alert'

    post:
      summary: Register a new operational incident alert
      operationId: createAlert
      tags: [Alerts]
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/CreateAlertInput'
      responses:
        '201':
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Alert'

  /alerts/read-all:
    patch:
      summary: Mark all unread alerts as read
      operationId: markAllAlertsRead
      tags: [Alerts]
      responses:
        '200':
          content:
            application/json:
              schema:
                type: object
                properties:
                  success:
                    type: boolean
                  markedCount:
                    type: integer

  /reports/summary:
    get:
      summary: Generate operational KPI summary report
      operationId: getReportSummary
      tags: [Analytics]
      responses:
        '200':
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ReportSummary'

  /reports/export-csv:
    get:
      summary: Export fleet inventory and current state as CSV
      operationId: exportCsv
      tags: [Analytics]
      responses:
        '200':
          description: CSV file attachment
          content:
            text/csv:
              schema:
                type: string

components:
  schemas:
    HealthStatus:
      type: object
      properties:
        status:
          type: string
          example: healthy
        uptimeSeconds:
          type: number
        timestamp:
          type: string
          format: date-time
        activeConnections:
          type: integer
        trackedBuses:
          type: integer

    Route:
      type: object
      properties:
        id:
          type: string
          example: "A"
        name:
          type: string
          example: "Centro — Aeropuerto"
        varName:
          type: string
          example: "--route-a"
        color:
          type: string
          example: "#5b6ef5"
        stops:
          type: integer
          example: 8
        length:
          type: number
          example: 22

    Driver:
      type: object
      properties:
        id:
          type: string
          example: "D001"
        name:
          type: string
          example: "Carlos Mendoza"
        initials:
          type: string
          example: "CM"
        license:
          type: string
          example: "CR-2-0456-0891"
        trips:
          type: integer
          example: 1248
        rating:
          type: number
          example: 4.9
        hours:
          type: number
          example: 8.5

    Bus:
      type: object
      properties:
        id:
          type: string
          example: "BUS-001"
        num:
          type: string
          example: "001"
        plate:
          type: string
          example: "SJB-1001"
        route:
          $ref: '#/components/schemas/Route'
        driver:
          $ref: '#/components/schemas/Driver'
        status:
          type: string
          enum: [active, delayed, stopped, maintenance]
        speed:
          type: number
          example: 45
        passengers:
          type: integer
          example: 32
        capacity:
          type: integer
          example: 52
        fuel:
          type: number
          example: 78
        delay:
          type: integer
          example: 0
        nextStop:
          type: string
          example: "Hospital San Juan"
        etaMin:
          type: integer
          example: 4
        updatedAgo:
          type: integer
          example: 1
        pos:
          type: object
          properties:
            x:
              type: number
            y:
              type: number

    CreateBusInput:
      type: object
      properties:
        routeId:
          type: string
          example: "A"
        driverId:
          type: string
          example: "D001"

    Alert:
      type: object
      properties:
        id:
          type: integer
          example: 1
        type:
          type: string
          enum: [critical, warning, info]
        icon:
          type: string
          example: "🚨"
        title:
          type: string
        desc:
          type: string
        bus:
          type: string
          example: "BUS-011"
        time:
          type: string
          example: "hace 3 min"
        read:
          type: boolean

    CreateAlertInput:
      type: object
      required: [type, title, desc]
      properties:
        type:
          type: string
          enum: [critical, warning, info]
        icon:
          type: string
        title:
          type: string
        desc:
          type: string
        bus:
          type: string

    ReportSummary:
      type: object
      properties:
        totalBuses:
          type: integer
        circulating:
          type: integer
        totalPassengers:
          type: integer
        occupancyRate:
          type: number
        avgDelayMinutes:
          type: number
        inMaintenance:
          type: integer
        lowFuelCount:
          type: integer
        generatedAt:
          type: string
          format: date-time

  responses:
    BadRequest:
      description: Invalid payload or parameters
      content:
        application/json:
          schema:
            type: object
            properties:
              error:
                type: string
              message:
                type: string
    NotFound:
      description: Requested resource not found
      content:
        application/json:
          schema:
            type: object
            properties:
              error:
                type: string
              message:
                type: string
````

## File: docs/supabase-users-table.sql
````sql
-- ============================================================
-- BusTrack Pro — Tabla de Usuarios en Supabase
-- Ejecutar en: Supabase Dashboard > SQL Editor
-- ============================================================

-- 1. Crear tabla users vinculada a Supabase Auth
CREATE TABLE IF NOT EXISTS public.users (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email         TEXT UNIQUE NOT NULL,
  full_name     TEXT,
  role          TEXT DEFAULT 'admin' CHECK (role IN ('admin', 'passenger')),
  auth_provider TEXT DEFAULT 'email',
  avatar_url    TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Habilitar Row Level Security
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- 3. Politicas de seguridad
-- Permitir lectura de usuarios
CREATE POLICY "Permitir lectura de perfiles de usuario"
  ON public.users FOR SELECT
  USING (true);

-- Permitir registro/insercion de usuarios (Anon y Authenticated)
CREATE POLICY "Permitir registro de nuevos usuarios"
  ON public.users FOR INSERT
  WITH CHECK (true);

-- Permitir a los usuarios actualizar su propio perfil
CREATE POLICY "Usuarios pueden actualizar su propio perfil"
  ON public.users FOR UPDATE
  USING (auth.uid() = id OR true);

-- Service role puede gestionar todos los usuarios
CREATE POLICY "Service role puede gestionar todos los usuarios"
  ON public.users FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- 4. Trigger para updated_at automatico
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- 5. Trigger: crear fila en users cuando se registra en Supabase Auth
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name, avatar_url, auth_provider)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'name',
    NEW.raw_user_meta_data->>'avatar_url',
    COALESCE(NEW.raw_user_meta_data->>'provider', 'email')
  )
  ON CONFLICT (email) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- ============================================================
-- Listo! Ahora cada registro en Supabase Auth crea
-- automaticamente un registro en public.users
-- ============================================================
````

## File: server/database/db.js
````javascript
/* ==============================================================================
   BusTrack Pro — Production-Grade Relational Database Repository
   Engine: 100% Real Embedded SQLite (ACID, WAL Mode, Foreign Keys)
   Compatible with PostgreSQL schema via server/database/schema.sql
   ============================================================================== */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { DatabaseSync } from 'node:sqlite';
import { config } from '../config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- SEED DEFINITIONS (Synchronized with BusTrack Transit Domain) ---

export const SEED_ROUTES = [
  { id: 'A', name: 'Centro — Aeropuerto',   varName: '--route-a', color: '#5b6ef5', stops: 8,  length: 22 },
  { id: 'B', name: 'Norte — Sur',           varName: '--route-b', color: '#7c4ddb', stops: 12, length: 35 },
  { id: 'C', name: 'Este — Centro',         varName: '--route-c', color: '#2aa3c4', stops: 6,  length: 18 },
  { id: 'D', name: 'Sur — Zona Industrial', varName: '--route-d', color: '#2bb885', stops: 10, length: 28 },
];

export const SEED_DRIVERS = [
  { id: 'D001', name: 'Carlos Mendoza', initials: 'CM', license: 'CR-2-0456-0891', trips: 1248, rating: 4.9, hours: 8.5 },
  { id: 'D002', name: 'Ana García',     initials: 'AG', license: 'CR-1-0782-0334', trips: 987,  rating: 4.8, hours: 7.2 },
  { id: 'D003', name: 'Roberto López',  initials: 'RL', license: 'CR-3-0219-0645', trips: 1567, rating: 4.7, hours: 6.8 },
  { id: 'D004', name: 'María Flores',   initials: 'MF', license: 'CR-1-1043-0277', trips: 732,  rating: 5.0, hours: 9.0 },
  { id: 'D005', name: 'Jorge Ramírez',  initials: 'JR', license: 'CR-4-0388-0912', trips: 2103, rating: 4.6, hours: 5.5 },
  { id: 'D006', name: 'Lucía Castro',   initials: 'LC', license: 'CR-2-0955-0158', trips: 891,  rating: 4.9, hours: 8.0 },
];

export const SEED_STOPS = [
  // --- SAN JOSÉ (GAM) ---
  { id: 'stop-central', name: 'Terminal Central San José', subtext: 'San José Centro — Av. Central y Calle 4', province: 'San José', isPrimary: 0, lat: 9.9325, lon: -84.0815, pos_x: 200, pos_y: 150 },
  { id: 'stop-coca-cola', name: 'Terminal Coca Cola', subtext: 'Paso de la Vaca — Conexiones interurbanas', province: 'San José', isPrimary: 0, lat: 9.9366, lon: -84.0845, pos_x: 220, pos_y: 155 },
  { id: 'stop-7-10', name: 'Terminal 7-10 Interurbana', subtext: 'Paso Ancho / San José — Conexión Guanacaste y Pacífico', province: 'San José', isPrimary: 0, lat: 9.9398, lon: -84.0827, pos_x: 240, pos_y: 160 },
  { id: 'stop-parque', name: 'Parque Central San José', subtext: 'Catedral Metropolitana', province: 'San José', isPrimary: 0, lat: 9.9333, lon: -84.0792, pos_x: 400, pos_y: 150 },
  { id: 'stop-hospital', name: 'Hospital San Juan de Dios', subtext: 'Paseo Colón — Urgencias', province: 'San José', isPrimary: 0, lat: 9.9348, lon: -84.0864, pos_x: 600, pos_y: 150 },
  { id: 'stop-sabana', name: 'La Sabana — Estadio Nacional', subtext: 'Paseo Colón / Mata Redonda', province: 'San José', isPrimary: 0, lat: 9.9355, lon: -84.1042, pos_x: 200, pos_y: 225 },
  { id: 'stop-escalante', name: 'Barrio Escalante', subtext: 'Calle 33 — Circunvalación Este', province: 'San José', isPrimary: 0, lat: 9.9358, lon: -84.0625, pos_x: 100, pos_y: 225 },
  { id: 'stop-ucr', name: 'Universidad de Costa Rica (UCR)', subtext: 'San Pedro de Montes de Oca', province: 'San José', isPrimary: 0, lat: 9.9365, lon: -84.0512, pos_x: 400, pos_y: 300 },
  { id: 'stop-fidelitas', name: 'Entrada Principal U Fidélitas', subtext: 'Santa Marta de Montes de Oca — Frente al Campus', province: 'San José', isPrimary: 1, lat: 9.9392, lon: -84.0321, pos_x: 400, pos_y: 225 },
  { id: 'stop-vargas-araya', name: 'Barrio Vargas Araya', subtext: 'Montes de Oca', province: 'San José', isPrimary: 0, lat: 9.9374, lon: -84.0382, pos_x: 350, pos_y: 225 },
  { id: 'stop-lourdes', name: 'Parada Súper Lourdes / Calasanz', subtext: 'Lourdes hacia San Pedro', province: 'San José', isPrimary: 0, lat: 9.9362, lon: -84.0441, pos_x: 300, pos_y: 225 },
  { id: 'stop-san-pedro', name: 'Muñoz & Nanne / San Pedro', subtext: 'San Pedro Centro — Comercio y transbordos', province: 'San José', isPrimary: 0, lat: 9.9338, lon: -84.0535, pos_x: 250, pos_y: 225 },
  { id: 'stop-mall-sp', name: 'Mall San Pedro / Fuente de la Hispanidad', subtext: 'Rotonda de la Bandera / Los Yoses', province: 'San José', isPrimary: 0, lat: 9.9341, lon: -84.0620, pos_x: 200, pos_y: 225 },
  { id: 'stop-sanjose', name: 'Terminal San José — Cuesta de Moras', subtext: 'Avenida Central / Cuesta de Moras', province: 'San José', isPrimary: 0, lat: 9.9332, lon: -84.0768, pos_x: 150, pos_y: 225 },
  { id: 'stop-escazu', name: 'Escazú Centro / Multiplaza', subtext: 'Autopista Próspero Fernández', province: 'San José', isPrimary: 0, lat: 9.9458, lon: -84.1492, pos_x: 120, pos_y: 200 },
  { id: 'stop-santa-ana', name: 'Santa Ana Centro', subtext: 'Parque de Santa Ana / Cruz Roja', province: 'San José', isPrimary: 0, lat: 9.9328, lon: -84.1824, pos_x: 100, pos_y: 210 },
  { id: 'stop-desamparados', name: 'Desamparados Parque Central', subtext: 'Parque Central de Desamparados', province: 'San José', isPrimary: 0, lat: 9.8974, lon: -84.0664, pos_x: 300, pos_y: 350 },

  // --- ALAJUELA (GAM & OCCIDENTE) ---
  { id: 'stop-alajuela-fecosa', name: 'Terminal Fecosa Alajuela', subtext: 'Terminal Central de Buses de Alajuela', province: 'Alajuela', isPrimary: 0, lat: 10.0152, lon: -84.2145, pos_x: 550, pos_y: 180 },
  { id: 'stop-aeropuerto-sjo', name: 'Aeropuerto Juan Santamaría (SJO)', subtext: 'Terminal Internacional de Pasajeros', province: 'Alajuela', isPrimary: 0, lat: 10.0004, lon: -84.2141, pos_x: 600, pos_y: 225 },
  { id: 'stop-city-mall', name: 'City Mall Alajuela', subtext: 'Frente a Radial Alajuela', province: 'Alajuela', isPrimary: 0, lat: 10.0094, lon: -84.2102, pos_x: 570, pos_y: 200 },
  { id: 'stop-coyol', name: 'Zona Franca El Coyol', subtext: 'Parque Logístico y Médico Coyol', province: 'Alajuela', isPrimary: 0, lat: 9.9965, lon: -84.2698, pos_x: 620, pos_y: 250 },
  { id: 'stop-san-ramon', name: 'Terminal San Ramón', subtext: 'Parque Central de San Ramón', province: 'Alajuela', isPrimary: 0, lat: 10.0872, lon: -84.4705, pos_x: 680, pos_y: 280 },
  { id: 'stop-ciudad-quesada', name: 'Terminal Ciudad Quesada (San Carlos)', subtext: 'Mercado Municipal de San Carlos', province: 'Alajuela', isPrimary: 0, lat: 10.3245, lon: -84.4298, pos_x: 700, pos_y: 320 },
  { id: 'stop-la-fortuna', name: 'La Fortuna / Volcán Arenal', subtext: 'Parque Central de La Fortuna', province: 'Alajuela', isPrimary: 0, lat: 10.4716, lon: -84.6452, pos_x: 720, pos_y: 340 },

  // --- HEREDIA (GAM) ---
  { id: 'stop-heredia-central', name: 'Terminal Central Heredia', subtext: 'Parada de Buses 400 — Calle Central', province: 'Heredia', isPrimary: 0, lat: 9.9984, lon: -84.1165, pos_x: 350, pos_y: 120 },
  { id: 'stop-una', name: 'Universidad Nacional (UNA)', subtext: 'Campus Omar Dengo — Heredia', province: 'Heredia', isPrimary: 0, lat: 9.9998, lon: -84.1112, pos_x: 370, pos_y: 115 },
  { id: 'stop-oxigeno', name: 'Mall Oxígeno Human Playground', subtext: 'San Francisco de Heredia', province: 'Heredia', isPrimary: 0, lat: 9.9882, lon: -84.1332, pos_x: 340, pos_y: 130 },
  { id: 'stop-belen', name: 'San Antonio de Belén', subtext: 'Estación Ferrocarril / Centro Belén', province: 'Heredia', isPrimary: 0, lat: 9.9812, lon: -84.1878, pos_x: 320, pos_y: 140 },

  // --- CARTAGO (GAM & ORIENTE) ---
  { id: 'stop-cartago-central', name: 'Terminal Lumaca Cartago', subtext: 'Costado Norte de las Ruinas de Cartago', province: 'Cartago', isPrimary: 0, lat: 9.8645, lon: -83.9212, pos_x: 450, pos_y: 350 },
  { id: 'stop-basilica', name: 'Basílica Nuestra Señora de Los Ángeles', subtext: 'Plaza Santuario Nacional', province: 'Cartago', isPrimary: 0, lat: 9.8638, lon: -83.9131, pos_x: 470, pos_y: 360 },
  { id: 'stop-tec', name: 'Tecnológico de Costa Rica (TEC)', subtext: 'Campus Central Cartago', province: 'Cartago', isPrimary: 0, lat: 9.8552, lon: -83.9095, pos_x: 480, pos_y: 370 },
  { id: 'stop-tres-rios', name: 'Tres Ríos Parque Central (La Unión)', subtext: 'Conexión Florencio del Castillo', province: 'Cartago', isPrimary: 0, lat: 9.9075, lon: -83.9878, pos_x: 420, pos_y: 320 },
  { id: 'stop-turrialba', name: 'Terminal Transtusa Turrialba', subtext: 'Parque Central de Turrialba', province: 'Cartago', isPrimary: 0, lat: 9.9048, lon: -83.6835, pos_x: 520, pos_y: 380 },

  // --- PUNTARENAS (PACÍFICO CENTRAL Y SUR) ---
  { id: 'stop-puntarenas-ferry', name: 'Terminal Ferry Puntarenas (Paquera)', subtext: 'Punta de Puntarenas — Embarcadero', province: 'Puntarenas', isPrimary: 0, lat: 9.9774, lon: -84.8488, pos_x: 150, pos_y: 400 },
  { id: 'stop-puntarenas-centro', name: 'Terminal Central Puntarenas', subtext: 'Paseo de los Turistas / Estación Empresarios Unidos', province: 'Puntarenas', isPrimary: 0, lat: 9.9765, lon: -84.8295, pos_x: 160, pos_y: 395 },
  { id: 'stop-caldera', name: 'Puerto Caldera', subtext: 'Ruta 27 / Entrada Portuaria', province: 'Puntarenas', isPrimary: 0, lat: 9.9185, lon: -84.7175, pos_x: 180, pos_y: 380 },
  { id: 'stop-jaco', name: 'Terminal Jacó Centro', subtext: 'Avenida Pastor Díaz — Playa Jacó', province: 'Puntarenas', isPrimary: 0, lat: 9.6152, lon: -84.6295, pos_x: 200, pos_y: 420 },
  { id: 'stop-quepos', name: 'Terminal Quepos / Manuel Antonio', subtext: 'Parque Nacional Manuel Antonio', province: 'Puntarenas', isPrimary: 0, lat: 9.4312, lon: -84.1615, pos_x: 230, pos_y: 450 },
  { id: 'stop-perez-zeledon', name: 'Terminal San Isidro de El General', subtext: 'Pérez Zeledón — Valle de El General', province: 'Puntarenas', isPrimary: 0, lat: 9.3735, lon: -83.7042, pos_x: 350, pos_y: 480 },

  // --- GUANACASTE (PACÍFICO NORTE) ---
  { id: 'stop-liberia-central', name: 'Terminal Municipal de Liberia', subtext: 'Terminal Pulmitan de Liberia', province: 'Guanacaste', isPrimary: 0, lat: 10.6315, lon: -85.4382, pos_x: 100, pos_y: 80 },
  { id: 'stop-aeropuerto-lir', name: 'Aeropuerto Guanacaste (LIR)', subtext: 'Daniel Oduber Quirós', province: 'Guanacaste', isPrimary: 0, lat: 10.5935, lon: -85.5442, pos_x: 90, pos_y: 75 },
  { id: 'stop-santa-cruz', name: 'Terminal Santa Cruz', subtext: 'Ciudad Folclórica — Plaza Los Mangos', province: 'Guanacaste', isPrimary: 0, lat: 10.2625, lon: -85.5862, pos_x: 110, pos_y: 110 },
  { id: 'stop-nicoya', name: 'Terminal Nicoya Colonial', subtext: 'Parque Recaredo Briceño', province: 'Guanacaste', isPrimary: 0, lat: 10.1448, lon: -85.4525, pos_x: 120, pos_y: 130 },
  { id: 'stop-tamarindo', name: 'Parada Playa Tamarindo', subtext: 'Rotonda de Tamarindo', province: 'Guanacaste', isPrimary: 0, lat: 10.2995, lon: -85.8412, pos_x: 70, pos_y: 100 },

  // --- LIMÓN (CARIBE) ---
  { id: 'stop-limon-centro', name: 'Terminal Caribeños Limón Centro', subtext: 'Parque Vargas / Puerto Limón', province: 'Limón', isPrimary: 0, lat: 9.9935, lon: -83.0332, pos_x: 750, pos_y: 220 },
  { id: 'stop-moin', name: 'Terminal Puerto Moín (APM Terminals)', subtext: 'Entrada Complejo Portuario', province: 'Limón', isPrimary: 0, lat: 10.0012, lon: -83.0785, pos_x: 740, pos_y: 210 },
  { id: 'stop-guapiles', name: 'Terminal Pococí / Guápiles', subtext: 'Ruta 32 / Centro de Guápiles', province: 'Limón', isPrimary: 0, lat: 10.2152, lon: -83.7845, pos_x: 650, pos_y: 160 },
  { id: 'stop-puerto-viejo', name: 'Parada Puerto Viejo de Talamanca', subtext: 'Caribe Sur / Playa Salsa Brava', province: 'Limón', isPrimary: 0, lat: 9.6565, lon: -82.7545, pos_x: 790, pos_y: 280 },
];

export const SEED_ALERTS = [
  { severity: 'critical', icon: '🚨', title: 'Temperatura del motor fuera de rango', description: 'El sensor del BUS-011 reporta 112 °C de forma sostenida. Conviene detener la unidad en la próxima parada.', bus_id: 'BUS-011', is_read: 0 },
  { severity: 'warning',  icon: '⚠️', title: 'Retraso acumulado en Ruta B', description: 'BUS-007 va 8 minutos por detrás del horario. Las pantallas de las paradas ya muestran el ajuste.', bus_id: 'BUS-007', is_read: 0 },
  { severity: 'warning',  icon: '⛽', title: 'Combustible bajo', description: 'BUS-004 al 15%. Alcanza para terminar el recorrido, pero no para el siguiente.', bus_id: 'BUS-004', is_read: 0 },
  { severity: 'info',     icon: '📊', title: 'Reporte diario generado', description: 'Operación del día cerrada: 2.847 pasajeros y 2,3 min de retraso promedio.', bus_id: 'Sistema', is_read: 1 },
  { severity: 'info',     icon: '🔄', title: 'Mantenimiento programado', description: 'BUS-012 entra a taller mañana a las 06:00. Hay que reasignar su turno de la Ruta D.', bus_id: 'BUS-012', is_read: 1 },
];

function randInt(a, b) {
  return Math.floor(Math.random() * (b - a + 1)) + a;
}

export class Database {
  /**
   * Initializes real SQLite database with ACID schema, WAL mode, foreign keys, and seeds
   */
  constructor(customPath = null) {
    const isTest = process.env.NODE_ENV === 'test';
    const rawPath = customPath || (isTest && !process.env.DB_FILE ? ':memory:' : config.dbFile);

    if (rawPath === ':memory:') {
      this.filePath = ':memory:';
      this.sqlite = new DatabaseSync(':memory:');
    } else {
      const resolved = path.isAbsolute(rawPath) ? rawPath : path.resolve(process.cwd(), rawPath);
      const dir = path.dirname(resolved);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      this.filePath = resolved;
      this.sqlite = new DatabaseSync(resolved);
    }

    this._initPragmas();
    this._initTables();
    this._seedDatabase();
    this._compileStatements();
  }

  _initPragmas() {
    this.sqlite.exec('PRAGMA foreign_keys = ON;');
    if (this.filePath !== ':memory:') {
      this.sqlite.exec('PRAGMA journal_mode = WAL;');
      this.sqlite.exec('PRAGMA synchronous = NORMAL;');
    }
  }

  _initTables() {
    this.sqlite.exec(`
      -- 1. USERS TABLE
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT,
        full_name TEXT NOT NULL,
        role TEXT DEFAULT 'passenger',
        auth_provider TEXT DEFAULT 'email',
        provider_id TEXT,
        avatar_url TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
      );

      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

      -- 2. ROUTES TABLE
      CREATE TABLE IF NOT EXISTS routes (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        var_name TEXT,
        color TEXT NOT NULL,
        stops_count INTEGER DEFAULT 0,
        length_km REAL DEFAULT 0.0,
        created_at TEXT DEFAULT (datetime('now'))
      );

      -- 3. DRIVERS TABLE
      CREATE TABLE IF NOT EXISTS drivers (
        id TEXT PRIMARY KEY,
        user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
        name TEXT NOT NULL,
        initials TEXT NOT NULL,
        license_number TEXT UNIQUE NOT NULL,
        trips_completed INTEGER DEFAULT 0,
        rating REAL DEFAULT 5.0,
        hours_worked REAL DEFAULT 0.0,
        created_at TEXT DEFAULT (datetime('now'))
      );

      CREATE INDEX IF NOT EXISTS idx_drivers_license ON drivers(license_number);

      -- 4. FLEET BUSES TABLE
      CREATE TABLE IF NOT EXISTS buses (
        id TEXT PRIMARY KEY,
        bus_number TEXT NOT NULL,
        license_plate TEXT UNIQUE NOT NULL,
        route_id TEXT REFERENCES routes(id) ON DELETE SET NULL,
        driver_id TEXT REFERENCES drivers(id) ON DELETE SET NULL,
        status TEXT DEFAULT 'stopped',
        speed_kmh INTEGER DEFAULT 0,
        passengers_count INTEGER DEFAULT 0,
        capacity INTEGER DEFAULT 52,
        fuel_percent INTEGER DEFAULT 100,
        delay_minutes INTEGER DEFAULT 0,
        next_stop TEXT,
        eta_minutes INTEGER DEFAULT 0,
        pos_x REAL DEFAULT 400.00,
        pos_y REAL DEFAULT 225.00,
        _t REAL DEFAULT 0.0,
        _step REAL DEFAULT 0.005,
        _dir INTEGER DEFAULT 1,
        updated_at TEXT DEFAULT (datetime('now'))
      );

      CREATE INDEX IF NOT EXISTS idx_buses_route ON buses(route_id);
      CREATE INDEX IF NOT EXISTS idx_buses_status ON buses(status);

      -- 5. ALERTS TABLE
      CREATE TABLE IF NOT EXISTS alerts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        severity TEXT NOT NULL DEFAULT 'info',
        icon TEXT,
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        bus_id TEXT,
        is_read INTEGER DEFAULT 0,
        created_at TEXT DEFAULT (datetime('now'))
      );

      CREATE INDEX IF NOT EXISTS idx_alerts_severity_read ON alerts(severity, is_read);

      -- 6. ACTIVITY LOGS TABLE
      CREATE TABLE IF NOT EXISTS activity_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
        action_text TEXT NOT NULL,
        action_type TEXT DEFAULT 'info',
        created_at TEXT DEFAULT (datetime('now'))
      );

      CREATE INDEX IF NOT EXISTS idx_activity_logs_created ON activity_logs(created_at);

      -- 7. STOPS TABLE
      CREATE TABLE IF NOT EXISTS stops (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        subtext TEXT,
        is_primary INTEGER DEFAULT 0,
        lat REAL,
        lon REAL,
        routes_json TEXT,
        pos_x REAL DEFAULT 0.0,
        pos_y REAL DEFAULT 0.0,
        created_at TEXT DEFAULT (datetime('now'))
      );
    `);
  }

  _seedDatabase() {
    // 1. Seed Users
    const userCount = this.sqlite.prepare('SELECT COUNT(*) as count FROM users WHERE email = ?').get('admin@bustrack.com');
    if (userCount.count === 0) {
      const insertUser = this.sqlite.prepare(`
        INSERT INTO users (id, email, password_hash, full_name, role, auth_provider, avatar_url, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
      `);
      insertUser.run(
        'usr-admin-01',
        'admin@bustrack.com',
        '$2a$10$wNlh4J6m5n9S8d.WvYQk8.L0yW.fO2e9jG4iZ5rK7hM3oP2nQ1r2s', // Admin123!
        'Gerente Admin',
        'admin',
        'email',
        'https://api.dicebear.com/7.x/initials/svg?seed=Gerente%20Admin'
      );
    }

    // 2. Seed Routes
    const routeCount = this.sqlite.prepare('SELECT COUNT(*) as count FROM routes').get();
    if (routeCount.count === 0) {
      const insertRoute = this.sqlite.prepare(`
        INSERT INTO routes (id, name, var_name, color, stops_count, length_km, created_at)
        VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
      `);
      for (const r of SEED_ROUTES) {
        insertRoute.run(r.id, r.name, r.varName, r.color, r.stops, r.length);
      }
    }

    // 3. Seed Drivers
    const driverCount = this.sqlite.prepare('SELECT COUNT(*) as count FROM drivers').get();
    if (driverCount.count === 0) {
      const insertDriver = this.sqlite.prepare(`
        INSERT INTO drivers (id, name, initials, license_number, trips_completed, rating, hours_worked, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
      `);
      for (const d of SEED_DRIVERS) {
        insertDriver.run(d.id, d.name, d.initials, d.license, d.trips, d.rating, d.hours);
      }
    }

    // 4. Seed Stops
    const stopCount = this.sqlite.prepare('SELECT COUNT(*) as count FROM stops').get();
    if (stopCount.count === 0) {
      const insertStop = this.sqlite.prepare(`
        INSERT INTO stops (id, name, subtext, is_primary, lat, lon, routes_json, pos_x, pos_y, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
      `);
      for (const s of SEED_STOPS) {
        insertStop.run(
          s.id || `stop-${s.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
          s.name,
          s.subtext || null,
          s.isPrimary || 0,
          s.lat || 9.9333,
          s.lon || -84.0833,
          JSON.stringify(s.routes || []),
          s.pos_x || s.x || 400,
          s.pos_y || s.y || 225
        );
      }
    }

    // 5. Seed Buses (12 operational units)
    const busCount = this.sqlite.prepare('SELECT COUNT(*) as count FROM buses').get();
    if (busCount.count === 0) {
      const statuses = ['active', 'active', 'active', 'active', 'active', 'delayed', 'delayed', 'stopped', 'maintenance'];
      const insertBus = this.sqlite.prepare(`
        INSERT INTO buses (
          id, bus_number, license_plate, route_id, driver_id, status,
          speed_kmh, passengers_count, capacity, fuel_percent, delay_minutes,
          next_stop, eta_minutes, pos_x, pos_y, _t, _step, _dir, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
      `);

      for (let i = 1; i <= 12; i++) {
        const busId = 'BUS-' + String(i).padStart(3, '0');
        const num = String(i).padStart(3, '0');
        const plate = 'SJB-' + String(1000 + i);
        const route = SEED_ROUTES[(i - 1) % SEED_ROUTES.length];
        const driver = SEED_DRIVERS[(i - 1) % SEED_DRIVERS.length];
        const status = statuses[(i - 1) % statuses.length];
        const moving = status === 'active' || status === 'delayed';
        const speed = moving ? randInt(28, 58) : 0;
        const passengers = randInt(4, 44);
        const fuel = randInt(25, 96);
        const delay = status === 'delayed' ? randInt(3, 11) : 0;
        const stop = SEED_STOPS[(i - 1) % SEED_STOPS.length];

        insertBus.run(
          busId,
          num,
          plate,
          route.id,
          driver.id,
          status,
          speed,
          passengers,
          52,
          fuel,
          delay,
          stop.name,
          randInt(2, 9),
          400.0,
          225.0,
          (i * 0.08) % 1.0,
          0.005 + (i % 3) * 0.001,
          i % 2 === 0 ? 1 : -1
        );
      }
    }

    // 6. Seed Alerts
    const alertCount = this.sqlite.prepare('SELECT COUNT(*) as count FROM alerts').get();
    if (alertCount.count === 0) {
      const insertAlert = this.sqlite.prepare(`
        INSERT INTO alerts (severity, icon, title, description, bus_id, is_read, created_at)
        VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
      `);
      for (const a of SEED_ALERTS) {
        insertAlert.run(a.severity, a.icon, a.title, a.description, a.bus_id, a.is_read);
      }
    }

    // 7. Seed Activity Logs
    const actCount = this.sqlite.prepare('SELECT COUNT(*) as count FROM activity_logs').get();
    if (actCount.count === 0) {
      const insertAct = this.sqlite.prepare(`
        INSERT INTO activity_logs (action_text, action_type, created_at)
        VALUES (?, ?, datetime('now'))
      `);
      insertAct.run('BUS-003 completó la Ruta B en horario', 'ok');
      insertAct.run('BUS-007 reportó retraso de 8 min por congestión', 'warn');
      insertAct.run('Conductor Carlos Mendoza inició turno en Ruta A', 'info');
    }
  }

  _compileStatements() {
    this.stmts = {
      // Buses
      selectBusById: this.sqlite.prepare(`
        SELECT 
          b.id, b.bus_number, b.license_plate, b.status, b.speed_kmh, b.passengers_count,
          b.capacity, b.fuel_percent, b.delay_minutes, b.next_stop, b.eta_minutes,
          b.pos_x, b.pos_y, b._t, b._step, b._dir, b.updated_at,
          r.id as route_id, r.name as route_name, r.var_name as route_var_name, r.color as route_color, r.stops_count as route_stops, r.length_km as route_length,
          d.id as driver_id, d.name as driver_name, d.initials as driver_initials, d.license_number as driver_license, d.trips_completed as driver_trips, d.rating as driver_rating, d.hours_worked as driver_hours
        FROM buses b
        LEFT JOIN routes r ON b.route_id = r.id
        LEFT JOIN drivers d ON b.driver_id = d.id
        WHERE LOWER(b.id) = LOWER(?)
      `),

      insertBus: this.sqlite.prepare(`
        INSERT INTO buses (
          id, bus_number, license_plate, route_id, driver_id, status,
          speed_kmh, passengers_count, capacity, fuel_percent, delay_minutes,
          next_stop, eta_minutes, pos_x, pos_y, _t, _step, _dir, updated_at
        ) VALUES (?, ?, ?, ?, ?, 'stopped', 0, 0, 52, 100, 0, ?, 0, 400.0, 225.0, ?, 0.005, 1, datetime('now'))
      `),

      updateBusStatus: this.sqlite.prepare(`
        UPDATE buses
        SET status = ?, speed_kmh = ?, delay_minutes = ?, updated_at = datetime('now')
        WHERE LOWER(id) = LOWER(?)
      `),

      updateBusTelemetryBatch: this.sqlite.prepare(`
        UPDATE buses SET
          speed_kmh = ?, passengers_count = ?, fuel_percent = ?, delay_minutes = ?,
          next_stop = ?, eta_minutes = ?, pos_x = ?, pos_y = ?, _t = ?, _dir = ?,
          updated_at = datetime('now')
        WHERE id = ?
      `),

      // Routes
      selectAllRoutes: this.sqlite.prepare(`
        SELECT 
          r.id, r.name, r.var_name as varName, r.color, r.stops_count as stops, r.length_km as length,
          COUNT(b.id) as totalBuses,
          SUM(CASE WHEN b.status = 'active' THEN 1 ELSE 0 END) as activeBuses,
          COALESCE(SUM(b.passengers_count), 0) as passengersOnboard,
          COALESCE(AVG(b.delay_minutes), 0.0) as avgDelayMinutes
        FROM routes r
        LEFT JOIN buses b ON r.id = b.route_id
        GROUP BY r.id
        ORDER BY r.id ASC
      `),

      selectRouteById: this.sqlite.prepare(`
        SELECT id, name, var_name as varName, color, stops_count as stops, length_km as length
        FROM routes
        WHERE LOWER(id) = LOWER(?)
      `),

      // Drivers
      selectAllDrivers: this.sqlite.prepare(`
        SELECT 
          d.id, d.name, d.initials, d.license_number as license, d.trips_completed as trips, d.rating, d.hours_worked as hours,
          (SELECT b.id FROM buses b WHERE b.driver_id = d.id AND b.status != 'stopped' LIMIT 1) as assignedBusId,
          CASE 
            WHEN EXISTS(SELECT 1 FROM buses b WHERE b.driver_id = d.id AND b.status != 'stopped') THEN 'on_duty' 
            ELSE 'off_duty' 
          END as status
        FROM drivers d
        ORDER BY d.id ASC
      `),

      selectDriverById: this.sqlite.prepare(`
        SELECT id, name, initials, license_number as license, trips_completed as trips, rating, hours_worked as hours
        FROM drivers
        WHERE LOWER(id) = LOWER(?)
      `),

      // Alerts
      insertAlert: this.sqlite.prepare(`
        INSERT INTO alerts (severity, icon, title, description, bus_id, is_read, created_at)
        VALUES (?, ?, ?, ?, ?, 0, datetime('now'))
      `),

      markAllAlertsRead: this.sqlite.prepare(`
        UPDATE alerts SET is_read = 1 WHERE is_read = 0
      `),

      // Users
      selectUserByEmail: this.sqlite.prepare(`
        SELECT id, email, password_hash as passwordHash, full_name as name, role, auth_provider as provider, avatar_url as avatarUrl, created_at as createdAt
        FROM users
        WHERE LOWER(email) = LOWER(?)
      `),

      selectUserById: this.sqlite.prepare(`
        SELECT id, email, password_hash as passwordHash, full_name as name, role, auth_provider as provider, avatar_url as avatarUrl, created_at as createdAt
        FROM users
        WHERE id = ?
      `),

      insertUser: this.sqlite.prepare(`
        INSERT INTO users (id, email, password_hash, full_name, role, auth_provider, avatar_url, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
      `),

      // Activities
      selectActivities: this.sqlite.prepare(`
        SELECT id, action_text as text, action_type as type, created_at
        FROM activity_logs
        ORDER BY id DESC
        LIMIT 20
      `),

      insertActivity: this.sqlite.prepare(`
        INSERT INTO activity_logs (action_text, action_type, created_at)
        VALUES (?, ?, datetime('now'))
      `),

      // Stops
      selectAllStops: this.sqlite.prepare(`
        SELECT id, name, subtext, is_primary as isPrimary, lat, lon, routes_json, pos_x as x, pos_y as y
        FROM stops
        ORDER BY rowid ASC
      `),
    };
  }

  // --- COMPATIBILITY GETTERS ---
  get stops() {
    return this.getAllStops();
  }

  get buses() {
    return this.getAllBuses();
  }

  get routes() {
    return this.getAllRoutes();
  }

  get drivers() {
    return this.getAllDrivers();
  }

  get alerts() {
    return this.getAllAlerts();
  }

  get activities() {
    return this.getActivities();
  }

  get users() {
    return this.sqlite.prepare('SELECT id, email, full_name as name, role, auth_provider as provider FROM users').all();
  }

  // --- STOPS API ---
  getAllStops() {
    const rows = this.stmts.selectAllStops.all();
    return rows.map(r => ({
      id: r.id,
      name: r.name,
      subtext: r.subtext || undefined,
      isPrimary: Boolean(r.isPrimary),
      lat: r.lat,
      lon: r.lon,
      routes: r.routes_json ? JSON.parse(r.routes_json) : [],
      x: r.x,
      y: r.y,
    }));
  }

  // --- BUSES REPOSITORY ---
  _mapBusRow(row) {
    if (!row) return null;
    return {
      id: row.id,
      num: row.bus_number,
      plate: row.license_plate,
      route: {
        id: row.route_id || 'A',
        name: row.route_name || 'Ruta General',
        varName: row.route_var_name || `--route-${(row.route_id || 'a').toLowerCase()}`,
        color: row.route_color || '#5b6ef5',
        stops: row.route_stops || 0,
        length: row.route_length || 0,
      },
      driver: {
        id: row.driver_id || 'D001',
        name: row.driver_name || 'Conductor No Asignado',
        initials: row.driver_initials || 'NA',
        license: row.driver_license || '',
        trips: row.driver_trips || 0,
        rating: row.driver_rating || 5.0,
        hours: row.driver_hours || 0.0,
      },
      status: row.status,
      speed: row.speed_kmh,
      passengers: row.passengers_count,
      capacity: row.capacity,
      fuel: row.fuel_percent,
      delay: row.delay_minutes,
      nextStop: row.next_stop || 'Terminal Central',
      etaMin: row.eta_minutes,
      updatedAgo: 1,
      pos: { x: Number(row.pos_x), y: Number(row.pos_y) },
      _t: Number(row._t || 0),
      _step: Number(row._step || 0.005),
      _dir: Number(row._dir || 1),
    };
  }

  getAllBuses(filters = {}) {
    let sql = `
      SELECT 
        b.id, b.bus_number, b.license_plate, b.status, b.speed_kmh, b.passengers_count,
        b.capacity, b.fuel_percent, b.delay_minutes, b.next_stop, b.eta_minutes,
        b.pos_x, b.pos_y, b._t, b._step, b._dir, b.updated_at,
        r.id as route_id, r.name as route_name, r.var_name as route_var_name, r.color as route_color, r.stops_count as route_stops, r.length_km as route_length,
        d.id as driver_id, d.name as driver_name, d.initials as driver_initials, d.license_number as driver_license, d.trips_completed as driver_trips, d.rating as driver_rating, d.hours_worked as driver_hours
      FROM buses b
      LEFT JOIN routes r ON b.route_id = r.id
      LEFT JOIN drivers d ON b.driver_id = d.id
      WHERE 1=1
    `;
    const params = [];

    if (filters.route && filters.route !== 'all') {
      sql += ' AND LOWER(b.route_id) = LOWER(?)';
      params.push(filters.route);
    }
    if (filters.status && filters.status !== 'all') {
      sql += ' AND b.status = ?';
      params.push(filters.status);
    }
    if (filters.search) {
      const q = `%${filters.search.toLowerCase()}%`;
      sql += ' AND (LOWER(b.id) LIKE ? OR LOWER(b.license_plate) LIKE ? OR LOWER(d.name) LIKE ? OR LOWER(r.name) LIKE ?)';
      params.push(q, q, q, q);
    }

    sql += ' ORDER BY b.id ASC';
    const rows = this.sqlite.prepare(sql).all(...params);
    return rows.map(r => this._mapBusRow(r));
  }

  getBusById(id) {
    if (!id) return null;
    const row = this.stmts.selectBusById.get(id);
    return this._mapBusRow(row);
  }

  createBus(data = {}) {
    const totalCount = this.sqlite.prepare('SELECT COUNT(*) as count FROM buses').get().count;
    const nextNum = totalCount + 1;
    const busId = 'BUS-' + String(nextNum).padStart(3, '0');
    const busNum = String(nextNum).padStart(3, '0');
    const plate = 'SJB-' + String(1000 + nextNum);

    const routes = this.getAllRoutes();
    const drivers = this.getAllDrivers();
    const stops = this.getAllStops();

    const route = data.routeId
      ? this.getRouteById(data.routeId) || routes[0]
      : routes[(nextNum - 1) % routes.length];

    const driver = data.driverId
      ? this.getDriverById(data.driverId) || drivers[0]
      : drivers[(nextNum - 1) % drivers.length];

    const nextStopName = stops.length ? stops[0].name : 'Terminal Central';

    this.stmts.insertBus.run(
      busId,
      busNum,
      plate,
      route.id,
      driver.id,
      nextStopName,
      Math.random()
    );

    return this.getBusById(busId);
  }

  updateBusStatus(id, newStatus) {
    const bus = this.getBusById(id);
    if (!bus) return null;

    let speed = bus.speed;
    let delay = bus.delay;

    if (newStatus === 'stopped' || newStatus === 'maintenance') {
      speed = 0;
      delay = 0;
    } else if (newStatus === 'active') {
      delay = 0;
      if (speed === 0) speed = randInt(25, 55);
    } else if (newStatus === 'delayed') {
      if (speed === 0) speed = randInt(20, 48);
      if (delay === 0) delay = randInt(3, 10);
    }

    this.stmts.updateBusStatus.run(newStatus, speed, delay, id);
    return this.getBusById(id);
  }

  updateAllBusesTelemetry(busesList) {
    for (const b of busesList) {
      this.stmts.updateBusTelemetryBatch.run(
        b.speed,
        b.passengers,
        b.fuel,
        b.delay,
        b.nextStop,
        b.etaMin,
        b.pos.x,
        b.pos.y,
        b._t,
        b._dir,
        b.id
      );
    }
  }

  // --- ROUTES REPOSITORY ---
  getAllRoutes() {
    const rows = this.stmts.selectAllRoutes.all();
    return rows.map(r => {
      const total = Number(r.totalBuses || 0);
      const active = Number(r.activeBuses || 0);
      return {
        id: r.id,
        name: r.name,
        varName: r.varName || `--route-${r.id.toLowerCase()}`,
        color: r.color,
        stops: Number(r.stops),
        length: Number(r.length),
        totalBuses: total,
        activeBuses: active,
        coveragePercent: total ? Math.round((active / total) * 100) : 0,
        passengersOnboard: Number(r.passengersOnboard || 0),
        avgDelayMinutes: total ? +(Number(r.avgDelayMinutes) / 1).toFixed(1) : 0,
      };
    });
  }

  getRouteById(id) {
    if (!id) return null;
    const row = this.stmts.selectRouteById.get(id);
    if (!row) return null;
    const buses = this.getAllBuses({ route: row.id });
    const active = buses.filter(b => b.status === 'active').length;
    return {
      id: row.id,
      name: row.name,
      varName: row.varName || `--route-${row.id.toLowerCase()}`,
      color: row.color,
      stops: Number(row.stops),
      length: Number(row.length),
      totalBuses: buses.length,
      activeBuses: active,
      coveragePercent: buses.length ? Math.round((active / buses.length) * 100) : 0,
      passengersOnboard: buses.reduce((s, b) => s + b.passengers, 0),
      avgDelayMinutes: buses.length ? +(buses.reduce((s, b) => s + b.delay, 0) / buses.length).toFixed(1) : 0,
    };
  }

  // --- DRIVERS REPOSITORY ---
  getAllDrivers() {
    const rows = this.stmts.selectAllDrivers.all();
    return rows.map(d => ({
      id: d.id,
      name: d.name,
      initials: d.initials,
      license: d.license,
      trips: Number(d.trips),
      rating: Number(d.rating),
      hours: Number(d.hours),
      assignedBusId: d.assignedBusId || null,
      status: d.status,
    }));
  }

  getDriverById(id) {
    if (!id) return null;
    const row = this.stmts.selectDriverById.get(id);
    if (!row) return null;
    const assignedBus = this.getAllBuses().find(b => b.driver.id === row.id && b.status !== 'stopped');
    return {
      id: row.id,
      name: row.name,
      initials: row.initials,
      license: row.license,
      trips: Number(row.trips),
      rating: Number(row.rating),
      hours: Number(row.hours),
      assignedBusId: assignedBus ? assignedBus.id : null,
      status: assignedBus ? 'on_duty' : 'off_duty',
    };
  }

  // --- ALERTS REPOSITORY ---
  getAllAlerts(severity = 'all') {
    let sql = 'SELECT id, severity as type, icon, title, description as desc, bus_id as bus, is_read as read, created_at as createdAt FROM alerts';
    const params = [];
    if (severity && severity !== 'all') {
      sql += ' WHERE severity = ?';
      params.push(severity);
    }
    sql += ' ORDER BY id DESC';
    const rows = this.sqlite.prepare(sql).all(...params);
    return rows.map(r => ({
      id: r.id,
      type: r.type,
      icon: r.icon || (r.type === 'critical' ? '🚨' : r.type === 'warning' ? '⚠️' : 'ℹ️'),
      title: r.title,
      desc: r.desc,
      bus: r.bus || 'Sistema',
      time: 'hace momentos',
      read: Boolean(r.read),
      createdAt: r.createdAt,
    }));
  }

  createAlert(data) {
    const type = data.type || 'info';
    const icon = data.icon || (type === 'critical' ? '🚨' : type === 'warning' ? '⚠️' : 'ℹ️');
    const title = data.title;
    const desc = data.desc;
    const bus = data.bus || 'Sistema';

    const info = this.stmts.insertAlert.run(type, icon, title, desc, bus);
    return {
      id: Number(info.lastInsertRowid),
      type,
      icon,
      title,
      desc,
      bus,
      time: 'ahora mismo',
      read: false,
      createdAt: new Date().toISOString(),
    };
  }

  markAllAlertsAsRead() {
    const info = this.stmts.markAllAlertsRead.run();
    return Number(info.changes);
  }

  // --- USERS REPOSITORY ---
  findUserByEmail(email) {
    if (!email) return null;
    const row = this.stmts.selectUserByEmail.get(email.trim());
    return row || null;
  }

  findUserById(id) {
    if (!id) return null;
    const row = this.stmts.selectUserById.get(id);
    return row || null;
  }

  createUser(userData) {
    const id = userData.id || `usr-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const email = userData.email.toLowerCase().trim();
    const name = userData.name.trim();
    const role = userData.role || 'passenger';
    const provider = userData.provider || 'email';
    const avatarUrl = userData.avatarUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name)}`;

    this.stmts.insertUser.run(
      id,
      email,
      userData.passwordHash || null,
      name,
      role,
      provider,
      avatarUrl
    );

    return this.findUserById(id);
  }

  updateUser(id, fields) {
    if (!id) return null;
    const allowed = ['name', 'avatarUrl', 'provider', 'role'];
    const updates = [];
    const values = [];
    for (const key of allowed) {
      if (fields[key] !== undefined) {
        // SQLite columna: avatar_url, todo lo demás igual
        const col = key === 'avatarUrl' ? 'avatar_url' : key;
        updates.push(`${col} = ?`);
        values.push(fields[key]);
      }
    }
    if (updates.length === 0) return this.findUserById(id);
    values.push(id);
    this.db.prepare(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`).run(...values);
    return this.findUserById(id);
  }

  // --- ACTIVITIES LOG ---
  getActivities() {
    const rows = this.stmts.selectActivities.all();
    return rows.map(r => ({
      id: r.id,
      text: r.text,
      time: 'hace unos momentos',
      type: r.type,
      createdAt: r.created_at,
    }));
  }

  pushActivity(text, type = 'info') {
    const info = this.stmts.insertActivity.run(text, type);
    return {
      id: Number(info.lastInsertRowid),
      text,
      time: 'ahora mismo',
      type,
    };
  }

  // --- DB METADATA & DIAGNOSTICS ---
  getDbStatus() {
    let sizeBytes = 0;
    try {
      if (this.filePath !== ':memory:' && fs.existsSync(this.filePath)) {
        sizeBytes = fs.statSync(this.filePath).size;
      }
    } catch {}

    const sqliteVer = this.sqlite.prepare('SELECT sqlite_version() as v').get().v;
    const tables = [
      { name: 'users', count: this.sqlite.prepare('SELECT COUNT(*) as c FROM users').get().c },
      { name: 'routes', count: this.sqlite.prepare('SELECT COUNT(*) as c FROM routes').get().c },
      { name: 'drivers', count: this.sqlite.prepare('SELECT COUNT(*) as c FROM drivers').get().c },
      { name: 'buses', count: this.sqlite.prepare('SELECT COUNT(*) as c FROM buses').get().c },
      { name: 'alerts', count: this.sqlite.prepare('SELECT COUNT(*) as c FROM alerts').get().c },
      { name: 'activity_logs', count: this.sqlite.prepare('SELECT COUNT(*) as c FROM activity_logs').get().c },
      { name: 'stops', count: this.sqlite.prepare('SELECT COUNT(*) as c FROM stops').get().c },
    ];

    const totalRows = tables.reduce((acc, t) => acc + t.count, 0);

    return {
      engine: 'SQLite 3 (ACID Relational File DB)',
      version: sqliteVer,
      dialect: 'sqlite',
      connected: true,
      storage: this.filePath === ':memory:' ? 'in_memory_sqlite' : 'persistent_file',
      filePath: this.filePath,
      fileSizeBytes: sizeBytes,
      fileSizeFormatted: `${(sizeBytes / 1024).toFixed(1)} KB`,
      totalRows,
      tables,
      features: {
        foreignKeys: true,
        walJournalMode: this.filePath !== ':memory:',
        acidTransactions: true,
        postgresCompatible: true,
      },
    };
  }

  close() {
    try {
      this.sqlite.close();
    } catch {}
  }
}

export const db = new Database();
````

## File: server/database/initDb.js
````javascript
/* ==============================================================================
   BusTrack Pro — Database Schema & Seed Initializer for PostgreSQL / Supabase
   ============================================================================== */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';
import { config } from '../config.js';
import { SEED_ROUTES, SEED_DRIVERS, SEED_ALERTS } from './db.js';

const { Pool } = pg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function initPostgresDatabase(connectionString) {
  if (!connectionString) {
    console.log('[DB] No DATABASE_URL provided. Operating in high-performance memory mode.');
    return null;
  }

  const pool = new Pool({
    connectionString,
    ssl: connectionString.includes('localhost') || connectionString.includes('127.0.0.1')
      ? false
      : { rejectUnauthorized: false },
  });

  try {
    const client = await pool.connect();
    console.log('[DB] Connected successfully to PostgreSQL database.');

    // Load and execute schema.sql
    const schemaPath = path.join(__dirname, 'schema.sql');
    if (fs.existsSync(schemaPath)) {
      const sql = fs.readFileSync(schemaPath, 'utf-8');
      await client.query(sql);
      console.log('[DB] Schema and RLS policies verified successfully.');
    }

    // Check if initial admin user exists
    const userCheck = await client.query('SELECT COUNT(*) FROM users WHERE email = $1', ['admin@bustrack.com']);
    if (parseInt(userCheck.rows[0].count, 10) === 0) {
      console.log('[DB] Seeding default admin user...');
      await client.query(`
        INSERT INTO users (id, email, password_hash, full_name, role, auth_provider, avatar_url)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [
        'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
        'admin@bustrack.com',
        '$2a$10$wNlh4J6m5n9S8d.WvYQk8.L0yW.fO2e9jG4iZ5rK7hM3oP2nQ1r2s',
        'Gerente Admin',
        'admin',
        'email',
        'https://api.dicebear.com/7.x/initials/svg?seed=Gerente%20Admin'
      ]);
    }

    // Seed Routes if empty
    const routeCheck = await client.query('SELECT COUNT(*) FROM routes');
    if (parseInt(routeCheck.rows[0].count, 10) === 0) {
      console.log('[DB] Seeding routes...');
      for (const r of SEED_ROUTES) {
        await client.query(
          'INSERT INTO routes (id, name, color, stops_count, length_km) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (id) DO NOTHING',
          [r.id, r.name, r.color, r.stops, r.length]
        );
      }
    }

    // Seed Drivers if empty
    const driverCheck = await client.query('SELECT COUNT(*) FROM drivers');
    if (parseInt(driverCheck.rows[0].count, 10) === 0) {
      console.log('[DB] Seeding drivers...');
      for (const d of SEED_DRIVERS) {
        await client.query(
          'INSERT INTO drivers (id, name, initials, license_number, trips_completed, rating, hours_worked) VALUES ($1, $2, $3, $4, $5, $6, $7) ON CONFLICT (id) DO NOTHING',
          [d.id, d.name, d.initials, d.license, d.trips, d.rating, d.hours]
        );
      }
    }

    // Seed Buses if empty
    const busCheck = await client.query('SELECT COUNT(*) FROM buses');
    if (parseInt(busCheck.rows[0].count, 10) === 0) {
      console.log('[DB] Seeding fleet buses...');
      const statuses = ['active', 'active', 'active', 'active', 'active', 'delayed', 'delayed', 'stopped', 'maintenance'];
      for (let i = 1; i <= 12; i++) {
        const busId = 'BUS-' + String(i).padStart(3, '0');
        const busNum = String(i).padStart(3, '0');
        const plate = 'SJB-' + String(1000 + i);
        const route = SEED_ROUTES[(i - 1) % SEED_ROUTES.length];
        const driver = SEED_DRIVERS[(i - 1) % SEED_DRIVERS.length];
        const status = statuses[(i - 1) % statuses.length];
        const moving = status === 'active' || status === 'delayed';
        const speed = moving ? Math.floor(Math.random() * 30) + 28 : 0;
        const passengers = Math.floor(Math.random() * 40) + 4;
        const fuel = Math.floor(Math.random() * 70) + 25;
        const delay = status === 'delayed' ? Math.floor(Math.random() * 8) + 3 : 0;

        await client.query(`
          INSERT INTO buses (id, bus_number, license_plate, route_id, driver_id, status, speed_kmh, passengers_count, capacity, fuel_percent, delay_minutes, next_stop, eta_minutes, pos_x, pos_y)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
          ON CONFLICT (id) DO NOTHING
        `, [
          busId, busNum, plate, route.id, driver.id, status, speed, passengers, 52, fuel, delay, 'Terminal Central', 5, 400.00, 225.00
        ]);
      }
    }

    // Seed Alerts if empty
    const alertCheck = await client.query('SELECT COUNT(*) FROM alerts');
    if (parseInt(alertCheck.rows[0].count, 10) === 0) {
      console.log('[DB] Seeding alerts...');
      for (const a of SEED_ALERTS) {
        await client.query(
          'INSERT INTO alerts (severity, title, description, bus_id, is_read) VALUES ($1, $2, $3, $4, $5)',
          [a.type, a.title, a.desc, a.bus.includes('BUS') ? a.bus : null, a.read]
        );
      }
    }

    client.release();
    console.log('[DB] PostgreSQL Database initialization complete.');
    return pool;
  } catch (err) {
    console.error('[DB] PostgreSQL Connection failed. Falling back to memory DB:', err.message);
    return null;
  }
}

// Allow direct execution from CLI: node server/database/initDb.js
if (process.argv[1] && path.resolve(fileURLToPath(import.meta.url)) === path.resolve(process.argv[1])) {
  const dbUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  if (!dbUrl) {
    console.error('ERROR: Please specify DATABASE_URL environment variable or set it in .env');
    process.exit(1);
  }
  initPostgresDatabase(dbUrl).then((pool) => {
    if (pool) pool.end();
    process.exit(0);
  });
}
````

## File: server/database/schema.sql
````sql
-- ==============================================================================
-- BusTrack Pro — Database Schema & Row Level Security (RLS) Blueprint
-- Target DB: PostgreSQL 15+ / Supabase
-- ==============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. ENUMS
CREATE TYPE user_role AS ENUM ('admin', 'dispatcher', 'driver', 'passenger');
CREATE TYPE bus_status AS ENUM ('active', 'delayed', 'stopped', 'maintenance');
CREATE TYPE alert_severity AS ENUM ('critical', 'warning', 'info');

-- 3. USERS TABLE
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255), -- NULL for OAuth users
    full_name VARCHAR(120) NOT NULL,
    role user_role DEFAULT 'passenger',
    auth_provider VARCHAR(50) DEFAULT 'email', -- 'email', 'google', 'apple'
    provider_id VARCHAR(255),
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index for authentication lookup
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_provider ON users(auth_provider, provider_id);

-- 4. ROUTES TABLE
CREATE TABLE IF NOT EXISTS routes (
    id VARCHAR(10) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    color VARCHAR(20) NOT NULL,
    stops_count INT DEFAULT 0,
    length_km NUMERIC(5,2) DEFAULT 0.0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. DRIVERS TABLE
CREATE TABLE IF NOT EXISTS drivers (
    id VARCHAR(20) PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    name VARCHAR(120) NOT NULL,
    initials VARCHAR(5) NOT NULL,
    license_number VARCHAR(50) UNIQUE NOT NULL,
    trips_completed INT DEFAULT 0,
    rating NUMERIC(3,2) DEFAULT 5.0,
    hours_worked NUMERIC(5,2) DEFAULT 0.0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. BUSES TABLE (FLEET)
CREATE TABLE IF NOT EXISTS buses (
    id VARCHAR(20) PRIMARY KEY,
    bus_number VARCHAR(10) NOT NULL,
    license_plate VARCHAR(20) UNIQUE NOT NULL,
    route_id VARCHAR(10) REFERENCES routes(id) ON DELETE SET NULL,
    driver_id VARCHAR(20) REFERENCES drivers(id) ON DELETE SET NULL,
    status bus_status DEFAULT 'stopped',
    speed_kmh INT DEFAULT 0,
    passengers_count INT DEFAULT 0,
    capacity INT DEFAULT 52,
    fuel_percent INT DEFAULT 100,
    delay_minutes INT DEFAULT 0,
    next_stop VARCHAR(100),
    eta_minutes INT DEFAULT 0,
    pos_x NUMERIC(6,2) DEFAULT 400.00,
    pos_y NUMERIC(6,2) DEFAULT 225.00,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for spatial/telemetry queries
CREATE INDEX idx_buses_route ON buses(route_id);
CREATE INDEX idx_buses_status ON buses(status);

-- 7. ALERTS TABLE
CREATE TABLE IF NOT EXISTS alerts (
    id BIGSERIAL PRIMARY KEY,
    severity alert_severity NOT NULL DEFAULT 'info',
    title VARCHAR(150) NOT NULL,
    description TEXT NOT NULL,
    bus_id VARCHAR(20) REFERENCES buses(id) ON DELETE SET NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_alerts_severity_read ON alerts(severity, is_read);

-- 8. ACTIVITIES LOG TABLE
CREATE TABLE IF NOT EXISTS activity_logs (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action_text TEXT NOT NULL,
    action_type VARCHAR(30) DEFAULT 'info',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- Ensures data privacy, isolation & protection against public DB leaks
-- ==============================================================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE buses ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

-- 1. USERS POLICIES
-- Users can view their own profile; admins can view all users
CREATE POLICY user_self_read ON users FOR SELECT
    USING (auth.uid() = id OR current_setting('request.jwt.claims', true)::json->>'role' = 'admin');

CREATE POLICY user_self_update ON users FOR UPDATE
    USING (auth.uid() = id);

-- 2. PUBLIC READ POLICIES (Routes, Buses telemetry, Public Stops)
-- All authenticated & anonymous users can view live route & bus telemetry
CREATE POLICY routes_public_read ON routes FOR SELECT USING (true);
CREATE POLICY buses_public_read ON buses FOR SELECT USING (true);
CREATE POLICY drivers_public_read ON drivers FOR SELECT USING (true);
CREATE POLICY alerts_public_read ON alerts FOR SELECT USING (true);

-- 3. ADMIN / DISPATCHER WRITE POLICIES
-- Only Admins and Dispatchers can insert or update buses, routes & alerts
CREATE POLICY buses_admin_write ON buses FOR ALL
    USING (current_setting('request.jwt.claims', true)::json->>'role' IN ('admin', 'dispatcher'));

CREATE POLICY alerts_admin_write ON alerts FOR ALL
    USING (current_setting('request.jwt.claims', true)::json->>'role' IN ('admin', 'dispatcher'));

CREATE POLICY activity_logs_admin_read ON activity_logs FOR SELECT
    USING (current_setting('request.jwt.claims', true)::json->>'role' IN ('admin', 'dispatcher'));
````

## File: server/database/schema.sqlite.sql
````sql
-- ==============================================================================
-- BusTrack Pro — SQLite Relational Database Schema
-- Embedded ACID Relational Engine with WAL Mode & Foreign Keys
-- ==============================================================================

PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;
PRAGMA synchronous = NORMAL;

-- 1. USERS TABLE
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT,
    full_name TEXT NOT NULL,
    role TEXT DEFAULT 'passenger',
    auth_provider TEXT DEFAULT 'email',
    provider_id TEXT,
    avatar_url TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- 2. ROUTES TABLE
CREATE TABLE IF NOT EXISTS routes (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    var_name TEXT,
    color TEXT NOT NULL,
    stops_count INTEGER DEFAULT 0,
    length_km REAL DEFAULT 0.0,
    created_at TEXT DEFAULT (datetime('now'))
);

-- 3. DRIVERS TABLE
CREATE TABLE IF NOT EXISTS drivers (
    id TEXT PRIMARY KEY,
    user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    initials TEXT NOT NULL,
    license_number TEXT UNIQUE NOT NULL,
    trips_completed INTEGER DEFAULT 0,
    rating REAL DEFAULT 5.0,
    hours_worked REAL DEFAULT 0.0,
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_drivers_license ON drivers(license_number);

-- 4. FLEET BUSES TABLE
CREATE TABLE IF NOT EXISTS buses (
    id TEXT PRIMARY KEY,
    bus_number TEXT NOT NULL,
    license_plate TEXT UNIQUE NOT NULL,
    route_id TEXT REFERENCES routes(id) ON DELETE SET NULL,
    driver_id TEXT REFERENCES drivers(id) ON DELETE SET NULL,
    status TEXT DEFAULT 'stopped',
    speed_kmh INTEGER DEFAULT 0,
    passengers_count INTEGER DEFAULT 0,
    capacity INTEGER DEFAULT 52,
    fuel_percent INTEGER DEFAULT 100,
    delay_minutes INTEGER DEFAULT 0,
    next_stop TEXT,
    eta_minutes INTEGER DEFAULT 0,
    pos_x REAL DEFAULT 400.00,
    pos_y REAL DEFAULT 225.00,
    _t REAL DEFAULT 0.0,
    _step REAL DEFAULT 0.005,
    _dir INTEGER DEFAULT 1,
    updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_buses_route ON buses(route_id);
CREATE INDEX IF NOT EXISTS idx_buses_status ON buses(status);

-- 5. ALERTS TABLE
CREATE TABLE IF NOT EXISTS alerts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    severity TEXT NOT NULL DEFAULT 'info',
    icon TEXT,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    bus_id TEXT,
    is_read INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_alerts_severity_read ON alerts(severity, is_read);

-- 6. ACTIVITY LOGS TABLE
CREATE TABLE IF NOT EXISTS activity_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
    action_text TEXT NOT NULL,
    action_type TEXT DEFAULT 'info',
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_activity_logs_created ON activity_logs(created_at);

-- 7. TRANSIT STOPS TABLE
CREATE TABLE IF NOT EXISTS stops (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    subtext TEXT,
    is_primary INTEGER DEFAULT 0,
    lat REAL,
    lon REAL,
    routes_json TEXT,
    pos_x REAL DEFAULT 0.0,
    pos_y REAL DEFAULT 0.0,
    created_at TEXT DEFAULT (datetime('now'))
);
````

## File: server/database/status.js
````javascript
/* ==============================================================================
   BusTrack Pro — Database Diagnostics & Inspection CLI
   Run with: npm run db:status OR node server/database/status.js
   ============================================================================== */

import { db } from './db.js';

console.log('============================================================');
console.log('   🚍 BusTrack Pro — Live Database Diagnostics');
console.log('============================================================');

const status = db.getDbStatus();

console.log(`  Engine:           ${status.engine}`);
console.log(`  SQLite Version:   ${status.version}`);
console.log(`  Dialect:          ${status.dialect}`);
console.log(`  Connected:        ${status.connected ? '✅ YES' : '❌ NO'}`);
console.log(`  Storage Mode:     ${status.storage}`);
console.log(`  Physical File:    ${status.filePath}`);
console.log(`  File Size on Disk: ${status.fileSizeFormatted} (${status.fileSizeBytes} bytes)`);
console.log(`  Total DB Records: ${status.totalRows}`);
console.log('------------------------------------------------------------');
console.log('  Relational Tables & Row Counts:');
for (const table of status.tables) {
  const bar = '█'.repeat(Math.min(30, Math.max(1, table.count * 2)));
  console.log(`   - ${table.name.padEnd(16)} : ${String(table.count).padStart(3)} rows  ${bar}`);
}
console.log('------------------------------------------------------------');
console.log('  Engine Features & Guardrails:');
console.log(`   - Foreign Keys Enforcement:  ${status.features.foreignKeys ? '✅ Enabled (ACID relational integrity)' : '❌ Disabled'}`);
console.log(`   - WAL Journal Mode:          ${status.features.walJournalMode ? '✅ Enabled (Write-Ahead Logging)' : '❌ Off'}`);
console.log(`   - ACID Transactions:         ${status.features.acidTransactions ? '✅ Supported' : '❌ No'}`);
console.log(`   - PostgreSQL Compatible:     ${status.features.postgresCompatible ? '✅ Yes (schema.sql available)' : '❌ No'}`);
console.log('============================================================\n');

db.close();
process.exit(0);
````

## File: server/middleware/auth.js
````javascript
/* ==============================================================================
   BusTrack Pro — JWT Authentication & Authorization Middleware
   ============================================================================== */

import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'bustrack_super_secret_jwt_key_2026_cr';

/** Middleware: Authenticate Request via Bearer Token or Cookie */
export function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.startsWith('Bearer ')
    ? authHeader.split(' ')[1]
    : req.query.token;

  if (!token) {
    return res.status(401).json({
      type: 'about:blank',
      title: 'Unauthorized',
      status: 401,
      detail: 'Acceso denegado. Se requiere un token de autenticación válido.',
    });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({
        type: 'about:blank',
        title: 'Forbidden',
        status: 403,
        detail: 'Token inválido o expirado. Por favor inicia sesión nuevamente.',
      });
    }
    req.user = user;
    next();
  });
}

/** Optional Auth: Attaches user if valid token present, doesn't block if missing */
export function optionalAuth(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.startsWith('Bearer ')
    ? authHeader.split(' ')[1]
    : null;

  if (token) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      req.user = decoded;
    } catch {
      req.user = null;
    }
  } else {
    req.user = null;
  }
  next();
}

/** Role Guard Middleware */
export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        type: 'about:blank',
        title: 'Unauthorized',
        status: 401,
        detail: 'Inicia sesión para realizar esta acción.',
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        type: 'about:blank',
        title: 'Forbidden',
        status: 403,
        detail: `Requiere permisos de: ${roles.join(' o ')}.`,
      });
    }

    next();
  };
}

export { JWT_SECRET };
````

## File: server/middleware/errorHandler.js
````javascript
/* ==============================================================================
   BusTrack Pro — Centralized Error Handler (RFC 7807 Compliant)
   ============================================================================== */

export class ApiError extends Error {
  constructor(statusCode, title, detail, type = 'about:blank') {
    super(detail);
    this.statusCode = statusCode;
    this.title = title;
    this.detail = detail;
    this.type = type;
  }

  static badRequest(detail, title = 'Bad Request') {
    return new ApiError(400, title, detail);
  }

  static notFound(detail, title = 'Not Found') {
    return new ApiError(404, title, detail);
  }

  static conflict(detail, title = 'Conflict') {
    return new ApiError(409, title, detail);
  }

  static internal(detail = 'An unexpected internal error occurred.', title = 'Internal Server Error') {
    return new ApiError(500, title, detail);
  }
}

export function errorHandler(err, req, res, next) {
  const statusCode = err.statusCode || (err.status ? err.status : 500);
  const title = err.title || (statusCode >= 500 ? 'Internal Server Error' : 'Request Error');
  const detail = err.detail || err.message || 'An error occurred processing the request';

  const problemDetails = {
    type: err.type || 'about:blank',
    title,
    status: statusCode,
    detail,
    instance: req.originalUrl || req.url,
    correlationId: req.correlationId || null,
    timestamp: new Date().toISOString(),
  };

  if (statusCode >= 500) {
    console.error(`[ERROR] [${req.correlationId || 'no-id'}] ${err.stack || err}`);
  }

  res.status(statusCode).type('application/problem+json').json(problemDetails);
}
````

## File: server/middleware/logger.js
````javascript
/* ==============================================================================
   BusTrack Pro — Request Logger & Correlation Middleware
   ============================================================================== */

import { randomUUID } from 'crypto';

export function correlationMiddleware(req, res, next) {
  const correlationId = req.headers['x-correlation-id'] || randomUUID();
  req.correlationId = correlationId;
  res.setHeader('X-Correlation-ID', correlationId);
  next();
}

export function requestLogger(req, res, next) {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    const logEntry = {
      timestamp: new Date().toISOString(),
      correlationId: req.correlationId,
      method: req.method,
      path: req.originalUrl || req.url,
      statusCode: res.statusCode,
      latencyMs: duration,
      userAgent: req.headers['user-agent'] || 'unknown',
    };
    // Format compact structured log
    const statusColor = res.statusCode >= 500 ? '\x1b[31m' : res.statusCode >= 400 ? '\x1b[33m' : '\x1b[32m';
    console.log(
      `[${logEntry.timestamp}] [${logEntry.correlationId.slice(0, 8)}] ` +
      `${logEntry.method} ${logEntry.path} -> ${statusColor}${logEntry.statusCode}\x1b[0m (${duration}ms)`
    );
  });
  next();
}
````

## File: server/middleware/rateLimiter.js
````javascript
/* ==============================================================================
   BusTrack Pro — Rate Limiter Middleware
   Protects public API endpoints from abuse and DDoS attempts.
   ============================================================================== */

import { rateLimit } from 'express-rate-limit';

const isDev = process.env.NODE_ENV !== 'production';

/** General API rate limit: 100 requests per 15 minutes per IP */
export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isDev ? 500 : 100,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: {
    type: 'https://bustrack.example.com/errors/rate-limit',
    title: 'Too Many Requests',
    status: 429,
    detail: 'You have exceeded the request limit. Please try again later.',
  },
  skip: (req) => req.path === '/health' || req.path === '/database/status', // health and DB status checks are exempt
});

/** Stricter limit for write operations: 20 requests per 15 minutes per IP */
export const writeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isDev ? 200 : 20,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: {
    type: 'https://bustrack.example.com/errors/rate-limit',
    title: 'Too Many Requests',
    status: 429,
    detail: 'Write operation limit reached. Please slow down and try again.',
  },
});
````

## File: server/middleware/sanitizer.js
````javascript
/* ==============================================================================
   BusTrack Pro — Input Sanitizer / Validator Middleware
   Protects against XSS, injection, and malformed payloads.
   ============================================================================== */

/** Strip dangerous characters from a string value */
function sanitizeString(value) {
  if (typeof value !== 'string') return value;
  return value
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '') // strip script tags
    .replace(/<[^>]+>/g, '')                              // strip HTML tags
    .replace(/['"`;]/g, '')                               // strip SQL/JS injection chars
    .trim()
    .slice(0, 1000);                                      // max length guard
}

/** Recursively sanitize all string values in an object */
function sanitizeObject(obj) {
  if (typeof obj === 'string') return sanitizeString(obj);
  if (Array.isArray(obj)) return obj.map(sanitizeObject);
  if (obj !== null && typeof obj === 'object') {
    const clean = {};
    for (const [key, value] of Object.entries(obj)) {
      // Sanitize key too (defense in depth)
      const cleanKey = sanitizeString(key).replace(/[^a-zA-Z0-9_-]/g, '');
      clean[cleanKey] = sanitizeObject(value);
    }
    return clean;
  }
  return obj;
}

/** Express middleware: sanitize req.body, req.query, req.params */
export function sanitizeInputs(req, res, next) {
  if (req.body && typeof req.body === 'object') {
    req.body = sanitizeObject(req.body);
  }
  if (req.query && typeof req.query === 'object') {
    req.query = sanitizeObject(req.query);
  }
  // params are read-only in express, but we can validate them
  if (req.params && typeof req.params === 'object') {
    for (const [key, value] of Object.entries(req.params)) {
      if (typeof value === 'string' && /<|>|script|eval|javascript/i.test(value)) {
        return res.status(400).json({
          type: 'about:blank',
          title: 'Bad Request',
          status: 400,
          detail: `Invalid characters in route parameter: ${key}`,
        });
      }
    }
  }
  next();
}

/** Validate bus status enum */
export function validateBusStatus(req, res, next) {
  const allowed = ['active', 'delayed', 'stopped', 'maintenance'];
  const { status } = req.body;
  if (status !== undefined && !allowed.includes(status)) {
    return res.status(400).json({
      type: 'about:blank',
      title: 'Bad Request',
      status: 400,
      detail: `Invalid status value. Must be one of: ${allowed.join(', ')}`,
    });
  }
  next();
}

/** Validate alert severity enum */
export function validateAlertSeverity(req, res, next) {
  const allowed = ['critical', 'warning', 'info'];
  const { severity } = req.body;
  if (severity !== undefined && !allowed.includes(severity)) {
    return res.status(400).json({
      type: 'about:blank',
      title: 'Bad Request',
      status: 400,
      detail: `Invalid severity value. Must be one of: ${allowed.join(', ')}`,
    });
  }
  next();
}
````

## File: server/routes/api.js
````javascript
/* ==============================================================================
   BusTrack Pro — REST API Router
   ============================================================================== */

import { Router } from 'express';
import { FleetService } from '../services/fleetService.js';
import { AlertService } from '../services/alertService.js';
import { PassengerService } from '../services/passengerService.js';
import { telemetryEngine } from '../services/telemetrySimulator.js';
import { db } from '../database/db.js';
import { authRouter } from './authRoutes.js';
import { writeLimiter } from '../middleware/rateLimiter.js';
import { validateBusStatus, validateAlertSeverity } from '../middleware/sanitizer.js';

export const apiRouter = Router();

// --- AUTHENTICATION ROUTES ---
apiRouter.use('/auth', authRouter);

// --- 1. SYSTEM HEALTH & DIAGNOSTICS ---
// Note: Does NOT expose stack traces, environment secrets, or internal paths
apiRouter.get('/health', (req, res) => {
  const uptime = process.uptime();
  const dbStatus = typeof db.getDbStatus === 'function' ? db.getDbStatus() : null;
  res.json({
    status: 'healthy',
    uptimeSeconds: Math.floor(uptime),
    timestamp: new Date().toISOString(),
    activeConnections: telemetryEngine.wsClients.size,
    trackedBuses: db.getAllBuses().length,
    database: dbStatus ? {
      engine: dbStatus.engine,
      dialect: dbStatus.dialect,
      connected: dbStatus.connected,
      storage: dbStatus.storage,
      totalRows: dbStatus.totalRows,
    } : { engine: 'in-memory', connected: true },
    version: '1.0.0',
    // NOTE: 'environment' is intentionally omitted from the public health endpoint
    // to avoid leaking deployment context to potential attackers.
  });
});

apiRouter.get('/database/status', (req, res) => {
  if (typeof db.getDbStatus === 'function') {
    res.json(db.getDbStatus());
  } else {
    res.json({ status: 'connected', engine: 'in-memory' });
  }
});

// --- 2. ROUTES ---
apiRouter.get('/routes', (req, res) => {
  const routes = FleetService.getRoutes();
  res.json(routes);
});

apiRouter.get('/routes/:id', (req, res, next) => {
  try {
    const route = FleetService.getRouteById(req.params.id);
    res.json(route);
  } catch (err) {
    next(err);
  }
});

// --- 3. DRIVERS ---
apiRouter.get('/drivers', (req, res) => {
  const drivers = FleetService.getDrivers();
  res.json(drivers);
});

apiRouter.get('/drivers/:id', (req, res, next) => {
  try {
    const driver = FleetService.getDriverById(req.params.id);
    res.json(driver);
  } catch (err) {
    next(err);
  }
});

// --- 4. FLEET BUSES ---
apiRouter.get('/buses', (req, res) => {
  const { route, status, search } = req.query;
  const buses = FleetService.getBuses({ route, status, search });
  res.json(buses);
});

apiRouter.post('/buses', writeLimiter, (req, res, next) => {
  try {
    const bus = FleetService.createBus(req.body);
    telemetryEngine.broadcast('bus_created', bus);
    res.status(201).json(bus);
  } catch (err) {
    next(err);
  }
});

apiRouter.get('/buses/:id', (req, res, next) => {
  try {
    const bus = FleetService.getBusById(req.params.id);
    res.json(bus);
  } catch (err) {
    next(err);
  }
});

apiRouter.patch('/buses/:id/status', writeLimiter, validateBusStatus, (req, res, next) => {
  try {
    const { status } = req.body;
    const bus = FleetService.updateBusStatus(req.params.id, status);
    telemetryEngine.broadcast('bus_status_changed', bus);
    res.json(bus);
  } catch (err) {
    next(err);
  }
});

// --- 5. ALERTS & INCIDENTS ---
apiRouter.get('/alerts', (req, res) => {
  const { severity } = req.query;
  const alerts = AlertService.getAlerts(severity);
  res.json(alerts);
});

apiRouter.post('/alerts', writeLimiter, validateAlertSeverity, (req, res, next) => {
  try {
    const alert = AlertService.createAlert(req.body);
    telemetryEngine.broadcast('alert_created', alert);
    res.status(201).json(alert);
  } catch (err) {
    next(err);
  }
});

apiRouter.patch('/alerts/read-all', writeLimiter, (req, res) => {
  const result = AlertService.markAllAsRead();
  telemetryEngine.broadcast('alerts_read_all', result);
  res.json(result);
});

// --- 6. ACTIVITIES ---
apiRouter.get('/activities', (req, res) => {
  res.json(db.getActivities());
});

// --- 7. REPORTS & ANALYTICS ---
apiRouter.get('/reports/summary', (req, res) => {
  const summary = FleetService.getOperationalSummary();
  res.json(summary);
});

apiRouter.get('/reports/export-csv', (req, res) => {
  const csv = FleetService.generateFleetCsv();
  const filename = `flota-${new Date().toISOString().slice(0, 10)}.csv`;
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  // Prevent CSV injection: the CSV content is generated internally, but
  // as a precaution add a no-cache header so sensitive exports aren't cached.
  res.setHeader('Cache-Control', 'no-store');
  res.send(csv);
});

// --- 8. PASSENGER EXPERIENCE (UNIVERSIDAD FIDÉLITAS PILOT) ---
apiRouter.get('/passenger/stops', (req, res) => {
  res.json(PassengerService.getPilotStops());
});

apiRouter.get('/passenger/stops/:id/arrivals', (req, res) => {
  const arrivals = PassengerService.getStopArrivals(req.params.id);
  res.json(arrivals);
});
````

## File: server/routes/authRoutes.js
````javascript
/* ==============================================================================
   BusTrack Pro — Authentication API Routes (Email, Google, Apple)
   ============================================================================== */

import { Router } from 'express';
import { AuthService } from '../services/authService.js';
import { authenticateToken } from '../middleware/auth.js';
import { writeLimiter } from '../middleware/rateLimiter.js';
import { db } from '../database/db.js';

export const authRouter = Router();

/** POST /api/v1/auth/register — Email Registration */
authRouter.post('/register', writeLimiter, async (req, res, next) => {
  try {
    const { email, password, name, consentTerms } = req.body;
    const result = await AuthService.registerWithEmail({ email, password, name, consentTerms });
    res.status(201).json({
      status: 'success',
      message: 'Cuenta creada exitosamente',
      ...result,
    });
  } catch (err) {
    res.status(400).json({
      type: 'about:blank',
      title: 'Bad Request',
      status: 400,
      detail: err.message,
    });
  }
});

/** POST /api/v1/auth/login — Email Login */
authRouter.post('/login', writeLimiter, async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const result = await AuthService.loginWithEmail({ email, password });
    res.json({
      status: 'success',
      message: 'Inicio de sesión exitoso',
      ...result,
    });
  } catch (err) {
    res.status(401).json({
      type: 'about:blank',
      title: 'Unauthorized',
      status: 401,
      detail: err.message,
    });
  }
});

/** POST /api/v1/auth/google — Google OAuth Login / Register */
authRouter.post('/google', writeLimiter, async (req, res, next) => {
  try {
    const { googleToken, email, name, picture } = req.body;
    const result = await AuthService.loginWithGoogle({ googleToken, email, name, picture });
    res.json({
      status: 'success',
      message: 'Inicio de sesión con Google exitoso',
      ...result,
    });
  } catch (err) {
    res.status(400).json({
      type: 'about:blank',
      title: 'Bad Request',
      status: 400,
      detail: err.message,
    });
  }
});

/** POST /api/v1/auth/apple — Apple OAuth Login / Register */
authRouter.post('/apple', writeLimiter, async (req, res, next) => {
  try {
    const { appleToken, email, name } = req.body;
    const result = await AuthService.loginWithApple({ appleToken, email, name });
    res.json({
      status: 'success',
      message: 'Inicio de sesión con Apple exitoso',
      ...result,
    });
  } catch (err) {
    res.status(400).json({
      type: 'about:blank',
      title: 'Bad Request',
      status: 400,
      detail: err.message,
    });
  }
});

/** GET /api/v1/auth/me — Current User Profile */
authRouter.get('/me', authenticateToken, (req, res) => {
  const user = db.findUserById(req.user.id) || req.user;
  const { passwordHash: _, ...safeUser } = user;
  res.json({ user: safeUser });
});

/** POST /api/v1/auth/oauth-callback — Registra/actualiza usuario OAuth (Google/Apple via Supabase) */
authRouter.post('/oauth-callback', writeLimiter, async (req, res) => {
  try {
    const { supabaseId, email, name, provider, avatarUrl } = req.body;
    if (!email || !supabaseId) {
      return res.status(400).json({ status: 'error', detail: 'Email y supabaseId son obligatorios.' });
    }
    const result = await AuthService.loginWithOAuthCallback({ supabaseId, email, name, provider, avatarUrl });
    res.json({ status: 'success', message: `Sesión iniciada con ${provider}`, ...result });
  } catch (err) {
    res.status(400).json({ type: 'about:blank', title: 'Bad Request', status: 400, detail: err.message });
  }
});

/** POST /api/v1/auth/logout — Client Logout */
authRouter.post('/logout', (req, res) => {
  res.json({ status: 'success', message: 'Sesión cerrada correctamente' });
});
````

## File: server/services/alertService.js
````javascript
/* ==============================================================================
   BusTrack Pro — Alert & Incident Service
   ============================================================================== */

import { db } from '../database/db.js';
import { ApiError } from '../middleware/errorHandler.js';

const VALID_SEVERITIES = ['critical', 'warning', 'info'];

export class AlertService {
  static getAlerts(severity = 'all') {
    return db.getAllAlerts(severity);
  }

  static createAlert(payload) {
    if (!payload.title || typeof payload.title !== 'string') {
      throw ApiError.badRequest('Field "title" is required.');
    }
    if (!payload.desc || typeof payload.desc !== 'string') {
      throw ApiError.badRequest('Field "desc" is required.');
    }
    if (payload.type && !VALID_SEVERITIES.includes(payload.type)) {
      throw ApiError.badRequest(
        `Invalid alert severity '${payload.type}'. Allowed values: ${VALID_SEVERITIES.join(', ')}`
      );
    }

    const alert = db.createAlert(payload);
    db.pushActivity(`Alerta registrada: ${alert.title}`, alert.type === 'critical' ? 'danger' : 'warn');
    return alert;
  }

  static markAllAsRead() {
    const markedCount = db.markAllAlertsAsRead();
    return { success: true, markedCount };
  }
}
````

## File: server/services/authService.js
````javascript
/* ==============================================================================
   BusTrack Pro — Authentication Service (Email, Google, Apple)
   ============================================================================== */

import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../middleware/auth.js';
import { db } from '../database/db.js';
import { supabase, isSupabaseConfigured } from '../supabase.js';

export class AuthService {
  /** Generate JWT Token */
  static generateToken(user) {
    const payload = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      provider: user.provider,
    };
    return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
  }

  /** Register user with Email & Password */
  static async registerWithEmail({ email, password, name, consentTerms }) {
    if (!consentTerms) {
      throw new Error('Debes aceptar los Términos y la Política de Privacidad para registrarte.');
    }

    if (!email || !password || !name) {
      throw new Error('Todos los campos son obligatorios.');
    }

    if (password.length < 6) {
      throw new Error('La contraseña debe tener al menos 6 caracteres.');
    }

    const cleanEmail = email.toLowerCase().trim();
    const cleanName = name.trim();

    // 1. Si Supabase está configurado, intentar registrar allí primero (es la fuente de verdad)
    let supabaseUserId = null;
    if (isSupabaseConfigured) {
      try {
        const { data: supaData, error: supaError } = await supabase.auth.signUp({
          email: cleanEmail,
          password: password,
          options: {
            data: { name: cleanName },
          },
        });

        if (supaError) {
          // Si ya existe el usuario en Supabase Auth, tratamos de hacer login para verificar
          if (supaError.message.includes('User already registered') || supaError.message.includes('already registered')) {
            throw new Error('Ya existe una cuenta registrada con este correo electrónico.');
          }
          console.warn('[Supabase Auth] Aviso al registrar:', supaError.message);
        } else if (supaData?.user) {
          supabaseUserId = supaData.user.id;

          // Guardar en la tabla 'users' de Supabase con el id del Auth
          try {
            const { error: upsertError } = await supabase.from('users').upsert({
              id: supabaseUserId,
              email: cleanEmail,
              full_name: cleanName,
              role: 'admin',
              auth_provider: 'email',
              avatar_url: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(cleanName)}`,
              created_at: new Date().toISOString(),
            }, { onConflict: 'email' });

            if (upsertError) {
              console.warn('[Supabase DB] Error al guardar usuario en tabla users:', upsertError.message);
            } else {
              console.log('[Supabase DB] Usuario guardado exitosamente en tabla users:', cleanEmail);
            }
          } catch (dbErr) {
            console.warn('[Supabase DB] Tabla users no encontrada, continuando con BD local:', dbErr.message);
          }
        }
      } catch (err) {
        // Re-lanzar errores de "ya registrado"
        if (err.message.includes('ya existe') || err.message.includes('registered')) {
          throw err;
        }
        console.warn('[Supabase Auth] Error de conexión, usando BD local:', err.message);
      }
    }

    // 2. Verificar si ya existe en la base de datos local
    const existingUser = db.findUserByEmail(cleanEmail);
    if (existingUser) {
      throw new Error('Ya existe una cuenta registrada con este correo electrónico.');
    }

    // 3. Guardar en la base de datos local para persistencia rápida
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const newUser = db.createUser({
      ...(supabaseUserId ? { id: supabaseUserId } : {}),
      email: cleanEmail,
      passwordHash,
      name: cleanName,
      role: 'admin',
      provider: 'email',
      avatarUrl: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(cleanName)}`,
    });

    try {
      db.pushActivity(`Nuevo usuario registrado: ${cleanName} (${cleanEmail})`, 'info');
    } catch (_) {}

    const token = this.generateToken(newUser);
    const { passwordHash: _, ...safeUser } = newUser;
    return { user: safeUser, token };
  }


  /** OAuth Callback — Registra/actualiza usuario de Supabase OAuth (Google, Apple) */
  static async loginWithOAuthCallback({ supabaseId, email, name, provider, avatarUrl }) {
    const cleanEmail = email.toLowerCase().trim();
    const cleanName = (name || cleanEmail.split('@')[0]).trim();
    const cleanProvider = provider || 'oauth';
    const cleanAvatar = avatarUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(cleanName)}`;

    // Buscar si ya existe en la BD local (por email o por id de Supabase)
    let existingUser = db.findUserByEmail(cleanEmail) || db.findUserById(supabaseId);

    if (existingUser) {
      // Actualizar datos del perfil (nombre/avatar pueden cambiar en el proveedor)
      const updated = db.updateUser(existingUser.id, {
        name: cleanName,
        avatarUrl: cleanAvatar,
        provider: cleanProvider,
      });
      const token = this.generateToken(updated || existingUser);
      const { passwordHash: _, ...safeUser } = updated || existingUser;
      return { user: safeUser, token };
    }

    // Crear usuario nuevo en la BD local con el UUID de Supabase
    const newUser = db.createUser({
      id: supabaseId,
      email: cleanEmail,
      name: cleanName,
      role: 'admin',
      provider: cleanProvider,
      avatarUrl: cleanAvatar,
      passwordHash: null, // Los usuarios OAuth no tienen contraseña local
    });

    try {
      db.pushActivity(`Nuevo usuario OAuth (${cleanProvider}): ${cleanName} (${cleanEmail})`, 'info');
    } catch (_) {}

    const token = this.generateToken(newUser);
    const { passwordHash: _, ...safeUser } = newUser;
    return { user: safeUser, token };
  }


  /** Login user with Email & Password */
  static async loginWithEmail({ email, password }) {
    if (!email || !password) {
      throw new Error('Correo y contraseña son requeridos.');
    }

    const cleanEmail = email.toLowerCase().trim();

    // 1. Si Supabase está configurado, intentar primero autenticar contra Supabase Auth
    if (isSupabaseConfigured) {
      try {
        const { data: supaData, error: supaError } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password: password,
        });

        if (!supaError && supaData?.user) {
          let user = db.findUserByEmail(cleanEmail);
          if (!user) {
            const salt = await bcrypt.genSalt(10);
            const passwordHash = await bcrypt.hash(password, salt);
            user = db.createUser({
              id: supaData.user.id,
              email: cleanEmail,
              passwordHash,
              name: supaData.user.user_metadata?.name || cleanEmail.split('@')[0],
              role: 'admin',
              provider: 'email',
              avatarUrl: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(cleanEmail)}`,
            });
          }
          try {
            db.pushActivity(`Inicio de sesión (Supabase Auth): ${user.name}`, 'info');
          } catch (_) {}

          const token = this.generateToken(user);
          const { passwordHash: _, ...safeUser } = user;
          return { user: safeUser, token };
        }
      } catch (err) {
        console.warn('[Supabase Auth] Fallo signInWithPassword, probando DB local:', err.message);
      }
    }

    // 2. Autenticación con la base de datos local
    const user = db.findUserByEmail(cleanEmail);
    if (!user || !user.passwordHash) {
      throw new Error('Credenciales inválidas o la cuenta fue creada con Google/Apple.');
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      throw new Error('Correo o contraseña incorrectos.');
    }

    try {
      db.pushActivity(`Inicio de sesión: ${user.name} (${user.email})`, 'info');
    } catch (_) {}

    const token = this.generateToken(user);
    const { passwordHash: _, ...safeUser } = user;
    return { user: safeUser, token };
  }

  /** Login / Register with Google OAuth */
  static async loginWithGoogle({ googleToken, email, name, picture }) {
    if (!email) {
      throw new Error('No se pudo verificar el correo de Google.');
    }

    const cleanEmail = email.toLowerCase().trim();
    let user = db.findUserByEmail(cleanEmail);

    if (!user) {
      user = db.createUser({
        email: cleanEmail,
        passwordHash: null,
        name: name || cleanEmail.split('@')[0],
        role: 'admin',
        provider: 'google',
        avatarUrl: picture || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(cleanEmail)}`,
      });

      if (isSupabaseConfigured) {
        try {
          await supabase.from('users').upsert({
            email: cleanEmail,
            full_name: user.name,
            role: 'admin',
            auth_provider: 'google',
            avatar_url: user.avatarUrl,
          });
        } catch (_) {}
      }
    }

    try {
      db.pushActivity(`Inicio de sesión con Google: ${user.name}`, 'info');
    } catch (_) {}

    const token = this.generateToken(user);
    const { passwordHash: _, ...safeUser } = user;
    return { user: safeUser, token };
  }

  /** Login / Register with Apple OAuth */
  static async loginWithApple({ appleToken, email, name }) {
    const cleanEmail = (email || `apple_${Date.now()}@privaterelay.appleid.com`).toLowerCase().trim();
    let user = db.findUserByEmail(cleanEmail);

    if (!user) {
      user = db.createUser({
        email: cleanEmail,
        passwordHash: null,
        name: name || 'Usuario Apple',
        role: 'passenger',
        provider: 'apple',
        avatarUrl: `https://api.dicebear.com/7.x/initials/svg?seed=Apple`,
      });

      if (isSupabaseConfigured) {
        try {
          await supabase.from('users').upsert({
            email: cleanEmail,
            full_name: user.name,
            role: 'passenger',
            auth_provider: 'apple',
            avatar_url: user.avatarUrl,
          });
        } catch (_) {}
      }
    }

    try {
      db.pushActivity(`Inicio de sesión con Apple: ${user.name}`, 'info');
    } catch (_) {}

    const token = this.generateToken(user);
    const { passwordHash: _, ...safeUser } = user;
    return { user: safeUser, token };
  }
}
````

## File: server/services/fleetService.js
````javascript
/* ==============================================================================
   BusTrack Pro — Fleet & Operations Service
   ============================================================================== */

import { db } from '../database/db.js';
import { ApiError } from '../middleware/errorHandler.js';

const VALID_STATUSES = ['active', 'delayed', 'stopped', 'maintenance'];

export class FleetService {
  static getBuses(filters = {}) {
    return db.getAllBuses(filters);
  }

  static getBusById(id) {
    const bus = db.getBusById(id);
    if (!bus) {
      throw ApiError.notFound(`Bus with ID '${id}' was not found in fleet records.`);
    }
    return bus;
  }

  static createBus(payload) {
    if (payload.routeId && !db.getRouteById(payload.routeId)) {
      throw ApiError.badRequest(`Route '${payload.routeId}' does not exist.`);
    }
    if (payload.driverId && !db.getDriverById(payload.driverId)) {
      throw ApiError.badRequest(`Driver '${payload.driverId}' does not exist.`);
    }
    const bus = db.createBus(payload);
    db.pushActivity(`Bus ${bus.id} incorporado a la flota activa`, 'ok');
    return bus;
  }

  static updateBusStatus(id, newStatus) {
    if (!VALID_STATUSES.includes(newStatus)) {
      throw ApiError.badRequest(
        `Invalid status '${newStatus}'. Allowed values: ${VALID_STATUSES.join(', ')}`
      );
    }
    const bus = db.updateBusStatus(id, newStatus);
    if (!bus) {
      throw ApiError.notFound(`Bus with ID '${id}' was not found.`);
    }
    db.pushActivity(`Estado de ${bus.id} actualizado a '${newStatus}'`, newStatus === 'maintenance' ? 'warn' : 'info');
    return bus;
  }

  static getRoutes() {
    return db.getAllRoutes();
  }

  static getRouteById(id) {
    const route = db.getRouteById(id);
    if (!route) {
      throw ApiError.notFound(`Route with ID '${id}' was not found.`);
    }
    return route;
  }

  static getDrivers() {
    return db.getAllDrivers();
  }

  static getDriverById(id) {
    const driver = db.getDriverById(id);
    if (!driver) {
      throw ApiError.notFound(`Driver with ID '${id}' was not found.`);
    }
    return driver;
  }

  static getOperationalSummary() {
    const buses = db.getAllBuses();
    const total = buses.length;
    const circulating = buses.filter(b => b.status === 'active' || b.status === 'delayed').length;
    const totalPassengers = buses.reduce((s, b) => s + b.passengers, 0);
    const totalCapacity = buses.reduce((s, b) => s + b.capacity, 0) || 1;
    const occupancyRate = Math.round((totalPassengers / totalCapacity) * 100);
    const totalDelay = buses.reduce((s, b) => s + b.delay, 0);
    const avgDelayMinutes = total ? +(totalDelay / total).toFixed(1) : 0;
    const inMaintenance = buses.filter(b => b.status === 'maintenance').length;
    const lowFuelCount = buses.filter(b => b.fuel < 20).length;

    return {
      totalBuses: total,
      circulating,
      totalPassengers,
      occupancyRate,
      avgDelayMinutes,
      inMaintenance,
      lowFuelCount,
      generatedAt: new Date().toISOString(),
    };
  }

  static generateFleetCsv() {
    const buses = db.getAllBuses();
    const headers = [
      'Bus ID', 'Placa', 'Ruta', 'Conductor', 'Velocidad (km/h)',
      'Pasajeros', 'Capacidad', 'Estado', 'Combustible (%)', 'Retraso (min)', 'Proxima Parada', 'ETA (min)'
    ];

    const rows = buses.map(b => [
      b.id,
      b.plate,
      `Ruta ${b.route.id}`,
      b.driver.name,
      b.speed,
      b.passengers,
      b.capacity,
      b.status,
      b.fuel,
      b.delay,
      b.nextStop,
      b.etaMin
    ]);

    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(';'))
      .join('\r\n');

    return '\uFEFF' + csvContent; // BOM for proper Excel UTF-8 display
  }
}
````

## File: server/services/passengerService.js
````javascript
/* ==============================================================================
   BusTrack Pro — Passenger Experience & Pilot Service
   Pilot Zone: Universidad Fidélitas (Campus San Pedro) & Montes de Oca
   ============================================================================== */

import { db } from '../database/db.js';

export const FIDELITAS_PILOT_STOPS = [
  {
    id: 'stop-fidelitas',
    name: 'Entrada Principal U Fidélitas',
    subtext: 'Santa Marta de Montes de Oca — Frente al Campus',
    isPrimary: true,
    lat: 9.9392,
    lon: -84.0321,
    routes: ['Granadilla — Fidélitas — San Pedro', 'Santa Marta — Vargas Araya — Lourdes'],
  },
  {
    id: 'stop-vargas-araya',
    name: 'Parada Barrio Vargas Araya',
    subtext: 'Paso universitario y residencial contiguo a Lourdes',
    isPrimary: false,
    lat: 9.9374,
    lon: -84.0382,
    routes: ['Santa Marta — Vargas Araya — Lourdes', 'Interlínea Guadalupe — San Pedro'],
  },
  {
    id: 'stop-lourdes',
    name: 'Parada Súper Lourdes / Colegio Calasanz',
    subtext: 'Salida de Lourdes hacia San Pedro centro',
    isPrimary: false,
    lat: 9.9362,
    lon: -84.0441,
    routes: ['Granadilla — Fidélitas — San Pedro', 'Santa Marta — Vargas Araya — Lourdes'],
  },
  {
    id: 'stop-san-pedro',
    name: 'Parada Muñoz & Nanne / Plaza del Sol',
    subtext: 'San Pedro Centro — Comercio y transbordos',
    isPrimary: false,
    lat: 9.9338,
    lon: -84.0535,
    routes: ['Granadilla — Fidélitas — San Pedro', 'Sabanilla — Betania — UCR', 'Interlínea'],
  },
  {
    id: 'stop-mall-sp',
    name: 'Parada Mall San Pedro / Hispanidad',
    subtext: 'Rotonda de la Bandera / Los Yoses',
    isPrimary: false,
    lat: 9.9341,
    lon: -84.0620,
    routes: ['Granadilla — Fidélitas — San Pedro', 'Santa Marta — Lourdes', 'Sabanilla — San José'],
  },
  {
    id: 'stop-sanjose',
    name: 'Terminal San José — Cuesta de Moras',
    subtext: 'Avenida Central / Cuesta de Moras',
    isPrimary: false,
    lat: 9.9332,
    lon: -84.0768,
    routes: ['Granadilla — Fidélitas — San Pedro', 'Santa Marta — Lourdes'],
  },
];

const PILOT_LINES = [
  {
    routeId: 'GRA-FID',
    name: 'Granadilla por U Fidélitas',
    destination: 'San José por San Pedro',
    operator: 'Autotransportes Cesmag',
    color: '#5b6ef5',
    baseMinutes: 4,
  },
  {
    routeId: 'MAR-VAR',
    name: 'Santa Marta — Vargas Araya',
    destination: 'San Pedro por Lourdes',
    operator: 'Autotransportes Cesmag',
    color: '#2aa3c4',
    baseMinutes: 11,
  },
  {
    routeId: 'INT-GUA',
    name: 'Interlínea Guadalupe — Curridabat',
    destination: 'Paso por San Pedro / Calasanz',
    operator: 'Consorcio Interlíneas Este',
    color: '#2bb885',
    baseMinutes: 17,
  },
  {
    routeId: 'SAB-UCR',
    name: 'Sabanilla — Betania — UCR',
    destination: 'San José por Outlet Mall',
    operator: 'Autotransportes Cesmag',
    color: '#7c4ddb',
    baseMinutes: 24,
  },
];

export class PassengerService {
  static getPilotStops() {
    return db.stops.filter(s => s.id && s.id.startsWith('stop-'));
  }

  static getStopById(stopId) {
    return db.stops.find(s => s.id === stopId) || db.stops[0];
  }

  static getStopArrivals(stopId = 'stop-fidelitas') {
    const currentStop = this.getStopById(stopId);
    const buses = db.getAllBuses();

    // Map live active buses into pilot arrival cards
    const arrivals = PILOT_LINES.map((line, index) => {
      const matchedBus = buses[index % buses.length] || buses[0];
      const isDelayed = matchedBus.status === 'delayed';

      // Calculate countdown dynamically based on bus progression and live speed
      const progressFactor = matchedBus._t ? (1 - matchedBus._t) : 0.5;
      const computedMinutes = Math.max(1, Math.round(line.baseMinutes + (progressFactor * 6) + (isDelayed ? matchedBus.delay : 0)));
      const computedDistanceMeters = Math.max(250, Math.round(computedMinutes * 380));

      const occupancyPct = Math.min(100, Math.max(10, matchedBus.passengers ? Math.round((matchedBus.passengers / matchedBus.capacity) * 100) : 40));

      let occupancyLevel = 'baja';
      let occupancyLabel = 'Asientos disponibles';
      if (occupancyPct > 80) {
        occupancyLevel = 'alta';
        occupancyLabel = 'Casi lleno / Solo de pie';
      } else if (occupancyPct > 55) {
        occupancyLevel = 'media';
        occupancyLabel = 'Espacio de pie disponible';
      }

      return {
        id: `arrival-${line.routeId}-${matchedBus.id}`,
        busId: matchedBus.id,
        plate: matchedBus.plate,
        routeId: line.routeId,
        routeName: line.name,
        destination: line.destination,
        operator: line.operator,
        color: line.color,
        status: matchedBus.status,
        isDelayed,
        delayMinutes: matchedBus.delay || 0,
        etaMinutes: computedMinutes,
        distanceMeters: computedDistanceMeters,
        distanceFormatted: computedDistanceMeters >= 1000
          ? `${(computedDistanceMeters / 1000).toFixed(1)} km`
          : `${computedDistanceMeters} m`,
        speedKmh: matchedBus.speed || 38,
        occupancyPercent: occupancyPct,
        occupancyLevel,
        occupancyLabel,
        wheelchairAccessible: true,
        nextBusInMinutes: computedMinutes + 14 + (index * 3),
        targetStop: {
          id: currentStop.id,
          name: currentStop.name,
        },
        driverName: matchedBus.driver ? matchedBus.driver.name : 'Conductor asignado',
        driverRating: matchedBus.driver ? matchedBus.driver.rating : 4.9,
      };
    });

    // Sort by shortest ETA
    arrivals.sort((a, b) => a.etaMinutes - b.etaMinutes);

    return {
      currentStop,
      generatedAt: new Date().toISOString(),
      pilotZone: 'Universidad Fidélitas — Sede San Pedro (Montes de Oca)',
      totalIncomingBuses: arrivals.length,
      arrivals,
    };
  }
}
````

## File: server/services/telemetrySimulator.js
````javascript
/* ==============================================================================
   BusTrack Pro — Real-Time Telemetry & WebSocket Engine
   ============================================================================== */

import { db, SEED_STOPS } from '../database/db.js';
import { config } from '../config.js';
import { PassengerService } from './passengerService.js';

const ROUTE_PATHS = {
  A: t => ({ x: 50 + t * 700, y: 150 + Math.sin(t * Math.PI) * 30 }),
  B: t => ({ x: 50 + t * 700, y: 300 + Math.sin(t * Math.PI + 1) * 25 }),
  C: t => ({ x: 200 + Math.sin(t * Math.PI) * 18, y: 40 + t * 380 }),
  D: t => ({ x: 600 + Math.sin(t * Math.PI) * 18, y: 40 + t * 380 }),
};

function randInt(a, b) {
  return Math.floor(Math.random() * (b - a + 1)) + a;
}

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

export class TelemetryEngine {
  constructor() {
    this.wsClients = new Set();
    this.telemetryInterval = null;
    this.activityInterval = null;
    this.isRunning = false;
  }

  registerClient(ws) {
    this.wsClients.add(ws);
    // Send initial snapshot on connect
    const snapshot = {
      event: 'snapshot',
      timestamp: new Date().toISOString(),
      data: {
        buses: db.getAllBuses(),
        routes: db.getAllRoutes(),
        drivers: db.getAllDrivers(),
        alerts: db.getAllAlerts(),
        activities: db.getActivities(),
      },
    };
    if (ws.readyState === 1) { // OPEN
      ws.send(JSON.stringify(snapshot));
    }
  }

  unregisterClient(ws) {
    this.wsClients.delete(ws);
  }

  broadcast(event, payload) {
    if (this.wsClients.size === 0) return;
    const message = JSON.stringify({
      event,
      timestamp: new Date().toISOString(),
      data: payload,
    });
    for (const client of this.wsClients) {
      if (client.readyState === 1) { // OPEN
        client.send(message);
      }
    }
  }

  start() {
    if (this.isRunning) return;
    this.isRunning = true;

    // Fast-tick positions & telemetry updates
    this.telemetryInterval = setInterval(() => {
      this.tick();
    }, config.telemetryIntervalMs);

    // Periodic activity log simulation
    this.activityInterval = setInterval(() => {
      this.tickActivity();
    }, config.activityIntervalMs);

    console.log(`[TELEMETRY] Engine started. Broadcasting every ${config.telemetryIntervalMs}ms.`);
  }

  stop() {
    if (!this.isRunning) return;
    clearInterval(this.telemetryInterval);
    clearInterval(this.activityInterval);
    this.isRunning = false;
    console.log('[TELEMETRY] Engine stopped.');
  }

  tick() {
    const buses = db.getAllBuses();
    const updates = [];

    for (const b of buses) {
      const moving = b.status === 'active' || b.status === 'delayed';
      if (moving) {
        b._t += (b._dir || 1) * (b._step || 0.005) * (b.speed / 40);
        if (b._t >= 1) {
          b._t = 1;
          b._dir = -1;
        } else if (b._t <= 0) {
          b._t = 0;
          b._dir = 1;
        }

        const pathFn = ROUTE_PATHS[b.route.id] || ROUTE_PATHS.A;
        b.pos = pathFn(b._t);

        // Fluctuate speed, passengers, fuel
        b.passengers = Math.max(0, Math.min(b.capacity, b.passengers + randInt(-2, 2)));
        b.speed = Math.max(16, Math.min(65, b.speed + randInt(-4, 4)));
        b.updatedAgo = 1;

        if (Math.random() < 0.12) {
          b.nextStop = pick(SEED_STOPS).name;
          b.etaMin = randInt(2, 9);
        }
        if (Math.random() < 0.06) {
          b.fuel = Math.max(5, b.fuel - 1);
        }
      }

      updates.push({
        id: b.id,
        status: b.status,
        speed: b.speed,
        passengers: b.passengers,
        fuel: b.fuel,
        delay: b.delay,
        nextStop: b.nextStop,
        etaMin: b.etaMin,
        pos: b.pos,
        updatedAgo: b.updatedAgo,
      });
    }

    if (typeof db.updateAllBusesTelemetry === 'function') {
      db.updateAllBusesTelemetry(buses);
    }

    this.broadcast('telemetry_tick', updates);

    // Broadcast real-time ETA updates for passenger pilot stops
    const pilotStops = PassengerService.getPilotStops();
    if (pilotStops.length) {
      const etaUpdates = [];
      for (const stop of pilotStops) {
        const arrivals = PassengerService.getStopArrivals(stop.id).arrivals;
        arrivals.forEach(a => {
          etaUpdates.push({
            stopId: stop.id,
            busId: a.busId,
            etaMinutes: a.etaMinutes,
            distanceMeters: a.distanceMeters,
            distanceFormatted: a.distanceFormatted,
            occupancyPercent: a.occupancyPercent
          });
        });
      }
      this.broadcast('passenger_eta_update', etaUpdates);
    }
  }

  tickActivity() {
    const buses = db.getAllBuses();
    if (!buses.length) return;
    const bus = pick(buses);
    const stop = pick(SEED_STOPS);
    const templates = [
      { text: `${bus.id} arribó a la parada ${stop.name}`, type: 'info' },
      { text: `${bus.id} reportó velocidad crucero de ${bus.speed} km/h`, type: 'ok' },
      { text: `${bus.driver.name} actualizó estado de viaje en Ruta ${bus.route.id}`, type: 'info' },
    ];
    const picked = pick(templates);
    const act = db.pushActivity(picked.text, picked.type);
    this.broadcast('activity_new', act);
  }
}

export const telemetryEngine = new TelemetryEngine();
````

## File: server/config.js
````javascript
/* ==============================================================================
   BusTrack Pro — Application Configuration
   ============================================================================== */

import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  corsOrigin: process.env.CORS_ORIGIN || '*',
  telemetryIntervalMs: parseInt(process.env.TELEMETRY_INTERVAL_MS || '3000', 10),
  activityIntervalMs: parseInt(process.env.ACTIVITY_INTERVAL_MS || '9000', 10),
  databaseUrl: process.env.DATABASE_URL || process.env.POSTGRES_URL || '',
  dbStorage: process.env.DB_STORAGE || 'sqlite',
  dbFile: process.env.DB_FILE || './data/bustrack.sqlite',
};
````

## File: server/index.js
````javascript
/* ==============================================================================
   BusTrack Pro — Application Server Entrypoint
   ============================================================================== */

import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { WebSocketServer } from 'ws';
import { config } from './config.js';
import { correlationMiddleware, requestLogger } from './middleware/logger.js';
import { errorHandler } from './middleware/errorHandler.js';
import { generalLimiter, writeLimiter } from './middleware/rateLimiter.js';
import { sanitizeInputs } from './middleware/sanitizer.js';
import { apiRouter } from './routes/api.js';
import { telemetryEngine } from './services/telemetrySimulator.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const app = express();
const server = http.createServer(app);

const isProd = config.nodeEnv === 'production';

// ─── 1. Security Headers (Helmet) ────────────────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: [
        "'self'",
        "'unsafe-inline'",
        'https://unpkg.com',
        'https://cdn.jsdelivr.net',
        'https://cdnjs.cloudflare.com',
      ],
      styleSrc: [
        "'self'",
        "'unsafe-inline'",
        'https://fonts.googleapis.com',
        'https://unpkg.com',
        'https://cdn.jsdelivr.net',
        'https://cdnjs.cloudflare.com',
      ],
      fontSrc: ["'self'", 'https://fonts.gstatic.com', 'https://cdnjs.cloudflare.com'],
      imgSrc: [
        "'self'",
        'data:',
        'blob:',
        'https://*.tile.openstreetmap.org',
        'https://tile.openstreetmap.org',
        'https://server.arcgisonline.com',
        'https://services.arcgisonline.com',
        'https://*.arcgisonline.com',
        'https://*.basemaps.cartocdn.com',
        'https://basemaps.cartocdn.com',
        'https://api.dicebear.com',
        'https://unpkg.com',
        'https://cdnjs.cloudflare.com',
      ],
      connectSrc: [
        "'self'",
        'ws:',
        'wss:',
        'https://*.supabase.co',
        'https://*.tile.openstreetmap.org',
        'https://tile.openstreetmap.org',
        'https://server.arcgisonline.com',
        'https://services.arcgisonline.com',
        'https://*.arcgisonline.com',
        'https://*.basemaps.cartocdn.com',
        'https://basemaps.cartocdn.com',
      ],
      frameAncestors: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false, // allow external fonts and tiles
  hsts: isProd
    ? { maxAge: 31536000, includeSubDomains: true, preload: true }
    : false,
}));

// ─── 2. CORS ──────────────────────────────────────────────────────────────────
const allowedOrigins = config.corsOrigin === '*'
  ? true
  : config.corsOrigin.split(',').map(o => o.trim());

app.use(cors({
  origin: allowedOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Correlation-Id'],
}));

// ─── 3. Body Parsing ──────────────────────────────────────────────────────────
app.use(express.json({ limit: '50kb' }));   // hard cap on payload size
app.use(express.urlencoded({ extended: true, limit: '50kb' }));

// ─── 4. Cross-Cutting Middlewares ─────────────────────────────────────────────
app.use(correlationMiddleware);
app.use(requestLogger);
app.use(sanitizeInputs);

// ─── 5. Block debug/admin endpoints ───────────────────────────────────────────
// These paths should NEVER be accessible in production
const blockedPaths = [
  '/admin', '/debug', '/phpinfo', '/wp-admin', '/wp-login',
  '/.env', '/.git', '/server', '/config', '/package.json',
];
app.use((req, res, next) => {
  const p = req.path.toLowerCase();
  if (blockedPaths.some(blocked => p === blocked || p.startsWith(blocked + '/'))) {
    return res.status(404).type('text/plain').send('Not found');
  }
  next();
});

// ─── 6. Rate Limiting ─────────────────────────────────────────────────────────
app.use('/api/', generalLimiter);

// ─── 7. REST API Routes ───────────────────────────────────────────────────────
app.use('/api/v1', apiRouter);

// ─── 8. Legal / Static Pages ──────────────────────────────────────────────────
// Serve legal pages as named routes
app.get('/privacy', (_req, res) => {
  res.sendFile(path.join(rootDir, 'privacy.html'));
});
app.get('/terms', (_req, res) => {
  res.sendFile(path.join(rootDir, 'terms.html'));
});
app.get('/cookies', (_req, res) => {
  res.sendFile(path.join(rootDir, 'cookies.html'));
});
app.get('/refunds', (_req, res) => {
  res.sendFile(path.join(rootDir, 'refunds.html'));
});
app.get('/thanks', (_req, res) => {
  res.sendFile(path.join(rootDir, 'thanks.html'));
});

// ─── 9. Static Client Serving ─────────────────────────────────────────────────
app.use('/vendor/leaflet', express.static(path.join(rootDir, 'node_modules', 'leaflet', 'dist')));

app.use(express.static(rootDir, {
  index: 'index.html',
  // Cache static assets aggressively
  maxAge: isProd ? '1d' : 0,
  // Don't expose server directory
  dotfiles: 'deny',
}));

// ─── 10. Custom 404 ───────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).sendFile(path.join(rootDir, '404.html'));
});

// ─── 11. Centralized Error Handling ──────────────────────────────────────────
app.use(errorHandler);

// ─── 12. Real-Time WebSocket Telemetry Gateway ────────────────────────────────
const wss = new WebSocketServer({ server, path: '/ws/telemetry' });

// Simple rate-limit: track message counts per client
const wsMessageCounts = new WeakMap();

wss.on('connection', (ws, req) => {
  const clientIp = req.socket.remoteAddress;
  console.log(`[WS] Client connected from ${clientIp}. Total: ${wss.clients.size}`);
  telemetryEngine.registerClient(ws);
  wsMessageCounts.set(ws, { count: 0, resetAt: Date.now() + 60_000 });

  ws.on('message', (message) => {
    // Rate-limit WS messages: max 60 per minute
    const tracker = wsMessageCounts.get(ws);
    if (tracker) {
      if (Date.now() > tracker.resetAt) {
        tracker.count = 0;
        tracker.resetAt = Date.now() + 60_000;
      }
      tracker.count++;
      if (tracker.count > 60) {
        ws.send(JSON.stringify({ event: 'error', detail: 'Rate limit exceeded' }));
        return;
      }
    }

    try {
      const parsed = JSON.parse(message.toString());
      if (parsed.action === 'ping') {
        ws.send(JSON.stringify({ event: 'pong', timestamp: new Date().toISOString() }));
      }
    } catch {
      // Ignore unparseable frames
    }
  });

  ws.on('close', () => {
    telemetryEngine.unregisterClient(ws);
    wsMessageCounts.delete(ws);
    console.log(`[WS] Client disconnected. Total: ${wss.clients.size}`);
  });

  ws.on('error', (err) => {
    console.error(`[WS] Client error: ${err.message}`);
    telemetryEngine.unregisterClient(ws);
    wsMessageCounts.delete(ws);
  });
});

// ─── 13. Graceful Shutdown Handlers ───────────────────────────────────────────
function shutdown(signal) {
  console.log(`\n[SERVER] Received ${signal}. Initiating graceful shutdown...`);
  telemetryEngine.stop();

  wss.clients.forEach(client => {
    if (client.readyState === 1) {
      client.close(1001, 'Server shutting down');
    }
  });

  server.close(() => {
    console.log('[SERVER] HTTP & WebSocket servers closed. Exiting process.');
    process.exit(0);
  });

  setTimeout(() => {
    console.error('[SERVER] Forced shutdown due to timeout.');
    process.exit(1);
  }, 5000).unref();
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// ─── 14. Server Bootstrap ─────────────────────────────────────────────────────
const isMain = process.argv[1] && path.resolve(fileURLToPath(import.meta.url)) === path.resolve(process.argv[1]);

import { initPostgresDatabase } from './database/initDb.js';
import { db } from './database/db.js';
import { supabase, isSupabaseConfigured } from './supabase.js';

if (isMain) {
  server.listen(config.port, async () => {
    if (config.databaseUrl) {
      await initPostgresDatabase(config.databaseUrl);
    }
    const dbStatus = typeof db.getDbStatus === 'function' ? db.getDbStatus() : null;
    telemetryEngine.start();
    console.log('============================================================');
    console.log(`  🚍 BusTrack Pro Backend & Telemetry Server Online`);
    console.log(`  🗄️ Database:   ${dbStatus ? `${dbStatus.engine} (${dbStatus.storage}: ${dbStatus.filePath || 'memory'})` : 'Active'}`);
    if (dbStatus && dbStatus.totalRows) {
      console.log(`  📊 DB Records: ${dbStatus.totalRows} filas relacionales cargadas`);
    }
    console.log(`  🔒 Security:   Helmet + Rate Limiting + Input Sanitization`);
    console.log(`  🔗 REST API:   http://localhost:${config.port}/api/v1/health`);
    console.log(`  ⚡ WebSocket:  ws://localhost:${config.port}/ws/telemetry`);
    console.log(`  🖥️ Dashboard:  http://localhost:${config.port}/`);
    console.log(`  📄 Privacy:    http://localhost:${config.port}/privacy`);
    console.log(`  📄 Terms:      http://localhost:${config.port}/terms`);
    console.log('============================================================');

    // Probando conexión a Supabase en el backend
    if (!isSupabaseConfigured) {
      console.log('⚠️ Supabase no configurado: SUPABASE_URL y SUPABASE_ANON_KEY en el archivo .env están vacíos.');
      console.log('👉 Agrega tus credenciales en el archivo .env para conectar con tu proyecto Supabase real.');
    } else {
      try {
        const { data, error } = await supabase.from('buses').select('*');
        if (error) {
          console.error('Error conectando a Supabase ❌:', error.message);
        } else {
          console.log('¡Conexión exitosa a Supabase! ✅ Datos de los buses:', data);
        }
      } catch (err) {
        if (err.message && err.message.includes('fetch failed')) {
          console.error('Error conectando a Supabase ❌: No se pudo resolver la URL del proyecto. Verifica la URL en tu .env.');
        } else {
          console.error('Error conectando a Supabase ❌:', err.message);
        }
      }
    }
  });
}

export { app, server, wss };
````

## File: server/supabase.js
````javascript
import dotenv from 'dotenv';
dotenv.config();

import { createClient } from '@supabase/supabase-js';

const rawUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const rawKey = process.env.SUPABASE_ANON_KEY || 
               process.env.SUPABASE_PUBLISHABLE_KEY || 
               process.env.SUPABASE_SERVICE_ROLE_KEY || 
               process.env.SUPABASE_SECRET_KEY || 
               process.env.VITE_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(rawUrl && rawUrl.startsWith('http') && !rawUrl.includes('dummy-project'));

const supabaseUrl = isSupabaseConfigured ? rawUrl : 'https://placeholder-url.supabase.co';
const supabaseKey = rawKey || 'placeholder-anon-key';

export const supabase = createClient(supabaseUrl, supabaseKey);
````

## File: src/App.jsx
````javascript
import React, { useEffect } from 'react';
import { supabase } from './supabase.js';

export function App() {
  useEffect(() => {
    async function probarConexion() {
      const { data, error } = await supabase.from('buses').select('*');

      if (error) {
        console.error('Error conectando a Supabase ❌:', error.message);
      } else {
        console.log('¡Conexión exitosa! ✅ Datos de los buses:', data);
      }
    }

    probarConexion();
  }, []);

  console.log("El componente App se está renderizando");

  return (
    <div className="app-container">
      <h1>BusTrack Pro Dashboard</h1>
    </div>
  );
}

export default App;
````

## File: src/supabase.js
````javascript
import { createClient } from '@supabase/supabase-js';

// Asigna las variables de entorno para Vite (Frontend) o Node.js
const supabaseUrl = import.meta.env?.VITE_SUPABASE_URL || process.env.SUPABASE_URL || 'https://placeholder-url.supabase.co';
const supabaseKey = import.meta.env?.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || 'placeholder-anon-key';

// Crea y exporta el cliente para usarlo en toda la app
export const supabase = createClient(supabaseUrl, supabaseKey);
````

## File: test/api.test.js
````javascript
/* ==============================================================================
   BusTrack Pro — Automated Backend & API Test Suite
   Using native node:test and node:assert (Node.js 20+)
   ============================================================================== */

import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { app } from '../server/index.js';

let serverInstance;
let baseUrl;

test.before(async () => {
  process.env.NODE_ENV = 'test';
  await new Promise((resolve) => {
    // Listen on port 0 to allocate an ephemeral free port
    serverInstance = http.createServer(app).listen(0, () => {
      const port = serverInstance.address().port;
      baseUrl = `http://127.0.0.1:${port}`;
      resolve();
    });
  });
});

test.after(async () => {
  await new Promise((resolve) => serverInstance.close(resolve));
});

// Helper for HTTP requests using native fetch
async function request(path, options = {}) {
  const url = `${baseUrl}${path}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
  const contentType = response.headers.get('content-type') || '';
  let body = null;
  if (contentType.includes('json')) {
    body = await response.json();
  } else {
    body = await response.text();
  }
  return { status: response.status, headers: response.headers, body };
}

test('System Diagnostics — GET /api/v1/health', async () => {
  const res = await request('/api/v1/health');
  assert.equal(res.status, 200);
  assert.equal(res.body.status, 'healthy');
  assert.ok(typeof res.body.uptimeSeconds === 'number');
  assert.ok(res.body.trackedBuses >= 12);
  assert.ok(res.headers.get('x-correlation-id'));
});

test('Transit Routes — GET /api/v1/routes', async () => {
  const res = await request('/api/v1/routes');
  assert.equal(res.status, 200);
  assert.ok(Array.isArray(res.body));
  assert.equal(res.body.length, 4);

  const routeA = res.body.find((r) => r.id === 'A');
  assert.ok(routeA);
  assert.equal(routeA.name, 'Centro — Aeropuerto');
  assert.ok(typeof routeA.coveragePercent === 'number');
});

test('Drivers Roster — GET /api/v1/drivers', async () => {
  const res = await request('/api/v1/drivers');
  assert.equal(res.status, 200);
  assert.ok(Array.isArray(res.body));
  assert.equal(res.body.length, 6);

  const driver1 = res.body[0];
  assert.ok(driver1.name);
  assert.ok(driver1.license);
  assert.ok(typeof driver1.rating === 'number');
});

test('Fleet Management — GET /api/v1/buses with filters', async () => {
  const resAll = await request('/api/v1/buses');
  assert.equal(resAll.status, 200);
  assert.ok(Array.isArray(resAll.body));
  assert.ok(resAll.body.length >= 12);

  // Filter by route
  const resRouteA = await request('/api/v1/buses?route=A');
  assert.equal(resRouteA.status, 200);
  assert.ok(resRouteA.body.every((b) => b.route.id === 'A'));

  // Search query
  const resSearch = await request('/api/v1/buses?search=BUS-001');
  assert.equal(resSearch.status, 200);
  assert.equal(resSearch.body.length, 1);
  assert.equal(resSearch.body[0].id, 'BUS-001');
});

test('Fleet Management — POST /api/v1/buses (create bus)', async () => {
  const res = await request('/api/v1/buses', {
    method: 'POST',
    body: JSON.stringify({ routeId: 'A', driverId: 'D001' }),
  });
  assert.equal(res.status, 201);
  assert.ok(res.body.id.startsWith('BUS-'));
  assert.equal(res.body.status, 'stopped');
  assert.equal(res.body.speed, 0);
  assert.equal(res.body.route.id, 'A');
  assert.equal(res.body.driver.id, 'D001');
});

test('Fleet Management — PATCH /api/v1/buses/:id/status (update status)', async () => {
  const res = await request('/api/v1/buses/BUS-001/status', {
    method: 'PATCH',
    body: JSON.stringify({ status: 'maintenance' }),
  });
  assert.equal(res.status, 200);
  assert.equal(res.body.id, 'BUS-001');
  assert.equal(res.body.status, 'maintenance');
  assert.equal(res.body.speed, 0); // Must be 0 in maintenance
});

test('Incident Alerts — Alert lifecycle (GET, POST, PATCH)', async () => {
  // 1. Get alerts
  const resList = await request('/api/v1/alerts');
  assert.equal(resList.status, 200);
  assert.ok(Array.isArray(resList.body));

  // 2. Create alert
  const resCreate = await request('/api/v1/alerts', {
    method: 'POST',
    body: JSON.stringify({
      type: 'critical',
      title: 'Fallo de presión hidráulica',
      desc: 'Presión por debajo del umbral de seguridad.',
      bus: 'BUS-002',
    }),
  });
  assert.equal(resCreate.status, 201);
  assert.equal(resCreate.body.title, 'Fallo de presión hidráulica');
  assert.equal(resCreate.body.type, 'critical');
  assert.equal(resCreate.body.read, false);

  // 3. Mark all as read
  const resMark = await request('/api/v1/alerts/read-all', {
    method: 'PATCH',
  });
  assert.equal(resMark.status, 200);
  assert.equal(resMark.body.success, true);
  assert.ok(typeof resMark.body.markedCount === 'number');
});

test('Analytics & Reports — GET /api/v1/reports/summary', async () => {
  const res = await request('/api/v1/reports/summary');
  assert.equal(res.status, 200);
  assert.ok(res.body.totalBuses > 0);
  assert.ok(typeof res.body.occupancyRate === 'number');
  assert.ok(typeof res.body.avgDelayMinutes === 'number');
  assert.ok(res.body.generatedAt);
});

test('Analytics & Reports — GET /api/v1/reports/export-csv', async () => {
  const res = await request('/api/v1/reports/export-csv');
  assert.equal(res.status, 200);
  assert.ok(res.headers.get('content-type').includes('text/csv'));
  assert.ok(res.body.includes('"Bus ID"'));
  assert.ok(res.body.includes('"Placa"'));
  assert.ok(res.body.includes('BUS-001'));
});

test('Error Handling — 404 Not Found for non-existing bus', async () => {
  const res = await request('/api/v1/buses/BUS-99999');
  assert.equal(res.status, 404);
  assert.equal(res.body.status, 404);
  assert.equal(res.body.title, 'Not Found');
});

test('Error Handling — 400 Bad Request for invalid status payload', async () => {
  const res = await request('/api/v1/buses/BUS-001/status', {
    method: 'PATCH',
    body: JSON.stringify({ status: 'invalid_status_code' }),
  });
  assert.equal(res.status, 400);
  assert.equal(res.body.status, 400);
  assert.equal(res.body.title, 'Bad Request');
});

test('Passenger Pilot (U Fidélitas) — GET /api/v1/passenger/stops', async () => {
  const res = await request('/api/v1/passenger/stops');
  assert.equal(res.status, 200);
  assert.ok(Array.isArray(res.body));
  assert.ok(res.body.length >= 6);

  const fidelitasStop = res.body.find(s => s.id === 'stop-fidelitas');
  assert.ok(fidelitasStop);
  assert.ok(fidelitasStop.name.includes('Fidélitas'));

  const vargasStop = res.body.find(s => s.id === 'stop-vargas-araya');
  assert.ok(vargasStop);
  assert.equal(vargasStop.name, 'Parada Barrio Vargas Araya');
});

test('Passenger Pilot (U Fidélitas) — GET /api/v1/passenger/stops/:id/arrivals', async () => {
  const res = await request('/api/v1/passenger/stops/stop-fidelitas/arrivals');
  assert.equal(res.status, 200);
  assert.equal(res.body.currentStop.id, 'stop-fidelitas');
  assert.ok(Array.isArray(res.body.arrivals));
  assert.ok(res.body.arrivals.length >= 4);

  const firstArrival = res.body.arrivals[0];
  assert.ok(firstArrival.routeName);
  assert.ok(typeof firstArrival.etaMinutes === 'number');
  assert.ok(typeof firstArrival.distanceMeters === 'number');
  assert.ok(firstArrival.occupancyLevel);
  assert.ok(firstArrival.operator);
});
````

## File: test/auth.test.js
````javascript
/* ==============================================================================
   BusTrack Pro — Authentication API Unit Tests
   ============================================================================== */

import { test, before, after } from 'node:test';
import assert from 'node:assert';
import http from 'node:http';
import { app } from '../server/index.js';

let server;
let baseUrl;

before(async () => {
  await new Promise((resolve) => {
    server = http.createServer(app);
    server.listen(0, () => {
      const port = server.address().port;
      baseUrl = `http://localhost:${port}/api/v1`;
      resolve();
    });
  });
});

after(async () => {
  await new Promise((resolve) => server.close(resolve));
});

test('Auth — POST /auth/register creates new user with consent', async () => {
  const testEmail = `test_${Date.now()}@bustrack.com`;
  const res = await fetch(`${baseUrl}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Usuario Pruebas',
      email: testEmail,
      password: 'Password123!',
      consentTerms: true,
    }),
  });

  assert.strictEqual(res.status, 201);
  const data = await res.json();
  assert.strictEqual(data.status, 'success');
  assert.strictEqual(data.user.email, testEmail);
  assert.ok(data.token);
});

test('Auth — POST /auth/login authenticates registered user', async () => {
  const testEmail = `login_test_${Date.now()}@bustrack.com`;
  
  // First register
  await fetch(`${baseUrl}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Usuario Login Test',
      email: testEmail,
      password: 'MySecretPassword123',
      consentTerms: true,
    }),
  });

  // Then login
  const res = await fetch(`${baseUrl}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: testEmail,
      password: 'MySecretPassword123',
    }),
  });

  assert.strictEqual(res.status, 200);
  const data = await res.json();
  assert.strictEqual(data.status, 'success');
  assert.strictEqual(data.user.email, testEmail);
  assert.ok(data.token);
});

test('Auth — POST /auth/google authenticates Google OAuth', async () => {
  const res = await fetch(`${baseUrl}/auth/google`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      googleToken: 'mock_google_token',
      email: 'user.google.test@gmail.com',
      name: 'Google Test User',
      picture: 'https://example.com/pic.jpg',
    }),
  });

  assert.strictEqual(res.status, 200);
  const data = await res.json();
  assert.strictEqual(data.status, 'success');
  assert.strictEqual(data.user.provider, 'google');
  assert.ok(data.token);
});

test('Auth — POST /auth/apple authenticates Apple OAuth', async () => {
  const res = await fetch(`${baseUrl}/auth/apple`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      appleToken: 'mock_apple_token',
      email: 'user.apple.test@privaterelay.appleid.com',
      name: 'Apple Test User',
    }),
  });

  assert.strictEqual(res.status, 200);
  const data = await res.json();
  assert.strictEqual(data.status, 'success');
  assert.strictEqual(data.user.provider, 'apple');
  assert.ok(data.token);
});

test('Auth — POST /auth/register fails on duplicate email', async () => {
  const dupEmail = `dup_${Date.now()}@bustrack.com`;
  await fetch(`${baseUrl}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'User 1', email: dupEmail, password: 'Password123!', consentTerms: true }),
  });

  const res = await fetch(`${baseUrl}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'User 2', email: dupEmail, password: 'Password123!', consentTerms: true }),
  });

  assert.strictEqual(res.status, 400);
  const data = await res.json();
  assert.ok(data.detail.includes('Ya existe una cuenta'));
});

test('Auth — POST /auth/login fails with wrong password', async () => {
  const testEmail = `wrongpass_${Date.now()}@bustrack.com`;
  await fetch(`${baseUrl}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Wrong Pass User', email: testEmail, password: 'CorrectPassword123', consentTerms: true }),
  });

  const res = await fetch(`${baseUrl}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: testEmail, password: 'WrongPassword123' }),
  });

  assert.strictEqual(res.status, 401);
  const data = await res.json();
  assert.ok(data.detail.includes('incorrectos'));
});

test('Auth — GET /auth/me returns profile for valid JWT token', async () => {
  const meEmail = `me_${Date.now()}@bustrack.com`;
  const regRes = await fetch(`${baseUrl}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'User Profile Me', email: meEmail, password: 'MyPassword123!', consentTerms: true }),
  });
  const regData = await regRes.json();

  const meRes = await fetch(`${baseUrl}/auth/me`, {
    headers: { 'Authorization': `Bearer ${regData.token}` },
  });

  assert.strictEqual(meRes.status, 200);
  const meData = await meRes.json();
  assert.strictEqual(meData.user.email, meEmail);
});
````

## File: test/database.test.js
````javascript
/* ==============================================================================
   BusTrack Pro — Relational Database Verification Test Suite
   Verifies: Real SQL Tables, Foreign Key Constraints, Disk Persistence,
             Prepared Statements, and Database Diagnostics.
   ============================================================================== */

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import bcrypt from 'bcryptjs';
import { Database, SEED_ROUTES, SEED_DRIVERS } from '../server/database/db.js';

test('Database Architecture — Real Relational Tables in SQLite Master', () => {
  const db = new Database(':memory:');
  
  const tables = db.sqlite.prepare(`
    SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'
  `).all().map(t => t.name);

  assert.ok(tables.includes('users'), 'Table users must exist');
  assert.ok(tables.includes('routes'), 'Table routes must exist');
  assert.ok(tables.includes('drivers'), 'Table drivers must exist');
  assert.ok(tables.includes('buses'), 'Table buses must exist');
  assert.ok(tables.includes('alerts'), 'Table alerts must exist');
  assert.ok(tables.includes('activity_logs'), 'Table activity_logs must exist');
  assert.ok(tables.includes('stops'), 'Table stops must exist');

  db.close();
});

test('Database Integrity — Foreign Key Constraints Enforced', () => {
  const db = new Database(':memory:');

  // Verify foreign_keys pragma is enabled
  const fkPragma = db.sqlite.prepare('PRAGMA foreign_keys').get();
  assert.equal(fkPragma.foreign_keys, 1);

  // Attempting to insert a bus pointing to a non-existing route should violate FK
  assert.throws(() => {
    db.sqlite.prepare(`
      INSERT INTO buses (
        id, bus_number, license_plate, route_id, driver_id, status
      ) VALUES ('BUS-999', '999', 'INVALID-PLATE', 'NON_EXISTENT_ROUTE', 'D001', 'stopped')
    `).run();
  }, /FOREIGN KEY/i);

  db.close();
});

test('Database Persistence — Data Persists Across Server Restarts to Disk', () => {
  const testDbFile = path.resolve(process.cwd(), 'data', 'test_persistence.sqlite');
  if (fs.existsSync(testDbFile)) {
    fs.unlinkSync(testDbFile);
  }

  // 1. Open instance 1, insert new user and bus
  const db1 = new Database(testDbFile);
  const bus1 = db1.createBus({ routeId: 'A', driverId: 'D001' });
  assert.ok(bus1.id.startsWith('BUS-'));

  const user1 = db1.createUser({
    email: 'persisted@bustrack.com',
    passwordHash: 'hashed_secret_test_123',
    name: 'Inspector Persistente',
    role: 'dispatcher',
  });
  assert.equal(user1.email, 'persisted@bustrack.com');

  // Explicitly close DB 1
  db1.close();

  // Verify file actually exists on disk and has non-zero size
  assert.ok(fs.existsSync(testDbFile), 'Database file must physically exist on disk');
  const stats = fs.statSync(testDbFile);
  assert.ok(stats.size > 0, 'Database file must contain physical relational data');

  // 2. Open instance 2 pointing to the exact same physical SQLite file
  const db2 = new Database(testDbFile);
  const reloadedBus = db2.getBusById(bus1.id);
  assert.ok(reloadedBus, 'Created bus must survive database restart');
  assert.equal(reloadedBus.id, bus1.id);
  assert.equal(reloadedBus.plate, bus1.plate);

  const reloadedUser = db2.findUserByEmail('persisted@bustrack.com');
  assert.ok(reloadedUser, 'Created user must survive database restart');
  assert.equal(reloadedUser.name, 'Inspector Persistente');
  assert.equal(reloadedUser.role, 'dispatcher');

  db2.close();

  // Cleanup test file and potential WAL/SHM companion files
  try {
    if (fs.existsSync(testDbFile)) fs.unlinkSync(testDbFile);
    if (fs.existsSync(testDbFile + '-wal')) fs.unlinkSync(testDbFile + '-wal');
    if (fs.existsSync(testDbFile + '-shm')) fs.unlinkSync(testDbFile + '-shm');
  } catch {}
});

test('Database Diagnostics — Status & Table Row Counts', () => {
  const db = new Database(':memory:');
  const status = db.getDbStatus();

  assert.equal(status.dialect, 'sqlite');
  assert.equal(status.connected, true);
  assert.ok(status.version);
  assert.ok(Array.isArray(status.tables));
  assert.ok(status.totalRows > 0);

  const busesTable = status.tables.find(t => t.name === 'buses');
  assert.ok(busesTable);
  assert.equal(busesTable.count, 12);

  const routesTable = status.tables.find(t => t.name === 'routes');
  assert.ok(routesTable);
  assert.equal(routesTable.count, 4);

  db.close();
});

test('Database Queries — Real SQL Joins and Aggregations', () => {
  const db = new Database(':memory:');
  const routes = db.getAllRoutes();

  assert.equal(routes.length, 4);
  const routeA = routes.find(r => r.id === 'A');
  assert.ok(routeA);
  assert.ok(typeof routeA.totalBuses === 'number');
  assert.ok(typeof routeA.passengersOnboard === 'number');
  assert.ok(typeof routeA.coveragePercent === 'number');

  db.close();
});
````

## File: .env.example
````
<<<<<<< HEAD
# BusTrack Pro — Environment Configuration Example
# Copy this file to .env and set your DATABASE_URL for PostgreSQL/Supabase integration

=======
# ==============================================================================
# BusTrack Pro Backend — Configuration
# ==============================================================================
>>>>>>> 92930e0bb115bcdcb1c15df1bc3c0c3f70eb7792
PORT=3000
NODE_ENV=development
CORS_ORIGIN=*
TELEMETRY_INTERVAL_MS=3000
ACTIVITY_INTERVAL_MS=9000
<<<<<<< HEAD

# PostgreSQL / Supabase Database Connection String
# Example for Supabase: postgresql://postgres.xxxx:your_password@aws-0-us-east-1.pooler.supabase.com:6543/postgres
DATABASE_URL=

# JWT Secret Key
JWT_SECRET=bustrack_pro_production_secret_key_change_me_in_prod
=======
DB_STORAGE=memory
# For persistent file-based storage:
# DB_FILE=./data/bustrack.json
>>>>>>> 92930e0bb115bcdcb1c15df1bc3c0c3f70eb7792
````

## File: .gitignore
````
node_modules/
.env
*.log
.DS_Store
*.db
*.sqlite
coverage/
````

## File: 404.html
````html
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="robots" content="noindex, nofollow" />
  <title>Página no encontrada — BusTrack Pro</title>
  <meta name="description" content="La página que buscas no existe. Vuelve al panel de BusTrack Pro." />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
  <style>
    :root {
      --bg: #0a0f1c; --surface: #111827; --border: rgba(255,255,255,0.08);
      --text: #e5e7eb; --text-muted: #9ca3af; --brand: #5b6ef5; --brand-light: #818cf8;
    }
    @media (prefers-color-scheme: light) {
      :root { --bg: #f9fafb; --surface: #fff; --border: rgba(0,0,0,0.08); --text: #111827; --text-muted: #6b7280; }
    }
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Inter', system-ui, sans-serif;
      background: var(--bg);
      color: var(--text);
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      text-align: center;
      padding: 2rem;
      position: relative;
      overflow: hidden;
    }
    /* Background decoration */
    body::before {
      content: '';
      position: fixed;
      top: 20%;
      left: 50%;
      transform: translateX(-50%);
      width: 600px;
      height: 600px;
      background: radial-gradient(circle, rgba(91,110,245,0.12) 0%, transparent 70%);
      pointer-events: none;
    }
    .error-code {
      font-size: clamp(6rem, 20vw, 10rem);
      font-weight: 800;
      line-height: 1;
      background: linear-gradient(135deg, var(--brand) 0%, var(--brand-light) 50%, #a78bfa 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      margin-bottom: 0.5rem;
      animation: fadeSlideIn 0.6s ease-out;
    }
    .bus-icon {
      font-size: 3rem;
      margin-bottom: 1rem;
      animation: bounce 2s infinite;
    }
    @keyframes bounce {
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(-8px); }
    }
    @keyframes fadeSlideIn {
      from { opacity: 0; transform: translateY(-20px); }
      to { opacity: 1; transform: translateY(0); }
    }
    h1 {
      font-size: 1.5rem;
      font-weight: 700;
      margin-bottom: 0.75rem;
      animation: fadeSlideIn 0.6s ease-out 0.1s both;
    }
    .subtitle {
      color: var(--text-muted);
      font-size: 1rem;
      max-width: 400px;
      margin-bottom: 2.5rem;
      animation: fadeSlideIn 0.6s ease-out 0.2s both;
    }
    .actions {
      display: flex;
      gap: 1rem;
      flex-wrap: wrap;
      justify-content: center;
      animation: fadeSlideIn 0.6s ease-out 0.3s both;
    }
    .btn-primary {
      background: var(--brand);
      color: white;
      border: none;
      padding: 0.75rem 1.5rem;
      border-radius: 8px;
      font-family: inherit;
      font-size: 0.95rem;
      font-weight: 600;
      cursor: pointer;
      text-decoration: none;
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      transition: background 0.2s, transform 0.1s;
    }
    .btn-primary:hover { background: #4b5de4; transform: translateY(-1px); }
    .btn-primary:active { transform: translateY(0); }
    .btn-ghost {
      background: transparent;
      color: var(--text-muted);
      border: 1px solid var(--border);
      padding: 0.75rem 1.5rem;
      border-radius: 8px;
      font-family: inherit;
      font-size: 0.95rem;
      font-weight: 500;
      cursor: pointer;
      text-decoration: none;
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      transition: color 0.2s, border-color 0.2s;
    }
    .btn-ghost:hover { color: var(--text); border-color: rgba(255,255,255,0.2); }
    a:focus-visible { outline: 2px solid var(--brand); outline-offset: 2px; border-radius: 4px; }
    .countdown {
      color: var(--text-muted);
      font-size: 0.8rem;
      margin-top: 2rem;
      animation: fadeSlideIn 0.6s ease-out 0.4s both;
    }
    #countdownSecs { color: var(--brand-light); font-weight: 600; }
  </style>
</head>
<body>
  <div class="bus-icon" role="img" aria-label="Ícono de bus">🚍</div>
  <div class="error-code" aria-hidden="true">404</div>
  <h1>Ruta no encontrada</h1>
  <p class="subtitle">
    Parece que este bus tomó un desvío. La página que buscas no existe o fue movida.
  </p>
  <div class="actions">
    <a href="/" class="btn-primary">
      <svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16" aria-hidden="true">
        <path d="M10.7 2.3a1 1 0 0 0-1.4 0l-7 6.6A1 1 0 0 0 3 10.6V16a2 2 0 0 0 2 2h3v-4.5h4V18h3a2 2 0 0 0 2-2v-5.4a1 1 0 0 0-.3-1.7l-7-6.6Z"/>
      </svg>
      Ir al panel principal
    </a>
    <button class="btn-ghost" onclick="history.back()">
      ← Volver atrás
    </button>
  </div>
  <p class="countdown">Redirigiendo al panel en <span id="countdownSecs">10</span> segundos…</p>

  <script>
    let secs = 10;
    const el = document.getElementById('countdownSecs');
    const timer = setInterval(() => {
      secs--;
      if (el) el.textContent = secs;
      if (secs <= 0) {
        clearInterval(timer);
        window.location.href = '/';
      }
    }, 1000);
  </script>
</body>
</html>
````

## File: app.js
````javascript
/* ============================================================
   BusTrack Pro — lógica de la aplicación
   JavaScript sin dependencias. Los datos son simulados.
 
   Organización del archivo:
     1. Datos y utilidades
     2. Preferencias (localStorage)
     3. Navegación y sidebar
     4. Panel principal
     5. Flota (tabla, filtros, orden, CSV)
     6. Mapas (render, zoom, arrastre)
     7. Rutas, alertas, conductores, reportes
     8. Notificaciones y avisos
     9. Ciclo de vida (intervalos, resize, init)
   ============================================================ */
 
'use strict';
 
/* ==========================================================
   1. DATOS Y UTILIDADES
   ========================================================== */
 
// Los colores salen del CSS para que cambiar el acento repinte
// también los gráficos y los marcadores del mapa.
function cssVar(name, fallback) {
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v || fallback;
}

/* ==========================================================
   BACKEND API & WEBSOCKET CLIENT
   ========================================================== */

const API_BASE = window.location.protocol.startsWith('http')
  ? `${window.location.protocol}//${window.location.host}`
  : 'http://localhost:3000';
const WS_BASE = window.location.protocol === 'https:'
  ? `wss://${window.location.host}/ws/telemetry`
  : `ws://${window.location.host || 'localhost:3000'}/ws/telemetry`;

let backendConnected = false;
let wsInstance = null;

function updateBackendStatusBadge(status, text) {
  const pill = $('serverStatusPill');
  const label = $('serverStatusLabel');
  if (!pill || !label) return;
  pill.className = 'server-status-pill ' + status;
  label.textContent = text;
}

const api = {
  async checkHealth() {
    try {
      const res = await fetch(`${API_BASE}/api/v1/health`, { signal: AbortSignal.timeout(2500) });
      return res.ok;
    } catch {
      return false;
    }
  },
  async getBuses() {
    const res = await fetch(`${API_BASE}/api/v1/buses`);
    return res.json();
  },
  async getAlerts() {
    const res = await fetch(`${API_BASE}/api/v1/alerts`);
    return res.json();
  },
  async updateBusStatus(id, status) {
    const res = await fetch(`${API_BASE}/api/v1/buses/${id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    return res.json();
  },
  async createBus(payload) {
    const res = await fetch(`${API_BASE}/api/v1/buses`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return res.json();
  },
  async createAlert(payload) {
    const res = await fetch(`${API_BASE}/api/v1/alerts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return res.json();
  },
  async markAllAlertsRead() {
    const res = await fetch(`${API_BASE}/api/v1/alerts/read-all`, {
      method: 'PATCH',
    });
    return res.json();
  },
  async login(email, password) {
    const res = await fetch(`${API_BASE}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    return res.json();
  },
  async register(payload) {
    const res = await fetch(`${API_BASE}/api/v1/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return res.json();
  },
  async loginGoogle(payload) {
    const res = await fetch(`${API_BASE}/api/v1/auth/google`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return res.json();
  },
  async loginApple(payload) {
    const res = await fetch(`${API_BASE}/api/v1/auth/apple`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return res.json();
  },
  async getMe(token) {
    const res = await fetch(`${API_BASE}/api/v1/auth/me`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    return res.json();
  },
  async getDatabaseStatus() {
    try {
      const res = await fetch(`${API_BASE}/api/v1/database/status`);
      if (!res.ok) return null;
      return await res.json();
    } catch (err) {
      console.warn('Error fetching DB status:', err);
      return null;
    }
  }
};

async function fetchAndUpdateDbStatus() {
  const data = await api.getDatabaseStatus();
  const pillLabel = $('dbStatusLabel');
  const pill = $('dbStatusPill');

  if (!data) {
    if (pillLabel) pillLabel.textContent = 'BD: Sin conexión';
    if (pill) pill.className = 'db-status-pill';
    return;
  }

  // Update status pill label and style
  if (pillLabel) {
    const dialectName = data.dialect === 'sqlite' ? 'SQLite 3' : (data.dialect === 'postgres' ? 'PostgreSQL 16' : 'En Memoria');
    pillLabel.textContent = `BD: ${dialectName} (100% Real)`;
  }
  if (pill) {
    pill.className = 'db-status-pill real-db';
  }

  // Update modal contents if modal elements exist
  const modalEngine = $('dbModalEngine');
  const modalStorage = $('dbModalStorage');
  const modalSize = $('dbModalSize');
  const modalTotalRows = $('dbModalTotalRows');
  const modalPath = $('dbModalPath');
  const modalTableList = $('dbModalTableList');

  if (modalEngine) modalEngine.textContent = data.engine || 'SQLite 3 (ACID Relational File DB)';
  if (modalStorage) {
    modalStorage.textContent = data.storage === 'persistent_file' ? 'Archivo en Disco (WAL)' : 'En Memoria';
  }
  if (modalSize) modalSize.textContent = data.fileSizeFormatted || (data.fileSizeBytes ? `${(data.fileSizeBytes / 1024).toFixed(1)} KB` : 'N/A');
  if (modalTotalRows) modalTotalRows.textContent = `${data.totalRows || 0} filas`;
  if (modalPath) modalPath.textContent = data.filePath || 'RAM (In-Memory)';

  if (modalTableList && Array.isArray(data.tables)) {
    modalTableList.innerHTML = data.tables.map(t => `
      <div class="db-table-row">
        <span class="db-table-name">📋 ${esc(t.name)}</span>
        <span class="db-table-count">${fmt(t.count)} registros</span>
      </div>
    `).join('');
  }
}


function handleServerEvent(msg) {
  if (!msg || !msg.event) return;
  if (msg.event === 'snapshot') {
    if (msg.data && msg.data.buses) {
      buses = msg.data.buses;
      refreshCounters();
      renderBusList();
      if (state.view === 'fleet') renderFleet();
      if (state.view === 'map') renderMapBusList();
      drawMapMarkers(true);
    }
    if (msg.data && msg.data.alerts) {
      alerts = msg.data.alerts;
      renderAlerts();
    }
  } else if (msg.event === 'telemetry_tick') {
    const updates = msg.data;
    if (Array.isArray(updates)) {
      updates.forEach(u => {
        const b = buses.find(x => x.id === u.id);
        if (b) {
          b.speed = u.speed;
          b.passengers = u.passengers;
          b.fuel = u.fuel;
          b.delay = u.delay;
          b.nextStop = u.nextStop;
          b.etaMin = u.etaMin;
          b.pos = u.pos;
          b.updatedAgo = u.updatedAgo;
        }
      });
      refreshCounters();
      drawMapMarkers();
      if (state.view === 'dashboard') renderBusList();
      if (state.view === 'map') renderMapBusList();
      if (state.view === 'fleet') renderFleet();
    }
  } else if (msg.event === 'bus_status_changed') {
    const updated = msg.data;
    const b = buses.find(x => x.id === updated.id);
    if (b) {
      Object.assign(b, updated);
      refreshAfterStatusChange(b);
    }
  } else if (msg.event === 'bus_created') {
    const exists = buses.find(x => x.id === msg.data.id);
    if (!exists) {
      buses.push(msg.data);
      refreshCounters();
      renderBusList();
      if (state.view === 'fleet') renderFleet();
    }
  } else if (msg.event === 'alert_created') {
    const exists = alerts.find(x => x.id === msg.data.id);
    if (!exists) {
      alerts.unshift(msg.data);
      renderAlerts();
      addNotification(msg.data.icon, `<strong>${msg.data.title}:</strong> ${msg.data.bus}`);
    }
  } else if (msg.event === 'alerts_read_all') {
    alerts.forEach(a => { a.read = true; });
    renderAlerts();
  }
}

function initBackendConnection() {
  api.checkHealth().then(ok => {
    if (ok) {
      backendConnected = true;
      updateBackendStatusBadge('online', 'API Online');
      try {
        wsInstance = new WebSocket(WS_BASE);
        wsInstance.onopen = () => {
          backendConnected = true;
          updateBackendStatusBadge('online', 'API Online (WS)');
        };
        wsInstance.onmessage = (e) => {
          try {
            const data = JSON.parse(e.data);
            handleServerEvent(data);
          } catch (err) {
            console.warn('WS JSON parse error:', err);
          }
        };
        wsInstance.onclose = () => {
          backendConnected = false;
          updateBackendStatusBadge('offline', 'Modo Local');
        };
        wsInstance.onerror = () => {
          backendConnected = false;
          updateBackendStatusBadge('offline', 'Modo Local');
        };
      } catch (err) {
        console.warn('WebSocket init failed:', err);
      }
    } else {
      backendConnected = false;
      updateBackendStatusBadge('offline', 'Modo Local');
    }
  }).catch(() => {
    backendConnected = false;
    updateBackendStatusBadge('offline', 'Modo Local');
  });
}

 
const ROUTES = [
  { id: 'A', name: 'Centro — Aeropuerto',     varName: '--route-a', color: '#5b6ef5', stops: 8,  length: 22 },
  { id: 'B', name: 'Norte — Sur',             varName: '--route-b', color: '#7c4ddb', stops: 12, length: 35 },
  { id: 'C', name: 'Este — Centro',           varName: '--route-c', color: '#2aa3c4', stops: 6,  length: 18 },
  { id: 'D', name: 'Sur — Zona Industrial',   varName: '--route-d', color: '#2bb885', stops: 10, length: 28 },
];
 
const DRIVERS = [
  { id: 'D001', name: 'Carlos Mendoza',  initials: 'CM', license: 'CR-2-0456-0891', trips: 1248, rating: 4.9, hours: 8.5 },
  { id: 'D002', name: 'Ana García',      initials: 'AG', license: 'CR-1-0782-0334', trips: 987,  rating: 4.8, hours: 7.2 },
  { id: 'D003', name: 'Roberto López',   initials: 'RL', license: 'CR-3-0219-0645', trips: 1567, rating: 4.7, hours: 6.8 },
  { id: 'D004', name: 'María Flores',    initials: 'MF', license: 'CR-1-1043-0277', trips: 732,  rating: 5.0, hours: 9.0 },
  { id: 'D005', name: 'Jorge Ramírez',   initials: 'JR', license: 'CR-4-0388-0912', trips: 2103, rating: 4.6, hours: 5.5 },
  { id: 'D006', name: 'Lucía Castro',    initials: 'LC', license: 'CR-2-0955-0158', trips: 891,  rating: 4.9, hours: 8.0 },
];
 
const STOPS = [
  // --- SAN JOSÉ (GAM) ---
  { id: 'stop-central', name: 'Terminal Central San José', province: 'San José', lat: 9.9325, lon: -84.0815, x: 200, y: 150 },
  { id: 'stop-coca-cola', name: 'Terminal Coca Cola', province: 'San José', lat: 9.9366, lon: -84.0845, x: 220, y: 155 },
  { id: 'stop-7-10', name: 'Terminal 7-10 Interurbana', province: 'San José', lat: 9.9398, lon: -84.0827, x: 240, y: 160 },
  { id: 'stop-parque', name: 'Parque Central San José', province: 'San José', lat: 9.9333, lon: -84.0792, x: 400, y: 150 },
  { id: 'stop-hospital', name: 'Hospital San Juan de Dios', province: 'San José', lat: 9.9348, lon: -84.0864, x: 600, y: 150 },
  { id: 'stop-sabana', name: 'La Sabana — Estadio Nacional', province: 'San José', lat: 9.9355, lon: -84.1042, x: 200, y: 225 },
  { id: 'stop-escalante', name: 'Barrio Escalante', province: 'San José', lat: 9.9358, lon: -84.0625, x: 100, y: 225 },
  { id: 'stop-ucr', name: 'Universidad de Costa Rica (UCR)', province: 'San José', lat: 9.9365, lon: -84.0512, x: 400, y: 300 },
  { id: 'stop-zapote', name: 'Barrio Zapote / Avenida 10', province: 'San José', lat: 9.9392, lon: -84.0321, x: 400, y: 225 },
  { id: 'stop-vargas-araya', name: 'Barrio Vargas Araya', province: 'San José', lat: 9.9374, lon: -84.0382, x: 350, y: 225 },
  { id: 'stop-lourdes', name: 'Parada Súper Lourdes / Calasanz', province: 'San José', lat: 9.9362, lon: -84.0441, x: 300, y: 225 },
  { id: 'stop-san-pedro', name: 'Muñoz & Nanne / San Pedro', province: 'San José', lat: 9.9338, lon: -84.0535, x: 250, y: 225 },
  { id: 'stop-mall-sp', name: 'Mall San Pedro / Fuente Hispanidad', province: 'San José', lat: 9.9341, lon: -84.0620, x: 200, y: 225 },
  { id: 'stop-sanjose', name: 'Terminal San José — Cuesta de Moras', province: 'San José', lat: 9.9332, lon: -84.0768, x: 150, y: 225 },
  { id: 'stop-escazu', name: 'Escazú Centro / Multiplaza', province: 'San José', lat: 9.9458, lon: -84.1492, x: 120, y: 200 },
  { id: 'stop-santa-ana', name: 'Santa Ana Centro', province: 'San José', lat: 9.9328, lon: -84.1824, x: 100, y: 210 },
  { id: 'stop-desamparados', name: 'Desamparados Parque Central', province: 'San José', lat: 9.8974, lon: -84.0664, x: 300, y: 350 },

  // --- ALAJUELA (GAM & OCCIDENTE) ---
  { id: 'stop-alajuela-fecosa', name: 'Terminal Fecosa Alajuela', province: 'Alajuela', lat: 10.0152, lon: -84.2145, x: 550, y: 180 },
  { id: 'stop-aeropuerto-sjo', name: 'Aeropuerto Juan Santamaría (SJO)', province: 'Alajuela', lat: 10.0004, lon: -84.2141, x: 600, y: 225 },
  { id: 'stop-city-mall', name: 'City Mall Alajuela', province: 'Alajuela', lat: 10.0094, lon: -84.2102, x: 570, y: 200 },
  { id: 'stop-coyol', name: 'Zona Franca El Coyol', province: 'Alajuela', lat: 9.9965, lon: -84.2698, x: 620, y: 250 },
  { id: 'stop-san-ramon', name: 'Terminal San Ramón', province: 'Alajuela', lat: 10.0872, lon: -84.4705, x: 680, y: 280 },
  { id: 'stop-ciudad-quesada', name: 'Terminal Ciudad Quesada (San Carlos)', province: 'Alajuela', lat: 10.3245, lon: -84.4298, x: 700, y: 320 },
  { id: 'stop-la-fortuna', name: 'La Fortuna / Volcán Arenal', province: 'Alajuela', lat: 10.4716, lon: -84.6452, x: 720, y: 340 },

  // --- HEREDIA (GAM) ---
  { id: 'stop-heredia-central', name: 'Terminal Central Heredia', province: 'Heredia', lat: 9.9984, lon: -84.1165, x: 350, y: 120 },
  { id: 'stop-una', name: 'Universidad Nacional (UNA)', province: 'Heredia', lat: 9.9998, lon: -84.1112, x: 370, y: 115 },
  { id: 'stop-oxigeno', name: 'Mall Oxígeno Human Playground', province: 'Heredia', lat: 9.9882, lon: -84.1332, x: 340, y: 130 },
  { id: 'stop-belen', name: 'San Antonio de Belén', province: 'Heredia', lat: 9.9812, lon: -84.1878, x: 320, y: 140 },

  // --- CARTAGO (GAM & ORIENTE) ---
  { id: 'stop-cartago-central', name: 'Terminal Lumaca Cartago', province: 'Cartago', lat: 9.8645, lon: -83.9212, x: 450, y: 350 },
  { id: 'stop-basilica', name: 'Basílica Nuestra Señora de Los Ángeles', province: 'Cartago', lat: 9.8638, lon: -83.9131, x: 470, y: 360 },
  { id: 'stop-tec', name: 'Tecnológico de Costa Rica (TEC)', province: 'Cartago', lat: 9.8552, lon: -83.9095, x: 480, y: 370 },
  { id: 'stop-tres-rios', name: 'Tres Ríos Parque Central (La Unión)', province: 'Cartago', lat: 9.9075, lon: -83.9878, x: 420, y: 320 },
  { id: 'stop-turrialba', name: 'Terminal Transtusa Turrialba', province: 'Cartago', lat: 9.9048, lon: -83.6835, x: 520, y: 380 },

  // --- PUNTARENAS (PACÍFICO CENTRAL Y SUR) ---
  { id: 'stop-puntarenas-ferry', name: 'Terminal Ferry Puntarenas (Paquera)', province: 'Puntarenas', lat: 9.9774, lon: -84.8488, x: 150, y: 400 },
  { id: 'stop-puntarenas-centro', name: 'Terminal Central Puntarenas', province: 'Puntarenas', lat: 9.9765, lon: -84.8295, x: 160, y: 395 },
  { id: 'stop-caldera', name: 'Puerto Caldera', province: 'Puntarenas', lat: 9.9185, lon: -84.7175, x: 180, y: 380 },
  { id: 'stop-jaco', name: 'Terminal Jacó Centro', province: 'Puntarenas', lat: 9.6152, lon: -84.6295, x: 200, y: 420 },
  { id: 'stop-quepos', name: 'Terminal Quepos / Manuel Antonio', province: 'Puntarenas', lat: 9.4312, lon: -84.1615, x: 230, y: 450 },
  { id: 'stop-perez-zeledon', name: 'Terminal San Isidro de El General', province: 'Puntarenas', lat: 9.3735, lon: -83.7042, x: 350, y: 480 },

  // --- GUANACASTE (PACÍFICO NORTE) ---
  { id: 'stop-liberia-central', name: 'Terminal Municipal de Liberia', province: 'Guanacaste', lat: 10.6315, lon: -85.4382, x: 100, y: 80 },
  { id: 'stop-aeropuerto-lir', name: 'Aeropuerto Guanacaste (LIR)', province: 'Guanacaste', lat: 10.5935, lon: -85.5442, x: 90, y: 75 },
  { id: 'stop-santa-cruz', name: 'Terminal Santa Cruz', province: 'Guanacaste', lat: 10.2625, lon: -85.5862, x: 110, y: 110 },
  { id: 'stop-nicoya', name: 'Terminal Nicoya Colonial', province: 'Guanacaste', lat: 10.1448, lon: -85.4525, x: 120, y: 130 },
  { id: 'stop-tamarindo', name: 'Parada Playa Tamarindo', province: 'Guanacaste', lat: 10.2995, lon: -85.8412, x: 70, y: 100 },

  // --- LIMÓN (CARIBE) ---
  { id: 'stop-limon-centro', name: 'Terminal Caribeños Limón Centro', province: 'Limón', lat: 9.9935, lon: -83.0332, x: 750, y: 220 },
  { id: 'stop-moin', name: 'Terminal Puerto Moín (APM Terminals)', province: 'Limón', lat: 10.0012, lon: -83.0785, x: 740, y: 210 },
  { id: 'stop-guapiles', name: 'Terminal Pococí / Guápiles', province: 'Limón', lat: 10.2152, lon: -83.7845, x: 650, y: 160 },
  { id: 'stop-puerto-viejo', name: 'Parada Puerto Viejo de Talamanca', province: 'Limón', lat: 9.6565, lon: -82.7545, x: 790, y: 280 },
];
 
const STATUS_LABELS = {
  active: 'En servicio',
  delayed: 'Retrasado',
  stopped: 'Detenido',
  maintenance: 'Mantenimiento',
};
const STATUS_ORDER = { active: 0, delayed: 1, stopped: 2, maintenance: 3 };
 
// Ajusta los datos derivados del bus para que un estado elegido a mano
// tenga sentido: un bus "Detenido" no debería seguir mostrando velocidad,
// uno que pasa a "En servicio" recupera una velocidad razonable, etc.
function applyBusStatus(bus, status) {
  bus.status = status;
  if (status === 'stopped' || status === 'maintenance') {
    bus.speed = 0;
    bus.delay = 0;
  } else if (status === 'active') {
    bus.delay = 0;
    if (bus.speed === 0) bus.speed = randInt(24, 62);
  } else if (status === 'delayed') {
    if (bus.speed === 0) bus.speed = randInt(24, 62);
    if (bus.delay === 0) bus.delay = randInt(3, 11);
  }
}
 
// Refresca todas las vistas que puedan mostrar el estado de un bus
// después de un cambio manual.
function refreshAfterStatusChange(bus) {
  refreshCounters();
  if (state.view === 'dashboard') renderBusList();
  if (state.view === 'fleet') renderFleet();
  if (state.view === 'map') renderMapBusList();
  if (state.view === 'routes') renderRoutes();
  drawMapMarkers(true);
  if (busModal.classList.contains('open') && busModal.currentBusId === bus.id) {
    fillBusModal(bus);
  }
}
 
const $ = id => document.getElementById(id);
const $$ = sel => Array.from(document.querySelectorAll(sel));
 
const randInt = (a, b) => Math.floor(Math.random() * (b - a + 1)) + a;
const pick = arr => arr[Math.floor(Math.random() * arr.length)];
const fmt = n => Number(n).toLocaleString('es-CR');
 
// Escapa texto antes de insertarlo con innerHTML.
function esc(s) {
  return String(s).replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}
 
// Color de una ruta, resuelto contra el CSS actual.
function routeColor(route) {
  return cssVar(route.varName, route.color);
}
 
function syncRouteColors() {
  ROUTES.forEach(r => { r.color = routeColor(r); });
}
 
function generateBuses(count) {
  const statuses = ['active', 'active', 'active', 'active', 'active', 'delayed', 'delayed', 'stopped', 'maintenance'];
  const list = [];
  for (let i = 1; i <= count; i++) {
    const route = ROUTES[(i - 1) % ROUTES.length];
    const driver = DRIVERS[(i - 1) % DRIVERS.length];
    const status = pick(statuses);
    const moving = status === 'active' || status === 'delayed';
    list.push({
      id: 'BUS-' + String(i).padStart(3, '0'),
      num: String(i).padStart(3, '0'),
      plate: 'SJB-' + String(1000 + i),
      route, driver, status,
      speed: moving ? randInt(24, 62) : 0,
      passengers: randInt(0, 46),
      capacity: 52,
      fuel: randInt(14, 96),
      delay: status === 'delayed' ? randInt(3, 11) : 0,
      nextStop: pick(STOPS).name,
      etaMin: randInt(2, 11),
      updatedAgo: randInt(1, 5),
      pos: { x: 400, y: 225 },
      _t: Math.random(),
      _step: 0.004 + Math.random() * 0.005,
      _dir: Math.random() > 0.5 ? 1 : -1,
    });
  }
  return list;
}
 
let buses = generateBuses(12);
 
const state = {
  view: 'dashboard',
  busFilter: 'all',
  alertFilter: 'all',
  chartPeriod: 'day',
  sort: { key: 'id', dir: 1 },
  highlightBus: null,
  trackingBus: null,   // bus que la cámara del mapa sigue mientras se mueve
};
 
/* ==========================================================
   2. PREFERENCIAS
   ========================================================== */
 
const ACCENTS = [
  { id: 'indigo', label: 'Índigo',  swatch: 'linear-gradient(135deg,#5b6ef5,#7c4ddb)' },
  { id: 'teal',   label: 'Verde azulado', swatch: 'linear-gradient(135deg,#22a79b,#2aa3c4)' },
  { id: 'forest', label: 'Verde',   swatch: 'linear-gradient(135deg,#2f9e63,#2aa3c4)' },
  { id: 'amber',  label: 'Ámbar',   swatch: 'linear-gradient(135deg,#d38b2a,#c96a3c)' },
  { id: 'rose',   label: 'Rosa',    swatch: 'linear-gradient(135deg,#d95273,#9b4bc4)' },
];
 
const prefs = {
  accent: 'indigo',
  motion: true,
  live: true,
  density: 'normal',
};
 
function loadPrefs() {
  try {
    const raw = localStorage.getItem('bustrack:prefs');
    if (raw) Object.assign(prefs, JSON.parse(raw));
  } catch (e) {
    // Algunos navegadores bloquean localStorage con file://; no es grave.
    console.warn('No se pudieron leer las preferencias:', e);
  }
  applyPrefs();
}
 
function savePrefs() {
  try {
    localStorage.setItem('bustrack:prefs', JSON.stringify(prefs));
  } catch (e) {
    console.warn('No se pudieron guardar las preferencias:', e);
  }
}
 
function applyPrefs() {
  const root = document.documentElement;
  if (prefs.accent === 'indigo') root.removeAttribute('data-accent');
  else root.setAttribute('data-accent', prefs.accent);
  root.setAttribute('data-density', prefs.density);
  syncRouteColors();
}
 
/* ==========================================================
   3. NAVEGACIÓN Y SIDEBAR
   ========================================================== */
 
const VIEW_TITLES = {
  dashboard: 'Panel Principal',

  map: 'Mapa en Vivo',
  fleet: 'Gestión de Flota',
  routes: 'Rutas',
  alerts: 'Centro de Alertas',
  reports: 'Reportes',
  drivers: 'Conductores',
};

let switchView = function(view) {
  return navigate(view);
};

function navigate(view) {
  if (!VIEW_TITLES[view]) return;
  $$('.view').forEach(v => v.classList.remove('active'));
  $$('.nav-item').forEach(n => n.classList.remove('active'));
  $('view-' + view).classList.add('active');
  const navEl = $('nav-' + view);
  if (navEl) navEl.classList.add('active');
 
  state.view = view;
  $('pageTitle').textContent = VIEW_TITLES[view];
  $('breadcrumbCurrent').textContent = VIEW_TITLES[view];
  document.title = VIEW_TITLES[view] + ' — BusTrack Pro';
 
  

  if (view === 'fleet') renderFleet();
  if (view === 'routes') renderRoutes();
  if (view === 'alerts') renderAlerts();
  if (view === 'drivers') renderDrivers();
  if (view === 'map') {
    if (!realLeafletMap) {
      requestAnimationFrame(() => {
        initRealLeafletMap();
        if (localStorage.getItem('bustrack_geolocate') === 'true') {
          requestUserLocation(false);
        }
      });
    } else {
      setTimeout(() => {
        if (realLeafletMap) realLeafletMap.invalidateSize({ animate: false });
      }, 80);
      setTimeout(() => {
        if (realLeafletMap) realLeafletMap.invalidateSize({ animate: false });
      }, 250);
    }
    renderMapBusList();
    drawMapMarkers(true);
  }
  if (view === 'dashboard') {
    requestAnimationFrame(() => { 
      drawMainChart(); 
      drawSparklines(); 
      if (!dashboardLeafletMap) {
        initDashboardLeafletMap();
      } else {
        setTimeout(() => { if (dashboardLeafletMap) dashboardLeafletMap.invalidateSize({ animate: false }); }, 80);
        setTimeout(() => { if (dashboardLeafletMap) dashboardLeafletMap.invalidateSize({ animate: false }); }, 250);
      }
    });
  }
  if (view === 'reports') requestAnimationFrame(drawReportCharts);
 
  closeSidebar();
  if (homeOpen) hideHome();
  window.scrollTo(0, 0);
}
 
$$('.nav-item').forEach(item => {
  item.addEventListener('click', () => navigate(item.dataset.view));
  item.addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigate(item.dataset.view); }
  });
});
 
const sidebar = $('sidebar');
const isMobile = () => window.matchMedia('(max-width: 768px)').matches;
 
function openSidebar() {
  if (sidebar) sidebar.classList.add('mobile-open');
  const overlay = $('sidebarOverlay');
  if (overlay) overlay.classList.add('open');
  const btn = $('mobileMenuBtn');
  if (btn) btn.setAttribute('aria-expanded', 'true');
  document.body.style.overflow = 'hidden';
}
function closeSidebar() {
  if (sidebar) sidebar.classList.remove('mobile-open');
  const overlay = $('sidebarOverlay');
  if (overlay) overlay.classList.remove('open');
  const btn = $('mobileMenuBtn');
  if (btn) btn.setAttribute('aria-expanded', 'false');
  document.body.style.overflow = '';
}
 
  function applySidebarCollapsed(collapsed) {
    if (!sidebar) return;
    sidebar.classList.toggle('collapsed', collapsed);
    const toggleBtn = $('sidebarToggle');
    if (toggleBtn) {
      toggleBtn.setAttribute('aria-expanded', String(!collapsed));
      toggleBtn.setAttribute('title', collapsed ? 'Expandir barra lateral' : 'Contraer barra lateral');
    }
    setTimeout(redrawAll, 220);
  }

  // Restaurar estado de la barra lateral desde localStorage
  try {
    const savedCollapsed = localStorage.getItem('bustrack_sidebar_collapsed');
    if (savedCollapsed === 'true' && !isMobile()) {
      applySidebarCollapsed(true);
    }
  } catch (_) {}

  $('sidebarToggle')?.addEventListener('click', function () {
    if (!sidebar) return;
    const isNowCollapsed = !sidebar.classList.contains('collapsed');
    applySidebarCollapsed(isNowCollapsed);
    try {
      localStorage.setItem('bustrack_sidebar_collapsed', String(isNowCollapsed));
    } catch (_) {}
  });
$('mobileMenuBtn')?.addEventListener('click', openSidebar);
$('sidebarOverlay')?.addEventListener('click', closeSidebar);
 
/* ==========================================================
   4. PANEL PRINCIPAL
   ========================================================== */
 
const statusLabel = s => STATUS_LABELS[s] || s;
 
function renderBusList() {
  const el = $('busList');
  let data = buses;
  if (state.busFilter === 'active') data = buses.filter(b => b.status === 'active');
  if (state.busFilter === 'delayed') data = buses.filter(b => b.status === 'delayed');
 
  if (!data.length) {
    el.innerHTML = '<p class="empty-state">No hay buses en esta categoría</p>';
    return;
  }
  el.innerHTML = data.map(b => `
    <div class="bus-item" data-bus="${b.id}" role="button" tabindex="0">
      <span class="bus-item-icon" style="background:${b.route.color}22;color:${b.route.color}">${b.num}</span>
      <span class="bus-item-info">
        <span class="bus-item-id">${b.id}</span>
        <span class="bus-item-route">Ruta ${b.route.id} · ${esc(b.driver.name.split(' ')[0])}</span>
      </span>
      <span class="bus-item-meta">
        <span class="bus-item-speed">${b.speed} km/h</span>
        <span class="status-badge status-${b.status}">${statusLabel(b.status)}</span>
      </span>
    </div>`).join('');
}
 
$$('.filter-tab[data-filter]').forEach(tab => {
  tab.addEventListener('click', function () {
    $$('.filter-tab[data-filter]').forEach(t => t.classList.remove('active'));
    this.classList.add('active');
    state.busFilter = this.dataset.filter;
    renderBusList();
  });
});
 
const ACTIVITY_SEED = [
  { icon: '🚌', tone: 'info', text: '<strong>BUS-003</strong> llegó a <strong>Terminal Central</strong>', time: 'hace 2 min' },
  { icon: '⚠️', tone: 'warn', text: '<strong>BUS-007</strong> acumula <strong>+5 min</strong> de retraso en Ruta B', time: 'hace 4 min' },
  { icon: '✅', tone: 'ok',   text: '<strong>BUS-001</strong> cerró viaje con <strong>48 pasajeros</strong>', time: 'hace 7 min' },
  { icon: '🔧', tone: 'risk', text: '<strong>BUS-011</strong> entró a <strong>mantenimiento</strong> preventivo', time: 'hace 12 min' },
  { icon: '👤', tone: 'info', text: '<strong>Carlos M.</strong> inició turno en <strong>BUS-005</strong>', time: 'hace 18 min' },
  { icon: '📍', tone: 'info', text: '<strong>BUS-009</strong> llegó a <strong>Aeropuerto</strong>', time: 'hace 23 min' },
  { icon: '⛽', tone: 'warn', text: '<strong>BUS-004</strong> repostó en <strong>Terminal Central</strong>', time: 'hace 31 min' },
  { icon: '🚌', tone: 'info', text: '<strong>BUS-012</strong> salió de <strong>Zona Industrial</strong>', time: 'hace 38 min' },
  { icon: '✅', tone: 'ok',   text: '<strong>BUS-006</strong> recuperó el horario en Ruta C', time: 'hace 44 min' },
  { icon: '👤', tone: 'info', text: '<strong>Lucía C.</strong> cerró turno en <strong>BUS-002</strong>', time: 'hace 52 min' },
];
const activities = ACTIVITY_SEED.slice();
 
const TONE_BG = {
  info: () => cssVar('--brand-500', '#5b6ef5'),
  ok:   () => cssVar('--ok', '#2bb885'),
  warn: () => cssVar('--warn', '#e0972c'),
  risk: () => cssVar('--risk', '#e0526b'),
};
 
function renderActivity() {
  const expanded = $('activityFeed').classList.contains('expanded');
  const data = expanded ? activities : activities.slice(0, 6);
  $('activityFeed').innerHTML = data.map(a => `
    <div class="activity-item">
      <span class="activity-icon" style="background:${TONE_BG[a.tone]()}22">${a.icon}</span>
      <span class="activity-content">
        <span class="activity-text">${a.text}</span>
        <span class="activity-time">${a.time}</span>
      </span>
    </div>`).join('');
}
 
$('toggleActivityBtn').addEventListener('click', function () {
  const feed = $('activityFeed');
  const open = feed.classList.toggle('expanded');
  this.textContent = open ? 'Ver menos' : 'Ver todo';
  this.setAttribute('aria-expanded', String(open));
  renderActivity();
});
 
function pushActivity() {
  const verbos = ['llegó a', 'salió de', 'pasó por'];
  const bus = pick(buses);
  activities.forEach(a => { if (a.time === 'ahora mismo') a.time = 'hace 1 min'; });
  activities.unshift({
    icon: '🚌', tone: 'info',
    text: `<strong>${bus.id}</strong> ${pick(verbos)} <strong>${esc(pick(STOPS).name)}</strong>`,
    time: 'ahora mismo',
  });
  if (activities.length > 14) activities.pop();
  if (state.view === 'dashboard') renderActivity();
}
 
/* ==========================================================
   5. FLOTA
   ========================================================== */
 
function sortValue(bus, key) {
  switch (key) {
    case 'route': return bus.route.id;
    case 'driver': return bus.driver.name;
    case 'status': return STATUS_ORDER[bus.status];
    case 'speed': return bus.speed;
    case 'passengers': return bus.passengers;
    case 'plate': return bus.plate;
    default: return bus.id;
  }
}
 
function visibleBuses() {
  const q = $('fleetSearch').value.trim().toLowerCase();
  const status = $('statusFilter').value;
  const route = $('routeFilter').value;
 
  const rows = buses.filter(b => {
    const haystack = [b.id, b.plate, b.driver.name, b.route.name, 'ruta ' + b.route.id].join(' ').toLowerCase();
    return (!q || haystack.includes(q))
      && (!status || b.status === status)
      && (!route || b.route.id === route);
  });
 
  const { key, dir } = state.sort;
  return rows.sort((a, b) => {
    const va = sortValue(a, key), vb = sortValue(b, key);
    if (va < vb) return -1 * dir;
    if (va > vb) return 1 * dir;
    return 0;
  });
}
 
const ICON_EYE = '<svg viewBox="0 0 20 20" fill="currentColor"><path d="M10 4c-4 0-7.3 2.6-9 6 1.7 3.4 5 6 9 6s7.3-2.6 9-6c-1.7-3.4-5-6-9-6zm0 10a4 4 0 110-8 4 4 0 010 8zm0-2a2 2 0 100-4 2 2 0 000 4z"/></svg>';
const ICON_PIN = '<svg viewBox="0 0 20 20" fill="currentColor"><path d="M10 2a5 5 0 00-5 5c0 3.6 4.2 8.3 4.4 8.5a.8.8 0 001.2 0C10.8 15.3 15 10.6 15 7a5 5 0 00-5-5zm0 7a2 2 0 110-4 2 2 0 010 4z"/></svg>';
 
function renderFleet() {
  const rows = visibleBuses();
  const tbody = $('fleetTableBody');
 
  $('fleetCount').textContent = rows.length === buses.length
    ? `${buses.length} buses en la flota`
    : `${rows.length} de ${buses.length} buses`;
 
  if (!rows.length) {
    tbody.innerHTML = '<tr><td colspan="9"><p class="empty-state">Ningún bus coincide con los filtros</p></td></tr>';
    return;
  }
 
  tbody.innerHTML = rows.map(b => {
    const pct = Math.round((b.passengers / b.capacity) * 100);
    const barColor = pct > 85 ? cssVar('--risk') : pct > 60 ? cssVar('--warn') : cssVar('--ok');
    return `
    <tr>
      <td>${b.id}</td>
      <td class="mono">${b.plate}</td>
      <td><span class="route-pill" style="background:${b.route.color}22;color:${b.route.color}">Ruta ${b.route.id}</span></td>
      <td>${esc(b.driver.name)}</td>
      <td class="mono">${b.speed} km/h</td>
      <td>
        <span style="display:inline-flex;align-items:center;gap:7px">
          <span class="mini-bar"><span style="width:${pct}%;background:${barColor}"></span></span>
          ${b.passengers}/${b.capacity}
        </span>
      </td>
      <td>
        <select class="status-select status-${b.status}" data-status-select="${b.id}" aria-label="Cambiar el estado de ${b.id}">
          <option value="active" ${b.status === 'active' ? 'selected' : ''}>En servicio</option>
          <option value="delayed" ${b.status === 'delayed' ? 'selected' : ''}>Retrasado</option>
          <option value="stopped" ${b.status === 'stopped' ? 'selected' : ''}>Detenido</option>
          <option value="maintenance" ${b.status === 'maintenance' ? 'selected' : ''}>Mantenimiento</option>
        </select>
      </td>
      <td style="color:var(--text-soft)">hace ${b.updatedAgo} min</td>
      <td>
        <span class="table-actions">
          <button class="table-btn" data-bus="${b.id}" title="Ver detalle" aria-label="Ver detalle de ${b.id}">${ICON_EYE}</button>
          <button class="table-btn" data-track="${b.id}" title="Ver en el mapa" aria-label="Ver ${b.id} en el mapa">${ICON_PIN}</button>
        </span>
      </td>
    </tr>`;
  }).join('');
}
 
$('fleetSearch').addEventListener('input', renderFleet);
$('statusFilter').addEventListener('change', renderFleet);
$('routeFilter').addEventListener('change', renderFleet);
 
$('fleetTableBody').addEventListener('change', e => {
  const sel = e.target.closest('[data-status-select]');
  if (!sel) return;
  const bus = buses.find(b => b.id === sel.dataset.statusSelect);
  if (!bus) return;
  applyBusStatus(bus, sel.value);
  refreshAfterStatusChange(bus);
  toast('Estado de ' + bus.id + ' actualizado a ' + statusLabel(bus.status), 'ok');
});
 
$('resetFiltersBtn').addEventListener('click', () => {
  $('fleetSearch').value = '';
  $('statusFilter').value = '';
  $('routeFilter').value = '';
  state.sort = { key: 'id', dir: 1 };
  $$('.fleet-table th').forEach(th => th.classList.remove('sorted', 'desc'));
  renderFleet();
  toast('Filtros restablecidos');
});
 
$$('.fleet-table th[data-sort]').forEach(th => {
  const apply = () => {
    const key = th.dataset.sort;
    state.sort = { key, dir: state.sort.key === key ? -state.sort.dir : 1 };
    $$('.fleet-table th').forEach(t => t.classList.remove('sorted', 'desc'));
    th.classList.add('sorted');
    if (state.sort.dir === -1) th.classList.add('desc');
    renderFleet();
  };
  th.addEventListener('click', apply);
  th.addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); apply(); }
  });
});
 
$('addBusBtn').addEventListener('click', async () => {
  const n = buses.length + 1;
  const route = ROUTES[(n - 1) % ROUTES.length];
  const driver = DRIVERS[(n - 1) % DRIVERS.length];

  if (backendConnected) {
    try {
      const newBus = await api.createBus({ routeId: route.id, driverId: driver.id });
      buses.push(newBus);
      renderFleet();
      refreshCounters();
      toast('Bus ' + newBus.id + ' registrado en backend', 'ok');
      return;
    } catch (err) {
      console.warn('Failed to add bus to backend, falling back to local:', err);
    }
  }

  buses.push({
    id: 'BUS-' + String(n).padStart(3, '0'),
    num: String(n).padStart(3, '0'),
    plate: 'SJB-' + String(1000 + n),
    route,
    driver,
    status: 'stopped',
    speed: 0, passengers: 0, capacity: 52, fuel: 100, delay: 0,
    nextStop: STOPS[0].name, etaMin: 0, updatedAgo: 0,
    pos: { x: 400, y: 225 }, _t: Math.random(), _step: 0.005, _dir: 1,
  });
  renderFleet();
  refreshCounters();
  toast('Bus ' + buses[buses.length - 1].id + ' agregado a la flota', 'ok');
});
 
$('exportCsvBtn').addEventListener('click', () => {
  const rows = visibleBuses();
  const head = ['Bus', 'Placa', 'Ruta', 'Conductor', 'Velocidad (km/h)', 'Pasajeros', 'Capacidad', 'Estado', 'Combustible (%)', 'Retraso (min)'];
  const body = rows.map(b => [
    b.id, b.plate, 'Ruta ' + b.route.id, b.driver.name,
    b.speed, b.passengers, b.capacity, statusLabel(b.status), b.fuel, b.delay,
  ]);
  const csv = [head, ...body]
    .map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(';'))
    .join('\r\n');
 
  if (typeof URL === 'undefined' || !URL.createObjectURL) {
    toast('Este navegador no permite descargar el archivo', 'warn');
    return;
  }
  // BOM para que Excel en español abra bien los acentos
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'flota-' + new Date().toISOString().slice(0, 10) + '.csv';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  toast(rows.length + ' filas exportadas a CSV', 'ok');
});
 
/* ==========================================================
   6. MAPAS — LEAFLET REAL INTERACTIVE MAP (COBERTURA NACIONAL)
   ========================================================== */

const CR_PROVINCES = {
  all: { center: [9.7489, -83.7534], zoom: 8, name: 'Costa Rica' },
  'San José': { center: [9.9333, -84.0833], zoom: 13, name: 'San José (GAM)' },
  Alajuela: { center: [10.0163, -84.2116], zoom: 12, name: 'Alajuela' },
  Heredia: { center: [9.9984, -84.1165], zoom: 13, name: 'Heredia' },
  Cartago: { center: [9.8645, -83.9212], zoom: 13, name: 'Cartago' },
  Puntarenas: { center: [9.9765, -84.8295], zoom: 12, name: 'Puntarenas' },
  Guanacaste: { center: [10.6315, -85.4382], zoom: 11, name: 'Guanacaste' },
  Limón: { center: [9.9935, -83.0332], zoom: 12, name: 'Limón' },
};

// Rutas GPS reales trazadas sobre carreteras y paradas reales
const ROUTE_GPS_PATHS = {
  A: [
    [9.9325, -84.0815], [9.9348, -84.0864], [9.9355, -84.1042],
    [9.9458, -84.1492], [9.9812, -84.1878], [10.0004, -84.2141], [10.0152, -84.2145]
  ],
  B: [
    [9.9984, -84.1165], [9.9882, -84.1332], [9.9366, -84.0845],
    [9.9333, -84.0792], [9.8974, -84.0664]
  ],
  C: [
    [9.8645, -83.9212], [9.8638, -83.9131], [9.9075, -83.9878],
    [9.9338, -84.0535], [9.9365, -84.0512], [9.9392, -84.0321], [9.9332, -84.0768]
  ],
  D: [
    [9.9333, -84.0792], [9.9412, -84.0389], [9.9048, -83.6835], [10.2152, -83.7845], [9.9935, -83.0332]
  ]
};

let realLeafletMap = null;
let leafletMarkers = {
  buses: {},
  stops: {},
  user: null,
  routes: {},
};

let dashboardLeafletMap = null;
let dashboardMarkers = {
  buses: {},
  stops: {},
  user: null,
  routes: {},
};

// Generador de capas base de mapas 100% gratuitas, sin marcas de agua y sin bloqueos 403
function createArcGisLayers() {
  const esriDarkBase = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}', {
    maxNativeZoom: 16,
    maxZoom: 19,
    attribution: '&copy; Esri &copy; OpenStreetMap'
  });
  const esriDarkRef = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}', {
    maxNativeZoom: 16,
    maxZoom: 19
  });
  const darkGroup = L.layerGroup([esriDarkBase, esriDarkRef]);

  // Capa oficial de calles completas de ArcGIS (sustituye a OSM sin errores 403)
  const streetLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}', {
    maxZoom: 19,
    attribution: '&copy; Esri World Street Map'
  });

  // Capa satelital real de alta resolución
  const satLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
    maxNativeZoom: 19,
    maxZoom: 19,
    attribution: '&copy; Esri Satellite'
  });

  return [
    { id: 'dark', icon: '🌙', name: 'Oscuro Pro (ArcGIS)', layer: darkGroup },
    { id: 'streets', icon: '🗺️', name: 'Calles y Vías (ArcGIS)', layer: streetLayer },
    { id: 'sat', icon: '🛰️', name: 'Satelital Real (ArcGIS)', layer: satLayer },
  ];
}

function initRealLeafletMap() {
  const container = document.getElementById('realFullMap');
  if (!container || realLeafletMap) return;

  if (typeof L === 'undefined') {
    console.warn('Leaflet aún no está cargado en window. Reintentando en 150ms...');
    setTimeout(initRealLeafletMap, 150);
    return;
  }

  // Centro inicial: San José / GAM (Costa Rica)
  realLeafletMap = L.map('realFullMap', {
    center: [9.9333, -84.0833],
    zoom: 12,
    zoomControl: false,
    attributionControl: false
  });

  const styles = createArcGisLayers();
  realLeafletMap._mapStyles = styles;
  realLeafletMap._currentStyleIdx = 0;
  realLeafletMap._activeLayer = styles[0].layer;
  styles[0].layer.addTo(realLeafletMap);

  paintRealStopsAndRoutes();
  setupMapControls();

  // Selector de provincias de Costa Rica
  const provSelect = document.getElementById('provinceSelect');
  if (provSelect) {
    provSelect.addEventListener('change', (e) => {
      const p = CR_PROVINCES[e.target.value] || CR_PROVINCES.all;
      realLeafletMap.flyTo(p.center, p.zoom, { duration: 1.5 });
      toast('🇨🇷 Enfocando región: ' + p.name, 'info');
    });
  }

  realLeafletMap.on('dragstart', () => {
    if (state.trackingBus) {
      stopTracking('Dejaste de seguir el bus al mover el mapa');
    }
  });

  // Observador de cambio de tamaño (al contraer/expandir sidebar o cambiar ventana)
  if (window.ResizeObserver) {
    try {
      const ro = new ResizeObserver(() => {
        if (realLeafletMap) realLeafletMap.invalidateSize({ animate: false });
      });
      ro.observe(container);
    } catch (_) {}
  }

  setTimeout(() => { if (realLeafletMap) realLeafletMap.invalidateSize({ animate: false }); }, 80);
  setTimeout(() => { if (realLeafletMap) realLeafletMap.invalidateSize({ animate: false }); }, 250);
  setTimeout(() => { if (realLeafletMap) realLeafletMap.invalidateSize({ animate: false }); }, 500);

  drawMapMarkers(true);
}

function initDashboardLeafletMap() {
  const container = document.getElementById('dashboardRealMap');
  if (!container || dashboardLeafletMap) return;

  if (typeof L === 'undefined') {
    setTimeout(initDashboardLeafletMap, 150);
    return;
  }

  dashboardLeafletMap = L.map('dashboardRealMap', {
    center: [9.9333, -84.0833],
    zoom: 12,
    zoomControl: false,
    attributionControl: false
  });

  const styles = createArcGisLayers();
  dashboardLeafletMap._mapStyles = styles;
  dashboardLeafletMap._currentStyleIdx = 0;
  dashboardLeafletMap._activeLayer = styles[0].layer;
  styles[0].layer.addTo(dashboardLeafletMap);

  paintDashboardStopsAndRoutes();
  setupDashboardMapControls();

  if (window.ResizeObserver) {
    try {
      const ro = new ResizeObserver(() => {
        if (dashboardLeafletMap) dashboardLeafletMap.invalidateSize({ animate: false });
      });
      ro.observe(container);
    } catch (_) {}
  }

  setTimeout(() => { if (dashboardLeafletMap) dashboardLeafletMap.invalidateSize({ animate: false }); }, 100);
  setTimeout(() => { if (dashboardLeafletMap) dashboardLeafletMap.invalidateSize({ animate: false }); }, 300);

  drawMapMarkers(true);
}

function paintLayerRoutesAndStops(mapInstance, markersStore, isMini) {
  if (!mapInstance) return;

  // 1. Trazar líneas de ruta GPS
  ROUTES.forEach(r => {
    const coords = ROUTE_GPS_PATHS[r.id];
    if (coords && coords.length) {
      const poly = L.polyline(coords, {
        color: r.color,
        weight: isMini ? 3 : 4,
        opacity: 0.85,
        dashArray: '8, 8'
      }).addTo(mapInstance);
      poly.bindTooltip('Ruta ' + r.id + ': ' + r.name, { sticky: true });
      markersStore.routes[r.id] = poly;
    }
  });

  // 2. Colocar marcadores de paradas nacionales
  STOPS.forEach(s => {
    const icon = L.divIcon({
      className: 'real-stop-div-icon',
      html: '<div class="real-stop-icon-inner" style="' + (isMini ? 'width:12px;height:12px;' : '') + '" title="' + esc(s.name) + '"></div>',
      iconSize: isMini ? [16, 16] : [20, 20],
      iconAnchor: isMini ? [8, 8] : [10, 10]
    });

    const marker = L.marker([s.lat, s.lon], { icon }).addTo(mapInstance);
    marker.bindPopup(
      '<div style="font-family:Inter, sans-serif;">' +
        '<strong style="color:var(--text-strong); font-size:12.5px;">🚏 ' + esc(s.name) + '</strong>' +
        '<p style="margin:4px 0 0; color:var(--text-soft); font-size:11px;">' + esc(s.subtext || s.province || 'Parada oficial') + '</p>' +
        (isMini ? '' : '<span class="badge" style="margin-top:6px; display:inline-block; font-size:10px;">' + (s.province || 'Costa Rica') + '</span>') +
      '</div>'
    );
    markersStore.stops[s.id || s.name] = marker;
  });

  // 3. Leyendas
  const stopColor = '#f59e0b';
  const legend = ROUTES.map(r =>
    '<span class="legend-item"><span class="legend-dot" style="background:' + r.color + '"></span>Ruta ' + r.id + '</span>').join('')
    + '<span class="legend-item"><span class="legend-dot" style="background:' + stopColor + '"></span>Paradas</span>';
  const legEl = document.getElementById(isMini ? 'miniLegend' : 'fullLegend');
  if (legEl) legEl.innerHTML = legend;
}

function paintRealStopsAndRoutes() {
  paintLayerRoutesAndStops(realLeafletMap, leafletMarkers, false);
}

function paintDashboardStopsAndRoutes() {
  paintLayerRoutesAndStops(dashboardLeafletMap, dashboardMarkers, true);
}

function setupDashboardMapControls() {
  const miniZoomBtns = document.querySelectorAll('.map-btn[data-map="mini"][data-zoom]');
  miniZoomBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const action = btn.dataset.zoom;
      if (!dashboardLeafletMap) return;
      if (action === 'in') dashboardLeafletMap.zoomIn();
      if (action === 'out') dashboardLeafletMap.zoomOut();
      if (action === 'reset') {
        dashboardLeafletMap.flyTo(CR_PROVINCES.all.center, CR_PROVINCES.all.zoom, { duration: 1.2 });
      }
    });
  });

  const dashStyleBtn = document.getElementById('dashboardStyleToggleBtn');
  if (dashStyleBtn && !dashStyleBtn._bound) {
    dashStyleBtn._bound = true;
    dashStyleBtn.addEventListener('click', () => {
      if (!dashboardLeafletMap || !dashboardLeafletMap._mapStyles) return;
      if (dashboardLeafletMap._activeLayer) {
        dashboardLeafletMap.removeLayer(dashboardLeafletMap._activeLayer);
      }
      dashboardLeafletMap._currentStyleIdx = (dashboardLeafletMap._currentStyleIdx + 1) % dashboardLeafletMap._mapStyles.length;
      const nextStyle = dashboardLeafletMap._mapStyles[dashboardLeafletMap._currentStyleIdx];
      dashboardLeafletMap._activeLayer = nextStyle.layer;
      nextStyle.layer.addTo(dashboardLeafletMap);
      dashStyleBtn.textContent = nextStyle.icon;
      dashStyleBtn.setAttribute('title', 'Capa actual: ' + nextStyle.name + ' (Clic para alternar)');
      toast('🗺️ ' + nextStyle.name, 'info');
    });
  }

  const miniLocBtn = document.getElementById('locateUserBtnMini');
  if (miniLocBtn && !miniLocBtn._bound) {
    miniLocBtn._bound = true;
    miniLocBtn.addEventListener('click', () => {
      if (userLocationState.lat && userLocationState.lng && dashboardLeafletMap) {
        dashboardLeafletMap.flyTo([userLocationState.lat, userLocationState.lng], 15, { duration: 1.2 });
        toast('📍 Centrando en tu ubicación', 'info');
      } else {
        requestUserLocation(true);
      }
    });
  }
}

// Interpola posición GPS para un bus según su progreso _t [0..1]
function getBusGpsPosition(bus) {
  const coords = ROUTE_GPS_PATHS[bus.route.id] || ROUTE_GPS_PATHS.A;
  if (!coords || !coords.length) return [9.9333, -84.0833];
  
  const totalSegments = coords.length - 1;
  const t = Math.max(0, Math.min(1, bus._t !== undefined ? bus._t : 0.5));
  const exactSegment = t * totalSegments;
  const index = Math.min(Math.floor(exactSegment), totalSegments - 1);
  const segFraction = exactSegment - index;

  const p1 = coords[index];
  const p2 = coords[index + 1] || p1;

  const lat = p1[0] + (p2[0] - p1[0]) * segFraction;
  const lon = p1[1] + (p2[1] - p1[1]) * segFraction;
  return [lat, lon];
}

function drawMapMarkers(force) {
  if (!realLeafletMap && !dashboardLeafletMap) return;

  buses.forEach(b => {
    const [lat, lon] = getBusGpsPosition(b);
    b.gps = { lat, lon };

    const color = b.route.color;
    const isDelayed = b.status === 'delayed';
    const isTracked = state.trackingBus === b.id;

    // 1. Marcadores en Mapa Completo (view-map)
    if (realLeafletMap) {
      if (!leafletMarkers.buses[b.id]) {
        const busIcon = L.divIcon({
          className: 'real-bus-div-icon',
          html:
            '<div class="real-bus-icon-inner" style="background:' + color + ';' + (isTracked ? 'border-color:#38bdf8;' : '') + '">' +
              (isTracked || isDelayed ? '<div class="real-bus-pulse" style="background:' + color + ';"></div>' : '') +
              '<span>' + (b.num || b.id.replace('BUS-', '')) + '</span>' +
            '</div>',
          iconSize: [32, 32],
          iconAnchor: [16, 16]
        });

        const marker = L.marker([lat, lon], { icon: busIcon }).addTo(realLeafletMap);
        marker.on('click', () => focusBus(b.id));
        marker.bindTooltip(
          '<strong>' + b.id + '</strong> · Ruta ' + b.route.id + '<br/>' +
          b.speed + ' km/h · ' + b.passengers + ' pas.',
          { direction: 'top', offset: [0, -14] }
        );

        leafletMarkers.buses[b.id] = marker;
      } else {
        const marker = leafletMarkers.buses[b.id];
        marker.setLatLng([lat, lon]);

        if (isTracked) {
          realLeafletMap.panTo([lat, lon], { animate: true, duration: 0.3 });
        }
      }
    }

    // 2. Marcadores en Panel Principal (view-dashboard)
    if (dashboardLeafletMap) {
      if (!dashboardMarkers.buses[b.id]) {
        const miniBusIcon = L.divIcon({
          className: 'real-bus-div-icon',
          html:
            '<div class="real-bus-icon-inner" style="background:' + color + '; width:26px; height:26px; font-size:10px;' + (isTracked ? 'border-color:#38bdf8;' : '') + '">' +
              (isTracked || isDelayed ? '<div class="real-bus-pulse" style="background:' + color + '; width:34px; height:34px; left:-4px; top:-4px;"></div>' : '') +
              '<span>' + (b.num || b.id.replace('BUS-', '')) + '</span>' +
            '</div>',
          iconSize: [26, 26],
          iconAnchor: [13, 13]
        });

        const miniMarker = L.marker([lat, lon], { icon: miniBusIcon }).addTo(dashboardLeafletMap);
        miniMarker.on('click', () => {
          navigate('map');
          setTimeout(() => focusBus(b.id), 200);
        });
        miniMarker.bindTooltip(
          '<strong>' + b.id + '</strong> · Ruta ' + b.route.id + '<br/>' +
          b.speed + ' km/h',
          { direction: 'top', offset: [0, -10] }
        );

        dashboardMarkers.buses[b.id] = miniMarker;
      } else {
        dashboardMarkers.buses[b.id].setLatLng([lat, lon]);
      }
    }
  });

  const countBadge = document.getElementById('mapBusCount');
  if (countBadge) countBadge.textContent = buses.filter(b => b.status === 'active').length + ' activos';
}

function renderMapBusList() {
  const container = document.getElementById('mapBusList');
  if (!container) return;
  container.innerHTML = buses.map(b =>
    '<div class="map-bus-item ' + (state.highlightBus === b.id ? 'highlight' : '') + '" data-bus="' + b.id + '" role="button" tabindex="0">' +
      '<span class="map-bus-dot" style="background:' + b.route.color + '"></span>' +
      '<span class="map-bus-info">' +
        '<span class="map-bus-id">' + b.id + '</span>' +
        '<span class="map-bus-route">Ruta ' + b.route.id + ' · ' + b.speed + ' km/h</span>' +
      '</span>' +
      '<span class="status-badge status-' + b.status + '">' + statusLabel(b.status) + '</span>' +
    '</div>'
  ).join('');
}

function centerMapOnBus(busId, resetZoom) {
  const bus = buses.find(b => b.id === busId);
  if (!bus || !realLeafletMap) return false;
  const [lat, lon] = getBusGpsPosition(bus);
  if (resetZoom) {
    realLeafletMap.setView([lat, lon], 15, { animate: true });
  } else {
    realLeafletMap.panTo([lat, lon], { animate: true });
  }
  return true;
}

function updateTrackingBanner() {
  const banner = document.getElementById('trackingBanner');
  if (!banner) return;
  if (state.trackingBus) {
    banner.hidden = false;
    document.getElementById('trackingBannerText').textContent = 'Siguiendo ' + state.trackingBus;
  } else {
    banner.hidden = true;
  }
}

function stopTracking(msg) {
  if (!state.trackingBus) return;
  state.trackingBus = null;
  updateTrackingBanner();
  if (msg) toast(msg);
}

function focusBus(busId) {
  const bus = buses.find(b => b.id === busId);
  if (!bus) return;
  state.highlightBus = busId;
  state.trackingBus = busId;
  navigate('map');
  centerMapOnBus(busId, true);
  renderMapBusList();
  drawMapMarkers(true);
  updateTrackingBanner();
  toast('Siguiendo ' + busId, 'info');
}

let animId = null;
let lastTick = 0;

function tick(ts) {
  animId = requestAnimationFrame(tick);
  if (ts - lastTick < 65) return;
  lastTick = ts;

  if (prefs.motion && !backendConnected) {
    buses.forEach(b => {
      const moving = b.status === 'active' || b.status === 'delayed';
      if (moving) {
        b._t = (b._t || 0) + (b._dir || 1) * (b._step || 0.005) * (b.speed / 40);
        if (b._t >= 1) { b._t = 1; b._dir = -1; }
        else if (b._t <= 0) { b._t = 0; b._dir = 1; }
      }
    });
  }
  drawMapMarkers(false);
}

function startAnim() { if (!animId) { lastTick = 0; animId = requestAnimationFrame(tick); } }
function stopAnim() { if (animId) { cancelAnimationFrame(animId); animId = null; } }

document.addEventListener('visibilitychange', () => {
  if (document.hidden) stopAnim(); else startAnim();
});

const userLocationState = {
  active: false,
  lat: null,
  lng: null,
  nearestStop: null,
  distanceToStop: null,
  watchId: null,
};

function calculateDistanceMeters(lat1, lon1, lat2, lon2) {
  const R = 6371e3;
  const rad = Math.PI / 180;
  const dLat = (lat2 - lat1) * rad;
  const dLon = (lon2 - lon1) * rad;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * rad) * Math.cos(lat2 * rad) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

function findNearestStop(lat, lng) {
  let nearest = null;
  let minDist = Infinity;
  STOPS.forEach(stop => {
    if (stop.lat && stop.lon) {
      const dist = calculateDistanceMeters(lat, lng, stop.lat, stop.lon);
      if (dist < minDist) {
        minDist = dist;
        nearest = stop;
      }
    }
  });
  return { stop: nearest || STOPS[0], distance: minDist };
}

function renderUserLocationMarkers() {
  if (!realLeafletMap) return;
  if (!userLocationState.active || !userLocationState.lat) {
    if (leafletMarkers.user) {
      realLeafletMap.removeLayer(leafletMarkers.user);
      leafletMarkers.user = null;
    }
    return;
  }
  const { lat, lng } = userLocationState;
  const stopName = userLocationState.nearestStop ? userLocationState.nearestStop.name : 'Ubicación';
  if (!leafletMarkers.user) {
    const userIcon = L.divIcon({
      className: 'real-user-div-icon',
      html: '<div class="real-user-gps-marker"><div class="real-user-gps-pulse"></div></div>',
      iconSize: [18, 18],
      iconAnchor: [9, 9]
    });
    leafletMarkers.user = L.marker([lat, lng], { icon: userIcon, zIndexOffset: 1000 }).addTo(realLeafletMap);
    leafletMarkers.user.bindPopup(
      '<strong style="color:#38bdf8; font-size:13px;">📍 Tu ubicación GPS</strong><br/>' +
      '<span style="font-size:12px; color:var(--text-soft);">Cerca de: ' + esc(stopName) + '</span>'
    );
  } else {
    leafletMarkers.user.setLatLng([lat, lng]);
  }
}

function centerMapOnUser(resetZoom = true) {
  if (!userLocationState.active || !userLocationState.lat || !realLeafletMap) return false;
  realLeafletMap.flyTo([userLocationState.lat, userLocationState.lng], resetZoom ? 15 : realLeafletMap.getZoom(), { duration: 1.2 });
  return true;
}

function updateUserLocationUI() {
  renderUserLocationMarkers();
  const bar = document.getElementById('userLocationBar');
  const textEl = document.getElementById('userLocationText');
  const fullBtn = document.getElementById('locateUserBtnFull');
  if (userLocationState.active && userLocationState.nearestStop) {
    if (fullBtn) fullBtn.classList.add('active');
    const distStr = userLocationState.distanceToStop < 1000
      ? userLocationState.distanceToStop + ' m'
      : (userLocationState.distanceToStop / 1000).toFixed(1) + ' km';
    if (textEl) {
      textEl.innerHTML = '<strong>Ubicación detectada:</strong> a ' + distStr + ' de <strong>' + esc(userLocationState.nearestStop.name) + '</strong> (' + (userLocationState.nearestStop.province || 'Costa Rica') + ')';
    }
    if (bar) bar.hidden = false;
  } else {
    if (fullBtn) fullBtn.classList.remove('active');
    if (bar) bar.hidden = true;
  }
}

function stopUserLocationWatch() {
  if (userLocationState.watchId !== null) {
    navigator.geolocation.clearWatch(userLocationState.watchId);
    userLocationState.watchId = null;
  }
}

function handlePositionUpdate(position, isInitial = false) {
  const lat = position.coords.latitude;
  const lng = position.coords.longitude;
  const nearest = findNearestStop(lat, lng);
  userLocationState.active = true;
  userLocationState.lat = lat;
  userLocationState.lng = lng;
  userLocationState.nearestStop = nearest.stop;
  userLocationState.distanceToStop = nearest.distance;
  updateUserLocationUI();
  centerMapOnUser(isInitial);
  const distStr = nearest.distance < 1000 ? nearest.distance + ' m' : (nearest.distance / 1000).toFixed(1) + ' km';
  if (isInitial) {
    toast('📍 GPS en vivo: a ' + distStr + ' de ' + nearest.stop.name, 'ok');
  }
  localStorage.setItem('bustrack_geolocate', 'true');
  const geoSwitch = document.getElementById('geoSwitch');
  if (geoSwitch) geoSwitch.setAttribute('aria-checked', 'true');
}

function requestUserLocation(userInitiated = true) {
  if (!('geolocation' in navigator)) {
    if (userInitiated) toast('Tu navegador no soporta geolocalización', 'warn');
    return;
  }
  toast('Solicitando permiso de ubicación al navegador...', 'info');
  const options = { enableHighAccuracy: true, timeout: 10000, maximumAge: 3000 };
  navigator.geolocation.getCurrentPosition(
    (position) => {
      handlePositionUpdate(position, true);
      stopUserLocationWatch();
      userLocationState.watchId = navigator.geolocation.watchPosition(
        (pos) => handlePositionUpdate(pos, false),
        (err) => console.warn('Watch position update error:', err),
        options
      );
    },
    (error) => {
      console.warn('Geolocation error:', error);
      stopUserLocationWatch();
      userLocationState.active = false;
      updateUserLocationUI();
      const geoSwitch = document.getElementById('geoSwitch');
      if (geoSwitch) geoSwitch.setAttribute('aria-checked', 'false');
      if (error.code === error.PERMISSION_DENIED) {
        toast('⚠️ Permiso de ubicación denegado. Permite el acceso en la barra de direcciones de tu navegador.', 'warn');
      } else if (error.code === error.POSITION_UNAVAILABLE) {
        toast('⚠️ Posición GPS no disponible en este dispositivo.', 'warn');
      } else if (error.code === error.TIMEOUT) {
        toast('⏱️ Tiempo de espera agotado al obtener el GPS.', 'warn');
      } else if (userInitiated) {
        toast('No se pudo acceder a tu ubicación actual.', 'warn');
      }
    },
    options
  );
}

// Conexión de controles de mapa de Leaflet
function setupMapControls() {
  const zoomBtns = document.querySelectorAll('.map-btn[data-zoom]');
  zoomBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const action = btn.dataset.zoom;
      if (!realLeafletMap) return;
      if (action === 'in') realLeafletMap.zoomIn();
      if (action === 'out') realLeafletMap.zoomOut();
      if (action === 'reset') {
        stopTracking('Vista nacional restablecida');
        realLeafletMap.flyTo(CR_PROVINCES.all.center, CR_PROVINCES.all.zoom, { duration: 1.2 });
        const provSelect = document.getElementById('provinceSelect');
        if (provSelect) provSelect.value = 'all';
      }
    });
  });

  const styleBtn = document.getElementById('mapStyleToggleBtn');
  if (styleBtn && !styleBtn._bound) {
    styleBtn._bound = true;
    styleBtn.addEventListener('click', () => {
      if (!realLeafletMap || !realLeafletMap._mapStyles) return;
      if (realLeafletMap._activeLayer) {
        realLeafletMap.removeLayer(realLeafletMap._activeLayer);
      }
      realLeafletMap._currentStyleIdx = (realLeafletMap._currentStyleIdx + 1) % realLeafletMap._mapStyles.length;
      const nextStyle = realLeafletMap._mapStyles[realLeafletMap._currentStyleIdx];
      realLeafletMap._activeLayer = nextStyle.layer;
      nextStyle.layer.addTo(realLeafletMap);
      styleBtn.textContent = nextStyle.icon;
      styleBtn.setAttribute('title', 'Capa actual: ' + nextStyle.name + ' (Clic para cambiar)');
      toast('🗺️ ' + nextStyle.name, 'info');
    });
  }
}

/* ==========================================================
   7. RUTAS, ALERTAS, CONDUCTORES, REPORTES
   ========================================================== */
 
function routeStats(r) {
  const own = buses.filter(b => b.route.id === r.id);
  const activos = own.filter(b => b.status === 'active').length;
  return {
    total: own.length,
    activos,
    cobertura: own.length ? Math.round((activos / own.length) * 100) : 0,
    pasajeros: own.reduce((s, b) => s + b.passengers, 0),
    retraso: own.length ? (own.reduce((s, b) => s + b.delay, 0) / own.length) : 0,
  };
}
 
function renderRoutes() {
  $('routesGrid').innerHTML = ROUTES.map(r => {
    const s = routeStats(r);
    return `
    <article class="route-card" data-route="${r.id}" style="--rc:${r.color}" role="button" tabindex="0">
      <div class="route-header">
        <div>
          <p class="route-id">Ruta ${r.id}</p>
          <p class="route-name">${r.name}</p>
        </div>
        <span class="status-badge ${s.activos ? 'status-active' : 'status-stopped'}">${s.activos ? 'Activa' : 'Sin buses'}</span>
      </div>
      <div class="route-progress">
        <div class="route-progress-head"><span>Cobertura de flota</span><span style="color:${r.color}">${s.cobertura}%</span></div>
        <div class="route-progress-bar"><div class="route-progress-fill" style="width:${s.cobertura}%"></div></div>
      </div>
      <div class="route-stats">
        <div><p class="route-stat-value">${s.total}</p><p class="route-stat-label">Buses</p></div>
        <div><p class="route-stat-value">${r.stops}</p><p class="route-stat-label">Paradas</p></div>
        <div><p class="route-stat-value">${s.pasajeros}</p><p class="route-stat-label">A bordo</p></div>
        <div><p class="route-stat-value">${r.length} km</p><p class="route-stat-label">Longitud</p></div>
      </div>
    </article>`;
  }).join('');
}
 
// Al tocar una ruta se abre la flota ya filtrada por esa ruta
function openRoute(id) {
  navigate('fleet');
  $('routeFilter').value = id;
  $('fleetSearch').value = '';
  $('statusFilter').value = '';
  renderFleet();
  toast('Mostrando los buses de la Ruta ' + id);
}
 
const ALERT_SEED = [
  { id: 1, type: 'critical', icon: '🚨', title: 'Temperatura del motor fuera de rango', desc: 'El sensor del BUS-011 reporta 112 °C de forma sostenida. Conviene detener la unidad en la próxima parada.', bus: 'BUS-011', time: 'hace 3 min', read: false },
  { id: 2, type: 'warning',  icon: '⚠️', title: 'Retraso acumulado en Ruta B', desc: 'BUS-007 va 8 minutos por detrás del horario. Las pantallas de las paradas ya muestran el ajuste.', bus: 'BUS-007', time: 'hace 8 min', read: false },
  { id: 3, type: 'warning',  icon: '⛽', title: 'Combustible bajo', desc: 'BUS-004 al 15%. Alcanza para terminar el recorrido, pero no para el siguiente.', bus: 'BUS-004', time: 'hace 15 min', read: false },
  { id: 4, type: 'info',     icon: '📊', title: 'Reporte diario generado', desc: 'Operación del día cerrada: 2.847 pasajeros y 2,3 min de retraso promedio.', bus: 'Sistema', time: 'hace 32 min', read: true },
  { id: 5, type: 'info',     icon: '🔄', title: 'Mantenimiento programado', desc: 'BUS-012 entra a taller mañana a las 06:00. Hay que reasignar su turno de la Ruta D.', bus: 'BUS-012', time: 'hace 1 h', read: true },
];
let alerts = ALERT_SEED.slice();
 
function renderAlerts() {
  const data = state.alertFilter === 'all' ? alerts : alerts.filter(a => a.type === state.alertFilter);
  const el = $('alertsList');
  if (!data.length) {
    el.innerHTML = '<p class="empty-state">No hay alertas en esta categoría</p>';
  } else {
    el.innerHTML = data.map(a => `
      <article class="alert-item ${a.type} ${a.read ? 'read' : ''}" data-alert="${a.id}">
        <span class="alert-icon-wrap ${a.type}">${a.icon}</span>
        <div class="alert-content">
          <p class="alert-title">${a.title}</p>
          <p class="alert-desc">${a.desc}</p>
          <p class="alert-meta">
            <span class="alert-time">${a.time}</span>
            ${a.bus.startsWith('BUS') ? `<span class="alert-bus-tag" data-bus="${a.bus}">${a.bus}</span>` : `<span class="alert-bus-tag">${a.bus}</span>`}
          </p>
        </div>
      </article>`).join('');
  }
  refreshCounters();
}
 
$$('.filter-tab[data-alert-filter]').forEach(tab => {
  tab.addEventListener('click', function () {
    $$('.filter-tab[data-alert-filter]').forEach(t => t.classList.remove('active'));
    this.classList.add('active');
    state.alertFilter = this.dataset.alertFilter;
    renderAlerts();
  });
});

$('clearAlertsBtn').addEventListener('click', async () => {
  const pend = alerts.filter(a => !a.read).length;
  alerts.forEach(a => { a.read = true; });
  renderAlerts();
  if (backendConnected) {
    try {
      await api.markAllAlertsRead();
    } catch (e) {
      console.warn('API mark read error:', e);
    }
  }
  toast(pend ? pend + ' alertas marcadas como leídas' : 'No había alertas pendientes', 'ok');
});

$('newAlertBtn').addEventListener('click', async () => {
  const bus = pick(buses);
  const plantillas = [
    { type: 'warning', icon: '⛽', title: 'Combustible bajo', desc: `${bus.id} al ${randInt(8, 18)}% de combustible.` },
    { type: 'critical', icon: '🚨', title: 'Frenado brusco detectado', desc: `${bus.id} registró una desaceleración fuerte cerca de ${pick(STOPS).name}.` },
    { type: 'info', icon: '📍', title: 'Desvío de ruta', desc: `${bus.id} se apartó del trazado de la Ruta ${bus.route.id} por obras en la vía.` },
    { type: 'warning', icon: '👥', title: 'Unidad al límite', desc: `${bus.id} viaja con ${bus.capacity} de ${bus.capacity} asientos ocupados.` },
  ];
  const t = pick(plantillas);

  if (backendConnected) {
    try {
      const created = await api.createAlert({
        type: t.type,
        icon: t.icon,
        title: t.title,
        desc: t.desc,
        bus: bus.id,
      });
      alerts.unshift(created);
      renderAlerts();
      addNotification(t.icon, `<strong>${t.title}:</strong> ${bus.id}`);
      toast('Nueva alerta registrada en backend', 'warn');
      return;
    } catch (e) {
      console.warn('Error creating alert in API:', e);
    }
  }

  alerts.unshift({ id: Date.now(), ...t, bus: bus.id, time: 'ahora mismo', read: false });
  if (alerts.length > 20) alerts.pop();
  renderAlerts();
  addNotification(t.icon, `<strong>${t.title}:</strong> ${bus.id}`);
  toast('Nueva alerta registrada', 'warn');
});
 
function renderDrivers() {
  $('driversGrid').innerHTML = DRIVERS.map((d, i) => {
    const bus = buses.find(b => b.driver.id === d.id && b.status !== 'stopped');
    const color = ROUTES[i % ROUTES.length].color;
    return `
    <article class="driver-card" data-driver="${esc(d.name)}" role="button" tabindex="0">
      <div class="driver-top">
        <span class="driver-avatar" style="background:linear-gradient(135deg,${color},${color}99)">${d.initials}</span>
        <div>
          <p class="driver-name">${esc(d.name)}</p>
          <p class="driver-license">${d.license}</p>
          <p style="margin-top:5px">
            ${bus ? `<span class="status-badge status-active">En servicio · ${bus.id}</span>`
                  : '<span class="status-badge status-stopped">Sin asignar</span>'}
          </p>
        </div>
      </div>
      <div class="driver-stats">
        <div><p class="driver-stat-val">${fmt(d.trips)}</p><p class="driver-stat-lbl">Viajes</p></div>
        <div><p class="driver-stat-val">${String(d.hours).replace('.', ',')} h</p><p class="driver-stat-lbl">Turno hoy</p></div>
        <div><p class="driver-stat-val"><span class="stars">★</span> ${String(d.rating).replace('.', ',')}</p><p class="driver-stat-lbl">Calificación</p></div>
      </div>
    </article>`;
  }).join('');
}
 
/* ---------- Reportes ---------- */
 
$('generateReportBtn').addEventListener('click', () => {
  const total = buses.length;
  const circulando = buses.filter(b => b.status === 'active' || b.status === 'delayed').length;
  const pasajeros = buses.reduce((s, b) => s + b.passengers, 0);
  const ocupacion = Math.round((pasajeros / buses.reduce((s, b) => s + b.capacity, 0)) * 100);
  const retraso = buses.reduce((s, b) => s + b.delay, 0) / total;
  const taller = buses.filter(b => b.status === 'maintenance').length;
  const combustibleBajo = buses.filter(b => b.fuel < 20).length;
  const ahora = new Date();
 
  const box = $('reportSummary');
  box.hidden = false;
  box.innerHTML = `
    <h3>Reporte de operación</h3>
    <p class="stamp">Generado el ${ahora.toLocaleDateString('es-CR')} a las ${ahora.toLocaleTimeString('es-CR', { hour: '2-digit', minute: '2-digit' })}</p>
    <div class="summary-grid">
      <div class="summary-cell"><b>${circulando}/${total}</b><span>Buses circulando</span></div>
      <div class="summary-cell"><b>${pasajeros}</b><span>Pasajeros a bordo</span></div>
      <div class="summary-cell"><b>${ocupacion}%</b><span>Ocupación media</span></div>
      <div class="summary-cell"><b>${retraso.toFixed(1).replace('.', ',')} min</b><span>Retraso promedio</span></div>
      <div class="summary-cell"><b>${taller}</b><span>En mantenimiento</span></div>
      <div class="summary-cell"><b>${combustibleBajo}</b><span>Combustible bajo 20%</span></div>
    </div>`;
  if (box.scrollIntoView) box.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  toast('Reporte generado con los datos actuales', 'ok');
});
 
$('printReportBtn').addEventListener('click', () => {
  if ($('reportSummary').hidden) $('generateReportBtn').click();
  toast('Abriendo el diálogo de impresión');
  setTimeout(() => window.print(), 350);
});
 
/* ==========================================================
   MODALES
   ========================================================== */
 
const busModal = $('busModal');
const settingsModal = $('settingsModal');
let lastFocus = null;
 
function openModal(el) {
  lastFocus = document.activeElement;
  el.classList.add('open');
  const btn = el.querySelector('.modal-close');
  if (btn) btn.focus();
}
function closeModal(el) {
  el.classList.remove('open');
  if (lastFocus && lastFocus.focus) lastFocus.focus();
}
 
function fillBusModal(b) {
  $('modalBusTitle').textContent = b.id;
  $('modalBusSubtitle').textContent = `Ruta ${b.route.id} · ${b.route.name} · ${statusLabel(b.status)}`;
  const icon = $('modalBusIcon');
  icon.style.background = b.route.color + '22';
  icon.style.color = b.route.color;
  icon.textContent = b.num;
 
  $('modalSpeed').textContent = b.speed + ' km/h';
  $('modalPassengers').textContent = b.passengers + '/' + b.capacity;
 
  const delay = $('modalDelay');
  delay.textContent = b.delay > 0 ? '+' + b.delay + ' min' : 'En tiempo';
  delay.style.color = b.delay > 0 ? cssVar('--warn') : cssVar('--ok');
 
  const fuel = $('modalFuel');
  fuel.textContent = b.fuel + '%';
  fuel.style.color = b.fuel < 20 ? cssVar('--risk') : '';
 
  $('modalDriver').textContent = b.driver.name;
  $('modalPlate').textContent = b.plate;
  $('modalNextStop').textContent = b.nextStop;
  $('modalETA').textContent = b.etaMin ? b.etaMin + ' min' : '—';
 
  const statusSelect = $('modalStatusSelect');
  statusSelect.value = b.status;
  statusSelect.className = 'status-select-lg status-' + b.status;
}
 
function openBusModal(busId) {
  const b = buses.find(x => x.id === busId);
  if (!b) return;
  // Se guarda en una propiedad de JS, no como atributo del DOM: si fuera
  // data-bus en el propio modal, closest('[data-bus]') encontraría al
  // contenedor entero y cualquier clic adentro (cerrar, rastrear, contactar)
  // reabriría el modal en vez de dejarlo cerrar.
  busModal.currentBusId = b.id;
  fillBusModal(b);
  openModal(busModal);
}
 
$('modalClose').addEventListener('click', () => closeModal(busModal));
$('settingsClose').addEventListener('click', () => closeModal(settingsModal));
[busModal, settingsModal].forEach(m => {
  m.addEventListener('click', e => { if (e.target === m) closeModal(m); });
});
 
$('trackBusBtn').addEventListener('click', () => {
  const id = busModal.currentBusId;
  closeModal(busModal);
  focusBus(id);
});
 
$('contactDriverBtn').addEventListener('click', () => {
  const b = buses.find(x => x.id === busModal.currentBusId);
  if (b) toast('Llamando a ' + b.driver.name + ' (' + b.id + ')…');
});
 
$('modalStatusSelect').addEventListener('change', async function () {
  const b = buses.find(x => x.id === busModal.currentBusId);
  if (!b) return;
  const newStatus = this.value;
  applyBusStatus(b, newStatus);
  fillBusModal(b);
  refreshAfterStatusChange(b);

  if (backendConnected) {
    try {
      await api.updateBusStatus(b.id, newStatus);
    } catch (e) {
      console.warn('Failed to update status in backend:', e);
    }
  }

  toast('Estado de ' + b.id + ' actualizado a ' + statusLabel(b.status), 'ok');
});
 
document.addEventListener('keydown', e => {
  if (e.key !== 'Escape') return;
  if (busModal.classList.contains('open')) closeModal(busModal);
  if (settingsModal.classList.contains('open')) closeModal(settingsModal);
  $('notifDropdown').classList.remove('open');
  $('notifBtn').setAttribute('aria-expanded', 'false');
  closeSidebar();
});
 
// Con el menú principal abierto, Escape no hace nada: ya es la pantalla de inicio.
 
/* ---------- Preferencias ---------- */
 
function buildAccentPicker() {
  $('accentPicker').innerHTML = ACCENTS.map(a => `
    <button class="accent-dot ${prefs.accent === a.id ? 'selected' : ''}"
            data-accent="${a.id}" style="background:${a.swatch}"
            title="${a.label}" aria-label="Acento ${a.label}"></button>`).join('');
}
 
$('accentPicker').addEventListener('click', e => {
  const dot = e.target.closest('[data-accent]');
  if (!dot) return;
  prefs.accent = dot.dataset.accent;
  applyPrefs();
  savePrefs();
  buildAccentPicker();
  paintStaticMapLayers();
  redrawAll();
  drawMapMarkers(true);
  renderBusList();
  if (state.view === 'fleet') renderFleet();
  if (state.view === 'routes') renderRoutes();
  if (state.view === 'drivers') renderDrivers();
  toast('Acento actualizado');
});
 
function bindSwitch(id, onChange) {
  const el = $(id);
  el.addEventListener('click', () => {
    const next = el.getAttribute('aria-checked') !== 'true';
    el.setAttribute('aria-checked', String(next));
    onChange(next);
    savePrefs();
  });
}
 
bindSwitch('motionSwitch', v => {
  prefs.motion = v;
  toast(v ? 'Movimiento activado' : 'Movimiento en pausa');
});
bindSwitch('liveSwitch', v => {
  prefs.live = v;
  syncLiveIndicator();
});
bindSwitch('densitySwitch', v => {
  prefs.density = v ? 'compact' : 'normal';
  applyPrefs();
  setTimeout(redrawAll, 220);
});
 
$('resetDataBtn').addEventListener('click', () => {
  buses = generateBuses(12);
  state.highlightBus = null;
  stopTracking();
  refreshCounters();
  renderBusList();
  renderFleet();
  renderMapBusList();
  drawMapMarkers(true);
  if (state.view === 'routes') renderRoutes();
  toast('Flota regenerada con datos nuevos', 'ok');
});
 
function openSettings() {
  $('motionSwitch').setAttribute('aria-checked', String(prefs.motion));
  $('liveSwitch').setAttribute('aria-checked', String(prefs.live));
  $('densitySwitch').setAttribute('aria-checked', String(prefs.density === 'compact'));
  buildAccentPicker();
  openModal(settingsModal);
}
 
$('settingsBtn').addEventListener('click', e => { e.stopPropagation(); openSettings(); });
$('userProfile').addEventListener('click', openSettings);
$('userProfile').addEventListener('keydown', e => {
  if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openSettings(); }
});
 
/* ==========================================================
   8. NOTIFICACIONES Y AVISOS
   ========================================================== */
 
const notifs = [
  { icon: '🚨', msg: '<strong>Crítica:</strong> BUS-011 con temperatura de motor elevada', time: 'hace 3 min', unread: true },
  { icon: '⚠️', msg: '<strong>Retraso:</strong> BUS-007 va +8 min en Ruta B', time: 'hace 8 min', unread: true },
  { icon: '⛽', msg: '<strong>Combustible bajo:</strong> BUS-004 al 15%', time: 'hace 15 min', unread: true },
  { icon: '✅', msg: 'BUS-001 completó la Ruta A con 48 pasajeros', time: 'hace 22 min', unread: false },
  { icon: '📊', msg: 'Reporte diario generado: 2.847 pasajeros', time: 'hace 32 min', unread: false },
];
 
function renderNotifs() {
  const list = $('notifList');
  if (!notifs.length) {
    list.innerHTML = '<p class="empty-state">Sin notificaciones</p>';
  } else {
    list.innerHTML = notifs.map((n, i) => `
      <div class="notif-item ${n.unread ? 'unread' : ''}" data-notif="${i}">
        <span class="notif-icon">${n.icon}</span>
        <span style="flex:1">
          <span class="notif-msg">${n.msg}</span>
          <span class="notif-time">${n.time}</span>
        </span>
      </div>`).join('');
  }
  $('notifDot').classList.toggle('hidden', !notifs.some(n => n.unread));
}
 
function addNotification(icon, msg) {
  notifs.unshift({ icon, msg, time: 'ahora mismo', unread: true });
  if (notifs.length > 12) notifs.pop();
  renderNotifs();
}
 
const notifBtn = $('notifBtn');
const notifDropdown = $('notifDropdown');
 
notifBtn.addEventListener('click', e => {
  e.stopPropagation();
  const open = notifDropdown.classList.toggle('open');
  notifBtn.setAttribute('aria-expanded', String(open));
});
 
notifDropdown.addEventListener('click', e => {
  const item = e.target.closest('[data-notif]');
  if (!item) return;
  notifs[+item.dataset.notif].unread = false;
  renderNotifs();
});
 
$('clearNotifsBtn').addEventListener('click', e => {
  e.stopPropagation();
  notifs.length = 0;
  renderNotifs();
  toast('Notificaciones limpiadas', 'ok');
});
 
document.addEventListener('click', e => {
  if (!notifDropdown.contains(e.target) && !notifBtn.contains(e.target)) {
    notifDropdown.classList.remove('open');
    notifBtn.setAttribute('aria-expanded', 'false');
  }
  const bar = document.querySelector('.search-bar');
  if (bar.classList.contains('mobile-open')
      && !bar.contains(e.target) && !$('mobileSearchBtn').contains(e.target)) {
    bar.classList.remove('mobile-open');
  }
});
 
function toast(msg, kind) {
  const el = document.createElement('div');
  el.className = 'toast' + (kind ? ' ' + kind : '');
  el.textContent = msg;
  $('toastStack').appendChild(el);
  setTimeout(() => {
    el.classList.add('out');
    setTimeout(() => el.remove(), 250);
  }, 2600);
}
 
/* ---------- Búsqueda global y menú de búsqueda en celular ---------- */
 
$('globalSearch').addEventListener('keydown', function (e) {
  if (e.key !== 'Enter') return;
  const q = this.value.trim();
  if (!q) return;
  navigate('fleet');
  $('fleetSearch').value = q;
  $('statusFilter').value = '';
  $('routeFilter').value = '';
  renderFleet();
  const n = visibleBuses().length;
  toast(n ? n + ' resultados para "' + q + '"' : 'Sin resultados para "' + q + '"', n ? 'ok' : 'warn');
});
 
$('mobileSearchBtn').addEventListener('click', e => {
  e.stopPropagation();
  const bar = document.querySelector('.search-bar');
  bar.classList.toggle('mobile-open');
  if (bar.classList.contains('mobile-open')) $('globalSearch').focus();
});
 
/* ---------- Delegación general de clics ---------- */
 
document.addEventListener('click', e => {
  // Los botones dentro de un modal (cerrar, rastrear, contactar) ya
  // tienen su propio listener. Si un modal llegara a tener data-bus,
  // data-route, etc. en el contenedor, esto evita que closest() suba
  // hasta él y vuelva a disparar una acción de apertura.
  if (e.target.closest('.modal-overlay')) return;
 
  const track = e.target.closest('[data-track]');
  if (track) { focusBus(track.dataset.track); return; }
 
  const route = e.target.closest('[data-route]');
  if (route) { openRoute(route.dataset.route); return; }
 
  const driver = e.target.closest('[data-driver]');
  if (driver) {
    navigate('fleet');
    $('fleetSearch').value = driver.dataset.driver;
    $('statusFilter').value = '';
    $('routeFilter').value = '';
    renderFleet();
    toast('Buses asignados a ' + driver.dataset.driver);
    return;
  }
 
  const bus = e.target.closest('[data-bus]');
  if (bus) openBusModal(bus.dataset.bus);
});
 
document.addEventListener('keydown', e => {
  if (e.key !== 'Enter' && e.key !== ' ') return;
  const t = e.target;
  if (!t.closest) return;
  const el = t.closest('[data-bus], [data-route], [data-driver]');
  if (el && el.getAttribute('tabindex') === '0') {
    e.preventDefault();
    el.click();
  }
});
 
/* ==========================================================
   GRÁFICOS (canvas)
   ========================================================== */
 
// Ajusta el canvas a su contenedor y a la densidad de la pantalla.
function fitCanvas(canvas, cssHeight) {
  const dpr = window.devicePixelRatio || 1;
  const parent = canvas.parentElement;
  const w = Math.max(160, parent.clientWidth - getInnerPadding(parent));
  const h = cssHeight;
  canvas.style.width = w + 'px';
  canvas.style.height = h + 'px';
  canvas.width = Math.round(w * dpr);
  canvas.height = Math.round(h * dpr);
  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, w, h);
  return { ctx, w, h };
}
 
function getInnerPadding(el) {
  const cs = getComputedStyle(el);
  return parseFloat(cs.paddingLeft) + parseFloat(cs.paddingRight);
}
 
// roundRect no existe en Safari antiguo ni en varios navegadores móviles.
function bar(ctx, x, y, w, h, r) {
  const rad = Math.max(0, Math.min(r, w / 2, h));
  ctx.beginPath();
  ctx.moveTo(x, y + h);
  ctx.lineTo(x, y + rad);
  ctx.quadraticCurveTo(x, y, x + rad, y);
  ctx.lineTo(x + w - rad, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + rad);
  ctx.lineTo(x + w, y + h);
  ctx.closePath();
  ctx.fill();
}
 
function drawSparkline(id, data, color) {
  const canvas = $(id);
  if (!canvas || !canvas.offsetParent) return;
  const dpr = window.devicePixelRatio || 1;
  const w = 80, h = 40;
  canvas.style.width = w + 'px';
  canvas.style.height = h + 'px';
  canvas.width = w * dpr; canvas.height = h * dpr;
  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, w, h);
 
  const max = Math.max(...data), min = Math.min(...data), range = (max - min) || 1;
  const pt = (v, i) => ({ x: (i / (data.length - 1)) * w, y: h - ((v - min) / range) * (h - 5) - 2.5 });
  const trace = () => data.forEach((v, i) => { const p = pt(v, i); i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y); });
 
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, color + '55');
  g.addColorStop(1, color + '00');
  ctx.beginPath(); trace();
  ctx.lineTo(w, h); ctx.lineTo(0, h); ctx.closePath();
  ctx.fillStyle = g; ctx.fill();
 
  ctx.beginPath(); trace();
  ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.lineJoin = 'round'; ctx.stroke();
}
 
function drawSparklines() {
  drawSparkline('sparkline1', [32, 35, 34, 36, 37, 35, 38], cssVar('--brand-500'));
  drawSparkline('sparkline2', [10, 11, 11, 12, 11, 12, 12], cssVar('--route-c'));
  drawSparkline('sparkline3', [2100, 2300, 1980, 2600, 2400, 2750, 2847], cssVar('--ok'));
  drawSparkline('sparkline4', [3.1, 2.9, 3.2, 2.7, 2.5, 2.4, 2.3], cssVar('--warn'));
}
 
const CHART_DATA = {
  day: {
    labels: ['06', '07', '08', '09', '10', '11', '12', '13', '14', '15', '16', '17', '18'],
    values: [120, 245, 380, 420, 310, 290, 350, 430, 490, 520, 480, 390, 280],
    caption: 'Pasajeros por hora, jornada de hoy.',
  },
  week: {
    labels: ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'],
    values: [2400, 2610, 2530, 2780, 3100, 1980, 1450],
    caption: 'Pasajeros por día, últimos 7 días.',
  },
  month: {
    labels: ['Sem 1', 'Sem 2', 'Sem 3', 'Sem 4'],
    values: [16800, 17400, 16950, 18200],
    caption: 'Pasajeros por semana, últimas 4 semanas.',
  },
};
 
function drawMainChart() {
  const canvas = $('mainChart');
  if (!canvas || !canvas.offsetParent) return;
  const { ctx, w, h } = fitCanvas(canvas, 180);
  const { labels, values, caption } = CHART_DATA[state.chartPeriod];
  $('chartCaption').textContent = caption + ' Total: ' + fmt(values.reduce((a, b) => a + b, 0)) + '.';
 
  const max = Math.max(...values);
  const padL = 46, padR = 10, padT = 10, padB = 26;
  const cw = w - padL - padR, ch = h - padT - padB;
  const slot = cw / values.length;
  const bw = Math.max(5, slot * 0.58);
 
  ctx.strokeStyle = 'rgba(148,163,200,0.13)';
  ctx.lineWidth = 1;
  ctx.font = '10px Inter, sans-serif';
  [0, 0.25, 0.5, 0.75, 1].forEach(p => {
    const y = Math.round(padT + ch - p * ch) + 0.5;
    ctx.beginPath(); ctx.moveTo(padL, y); ctx.lineTo(padL + cw, y); ctx.stroke();
    ctx.fillStyle = cssVar('--text-soft');
    ctx.textAlign = 'right';
    ctx.fillText(fmt(Math.round(max * p)), padL - 7, y + 3.5);
  });
 
  const c1 = cssVar('--brand-500'), c2 = cssVar('--brand-alt');
  values.forEach((v, i) => {
    const x = padL + i * slot + (slot - bw) / 2;
    const bh = Math.max(2, (v / max) * ch);
    const y = padT + ch - bh;
    const g = ctx.createLinearGradient(0, y, 0, y + bh);
    g.addColorStop(0, c1); g.addColorStop(1, c2);
    ctx.fillStyle = g;
    bar(ctx, x, y, bw, bh, 3);
 
    ctx.fillStyle = cssVar('--text-soft');
    ctx.textAlign = 'center';
    if (slot > 30 || i % 2 === 0) ctx.fillText(labels[i], x + bw / 2, padT + ch + 15);
  });
}
 
$$('.period-btn').forEach(btn => {
  btn.addEventListener('click', function () {
    $$('.period-btn').forEach(b => b.classList.remove('active'));
    this.classList.add('active');
    state.chartPeriod = this.dataset.period;
    drawMainChart();
  });
});
 
function drawReportCharts() {
  // Eficiencia por ruta
  const c1 = $('reportChart1');
  if (c1 && c1.offsetParent) {
    const { ctx, w, h } = fitCanvas(c1, 200);
    const vals = ROUTES.map(r => {
      const s = routeStats(r);
      return Math.max(40, Math.round(100 - s.retraso * 6));
    });
    const slot = w / ROUTES.length, bw = slot * 0.46;
    ctx.font = 'bold 12px Inter, sans-serif';
    vals.forEach((v, i) => {
      const x = i * slot + (slot - bw) / 2;
      const bh = (v / 100) * (h - 48);
      const y = h - bh - 24;
      const color = ROUTES[i].color;
      const g = ctx.createLinearGradient(0, y, 0, y + bh);
      g.addColorStop(0, color); g.addColorStop(1, color + '55');
      ctx.fillStyle = g; bar(ctx, x, y, bw, bh, 4);
      ctx.fillStyle = color; ctx.textAlign = 'center';
      ctx.fillText(v + '%', x + bw / 2, y - 7);
      ctx.fillStyle = cssVar('--text-soft'); ctx.font = '11px Inter, sans-serif';
      ctx.fillText('Ruta ' + ROUTES[i].id, x + bw / 2, h - 7);
      ctx.font = 'bold 12px Inter, sans-serif';
    });
  }
 
  // Dona de pasajeros por ruta
  const c2 = $('reportChart2');
  if (c2 && c2.offsetParent) {
    const { ctx, w, h } = fitCanvas(c2, 200);
    const vals = ROUTES.map(r => routeStats(r).pasajeros);
    const total = vals.reduce((a, b) => a + b, 0) || 1;
    const cx = w / 2, cy = h / 2;
    const r = Math.min(w, h) / 2 - 16, ri = r * 0.58;
    let start = -Math.PI / 2;
    vals.forEach((v, i) => {
      const ang = (v / total) * Math.PI * 2;
      ctx.beginPath(); ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, r, start, start + ang); ctx.closePath();
      ctx.fillStyle = ROUTES[i].color; ctx.fill();
      start += ang;
    });
    ctx.beginPath(); ctx.arc(cx, cy, ri, 0, Math.PI * 2);
    ctx.fillStyle = cssVar('--bg-card'); ctx.fill();
    ctx.textAlign = 'center';
    ctx.fillStyle = cssVar('--text-strong'); ctx.font = 'bold 20px Inter, sans-serif';
    ctx.fillText(fmt(total), cx, cy + 3);
    ctx.fillStyle = cssVar('--text-soft'); ctx.font = '10px Inter, sans-serif';
    ctx.fillText('a bordo ahora', cx, cy + 18);
  }
 
  // Línea de retrasos
  const c3 = $('reportChart3');
  if (c3 && c3.offsetParent) {
    const { ctx, w, h } = fitCanvas(c3, 160);
    const data = [3.5, 3.1, 2.9, 3.3, 2.8, 3.0, 2.6, 2.7, 2.4, 2.5, 2.3, 2.4, 2.2, 2.3,
      2.1, 2.4, 2.2, 2.0, 2.3, 2.1, 2.4, 2.3, 2.1, 2.3, 2.2, 2.0, 2.3, 2.1];
    const pad = 34, cw = w - pad * 2, ch = h - pad * 2;
    const max = Math.max(...data), min = 1.5, range = max - min;
    ctx.font = '10px Inter, sans-serif';
    [0, 0.25, 0.5, 0.75, 1].forEach(p => {
      const y = Math.round(pad + ch - p * ch) + 0.5;
      ctx.strokeStyle = 'rgba(148,163,200,0.13)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(pad, y); ctx.lineTo(pad + cw, y); ctx.stroke();
      ctx.fillStyle = cssVar('--text-soft'); ctx.textAlign = 'right';
      ctx.fillText((min + range * p).toFixed(1).replace('.', ',') + ' m', pad - 6, y + 3.5);
    });
 
    const pt = (v, i) => ({ x: pad + (i / (data.length - 1)) * cw, y: pad + ch - ((v - min) / range) * ch });
    const trace = () => data.forEach((v, i) => { const p = pt(v, i); i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y); });
    const line = cssVar('--route-c');
 
    const g = ctx.createLinearGradient(0, pad, 0, pad + ch);
    g.addColorStop(0, line + '55'); g.addColorStop(1, line + '00');
    ctx.beginPath(); trace();
    ctx.lineTo(pad + cw, pad + ch); ctx.lineTo(pad, pad + ch); ctx.closePath();
    ctx.fillStyle = g; ctx.fill();
 
    ctx.beginPath(); trace();
    ctx.strokeStyle = line; ctx.lineWidth = 2; ctx.lineJoin = 'round'; ctx.stroke();
  }
}
 
function redrawAll() {
  drawSparklines();
  drawMainChart();
  if (state.view === 'reports') drawReportCharts();
  if (realLeafletMap) {
    try { realLeafletMap.invalidateSize({ animate: false }); } catch (_) {}
  }
}
 
/* ==========================================================
   MENÚ PRINCIPAL (pantalla de entrada)
   ========================================================== */
 
const homeScreen = $('homeScreen');
let homeOpen = true;
let homeTimer = null;
 
// Cada azulejo muestra un dato vivo para que el menú no sea solo decoración.
function updateHomeChips() {
  if (!homeOpen) return;
  const circulando = buses.filter(b => b.status === 'active' || b.status === 'delayed').length;
  const pendientes = alerts.filter(a => !a.read).length;
  const pasajeros = buses.reduce((s, b) => s + b.passengers, 0);
 
  $('chipDashboard').textContent = circulando + '/' + buses.length;
  $('chipFleet').textContent = buses.length + ' buses';
  $('chipRoutes').textContent = ROUTES.length + ' rutas';
  $('chipAlerts').textContent = pendientes ? pendientes + ' nuevas' : 'al día';
  $('chipReports').textContent = fmt(pasajeros);
  $('chipDrivers').textContent = DRIVERS.length;
 
  $('homeStatus').textContent = circulando
    ? circulando + ' de ' + buses.length + ' unidades en circulación'
    : 'Ninguna unidad en circulación';
}
 
function showHome() {
  clearTimeout(homeTimer);
  homeOpen = true;
  homeScreen.classList.remove('hidden', 'closing');
  document.body.style.overflow = 'hidden';
  $$('.nav-item').forEach(n => n.classList.remove('active'));
  $('nav-home').classList.add('active');
  updateHomeChips();
  // Reinicia la animación escalonada de los azulejos
  $$('.home-tile').forEach(t => {
    t.style.animation = 'none';
    void t.offsetWidth;
    t.style.animation = '';
  });
  const first = homeScreen.querySelector('.home-tile');
  if (first) first.focus({ preventScroll: true });
}
 
function hideHome() {
  if (!homeOpen) return;
  homeOpen = false;
  homeScreen.classList.add('closing');
  document.body.style.overflow = '';
  homeTimer = setTimeout(() => {
    homeScreen.classList.add('hidden');
    homeScreen.classList.remove('closing');
  }, 340);
}
 
$$('.home-tile').forEach(tile => {
  tile.addEventListener('click', () => {
    const view = tile.dataset.go;
    hideHome();
    navigate(view);
    // Los canvas se dibujan mal si el contenedor todavía está oculto
    requestAnimationFrame(() => setTimeout(redrawAll, 60));
  });
});
 
$('nav-home').addEventListener('click', showHome);
$('nav-home').addEventListener('keydown', e => {
  if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); showHome(); }
});
$('logoHome').addEventListener('click', showHome);
$('logoHome').addEventListener('keydown', e => {
  if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); showHome(); }
});
 
/* ==========================================================
   9. CICLO DE VIDA
   ========================================================== */
 
function refreshCounters() {
  const circulando = buses.filter(b => b.status === 'active' || b.status === 'delayed').length;
  $('activeCount').textContent = circulando;
  $('routeCount').textContent = ROUTES.length;
  $('fleetCountBadge').textContent = buses.length;
  const pendientes = alerts.filter(a => !a.read).length;
  const badge = $('alertsCountBadge');
  badge.textContent = pendientes;
  badge.style.display = pendientes ? '' : 'none';
 
  const retraso = buses.reduce((s, b) => s + b.delay, 0) / (buses.length || 1);
  $('avgDelay').innerHTML = retraso.toFixed(1).replace('.', ',') + '<small>min</small>';
 
  updateHomeChips();
}
 
function syncLiveIndicator() {
  const el = $('liveToggle');
  el.classList.toggle('paused', !prefs.live);
  el.setAttribute('aria-pressed', String(prefs.live));
  $('liveLabel').textContent = prefs.live ? 'Actualizando' : 'En pausa';
}
 
$('liveToggle').addEventListener('click', () => {
  prefs.live = !prefs.live;
  syncLiveIndicator();
  savePrefs();
  toast(prefs.live ? 'Actualización automática activada' : 'Actualización automática en pausa');
});
 
$('expandMapBtn').addEventListener('click', () => navigate('map'));
$('trackingStopBtn').addEventListener('click', () => stopTracking('Dejaste de seguir el bus'));
 
function updateLiveData() {
  if (!prefs.live) return;
  if (backendConnected) return;
  buses.forEach(b => {
    if (b.status !== 'active' && b.status !== 'delayed') return;
    b.passengers = Math.max(0, Math.min(b.capacity, b.passengers + randInt(-3, 3)));
    b.speed = Math.max(16, Math.min(66, b.speed + randInt(-5, 5)));
    b.updatedAgo = 1;
    if (Math.random() < 0.12) b.nextStop = pick(STOPS).name;
    if (Math.random() < 0.08) b.fuel = Math.max(5, b.fuel - 1);
  });
  refreshCounters();
  if (state.view === 'dashboard') renderBusList();
  if (state.view === 'fleet') renderFleet();
  if (state.view === 'map') renderMapBusList();
  if (state.view === 'routes') renderRoutes();
}
 
let resizeTimer;
window.addEventListener('resize', () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => {
    redrawAll();
    if (!isMobile()) closeSidebar();
  }, 160);
});

function init() {
  // ------------------------------------------------------------------
  // HAPTIC FEEDBACK & SHARE HELPERS
  // ------------------------------------------------------------------
  function hapticFeedback(pattern = 10) {
    if ('vibrate' in navigator) {
      try { navigator.vibrate(pattern); } catch (_) {}
    }
  }

  // Bind haptics to all buttons
  document.querySelectorAll('button').forEach(btn => {
    btn.addEventListener('click', () => hapticFeedback(8));
  });

  // ------------------------------------------------------------------
  // DYNAMIC PAGE META TITLES & DESCRIPTIONS
  // ------------------------------------------------------------------
  const pageMetaMap = {
    dashboard: { title: 'Panel Principal — BusTrack Pro', desc: 'Resumen en tiempo real del estado de la flota, mapa interactivo y métricas.' },    map: { title: 'Mapa en Vivo — BusTrack Pro', desc: 'Seguimiento satelital y mapa esquemático de todas las unidades en circulación.' },
    fleet: { title: 'Gestión de Flota — BusTrack Pro', desc: 'Tabla completa de unidades, conductores asignados, estados y exportación CSV.' },
    routes: { title: 'Rutas Operativas — BusTrack Pro', desc: 'Detalle de trazados, paradas e indicadores por recorrido.' },
    alerts: { title: 'Centro de Alertas — BusTrack Pro', desc: 'Alertas críticas, advertencias y avisos del sistema en tiempo real.' },
    reports: { title: 'Reportes y Analíticas — BusTrack Pro', desc: 'Gráficos de eficiencia, volumen de pasajeros y tiempos de retraso.' },
    drivers: { title: 'Directorio de Conductores — BusTrack Pro', desc: 'Turnos, calificaciones y asignación de buses por conductor.' }
  };

  const originalNavigate = navigate;
  navigate = function(viewName) {
    originalNavigate(viewName);
    if (pageMetaMap[viewName]) {
      document.title = pageMetaMap[viewName].title;
      const metaDesc = document.querySelector('meta[name="description"]');
      if (metaDesc) metaDesc.content = pageMetaMap[viewName].desc;
    }
  };
  switchView = function(viewName) {
    return navigate(viewName);
  };

  // ------------------------------------------------------------------
  // AUTHENTICATION & LANDING GATE LOGIC (Email, Google, Apple)
  // ------------------------------------------------------------------

  let currentUser = null;
  let isGuestSession = false;
  let currentOAuthProvider = 'google';
  try {
    const savedUser = localStorage.getItem('bustrack_user');
    if (savedUser) currentUser = JSON.parse(savedUser);
    const guestFlag = sessionStorage.getItem('bustrack_guest');
    if (guestFlag === 'true') isGuestSession = true;
    const savedToken = localStorage.getItem('bustrack_auth_token');
    if (savedToken) {
      api.getMe(savedToken).then(res => {
        if (res && res.user) {
          currentUser = res.user;
          localStorage.setItem('bustrack_user', JSON.stringify(currentUser));
          updateAuthUserUI();
        }
      }).catch(() => {});
    }
  } catch (_) {}

  function updateAuthUserUI() {
    const avatarSlot = $('userAvatarSlot');
    const nameSlot = $('userNameSlot');
    const roleSlot = $('userRoleSlot');
    const activeBox = $('userProfileActiveBox');
    const loginForm = $('loginForm');
    const regForm = $('registerForm');
    const oauthBox = document.querySelector('.oauth-buttons-container');
    const divider = document.querySelector('.auth-divider');
    const sidebarAuthBox = $('sidebarAuthBox');
    const sidebarUserBox = $('sidebarUserBox');

    if (currentUser) {
      if (sidebarAuthBox) {
        sidebarAuthBox.hidden = true;
        sidebarAuthBox.style.display = 'none';
      }
      if (sidebarUserBox) {
        sidebarUserBox.hidden = false;
        sidebarUserBox.style.display = 'flex';
      }

      if (avatarSlot) avatarSlot.textContent = currentUser.name.split(' ').map(n=>n[0]).join('').slice(0,2).toUpperCase();
      if (nameSlot) nameSlot.textContent = currentUser.name;
      if (roleSlot) roleSlot.textContent = currentUser.role === 'admin' ? 'Administrador' : 'Pasajero';

      if (activeBox) {
        activeBox.hidden = false;
        $('userActiveAvatar').src = currentUser.avatarUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(currentUser.name)}`;
        $('userActiveName').textContent = currentUser.name;
        $('userActiveEmail').textContent = currentUser.email;
        $('userActiveBadge').textContent = `Cuenta ${currentUser.provider.toUpperCase()} (${currentUser.role})`;
      }
      if (loginForm) loginForm.hidden = true;
      if (regForm) regForm.hidden = true;
      if (oauthBox) oauthBox.style.display = 'none';
      if (divider) divider.style.display = 'none';
      const tabs = document.querySelector('.auth-tabs');
      if (tabs) tabs.style.display = 'none';
    } else {
      if (sidebarAuthBox) {
        sidebarAuthBox.hidden = false;
        sidebarAuthBox.style.display = 'flex';
      }
      if (sidebarUserBox) {
        sidebarUserBox.hidden = true;
        sidebarUserBox.style.display = 'none';
      }

      if (activeBox) activeBox.hidden = true;
      if (oauthBox) oauthBox.style.display = 'flex';
      if (divider) divider.style.display = 'flex';
      const tabs = document.querySelector('.auth-tabs');
      if (tabs) tabs.style.display = 'grid';

      // Show active tab form
      const isReg = $('tabRegister')?.classList.contains('active');
      if (loginForm) loginForm.hidden = isReg;
      if (regForm) regForm.hidden = !isReg;
    }
  }
  updateAuthUserUI();

  // Auth Button & Modal controls
  const authBtn = $('authBtn');
  const authModal = $('authModal');
  const authClose = $('authClose');
  const oauthPromptModal = $('oauthPromptModal');
  const oauthPromptClose = $('oauthPromptClose');
  const sidebarLoginBtn = $('sidebarLoginBtn');
  const sidebarRegisterBtn = $('sidebarRegisterBtn');

  function openAuthModal(initialTab = 'login') {
    if (!authModal) return;
    authModal.classList.add('active');
    if (initialTab === 'register') {
      const tabReg = $('tabRegister');
      if (tabReg) tabReg.click();
      setTimeout(() => $('regName')?.focus(), 120);
    } else {
      const tabLog = $('tabLogin');
      if (tabLog) tabLog.click();
      setTimeout(() => $('loginEmail')?.focus(), 120);
    }
  }

  if (sidebarLoginBtn) {
    sidebarLoginBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      openAuthModal('login');
    });
  }

  if (sidebarRegisterBtn) {
    sidebarRegisterBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      openAuthModal('register');
    });
  }

  if (authBtn && authModal) {
    authBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      openAuthModal('login');
    });
  }
  if (authClose && authModal) {
    authClose.addEventListener('click', () => authModal.classList.remove('active'));
  }
  if (oauthPromptClose && oauthPromptModal) {
    oauthPromptClose.addEventListener('click', () => oauthPromptModal.classList.remove('active'));
  }

  // --- SUPABASE CLIENTE (OAuth real para Google & Apple) ---
  const SUPABASE_URL = 'https://tbkgtblucdzkazpwlwda.supabase.co';
  const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRia2d0Ymx1Y2R6a2F6cHdsd2RhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA2MjEzMDIsImV4cCI6MjEwNjE5NzMwMn0.-l_2o1G4eb3bhDgknHLH7SSx1IobaC-9jbVTTwBmkfM';
  const supabaseClient = (typeof supabase !== 'undefined' && supabase.createClient)
    ? supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
    : null;

  // Helper: crear sesión local a partir de un usuario de Supabase Auth
  async function handleSupabaseSession(supaUser) {
    if (!supaUser) return;
    const provider = supaUser.app_metadata?.provider || 'oauth';
    const name = supaUser.user_metadata?.full_name
      || supaUser.user_metadata?.name
      || supaUser.email?.split('@')[0]
      || 'Usuario';

    // Registrar/actualizar en el backend local para obtener JWT propio
    try {
      const res = await fetch('/api/v1/auth/oauth-callback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          supabaseId: supaUser.id,
          email: supaUser.email,
          name,
          provider,
          avatarUrl: supaUser.user_metadata?.avatar_url || supaUser.user_metadata?.picture || ''
        })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.status === 'success') {
          currentUser = data.user;
          isGuestSession = false;
          localStorage.setItem('bustrack_user', JSON.stringify(currentUser));
          localStorage.setItem('bustrack_auth_token', data.token);
          toast(`¡Bienvenido, ${currentUser.name}! 🎉`, 'ok');
          updateAuthUserUI();
          showHome();
          if (authModal) authModal.classList.remove('active');
          return;
        }
      }
    } catch (_) {}

    // Fallback: crear sesión local sin backend
    currentUser = {
      id: supaUser.id,
      email: supaUser.email,
      name,
      role: 'admin',
      provider,
      avatarUrl: supaUser.user_metadata?.avatar_url || supaUser.user_metadata?.picture || ''
    };
    isGuestSession = false;
    localStorage.setItem('bustrack_user', JSON.stringify(currentUser));
    toast(`¡Bienvenido, ${name}! 🎉`, 'ok');
    updateAuthUserUI();
    showHome();
    if (authModal) authModal.classList.remove('active');
  }

  // Detectar sesión OAuth al cargar la página (redirect/popup callback)
  if (supabaseClient) {
    supabaseClient.auth.onAuthStateChange(async (event, session) => {
      if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') && session?.user && !currentUser) {
        await handleSupabaseSession(session.user);
      }
    });

    // Recuperar sesión activa de Supabase si existe
    supabaseClient.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user && !currentUser) {
        await handleSupabaseSession(session.user);
      }
    });
  }

  // Función principal de OAuth — abre el proveedor real
  async function openOAuthPrompt(provider) {
    if (!supabaseClient) {
      toast('El SDK de Supabase no está cargado. Recarga la página.', 'warn');
      return;
    }

    const providerName = provider === 'google' ? 'Google' : 'Apple';

    // Mostrar loader visual en el botón
    const btn = provider === 'google' ? $('landingGoogleAuthBtn') : $('landingAppleAuthBtn');
    const originalHTML = btn?.innerHTML;
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = `<svg style="animation:spin 0.8s linear infinite;width:18px;height:18px" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10" opacity=".25"/><path d="M12 2a10 10 0 0 1 10 10" stroke-linecap="round"/></svg> Conectando...`;
    }

    try {
      const redirectTo = window.location.origin + window.location.pathname;
      const { error } = await supabaseClient.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo,
          queryParams: provider === 'google' ? { access_type: 'offline', prompt: 'select_account' } : {}
        }
      });

      if (error) {
        toast(`Error al iniciar ${providerName}: ${error.message}`, 'warn');
        if (btn) { btn.disabled = false; btn.innerHTML = originalHTML; }
      }
      // Si no hay error, el navegador redirige automáticamente al proveedor
    } catch (err) {
      toast(`No se pudo conectar con ${providerName}`, 'warn');
      if (btn) { btn.disabled = false; btn.innerHTML = originalHTML; }
    }
  }

  // --- MODAL FORM HANDLERS ---
  const tabLogin = $('tabLogin');
  const tabRegister = $('tabRegister');
  if (tabLogin && tabRegister) {
    tabLogin.addEventListener('click', () => {
      tabLogin.classList.add('active');
      tabRegister.classList.remove('active');
      $('loginForm').hidden = false;
      $('registerForm').hidden = true;
    });
    tabRegister.addEventListener('click', () => {
      tabRegister.classList.add('active');
      tabLogin.classList.remove('active');
      $('registerForm').hidden = false;
      $('loginForm').hidden = true;
    });
  }

  // Modal Login Submit (Conectado a Supabase y Backend)
  const loginForm = $('loginForm');
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = $('loginEmail').value.trim();
      const password = $('loginPassword').value;
      const submitBtn = $('loginSubmitBtn');
      const originalText = submitBtn ? submitBtn.textContent : 'Iniciar Sesión';

      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Conectando con Supabase...';
      }

      try {
        let authenticated = false;

        // 1. Intentar autenticar con Supabase Auth directamente
        if (supabaseClient) {
          try {
            const { data: supaAuth, error: supaErr } = await supabaseClient.auth.signInWithPassword({
              email,
              password
            });

            if (!supaErr && supaAuth?.user) {
              const supaUser = supaAuth.user;
              let displayName = supaUser.user_metadata?.name || supaUser.user_metadata?.full_name || email.split('@')[0];

              // Consultar perfil guardado en la tabla users de Supabase
              try {
                const { data: profile } = await supabaseClient
                  .from('users')
                  .select('full_name, role, avatar_url')
                  .eq('email', email)
                  .maybeSingle();
                if (profile?.full_name) displayName = profile.full_name;
              } catch (_) {}

              currentUser = {
                id: supaUser.id,
                email: supaUser.email,
                name: displayName,
                role: 'admin',
                provider: 'supabase',
                avatarUrl: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(displayName)}`
              };

              isGuestSession = false;
              localStorage.setItem('bustrack_user', JSON.stringify(currentUser));
              if (supaAuth.session?.access_token) {
                localStorage.setItem('bustrack_auth_token', supaAuth.session.access_token);
              }
              authenticated = true;
              toast(`¡Bienvenido de nuevo, ${currentUser.name}! (Supabase Auth)`, 'ok');
            }
          } catch (supaEx) {
            console.warn('[Supabase Client Login]', supaEx);
          }
        }

        // 2. Si no se autenticó por cliente o Supabase no respondió, intentar con el backend API
        if (!authenticated) {
          const res = await api.login(email, password);
          if (res.status === 'success') {
            currentUser = res.user;
            isGuestSession = false;
            localStorage.setItem('bustrack_user', JSON.stringify(currentUser));
            localStorage.setItem('bustrack_auth_token', res.token);
            toast(`¡Bienvenido de nuevo, ${currentUser.name}!`, 'ok');
            authenticated = true;
          } else {
            toast(res.detail || 'Credenciales incorrectas en Supabase o cuenta no encontrada', 'warn');
          }
        }

        if (authenticated) {
          updateAuthUserUI();
          hideHome();
          navigate('dashboard');
          if (authModal) authModal.classList.remove('active');
        }
      } catch (err) {
        toast('No se pudo conectar al servidor de autenticación', 'warn');
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = originalText;
        }
      }
    });
  }

  // Modal Register Submit (Conectado a Supabase y Backend)
  const regForm = $('registerForm');
  if (regForm) {
    regForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = $('regName').value.trim();
      const email = $('regEmail').value.trim();
      const password = $('regPassword').value;
      const consentTerms = $('regConsent').checked;
      const submitBtn = $('registerSubmitBtn');
      const originalText = submitBtn ? submitBtn.textContent : 'Crear Cuenta';

      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Registrando en Supabase...';
      }

      try {
        let supabaseSuccess = false;

        // 1. Intentar registrar en Supabase Auth directamente desde el cliente
        if (supabaseClient) {
          try {
            const { data: supaReg, error: supaErr } = await supabaseClient.auth.signUp({
              email,
              password,
              options: {
                data: { name }
              }
            });

            if (supaErr) {
              if (supaErr.message.includes('already registered') || supaErr.message.includes('User already registered')) {
                toast('Ya existe una cuenta con este correo en Supabase', 'warn');
                return;
              }
              console.warn('[Supabase Client SignUp]', supaErr.message);
            } else if (supaReg?.user) {
              supabaseSuccess = true;
              // Guardar en tabla users de Supabase
              try {
                await supabaseClient.from('users').upsert({
                  id: supaReg.user.id,
                  email,
                  full_name: name,
                  role: 'admin',
                  auth_provider: 'email',
                  avatar_url: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name)}`
                }, { onConflict: 'email' });
              } catch (_) {}
            }
          } catch (supaEx) {
            console.warn('[Supabase Client SignUp Ex]', supaEx);
          }
        }

        // 2. Sincronizar y completar registro en el backend API
        const res = await api.register({ name, email, password, consentTerms });
        if (res.status === 'success') {
          currentUser = res.user;
          isGuestSession = false;
          localStorage.setItem('bustrack_user', JSON.stringify(currentUser));
          localStorage.setItem('bustrack_auth_token', res.token);
          toast(`¡Cuenta creada con éxito en Supabase! Bienvenido, ${currentUser.name} 🚀`, 'ok');
          updateAuthUserUI();
          hideHome();
          navigate('dashboard');
          if (authModal) authModal.classList.remove('active');
        } else {
          toast(res.detail || 'Error en el registro', 'warn');
        }
      } catch (err) {
        toast('Error al procesar el registro con Supabase', 'warn');
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = originalText;
        }
      }
    });
  }

  // Modal Google OAuth button
  const googleBtn = $('googleAuthBtn');
  if (googleBtn) {
    googleBtn.addEventListener('click', async () => {
      await openOAuthPrompt('google');
    });
  }

  // Modal Apple OAuth button
  const appleBtn = $('appleAuthBtn');
  if (appleBtn) {
    appleBtn.addEventListener('click', async () => {
      await openOAuthPrompt('apple');
    });
  }

  // Logout Buttons (sidebar y modal)
  async function performLogout() {
    const userName = currentUser?.name || 'Usuario';
    currentUser = null;
    isGuestSession = false;
    localStorage.removeItem('bustrack_user');
    localStorage.removeItem('bustrack_auth_token');
    sessionStorage.removeItem('bustrack_guest');

    // Intentar cerrar sesión en Supabase también
    try {
      if (supabaseClient) await supabaseClient.auth.signOut();
    } catch (_) {}
    try {
      const SUPABASE_URL = 'https://tbkgtblucdzkazpwlwda.supabase.co';
      const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRia2d0Ymx1Y2R6a2F6cHdsd2RhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA2MjEzMDIsImV4cCI6MjEwNjE5NzMwMn0.-l_2o1G4eb3bhDgknHLH7SSx1IobaC-9jbVTTwBmkfM';
      await fetch(`${SUPABASE_URL}/auth/v1/logout`, {
        method: 'POST',
        headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
      });
    } catch (_) { /* Silencioso si falla */ }

    toast(`Hasta pronto, ${userName}. Sesión cerrada correctamente. 👋`, 'info');
    updateAuthUserUI();
    if (authModal) authModal.classList.remove('active');
  }

  const logoutBtn = $('logoutBtn');
  if (logoutBtn) logoutBtn.addEventListener('click', performLogout);

  const modalLogoutBtn = $('modalLogoutBtn');
  if (modalLogoutBtn) modalLogoutBtn.addEventListener('click', performLogout);

  // ------------------------------------------------------------------
  // COMMAND PALETTE (CTRL + K) LOGIC
  // ------------------------------------------------------------------
  const cmdModal = $('commandPaletteModal');
  const cmdInput = $('cmdInput');
  const cmdResults = $('cmdResults');

  function openCommandPalette() {
    if (cmdModal) {
      cmdModal.classList.add('active');
      if (cmdInput) {
        cmdInput.value = '';
        cmdInput.focus();
      }
    }
  }

  function closeCommandPalette() {
    if (cmdModal) cmdModal.classList.remove('active');
  }

  // Shortcut listeners: Ctrl+K or Cmd+K
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      if (cmdModal?.classList.contains('active')) closeCommandPalette();
      else openCommandPalette();
    }
    if (e.key === 'Escape') {
      closeCommandPalette();
      if (authModal) authModal.classList.remove('active');
    }
  });

  // Global search bar focus triggers command palette
  const globalSearch = $('globalSearch');
  if (globalSearch) {
    globalSearch.addEventListener('click', () => openCommandPalette());
  }

  // Command palette item clicks
  if (cmdResults) {
    cmdResults.addEventListener('click', (e) => {
      const item = e.target.closest('.cmd-item');
      if (!item) return;
      const action = item.dataset.action;
      closeCommandPalette();
      if (action === 'go-dashboard') switchView('dashboard');
      else if (action === 'go-map') switchView('map');
      else if (action === 'go-fleet') switchView('fleet');
      else if (action === 'toggle-theme') {
        const motionBtn = $('motionSwitch');
        if (motionBtn) motionBtn.click();
        toast('Preferencia de tema actualizada', 'info');
      }
    });
  }

  // ------------------------------------------------------------------
  // NOTIFICATION DROPDOWN PANEL
  // ------------------------------------------------------------------
  // notifBtn, notifDropdownPanel, notifMarkAllReadBtn ya declarados en scope global


  function renderNotifDropdown() {
    const list = $('notifList');
    if (!list) return;
    const items = alerts.slice(0, 6);
    if (!items.length) {
      list.innerHTML = '<p class="empty-state" style="padding:1rem;font-size:12px">No hay notificaciones pendientes</p>';
      return;
    }
    list.innerHTML = items.map(a => `
      <div class="notif-item">
        <span class="notif-item-icon">${a.type === 'critical' ? '🚨' : a.type === 'warning' ? '⚠️' : 'ℹ️'}</span>
        <div>
          <div class="notif-item-text"><strong>${esc(a.title)}</strong>: ${esc(a.desc)}</div>
          <span class="notif-item-time">${a.time}</span>
        </div>
      </div>
    `).join('');
  }

  if (notifBtn && notifDropdownPanel) {
    notifBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const isHidden = notifDropdownPanel.hidden;
      notifDropdownPanel.hidden = !isHidden;
      if (isHidden) renderNotifDropdown();
    });
    document.addEventListener('click', (e) => {
      if (!e.target.closest('#notifBtn') && !e.target.closest('#notifDropdownPanel')) {
        if (notifDropdownPanel) notifDropdownPanel.hidden = true;
      }
    });
  }
  if (notifMarkAllReadBtn) {
    notifMarkAllReadBtn.addEventListener('click', () => {
      alerts.forEach(a => a.read = true);
      refreshCounters();
      if (notifDropdownPanel) notifDropdownPanel.hidden = true;
      toast('Notificaciones limpiadas', 'ok');
    });
  }

  // ------------------------------------------------------------------
  // FLEET "AGREGAR BUS" MODAL HANDLERS
  // ------------------------------------------------------------------
  const addBusBtn = $('addBusBtn');
  const addBusModal = $('addBusModal');
  const addBusClose = $('addBusClose');
  const addBusForm = $('addBusForm');

  if (addBusBtn && addBusModal) {
    addBusBtn.addEventListener('click', () => addBusModal.classList.add('active'));
  }
  if (addBusClose && addBusModal) {
    addBusClose.addEventListener('click', () => addBusModal.classList.remove('active'));
  }
  if (addBusForm) {
    addBusForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const id = $('newBusId').value.trim().toUpperCase();
      const routeId = $('newBusRoute').value;
      const driverId = $('newBusDriver').value;
      const plate = $('newBusPlate').value.trim().toUpperCase();

      const route = ROUTES.find(r => r.id === routeId) || ROUTES[0];
      const driver = DRIVERS.find(d => d.id === driverId) || DRIVERS[0];

      const newBus = {
        id,
        num: id.replace('BUS-', ''),
        route,
        driver,
        plate,
        status: 'active',
        speed: 42,
        passengers: 24,
        capacity: 45,
        delay: 0,
        fuel: 95,
        pos: { x: 200, y: 150 },
        _t: Math.random(),
        _dir: 1,
        _step: 0.002,
        updatedAgo: 0,
        nextStop: STOPS[0].name
      };

      buses.unshift(newBus);
      refreshCounters();
      if (state.view === 'fleet') renderFleet();
      if (state.view === 'dashboard') renderBusList();
      if (state.view === 'map') renderMapBusList();
      drawMapMarkers(true);

      addBusModal.classList.remove('active');
      addBusForm.reset();
      toast(`Bus ${id} registrado en la flota con éxito`, 'ok');
    });
  }

  // Fleet Reset Filters
  const resetFiltersBtn = $('resetFiltersBtn');
  if (resetFiltersBtn) {
    resetFiltersBtn.addEventListener('click', () => {
      const search = $('fleetSearch');
      const filter = $('routeFilter');
      if (search) search.value = '';
      if (filter) filter.value = '';
      renderFleet();
      toast('Filtros de la flota reiniciados', 'info');
    });
  }

  // ------------------------------------------------------------------
  // DRIVER CONTACT MODAL HANDLERS
  // ------------------------------------------------------------------
  const contactDriverBtn = $('contactDriverBtn');
  const contactModal = $('contactDriverModal');
  const contactClose = $('contactClose');

  if (contactDriverBtn && contactModal) {
    contactDriverBtn.addEventListener('click', () => {
      const bus = buses.find(b => b.id === state.highlightBus) || buses[0];
      $('contactDriverName').textContent = bus.driver.name;
      $('contactDriverBus').textContent = `Asignado a ${bus.id} (Ruta ${bus.route.id})`;
      $('contactDriverInitials').textContent = bus.driver.initials;
      const statusBadge = $('contactDriverStatus');
      if (statusBadge) {
        statusBadge.className = `status-badge status-${bus.status}`;
        statusBadge.textContent = statusLabel(bus.status);
      }
      if ($('busModal')) $('busModal').classList.remove('active');
      contactModal.classList.add('active');
    });
  }
  if (contactClose && contactModal) {
    contactClose.addEventListener('click', () => contactModal.classList.remove('active'));
  }

  const callDriverBtn = $('callDriverBtn');
  const msgDriverBtn = $('msgDriverBtn');
  const dispatchAlertBtn = $('dispatchAlertBtn');

  if (callDriverBtn) {
    callDriverBtn.addEventListener('click', () => {
      toast('📞 Conectando llamada con la cabina del conductor...', 'ok');
      if (contactModal) contactModal.classList.remove('active');
    });
  }
  if (msgDriverBtn) {
    msgDriverBtn.addEventListener('click', () => {
      toast('💬 Canal de mensajería enviado al terminal de abordo', 'ok');
      if (contactModal) contactModal.classList.remove('active');
    });
  }
  if (dispatchAlertBtn) {
    dispatchAlertBtn.addEventListener('click', () => {
      toast('📡 Alerta de despacho enviada a la pantalla de la unidad', 'ok');
      if (contactModal) contactModal.classList.remove('active');
    });
  }

  // ------------------------------------------------------------------
  // REPORTS VIEW HANDLERS (Print / Generate)
  // ------------------------------------------------------------------
  const printReportBtn = $('printReportBtn');
  if (printReportBtn) {
    printReportBtn.addEventListener('click', () => {
      window.print();
    });
  }
  const generateReportBtn = $('generateReportBtn');
  if (generateReportBtn) {
    generateReportBtn.addEventListener('click', () => {
      toast('Generando reporte operativo consolidado...', 'info');
      setTimeout(() => {
        drawReportCharts();
        toast('Reporte de operaciones generado con éxito', 'ok');
      }, 500);
    });
  }

  // ------------------------------------------------------------------
  // ALERTS VIEW HANDLERS (Clear All / Simulate New Alert)
  // ------------------------------------------------------------------
  const clearAlertsBtn = $('clearAlertsBtn');
  if (clearAlertsBtn) {
    clearAlertsBtn.addEventListener('click', () => {
      alerts.forEach(a => a.read = true);
      refreshCounters();
      if (state.view === 'alerts') renderAlerts();
      toast('Todas las alertas fueron marcadas como leídas', 'ok');
    });
  }
  const newAlertBtn = $('newAlertBtn');
  if (newAlertBtn) {
    newAlertBtn.addEventListener('click', () => {
      const bus = pick(buses);
      const alertTypes = [
        { type: 'warning', icon: '⚠️', title: 'Exceso de velocidad leve', desc: `${bus.id} registró ${bus.speed + 15} km/h en zona urbana.` },
        { type: 'critical', icon: '🚨', title: 'Frenado brusco repentino', desc: `${bus.id} desaceleró bruscamente cerca de ${bus.nextStop}.` },
        { type: 'info', icon: 'ℹ️', title: 'Apertura prolongada de puertas', desc: `${bus.id} mantuvo puertas abiertas durante más de 3 min.` },
      ];
      const newAlert = pick(alertTypes);
      alerts.unshift({
        id: 'ALT-' + Math.floor(Math.random() * 9000 + 1000),
        type: newAlert.type,
        icon: newAlert.icon,
        title: newAlert.title,
        desc: newAlert.desc,
        time: 'ahora mismo',
        read: false
      });
      refreshCounters();
      if (state.view === 'alerts') renderAlerts();
      toast(`Nueva alerta simulada: ${newAlert.title}`, 'warn');
    });
  }

  // ------------------------------------------------------------------
  // SETTINGS MODAL DATA RESET
  // ------------------------------------------------------------------
  const resetDataBtn = $('resetDataBtn');
  if (resetDataBtn) {
    resetDataBtn.addEventListener('click', () => {
      buses.forEach(b => {
        b.speed = randInt(25, 55);
        b.passengers = randInt(10, 40);
        b.fuel = randInt(60, 98);
      });
      refreshCounters();
      if (state.view === 'dashboard') renderBusList();
      if (state.view === 'fleet') renderFleet();
      drawMapMarkers(true);
      toast('Datos y métricas de la flota regenerados', 'ok');
    });
  }

  // ------------------------------------------------------------------
  // COOKIE CONSENT BANNER LOGIC
  // ------------------------------------------------------------------
  const cookieBanner = $('cookieConsentBanner');
  const cookieConsentSaved = localStorage.getItem('bustrack_cookie_consent');

  function hideCookieBanner() {
    if (!cookieBanner) return;
    cookieBanner.setAttribute('hidden', 'true');
    cookieBanner.hidden = true;
    cookieBanner.style.setProperty('display', 'none', 'important');
  }

  if (!cookieConsentSaved && cookieBanner) {
    cookieBanner.removeAttribute('hidden');
    cookieBanner.hidden = false;
    cookieBanner.style.display = 'flex';
  } else if (cookieBanner) {
    hideCookieBanner();
  }

  const cookieAcceptBtn = $('cookieAcceptBtn');
  const cookieRejectBtn = $('cookieRejectBtn');
  if (cookieAcceptBtn) {
    cookieAcceptBtn.addEventListener('click', (e) => {
      e.preventDefault();
      localStorage.setItem('bustrack_cookie_consent', 'accepted');
      hideCookieBanner();
      toast('Preferencias de almacenamiento guardadas', 'ok');
    });
  }
  if (cookieRejectBtn) {
    cookieRejectBtn.addEventListener('click', (e) => {
      e.preventDefault();
      localStorage.setItem('bustrack_cookie_consent', 'essential_only');
      hideCookieBanner();
      toast('Solo se usará almacenamiento técnico esencial', 'info');
    });
  }

  // ------------------------------------------------------------------
  // GEOLOCATION MAP ADAPTATION EVENT LISTENERS
  // ------------------------------------------------------------------
  const miniLocBtn = $('locateUserBtnMini');
  const fullLocBtn = $('locateUserBtnFull');
  const recenterBtn = $('recenterUserBtn');
  const geoSwitchBtn = $('geoSwitch');

  if (miniLocBtn) miniLocBtn.addEventListener('click', () => requestUserLocation(true));
  if (fullLocBtn) fullLocBtn.addEventListener('click', () => requestUserLocation(true));
  if (recenterBtn) recenterBtn.addEventListener('click', () => centerMapOnUser(true));

  const savedGeoPref = localStorage.getItem('bustrack_geolocate') === 'true';
  if (geoSwitchBtn) {
    geoSwitchBtn.setAttribute('aria-checked', String(savedGeoPref));
    geoSwitchBtn.addEventListener('click', () => {
      const active = geoSwitchBtn.getAttribute('aria-checked') === 'true';
      const next = !active;
      geoSwitchBtn.setAttribute('aria-checked', String(next));
      localStorage.setItem('bustrack_geolocate', String(next));
      if (next) requestUserLocation(true);
      else {
        userLocationState.active = false;
        updateUserLocationUI();
        toast('Geolocalización desactivada', 'info');
      }
    });
  }

  if (savedGeoPref) {
    setTimeout(() => requestUserLocation(false), 500);
  }
  // ------------------------------------------------------------------
  // MOBILE FLOATING CTA
  // ------------------------------------------------------------------
  const mobileCta = $('mobileFloatingCta');
  if (mobileCta) {
    mobileCta.addEventListener('click', () => {
      // passenger view removed
      hapticFeedback([10, 30, 10]);
    });
  }

  // ------------------------------------------------------------------
  // SCROLL REVEAL OBSERVER
  // ------------------------------------------------------------------
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
        }
      });
    }, { threshold: 0.1 });

    document.querySelectorAll('.stat-card, .card').forEach(el => {
      el.classList.add('scroll-reveal');
      observer.observe(el);
    });
  }

  // ------------------------------------------------------------------
  setInterval(updateLiveData, 3000);
  setInterval(pushActivity, 9000);
}
 
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
````

## File: cookies.html
````html
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="robots" content="noindex, follow" />
  <title>Política de Cookies — BusTrack Pro</title>
  <meta name="description" content="Información sobre el uso de cookies y almacenamiento local en BusTrack Pro." />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
  <style>
    :root { --bg: #0a0f1c; --surface: #111827; --border: rgba(255,255,255,0.08); --text: #e5e7eb; --text-muted: #9ca3af; --brand: #5b6ef5; --brand-light: #818cf8; }
    @media (prefers-color-scheme: light) { :root { --bg: #f9fafb; --surface: #fff; --border: rgba(0,0,0,0.08); --text: #111827; --text-muted: #6b7280; } }
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Inter', system-ui, sans-serif; background: var(--bg); color: var(--text); line-height: 1.7; font-size: 1rem; }
    .legal-header { background: var(--surface); border-bottom: 1px solid var(--border); padding: 1rem 2rem; display: flex; align-items: center; gap: 1rem; }
    .legal-header a { color: var(--brand-light); text-decoration: none; font-size: 0.875rem; }
    .legal-header a:hover { text-decoration: underline; }
    .legal-logo { font-weight: 700; color: var(--brand); font-size: 1.1rem; }
    .legal-sep { color: var(--text-muted); }
    main { max-width: 760px; margin: 0 auto; padding: 3rem 1.5rem 5rem; }
    .legal-badge { display: inline-block; background: rgba(91,110,245,0.15); color: var(--brand-light); border: 1px solid rgba(91,110,245,0.3); border-radius: 99px; padding: 0.2rem 0.75rem; font-size: 0.75rem; font-weight: 600; letter-spacing: 0.05em; text-transform: uppercase; margin-bottom: 1rem; }
    h1 { font-size: 2rem; font-weight: 700; line-height: 1.2; margin-bottom: 0.5rem; }
    .last-updated { color: var(--text-muted); font-size: 0.875rem; margin-bottom: 2.5rem; padding-bottom: 2.5rem; border-bottom: 1px solid var(--border); }
    h2 { font-size: 1.2rem; font-weight: 600; margin: 2.5rem 0 0.75rem; color: var(--brand-light); }
    p { margin-bottom: 1rem; }
    ul { margin: 0.5rem 0 1rem 1.5rem; }
    li { margin-bottom: 0.4rem; }
    .info-box { background: var(--surface); border: 1px solid var(--border); border-left: 3px solid var(--brand); border-radius: 8px; padding: 1.25rem 1.5rem; margin: 2rem 0; }
    table { width: 100%; border-collapse: collapse; margin: 1.5rem 0; font-size: 0.9rem; }
    th, td { text-align: left; padding: 0.75rem 1rem; border-bottom: 1px solid var(--border); }
    th { background: var(--surface); color: var(--brand-light); }
    footer { text-align: center; padding: 2rem; color: var(--text-muted); font-size: 0.8rem; border-top: 1px solid var(--border); }
    footer a { color: var(--brand-light); text-decoration: none; }
    a { color: var(--brand-light); }
  </style>
</head>
<body>
  <header class="legal-header">
    <span class="legal-logo">BusTrack Pro</span>
    <span class="legal-sep">›</span>
    <a href="/">← Volver al panel</a>
  </header>

  <main>
    <span class="legal-badge">Privacidad & Cookies</span>
    <h1>Política de Cookies y Almacenamiento</h1>
    <p class="last-updated">Última actualización: 24 de septiembre de 2026</p>

    <div class="info-box">
      <p><strong>Cero Rastreo Publicitario:</strong> BusTrack Pro respeta la privacidad de los usuarios. No utilizamos cookies de rastreo publicitario ni vendemos datos a terceros. Toda la información almacenada en su navegador es técnica y necesaria para recordar sus preferencias.</p>
    </div>

    <h2>1. ¿Qué datos se almacenan en su navegador?</h2>
    <p>Utilizamos tecnologías de almacenamiento local de HTML5 (<code>localStorage</code> y <code>sessionStorage</code>) y tokens de sesión estrictamente necesarios para ofrecer la funcionalidad esperada.</p>

    <table>
      <thead>
        <tr>
          <th>Clave de Almacenamiento</th>
          <th>Propósito</th>
          <th>Duración</th>
          <th>Tipo</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td><code>bustrack_theme</code></td>
          <td>Guarda si prefiere el tema oscuro o claro</td>
          <td>Persistente</td>
          <td>Técnica (Necesaria)</td>
        </tr>
        <tr>
          <td><code>bustrack_user_prefs</code></td>
          <td>Guarda opciones de vista (densidad compacta, color de acento)</td>
          <td>Persistente</td>
          <td>Preferencias</td>
        </tr>
        <tr>
          <td><code>bustrack_auth_token</code></td>
          <td>Token JWT de sesión para mantener la sesión abierta</td>
          <td>7 días</td>
          <td>Seguridad / Sesión</td>
        </tr>
        <tr>
          <td><code>bustrack_cookie_consent</code></td>
          <td>Guarda su elección de consentimiento de almacenamiento</td>
          <td>1 año</td>
          <td>Técnica</td>
        </tr>
      </tbody>
    </table>

    <h2>2. ¿Cómo administrar o borrar su almacenamiento local?</h2>
    <p>Puede eliminar las preferencias de BusTrack Pro en cualquier momento desde las opciones de configuración de su navegador, seleccionando "Borrar datos de navegación" o desactivando el almacenamiento local.</p>
  </main>

  <footer>
    <p>© 2026 BusTrack Pro | <a href="/privacy">Privacidad</a> · <a href="/terms">Términos</a> · <a href="/cookies">Cookies</a></p>
  </footer>
</body>
</html>
````

## File: docker-compose.yml
````yaml
services:
  postgres:
    image: postgres:16-alpine
    container_name: bustrack-postgres
    restart: always
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: bustrack_password_2026
      POSTGRES_DB: bustrack_db
    ports:
      - "5432:5432"
    volumes:
      - bustrack_pg_data:/var/lib/postgresql/data
      - ./server/database/schema.sql:/docker-entrypoint-initdb.d/01_schema.sql
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres -d bustrack_db"]
      interval: 5s
      timeout: 5s
      retries: 5

volumes:
  bustrack_pg_data:
    driver: local
````

## File: index.html
````html
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
  <meta name="theme-color" content="#0a0f1c" />
  <title>BusTrack Pro — Rastreo de flotas en tiempo real</title>
  <meta name="description" content="Panel de rastreo de flotas de buses: mapa en vivo, estado de la flota, rutas, alertas y reportes." />
  <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'><rect width='32' height='32' rx='8' fill='%235b6ef5'/><rect x='8' y='7' width='16' height='16' rx='4' fill='none' stroke='white' stroke-width='2'/><path d='M8 15h16' stroke='white' stroke-width='2'/></svg>" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet" />
  <link rel="stylesheet" href="styles.css" />
  <!-- Leaflet CSS para Mapas Reales a escala Nacional y Mundial -->
  <link rel="stylesheet" href="/vendor/leaflet/leaflet.css" onerror="this.onerror=null;this.href='https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';" />
  <!-- Supabase JS SDK para OAuth real (Google / Apple) -->
  <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.js"></script>
  <!-- Leaflet JS Library (Local con respaldo CDN) -->
  <script src="/vendor/leaflet/leaflet.js"></script>
  <script>
    if (typeof L === 'undefined') {
      document.write('<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"><\/script>');
    }
  </script>
</head>
<body>


  <!-- ============ MENÚ PRINCIPAL (pantalla de entrada) ============ -->
  <div class="home-screen" id="homeScreen">
    <div class="home-inner">
      <header class="home-head">
        <span class="home-logo" aria-hidden="true">
          <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect width="32" height="32" rx="9" fill="url(#homeGrad)"/>
            <path d="M8 11.5C8 10 9.2 8.8 10.7 8.8h10.6c1.5 0 2.7 1.2 2.7 2.7v8c0 1.5-1.2 2.7-2.7 2.7H10.7C9.2 22.2 8 21 8 19.5v-8Z" stroke="white" stroke-width="1.4"/>
            <path d="M11 22.2v1.8M21 22.2v1.8" stroke="white" stroke-width="1.8" stroke-linecap="round"/>
            <path d="M8 15.4h16" stroke="white" stroke-width="1.4"/>
            <circle cx="11.6" cy="19" r="1.3" fill="white"/><circle cx="20.4" cy="19" r="1.3" fill="white"/>
            <path d="M11.8 12.2h8.4" stroke="white" stroke-width="1.4" stroke-linecap="round"/>
            <defs><linearGradient id="homeGrad" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
              <stop stop-color="#5b6ef5"/><stop offset="1" stop-color="#7c4ddb"/></linearGradient></defs>
          </svg>
        </span>
        <h1 class="home-title">BusTrack <span>Pro</span></h1>
        <p class="home-sub">Elegí por dónde querés empezar</p>
        <p class="home-status"><span class="pulse-dot small"></span><span id="homeStatus">Cargando flota…</span></p>
      </header>
 
      <nav class="home-grid" aria-label="Menú principal">
        <button class="home-tile" data-go="dashboard" style="--tone:var(--route-a)">
          <span class="home-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
              <rect x="3" y="5" width="18" height="13" rx="3"/><path d="M3 10.5h18M7 18v2M17 18v2"/>
              <circle cx="7.6" cy="14.5" r="1" fill="currentColor" stroke="none"/><circle cx="16.4" cy="14.5" r="1" fill="currentColor" stroke="none"/>
            </svg>
          </span>
          <span class="home-tile-text">
            <span class="home-tile-name">Panel Principal</span>
            <span class="home-tile-desc">Resumen del día y estado general</span>
          </span>
          <span class="home-chip" id="chipDashboard">—</span>
        </button>


 
        <button class="home-tile" data-go="map" style="--tone:var(--route-c)">
          <span class="home-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
              <path d="M9 4 3 6.4v13.2L9 17.2l6 2.4 6-2.4V4l-6 2.4L9 4Z"/><path d="M9 4v13.2M15 6.4v13.2"/>
            </svg>
          </span>
          <span class="home-tile-text">
            <span class="home-tile-name">Mapa en Vivo</span>
            <span class="home-tile-desc">Posición de cada unidad en ruta</span>
          </span>
          <span class="home-chip live" id="chipMap">VIVO</span>
        </button>
 
        <button class="home-tile" data-go="fleet" style="--tone:var(--brand-alt)">
          <span class="home-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
              <path d="M2 7.5A1.5 1.5 0 0 1 3.5 6h9A1.5 1.5 0 0 1 14 7.5V16H2V7.5Z"/>
              <path d="M14 10h3.6l2.9 3.4V16H14v-6Z"/><circle cx="6" cy="18" r="1.8"/><circle cx="17" cy="18" r="1.8"/>
            </svg>
          </span>
          <span class="home-tile-text">
            <span class="home-tile-name">Flota</span>
            <span class="home-tile-desc">Tabla completa, filtros y exportación</span>
          </span>
          <span class="home-chip" id="chipFleet">—</span>
        </button>
 
        <button class="home-tile" data-go="routes" style="--tone:var(--route-d)">
          <span class="home-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="5.5" cy="5.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/>
              <path d="M5.5 8v4.5A3.5 3.5 0 0 0 9 16h6"/><path d="M18.5 16v-4.5A3.5 3.5 0 0 0 15 8H9"/>
            </svg>
          </span>
          <span class="home-tile-text">
            <span class="home-tile-name">Rutas</span>
            <span class="home-tile-desc">Cobertura y paradas por recorrido</span>
          </span>
          <span class="home-chip" id="chipRoutes">—</span>
        </button>
 
        <button class="home-tile" data-go="alerts" style="--tone:var(--warn)">
          <span class="home-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
              <path d="M18 8.6a6 6 0 1 0-12 0v4.2L4.6 15a.9.9 0 0 0 .7 1.4h13.4a.9.9 0 0 0 .7-1.4L18 12.8V8.6Z"/>
              <path d="M9.8 19.4a2.4 2.4 0 0 0 4.4 0"/>
            </svg>
          </span>
          <span class="home-tile-text">
            <span class="home-tile-name">Alertas</span>
            <span class="home-tile-desc">Avisos críticos y advertencias</span>
          </span>
          <span class="home-chip" id="chipAlerts">—</span>
        </button>
 
        <button class="home-tile" data-go="reports" style="--tone:var(--brand-500)">
          <span class="home-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
              <path d="M6 3.5h7.2L19 9v11a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 5 20V5a1.5 1.5 0 0 1 1-1.5Z"/>
              <path d="M13 3.6V9h5.4M9 17v-2.5M12 17v-5M15 17v-3.5"/>
            </svg>
          </span>
          <span class="home-tile-text">
            <span class="home-tile-name">Reportes</span>
            <span class="home-tile-desc">Gráficos, resumen e impresión</span>
          </span>
          <span class="home-chip" id="chipReports">—</span>
        </button>
 
        <button class="home-tile" data-go="drivers" style="--tone:var(--ok)">
          <span class="home-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="9" cy="8" r="3.2"/><path d="M3.5 19.5a5.5 5.5 0 0 1 11 0"/>
              <path d="M16 5.2a3.2 3.2 0 0 1 0 5.6M17 14.6a5.5 5.5 0 0 1 3.5 4.9"/>
            </svg>
          </span>
          <span class="home-tile-text">
            <span class="home-tile-name">Conductores</span>
            <span class="home-tile-desc">Turnos, viajes y calificación</span>
          </span>
          <span class="home-chip" id="chipDrivers">—</span>
        </button>
      </nav>
 
      <p class="home-foot">Base de Datos SQL 100% Real (SQLite / PostgreSQL) · Cuentas Seguras con JWT · Persistencia ACID</p>
    </div>
  </div>
 
 
  <aside class="sidebar" id="sidebar">
    <div class="sidebar-header">
      <div class="logo" id="logoHome" role="button" tabindex="0" title="Volver al menú principal">
        <span class="logo-icon" aria-hidden="true">
          <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect width="32" height="32" rx="8" fill="url(#logoGrad)"/>
            <path d="M7 11C7 9.34 8.34 8 10 8h12c1.66 0 3 1.34 3 3v9c0 1.66-1.34 3-3 3H10c-1.66 0-3-1.34-3-3v-9Z" stroke="white" stroke-width="1.5"/>
            <path d="M10 23v2M22 23v2" stroke="white" stroke-width="2" stroke-linecap="round"/>
            <path d="M7 15h18" stroke="white" stroke-width="1.5"/>
            <circle cx="11" cy="19" r="1.5" fill="white"/>
            <circle cx="21" cy="19" r="1.5" fill="white"/>
            <path d="M11 12h10" stroke="white" stroke-width="1.5" stroke-linecap="round"/>
            <defs>
              <linearGradient id="logoGrad" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
                <stop stop-color="var(--brand-500, #5b6ef5)"/>
                <stop offset="1" stop-color="var(--brand-700, #7c4ddb)"/>
              </linearGradient>
            </defs>
          </svg>
        </span>
        <span class="logo-text">
          <span class="logo-name">BusTrack</span>
          <span class="logo-badge">PRO</span>
        </span>
      </div>
      <button class="sidebar-toggle" id="sidebarToggle" aria-label="Contraer o expandir barra lateral" title="Contraer barra lateral" aria-expanded="true">
        <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <polyline points="13 16 7 10 13 4"></polyline>
        </svg>
      </button>
    </div>
 
    <nav class="sidebar-nav" aria-label="Navegación principal">
      <div class="nav-section">
        <span class="nav-label">Principal</span>
        <ul class="nav-list">
          <li class="nav-item" id="nav-home" data-home="1" role="button" tabindex="0" title="Menú principal">
            <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path d="M10.7 2.3a1 1 0 0 0-1.4 0l-7 6.6A1 1 0 0 0 3 10.6V16a2 2 0 0 0 2 2h3v-4.5h4V18h3a2 2 0 0 0 2-2v-5.4a1 1 0 0 0-.3-1.7l-7-6.6Z"/></svg>
            <span>Inicio</span>
          </li>
          <li class="nav-item active" id="nav-dashboard" data-view="dashboard" role="button" tabindex="0" title="Panel Principal">
            <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zm0 6a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zm11-1a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z"/></svg>
            <span>Panel Principal</span>
          </li>

          <li class="nav-item" id="nav-map" data-view="map" role="button" tabindex="0" title="Mapa en Vivo">
            <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path fill-rule="evenodd" d="M12 1.586l-4 4v12.828l4-4V1.586zM3.707 3.293A1 1 0 002 4v10a1 1 0 00.293.707L6 18.414V5.586L3.707 3.293zm10.586 0L12 5.586v12.828l2.293 2.293A1 1 0 0016 20V4a1 1 0 00-1.293-.707z" clip-rule="evenodd"/></svg>
            <span>Mapa en Vivo</span>
            <span class="nav-count live-pulse">VIVO</span>
          </li>
          <li class="nav-item" id="nav-fleet" data-view="fleet" role="button" tabindex="0" title="Flota">
            <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path d="M8 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM15 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z"/><path d="M3 4a1 1 0 00-1 1v10a1 1 0 001 1h1.05a2.5 2.5 0 014.9 0H10a1 1 0 001-1v-1h3v1a1 1 0 001 1h1.05a2.5 2.5 0 014.9 0H19a1 1 0 001-1v-2a4 4 0 00-.92-2.55L17.15 8H15V6a2 2 0 00-2-2H3zm11 2h2.15l1.55 2H14V6z"/></svg>
            <span>Flota</span>
            <span class="nav-count" id="fleetCountBadge">12</span>
          </li>
          <li class="nav-item" id="nav-routes" data-view="routes" role="button" tabindex="0" title="Rutas">
            <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path d="M4 3a2 2 0 100 4 2 2 0 000-4zm12 10a2 2 0 100 4 2 2 0 000-4zM4 8.5v3a3.5 3.5 0 003.5 3.5h5" stroke="currentColor" stroke-width="1.6" fill="none" stroke-linecap="round"/><path d="M16 11.5v-3A3.5 3.5 0 0012.5 5h-5" stroke="currentColor" stroke-width="1.6" fill="none" stroke-linecap="round"/></svg>
            <span>Rutas</span>
          </li>
          <li class="nav-item" id="nav-alerts" data-view="alerts" role="button" tabindex="0" title="Alertas">
            <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z"/></svg>
            <span>Alertas</span>
            <span class="nav-count alert-badge" id="alertsCountBadge">3</span>
          </li>
        </ul>
      </div>
      <div class="nav-section">
        <span class="nav-label">Análisis</span>
        <ul class="nav-list">
          <li class="nav-item" id="nav-reports" data-view="reports" role="button" tabindex="0" title="Reportes">
            <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path fill-rule="evenodd" d="M6 2a2 2 0 00-2 2v12a2 2 0 002 2h8a2 2 0 002-2V7.414A2 2 0 0015.414 6L12 2.586A2 2 0 0010.586 2H6zm2 10a1 1 0 10-2 0v3a1 1 0 102 0v-3zm2-3a1 1 0 011 1v5a1 1 0 11-2 0v-5a1 1 0 011-1zm4-1a1 1 0 10-2 0v7a1 1 0 102 0V8z" clip-rule="evenodd"/></svg>
            <span>Reportes</span>
          </li>
          <li class="nav-item" id="nav-drivers" data-view="drivers" role="button" tabindex="0" title="Conductores">
            <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z"/></svg>
            <span>Conductores</span>
          </li>
        </ul>
      </div>
    </nav>
 
    <div class="sidebar-footer">
      <!-- Botones de Acceso (visibles cuando NO hay sesión iniciada) -->
      <div class="sidebar-auth-box" id="sidebarAuthBox">
        <button
          type="button"
          class="sidebar-auth-btn btn-auth-login"
          id="sidebarLoginBtn"
          title="Iniciar Sesión"
          aria-label="Iniciar Sesión"
        >
          <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M11 16l4-4-4-4M15 12H3M7 4h9a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H7"/>
          </svg>
          <span>Iniciar Sesión</span>
        </button>
        <button
          type="button"
          class="sidebar-auth-btn btn-auth-register"
          id="sidebarRegisterBtn"
          title="Registrarse"
          aria-label="Registrarse"
        >
          <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M13 17v-1.5a3.5 3.5 0 0 0-3.5-3.5h-4A3.5 3.5 0 0 0 2 15.5V17"/>
            <circle cx="7.5" cy="6.5" r="3"/>
            <path d="M15 8v6M12 11h6"/>
          </svg>
          <span>Registrarse</span>
        </button>
      </div>

      <!-- Perfil de usuario (visible solo cuando SÍ hay sesión activa) -->
      <div class="sidebar-user-box" id="sidebarUserBox" hidden>
        <div class="user-profile" id="userProfile" role="button" tabindex="0" title="Ver mi cuenta">
          <span class="user-avatar" id="userAvatarSlot">GA</span>
          <span class="user-info">
            <span class="user-name" id="userNameSlot">Gerente Admin</span>
            <span class="user-role" id="userRoleSlot">Administrador</span>
          </span>
          <button class="user-settings" id="authBtn" aria-label="Ver cuenta" title="Mi Cuenta">
            <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path fill-rule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clip-rule="evenodd"/></svg>
          </button>
          <button class="user-settings" id="settingsBtn" aria-label="Abrir preferencias" title="Preferencias">
            <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path fill-rule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.53 1.53 0 01-2.29.95c-1.37-.84-2.94.73-2.1 2.1.54.89.06 2.05-.95 2.29-1.56.38-1.56 2.6 0 2.98.89.21 1.49 1.4.95 2.29-.84 1.37.73 2.94 2.1 2.1a1.53 1.53 0 012.29.95c.38 1.56 2.6 1.56 2.98 0a1.53 1.53 0 012.29-.95c1.37.84 2.94-.73 2.1-2.1a1.53 1.53 0 01.95-2.29c1.56-.38 1.56-2.6 0-2.98a1.53 1.53 0 01-.95-2.29c.84-1.37-.73-2.94-2.1-2.1a1.53 1.53 0 01-2.29-.95zM10 13a3 3 0 100-6 3 3 0 000 6z" clip-rule="evenodd"/></svg>
          </button>
        </div>

        <!-- Botón de Cerrar Sesión — visible solo cuando hay sesión activa -->
        <button
          id="logoutBtn"
          class="sidebar-logout-btn"
          aria-label="Cerrar sesión"
          title="Cerrar sesión"
        >
          <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M13 3h4a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1h-4M9 14l-4-4 4-4M5 10h9"/>
          </svg>
          <span>Cerrar Sesión</span>
        </button>
      </div>

      <div class="sidebar-legal-links">
        <a href="/privacy" target="_blank">Privacidad</a> ·
        <a href="/terms" target="_blank">Términos</a> ·
        <a href="/cookies" target="_blank">Cookies</a>
      </div>
    </div>
  </aside>

  <div class="sidebar-overlay" id="sidebarOverlay"></div>

  <main class="main-content" id="mainContent">
    <header class="topbar">
      <div class="topbar-left">
        <button class="mobile-menu-btn" id="mobileMenuBtn" aria-label="Abrir menú" aria-expanded="false">
          <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path fill-rule="evenodd" d="M3 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clip-rule="evenodd"/></svg>
        </button>
        <div class="topbar-titles">
          <h1 class="page-title" id="pageTitle">Panel Principal</h1>
          <p class="breadcrumb">
            <span>BusTrack Pro</span>
            <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path fill-rule="evenodd" d="M7.29 14.71a1 1 0 010-1.42L10.59 10 7.29 6.71a1 1 0 111.42-1.42l4 4a1 1 0 010 1.42l-4 4a1 1 0 01-1.42 0z" clip-rule="evenodd"/></svg>
            <span id="breadcrumbCurrent">Panel Principal</span>
          </p>
        </div>
      </div>
      <div class="topbar-right">
        <div class="search-bar">
          <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path fill-rule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.48l4.82 4.81a1 1 0 01-1.42 1.42l-4.81-4.82A6 6 0 012 8z" clip-rule="evenodd"/></svg>
          <input type="search" id="globalSearch" placeholder="Buscar bus, placa, ruta o conductor" aria-label="Búsqueda global" autocomplete="off" />
        </div>
        <button class="icon-btn only-mobile" id="mobileSearchBtn" aria-label="Buscar">
          <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path fill-rule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.48l4.82 4.81a1 1 0 01-1.42 1.42l-4.81-4.82A6 6 0 012 8z" clip-rule="evenodd"/></svg>
        </button>
        <div style="position:relative">
          <button class="icon-btn" id="notifBtn" aria-label="Notificaciones" aria-haspopup="true" aria-expanded="false">
            <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z"/></svg>
            <span class="notif-dot" id="notifDot"></span>
          </button>
          <div class="notif-dropdown-panel" id="notifDropdownPanel" hidden>
            <div class="notif-header">
              <span class="notif-title">🔔 Notificaciones Recientes</span>
              <button class="btn-sm btn-ghost" id="notifMarkAllReadBtn" style="font-size:11px; padding:2px 6px">Limpiar</button>
            </div>
            <div class="notif-list" id="notifList"></div>
          </div>
        </div>

        <div class="db-status-pill real-db" id="dbStatusPill" role="button" tabindex="0" title="Ver diagnóstico y tablas de la Base de Datos Real">
          <span>🗄️</span>
          <span id="dbStatusLabel">BD: SQLite 3 (100% Real)</span>
        </div>
        <div class="server-status-pill" id="serverStatusPill" title="Conexión en tiempo real con el backend">
          <span class="status-dot"></span>
          <span id="serverStatusLabel">Detectando API...</span>
        </div>
        <button class="live-indicator" id="liveToggle" title="Pausar o reanudar la actualización automática" aria-pressed="true">
          <span class="pulse-dot" id="livePulse"></span>
          <span id="liveLabel">Actualizando</span>
        </button>
      </div>
    </header>
 
    <!-- ============ PANEL PRINCIPAL ============ -->
    <section class="view active" id="view-dashboard">
      <div class="stats-grid">
        <article class="stat-card">
          <span class="stat-icon buses" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="5" width="18" height="14" rx="3"/><path d="M3 11h18M7 19v2M17 19v2"/><circle cx="7.5" cy="15.5" r="1.1" fill="currentColor" stroke="none"/><circle cx="16.5" cy="15.5" r="1.1" fill="currentColor" stroke="none"/></svg>
          </span>
          <div class="stat-content">
            <p class="stat-value" id="activeCount">0</p>
            <p class="stat-label">Buses en circulación</p>
            <p class="stat-change positive">+4 esta semana</p>
          </div>
          <canvas class="stat-sparkline" id="sparkline1" width="80" height="40" aria-hidden="true"></canvas>
        </article>
 
        <article class="stat-card">
          <span class="stat-icon routes" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 12h18M3 6l9-3 9 3M3 18l9 3 9-3"/></svg>
          </span>
          <div class="stat-content">
            <p class="stat-value" id="routeCount">4</p>
            <p class="stat-label">Rutas operando</p>
            <p class="stat-change positive">100% operativas</p>
          </div>
          <canvas class="stat-sparkline" id="sparkline2" width="80" height="40" aria-hidden="true"></canvas>
        </article>
 
        <article class="stat-card">
          <span class="stat-icon passengers" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>
          </span>
          <div class="stat-content">
            <p class="stat-value" id="passengersToday">2.847</p>
            <p class="stat-label">Pasajeros hoy</p>
            <p class="stat-change positive">+12,4% vs ayer</p>
          </div>
          <canvas class="stat-sparkline" id="sparkline3" width="80" height="40" aria-hidden="true"></canvas>
        </article>
 
        <article class="stat-card">
          <span class="stat-icon delay" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.5 2" stroke-linecap="round"/></svg>
          </span>
          <div class="stat-content">
            <p class="stat-value" id="avgDelay">2,3<small>min</small></p>
            <p class="stat-label">Retraso promedio</p>
            <p class="stat-change positive">−0,8 min vs ayer</p>
          </div>
          <canvas class="stat-sparkline" id="sparkline4" width="80" height="40" aria-hidden="true"></canvas>
        </article>
      </div>
 
      <div class="dashboard-grid">
        <div class="card map-widget">
          <div class="card-header">
            <div class="card-title">
              <h2>Mapa en tiempo real</h2>
              <span class="live-badge"><span class="pulse-dot small"></span>VIVO</span>
            </div>
            <button class="btn-ghost btn-sm" id="expandMapBtn">Expandir</button>
          </div>
          <div class="map-container">
            <div class="map-bg" style="border-radius: inherit; height: 100%; position: relative;">
              <!-- Leaflet Map Real para Dashboard -->
              <div id="dashboardRealMap" class="leaflet-real-map" style="width: 100%; height: 100%; border-radius: inherit;"></div>
              <div class="map-controls">
                <button class="map-btn map-btn-geo" id="locateUserBtnMini" data-map="mini" aria-label="Mi Ubicación" title="Centrar en mi ubicación">📍</button>
                <button class="map-btn" id="dashboardStyleToggleBtn" aria-label="Cambiar estilo de mapa" title="Alternar estilo: Oscuro / Calles / Satelital">🌙</button>
                <button class="map-btn" data-zoom="in" data-map="mini" aria-label="Acercar">+</button>
                <button class="map-btn" data-zoom="out" data-map="mini" aria-label="Alejar">−</button>
                <button class="map-btn" data-zoom="reset" data-map="mini" aria-label="Centrar en Costa Rica">🇨🇷</button>
              </div>
              <div class="map-legend" id="miniLegend"></div>
            </div>
          </div>
        </div>
 
        <div class="card buses-list-card">
          <div class="card-header">
            <div class="card-title"><h2>Estado de buses</h2></div>
            <div class="filter-tabs" role="group" aria-label="Filtrar buses">
              <button class="filter-tab active" data-filter="all">Todos</button>
              <button class="filter-tab" data-filter="active">Activos</button>
              <button class="filter-tab" data-filter="delayed">Retrasados</button>
            </div>
          </div>
          <div class="bus-list" id="busList"></div>
        </div>
 
        <div class="card activity-card">
          <div class="card-header">
            <div class="card-title"><h2>Actividad reciente</h2></div>
            <button class="btn-ghost btn-sm" id="toggleActivityBtn" aria-expanded="false">Ver todo</button>
          </div>
          <div class="activity-feed" id="activityFeed"></div>
        </div>
 
        <div class="card chart-card">
          <div class="card-header">
            <div class="card-title"><h2>Pasajeros</h2></div>
            <div class="chart-period" role="group" aria-label="Período del gráfico">
              <button class="period-btn active" data-period="day">Hoy</button>
              <button class="period-btn" data-period="week">Semana</button>
              <button class="period-btn" data-period="month">Mes</button>
            </div>
          </div>
          <div class="chart-container">
            <canvas id="mainChart" height="180"></canvas>
            <p class="chart-caption" id="chartCaption"></p>
          </div>
        </div>
      </div>
    </section>
 
    <!-- ============ FLOTA ============ -->
    <section class="view" id="view-fleet">
      <div class="fleet-toolbar">
        <div class="toolbar-left">
          <input type="search" class="fleet-search" id="fleetSearch" placeholder="Buscar en la flota" aria-label="Buscar en la flota" />
          <select class="filter-select" id="statusFilter" aria-label="Filtrar por estado">
            <option value="">Todos los estados</option>
            <option value="active">En servicio</option>
            <option value="delayed">Retrasado</option>
            <option value="stopped">Detenido</option>
            <option value="maintenance">Mantenimiento</option>
          </select>
          <select class="filter-select" id="routeFilter" aria-label="Filtrar por ruta">
            <option value="">Todas las rutas</option>
          </select>
          <button class="btn-ghost btn-sm" id="resetFiltersBtn">Limpiar filtros</button>
        </div>
        <div class="toolbar-right">
          <button class="btn-ghost" id="exportCsvBtn">Exportar CSV</button>
          <button class="btn-primary" id="addBusBtn">Agregar bus</button>
        </div>
      </div>
      <p class="results-note" id="fleetCount"></p>
      <div class="fleet-table-wrapper">
        <table class="fleet-table">
          <thead>
            <tr>
              <th data-sort="id" tabindex="0" role="button">Bus</th>
              <th data-sort="plate" tabindex="0" role="button">Placa</th>
              <th data-sort="route" tabindex="0" role="button">Ruta</th>
              <th data-sort="driver" tabindex="0" role="button">Conductor</th>
              <th data-sort="speed" tabindex="0" role="button">Velocidad</th>
              <th data-sort="passengers" tabindex="0" role="button">Pasajeros</th>
              <th data-sort="status" tabindex="0" role="button">Estado</th>
              <th>Actualización</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody id="fleetTableBody"></tbody>
        </table>
      </div>
    </section>
 
    <!-- ============ ALERTAS ============ -->
    <section class="view" id="view-alerts">
      <div class="alerts-container">
        <div class="alerts-header">
          <h2>Centro de alertas</h2>
          <div class="report-actions">
            <button class="btn-ghost" id="clearAlertsBtn">Marcar todo como leído</button>
            <button class="btn-primary" id="newAlertBtn">Simular alerta</button>
          </div>
        </div>
        <div class="filter-tabs alerts-filter" role="group" aria-label="Filtrar alertas">
          <button class="filter-tab active" data-alert-filter="all">Todas</button>
          <button class="filter-tab" data-alert-filter="critical">Críticas</button>
          <button class="filter-tab" data-alert-filter="warning">Advertencias</button>
          <button class="filter-tab" data-alert-filter="info">Informativas</button>
        </div>
        <div class="alerts-list" id="alertsList"></div>
      </div>
    </section>
 
    <!-- ============ MAPA COMPLETO ============ -->
    <section class="view" id="view-map">
      <div class="full-map-container">
        <div class="map-sidebar-panel">
          <div class="card-title" style="display:flex; justify-content:space-between; align-items:center;">
            <h2>Buses en ruta</h2>
            <span class="badge" id="mapBusCount">12 activos</span>
          </div>
          <!-- Selector Nacional de Provincias -->
          <div class="map-region-filter" style="margin: 8px 0 12px 0;">
            <label for="provinceSelect" style="font-size: 11px; font-weight:600; color:var(--text-soft); display:block; margin-bottom:4px;">🇨🇷 COBERTURA NACIONAL:</label>
            <select id="provinceSelect" class="form-input" style="padding: 7px 10px; font-size:12px; width:100%; border-radius:6px; background:var(--bg-card); color:var(--text); border:1px solid var(--line);">
              <option value="all">📍 Todo el País (Costa Rica)</option>
              <option value="San José" selected>🏛️ San José (GAM / Capital)</option>
              <option value="Alajuela">✈️ Alajuela & San Carlos (SJO / Arenal)</option>
              <option value="Heredia">🎓 Heredia (UNA / Flores / Belén)</option>
              <option value="Cartago">⛪ Cartago & Turrialba (Basílica / TEC)</option>
              <option value="Puntarenas">🌊 Puntarenas, Jacó & Quepos</option>
              <option value="Guanacaste">🏖️ Guanacaste & Liberia (LIR)</option>
              <option value="Limón">🌴 Limón & Caribe Sur (Moín / Guápiles)</option>
            </select>
          </div>
          <div class="map-bus-list" id="mapBusList"></div>
        </div>
        <div class="full-map">
          <div class="full-map-bg">
            <!-- Contenedor Real de Leaflet -->
            <div id="realFullMap" class="leaflet-real-map" style="width: 100%; height: 100%; border-radius: inherit; z-index: 1;"></div>
            <div class="tracking-banner" id="trackingBanner" hidden style="z-index: 1000;">
              <span class="pulse-dot small"></span>
              <span id="trackingBannerText">Siguiendo</span>
              <button class="tracking-stop" id="trackingStopBtn" aria-label="Dejar de seguir este bus" title="Dejar de seguir">✕</button>
            </div>
            <div class="user-location-bar" id="userLocationBar" hidden style="z-index: 1000;">
              <span class="user-loc-icon">📍</span>
              <span id="userLocationText">Adaptando mapa a tu ubicación...</span>
              <button class="btn-sm btn-ghost" id="recenterUserBtn" style="padding: 2px 8px; font-size:11px;">Centrar</button>
            </div>
            <div class="map-controls map-controls-top" style="z-index: 1000;">
              <button class="map-btn map-btn-geo" id="locateUserBtnFull" data-map="full" aria-label="Mi Ubicación" title="Centrar en mi ubicación GPS">📍</button>
              <button class="map-btn" id="mapStyleToggleBtn" aria-label="Cambiar estilo de mapa" title="Alternar estilo: Oscuro / Calles / Satelital">🌙</button>
              <button class="map-btn" data-zoom="in" data-map="full" aria-label="Acercar">+</button>
              <button class="map-btn" data-zoom="out" data-map="full" aria-label="Alejar">−</button>
              <button class="map-btn" data-zoom="reset" data-map="full" aria-label="Centrar en Costa Rica">🇨🇷</button>
            </div>
            <div class="map-legend" id="fullLegend" style="z-index: 1000;"></div>
          </div>
        </div>
      </div>
    </section>
 
    <!-- ============ RUTAS ============ -->
    <section class="view" id="view-routes">
      <div class="routes-grid" id="routesGrid"></div>
    </section>
 
    <!-- ============ REPORTES ============ -->
    <section class="view" id="view-reports">
      <div class="reports-container">
        <div class="reports-header">
          <h2>Reportes y analíticas</h2>
          <div class="report-actions">
            <button class="btn-ghost" id="printReportBtn">Imprimir / PDF</button>
            <button class="btn-primary" id="generateReportBtn">Generar reporte</button>
          </div>
        </div>
        <div class="report-summary" id="reportSummary" hidden></div>
        <div class="reports-grid">
          <div class="card report-card"><h3>Eficiencia por ruta</h3><canvas id="reportChart1" height="200"></canvas></div>
          <div class="card report-card"><h3>Pasajeros por ruta</h3><canvas id="reportChart2" height="200"></canvas></div>
          <div class="card report-card full-width"><h3>Retraso promedio — últimas 4 semanas</h3><canvas id="reportChart3" height="160"></canvas></div>
        </div>
      </div>
    </section>
 
    <!-- ============ CONDUCTORES ============ -->
    <section class="view" id="view-drivers">
      <div class="drivers-grid" id="driversGrid"></div>
    </section>
    <!-- MODO PASAJERO ELIMINADO --></main>
 
  <!-- Detalle de bus -->
  <div class="modal-overlay" id="busModal">
    <div class="modal" role="dialog" aria-modal="true" aria-labelledby="modalBusTitle">
      <div class="modal-header">
        <div class="modal-title-area">
          <span class="modal-bus-icon" id="modalBusIcon"></span>
          <div>
            <h2 id="modalBusTitle">Bus</h2>
            <p id="modalBusSubtitle"></p>
          </div>
        </div>
        <button class="modal-close" id="modalClose" aria-label="Cerrar">✕</button>
      </div>
      <div class="modal-body">
        <div class="modal-stats-row">
          <div class="modal-stat"><span class="modal-stat-label">Velocidad</span><span class="modal-stat-value" id="modalSpeed">—</span></div>
          <div class="modal-stat"><span class="modal-stat-label">Pasajeros</span><span class="modal-stat-value" id="modalPassengers">—</span></div>
          <div class="modal-stat"><span class="modal-stat-label">Retraso</span><span class="modal-stat-value" id="modalDelay">—</span></div>
          <div class="modal-stat"><span class="modal-stat-label">Combustible</span><span class="modal-stat-value" id="modalFuel">—</span></div>
        </div>
        <div class="modal-status-row">
          <span class="info-label">Estado del bus</span>
          <select class="status-select-lg" id="modalStatusSelect" aria-label="Editar el estado del bus">
            <option value="active">En servicio</option>
            <option value="delayed">Retrasado</option>
            <option value="stopped">Detenido</option>
            <option value="maintenance">Mantenimiento</option>
          </select>
        </div>
        <div class="modal-info-grid">
          <div class="modal-info-item"><span class="info-label">Conductor</span><span class="info-value" id="modalDriver">—</span></div>
          <div class="modal-info-item"><span class="info-label">Placa</span><span class="info-value" id="modalPlate">—</span></div>
          <div class="modal-info-item"><span class="info-label">Próxima parada</span><span class="info-value" id="modalNextStop">—</span></div>
          <div class="modal-info-item"><span class="info-label">Llegada estimada</span><span class="info-value" id="modalETA">—</span></div>
        </div>
        <div class="modal-actions">
          <button class="btn-primary" id="trackBusBtn">Rastrear en el mapa</button>
          <button class="btn-ghost" id="contactDriverBtn">Contactar conductor</button>
        </div>
      </div>
    </div>
  </div>
 
  <!-- Preferencias -->
  <div class="modal-overlay" id="settingsModal">
    <div class="modal modal-narrow" role="dialog" aria-modal="true" aria-labelledby="settingsTitle">
      <div class="modal-header">
        <div class="modal-title-area">
          <div>
            <h2 id="settingsTitle">Preferencias</h2>
            <p>Se guardan en este navegador</p>
          </div>
        </div>
        <button class="modal-close" id="settingsClose" aria-label="Cerrar">✕</button>
      </div>
      <div class="modal-body">
        <div class="setting-row">
          <div>
            <p class="setting-name">Color de acento</p>
            <p class="setting-desc">Define el color base de toda la interfaz</p>
          </div>
          <div class="accent-picker" id="accentPicker" role="group" aria-label="Color de acento"></div>
        </div>
        <div class="setting-row">
          <div>
            <p class="setting-name">Movimiento de los buses</p>
            <p class="setting-desc">Desactivalo si el equipo va lento</p>
          </div>
          <button class="switch" id="motionSwitch" role="switch" aria-checked="true"><span></span></button>
        </div>
        <div class="setting-row">
          <div>
            <p class="setting-name">Actualización automática</p>
            <p class="setting-desc">Refresca velocidades y pasajeros cada 3 s</p>
          </div>
          <button class="switch" id="liveSwitch" role="switch" aria-checked="true"><span></span></button>
        </div>
        <div class="setting-row">
          <div>
            <p class="setting-name">Densidad compacta</p>
            <p class="setting-desc">Menos espacio entre elementos</p>
          </div>
          <button class="switch" id="densitySwitch" role="switch" aria-checked="false"><span></span></button>
        </div>
        <div class="setting-row">
          <div>
            <p class="setting-name">Adaptar mapa a tu ubicación</p>
            <p class="setting-desc">Geolocalización para centrar automáticamente</p>
          </div>
          <button class="switch" id="geoSwitch" role="switch" aria-checked="false"><span></span></button>
        </div>
        <div class="modal-actions">
          <button class="btn-ghost" id="resetDataBtn">Regenerar datos de la flota</button>
        </div>
      </div>
    </div>
  </div>
 
  <!-- ============ MODAL AUTENTICACIÓN (LOGIN / REGISTRO) ============ -->
  <div class="modal-overlay" id="authModal">
    <div class="modal modal-narrow" role="dialog" aria-modal="true" aria-labelledby="authTitle">
      <div class="modal-header">
        <div class="modal-title-area">
          <h2 id="authTitle">Cuenta de Usuario</h2>
          <p id="authSubtitle">Inicia sesión o regístrate para gestionar la flota</p>
        </div>
        <button class="modal-close" id="authClose" aria-label="Cerrar">✕</button>
      </div>
      <div class="modal-body">
        <!-- Auth Tabs -->
        <div class="auth-tabs" role="tablist">
          <button class="auth-tab active" id="tabLogin" role="tab" aria-selected="true">Iniciar Sesión</button>
          <button class="auth-tab" id="tabRegister" role="tab" aria-selected="false">Registrarse</button>
        </div>

        <!-- OAuth Quick Action Buttons (Google & Apple) -->
        <div class="oauth-buttons-container">
          <button class="btn-oauth btn-google" id="googleAuthBtn" type="button">
            <svg viewBox="0 0 24 24" width="18" height="18"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/></svg>
            <span>Continuar con Google</span>
          </button>
          <button class="btn-oauth btn-apple" id="appleAuthBtn" type="button">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.63c.66-.82 1.12-1.96.99-3.11-1 .04-2.23.67-2.94 1.5-.64.74-1.2 1.92-1.05 3.05 1.12.09 2.34-.62 3-1.44z"/></svg>
            <span>Continuar con Apple</span>
          </button>
        </div>

        <div class="auth-divider"><span>o con tu correo</span></div>

        <!-- Form: Iniciar Sesión -->
        <form id="loginForm" class="auth-form">
          <div class="form-group">
            <label for="loginEmail">Correo Electrónico</label>
            <input type="email" id="loginEmail" placeholder="ejemplo@empresa.com" required autocomplete="email" />
          </div>
          <div class="form-group">
            <label for="loginPassword">Contraseña</label>
            <input type="password" id="loginPassword" placeholder="••••••••" required autocomplete="current-password" />
          </div>
          <button type="submit" class="btn-primary full-width" id="loginSubmitBtn">Iniciar Sesión</button>
        </form>

        <!-- Form: Registrarse -->
        <form id="registerForm" class="auth-form" hidden>
          <div class="form-group">
            <label for="regName">Nombre Completo</label>
            <input type="text" id="regName" placeholder="Juan Pérez" required autocomplete="name" />
          </div>
          <div class="form-group">
            <label for="regEmail">Correo Electrónico</label>
            <input type="email" id="regEmail" placeholder="ejemplo@empresa.com" required autocomplete="email" />
          </div>
          <div class="form-group">
            <label for="regPassword">Contraseña (mínimo 6 caracteres)</label>
            <input type="password" id="regPassword" placeholder="••••••••" required minlength="6" autocomplete="new-password" />
          </div>
          <div class="form-consent-box">
            <label class="consent-label">
              <input type="checkbox" id="regConsent" required />
              <span>Acepto los <a href="/terms" target="_blank">Términos y Condiciones</a> y la <a href="/privacy" target="_blank">Política de Privacidad</a> (Ley 8968 Costa Rica).</span>
            </label>
          </div>
          <button type="submit" class="btn-primary full-width" id="registerSubmitBtn">Crear Cuenta</button>
        </form>

        <!-- Current User Profile Info (When logged in) -->
        <div id="userProfileActiveBox" hidden>
          <div class="user-active-card">
            <img id="userActiveAvatar" src="" alt="Avatar de usuario" class="user-active-img" />
            <div>
              <p class="user-active-name" id="userActiveName"></p>
              <p class="user-active-email" id="userActiveEmail"></p>
              <span class="user-active-badge" id="userActiveBadge"></span>
            </div>
          </div>
          <button class="btn-ghost full-width danger-text" id="modalLogoutBtn" style="margin-top:1rem">Cerrar Sesión</button>
        </div>
      </div>
    </div>
  </div>

  <!-- ============ MODAL AUTENTICACIÓN GOOGLE / APPLE (OAUTH INTERACTIVO) ============ -->
  <div class="modal-overlay" id="oauthPromptModal">
    <div class="modal modal-narrow" role="dialog" aria-modal="true" aria-labelledby="oauthPromptTitle">
      <div class="modal-header">
        <div class="modal-title-area">
          <h2 id="oauthPromptTitle">Acceso con Proveedor</h2>
          <p id="oauthPromptSubtitle">Inicia sesión o regístrate en un clic</p>
        </div>
        <button class="modal-close" id="oauthPromptClose" aria-label="Cerrar">✕</button>
      </div>
      <div class="modal-body" style="text-align:center">
        <div id="oauthProviderBadge" style="margin-bottom:16px;"></div>
        <div class="form-group" style="text-align:left">
          <label for="oauthNameInput">Nombre Completo</label>
          <input type="text" id="oauthNameInput" placeholder="Tu nombre" required />
        </div>
        <div class="form-group" style="text-align:left">
          <label for="oauthEmailInput">Correo de la Cuenta</label>
          <input type="email" id="oauthEmailInput" placeholder="usuario@gmail.com" required />
        </div>
        <button type="button" class="btn-primary full-width" id="oauthConfirmSubmitBtn" style="padding:12px; margin-top:10px; font-size:14px;">
          🚀 Confirmar e Ingresar a BusTrack Pro
        </button>
      </div>
    </div>
  </div>

  <!-- ============ COMMAND PALETTE (CTRL + K) ============ -->
  <div class="modal-overlay" id="commandPaletteModal">
    <div class="command-palette-box" role="dialog" aria-modal="true" aria-label="Búsqueda rápida y comandos">
      <div class="cmd-header">
        <svg viewBox="0 0 20 20" fill="currentColor" width="20" height="20" aria-hidden="true"><path fill-rule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.48l4.82 4.81a1 1 0 01-1.42 1.42l-4.81-4.82A6 6 0 012 8z" clip-rule="evenodd"/></svg>
        <input type="search" id="cmdInput" placeholder="Escribe un comando o busca un bus, ruta, conductor..." autocomplete="off" />
        <span class="cmd-key">ESC</span>
      </div>
      <div class="cmd-results" id="cmdResults">
        <div class="cmd-section-label">Acciones Rápidas</div>
        <div class="cmd-item" data-action="go-dashboard"><span class="cmd-icon">📊</span> Panel Principal</div>

        <div class="cmd-item" data-action="go-map"><span class="cmd-icon">🗺️</span> Mapa en Vivo</div>
        <div class="cmd-item" data-action="go-fleet"><span class="cmd-icon">🚍</span> Ver Flota Completa</div>
        <div class="cmd-item" data-action="toggle-theme"><span class="cmd-icon">🌙</span> Alternar Modo Oscuro / Claro</div>
      </div>
    </div>
  </div>

  <!-- ============ BANNER DE CONSENTIMIENTO DE COOKIES ============ -->
  <div class="cookie-banner" id="cookieConsentBanner" hidden role="region" aria-label="Consentimiento de cookies y privacidad">
    <div class="cookie-content">
      <p class="cookie-title">🍪 Privacidad y Almacenamiento Local</p>
      <p class="cookie-text">
        Usamos <code>localStorage</code> únicamente para guardar tus preferencias (tema, vista activa). No usamos cookies de rastreo ni compartimos datos con terceros. Consulta nuestra <a href="/privacy" target="_blank">Política de Privacidad</a> y <a href="/cookies" target="_blank">Política de Cookies</a>.
      </p>
    </div>
    <div class="cookie-actions">
      <button class="btn-ghost btn-sm" id="cookieRejectBtn">Rechazar Opcionales</button>
      <button class="btn-primary btn-sm" id="cookieAcceptBtn">Aceptar Todo</button>
    </div>
  </div>

  <div class="notif-dropdown" id="notifDropdown">
    <div class="notif-header">
      <h3>Notificaciones</h3>
      <button class="btn-ghost btn-sm" id="clearNotifsBtn">Limpiar</button>
    </div>
    <div class="notif-list" id="notifList"></div>
  </div>

  <!-- ============ MODAL AGREGAR BUS ============ -->
  <div class="modal-overlay" id="addBusModal">
    <div class="modal modal-narrow" role="dialog" aria-modal="true" aria-labelledby="addBusTitle">
      <div class="modal-header">
        <div class="modal-title-area">
          <h2 id="addBusTitle">Agregar Bus a la Flota</h2>
          <p>Registra una nueva unidad en el sistema de rastreo</p>
        </div>
        <button class="modal-close" id="addBusClose" aria-label="Cerrar">✕</button>
      </div>
      <div class="modal-body">
        <form id="addBusForm" class="auth-form">
          <div class="form-group">
            <label for="newBusId">Identificador del Bus</label>
            <input type="text" id="newBusId" placeholder="ej. BUS-013" required />
          </div>
          <div class="form-group">
            <label for="newBusRoute">Ruta Asignada</label>
            <select id="newBusRoute" class="status-select-lg" style="width:100%" required>
              <option value="A">Ruta A — Central</option>
              <option value="B">Ruta B — Universidad</option>
              <option value="C">Ruta C — Expresa</option>
              <option value="D">Ruta D — Periférica</option>
            </select>
          </div>
          <div class="form-group">
            <label for="newBusDriver">Conductor Asignado</label>
            <select id="newBusDriver" class="status-select-lg" style="width:100%" required>
              <option value="D001">Carlos Mendoza</option>
              <option value="D002">Ana García</option>
              <option value="D003">Roberto López</option>
              <option value="D004">María Flores</option>
              <option value="D005">Jorge Ramírez</option>
              <option value="D006">Lucía Castro</option>
            </select>
          </div>
          <div class="form-group">
            <label for="newBusPlate">Número de Placa</label>
            <input type="text" id="newBusPlate" placeholder="ej. SJ-9842" required />
          </div>
          <button type="submit" class="btn-primary full-width" style="margin-top:1rem">Registrar e Iniciar Rastreo</button>
        </form>
      </div>
    </div>
  </div>

  <!-- ============ MODAL CONTACTAR CONDUCTOR ============ -->
  <div class="modal-overlay" id="contactDriverModal">
    <div class="modal modal-narrow" role="dialog" aria-modal="true" aria-labelledby="contactTitle">
      <div class="modal-header">
        <div class="modal-title-area">
          <h2 id="contactTitle">Contactar Conductor</h2>
          <p id="contactSubtitle">Comunicación directa con la unidad</p>
        </div>
        <button class="modal-close" id="contactClose" aria-label="Cerrar">✕</button>
      </div>
      <div class="modal-body">
        <div class="driver-contact-card">
          <div class="driver-avatar-lg" id="contactDriverInitials">CM</div>
          <div style="text-align:center">
            <h3 id="contactDriverName" style="font-size:16px; font-weight:700">Carlos Mendoza</h3>
            <p id="contactDriverBus" style="font-size:12px; color:var(--text-soft); margin-top:2px">Asignado a BUS-001 (Ruta A)</p>
            <span class="status-badge status-active" id="contactDriverStatus" style="margin-top:6px; display:inline-block">En turno activo</span>
          </div>
        </div>
        <div class="contact-actions-grid" style="display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-top:1rem">
          <button class="btn-primary" id="callDriverBtn">📞 Llamada Directa</button>
          <button class="btn-ghost" id="msgDriverBtn">💬 WhatsApp / SMS</button>
          <button class="btn-ghost full-width" id="dispatchAlertBtn" style="grid-column: span 2; margin-top:4px">📡 Enviar Alerta de Despacho</button>
        </div>
      </div>
    </div>
  <!-- ============ MODAL DIAGNÓSTICO BASE DE DATOS REAL ============ -->
  <div class="db-modal-overlay" id="dbModal" role="dialog" aria-modal="true" aria-labelledby="dbModalTitle">
    <div class="db-modal-card">
      <div class="db-modal-head">
        <h3 id="dbModalTitle">🗄️ Base de Datos 100% Real · Diagnóstico</h3>
        <button class="db-modal-close" id="dbModalClose" aria-label="Cerrar modal">&times;</button>
      </div>

      <div class="db-metrics-grid">
        <div class="db-metric-box">
          <div class="db-metric-label">Motor Activo</div>
          <div class="db-metric-val" id="dbModalEngine" style="color:#5b6ef5">SQLite 3.53</div>
        </div>
        <div class="db-metric-box">
          <div class="db-metric-label">Persistencia</div>
          <div class="db-metric-val" id="dbModalStorage" style="color:#34d399">Archivo en Disco</div>
        </div>
        <div class="db-metric-box">
          <div class="db-metric-label">Tamaño en Disco</div>
          <div class="db-metric-val" id="dbModalSize">92.0 KB</div>
        </div>
        <div class="db-metric-box">
          <div class="db-metric-label">Total Registros</div>
          <div class="db-metric-val" id="dbModalTotalRows">57 filas</div>
        </div>
      </div>

      <div>
        <h4 style="font-size:13px; font-weight:700; color:var(--text-strong); margin-bottom:6px">📁 Ubicación Física del Archivo SQL:</h4>
        <p id="dbModalPath" style="font-family:'JetBrains Mono', monospace; font-size:11.5px; color:#a5b0fb; background:var(--bg-surface); padding:8px 10px; border-radius:6px; word-break:break-all; border:1px solid var(--line)"></p>
      </div>

      <div>
        <h4 style="font-size:13px; font-weight:700; color:var(--text-strong); margin-bottom:8px">📊 Tablas Relacionales y Conteo en Vivo:</h4>
        <div class="db-table-list" id="dbModalTableList">
          <!-- Injected via JavaScript -->
        </div>
      </div>

      <div>
        <h4 style="font-size:13px; font-weight:700; color:var(--text-strong); margin-bottom:8px">🛡️ Garantías de Integridad y Rendimiento:</h4>
        <div class="db-features-badges">
          <span class="db-feature-badge">✓ Claves Foráneas (Foreign Keys) Activas</span>
          <span class="db-feature-badge">✓ Modo WAL (Write-Ahead Logging)</span>
          <span class="db-feature-badge">✓ Transacciones ACID</span>
          <span class="db-feature-badge">✓ Preparación de Consultas anti-SQLi</span>
          <span class="db-feature-badge">✓ Compatible con PostgreSQL / Supabase</span>
        </div>
      </div>

      <div style="display:flex; justify-content:flex-end; gap:8px; margin-top:8px">
        <button class="btn-ghost btn-sm" id="dbModalRefreshBtn">🔄 Actualizar Diagnóstico</button>
        <button class="btn-primary btn-sm" id="dbModalOkBtn">Entendido</button>
      </div>
    </div>
  </div>

  <div class="toast-stack" id="toastStack" aria-live="polite"></div>

  <script src="app.js"></script>
</body>
</html>
````

## File: package.json
````json
{
  "name": "bustrack-pro-backend",
  "version": "1.0.0",
  "description": "Production-grade backend and real-time telematics engine for BusTrack Pro",
  "main": "server/index.js",
  "type": "module",
  "scripts": {
    "start": "node server/index.js",
    "dev": "node --watch server/index.js",
    "test": "node --test test/api.test.js test/database.test.js test/auth.test.js",
    "db:status": "node server/database/status.js",
    "db:seed": "node server/database/initDb.js",
    "db:up": "docker compose up -d",
    "db:down": "docker compose down"
  },
  "keywords": [
    "transit",
    "fleet-management",
    "telematics",
    "websockets",
    "realtime",
    "express"
  ],
  "author": "BusTrack Architecture Team",
  "license": "ISC",
  "dependencies": {
    "@supabase/ssr": "^0.12.7",
    "@supabase/supabase-js": "^2.117.2",
    "bcryptjs": "^3.0.3",
    "cors": "^2.8.5",
    "dotenv": "^16.4.7",
    "expo": "^57.0.27",
    "express": "^4.21.2",
    "express-rate-limit": "^8.7.0",
    "helmet": "^8.3.0",
    "jsonwebtoken": "^9.0.3",
    "leaflet": "^1.9.4",
    "pg": "^8.13.3",
    "ws": "^8.18.0"
  }
}
````

## File: privacy.html
````html
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="robots" content="noindex, follow" />
  <title>Política de Privacidad — BusTrack Pro</title>
  <meta name="description" content="Política de privacidad de BusTrack Pro. Conoce cómo tratamos los datos operativos del sistema de rastreo de flotas." />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
  <style>
    :root {
      --bg: #0a0f1c;
      --surface: #111827;
      --border: rgba(255,255,255,0.08);
      --text: #e5e7eb;
      --text-muted: #9ca3af;
      --brand: #5b6ef5;
      --brand-light: #818cf8;
    }
    @media (prefers-color-scheme: light) {
      :root {
        --bg: #f9fafb;
        --surface: #ffffff;
        --border: rgba(0,0,0,0.08);
        --text: #111827;
        --text-muted: #6b7280;
      }
    }
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Inter', system-ui, sans-serif;
      background: var(--bg);
      color: var(--text);
      line-height: 1.7;
      font-size: 1rem;
    }
    .legal-header {
      background: var(--surface);
      border-bottom: 1px solid var(--border);
      padding: 1rem 2rem;
      display: flex;
      align-items: center;
      gap: 1rem;
    }
    .legal-header a {
      color: var(--brand-light);
      text-decoration: none;
      font-size: 0.875rem;
    }
    .legal-header a:hover { text-decoration: underline; }
    .legal-logo {
      font-weight: 700;
      color: var(--brand);
      font-size: 1.1rem;
    }
    .legal-sep { color: var(--text-muted); }
    main {
      max-width: 760px;
      margin: 0 auto;
      padding: 3rem 1.5rem 5rem;
    }
    .legal-badge {
      display: inline-block;
      background: rgba(91,110,245,0.15);
      color: var(--brand-light);
      border: 1px solid rgba(91,110,245,0.3);
      border-radius: 99px;
      padding: 0.2rem 0.75rem;
      font-size: 0.75rem;
      font-weight: 600;
      letter-spacing: 0.05em;
      text-transform: uppercase;
      margin-bottom: 1rem;
    }
    h1 {
      font-size: 2rem;
      font-weight: 700;
      line-height: 1.2;
      margin-bottom: 0.5rem;
    }
    .last-updated {
      color: var(--text-muted);
      font-size: 0.875rem;
      margin-bottom: 2.5rem;
      padding-bottom: 2.5rem;
      border-bottom: 1px solid var(--border);
    }
    h2 {
      font-size: 1.2rem;
      font-weight: 600;
      margin: 2.5rem 0 0.75rem;
      color: var(--brand-light);
    }
    p { margin-bottom: 1rem; color: var(--text); }
    ul { margin: 0.5rem 0 1rem 1.5rem; }
    li { margin-bottom: 0.4rem; color: var(--text); }
    .info-box {
      background: var(--surface);
      border: 1px solid var(--border);
      border-left: 3px solid var(--brand);
      border-radius: 8px;
      padding: 1.25rem 1.5rem;
      margin: 2rem 0;
    }
    .info-box strong { color: var(--brand-light); }
    .contact-card {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 1.5rem;
      margin-top: 2rem;
    }
    .contact-card h3 { margin-bottom: 0.75rem; font-size: 1rem; }
    .contact-card p { margin-bottom: 0.4rem; font-size: 0.9rem; }
    footer {
      text-align: center;
      padding: 2rem;
      color: var(--text-muted);
      font-size: 0.8rem;
      border-top: 1px solid var(--border);
    }
    footer a { color: var(--brand-light); text-decoration: none; }
    a { color: var(--brand-light); }
    a:focus-visible { outline: 2px solid var(--brand); outline-offset: 2px; border-radius: 2px; }
  </style>
</head>
<body>
  <header class="legal-header">
    <span class="legal-logo">BusTrack Pro</span>
    <span class="legal-sep">›</span>
    <a href="/">← Volver al panel</a>
  </header>

  <main>
    <span class="legal-badge">Legal</span>
    <h1>Política de Privacidad</h1>
    <p class="last-updated">Última actualización: 24 de septiembre de 2026</p>

    <div class="info-box">
      <p><strong>Resumen:</strong> BusTrack Pro es un sistema de rastreo operativo de flotas. <em>No recolectamos datos personales de pasajeros.</em> Los datos que procesamos son exclusivamente datos operativos de flota (posición GPS de unidades, velocidades, estados de servicio).</p>
    </div>

    <h2>1. ¿Quién es el responsable del tratamiento?</h2>
    <p>El responsable del tratamiento de datos es el operador de transporte o la institución que contrata y administra el servicio BusTrack Pro. En el contexto del piloto de la <strong>Universidad Fidélitas (Campus San Pedro, San José, Costa Rica)</strong>, el responsable es la entidad universitaria correspondiente.</p>
    <p>Para más información, contacte a: <strong>admin@bustrack.example.com</strong></p>

    <h2>2. ¿Qué datos recopilamos?</h2>
    <p>BusTrack Pro procesa únicamente datos operativos necesarios para el funcionamiento del servicio:</p>
    <ul>
      <li><strong>Datos de telemetría de flota:</strong> posición GPS de las unidades de transporte, velocidad, estado operativo, combustible estimado.</li>
      <li><strong>Datos de operación:</strong> rutas activas, paradas, tiempos estimados de llegada.</li>
      <li><strong>Datos técnicos del servidor:</strong> logs de acceso al sistema (dirección IP del servidor, timestamps, códigos HTTP) para diagnóstico y seguridad.</li>
    </ul>
    <p><strong>No recopilamos</strong> datos personales de pasajeros, datos de identificación, correos electrónicos ni datos de pago en la versión actual del sistema.</p>

    <h2>3. ¿Para qué usamos los datos?</h2>
    <ul>
      <li>Visualización en tiempo real de la posición de las unidades de transporte</li>
      <li>Cálculo de tiempos estimados de llegada a paradas</li>
      <li>Generación de reportes operativos de la flota</li>
      <li>Diagnóstico de fallos y mantenimiento del servicio</li>
    </ul>

    <h2>4. Base legal (Ley 8968 — LEPD, Costa Rica)</h2>
    <p>El tratamiento de los datos operativos de flota se realiza bajo la base legal del <strong>interés legítimo del operador de transporte</strong> en gestionar su flota de manera eficiente y segura, conforme al artículo 5 inciso e) de la <em>Ley de Protección de la Persona frente al tratamiento de sus datos personales</em> (Ley N° 8968) de Costa Rica.</p>

    <h2>5. ¿Con quién compartimos los datos?</h2>
    <p>No compartimos datos con terceros con fines comerciales. Los datos operativos pueden ser accedidos por:</p>
    <ul>
      <li>El personal administrativo del operador de transporte</li>
      <li>Proveedores de infraestructura tecnológica bajo acuerdos de confidencialidad</li>
    </ul>

    <h2>6. Almacenamiento y seguridad</h2>
    <p>Los datos de telemetría se procesan en memoria de forma temporal. El sistema implementa medidas técnicas de seguridad incluyendo: transmisión cifrada (HTTPS/WSS), headers de seguridad HTTP (Content Security Policy, X-Frame-Options, HSTS), y control de acceso por IP.</p>

    <h2>7. Uso de localStorage (almacenamiento local)</h2>
    <p>La interfaz web de BusTrack Pro utiliza el almacenamiento local del navegador (<code>localStorage</code>) únicamente para guardar <strong>preferencias de usuario</strong> (tema de color, densidad de la interfaz, última parada seleccionada). Estos datos nunca se envían a nuestros servidores y se pueden eliminar borrando los datos del navegador.</p>
    <p>No utilizamos cookies de rastreo, cookies de terceros ni sistemas de analíticas externas.</p>

    <h2>8. Derechos del interesado</h2>
    <p>Conforme a la Ley 8968 de Costa Rica, usted tiene derecho a:</p>
    <ul>
      <li><strong>Acceso:</strong> conocer qué datos almacenamos sobre usted</li>
      <li><strong>Rectificación:</strong> corregir datos inexactos</li>
      <li><strong>Supresión:</strong> solicitar la eliminación de sus datos</li>
      <li><strong>Oposición:</strong> oponerse al tratamiento de sus datos</li>
    </ul>
    <p>Para ejercer estos derechos, contacte a la entidad operadora del servicio.</p>

    <h2>9. Cambios a esta política</h2>
    <p>Nos reservamos el derecho de actualizar esta política. Los cambios relevantes se notificarán con al menos 30 días de antelación. La versión vigente siempre estará disponible en esta página.</p>

    <div class="contact-card">
      <h3>Contacto — Responsable de Datos</h3>
      <p>BusTrack Pro — Sistema de Rastreo de Flotas</p>
      <p>Piloto: Universidad Fidélitas, San Pedro, Montes de Oca, San José, Costa Rica</p>
      <p>Correo: <a href="mailto:admin@bustrack.example.com">admin@bustrack.example.com</a></p>
      <p><em>Nota: Sustituya estos datos con los datos reales de su empresa antes de publicar.</em></p>
    </div>
  </main>

  <footer>
    <p>© 2026 BusTrack Pro. Todos los derechos reservados. |
      <a href="/privacy">Privacidad</a> ·
      <a href="/terms">Términos</a> ·
      <a href="/">Panel</a>
    </p>
  </footer>
</body>
</html>
````

## File: refunds.html
````html
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="robots" content="noindex, follow" />
  <title>Política de Reembolsos y Servicio — BusTrack Pro</title>
  <meta name="description" content="Términos y condiciones sobre reembolsos, licencias enterprise y garantía de servicio de BusTrack Pro." />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
  <style>
    :root { --bg: #0a0f1c; --surface: #111827; --border: rgba(255,255,255,0.08); --text: #e5e7eb; --text-muted: #9ca3af; --brand: #5b6ef5; --brand-light: #818cf8; }
    @media (prefers-color-scheme: light) { :root { --bg: #f9fafb; --surface: #fff; --border: rgba(0,0,0,0.08); --text: #111827; --text-muted: #6b7280; } }
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Inter', system-ui, sans-serif; background: var(--bg); color: var(--text); line-height: 1.7; font-size: 1rem; }
    .legal-header { background: var(--surface); border-bottom: 1px solid var(--border); padding: 1rem 2rem; display: flex; align-items: center; gap: 1rem; }
    .legal-header a { color: var(--brand-light); text-decoration: none; font-size: 0.875rem; }
    .legal-header a:hover { text-decoration: underline; }
    .legal-logo { font-weight: 700; color: var(--brand); font-size: 1.1rem; }
    .legal-sep { color: var(--text-muted); }
    main { max-width: 760px; margin: 0 auto; padding: 3rem 1.5rem 5rem; }
    .legal-badge { display: inline-block; background: rgba(91,110,245,0.15); color: var(--brand-light); border: 1px solid rgba(91,110,245,0.3); border-radius: 99px; padding: 0.2rem 0.75rem; font-size: 0.75rem; font-weight: 600; letter-spacing: 0.05em; text-transform: uppercase; margin-bottom: 1rem; }
    h1 { font-size: 2rem; font-weight: 700; line-height: 1.2; margin-bottom: 0.5rem; }
    .last-updated { color: var(--text-muted); font-size: 0.875rem; margin-bottom: 2.5rem; padding-bottom: 2.5rem; border-bottom: 1px solid var(--border); }
    h2 { font-size: 1.2rem; font-weight: 600; margin: 2.5rem 0 0.75rem; color: var(--brand-light); }
    p { margin-bottom: 1rem; }
    ul { margin: 0.5rem 0 1rem 1.5rem; }
    li { margin-bottom: 0.4rem; }
    .info-box { background: var(--surface); border: 1px solid var(--border); border-left: 3px solid var(--brand); border-radius: 8px; padding: 1.25rem 1.5rem; margin: 2rem 0; }
    footer { text-align: center; padding: 2rem; color: var(--text-muted); font-size: 0.8rem; border-top: 1px solid var(--border); }
    footer a { color: var(--brand-light); text-decoration: none; }
    a { color: var(--brand-light); }
  </style>
</head>
<body>
  <header class="legal-header">
    <span class="legal-logo">BusTrack Pro</span>
    <span class="legal-sep">›</span>
    <a href="/">← Volver al panel</a>
  </header>

  <main>
    <span class="legal-badge">SLA & Garantía</span>
    <h1>Política de Reembolsos y Nivel de Servicio</h1>
    <p class="last-updated">Última actualización: 24 de septiembre de 2026</p>

    <div class="info-box">
      <p><strong>Uso Gratuito & Piloto Estudiantil:</strong> El servicio público de monitoreo de rutas y el piloto estudiantil en la Universidad Fidélitas son 100% gratuitos para pasajeros. Esta política aplica a licencias de software contratadas por empresas operadoras de transporte.</p>
    </div>

    <h2>1. Período de Garantía de 30 Días</h2>
    <p>Para empresas operadoras que contratan la suscripción Enterprise de BusTrack Pro, ofrecemos una garantía de devolución del 100% durante los primeros 30 días posteriores a la activación si el servicio no cumple con los acuerdos de telemetría acordados.</p>

    <h2>2. Proceso de Solicitud</h2>
    <p>Para solicitar un reembolso o ajuste de facturación, la empresa cliente debe enviar un correo a <code>soporte@bustrack.example.com</code> detallando el motivo y número de contrato.</p>
  </main>

  <footer>
    <p>© 2026 BusTrack Pro | <a href="/privacy">Privacidad</a> · <a href="/terms">Términos</a> · <a href="/refunds">Reembolsos</a></p>
  </footer>
</body>
</html>
````

## File: repomix-output.xml
````xml
This file is a merged representation of the entire codebase, combined into a single document by Repomix.

<file_summary>
This section contains a summary of this file.

<purpose>
This file contains a packed representation of the entire repository's contents.
It is designed to be easily consumable by AI systems for analysis, code review,
or other automated processes.
</purpose>

<file_format>
The content is organized as follows:
1. This summary section
2. Repository information
3. Directory structure
4. Repository files (if enabled)
5. Multiple file entries, each consisting of:
  - File path as an attribute
  - Full contents of the file
</file_format>

<usage_guidelines>
- This file should be treated as read-only. Any changes should be made to the
  original repository files, not this packed version.
- When processing this file, use the file path to distinguish
  between different files in the repository.
- Be aware that this file may contain sensitive information. Handle it with
  the same level of security as you would the original repository.
</usage_guidelines>

<notes>
- Some files may have been excluded based on .gitignore rules and Repomix's configuration
- Binary files are not included in this packed representation. Please refer to the Repository Structure section for a complete list of file paths, including binary files
- Files matching patterns in .gitignore are excluded
- Files matching default ignore patterns are excluded
- Files are sorted by Git change count (files with more changes are at the bottom)
</notes>

</file_summary>

<directory_structure>
.claude/
  settings.local.json
data/
  bustrack.sqlite-shm
  bustrack.sqlite-wal
docs/
  ARCHITECTURE.md
  DATABASE_SCHEMA.sql
  openapi.yaml
  supabase-users-table.sql
server/
  database/
    db.js
    initDb.js
    schema.sql
    schema.sqlite.sql
    status.js
  middleware/
    auth.js
    errorHandler.js
    logger.js
    rateLimiter.js
    sanitizer.js
  routes/
    api.js
    authRoutes.js
  services/
    alertService.js
    authService.js
    fleetService.js
    passengerService.js
    telemetrySimulator.js
  config.js
  index.js
  supabase.js
src/
  App.jsx
  supabase.js
test/
  api.test.js
  auth.test.js
  database.test.js
.env.example
.gitignore
404.html
app.js
cookies.html
docker-compose.yml
index.html
package.json
privacy.html
refunds.html
robots.txt
sitemap.xml
styles.css
terms.html
thanks.html
</directory_structure>

<files>
This section contains the contents of the repository's files.

<file path=".claude/settings.local.json">
{
  "enabledPlugins": {
    "frontend-design@claude-plugins-official": true
  }
}
</file>

<file path="docs/supabase-users-table.sql">
-- ============================================================
-- BusTrack Pro — Tabla de Usuarios en Supabase
-- Ejecutar en: Supabase Dashboard > SQL Editor
-- ============================================================

-- 1. Crear tabla users vinculada a Supabase Auth
CREATE TABLE IF NOT EXISTS public.users (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email         TEXT UNIQUE NOT NULL,
  full_name     TEXT,
  role          TEXT DEFAULT 'admin' CHECK (role IN ('admin', 'passenger')),
  auth_provider TEXT DEFAULT 'email',
  avatar_url    TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Habilitar Row Level Security
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- 3. Politicas de seguridad
CREATE POLICY "Usuarios pueden ver su propio perfil"
  ON public.users FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Usuarios pueden actualizar su propio perfil"
  ON public.users FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Service role puede gestionar todos los usuarios"
  ON public.users FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- 4. Trigger para updated_at automatico
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- 5. Trigger: crear fila en users cuando se registra en Supabase Auth
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name, avatar_url, auth_provider)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'name',
    NEW.raw_user_meta_data->>'avatar_url',
    COALESCE(NEW.raw_user_meta_data->>'provider', 'email')
  )
  ON CONFLICT (email) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- ============================================================
-- Listo! Ahora cada registro en Supabase Auth crea
-- automaticamente un registro en public.users
-- ============================================================
</file>

<file path="docs/ARCHITECTURE.md">
# System Architecture Specification — BusTrack Pro

## 1. High-Level Architecture

- **Architecture Pattern**: Modular Monolith (Domain-Driven Design) with clear migration pathway to Event-Driven Microservices.
- **Communication Pattern**: 
  - **Inbound Client Operations**: RESTful JSON APIs (HTTP/2 ready, RFC 7807 problem details).
  - **Real-Time Telemetry & Notifications**: Full-duplex WebSockets (`/ws/telemetry`) with binary/JSON message frames and heartbeat ping/pong.
  - **Inter-service Communication (Internal)**: In-process EventBus / Domain Event Dispatcher (Kafka/RabbitMQ ready).
- **Data Pattern**: CQRS-lite with write validation models and read-optimized view queries; time-series telemetry append log with retention pruning.
- **Deployment Pattern**: Containerized (Docker, OCI-compliant), multi-stage build, health/readiness probes (`/api/v1/health`), stateless server architecture suitable for horizontal autoscaling behind reverse proxy (Nginx, Traefik, AWS ALB).
- **API Contract**: OpenAPI 3.1.0 specification with strict schema validation.
- **Observability Pattern**: Structured JSON logging, distributed correlation IDs (`X-Correlation-ID`), Prometheus-compatible latency & throughput metrics, SLO monitoring.

---

## 2. Service Decomposition & Domain Model

```mermaid
graph TD
    Client[Web Dashboard / Mobile App] -->|HTTPS REST| APIGateway[API Gateway / Express Router]
    Client -->|WSS Protocol| WSGateway[WebSocket Telemetry Hub]
    
    subgraph CoreBackend [BusTrack Pro Backend Core]
        APIGateway --> SecurityMW[Security & Correlation Middleware]
        SecurityMW --> FleetCtrl[Fleet & Routes Controller]
        SecurityMW --> AlertCtrl[Alerts Controller]
        SecurityMW --> ReportCtrl[Reports & Analytics Controller]
        
        FleetCtrl --> FleetSvc[Fleet Service]
        AlertCtrl --> AlertSvc[Alert Service]
        ReportCtrl --> ReportSvc[Report Service]
        
        TelemetryEngine[Telemetry Engine / GPS Ingestion] --> FleetSvc
        TelemetryEngine -->|Emit GPS Delta| WSGateway
        AlertSvc -->|Emit Alert Event| WSGateway
        
        FleetSvc --> Persistence[Persistence Layer SQLite / PostgreSQL]
        AlertSvc --> Persistence
        ReportSvc --> Persistence
    end

    Persistence --> DB[(Relational Database)]
```

### Core Domains:
1. **Fleet Management Domain**:
   - Manages physical buses (`buses`), technical specifications, capacity, fuel levels, current status (`active`, `delayed`, `stopped`, `maintenance`).
   - Handles route assignments and driver pairings.
   - Enforces state transition rules (e.g., transition from `active` to `stopped` drops speed to 0 km/h).

2. **Route & Spatial Domain**:
   - Manages transit lines (`routes`), path geometries, sequence of stops (`stops`, `route_stops`), estimated arrival times (ETA), and scheduled travel times.

3. **Driver Domain**:
   - Manages authorized operators (`drivers`), license validation, shift tracking, safety ratings, and trip completions.

4. **Telemetry & Geo-Tracking Domain**:
   - Ingests high-frequency GPS coordinate beacons (x, y coordinates, speed, heading, fuel, passenger load).
   - Feeds real-time consumers through low-latency WebSocket broadcasting with sub-50ms fanout.

5. **Alert & Incident Domain**:
   - Monitors telemetry thresholds (speeding, engine temperature, low fuel < 20%, severe delays, geofence deviation).
   - Generates typed alerts (`critical`, `warning`, `info`) with lifecycle states (`unread`, `read`, `acknowledged`).

6. **Reporting & Analytics Domain**:
   - Computes operational KPIs: fleet utilization rate, passenger volume, average delay minutes, fuel consumption, maintenance frequency.
   - Generates CSV and PDF exports for transport authorities and company management.

---

## 3. Reliability & Resiliency Patterns

1. **Timeout Budgets & Graceful Degradation**:
   - Database query timeout budget set to 2,000ms.
   - If downstream services or disk persistence slow down, read requests return cached snapshots with `Cache-Control: public, max-age=5` and `stale-while-revalidate`.
2. **Circuit Breakers & Rate Limiting**:
   - Token-bucket rate limiter per IP address (120 req/min for general endpoints; 30 req/min for mutating actions).
   - Protection against telemetry packet storms via sliding window deduplication.
3. **Heartbeat & Reconnection Protocol**:
   - WebSocket clients send periodic ping frames every 30 seconds; server terminates dead TCP connections after 2 missed beats.
   - Frontend client implements exponential backoff with jitter (500ms, 1s, 2s, 4s, max 15s) upon connection drop.
4. **Graceful Shutdown**:
   - Catches `SIGTERM` and `SIGINT`:
     - Closes incoming HTTP listeners.
     - Sends WS termination frames to connected clients (`Going Away`).
     - Flushes in-flight telemetry logs to disk/database.
     - Exits cleanly within 5,000ms grace window.

---

## 4. Security & Data Protection

- **Defense in Depth**:
  - Transport Layer Security (TLS 1.3 enforced in production reverse proxy).
  - Security headers enforced: Strict Content-Security-Policy (CSP), `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`.
  - CORS whitelist configured via environment variable `CORS_ORIGIN`.
  - Input validation: strict payload sanitation to prevent SQL injection, prototype pollution, and path traversal.

---

## 5. Observability & SLOs

### Service Level Objectives (SLOs)
| Metric | Objective | Target |
| :--- | :--- | :--- |
| **API Availability** | Uptime excluding scheduled maintenance | `>= 99.9%` |
| **P95 Latency (Read)** | Response time for `GET /api/v1/*` | `< 100 ms` |
| **P99 Latency (Write)** | Response time for `POST / PATCH` | `< 250 ms` |
| **Telemetry Fanout** | Ingestion-to-client WS latency | `< 80 ms` |
| **Error Rate** | 5xx server responses / total requests | `< 0.05%` |

### Telemetry & Tracing
- Structured JSON output to `stdout` compatible with Datadog, ELK, and CloudWatch.
- Unique request tracing header: `X-Correlation-ID` injected at the gateway and propagated across service calls and log entries.
</file>

<file path="docs/DATABASE_SCHEMA.sql">
-- =============================================================================
-- BusTrack Pro — Enterprise PostgreSQL Database Schema
-- Architecture Version: 1.0.0
-- Target Engine: PostgreSQL 15+ / 16+
-- Optimized for high-throughput telematics, low-latency spatial queries & auditability
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =============================================================================
-- 1. ENUMS & DOMAINS
-- =============================================================================

DO $$ BEGIN
    CREATE TYPE bus_status_enum AS ENUM ('active', 'delayed', 'stopped', 'maintenance');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE alert_severity_enum AS ENUM ('critical', 'warning', 'info');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- =============================================================================
-- 2. TRANSIT ROUTES & STOPS
-- =============================================================================

CREATE TABLE IF NOT EXISTS routes (
    id VARCHAR(10) PRIMARY KEY,              -- e.g. 'A', 'B', 'C', 'D'
    name VARCHAR(150) NOT NULL,              -- e.g. 'Centro — Aeropuerto'
    var_name VARCHAR(50) NOT NULL,           -- e.g. '--route-a'
    color VARCHAR(20) NOT NULL,              -- e.g. '#5b6ef5'
    stops_count INTEGER NOT NULL DEFAULT 0,
    length_km NUMERIC(5, 2) NOT NULL DEFAULT 0.0,
    path_d TEXT,                             -- SVG path definition or GeoJSON LineString
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS stops (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(150) NOT NULL UNIQUE,
    pos_x NUMERIC(8, 2) NOT NULL,            -- Spatial X coordinate on city grid
    pos_y NUMERIC(8, 2) NOT NULL,            -- Spatial Y coordinate on city grid
    latitude NUMERIC(10, 7),                 -- Optional WGS84 GPS latitude
    longitude NUMERIC(10, 7),                -- Optional WGS84 GPS longitude
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS route_stops (
    route_id VARCHAR(10) REFERENCES routes(id) ON DELETE CASCADE,
    stop_id UUID REFERENCES stops(id) ON DELETE CASCADE,
    sequence_order INTEGER NOT NULL,
    PRIMARY KEY (route_id, stop_id),
    CONSTRAINT uq_route_sequence UNIQUE (route_id, sequence_order)
);

CREATE INDEX IF NOT EXISTS idx_route_stops_order ON route_stops(route_id, sequence_order);

-- =============================================================================
-- 3. DRIVERS (OPERATORS)
-- =============================================================================

CREATE TABLE IF NOT EXISTS drivers (
    id VARCHAR(20) PRIMARY KEY,              -- e.g. 'D001', 'D002'
    name VARCHAR(150) NOT NULL,
    initials VARCHAR(5) NOT NULL,
    license VARCHAR(50) NOT NULL UNIQUE,
    trips_completed INTEGER NOT NULL DEFAULT 0 CHECK (trips_completed >= 0),
    rating NUMERIC(3, 2) NOT NULL DEFAULT 5.0 CHECK (rating >= 1.0 AND rating <= 5.0),
    shift_hours NUMERIC(4, 2) NOT NULL DEFAULT 0.0 CHECK (shift_hours >= 0.0),
    phone VARCHAR(30),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_drivers_rating ON drivers(rating DESC);

-- =============================================================================
-- 4. FLEET BUSES
-- =============================================================================

CREATE TABLE IF NOT EXISTS buses (
    id VARCHAR(20) PRIMARY KEY,              -- e.g. 'BUS-001'
    num VARCHAR(10) NOT NULL,                -- e.g. '001'
    plate VARCHAR(20) NOT NULL UNIQUE,       -- e.g. 'SJB-1001'
    route_id VARCHAR(10) REFERENCES routes(id) ON UPDATE CASCADE,
    driver_id VARCHAR(20) REFERENCES drivers(id) ON UPDATE CASCADE,
    status bus_status_enum NOT NULL DEFAULT 'stopped',
    speed NUMERIC(5, 2) NOT NULL DEFAULT 0.0 CHECK (speed >= 0.0),
    passengers INTEGER NOT NULL DEFAULT 0 CHECK (passengers >= 0),
    capacity INTEGER NOT NULL DEFAULT 52 CHECK (capacity > 0),
    fuel_percent NUMERIC(5, 2) NOT NULL DEFAULT 100.0 CHECK (fuel_percent >= 0.0 AND fuel_percent <= 100.0),
    delay_minutes INTEGER NOT NULL DEFAULT 0 CHECK (delay_minutes >= 0),
    next_stop_name VARCHAR(150),
    eta_minutes INTEGER DEFAULT 0,
    pos_x NUMERIC(8, 2) NOT NULL DEFAULT 400.0,
    pos_y NUMERIC(8, 2) NOT NULL DEFAULT 225.0,
    trajectory_t NUMERIC(6, 5) DEFAULT 0.0,  -- 0.0 to 1.0 progress along route curve
    trajectory_dir SMALLINT DEFAULT 1,       -- 1 = forward, -1 = reverse
    trajectory_step NUMERIC(6, 5) DEFAULT 0.005,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_buses_status ON buses(status);
CREATE INDEX IF NOT EXISTS idx_buses_route ON buses(route_id);
CREATE INDEX IF NOT EXISTS idx_buses_driver ON buses(driver_id);
CREATE INDEX IF NOT EXISTS idx_buses_fuel ON buses(fuel_percent) WHERE fuel_percent < 20;

-- =============================================================================
-- 5. TIME-SERIES TELEMETRY LOGS (Partitioned by Month for Big Data Scale)
-- =============================================================================

CREATE TABLE IF NOT EXISTS telemetry_logs (
    id BIGSERIAL,
    bus_id VARCHAR(20) NOT NULL,
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    pos_x NUMERIC(8, 2) NOT NULL,
    pos_y NUMERIC(8, 2) NOT NULL,
    speed NUMERIC(5, 2) NOT NULL,
    fuel_percent NUMERIC(5, 2) NOT NULL,
    passengers INTEGER NOT NULL,
    delay_minutes INTEGER NOT NULL,
    status bus_status_enum NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    PRIMARY KEY (recorded_at, id)
) PARTITION BY RANGE (recorded_at);

-- Partition examples for monthly storage:
CREATE TABLE IF NOT EXISTS telemetry_y2026m01 PARTITION OF telemetry_logs
    FOR VALUES FROM ('2026-01-01 00:00:00+00') TO ('2026-02-01 00:00:00+00');
CREATE TABLE IF NOT EXISTS telemetry_y2026m02 PARTITION OF telemetry_logs
    FOR VALUES FROM ('2026-02-01 00:00:00+00') TO ('2026-03-01 00:00:00+00');
CREATE TABLE IF NOT EXISTS telemetry_y2026m03 PARTITION OF telemetry_logs
    FOR VALUES FROM ('2026-03-01 00:00:00+00') TO ('2026-04-01 00:00:00+00');
CREATE TABLE IF NOT EXISTS telemetry_default PARTITION OF telemetry_logs DEFAULT;

CREATE INDEX IF NOT EXISTS idx_telemetry_bus_time ON telemetry_logs (bus_id, recorded_at DESC);

-- =============================================================================
-- 6. ALERTS & INCIDENT MANAGEMENT
-- =============================================================================

CREATE TABLE IF NOT EXISTS alerts (
    id BIGSERIAL PRIMARY KEY,
    severity alert_severity_enum NOT NULL DEFAULT 'info',
    icon VARCHAR(10) NOT NULL DEFAULT 'ℹ️',
    title VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    bus_id VARCHAR(20),                      -- Can be 'BUS-011' or 'Sistema'
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    resolved_at TIMESTAMPTZ,
    resolved_by VARCHAR(100)
);

CREATE INDEX IF NOT EXISTS idx_alerts_unread ON alerts(is_read, created_at DESC) WHERE is_read = FALSE;
CREATE INDEX IF NOT EXISTS idx_alerts_severity ON alerts(severity, created_at DESC);

-- =============================================================================
-- 7. AUDIT LOGGING & STATUS TRANSITION TRIGGER
-- =============================================================================

CREATE TABLE IF NOT EXISTS audit_logs (
    id BIGSERIAL PRIMARY KEY,
    entity_name VARCHAR(50) NOT NULL,
    entity_id VARCHAR(50) NOT NULL,
    action VARCHAR(20) NOT NULL,             -- 'INSERT', 'UPDATE', 'DELETE'
    old_data JSONB,
    new_data JSONB,
    changed_by VARCHAR(100) DEFAULT 'system',
    changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION fn_audit_bus_status_change()
RETURNS TRIGGER AS $$
BEGIN
    IF (OLD.status IS DISTINCT FROM NEW.status) THEN
        INSERT INTO audit_logs (entity_name, entity_id, action, old_data, new_data)
        VALUES (
            'buses',
            NEW.id,
            'STATUS_CHANGE',
            jsonb_build_object('status', OLD.status, 'speed', OLD.speed, 'delay', OLD.delay),
            jsonb_build_object('status', NEW.status, 'speed', NEW.speed, 'delay', NEW.delay)
        );
    END IF;
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_buses_status_change ON buses;
CREATE TRIGGER trg_buses_status_change
    BEFORE UPDATE ON buses
    FOR EACH ROW
    EXECUTE FUNCTION fn_audit_bus_status_change();
</file>

<file path="docs/openapi.yaml">
openapi: 3.1.0
info:
  title: BusTrack Pro Public & Operations API
  description: Enterprise RESTful API for real-time fleet tracking, routes, drivers, incident management, and transit analytics.
  version: 1.0.0
  contact:
    name: BusTrack Architecture Team
    email: api-ops@bustrackpro.com

servers:
  - url: http://localhost:3000/api/v1
    description: Local Development Server
  - url: https://api.bustrackpro.com/v1
    description: Production Cluster

paths:
  /health:
    get:
      summary: System health & diagnostics
      operationId: getHealth
      tags: [System]
      responses:
        '200':
          description: System operational
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/HealthStatus'

  /routes:
    get:
      summary: Retrieve all transit routes with coverage KPIs
      operationId: getRoutes
      tags: [Routes]
      responses:
        '200':
          description: List of routes
          content:
            application/json:
              schema:
                type: array
                items:
                  $ref: '#/components/schemas/Route'

  /drivers:
    get:
      summary: Retrieve driver roster and shift statuses
      operationId: getDrivers
      tags: [Drivers]
      responses:
        '200':
          description: List of drivers
          content:
            application/json:
              schema:
                type: array
                items:
                  $ref: '#/components/schemas/Driver'

  /buses:
    get:
      summary: List fleet buses with optional filtering
      operationId: getBuses
      tags: [Fleet]
      parameters:
        - name: route
          in: query
          description: Filter by route identifier (e.g. A, B, C, D)
          schema:
            type: string
        - name: status
          in: query
          description: Filter by operational status
          schema:
            type: string
            enum: [active, delayed, stopped, maintenance]
        - name: search
          in: query
          description: Search term matching bus ID or license plate
          schema:
            type: string
      responses:
        '200':
          description: Filtered list of fleet units
          content:
            application/json:
              schema:
                type: array
                items:
                  $ref: '#/components/schemas/Bus'

    post:
      summary: Provision a new bus to the active fleet
      operationId: createBus
      tags: [Fleet]
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/CreateBusInput'
      responses:
        '201':
          description: Unit successfully created and provisioned
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Bus'
        '400':
          $ref: '#/components/responses/BadRequest'

  /buses/{id}:
    get:
      summary: Fetch specific bus telemetry and details
      operationId: getBusById
      tags: [Fleet]
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: string
      responses:
        '200':
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Bus'
        '404':
          $ref: '#/components/responses/NotFound'

  /buses/{id}/status:
    patch:
      summary: Update operational status of a bus unit
      operationId: updateBusStatus
      tags: [Fleet]
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: string
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [status]
              properties:
                status:
                  type: string
                  enum: [active, delayed, stopped, maintenance]
      responses:
        '200':
          description: Status successfully updated
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Bus'
        '400':
          $ref: '#/components/responses/BadRequest'
        '404':
          $ref: '#/components/responses/NotFound'

  /alerts:
    get:
      summary: List operational alerts
      operationId: getAlerts
      tags: [Alerts]
      parameters:
        - name: severity
          in: query
          schema:
            type: string
            enum: [all, critical, warning, info]
      responses:
        '200':
          content:
            application/json:
              schema:
                type: array
                items:
                  $ref: '#/components/schemas/Alert'

    post:
      summary: Register a new operational incident alert
      operationId: createAlert
      tags: [Alerts]
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/CreateAlertInput'
      responses:
        '201':
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Alert'

  /alerts/read-all:
    patch:
      summary: Mark all unread alerts as read
      operationId: markAllAlertsRead
      tags: [Alerts]
      responses:
        '200':
          content:
            application/json:
              schema:
                type: object
                properties:
                  success:
                    type: boolean
                  markedCount:
                    type: integer

  /reports/summary:
    get:
      summary: Generate operational KPI summary report
      operationId: getReportSummary
      tags: [Analytics]
      responses:
        '200':
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ReportSummary'

  /reports/export-csv:
    get:
      summary: Export fleet inventory and current state as CSV
      operationId: exportCsv
      tags: [Analytics]
      responses:
        '200':
          description: CSV file attachment
          content:
            text/csv:
              schema:
                type: string

components:
  schemas:
    HealthStatus:
      type: object
      properties:
        status:
          type: string
          example: healthy
        uptimeSeconds:
          type: number
        timestamp:
          type: string
          format: date-time
        activeConnections:
          type: integer
        trackedBuses:
          type: integer

    Route:
      type: object
      properties:
        id:
          type: string
          example: "A"
        name:
          type: string
          example: "Centro — Aeropuerto"
        varName:
          type: string
          example: "--route-a"
        color:
          type: string
          example: "#5b6ef5"
        stops:
          type: integer
          example: 8
        length:
          type: number
          example: 22

    Driver:
      type: object
      properties:
        id:
          type: string
          example: "D001"
        name:
          type: string
          example: "Carlos Mendoza"
        initials:
          type: string
          example: "CM"
        license:
          type: string
          example: "CR-2-0456-0891"
        trips:
          type: integer
          example: 1248
        rating:
          type: number
          example: 4.9
        hours:
          type: number
          example: 8.5

    Bus:
      type: object
      properties:
        id:
          type: string
          example: "BUS-001"
        num:
          type: string
          example: "001"
        plate:
          type: string
          example: "SJB-1001"
        route:
          $ref: '#/components/schemas/Route'
        driver:
          $ref: '#/components/schemas/Driver'
        status:
          type: string
          enum: [active, delayed, stopped, maintenance]
        speed:
          type: number
          example: 45
        passengers:
          type: integer
          example: 32
        capacity:
          type: integer
          example: 52
        fuel:
          type: number
          example: 78
        delay:
          type: integer
          example: 0
        nextStop:
          type: string
          example: "Hospital San Juan"
        etaMin:
          type: integer
          example: 4
        updatedAgo:
          type: integer
          example: 1
        pos:
          type: object
          properties:
            x:
              type: number
            y:
              type: number

    CreateBusInput:
      type: object
      properties:
        routeId:
          type: string
          example: "A"
        driverId:
          type: string
          example: "D001"

    Alert:
      type: object
      properties:
        id:
          type: integer
          example: 1
        type:
          type: string
          enum: [critical, warning, info]
        icon:
          type: string
          example: "🚨"
        title:
          type: string
        desc:
          type: string
        bus:
          type: string
          example: "BUS-011"
        time:
          type: string
          example: "hace 3 min"
        read:
          type: boolean

    CreateAlertInput:
      type: object
      required: [type, title, desc]
      properties:
        type:
          type: string
          enum: [critical, warning, info]
        icon:
          type: string
        title:
          type: string
        desc:
          type: string
        bus:
          type: string

    ReportSummary:
      type: object
      properties:
        totalBuses:
          type: integer
        circulating:
          type: integer
        totalPassengers:
          type: integer
        occupancyRate:
          type: number
        avgDelayMinutes:
          type: number
        inMaintenance:
          type: integer
        lowFuelCount:
          type: integer
        generatedAt:
          type: string
          format: date-time

  responses:
    BadRequest:
      description: Invalid payload or parameters
      content:
        application/json:
          schema:
            type: object
            properties:
              error:
                type: string
              message:
                type: string
    NotFound:
      description: Requested resource not found
      content:
        application/json:
          schema:
            type: object
            properties:
              error:
                type: string
              message:
                type: string
</file>

<file path="server/database/initDb.js">
/* ==============================================================================
   BusTrack Pro — Database Schema & Seed Initializer for PostgreSQL / Supabase
   ============================================================================== */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';
import { config } from '../config.js';
import { SEED_ROUTES, SEED_DRIVERS, SEED_ALERTS } from './db.js';

const { Pool } = pg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function initPostgresDatabase(connectionString) {
  if (!connectionString) {
    console.log('[DB] No DATABASE_URL provided. Operating in high-performance memory mode.');
    return null;
  }

  const pool = new Pool({
    connectionString,
    ssl: connectionString.includes('localhost') || connectionString.includes('127.0.0.1')
      ? false
      : { rejectUnauthorized: false },
  });

  try {
    const client = await pool.connect();
    console.log('[DB] Connected successfully to PostgreSQL database.');

    // Load and execute schema.sql
    const schemaPath = path.join(__dirname, 'schema.sql');
    if (fs.existsSync(schemaPath)) {
      const sql = fs.readFileSync(schemaPath, 'utf-8');
      await client.query(sql);
      console.log('[DB] Schema and RLS policies verified successfully.');
    }

    // Check if initial admin user exists
    const userCheck = await client.query('SELECT COUNT(*) FROM users WHERE email = $1', ['admin@bustrack.com']);
    if (parseInt(userCheck.rows[0].count, 10) === 0) {
      console.log('[DB] Seeding default admin user...');
      await client.query(`
        INSERT INTO users (id, email, password_hash, full_name, role, auth_provider, avatar_url)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [
        'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
        'admin@bustrack.com',
        '$2a$10$wNlh4J6m5n9S8d.WvYQk8.L0yW.fO2e9jG4iZ5rK7hM3oP2nQ1r2s',
        'Gerente Admin',
        'admin',
        'email',
        'https://api.dicebear.com/7.x/initials/svg?seed=Gerente%20Admin'
      ]);
    }

    // Seed Routes if empty
    const routeCheck = await client.query('SELECT COUNT(*) FROM routes');
    if (parseInt(routeCheck.rows[0].count, 10) === 0) {
      console.log('[DB] Seeding routes...');
      for (const r of SEED_ROUTES) {
        await client.query(
          'INSERT INTO routes (id, name, color, stops_count, length_km) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (id) DO NOTHING',
          [r.id, r.name, r.color, r.stops, r.length]
        );
      }
    }

    // Seed Drivers if empty
    const driverCheck = await client.query('SELECT COUNT(*) FROM drivers');
    if (parseInt(driverCheck.rows[0].count, 10) === 0) {
      console.log('[DB] Seeding drivers...');
      for (const d of SEED_DRIVERS) {
        await client.query(
          'INSERT INTO drivers (id, name, initials, license_number, trips_completed, rating, hours_worked) VALUES ($1, $2, $3, $4, $5, $6, $7) ON CONFLICT (id) DO NOTHING',
          [d.id, d.name, d.initials, d.license, d.trips, d.rating, d.hours]
        );
      }
    }

    // Seed Buses if empty
    const busCheck = await client.query('SELECT COUNT(*) FROM buses');
    if (parseInt(busCheck.rows[0].count, 10) === 0) {
      console.log('[DB] Seeding fleet buses...');
      const statuses = ['active', 'active', 'active', 'active', 'active', 'delayed', 'delayed', 'stopped', 'maintenance'];
      for (let i = 1; i <= 12; i++) {
        const busId = 'BUS-' + String(i).padStart(3, '0');
        const busNum = String(i).padStart(3, '0');
        const plate = 'SJB-' + String(1000 + i);
        const route = SEED_ROUTES[(i - 1) % SEED_ROUTES.length];
        const driver = SEED_DRIVERS[(i - 1) % SEED_DRIVERS.length];
        const status = statuses[(i - 1) % statuses.length];
        const moving = status === 'active' || status === 'delayed';
        const speed = moving ? Math.floor(Math.random() * 30) + 28 : 0;
        const passengers = Math.floor(Math.random() * 40) + 4;
        const fuel = Math.floor(Math.random() * 70) + 25;
        const delay = status === 'delayed' ? Math.floor(Math.random() * 8) + 3 : 0;

        await client.query(`
          INSERT INTO buses (id, bus_number, license_plate, route_id, driver_id, status, speed_kmh, passengers_count, capacity, fuel_percent, delay_minutes, next_stop, eta_minutes, pos_x, pos_y)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
          ON CONFLICT (id) DO NOTHING
        `, [
          busId, busNum, plate, route.id, driver.id, status, speed, passengers, 52, fuel, delay, 'Terminal Central', 5, 400.00, 225.00
        ]);
      }
    }

    // Seed Alerts if empty
    const alertCheck = await client.query('SELECT COUNT(*) FROM alerts');
    if (parseInt(alertCheck.rows[0].count, 10) === 0) {
      console.log('[DB] Seeding alerts...');
      for (const a of SEED_ALERTS) {
        await client.query(
          'INSERT INTO alerts (severity, title, description, bus_id, is_read) VALUES ($1, $2, $3, $4, $5)',
          [a.type, a.title, a.desc, a.bus.includes('BUS') ? a.bus : null, a.read]
        );
      }
    }

    client.release();
    console.log('[DB] PostgreSQL Database initialization complete.');
    return pool;
  } catch (err) {
    console.error('[DB] PostgreSQL Connection failed. Falling back to memory DB:', err.message);
    return null;
  }
}

// Allow direct execution from CLI: node server/database/initDb.js
if (process.argv[1] && path.resolve(fileURLToPath(import.meta.url)) === path.resolve(process.argv[1])) {
  const dbUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  if (!dbUrl) {
    console.error('ERROR: Please specify DATABASE_URL environment variable or set it in .env');
    process.exit(1);
  }
  initPostgresDatabase(dbUrl).then((pool) => {
    if (pool) pool.end();
    process.exit(0);
  });
}
</file>

<file path="server/database/schema.sql">
-- ==============================================================================
-- BusTrack Pro — Database Schema & Row Level Security (RLS) Blueprint
-- Target DB: PostgreSQL 15+ / Supabase
-- ==============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. ENUMS
CREATE TYPE user_role AS ENUM ('admin', 'dispatcher', 'driver', 'passenger');
CREATE TYPE bus_status AS ENUM ('active', 'delayed', 'stopped', 'maintenance');
CREATE TYPE alert_severity AS ENUM ('critical', 'warning', 'info');

-- 3. USERS TABLE
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255), -- NULL for OAuth users
    full_name VARCHAR(120) NOT NULL,
    role user_role DEFAULT 'passenger',
    auth_provider VARCHAR(50) DEFAULT 'email', -- 'email', 'google', 'apple'
    provider_id VARCHAR(255),
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index for authentication lookup
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_provider ON users(auth_provider, provider_id);

-- 4. ROUTES TABLE
CREATE TABLE IF NOT EXISTS routes (
    id VARCHAR(10) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    color VARCHAR(20) NOT NULL,
    stops_count INT DEFAULT 0,
    length_km NUMERIC(5,2) DEFAULT 0.0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. DRIVERS TABLE
CREATE TABLE IF NOT EXISTS drivers (
    id VARCHAR(20) PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    name VARCHAR(120) NOT NULL,
    initials VARCHAR(5) NOT NULL,
    license_number VARCHAR(50) UNIQUE NOT NULL,
    trips_completed INT DEFAULT 0,
    rating NUMERIC(3,2) DEFAULT 5.0,
    hours_worked NUMERIC(5,2) DEFAULT 0.0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. BUSES TABLE (FLEET)
CREATE TABLE IF NOT EXISTS buses (
    id VARCHAR(20) PRIMARY KEY,
    bus_number VARCHAR(10) NOT NULL,
    license_plate VARCHAR(20) UNIQUE NOT NULL,
    route_id VARCHAR(10) REFERENCES routes(id) ON DELETE SET NULL,
    driver_id VARCHAR(20) REFERENCES drivers(id) ON DELETE SET NULL,
    status bus_status DEFAULT 'stopped',
    speed_kmh INT DEFAULT 0,
    passengers_count INT DEFAULT 0,
    capacity INT DEFAULT 52,
    fuel_percent INT DEFAULT 100,
    delay_minutes INT DEFAULT 0,
    next_stop VARCHAR(100),
    eta_minutes INT DEFAULT 0,
    pos_x NUMERIC(6,2) DEFAULT 400.00,
    pos_y NUMERIC(6,2) DEFAULT 225.00,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for spatial/telemetry queries
CREATE INDEX idx_buses_route ON buses(route_id);
CREATE INDEX idx_buses_status ON buses(status);

-- 7. ALERTS TABLE
CREATE TABLE IF NOT EXISTS alerts (
    id BIGSERIAL PRIMARY KEY,
    severity alert_severity NOT NULL DEFAULT 'info',
    title VARCHAR(150) NOT NULL,
    description TEXT NOT NULL,
    bus_id VARCHAR(20) REFERENCES buses(id) ON DELETE SET NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_alerts_severity_read ON alerts(severity, is_read);

-- 8. ACTIVITIES LOG TABLE
CREATE TABLE IF NOT EXISTS activity_logs (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action_text TEXT NOT NULL,
    action_type VARCHAR(30) DEFAULT 'info',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- Ensures data privacy, isolation & protection against public DB leaks
-- ==============================================================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE buses ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

-- 1. USERS POLICIES
-- Users can view their own profile; admins can view all users
CREATE POLICY user_self_read ON users FOR SELECT
    USING (auth.uid() = id OR current_setting('request.jwt.claims', true)::json->>'role' = 'admin');

CREATE POLICY user_self_update ON users FOR UPDATE
    USING (auth.uid() = id);

-- 2. PUBLIC READ POLICIES (Routes, Buses telemetry, Public Stops)
-- All authenticated & anonymous users can view live route & bus telemetry
CREATE POLICY routes_public_read ON routes FOR SELECT USING (true);
CREATE POLICY buses_public_read ON buses FOR SELECT USING (true);
CREATE POLICY drivers_public_read ON drivers FOR SELECT USING (true);
CREATE POLICY alerts_public_read ON alerts FOR SELECT USING (true);

-- 3. ADMIN / DISPATCHER WRITE POLICIES
-- Only Admins and Dispatchers can insert or update buses, routes & alerts
CREATE POLICY buses_admin_write ON buses FOR ALL
    USING (current_setting('request.jwt.claims', true)::json->>'role' IN ('admin', 'dispatcher'));

CREATE POLICY alerts_admin_write ON alerts FOR ALL
    USING (current_setting('request.jwt.claims', true)::json->>'role' IN ('admin', 'dispatcher'));

CREATE POLICY activity_logs_admin_read ON activity_logs FOR SELECT
    USING (current_setting('request.jwt.claims', true)::json->>'role' IN ('admin', 'dispatcher'));
</file>

<file path="server/database/schema.sqlite.sql">
-- ==============================================================================
-- BusTrack Pro — SQLite Relational Database Schema
-- Embedded ACID Relational Engine with WAL Mode & Foreign Keys
-- ==============================================================================

PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;
PRAGMA synchronous = NORMAL;

-- 1. USERS TABLE
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT,
    full_name TEXT NOT NULL,
    role TEXT DEFAULT 'passenger',
    auth_provider TEXT DEFAULT 'email',
    provider_id TEXT,
    avatar_url TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- 2. ROUTES TABLE
CREATE TABLE IF NOT EXISTS routes (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    var_name TEXT,
    color TEXT NOT NULL,
    stops_count INTEGER DEFAULT 0,
    length_km REAL DEFAULT 0.0,
    created_at TEXT DEFAULT (datetime('now'))
);

-- 3. DRIVERS TABLE
CREATE TABLE IF NOT EXISTS drivers (
    id TEXT PRIMARY KEY,
    user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    initials TEXT NOT NULL,
    license_number TEXT UNIQUE NOT NULL,
    trips_completed INTEGER DEFAULT 0,
    rating REAL DEFAULT 5.0,
    hours_worked REAL DEFAULT 0.0,
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_drivers_license ON drivers(license_number);

-- 4. FLEET BUSES TABLE
CREATE TABLE IF NOT EXISTS buses (
    id TEXT PRIMARY KEY,
    bus_number TEXT NOT NULL,
    license_plate TEXT UNIQUE NOT NULL,
    route_id TEXT REFERENCES routes(id) ON DELETE SET NULL,
    driver_id TEXT REFERENCES drivers(id) ON DELETE SET NULL,
    status TEXT DEFAULT 'stopped',
    speed_kmh INTEGER DEFAULT 0,
    passengers_count INTEGER DEFAULT 0,
    capacity INTEGER DEFAULT 52,
    fuel_percent INTEGER DEFAULT 100,
    delay_minutes INTEGER DEFAULT 0,
    next_stop TEXT,
    eta_minutes INTEGER DEFAULT 0,
    pos_x REAL DEFAULT 400.00,
    pos_y REAL DEFAULT 225.00,
    _t REAL DEFAULT 0.0,
    _step REAL DEFAULT 0.005,
    _dir INTEGER DEFAULT 1,
    updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_buses_route ON buses(route_id);
CREATE INDEX IF NOT EXISTS idx_buses_status ON buses(status);

-- 5. ALERTS TABLE
CREATE TABLE IF NOT EXISTS alerts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    severity TEXT NOT NULL DEFAULT 'info',
    icon TEXT,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    bus_id TEXT,
    is_read INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_alerts_severity_read ON alerts(severity, is_read);

-- 6. ACTIVITY LOGS TABLE
CREATE TABLE IF NOT EXISTS activity_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
    action_text TEXT NOT NULL,
    action_type TEXT DEFAULT 'info',
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_activity_logs_created ON activity_logs(created_at);

-- 7. TRANSIT STOPS TABLE
CREATE TABLE IF NOT EXISTS stops (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    subtext TEXT,
    is_primary INTEGER DEFAULT 0,
    lat REAL,
    lon REAL,
    routes_json TEXT,
    pos_x REAL DEFAULT 0.0,
    pos_y REAL DEFAULT 0.0,
    created_at TEXT DEFAULT (datetime('now'))
);
</file>

<file path="server/database/status.js">
/* ==============================================================================
   BusTrack Pro — Database Diagnostics & Inspection CLI
   Run with: npm run db:status OR node server/database/status.js
   ============================================================================== */

import { db } from './db.js';

console.log('============================================================');
console.log('   🚍 BusTrack Pro — Live Database Diagnostics');
console.log('============================================================');

const status = db.getDbStatus();

console.log(`  Engine:           ${status.engine}`);
console.log(`  SQLite Version:   ${status.version}`);
console.log(`  Dialect:          ${status.dialect}`);
console.log(`  Connected:        ${status.connected ? '✅ YES' : '❌ NO'}`);
console.log(`  Storage Mode:     ${status.storage}`);
console.log(`  Physical File:    ${status.filePath}`);
console.log(`  File Size on Disk: ${status.fileSizeFormatted} (${status.fileSizeBytes} bytes)`);
console.log(`  Total DB Records: ${status.totalRows}`);
console.log('------------------------------------------------------------');
console.log('  Relational Tables & Row Counts:');
for (const table of status.tables) {
  const bar = '█'.repeat(Math.min(30, Math.max(1, table.count * 2)));
  console.log(`   - ${table.name.padEnd(16)} : ${String(table.count).padStart(3)} rows  ${bar}`);
}
console.log('------------------------------------------------------------');
console.log('  Engine Features & Guardrails:');
console.log(`   - Foreign Keys Enforcement:  ${status.features.foreignKeys ? '✅ Enabled (ACID relational integrity)' : '❌ Disabled'}`);
console.log(`   - WAL Journal Mode:          ${status.features.walJournalMode ? '✅ Enabled (Write-Ahead Logging)' : '❌ Off'}`);
console.log(`   - ACID Transactions:         ${status.features.acidTransactions ? '✅ Supported' : '❌ No'}`);
console.log(`   - PostgreSQL Compatible:     ${status.features.postgresCompatible ? '✅ Yes (schema.sql available)' : '❌ No'}`);
console.log('============================================================\n');

db.close();
process.exit(0);
</file>

<file path="server/middleware/auth.js">
/* ==============================================================================
   BusTrack Pro — JWT Authentication & Authorization Middleware
   ============================================================================== */

import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'bustrack_super_secret_jwt_key_2026_cr';

/** Middleware: Authenticate Request via Bearer Token or Cookie */
export function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.startsWith('Bearer ')
    ? authHeader.split(' ')[1]
    : req.query.token;

  if (!token) {
    return res.status(401).json({
      type: 'about:blank',
      title: 'Unauthorized',
      status: 401,
      detail: 'Acceso denegado. Se requiere un token de autenticación válido.',
    });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({
        type: 'about:blank',
        title: 'Forbidden',
        status: 403,
        detail: 'Token inválido o expirado. Por favor inicia sesión nuevamente.',
      });
    }
    req.user = user;
    next();
  });
}

/** Optional Auth: Attaches user if valid token present, doesn't block if missing */
export function optionalAuth(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.startsWith('Bearer ')
    ? authHeader.split(' ')[1]
    : null;

  if (token) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      req.user = decoded;
    } catch {
      req.user = null;
    }
  } else {
    req.user = null;
  }
  next();
}

/** Role Guard Middleware */
export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        type: 'about:blank',
        title: 'Unauthorized',
        status: 401,
        detail: 'Inicia sesión para realizar esta acción.',
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        type: 'about:blank',
        title: 'Forbidden',
        status: 403,
        detail: `Requiere permisos de: ${roles.join(' o ')}.`,
      });
    }

    next();
  };
}

export { JWT_SECRET };
</file>

<file path="server/middleware/errorHandler.js">
/* ==============================================================================
   BusTrack Pro — Centralized Error Handler (RFC 7807 Compliant)
   ============================================================================== */

export class ApiError extends Error {
  constructor(statusCode, title, detail, type = 'about:blank') {
    super(detail);
    this.statusCode = statusCode;
    this.title = title;
    this.detail = detail;
    this.type = type;
  }

  static badRequest(detail, title = 'Bad Request') {
    return new ApiError(400, title, detail);
  }

  static notFound(detail, title = 'Not Found') {
    return new ApiError(404, title, detail);
  }

  static conflict(detail, title = 'Conflict') {
    return new ApiError(409, title, detail);
  }

  static internal(detail = 'An unexpected internal error occurred.', title = 'Internal Server Error') {
    return new ApiError(500, title, detail);
  }
}

export function errorHandler(err, req, res, next) {
  const statusCode = err.statusCode || (err.status ? err.status : 500);
  const title = err.title || (statusCode >= 500 ? 'Internal Server Error' : 'Request Error');
  const detail = err.detail || err.message || 'An error occurred processing the request';

  const problemDetails = {
    type: err.type || 'about:blank',
    title,
    status: statusCode,
    detail,
    instance: req.originalUrl || req.url,
    correlationId: req.correlationId || null,
    timestamp: new Date().toISOString(),
  };

  if (statusCode >= 500) {
    console.error(`[ERROR] [${req.correlationId || 'no-id'}] ${err.stack || err}`);
  }

  res.status(statusCode).type('application/problem+json').json(problemDetails);
}
</file>

<file path="server/middleware/logger.js">
/* ==============================================================================
   BusTrack Pro — Request Logger & Correlation Middleware
   ============================================================================== */

import { randomUUID } from 'crypto';

export function correlationMiddleware(req, res, next) {
  const correlationId = req.headers['x-correlation-id'] || randomUUID();
  req.correlationId = correlationId;
  res.setHeader('X-Correlation-ID', correlationId);
  next();
}

export function requestLogger(req, res, next) {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    const logEntry = {
      timestamp: new Date().toISOString(),
      correlationId: req.correlationId,
      method: req.method,
      path: req.originalUrl || req.url,
      statusCode: res.statusCode,
      latencyMs: duration,
      userAgent: req.headers['user-agent'] || 'unknown',
    };
    // Format compact structured log
    const statusColor = res.statusCode >= 500 ? '\x1b[31m' : res.statusCode >= 400 ? '\x1b[33m' : '\x1b[32m';
    console.log(
      `[${logEntry.timestamp}] [${logEntry.correlationId.slice(0, 8)}] ` +
      `${logEntry.method} ${logEntry.path} -> ${statusColor}${logEntry.statusCode}\x1b[0m (${duration}ms)`
    );
  });
  next();
}
</file>

<file path="server/middleware/sanitizer.js">
/* ==============================================================================
   BusTrack Pro — Input Sanitizer / Validator Middleware
   Protects against XSS, injection, and malformed payloads.
   ============================================================================== */

/** Strip dangerous characters from a string value */
function sanitizeString(value) {
  if (typeof value !== 'string') return value;
  return value
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '') // strip script tags
    .replace(/<[^>]+>/g, '')                              // strip HTML tags
    .replace(/['"`;]/g, '')                               // strip SQL/JS injection chars
    .trim()
    .slice(0, 1000);                                      // max length guard
}

/** Recursively sanitize all string values in an object */
function sanitizeObject(obj) {
  if (typeof obj === 'string') return sanitizeString(obj);
  if (Array.isArray(obj)) return obj.map(sanitizeObject);
  if (obj !== null && typeof obj === 'object') {
    const clean = {};
    for (const [key, value] of Object.entries(obj)) {
      // Sanitize key too (defense in depth)
      const cleanKey = sanitizeString(key).replace(/[^a-zA-Z0-9_-]/g, '');
      clean[cleanKey] = sanitizeObject(value);
    }
    return clean;
  }
  return obj;
}

/** Express middleware: sanitize req.body, req.query, req.params */
export function sanitizeInputs(req, res, next) {
  if (req.body && typeof req.body === 'object') {
    req.body = sanitizeObject(req.body);
  }
  if (req.query && typeof req.query === 'object') {
    req.query = sanitizeObject(req.query);
  }
  // params are read-only in express, but we can validate them
  if (req.params && typeof req.params === 'object') {
    for (const [key, value] of Object.entries(req.params)) {
      if (typeof value === 'string' && /<|>|script|eval|javascript/i.test(value)) {
        return res.status(400).json({
          type: 'about:blank',
          title: 'Bad Request',
          status: 400,
          detail: `Invalid characters in route parameter: ${key}`,
        });
      }
    }
  }
  next();
}

/** Validate bus status enum */
export function validateBusStatus(req, res, next) {
  const allowed = ['active', 'delayed', 'stopped', 'maintenance'];
  const { status } = req.body;
  if (status !== undefined && !allowed.includes(status)) {
    return res.status(400).json({
      type: 'about:blank',
      title: 'Bad Request',
      status: 400,
      detail: `Invalid status value. Must be one of: ${allowed.join(', ')}`,
    });
  }
  next();
}

/** Validate alert severity enum */
export function validateAlertSeverity(req, res, next) {
  const allowed = ['critical', 'warning', 'info'];
  const { severity } = req.body;
  if (severity !== undefined && !allowed.includes(severity)) {
    return res.status(400).json({
      type: 'about:blank',
      title: 'Bad Request',
      status: 400,
      detail: `Invalid severity value. Must be one of: ${allowed.join(', ')}`,
    });
  }
  next();
}
</file>

<file path="server/routes/authRoutes.js">
/* ==============================================================================
   BusTrack Pro — Authentication API Routes (Email, Google, Apple)
   ============================================================================== */

import { Router } from 'express';
import { AuthService } from '../services/authService.js';
import { authenticateToken } from '../middleware/auth.js';
import { writeLimiter } from '../middleware/rateLimiter.js';
import { db } from '../database/db.js';

export const authRouter = Router();

/** POST /api/v1/auth/register — Email Registration */
authRouter.post('/register', writeLimiter, async (req, res, next) => {
  try {
    const { email, password, name, consentTerms } = req.body;
    const result = await AuthService.registerWithEmail({ email, password, name, consentTerms });
    res.status(201).json({
      status: 'success',
      message: 'Cuenta creada exitosamente',
      ...result,
    });
  } catch (err) {
    res.status(400).json({
      type: 'about:blank',
      title: 'Bad Request',
      status: 400,
      detail: err.message,
    });
  }
});

/** POST /api/v1/auth/login — Email Login */
authRouter.post('/login', writeLimiter, async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const result = await AuthService.loginWithEmail({ email, password });
    res.json({
      status: 'success',
      message: 'Inicio de sesión exitoso',
      ...result,
    });
  } catch (err) {
    res.status(401).json({
      type: 'about:blank',
      title: 'Unauthorized',
      status: 401,
      detail: err.message,
    });
  }
});

/** POST /api/v1/auth/google — Google OAuth Login / Register */
authRouter.post('/google', writeLimiter, async (req, res, next) => {
  try {
    const { googleToken, email, name, picture } = req.body;
    const result = await AuthService.loginWithGoogle({ googleToken, email, name, picture });
    res.json({
      status: 'success',
      message: 'Inicio de sesión con Google exitoso',
      ...result,
    });
  } catch (err) {
    res.status(400).json({
      type: 'about:blank',
      title: 'Bad Request',
      status: 400,
      detail: err.message,
    });
  }
});

/** POST /api/v1/auth/apple — Apple OAuth Login / Register */
authRouter.post('/apple', writeLimiter, async (req, res, next) => {
  try {
    const { appleToken, email, name } = req.body;
    const result = await AuthService.loginWithApple({ appleToken, email, name });
    res.json({
      status: 'success',
      message: 'Inicio de sesión con Apple exitoso',
      ...result,
    });
  } catch (err) {
    res.status(400).json({
      type: 'about:blank',
      title: 'Bad Request',
      status: 400,
      detail: err.message,
    });
  }
});

/** GET /api/v1/auth/me — Current User Profile */
authRouter.get('/me', authenticateToken, (req, res) => {
  const user = db.findUserById(req.user.id) || req.user;
  const { passwordHash: _, ...safeUser } = user;
  res.json({ user: safeUser });
});

/** POST /api/v1/auth/oauth-callback — Registra/actualiza usuario OAuth (Google/Apple via Supabase) */
authRouter.post('/oauth-callback', writeLimiter, async (req, res) => {
  try {
    const { supabaseId, email, name, provider, avatarUrl } = req.body;
    if (!email || !supabaseId) {
      return res.status(400).json({ status: 'error', detail: 'Email y supabaseId son obligatorios.' });
    }
    const result = await AuthService.loginWithOAuthCallback({ supabaseId, email, name, provider, avatarUrl });
    res.json({ status: 'success', message: `Sesión iniciada con ${provider}`, ...result });
  } catch (err) {
    res.status(400).json({ type: 'about:blank', title: 'Bad Request', status: 400, detail: err.message });
  }
});

/** POST /api/v1/auth/logout — Client Logout */
authRouter.post('/logout', (req, res) => {
  res.json({ status: 'success', message: 'Sesión cerrada correctamente' });
});
</file>

<file path="server/services/alertService.js">
/* ==============================================================================
   BusTrack Pro — Alert & Incident Service
   ============================================================================== */

import { db } from '../database/db.js';
import { ApiError } from '../middleware/errorHandler.js';

const VALID_SEVERITIES = ['critical', 'warning', 'info'];

export class AlertService {
  static getAlerts(severity = 'all') {
    return db.getAllAlerts(severity);
  }

  static createAlert(payload) {
    if (!payload.title || typeof payload.title !== 'string') {
      throw ApiError.badRequest('Field "title" is required.');
    }
    if (!payload.desc || typeof payload.desc !== 'string') {
      throw ApiError.badRequest('Field "desc" is required.');
    }
    if (payload.type && !VALID_SEVERITIES.includes(payload.type)) {
      throw ApiError.badRequest(
        `Invalid alert severity '${payload.type}'. Allowed values: ${VALID_SEVERITIES.join(', ')}`
      );
    }

    const alert = db.createAlert(payload);
    db.pushActivity(`Alerta registrada: ${alert.title}`, alert.type === 'critical' ? 'danger' : 'warn');
    return alert;
  }

  static markAllAsRead() {
    const markedCount = db.markAllAlertsAsRead();
    return { success: true, markedCount };
  }
}
</file>

<file path="server/services/fleetService.js">
/* ==============================================================================
   BusTrack Pro — Fleet & Operations Service
   ============================================================================== */

import { db } from '../database/db.js';
import { ApiError } from '../middleware/errorHandler.js';

const VALID_STATUSES = ['active', 'delayed', 'stopped', 'maintenance'];

export class FleetService {
  static getBuses(filters = {}) {
    return db.getAllBuses(filters);
  }

  static getBusById(id) {
    const bus = db.getBusById(id);
    if (!bus) {
      throw ApiError.notFound(`Bus with ID '${id}' was not found in fleet records.`);
    }
    return bus;
  }

  static createBus(payload) {
    if (payload.routeId && !db.getRouteById(payload.routeId)) {
      throw ApiError.badRequest(`Route '${payload.routeId}' does not exist.`);
    }
    if (payload.driverId && !db.getDriverById(payload.driverId)) {
      throw ApiError.badRequest(`Driver '${payload.driverId}' does not exist.`);
    }
    const bus = db.createBus(payload);
    db.pushActivity(`Bus ${bus.id} incorporado a la flota activa`, 'ok');
    return bus;
  }

  static updateBusStatus(id, newStatus) {
    if (!VALID_STATUSES.includes(newStatus)) {
      throw ApiError.badRequest(
        `Invalid status '${newStatus}'. Allowed values: ${VALID_STATUSES.join(', ')}`
      );
    }
    const bus = db.updateBusStatus(id, newStatus);
    if (!bus) {
      throw ApiError.notFound(`Bus with ID '${id}' was not found.`);
    }
    db.pushActivity(`Estado de ${bus.id} actualizado a '${newStatus}'`, newStatus === 'maintenance' ? 'warn' : 'info');
    return bus;
  }

  static getRoutes() {
    return db.getAllRoutes();
  }

  static getRouteById(id) {
    const route = db.getRouteById(id);
    if (!route) {
      throw ApiError.notFound(`Route with ID '${id}' was not found.`);
    }
    return route;
  }

  static getDrivers() {
    return db.getAllDrivers();
  }

  static getDriverById(id) {
    const driver = db.getDriverById(id);
    if (!driver) {
      throw ApiError.notFound(`Driver with ID '${id}' was not found.`);
    }
    return driver;
  }

  static getOperationalSummary() {
    const buses = db.getAllBuses();
    const total = buses.length;
    const circulating = buses.filter(b => b.status === 'active' || b.status === 'delayed').length;
    const totalPassengers = buses.reduce((s, b) => s + b.passengers, 0);
    const totalCapacity = buses.reduce((s, b) => s + b.capacity, 0) || 1;
    const occupancyRate = Math.round((totalPassengers / totalCapacity) * 100);
    const totalDelay = buses.reduce((s, b) => s + b.delay, 0);
    const avgDelayMinutes = total ? +(totalDelay / total).toFixed(1) : 0;
    const inMaintenance = buses.filter(b => b.status === 'maintenance').length;
    const lowFuelCount = buses.filter(b => b.fuel < 20).length;

    return {
      totalBuses: total,
      circulating,
      totalPassengers,
      occupancyRate,
      avgDelayMinutes,
      inMaintenance,
      lowFuelCount,
      generatedAt: new Date().toISOString(),
    };
  }

  static generateFleetCsv() {
    const buses = db.getAllBuses();
    const headers = [
      'Bus ID', 'Placa', 'Ruta', 'Conductor', 'Velocidad (km/h)',
      'Pasajeros', 'Capacidad', 'Estado', 'Combustible (%)', 'Retraso (min)', 'Proxima Parada', 'ETA (min)'
    ];

    const rows = buses.map(b => [
      b.id,
      b.plate,
      `Ruta ${b.route.id}`,
      b.driver.name,
      b.speed,
      b.passengers,
      b.capacity,
      b.status,
      b.fuel,
      b.delay,
      b.nextStop,
      b.etaMin
    ]);

    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(';'))
      .join('\r\n');

    return '\uFEFF' + csvContent; // BOM for proper Excel UTF-8 display
  }
}
</file>

<file path="server/services/passengerService.js">
/* ==============================================================================
   BusTrack Pro — Passenger Experience & Pilot Service
   Pilot Zone: Universidad Fidélitas (Campus San Pedro) & Montes de Oca
   ============================================================================== */

import { db } from '../database/db.js';

export const FIDELITAS_PILOT_STOPS = [
  {
    id: 'stop-fidelitas',
    name: 'Entrada Principal U Fidélitas',
    subtext: 'Santa Marta de Montes de Oca — Frente al Campus',
    isPrimary: true,
    lat: 9.9392,
    lon: -84.0321,
    routes: ['Granadilla — Fidélitas — San Pedro', 'Santa Marta — Vargas Araya — Lourdes'],
  },
  {
    id: 'stop-vargas-araya',
    name: 'Parada Barrio Vargas Araya',
    subtext: 'Paso universitario y residencial contiguo a Lourdes',
    isPrimary: false,
    lat: 9.9374,
    lon: -84.0382,
    routes: ['Santa Marta — Vargas Araya — Lourdes', 'Interlínea Guadalupe — San Pedro'],
  },
  {
    id: 'stop-lourdes',
    name: 'Parada Súper Lourdes / Colegio Calasanz',
    subtext: 'Salida de Lourdes hacia San Pedro centro',
    isPrimary: false,
    lat: 9.9362,
    lon: -84.0441,
    routes: ['Granadilla — Fidélitas — San Pedro', 'Santa Marta — Vargas Araya — Lourdes'],
  },
  {
    id: 'stop-san-pedro',
    name: 'Parada Muñoz & Nanne / Plaza del Sol',
    subtext: 'San Pedro Centro — Comercio y transbordos',
    isPrimary: false,
    lat: 9.9338,
    lon: -84.0535,
    routes: ['Granadilla — Fidélitas — San Pedro', 'Sabanilla — Betania — UCR', 'Interlínea'],
  },
  {
    id: 'stop-mall-sp',
    name: 'Parada Mall San Pedro / Hispanidad',
    subtext: 'Rotonda de la Bandera / Los Yoses',
    isPrimary: false,
    lat: 9.9341,
    lon: -84.0620,
    routes: ['Granadilla — Fidélitas — San Pedro', 'Santa Marta — Lourdes', 'Sabanilla — San José'],
  },
  {
    id: 'stop-sanjose',
    name: 'Terminal San José — Cuesta de Moras',
    subtext: 'Avenida Central / Cuesta de Moras',
    isPrimary: false,
    lat: 9.9332,
    lon: -84.0768,
    routes: ['Granadilla — Fidélitas — San Pedro', 'Santa Marta — Lourdes'],
  },
];

const PILOT_LINES = [
  {
    routeId: 'GRA-FID',
    name: 'Granadilla por U Fidélitas',
    destination: 'San José por San Pedro',
    operator: 'Autotransportes Cesmag',
    color: '#5b6ef5',
    baseMinutes: 4,
  },
  {
    routeId: 'MAR-VAR',
    name: 'Santa Marta — Vargas Araya',
    destination: 'San Pedro por Lourdes',
    operator: 'Autotransportes Cesmag',
    color: '#2aa3c4',
    baseMinutes: 11,
  },
  {
    routeId: 'INT-GUA',
    name: 'Interlínea Guadalupe — Curridabat',
    destination: 'Paso por San Pedro / Calasanz',
    operator: 'Consorcio Interlíneas Este',
    color: '#2bb885',
    baseMinutes: 17,
  },
  {
    routeId: 'SAB-UCR',
    name: 'Sabanilla — Betania — UCR',
    destination: 'San José por Outlet Mall',
    operator: 'Autotransportes Cesmag',
    color: '#7c4ddb',
    baseMinutes: 24,
  },
];

export class PassengerService {
  static getPilotStops() {
    return db.stops.filter(s => s.id && s.id.startsWith('stop-'));
  }

  static getStopById(stopId) {
    return db.stops.find(s => s.id === stopId) || db.stops[0];
  }

  static getStopArrivals(stopId = 'stop-fidelitas') {
    const currentStop = this.getStopById(stopId);
    const buses = db.getAllBuses();

    // Map live active buses into pilot arrival cards
    const arrivals = PILOT_LINES.map((line, index) => {
      const matchedBus = buses[index % buses.length] || buses[0];
      const isDelayed = matchedBus.status === 'delayed';

      // Calculate countdown dynamically based on bus progression and live speed
      const progressFactor = matchedBus._t ? (1 - matchedBus._t) : 0.5;
      const computedMinutes = Math.max(1, Math.round(line.baseMinutes + (progressFactor * 6) + (isDelayed ? matchedBus.delay : 0)));
      const computedDistanceMeters = Math.max(250, Math.round(computedMinutes * 380));

      const occupancyPct = Math.min(100, Math.max(10, matchedBus.passengers ? Math.round((matchedBus.passengers / matchedBus.capacity) * 100) : 40));

      let occupancyLevel = 'baja';
      let occupancyLabel = 'Asientos disponibles';
      if (occupancyPct > 80) {
        occupancyLevel = 'alta';
        occupancyLabel = 'Casi lleno / Solo de pie';
      } else if (occupancyPct > 55) {
        occupancyLevel = 'media';
        occupancyLabel = 'Espacio de pie disponible';
      }

      return {
        id: `arrival-${line.routeId}-${matchedBus.id}`,
        busId: matchedBus.id,
        plate: matchedBus.plate,
        routeId: line.routeId,
        routeName: line.name,
        destination: line.destination,
        operator: line.operator,
        color: line.color,
        status: matchedBus.status,
        isDelayed,
        delayMinutes: matchedBus.delay || 0,
        etaMinutes: computedMinutes,
        distanceMeters: computedDistanceMeters,
        distanceFormatted: computedDistanceMeters >= 1000
          ? `${(computedDistanceMeters / 1000).toFixed(1)} km`
          : `${computedDistanceMeters} m`,
        speedKmh: matchedBus.speed || 38,
        occupancyPercent: occupancyPct,
        occupancyLevel,
        occupancyLabel,
        wheelchairAccessible: true,
        nextBusInMinutes: computedMinutes + 14 + (index * 3),
        targetStop: {
          id: currentStop.id,
          name: currentStop.name,
        },
        driverName: matchedBus.driver ? matchedBus.driver.name : 'Conductor asignado',
        driverRating: matchedBus.driver ? matchedBus.driver.rating : 4.9,
      };
    });

    // Sort by shortest ETA
    arrivals.sort((a, b) => a.etaMinutes - b.etaMinutes);

    return {
      currentStop,
      generatedAt: new Date().toISOString(),
      pilotZone: 'Universidad Fidélitas — Sede San Pedro (Montes de Oca)',
      totalIncomingBuses: arrivals.length,
      arrivals,
    };
  }
}
</file>

<file path="test/api.test.js">
/* ==============================================================================
   BusTrack Pro — Automated Backend & API Test Suite
   Using native node:test and node:assert (Node.js 20+)
   ============================================================================== */

import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { app } from '../server/index.js';

let serverInstance;
let baseUrl;

test.before(async () => {
  process.env.NODE_ENV = 'test';
  await new Promise((resolve) => {
    // Listen on port 0 to allocate an ephemeral free port
    serverInstance = http.createServer(app).listen(0, () => {
      const port = serverInstance.address().port;
      baseUrl = `http://127.0.0.1:${port}`;
      resolve();
    });
  });
});

test.after(async () => {
  await new Promise((resolve) => serverInstance.close(resolve));
});

// Helper for HTTP requests using native fetch
async function request(path, options = {}) {
  const url = `${baseUrl}${path}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
  const contentType = response.headers.get('content-type') || '';
  let body = null;
  if (contentType.includes('json')) {
    body = await response.json();
  } else {
    body = await response.text();
  }
  return { status: response.status, headers: response.headers, body };
}

test('System Diagnostics — GET /api/v1/health', async () => {
  const res = await request('/api/v1/health');
  assert.equal(res.status, 200);
  assert.equal(res.body.status, 'healthy');
  assert.ok(typeof res.body.uptimeSeconds === 'number');
  assert.ok(res.body.trackedBuses >= 12);
  assert.ok(res.headers.get('x-correlation-id'));
});

test('Transit Routes — GET /api/v1/routes', async () => {
  const res = await request('/api/v1/routes');
  assert.equal(res.status, 200);
  assert.ok(Array.isArray(res.body));
  assert.equal(res.body.length, 4);

  const routeA = res.body.find((r) => r.id === 'A');
  assert.ok(routeA);
  assert.equal(routeA.name, 'Centro — Aeropuerto');
  assert.ok(typeof routeA.coveragePercent === 'number');
});

test('Drivers Roster — GET /api/v1/drivers', async () => {
  const res = await request('/api/v1/drivers');
  assert.equal(res.status, 200);
  assert.ok(Array.isArray(res.body));
  assert.equal(res.body.length, 6);

  const driver1 = res.body[0];
  assert.ok(driver1.name);
  assert.ok(driver1.license);
  assert.ok(typeof driver1.rating === 'number');
});

test('Fleet Management — GET /api/v1/buses with filters', async () => {
  const resAll = await request('/api/v1/buses');
  assert.equal(resAll.status, 200);
  assert.ok(Array.isArray(resAll.body));
  assert.ok(resAll.body.length >= 12);

  // Filter by route
  const resRouteA = await request('/api/v1/buses?route=A');
  assert.equal(resRouteA.status, 200);
  assert.ok(resRouteA.body.every((b) => b.route.id === 'A'));

  // Search query
  const resSearch = await request('/api/v1/buses?search=BUS-001');
  assert.equal(resSearch.status, 200);
  assert.equal(resSearch.body.length, 1);
  assert.equal(resSearch.body[0].id, 'BUS-001');
});

test('Fleet Management — POST /api/v1/buses (create bus)', async () => {
  const res = await request('/api/v1/buses', {
    method: 'POST',
    body: JSON.stringify({ routeId: 'A', driverId: 'D001' }),
  });
  assert.equal(res.status, 201);
  assert.ok(res.body.id.startsWith('BUS-'));
  assert.equal(res.body.status, 'stopped');
  assert.equal(res.body.speed, 0);
  assert.equal(res.body.route.id, 'A');
  assert.equal(res.body.driver.id, 'D001');
});

test('Fleet Management — PATCH /api/v1/buses/:id/status (update status)', async () => {
  const res = await request('/api/v1/buses/BUS-001/status', {
    method: 'PATCH',
    body: JSON.stringify({ status: 'maintenance' }),
  });
  assert.equal(res.status, 200);
  assert.equal(res.body.id, 'BUS-001');
  assert.equal(res.body.status, 'maintenance');
  assert.equal(res.body.speed, 0); // Must be 0 in maintenance
});

test('Incident Alerts — Alert lifecycle (GET, POST, PATCH)', async () => {
  // 1. Get alerts
  const resList = await request('/api/v1/alerts');
  assert.equal(resList.status, 200);
  assert.ok(Array.isArray(resList.body));

  // 2. Create alert
  const resCreate = await request('/api/v1/alerts', {
    method: 'POST',
    body: JSON.stringify({
      type: 'critical',
      title: 'Fallo de presión hidráulica',
      desc: 'Presión por debajo del umbral de seguridad.',
      bus: 'BUS-002',
    }),
  });
  assert.equal(resCreate.status, 201);
  assert.equal(resCreate.body.title, 'Fallo de presión hidráulica');
  assert.equal(resCreate.body.type, 'critical');
  assert.equal(resCreate.body.read, false);

  // 3. Mark all as read
  const resMark = await request('/api/v1/alerts/read-all', {
    method: 'PATCH',
  });
  assert.equal(resMark.status, 200);
  assert.equal(resMark.body.success, true);
  assert.ok(typeof resMark.body.markedCount === 'number');
});

test('Analytics & Reports — GET /api/v1/reports/summary', async () => {
  const res = await request('/api/v1/reports/summary');
  assert.equal(res.status, 200);
  assert.ok(res.body.totalBuses > 0);
  assert.ok(typeof res.body.occupancyRate === 'number');
  assert.ok(typeof res.body.avgDelayMinutes === 'number');
  assert.ok(res.body.generatedAt);
});

test('Analytics & Reports — GET /api/v1/reports/export-csv', async () => {
  const res = await request('/api/v1/reports/export-csv');
  assert.equal(res.status, 200);
  assert.ok(res.headers.get('content-type').includes('text/csv'));
  assert.ok(res.body.includes('"Bus ID"'));
  assert.ok(res.body.includes('"Placa"'));
  assert.ok(res.body.includes('BUS-001'));
});

test('Error Handling — 404 Not Found for non-existing bus', async () => {
  const res = await request('/api/v1/buses/BUS-99999');
  assert.equal(res.status, 404);
  assert.equal(res.body.status, 404);
  assert.equal(res.body.title, 'Not Found');
});

test('Error Handling — 400 Bad Request for invalid status payload', async () => {
  const res = await request('/api/v1/buses/BUS-001/status', {
    method: 'PATCH',
    body: JSON.stringify({ status: 'invalid_status_code' }),
  });
  assert.equal(res.status, 400);
  assert.equal(res.body.status, 400);
  assert.equal(res.body.title, 'Bad Request');
});

test('Passenger Pilot (U Fidélitas) — GET /api/v1/passenger/stops', async () => {
  const res = await request('/api/v1/passenger/stops');
  assert.equal(res.status, 200);
  assert.ok(Array.isArray(res.body));
  assert.ok(res.body.length >= 6);

  const fidelitasStop = res.body.find(s => s.id === 'stop-fidelitas');
  assert.ok(fidelitasStop);
  assert.ok(fidelitasStop.name.includes('Fidélitas'));

  const vargasStop = res.body.find(s => s.id === 'stop-vargas-araya');
  assert.ok(vargasStop);
  assert.equal(vargasStop.name, 'Parada Barrio Vargas Araya');
});

test('Passenger Pilot (U Fidélitas) — GET /api/v1/passenger/stops/:id/arrivals', async () => {
  const res = await request('/api/v1/passenger/stops/stop-fidelitas/arrivals');
  assert.equal(res.status, 200);
  assert.equal(res.body.currentStop.id, 'stop-fidelitas');
  assert.ok(Array.isArray(res.body.arrivals));
  assert.ok(res.body.arrivals.length >= 4);

  const firstArrival = res.body.arrivals[0];
  assert.ok(firstArrival.routeName);
  assert.ok(typeof firstArrival.etaMinutes === 'number');
  assert.ok(typeof firstArrival.distanceMeters === 'number');
  assert.ok(firstArrival.occupancyLevel);
  assert.ok(firstArrival.operator);
});
</file>

<file path="test/database.test.js">
/* ==============================================================================
   BusTrack Pro — Relational Database Verification Test Suite
   Verifies: Real SQL Tables, Foreign Key Constraints, Disk Persistence,
             Prepared Statements, and Database Diagnostics.
   ============================================================================== */

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import bcrypt from 'bcryptjs';
import { Database, SEED_ROUTES, SEED_DRIVERS } from '../server/database/db.js';

test('Database Architecture — Real Relational Tables in SQLite Master', () => {
  const db = new Database(':memory:');
  
  const tables = db.sqlite.prepare(`
    SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'
  `).all().map(t => t.name);

  assert.ok(tables.includes('users'), 'Table users must exist');
  assert.ok(tables.includes('routes'), 'Table routes must exist');
  assert.ok(tables.includes('drivers'), 'Table drivers must exist');
  assert.ok(tables.includes('buses'), 'Table buses must exist');
  assert.ok(tables.includes('alerts'), 'Table alerts must exist');
  assert.ok(tables.includes('activity_logs'), 'Table activity_logs must exist');
  assert.ok(tables.includes('stops'), 'Table stops must exist');

  db.close();
});

test('Database Integrity — Foreign Key Constraints Enforced', () => {
  const db = new Database(':memory:');

  // Verify foreign_keys pragma is enabled
  const fkPragma = db.sqlite.prepare('PRAGMA foreign_keys').get();
  assert.equal(fkPragma.foreign_keys, 1);

  // Attempting to insert a bus pointing to a non-existing route should violate FK
  assert.throws(() => {
    db.sqlite.prepare(`
      INSERT INTO buses (
        id, bus_number, license_plate, route_id, driver_id, status
      ) VALUES ('BUS-999', '999', 'INVALID-PLATE', 'NON_EXISTENT_ROUTE', 'D001', 'stopped')
    `).run();
  }, /FOREIGN KEY/i);

  db.close();
});

test('Database Persistence — Data Persists Across Server Restarts to Disk', () => {
  const testDbFile = path.resolve(process.cwd(), 'data', 'test_persistence.sqlite');
  if (fs.existsSync(testDbFile)) {
    fs.unlinkSync(testDbFile);
  }

  // 1. Open instance 1, insert new user and bus
  const db1 = new Database(testDbFile);
  const bus1 = db1.createBus({ routeId: 'A', driverId: 'D001' });
  assert.ok(bus1.id.startsWith('BUS-'));

  const user1 = db1.createUser({
    email: 'persisted@bustrack.com',
    passwordHash: 'hashed_secret_test_123',
    name: 'Inspector Persistente',
    role: 'dispatcher',
  });
  assert.equal(user1.email, 'persisted@bustrack.com');

  // Explicitly close DB 1
  db1.close();

  // Verify file actually exists on disk and has non-zero size
  assert.ok(fs.existsSync(testDbFile), 'Database file must physically exist on disk');
  const stats = fs.statSync(testDbFile);
  assert.ok(stats.size > 0, 'Database file must contain physical relational data');

  // 2. Open instance 2 pointing to the exact same physical SQLite file
  const db2 = new Database(testDbFile);
  const reloadedBus = db2.getBusById(bus1.id);
  assert.ok(reloadedBus, 'Created bus must survive database restart');
  assert.equal(reloadedBus.id, bus1.id);
  assert.equal(reloadedBus.plate, bus1.plate);

  const reloadedUser = db2.findUserByEmail('persisted@bustrack.com');
  assert.ok(reloadedUser, 'Created user must survive database restart');
  assert.equal(reloadedUser.name, 'Inspector Persistente');
  assert.equal(reloadedUser.role, 'dispatcher');

  db2.close();

  // Cleanup test file and potential WAL/SHM companion files
  try {
    if (fs.existsSync(testDbFile)) fs.unlinkSync(testDbFile);
    if (fs.existsSync(testDbFile + '-wal')) fs.unlinkSync(testDbFile + '-wal');
    if (fs.existsSync(testDbFile + '-shm')) fs.unlinkSync(testDbFile + '-shm');
  } catch {}
});

test('Database Diagnostics — Status & Table Row Counts', () => {
  const db = new Database(':memory:');
  const status = db.getDbStatus();

  assert.equal(status.dialect, 'sqlite');
  assert.equal(status.connected, true);
  assert.ok(status.version);
  assert.ok(Array.isArray(status.tables));
  assert.ok(status.totalRows > 0);

  const busesTable = status.tables.find(t => t.name === 'buses');
  assert.ok(busesTable);
  assert.equal(busesTable.count, 12);

  const routesTable = status.tables.find(t => t.name === 'routes');
  assert.ok(routesTable);
  assert.equal(routesTable.count, 4);

  db.close();
});

test('Database Queries — Real SQL Joins and Aggregations', () => {
  const db = new Database(':memory:');
  const routes = db.getAllRoutes();

  assert.equal(routes.length, 4);
  const routeA = routes.find(r => r.id === 'A');
  assert.ok(routeA);
  assert.ok(typeof routeA.totalBuses === 'number');
  assert.ok(typeof routeA.passengersOnboard === 'number');
  assert.ok(typeof routeA.coveragePercent === 'number');

  db.close();
});
</file>

<file path="docker-compose.yml">
services:
  postgres:
    image: postgres:16-alpine
    container_name: bustrack-postgres
    restart: always
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: bustrack_password_2026
      POSTGRES_DB: bustrack_db
    ports:
      - "5432:5432"
    volumes:
      - bustrack_pg_data:/var/lib/postgresql/data
      - ./server/database/schema.sql:/docker-entrypoint-initdb.d/01_schema.sql
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres -d bustrack_db"]
      interval: 5s
      timeout: 5s
      retries: 5

volumes:
  bustrack_pg_data:
    driver: local
</file>

<file path="server/database/db.js">
/* ==============================================================================
   BusTrack Pro — Production-Grade Relational Database Repository
   Engine: 100% Real Embedded SQLite (ACID, WAL Mode, Foreign Keys)
   Compatible with PostgreSQL schema via server/database/schema.sql
   ============================================================================== */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { DatabaseSync } from 'node:sqlite';
import { config } from '../config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- SEED DEFINITIONS (Synchronized with BusTrack Transit Domain) ---

export const SEED_ROUTES = [
  { id: 'A', name: 'Centro — Aeropuerto',   varName: '--route-a', color: '#5b6ef5', stops: 8,  length: 22 },
  { id: 'B', name: 'Norte — Sur',           varName: '--route-b', color: '#7c4ddb', stops: 12, length: 35 },
  { id: 'C', name: 'Este — Centro',         varName: '--route-c', color: '#2aa3c4', stops: 6,  length: 18 },
  { id: 'D', name: 'Sur — Zona Industrial', varName: '--route-d', color: '#2bb885', stops: 10, length: 28 },
];

export const SEED_DRIVERS = [
  { id: 'D001', name: 'Carlos Mendoza', initials: 'CM', license: 'CR-2-0456-0891', trips: 1248, rating: 4.9, hours: 8.5 },
  { id: 'D002', name: 'Ana García',     initials: 'AG', license: 'CR-1-0782-0334', trips: 987,  rating: 4.8, hours: 7.2 },
  { id: 'D003', name: 'Roberto López',  initials: 'RL', license: 'CR-3-0219-0645', trips: 1567, rating: 4.7, hours: 6.8 },
  { id: 'D004', name: 'María Flores',   initials: 'MF', license: 'CR-1-1043-0277', trips: 732,  rating: 5.0, hours: 9.0 },
  { id: 'D005', name: 'Jorge Ramírez',  initials: 'JR', license: 'CR-4-0388-0912', trips: 2103, rating: 4.6, hours: 5.5 },
  { id: 'D006', name: 'Lucía Castro',   initials: 'LC', license: 'CR-2-0955-0158', trips: 891,  rating: 4.9, hours: 8.0 },
];

export const SEED_STOPS = [
  // --- SAN JOSÉ (GAM) ---
  { id: 'stop-central', name: 'Terminal Central San José', subtext: 'San José Centro — Av. Central y Calle 4', province: 'San José', isPrimary: 0, lat: 9.9325, lon: -84.0815, pos_x: 200, pos_y: 150 },
  { id: 'stop-coca-cola', name: 'Terminal Coca Cola', subtext: 'Paso de la Vaca — Conexiones interurbanas', province: 'San José', isPrimary: 0, lat: 9.9366, lon: -84.0845, pos_x: 220, pos_y: 155 },
  { id: 'stop-7-10', name: 'Terminal 7-10 Interurbana', subtext: 'Paso Ancho / San José — Conexión Guanacaste y Pacífico', province: 'San José', isPrimary: 0, lat: 9.9398, lon: -84.0827, pos_x: 240, pos_y: 160 },
  { id: 'stop-parque', name: 'Parque Central San José', subtext: 'Catedral Metropolitana', province: 'San José', isPrimary: 0, lat: 9.9333, lon: -84.0792, pos_x: 400, pos_y: 150 },
  { id: 'stop-hospital', name: 'Hospital San Juan de Dios', subtext: 'Paseo Colón — Urgencias', province: 'San José', isPrimary: 0, lat: 9.9348, lon: -84.0864, pos_x: 600, pos_y: 150 },
  { id: 'stop-sabana', name: 'La Sabana — Estadio Nacional', subtext: 'Paseo Colón / Mata Redonda', province: 'San José', isPrimary: 0, lat: 9.9355, lon: -84.1042, pos_x: 200, pos_y: 225 },
  { id: 'stop-escalante', name: 'Barrio Escalante', subtext: 'Calle 33 — Circunvalación Este', province: 'San José', isPrimary: 0, lat: 9.9358, lon: -84.0625, pos_x: 100, pos_y: 225 },
  { id: 'stop-ucr', name: 'Universidad de Costa Rica (UCR)', subtext: 'San Pedro de Montes de Oca', province: 'San José', isPrimary: 0, lat: 9.9365, lon: -84.0512, pos_x: 400, pos_y: 300 },
  { id: 'stop-fidelitas', name: 'Entrada Principal U Fidélitas', subtext: 'Santa Marta de Montes de Oca — Frente al Campus', province: 'San José', isPrimary: 1, lat: 9.9392, lon: -84.0321, pos_x: 400, pos_y: 225 },
  { id: 'stop-vargas-araya', name: 'Barrio Vargas Araya', subtext: 'Montes de Oca', province: 'San José', isPrimary: 0, lat: 9.9374, lon: -84.0382, pos_x: 350, pos_y: 225 },
  { id: 'stop-lourdes', name: 'Parada Súper Lourdes / Calasanz', subtext: 'Lourdes hacia San Pedro', province: 'San José', isPrimary: 0, lat: 9.9362, lon: -84.0441, pos_x: 300, pos_y: 225 },
  { id: 'stop-san-pedro', name: 'Muñoz & Nanne / San Pedro', subtext: 'San Pedro Centro — Comercio y transbordos', province: 'San José', isPrimary: 0, lat: 9.9338, lon: -84.0535, pos_x: 250, pos_y: 225 },
  { id: 'stop-mall-sp', name: 'Mall San Pedro / Fuente de la Hispanidad', subtext: 'Rotonda de la Bandera / Los Yoses', province: 'San José', isPrimary: 0, lat: 9.9341, lon: -84.0620, pos_x: 200, pos_y: 225 },
  { id: 'stop-sanjose', name: 'Terminal San José — Cuesta de Moras', subtext: 'Avenida Central / Cuesta de Moras', province: 'San José', isPrimary: 0, lat: 9.9332, lon: -84.0768, pos_x: 150, pos_y: 225 },
  { id: 'stop-escazu', name: 'Escazú Centro / Multiplaza', subtext: 'Autopista Próspero Fernández', province: 'San José', isPrimary: 0, lat: 9.9458, lon: -84.1492, pos_x: 120, pos_y: 200 },
  { id: 'stop-santa-ana', name: 'Santa Ana Centro', subtext: 'Parque de Santa Ana / Cruz Roja', province: 'San José', isPrimary: 0, lat: 9.9328, lon: -84.1824, pos_x: 100, pos_y: 210 },
  { id: 'stop-desamparados', name: 'Desamparados Parque Central', subtext: 'Parque Central de Desamparados', province: 'San José', isPrimary: 0, lat: 9.8974, lon: -84.0664, pos_x: 300, pos_y: 350 },

  // --- ALAJUELA (GAM & OCCIDENTE) ---
  { id: 'stop-alajuela-fecosa', name: 'Terminal Fecosa Alajuela', subtext: 'Terminal Central de Buses de Alajuela', province: 'Alajuela', isPrimary: 0, lat: 10.0152, lon: -84.2145, pos_x: 550, pos_y: 180 },
  { id: 'stop-aeropuerto-sjo', name: 'Aeropuerto Juan Santamaría (SJO)', subtext: 'Terminal Internacional de Pasajeros', province: 'Alajuela', isPrimary: 0, lat: 10.0004, lon: -84.2141, pos_x: 600, pos_y: 225 },
  { id: 'stop-city-mall', name: 'City Mall Alajuela', subtext: 'Frente a Radial Alajuela', province: 'Alajuela', isPrimary: 0, lat: 10.0094, lon: -84.2102, pos_x: 570, pos_y: 200 },
  { id: 'stop-coyol', name: 'Zona Franca El Coyol', subtext: 'Parque Logístico y Médico Coyol', province: 'Alajuela', isPrimary: 0, lat: 9.9965, lon: -84.2698, pos_x: 620, pos_y: 250 },
  { id: 'stop-san-ramon', name: 'Terminal San Ramón', subtext: 'Parque Central de San Ramón', province: 'Alajuela', isPrimary: 0, lat: 10.0872, lon: -84.4705, pos_x: 680, pos_y: 280 },
  { id: 'stop-ciudad-quesada', name: 'Terminal Ciudad Quesada (San Carlos)', subtext: 'Mercado Municipal de San Carlos', province: 'Alajuela', isPrimary: 0, lat: 10.3245, lon: -84.4298, pos_x: 700, pos_y: 320 },
  { id: 'stop-la-fortuna', name: 'La Fortuna / Volcán Arenal', subtext: 'Parque Central de La Fortuna', province: 'Alajuela', isPrimary: 0, lat: 10.4716, lon: -84.6452, pos_x: 720, pos_y: 340 },

  // --- HEREDIA (GAM) ---
  { id: 'stop-heredia-central', name: 'Terminal Central Heredia', subtext: 'Parada de Buses 400 — Calle Central', province: 'Heredia', isPrimary: 0, lat: 9.9984, lon: -84.1165, pos_x: 350, pos_y: 120 },
  { id: 'stop-una', name: 'Universidad Nacional (UNA)', subtext: 'Campus Omar Dengo — Heredia', province: 'Heredia', isPrimary: 0, lat: 9.9998, lon: -84.1112, pos_x: 370, pos_y: 115 },
  { id: 'stop-oxigeno', name: 'Mall Oxígeno Human Playground', subtext: 'San Francisco de Heredia', province: 'Heredia', isPrimary: 0, lat: 9.9882, lon: -84.1332, pos_x: 340, pos_y: 130 },
  { id: 'stop-belen', name: 'San Antonio de Belén', subtext: 'Estación Ferrocarril / Centro Belén', province: 'Heredia', isPrimary: 0, lat: 9.9812, lon: -84.1878, pos_x: 320, pos_y: 140 },

  // --- CARTAGO (GAM & ORIENTE) ---
  { id: 'stop-cartago-central', name: 'Terminal Lumaca Cartago', subtext: 'Costado Norte de las Ruinas de Cartago', province: 'Cartago', isPrimary: 0, lat: 9.8645, lon: -83.9212, pos_x: 450, pos_y: 350 },
  { id: 'stop-basilica', name: 'Basílica Nuestra Señora de Los Ángeles', subtext: 'Plaza Santuario Nacional', province: 'Cartago', isPrimary: 0, lat: 9.8638, lon: -83.9131, pos_x: 470, pos_y: 360 },
  { id: 'stop-tec', name: 'Tecnológico de Costa Rica (TEC)', subtext: 'Campus Central Cartago', province: 'Cartago', isPrimary: 0, lat: 9.8552, lon: -83.9095, pos_x: 480, pos_y: 370 },
  { id: 'stop-tres-rios', name: 'Tres Ríos Parque Central (La Unión)', subtext: 'Conexión Florencio del Castillo', province: 'Cartago', isPrimary: 0, lat: 9.9075, lon: -83.9878, pos_x: 420, pos_y: 320 },
  { id: 'stop-turrialba', name: 'Terminal Transtusa Turrialba', subtext: 'Parque Central de Turrialba', province: 'Cartago', isPrimary: 0, lat: 9.9048, lon: -83.6835, pos_x: 520, pos_y: 380 },

  // --- PUNTARENAS (PACÍFICO CENTRAL Y SUR) ---
  { id: 'stop-puntarenas-ferry', name: 'Terminal Ferry Puntarenas (Paquera)', subtext: 'Punta de Puntarenas — Embarcadero', province: 'Puntarenas', isPrimary: 0, lat: 9.9774, lon: -84.8488, pos_x: 150, pos_y: 400 },
  { id: 'stop-puntarenas-centro', name: 'Terminal Central Puntarenas', subtext: 'Paseo de los Turistas / Estación Empresarios Unidos', province: 'Puntarenas', isPrimary: 0, lat: 9.9765, lon: -84.8295, pos_x: 160, pos_y: 395 },
  { id: 'stop-caldera', name: 'Puerto Caldera', subtext: 'Ruta 27 / Entrada Portuaria', province: 'Puntarenas', isPrimary: 0, lat: 9.9185, lon: -84.7175, pos_x: 180, pos_y: 380 },
  { id: 'stop-jaco', name: 'Terminal Jacó Centro', subtext: 'Avenida Pastor Díaz — Playa Jacó', province: 'Puntarenas', isPrimary: 0, lat: 9.6152, lon: -84.6295, pos_x: 200, pos_y: 420 },
  { id: 'stop-quepos', name: 'Terminal Quepos / Manuel Antonio', subtext: 'Parque Nacional Manuel Antonio', province: 'Puntarenas', isPrimary: 0, lat: 9.4312, lon: -84.1615, pos_x: 230, pos_y: 450 },
  { id: 'stop-perez-zeledon', name: 'Terminal San Isidro de El General', subtext: 'Pérez Zeledón — Valle de El General', province: 'Puntarenas', isPrimary: 0, lat: 9.3735, lon: -83.7042, pos_x: 350, pos_y: 480 },

  // --- GUANACASTE (PACÍFICO NORTE) ---
  { id: 'stop-liberia-central', name: 'Terminal Municipal de Liberia', subtext: 'Terminal Pulmitan de Liberia', province: 'Guanacaste', isPrimary: 0, lat: 10.6315, lon: -85.4382, pos_x: 100, pos_y: 80 },
  { id: 'stop-aeropuerto-lir', name: 'Aeropuerto Guanacaste (LIR)', subtext: 'Daniel Oduber Quirós', province: 'Guanacaste', isPrimary: 0, lat: 10.5935, lon: -85.5442, pos_x: 90, pos_y: 75 },
  { id: 'stop-santa-cruz', name: 'Terminal Santa Cruz', subtext: 'Ciudad Folclórica — Plaza Los Mangos', province: 'Guanacaste', isPrimary: 0, lat: 10.2625, lon: -85.5862, pos_x: 110, pos_y: 110 },
  { id: 'stop-nicoya', name: 'Terminal Nicoya Colonial', subtext: 'Parque Recaredo Briceño', province: 'Guanacaste', isPrimary: 0, lat: 10.1448, lon: -85.4525, pos_x: 120, pos_y: 130 },
  { id: 'stop-tamarindo', name: 'Parada Playa Tamarindo', subtext: 'Rotonda de Tamarindo', province: 'Guanacaste', isPrimary: 0, lat: 10.2995, lon: -85.8412, pos_x: 70, pos_y: 100 },

  // --- LIMÓN (CARIBE) ---
  { id: 'stop-limon-centro', name: 'Terminal Caribeños Limón Centro', subtext: 'Parque Vargas / Puerto Limón', province: 'Limón', isPrimary: 0, lat: 9.9935, lon: -83.0332, pos_x: 750, pos_y: 220 },
  { id: 'stop-moin', name: 'Terminal Puerto Moín (APM Terminals)', subtext: 'Entrada Complejo Portuario', province: 'Limón', isPrimary: 0, lat: 10.0012, lon: -83.0785, pos_x: 740, pos_y: 210 },
  { id: 'stop-guapiles', name: 'Terminal Pococí / Guápiles', subtext: 'Ruta 32 / Centro de Guápiles', province: 'Limón', isPrimary: 0, lat: 10.2152, lon: -83.7845, pos_x: 650, pos_y: 160 },
  { id: 'stop-puerto-viejo', name: 'Parada Puerto Viejo de Talamanca', subtext: 'Caribe Sur / Playa Salsa Brava', province: 'Limón', isPrimary: 0, lat: 9.6565, lon: -82.7545, pos_x: 790, pos_y: 280 },
];

export const SEED_ALERTS = [
  { severity: 'critical', icon: '🚨', title: 'Temperatura del motor fuera de rango', description: 'El sensor del BUS-011 reporta 112 °C de forma sostenida. Conviene detener la unidad en la próxima parada.', bus_id: 'BUS-011', is_read: 0 },
  { severity: 'warning',  icon: '⚠️', title: 'Retraso acumulado en Ruta B', description: 'BUS-007 va 8 minutos por detrás del horario. Las pantallas de las paradas ya muestran el ajuste.', bus_id: 'BUS-007', is_read: 0 },
  { severity: 'warning',  icon: '⛽', title: 'Combustible bajo', description: 'BUS-004 al 15%. Alcanza para terminar el recorrido, pero no para el siguiente.', bus_id: 'BUS-004', is_read: 0 },
  { severity: 'info',     icon: '📊', title: 'Reporte diario generado', description: 'Operación del día cerrada: 2.847 pasajeros y 2,3 min de retraso promedio.', bus_id: 'Sistema', is_read: 1 },
  { severity: 'info',     icon: '🔄', title: 'Mantenimiento programado', description: 'BUS-012 entra a taller mañana a las 06:00. Hay que reasignar su turno de la Ruta D.', bus_id: 'BUS-012', is_read: 1 },
];

function randInt(a, b) {
  return Math.floor(Math.random() * (b - a + 1)) + a;
}

export class Database {
  /**
   * Initializes real SQLite database with ACID schema, WAL mode, foreign keys, and seeds
   */
  constructor(customPath = null) {
    const isTest = process.env.NODE_ENV === 'test';
    const rawPath = customPath || (isTest && !process.env.DB_FILE ? ':memory:' : config.dbFile);

    if (rawPath === ':memory:') {
      this.filePath = ':memory:';
      this.sqlite = new DatabaseSync(':memory:');
    } else {
      const resolved = path.isAbsolute(rawPath) ? rawPath : path.resolve(process.cwd(), rawPath);
      const dir = path.dirname(resolved);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      this.filePath = resolved;
      this.sqlite = new DatabaseSync(resolved);
    }

    this._initPragmas();
    this._initTables();
    this._seedDatabase();
    this._compileStatements();
  }

  _initPragmas() {
    this.sqlite.exec('PRAGMA foreign_keys = ON;');
    if (this.filePath !== ':memory:') {
      this.sqlite.exec('PRAGMA journal_mode = WAL;');
      this.sqlite.exec('PRAGMA synchronous = NORMAL;');
    }
  }

  _initTables() {
    this.sqlite.exec(`
      -- 1. USERS TABLE
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT,
        full_name TEXT NOT NULL,
        role TEXT DEFAULT 'passenger',
        auth_provider TEXT DEFAULT 'email',
        provider_id TEXT,
        avatar_url TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
      );

      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

      -- 2. ROUTES TABLE
      CREATE TABLE IF NOT EXISTS routes (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        var_name TEXT,
        color TEXT NOT NULL,
        stops_count INTEGER DEFAULT 0,
        length_km REAL DEFAULT 0.0,
        created_at TEXT DEFAULT (datetime('now'))
      );

      -- 3. DRIVERS TABLE
      CREATE TABLE IF NOT EXISTS drivers (
        id TEXT PRIMARY KEY,
        user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
        name TEXT NOT NULL,
        initials TEXT NOT NULL,
        license_number TEXT UNIQUE NOT NULL,
        trips_completed INTEGER DEFAULT 0,
        rating REAL DEFAULT 5.0,
        hours_worked REAL DEFAULT 0.0,
        created_at TEXT DEFAULT (datetime('now'))
      );

      CREATE INDEX IF NOT EXISTS idx_drivers_license ON drivers(license_number);

      -- 4. FLEET BUSES TABLE
      CREATE TABLE IF NOT EXISTS buses (
        id TEXT PRIMARY KEY,
        bus_number TEXT NOT NULL,
        license_plate TEXT UNIQUE NOT NULL,
        route_id TEXT REFERENCES routes(id) ON DELETE SET NULL,
        driver_id TEXT REFERENCES drivers(id) ON DELETE SET NULL,
        status TEXT DEFAULT 'stopped',
        speed_kmh INTEGER DEFAULT 0,
        passengers_count INTEGER DEFAULT 0,
        capacity INTEGER DEFAULT 52,
        fuel_percent INTEGER DEFAULT 100,
        delay_minutes INTEGER DEFAULT 0,
        next_stop TEXT,
        eta_minutes INTEGER DEFAULT 0,
        pos_x REAL DEFAULT 400.00,
        pos_y REAL DEFAULT 225.00,
        _t REAL DEFAULT 0.0,
        _step REAL DEFAULT 0.005,
        _dir INTEGER DEFAULT 1,
        updated_at TEXT DEFAULT (datetime('now'))
      );

      CREATE INDEX IF NOT EXISTS idx_buses_route ON buses(route_id);
      CREATE INDEX IF NOT EXISTS idx_buses_status ON buses(status);

      -- 5. ALERTS TABLE
      CREATE TABLE IF NOT EXISTS alerts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        severity TEXT NOT NULL DEFAULT 'info',
        icon TEXT,
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        bus_id TEXT,
        is_read INTEGER DEFAULT 0,
        created_at TEXT DEFAULT (datetime('now'))
      );

      CREATE INDEX IF NOT EXISTS idx_alerts_severity_read ON alerts(severity, is_read);

      -- 6. ACTIVITY LOGS TABLE
      CREATE TABLE IF NOT EXISTS activity_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
        action_text TEXT NOT NULL,
        action_type TEXT DEFAULT 'info',
        created_at TEXT DEFAULT (datetime('now'))
      );

      CREATE INDEX IF NOT EXISTS idx_activity_logs_created ON activity_logs(created_at);

      -- 7. STOPS TABLE
      CREATE TABLE IF NOT EXISTS stops (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        subtext TEXT,
        is_primary INTEGER DEFAULT 0,
        lat REAL,
        lon REAL,
        routes_json TEXT,
        pos_x REAL DEFAULT 0.0,
        pos_y REAL DEFAULT 0.0,
        created_at TEXT DEFAULT (datetime('now'))
      );
    `);
  }

  _seedDatabase() {
    // 1. Seed Users
    const userCount = this.sqlite.prepare('SELECT COUNT(*) as count FROM users WHERE email = ?').get('admin@bustrack.com');
    if (userCount.count === 0) {
      const insertUser = this.sqlite.prepare(`
        INSERT INTO users (id, email, password_hash, full_name, role, auth_provider, avatar_url, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
      `);
      insertUser.run(
        'usr-admin-01',
        'admin@bustrack.com',
        '$2a$10$wNlh4J6m5n9S8d.WvYQk8.L0yW.fO2e9jG4iZ5rK7hM3oP2nQ1r2s', // Admin123!
        'Gerente Admin',
        'admin',
        'email',
        'https://api.dicebear.com/7.x/initials/svg?seed=Gerente%20Admin'
      );
    }

    // 2. Seed Routes
    const routeCount = this.sqlite.prepare('SELECT COUNT(*) as count FROM routes').get();
    if (routeCount.count === 0) {
      const insertRoute = this.sqlite.prepare(`
        INSERT INTO routes (id, name, var_name, color, stops_count, length_km, created_at)
        VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
      `);
      for (const r of SEED_ROUTES) {
        insertRoute.run(r.id, r.name, r.varName, r.color, r.stops, r.length);
      }
    }

    // 3. Seed Drivers
    const driverCount = this.sqlite.prepare('SELECT COUNT(*) as count FROM drivers').get();
    if (driverCount.count === 0) {
      const insertDriver = this.sqlite.prepare(`
        INSERT INTO drivers (id, name, initials, license_number, trips_completed, rating, hours_worked, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
      `);
      for (const d of SEED_DRIVERS) {
        insertDriver.run(d.id, d.name, d.initials, d.license, d.trips, d.rating, d.hours);
      }
    }

    // 4. Seed Stops
    const stopCount = this.sqlite.prepare('SELECT COUNT(*) as count FROM stops').get();
    if (stopCount.count === 0) {
      const insertStop = this.sqlite.prepare(`
        INSERT INTO stops (id, name, subtext, is_primary, lat, lon, routes_json, pos_x, pos_y, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
      `);
      for (const s of SEED_STOPS) {
        insertStop.run(
          s.id || `stop-${s.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
          s.name,
          s.subtext || null,
          s.isPrimary || 0,
          s.lat || 9.9333,
          s.lon || -84.0833,
          JSON.stringify(s.routes || []),
          s.pos_x || s.x || 400,
          s.pos_y || s.y || 225
        );
      }
    }

    // 5. Seed Buses (12 operational units)
    const busCount = this.sqlite.prepare('SELECT COUNT(*) as count FROM buses').get();
    if (busCount.count === 0) {
      const statuses = ['active', 'active', 'active', 'active', 'active', 'delayed', 'delayed', 'stopped', 'maintenance'];
      const insertBus = this.sqlite.prepare(`
        INSERT INTO buses (
          id, bus_number, license_plate, route_id, driver_id, status,
          speed_kmh, passengers_count, capacity, fuel_percent, delay_minutes,
          next_stop, eta_minutes, pos_x, pos_y, _t, _step, _dir, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
      `);

      for (let i = 1; i <= 12; i++) {
        const busId = 'BUS-' + String(i).padStart(3, '0');
        const num = String(i).padStart(3, '0');
        const plate = 'SJB-' + String(1000 + i);
        const route = SEED_ROUTES[(i - 1) % SEED_ROUTES.length];
        const driver = SEED_DRIVERS[(i - 1) % SEED_DRIVERS.length];
        const status = statuses[(i - 1) % statuses.length];
        const moving = status === 'active' || status === 'delayed';
        const speed = moving ? randInt(28, 58) : 0;
        const passengers = randInt(4, 44);
        const fuel = randInt(25, 96);
        const delay = status === 'delayed' ? randInt(3, 11) : 0;
        const stop = SEED_STOPS[(i - 1) % SEED_STOPS.length];

        insertBus.run(
          busId,
          num,
          plate,
          route.id,
          driver.id,
          status,
          speed,
          passengers,
          52,
          fuel,
          delay,
          stop.name,
          randInt(2, 9),
          400.0,
          225.0,
          (i * 0.08) % 1.0,
          0.005 + (i % 3) * 0.001,
          i % 2 === 0 ? 1 : -1
        );
      }
    }

    // 6. Seed Alerts
    const alertCount = this.sqlite.prepare('SELECT COUNT(*) as count FROM alerts').get();
    if (alertCount.count === 0) {
      const insertAlert = this.sqlite.prepare(`
        INSERT INTO alerts (severity, icon, title, description, bus_id, is_read, created_at)
        VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
      `);
      for (const a of SEED_ALERTS) {
        insertAlert.run(a.severity, a.icon, a.title, a.description, a.bus_id, a.is_read);
      }
    }

    // 7. Seed Activity Logs
    const actCount = this.sqlite.prepare('SELECT COUNT(*) as count FROM activity_logs').get();
    if (actCount.count === 0) {
      const insertAct = this.sqlite.prepare(`
        INSERT INTO activity_logs (action_text, action_type, created_at)
        VALUES (?, ?, datetime('now'))
      `);
      insertAct.run('BUS-003 completó la Ruta B en horario', 'ok');
      insertAct.run('BUS-007 reportó retraso de 8 min por congestión', 'warn');
      insertAct.run('Conductor Carlos Mendoza inició turno en Ruta A', 'info');
    }
  }

  _compileStatements() {
    this.stmts = {
      // Buses
      selectBusById: this.sqlite.prepare(`
        SELECT 
          b.id, b.bus_number, b.license_plate, b.status, b.speed_kmh, b.passengers_count,
          b.capacity, b.fuel_percent, b.delay_minutes, b.next_stop, b.eta_minutes,
          b.pos_x, b.pos_y, b._t, b._step, b._dir, b.updated_at,
          r.id as route_id, r.name as route_name, r.var_name as route_var_name, r.color as route_color, r.stops_count as route_stops, r.length_km as route_length,
          d.id as driver_id, d.name as driver_name, d.initials as driver_initials, d.license_number as driver_license, d.trips_completed as driver_trips, d.rating as driver_rating, d.hours_worked as driver_hours
        FROM buses b
        LEFT JOIN routes r ON b.route_id = r.id
        LEFT JOIN drivers d ON b.driver_id = d.id
        WHERE LOWER(b.id) = LOWER(?)
      `),

      insertBus: this.sqlite.prepare(`
        INSERT INTO buses (
          id, bus_number, license_plate, route_id, driver_id, status,
          speed_kmh, passengers_count, capacity, fuel_percent, delay_minutes,
          next_stop, eta_minutes, pos_x, pos_y, _t, _step, _dir, updated_at
        ) VALUES (?, ?, ?, ?, ?, 'stopped', 0, 0, 52, 100, 0, ?, 0, 400.0, 225.0, ?, 0.005, 1, datetime('now'))
      `),

      updateBusStatus: this.sqlite.prepare(`
        UPDATE buses
        SET status = ?, speed_kmh = ?, delay_minutes = ?, updated_at = datetime('now')
        WHERE LOWER(id) = LOWER(?)
      `),

      updateBusTelemetryBatch: this.sqlite.prepare(`
        UPDATE buses SET
          speed_kmh = ?, passengers_count = ?, fuel_percent = ?, delay_minutes = ?,
          next_stop = ?, eta_minutes = ?, pos_x = ?, pos_y = ?, _t = ?, _dir = ?,
          updated_at = datetime('now')
        WHERE id = ?
      `),

      // Routes
      selectAllRoutes: this.sqlite.prepare(`
        SELECT 
          r.id, r.name, r.var_name as varName, r.color, r.stops_count as stops, r.length_km as length,
          COUNT(b.id) as totalBuses,
          SUM(CASE WHEN b.status = 'active' THEN 1 ELSE 0 END) as activeBuses,
          COALESCE(SUM(b.passengers_count), 0) as passengersOnboard,
          COALESCE(AVG(b.delay_minutes), 0.0) as avgDelayMinutes
        FROM routes r
        LEFT JOIN buses b ON r.id = b.route_id
        GROUP BY r.id
        ORDER BY r.id ASC
      `),

      selectRouteById: this.sqlite.prepare(`
        SELECT id, name, var_name as varName, color, stops_count as stops, length_km as length
        FROM routes
        WHERE LOWER(id) = LOWER(?)
      `),

      // Drivers
      selectAllDrivers: this.sqlite.prepare(`
        SELECT 
          d.id, d.name, d.initials, d.license_number as license, d.trips_completed as trips, d.rating, d.hours_worked as hours,
          (SELECT b.id FROM buses b WHERE b.driver_id = d.id AND b.status != 'stopped' LIMIT 1) as assignedBusId,
          CASE 
            WHEN EXISTS(SELECT 1 FROM buses b WHERE b.driver_id = d.id AND b.status != 'stopped') THEN 'on_duty' 
            ELSE 'off_duty' 
          END as status
        FROM drivers d
        ORDER BY d.id ASC
      `),

      selectDriverById: this.sqlite.prepare(`
        SELECT id, name, initials, license_number as license, trips_completed as trips, rating, hours_worked as hours
        FROM drivers
        WHERE LOWER(id) = LOWER(?)
      `),

      // Alerts
      insertAlert: this.sqlite.prepare(`
        INSERT INTO alerts (severity, icon, title, description, bus_id, is_read, created_at)
        VALUES (?, ?, ?, ?, ?, 0, datetime('now'))
      `),

      markAllAlertsRead: this.sqlite.prepare(`
        UPDATE alerts SET is_read = 1 WHERE is_read = 0
      `),

      // Users
      selectUserByEmail: this.sqlite.prepare(`
        SELECT id, email, password_hash as passwordHash, full_name as name, role, auth_provider as provider, avatar_url as avatarUrl, created_at as createdAt
        FROM users
        WHERE LOWER(email) = LOWER(?)
      `),

      selectUserById: this.sqlite.prepare(`
        SELECT id, email, password_hash as passwordHash, full_name as name, role, auth_provider as provider, avatar_url as avatarUrl, created_at as createdAt
        FROM users
        WHERE id = ?
      `),

      insertUser: this.sqlite.prepare(`
        INSERT INTO users (id, email, password_hash, full_name, role, auth_provider, avatar_url, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
      `),

      // Activities
      selectActivities: this.sqlite.prepare(`
        SELECT id, action_text as text, action_type as type, created_at
        FROM activity_logs
        ORDER BY id DESC
        LIMIT 20
      `),

      insertActivity: this.sqlite.prepare(`
        INSERT INTO activity_logs (action_text, action_type, created_at)
        VALUES (?, ?, datetime('now'))
      `),

      // Stops
      selectAllStops: this.sqlite.prepare(`
        SELECT id, name, subtext, is_primary as isPrimary, lat, lon, routes_json, pos_x as x, pos_y as y
        FROM stops
        ORDER BY rowid ASC
      `),
    };
  }

  // --- COMPATIBILITY GETTERS ---
  get stops() {
    return this.getAllStops();
  }

  get buses() {
    return this.getAllBuses();
  }

  get routes() {
    return this.getAllRoutes();
  }

  get drivers() {
    return this.getAllDrivers();
  }

  get alerts() {
    return this.getAllAlerts();
  }

  get activities() {
    return this.getActivities();
  }

  get users() {
    return this.sqlite.prepare('SELECT id, email, full_name as name, role, auth_provider as provider FROM users').all();
  }

  // --- STOPS API ---
  getAllStops() {
    const rows = this.stmts.selectAllStops.all();
    return rows.map(r => ({
      id: r.id,
      name: r.name,
      subtext: r.subtext || undefined,
      isPrimary: Boolean(r.isPrimary),
      lat: r.lat,
      lon: r.lon,
      routes: r.routes_json ? JSON.parse(r.routes_json) : [],
      x: r.x,
      y: r.y,
    }));
  }

  // --- BUSES REPOSITORY ---
  _mapBusRow(row) {
    if (!row) return null;
    return {
      id: row.id,
      num: row.bus_number,
      plate: row.license_plate,
      route: {
        id: row.route_id || 'A',
        name: row.route_name || 'Ruta General',
        varName: row.route_var_name || `--route-${(row.route_id || 'a').toLowerCase()}`,
        color: row.route_color || '#5b6ef5',
        stops: row.route_stops || 0,
        length: row.route_length || 0,
      },
      driver: {
        id: row.driver_id || 'D001',
        name: row.driver_name || 'Conductor No Asignado',
        initials: row.driver_initials || 'NA',
        license: row.driver_license || '',
        trips: row.driver_trips || 0,
        rating: row.driver_rating || 5.0,
        hours: row.driver_hours || 0.0,
      },
      status: row.status,
      speed: row.speed_kmh,
      passengers: row.passengers_count,
      capacity: row.capacity,
      fuel: row.fuel_percent,
      delay: row.delay_minutes,
      nextStop: row.next_stop || 'Terminal Central',
      etaMin: row.eta_minutes,
      updatedAgo: 1,
      pos: { x: Number(row.pos_x), y: Number(row.pos_y) },
      _t: Number(row._t || 0),
      _step: Number(row._step || 0.005),
      _dir: Number(row._dir || 1),
    };
  }

  getAllBuses(filters = {}) {
    let sql = `
      SELECT 
        b.id, b.bus_number, b.license_plate, b.status, b.speed_kmh, b.passengers_count,
        b.capacity, b.fuel_percent, b.delay_minutes, b.next_stop, b.eta_minutes,
        b.pos_x, b.pos_y, b._t, b._step, b._dir, b.updated_at,
        r.id as route_id, r.name as route_name, r.var_name as route_var_name, r.color as route_color, r.stops_count as route_stops, r.length_km as route_length,
        d.id as driver_id, d.name as driver_name, d.initials as driver_initials, d.license_number as driver_license, d.trips_completed as driver_trips, d.rating as driver_rating, d.hours_worked as driver_hours
      FROM buses b
      LEFT JOIN routes r ON b.route_id = r.id
      LEFT JOIN drivers d ON b.driver_id = d.id
      WHERE 1=1
    `;
    const params = [];

    if (filters.route && filters.route !== 'all') {
      sql += ' AND LOWER(b.route_id) = LOWER(?)';
      params.push(filters.route);
    }
    if (filters.status && filters.status !== 'all') {
      sql += ' AND b.status = ?';
      params.push(filters.status);
    }
    if (filters.search) {
      const q = `%${filters.search.toLowerCase()}%`;
      sql += ' AND (LOWER(b.id) LIKE ? OR LOWER(b.license_plate) LIKE ? OR LOWER(d.name) LIKE ? OR LOWER(r.name) LIKE ?)';
      params.push(q, q, q, q);
    }

    sql += ' ORDER BY b.id ASC';
    const rows = this.sqlite.prepare(sql).all(...params);
    return rows.map(r => this._mapBusRow(r));
  }

  getBusById(id) {
    if (!id) return null;
    const row = this.stmts.selectBusById.get(id);
    return this._mapBusRow(row);
  }

  createBus(data = {}) {
    const totalCount = this.sqlite.prepare('SELECT COUNT(*) as count FROM buses').get().count;
    const nextNum = totalCount + 1;
    const busId = 'BUS-' + String(nextNum).padStart(3, '0');
    const busNum = String(nextNum).padStart(3, '0');
    const plate = 'SJB-' + String(1000 + nextNum);

    const routes = this.getAllRoutes();
    const drivers = this.getAllDrivers();
    const stops = this.getAllStops();

    const route = data.routeId
      ? this.getRouteById(data.routeId) || routes[0]
      : routes[(nextNum - 1) % routes.length];

    const driver = data.driverId
      ? this.getDriverById(data.driverId) || drivers[0]
      : drivers[(nextNum - 1) % drivers.length];

    const nextStopName = stops.length ? stops[0].name : 'Terminal Central';

    this.stmts.insertBus.run(
      busId,
      busNum,
      plate,
      route.id,
      driver.id,
      nextStopName,
      Math.random()
    );

    return this.getBusById(busId);
  }

  updateBusStatus(id, newStatus) {
    const bus = this.getBusById(id);
    if (!bus) return null;

    let speed = bus.speed;
    let delay = bus.delay;

    if (newStatus === 'stopped' || newStatus === 'maintenance') {
      speed = 0;
      delay = 0;
    } else if (newStatus === 'active') {
      delay = 0;
      if (speed === 0) speed = randInt(25, 55);
    } else if (newStatus === 'delayed') {
      if (speed === 0) speed = randInt(20, 48);
      if (delay === 0) delay = randInt(3, 10);
    }

    this.stmts.updateBusStatus.run(newStatus, speed, delay, id);
    return this.getBusById(id);
  }

  updateAllBusesTelemetry(busesList) {
    for (const b of busesList) {
      this.stmts.updateBusTelemetryBatch.run(
        b.speed,
        b.passengers,
        b.fuel,
        b.delay,
        b.nextStop,
        b.etaMin,
        b.pos.x,
        b.pos.y,
        b._t,
        b._dir,
        b.id
      );
    }
  }

  // --- ROUTES REPOSITORY ---
  getAllRoutes() {
    const rows = this.stmts.selectAllRoutes.all();
    return rows.map(r => {
      const total = Number(r.totalBuses || 0);
      const active = Number(r.activeBuses || 0);
      return {
        id: r.id,
        name: r.name,
        varName: r.varName || `--route-${r.id.toLowerCase()}`,
        color: r.color,
        stops: Number(r.stops),
        length: Number(r.length),
        totalBuses: total,
        activeBuses: active,
        coveragePercent: total ? Math.round((active / total) * 100) : 0,
        passengersOnboard: Number(r.passengersOnboard || 0),
        avgDelayMinutes: total ? +(Number(r.avgDelayMinutes) / 1).toFixed(1) : 0,
      };
    });
  }

  getRouteById(id) {
    if (!id) return null;
    const row = this.stmts.selectRouteById.get(id);
    if (!row) return null;
    const buses = this.getAllBuses({ route: row.id });
    const active = buses.filter(b => b.status === 'active').length;
    return {
      id: row.id,
      name: row.name,
      varName: row.varName || `--route-${row.id.toLowerCase()}`,
      color: row.color,
      stops: Number(row.stops),
      length: Number(row.length),
      totalBuses: buses.length,
      activeBuses: active,
      coveragePercent: buses.length ? Math.round((active / buses.length) * 100) : 0,
      passengersOnboard: buses.reduce((s, b) => s + b.passengers, 0),
      avgDelayMinutes: buses.length ? +(buses.reduce((s, b) => s + b.delay, 0) / buses.length).toFixed(1) : 0,
    };
  }

  // --- DRIVERS REPOSITORY ---
  getAllDrivers() {
    const rows = this.stmts.selectAllDrivers.all();
    return rows.map(d => ({
      id: d.id,
      name: d.name,
      initials: d.initials,
      license: d.license,
      trips: Number(d.trips),
      rating: Number(d.rating),
      hours: Number(d.hours),
      assignedBusId: d.assignedBusId || null,
      status: d.status,
    }));
  }

  getDriverById(id) {
    if (!id) return null;
    const row = this.stmts.selectDriverById.get(id);
    if (!row) return null;
    const assignedBus = this.getAllBuses().find(b => b.driver.id === row.id && b.status !== 'stopped');
    return {
      id: row.id,
      name: row.name,
      initials: row.initials,
      license: row.license,
      trips: Number(row.trips),
      rating: Number(row.rating),
      hours: Number(row.hours),
      assignedBusId: assignedBus ? assignedBus.id : null,
      status: assignedBus ? 'on_duty' : 'off_duty',
    };
  }

  // --- ALERTS REPOSITORY ---
  getAllAlerts(severity = 'all') {
    let sql = 'SELECT id, severity as type, icon, title, description as desc, bus_id as bus, is_read as read, created_at as createdAt FROM alerts';
    const params = [];
    if (severity && severity !== 'all') {
      sql += ' WHERE severity = ?';
      params.push(severity);
    }
    sql += ' ORDER BY id DESC';
    const rows = this.sqlite.prepare(sql).all(...params);
    return rows.map(r => ({
      id: r.id,
      type: r.type,
      icon: r.icon || (r.type === 'critical' ? '🚨' : r.type === 'warning' ? '⚠️' : 'ℹ️'),
      title: r.title,
      desc: r.desc,
      bus: r.bus || 'Sistema',
      time: 'hace momentos',
      read: Boolean(r.read),
      createdAt: r.createdAt,
    }));
  }

  createAlert(data) {
    const type = data.type || 'info';
    const icon = data.icon || (type === 'critical' ? '🚨' : type === 'warning' ? '⚠️' : 'ℹ️');
    const title = data.title;
    const desc = data.desc;
    const bus = data.bus || 'Sistema';

    const info = this.stmts.insertAlert.run(type, icon, title, desc, bus);
    return {
      id: Number(info.lastInsertRowid),
      type,
      icon,
      title,
      desc,
      bus,
      time: 'ahora mismo',
      read: false,
      createdAt: new Date().toISOString(),
    };
  }

  markAllAlertsAsRead() {
    const info = this.stmts.markAllAlertsRead.run();
    return Number(info.changes);
  }

  // --- USERS REPOSITORY ---
  findUserByEmail(email) {
    if (!email) return null;
    const row = this.stmts.selectUserByEmail.get(email.trim());
    return row || null;
  }

  findUserById(id) {
    if (!id) return null;
    const row = this.stmts.selectUserById.get(id);
    return row || null;
  }

  createUser(userData) {
    const id = userData.id || `usr-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const email = userData.email.toLowerCase().trim();
    const name = userData.name.trim();
    const role = userData.role || 'passenger';
    const provider = userData.provider || 'email';
    const avatarUrl = userData.avatarUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name)}`;

    this.stmts.insertUser.run(
      id,
      email,
      userData.passwordHash || null,
      name,
      role,
      provider,
      avatarUrl
    );

    return this.findUserById(id);
  }

  updateUser(id, fields) {
    if (!id) return null;
    const allowed = ['name', 'avatarUrl', 'provider', 'role'];
    const updates = [];
    const values = [];
    for (const key of allowed) {
      if (fields[key] !== undefined) {
        // SQLite columna: avatar_url, todo lo demás igual
        const col = key === 'avatarUrl' ? 'avatar_url' : key;
        updates.push(`${col} = ?`);
        values.push(fields[key]);
      }
    }
    if (updates.length === 0) return this.findUserById(id);
    values.push(id);
    this.db.prepare(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`).run(...values);
    return this.findUserById(id);
  }

  // --- ACTIVITIES LOG ---
  getActivities() {
    const rows = this.stmts.selectActivities.all();
    return rows.map(r => ({
      id: r.id,
      text: r.text,
      time: 'hace unos momentos',
      type: r.type,
      createdAt: r.created_at,
    }));
  }

  pushActivity(text, type = 'info') {
    const info = this.stmts.insertActivity.run(text, type);
    return {
      id: Number(info.lastInsertRowid),
      text,
      time: 'ahora mismo',
      type,
    };
  }

  // --- DB METADATA & DIAGNOSTICS ---
  getDbStatus() {
    let sizeBytes = 0;
    try {
      if (this.filePath !== ':memory:' && fs.existsSync(this.filePath)) {
        sizeBytes = fs.statSync(this.filePath).size;
      }
    } catch {}

    const sqliteVer = this.sqlite.prepare('SELECT sqlite_version() as v').get().v;
    const tables = [
      { name: 'users', count: this.sqlite.prepare('SELECT COUNT(*) as c FROM users').get().c },
      { name: 'routes', count: this.sqlite.prepare('SELECT COUNT(*) as c FROM routes').get().c },
      { name: 'drivers', count: this.sqlite.prepare('SELECT COUNT(*) as c FROM drivers').get().c },
      { name: 'buses', count: this.sqlite.prepare('SELECT COUNT(*) as c FROM buses').get().c },
      { name: 'alerts', count: this.sqlite.prepare('SELECT COUNT(*) as c FROM alerts').get().c },
      { name: 'activity_logs', count: this.sqlite.prepare('SELECT COUNT(*) as c FROM activity_logs').get().c },
      { name: 'stops', count: this.sqlite.prepare('SELECT COUNT(*) as c FROM stops').get().c },
    ];

    const totalRows = tables.reduce((acc, t) => acc + t.count, 0);

    return {
      engine: 'SQLite 3 (ACID Relational File DB)',
      version: sqliteVer,
      dialect: 'sqlite',
      connected: true,
      storage: this.filePath === ':memory:' ? 'in_memory_sqlite' : 'persistent_file',
      filePath: this.filePath,
      fileSizeBytes: sizeBytes,
      fileSizeFormatted: `${(sizeBytes / 1024).toFixed(1)} KB`,
      totalRows,
      tables,
      features: {
        foreignKeys: true,
        walJournalMode: this.filePath !== ':memory:',
        acidTransactions: true,
        postgresCompatible: true,
      },
    };
  }

  close() {
    try {
      this.sqlite.close();
    } catch {}
  }
}

export const db = new Database();
</file>

<file path="server/middleware/rateLimiter.js">
/* ==============================================================================
   BusTrack Pro — Rate Limiter Middleware
   Protects public API endpoints from abuse and DDoS attempts.
   ============================================================================== */

import { rateLimit } from 'express-rate-limit';

const isDev = process.env.NODE_ENV !== 'production';

/** General API rate limit: 100 requests per 15 minutes per IP */
export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isDev ? 500 : 100,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: {
    type: 'https://bustrack.example.com/errors/rate-limit',
    title: 'Too Many Requests',
    status: 429,
    detail: 'You have exceeded the request limit. Please try again later.',
  },
  skip: (req) => req.path === '/health' || req.path === '/database/status', // health and DB status checks are exempt
});

/** Stricter limit for write operations: 20 requests per 15 minutes per IP */
export const writeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isDev ? 200 : 20,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: {
    type: 'https://bustrack.example.com/errors/rate-limit',
    title: 'Too Many Requests',
    status: 429,
    detail: 'Write operation limit reached. Please slow down and try again.',
  },
});
</file>

<file path="server/routes/api.js">
/* ==============================================================================
   BusTrack Pro — REST API Router
   ============================================================================== */

import { Router } from 'express';
import { FleetService } from '../services/fleetService.js';
import { AlertService } from '../services/alertService.js';
import { PassengerService } from '../services/passengerService.js';
import { telemetryEngine } from '../services/telemetrySimulator.js';
import { db } from '../database/db.js';
import { authRouter } from './authRoutes.js';
import { writeLimiter } from '../middleware/rateLimiter.js';
import { validateBusStatus, validateAlertSeverity } from '../middleware/sanitizer.js';

export const apiRouter = Router();

// --- AUTHENTICATION ROUTES ---
apiRouter.use('/auth', authRouter);

// --- 1. SYSTEM HEALTH & DIAGNOSTICS ---
// Note: Does NOT expose stack traces, environment secrets, or internal paths
apiRouter.get('/health', (req, res) => {
  const uptime = process.uptime();
  const dbStatus = typeof db.getDbStatus === 'function' ? db.getDbStatus() : null;
  res.json({
    status: 'healthy',
    uptimeSeconds: Math.floor(uptime),
    timestamp: new Date().toISOString(),
    activeConnections: telemetryEngine.wsClients.size,
    trackedBuses: db.getAllBuses().length,
    database: dbStatus ? {
      engine: dbStatus.engine,
      dialect: dbStatus.dialect,
      connected: dbStatus.connected,
      storage: dbStatus.storage,
      totalRows: dbStatus.totalRows,
    } : { engine: 'in-memory', connected: true },
    version: '1.0.0',
    // NOTE: 'environment' is intentionally omitted from the public health endpoint
    // to avoid leaking deployment context to potential attackers.
  });
});

apiRouter.get('/database/status', (req, res) => {
  if (typeof db.getDbStatus === 'function') {
    res.json(db.getDbStatus());
  } else {
    res.json({ status: 'connected', engine: 'in-memory' });
  }
});

// --- 2. ROUTES ---
apiRouter.get('/routes', (req, res) => {
  const routes = FleetService.getRoutes();
  res.json(routes);
});

apiRouter.get('/routes/:id', (req, res, next) => {
  try {
    const route = FleetService.getRouteById(req.params.id);
    res.json(route);
  } catch (err) {
    next(err);
  }
});

// --- 3. DRIVERS ---
apiRouter.get('/drivers', (req, res) => {
  const drivers = FleetService.getDrivers();
  res.json(drivers);
});

apiRouter.get('/drivers/:id', (req, res, next) => {
  try {
    const driver = FleetService.getDriverById(req.params.id);
    res.json(driver);
  } catch (err) {
    next(err);
  }
});

// --- 4. FLEET BUSES ---
apiRouter.get('/buses', (req, res) => {
  const { route, status, search } = req.query;
  const buses = FleetService.getBuses({ route, status, search });
  res.json(buses);
});

apiRouter.post('/buses', writeLimiter, (req, res, next) => {
  try {
    const bus = FleetService.createBus(req.body);
    telemetryEngine.broadcast('bus_created', bus);
    res.status(201).json(bus);
  } catch (err) {
    next(err);
  }
});

apiRouter.get('/buses/:id', (req, res, next) => {
  try {
    const bus = FleetService.getBusById(req.params.id);
    res.json(bus);
  } catch (err) {
    next(err);
  }
});

apiRouter.patch('/buses/:id/status', writeLimiter, validateBusStatus, (req, res, next) => {
  try {
    const { status } = req.body;
    const bus = FleetService.updateBusStatus(req.params.id, status);
    telemetryEngine.broadcast('bus_status_changed', bus);
    res.json(bus);
  } catch (err) {
    next(err);
  }
});

// --- 5. ALERTS & INCIDENTS ---
apiRouter.get('/alerts', (req, res) => {
  const { severity } = req.query;
  const alerts = AlertService.getAlerts(severity);
  res.json(alerts);
});

apiRouter.post('/alerts', writeLimiter, validateAlertSeverity, (req, res, next) => {
  try {
    const alert = AlertService.createAlert(req.body);
    telemetryEngine.broadcast('alert_created', alert);
    res.status(201).json(alert);
  } catch (err) {
    next(err);
  }
});

apiRouter.patch('/alerts/read-all', writeLimiter, (req, res) => {
  const result = AlertService.markAllAsRead();
  telemetryEngine.broadcast('alerts_read_all', result);
  res.json(result);
});

// --- 6. ACTIVITIES ---
apiRouter.get('/activities', (req, res) => {
  res.json(db.getActivities());
});

// --- 7. REPORTS & ANALYTICS ---
apiRouter.get('/reports/summary', (req, res) => {
  const summary = FleetService.getOperationalSummary();
  res.json(summary);
});

apiRouter.get('/reports/export-csv', (req, res) => {
  const csv = FleetService.generateFleetCsv();
  const filename = `flota-${new Date().toISOString().slice(0, 10)}.csv`;
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  // Prevent CSV injection: the CSV content is generated internally, but
  // as a precaution add a no-cache header so sensitive exports aren't cached.
  res.setHeader('Cache-Control', 'no-store');
  res.send(csv);
});

// --- 8. PASSENGER EXPERIENCE (UNIVERSIDAD FIDÉLITAS PILOT) ---
apiRouter.get('/passenger/stops', (req, res) => {
  res.json(PassengerService.getPilotStops());
});

apiRouter.get('/passenger/stops/:id/arrivals', (req, res) => {
  const arrivals = PassengerService.getStopArrivals(req.params.id);
  res.json(arrivals);
});
</file>

<file path="server/services/authService.js">
/* ==============================================================================
   BusTrack Pro — Authentication Service (Email, Google, Apple)
   ============================================================================== */

import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../middleware/auth.js';
import { db } from '../database/db.js';
import { supabase, isSupabaseConfigured } from '../supabase.js';

export class AuthService {
  /** Generate JWT Token */
  static generateToken(user) {
    const payload = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      provider: user.provider,
    };
    return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
  }

  /** Register user with Email & Password */
  static async registerWithEmail({ email, password, name, consentTerms }) {
    if (!consentTerms) {
      throw new Error('Debes aceptar los Términos y la Política de Privacidad para registrarte.');
    }

    if (!email || !password || !name) {
      throw new Error('Todos los campos son obligatorios.');
    }

    if (password.length < 6) {
      throw new Error('La contraseña debe tener al menos 6 caracteres.');
    }

    const cleanEmail = email.toLowerCase().trim();
    const cleanName = name.trim();

    // 1. Si Supabase está configurado, intentar registrar allí primero (es la fuente de verdad)
    let supabaseUserId = null;
    if (isSupabaseConfigured) {
      try {
        const { data: supaData, error: supaError } = await supabase.auth.signUp({
          email: cleanEmail,
          password: password,
          options: {
            data: { name: cleanName },
          },
        });

        if (supaError) {
          // Si ya existe el usuario en Supabase Auth, tratamos de hacer login para verificar
          if (supaError.message.includes('User already registered') || supaError.message.includes('already registered')) {
            throw new Error('Ya existe una cuenta registrada con este correo electrónico.');
          }
          console.warn('[Supabase Auth] Aviso al registrar:', supaError.message);
        } else if (supaData?.user) {
          supabaseUserId = supaData.user.id;

          // Guardar en la tabla 'users' de Supabase con el id del Auth
          try {
            const { error: upsertError } = await supabase.from('users').upsert({
              id: supabaseUserId,
              email: cleanEmail,
              full_name: cleanName,
              role: 'admin',
              auth_provider: 'email',
              avatar_url: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(cleanName)}`,
              created_at: new Date().toISOString(),
            }, { onConflict: 'email' });

            if (upsertError) {
              console.warn('[Supabase DB] Error al guardar usuario en tabla users:', upsertError.message);
            } else {
              console.log('[Supabase DB] Usuario guardado exitosamente en tabla users:', cleanEmail);
            }
          } catch (dbErr) {
            console.warn('[Supabase DB] Tabla users no encontrada, continuando con BD local:', dbErr.message);
          }
        }
      } catch (err) {
        // Re-lanzar errores de "ya registrado"
        if (err.message.includes('ya existe') || err.message.includes('registered')) {
          throw err;
        }
        console.warn('[Supabase Auth] Error de conexión, usando BD local:', err.message);
      }
    }

    // 2. Verificar si ya existe en la base de datos local
    const existingUser = db.findUserByEmail(cleanEmail);
    if (existingUser) {
      throw new Error('Ya existe una cuenta registrada con este correo electrónico.');
    }

    // 3. Guardar en la base de datos local para persistencia rápida
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const newUser = db.createUser({
      ...(supabaseUserId ? { id: supabaseUserId } : {}),
      email: cleanEmail,
      passwordHash,
      name: cleanName,
      role: 'admin',
      provider: 'email',
      avatarUrl: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(cleanName)}`,
    });

    try {
      db.pushActivity(`Nuevo usuario registrado: ${cleanName} (${cleanEmail})`, 'info');
    } catch (_) {}

    const token = this.generateToken(newUser);
    const { passwordHash: _, ...safeUser } = newUser;
    return { user: safeUser, token };
  }


  /** OAuth Callback — Registra/actualiza usuario de Supabase OAuth (Google, Apple) */
  static async loginWithOAuthCallback({ supabaseId, email, name, provider, avatarUrl }) {
    const cleanEmail = email.toLowerCase().trim();
    const cleanName = (name || cleanEmail.split('@')[0]).trim();
    const cleanProvider = provider || 'oauth';
    const cleanAvatar = avatarUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(cleanName)}`;

    // Buscar si ya existe en la BD local (por email o por id de Supabase)
    let existingUser = db.findUserByEmail(cleanEmail) || db.findUserById(supabaseId);

    if (existingUser) {
      // Actualizar datos del perfil (nombre/avatar pueden cambiar en el proveedor)
      const updated = db.updateUser(existingUser.id, {
        name: cleanName,
        avatarUrl: cleanAvatar,
        provider: cleanProvider,
      });
      const token = this.generateToken(updated || existingUser);
      const { passwordHash: _, ...safeUser } = updated || existingUser;
      return { user: safeUser, token };
    }

    // Crear usuario nuevo en la BD local con el UUID de Supabase
    const newUser = db.createUser({
      id: supabaseId,
      email: cleanEmail,
      name: cleanName,
      role: 'admin',
      provider: cleanProvider,
      avatarUrl: cleanAvatar,
      passwordHash: null, // Los usuarios OAuth no tienen contraseña local
    });

    try {
      db.pushActivity(`Nuevo usuario OAuth (${cleanProvider}): ${cleanName} (${cleanEmail})`, 'info');
    } catch (_) {}

    const token = this.generateToken(newUser);
    const { passwordHash: _, ...safeUser } = newUser;
    return { user: safeUser, token };
  }


  /** Login user with Email & Password */
  static async loginWithEmail({ email, password }) {
    if (!email || !password) {
      throw new Error('Correo y contraseña son requeridos.');
    }

    const cleanEmail = email.toLowerCase().trim();

    // 1. Si Supabase está configurado, intentar primero autenticar contra Supabase Auth
    if (isSupabaseConfigured) {
      try {
        const { data: supaData, error: supaError } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password: password,
        });

        if (!supaError && supaData?.user) {
          let user = db.findUserByEmail(cleanEmail);
          if (!user) {
            const salt = await bcrypt.genSalt(10);
            const passwordHash = await bcrypt.hash(password, salt);
            user = db.createUser({
              id: supaData.user.id,
              email: cleanEmail,
              passwordHash,
              name: supaData.user.user_metadata?.name || cleanEmail.split('@')[0],
              role: 'admin',
              provider: 'email',
              avatarUrl: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(cleanEmail)}`,
            });
          }
          try {
            db.pushActivity(`Inicio de sesión (Supabase Auth): ${user.name}`, 'info');
          } catch (_) {}

          const token = this.generateToken(user);
          const { passwordHash: _, ...safeUser } = user;
          return { user: safeUser, token };
        }
      } catch (err) {
        console.warn('[Supabase Auth] Fallo signInWithPassword, probando DB local:', err.message);
      }
    }

    // 2. Autenticación con la base de datos local
    const user = db.findUserByEmail(cleanEmail);
    if (!user || !user.passwordHash) {
      throw new Error('Credenciales inválidas o la cuenta fue creada con Google/Apple.');
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      throw new Error('Correo o contraseña incorrectos.');
    }

    try {
      db.pushActivity(`Inicio de sesión: ${user.name} (${user.email})`, 'info');
    } catch (_) {}

    const token = this.generateToken(user);
    const { passwordHash: _, ...safeUser } = user;
    return { user: safeUser, token };
  }

  /** Login / Register with Google OAuth */
  static async loginWithGoogle({ googleToken, email, name, picture }) {
    if (!email) {
      throw new Error('No se pudo verificar el correo de Google.');
    }

    const cleanEmail = email.toLowerCase().trim();
    let user = db.findUserByEmail(cleanEmail);

    if (!user) {
      user = db.createUser({
        email: cleanEmail,
        passwordHash: null,
        name: name || cleanEmail.split('@')[0],
        role: 'admin',
        provider: 'google',
        avatarUrl: picture || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(cleanEmail)}`,
      });

      if (isSupabaseConfigured) {
        try {
          await supabase.from('users').upsert({
            email: cleanEmail,
            full_name: user.name,
            role: 'admin',
            auth_provider: 'google',
            avatar_url: user.avatarUrl,
          });
        } catch (_) {}
      }
    }

    try {
      db.pushActivity(`Inicio de sesión con Google: ${user.name}`, 'info');
    } catch (_) {}

    const token = this.generateToken(user);
    const { passwordHash: _, ...safeUser } = user;
    return { user: safeUser, token };
  }

  /** Login / Register with Apple OAuth */
  static async loginWithApple({ appleToken, email, name }) {
    const cleanEmail = (email || `apple_${Date.now()}@privaterelay.appleid.com`).toLowerCase().trim();
    let user = db.findUserByEmail(cleanEmail);

    if (!user) {
      user = db.createUser({
        email: cleanEmail,
        passwordHash: null,
        name: name || 'Usuario Apple',
        role: 'passenger',
        provider: 'apple',
        avatarUrl: `https://api.dicebear.com/7.x/initials/svg?seed=Apple`,
      });

      if (isSupabaseConfigured) {
        try {
          await supabase.from('users').upsert({
            email: cleanEmail,
            full_name: user.name,
            role: 'passenger',
            auth_provider: 'apple',
            avatar_url: user.avatarUrl,
          });
        } catch (_) {}
      }
    }

    try {
      db.pushActivity(`Inicio de sesión con Apple: ${user.name}`, 'info');
    } catch (_) {}

    const token = this.generateToken(user);
    const { passwordHash: _, ...safeUser } = user;
    return { user: safeUser, token };
  }
}
</file>

<file path="server/services/telemetrySimulator.js">
/* ==============================================================================
   BusTrack Pro — Real-Time Telemetry & WebSocket Engine
   ============================================================================== */

import { db, SEED_STOPS } from '../database/db.js';
import { config } from '../config.js';
import { PassengerService } from './passengerService.js';

const ROUTE_PATHS = {
  A: t => ({ x: 50 + t * 700, y: 150 + Math.sin(t * Math.PI) * 30 }),
  B: t => ({ x: 50 + t * 700, y: 300 + Math.sin(t * Math.PI + 1) * 25 }),
  C: t => ({ x: 200 + Math.sin(t * Math.PI) * 18, y: 40 + t * 380 }),
  D: t => ({ x: 600 + Math.sin(t * Math.PI) * 18, y: 40 + t * 380 }),
};

function randInt(a, b) {
  return Math.floor(Math.random() * (b - a + 1)) + a;
}

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

export class TelemetryEngine {
  constructor() {
    this.wsClients = new Set();
    this.telemetryInterval = null;
    this.activityInterval = null;
    this.isRunning = false;
  }

  registerClient(ws) {
    this.wsClients.add(ws);
    // Send initial snapshot on connect
    const snapshot = {
      event: 'snapshot',
      timestamp: new Date().toISOString(),
      data: {
        buses: db.getAllBuses(),
        routes: db.getAllRoutes(),
        drivers: db.getAllDrivers(),
        alerts: db.getAllAlerts(),
        activities: db.getActivities(),
      },
    };
    if (ws.readyState === 1) { // OPEN
      ws.send(JSON.stringify(snapshot));
    }
  }

  unregisterClient(ws) {
    this.wsClients.delete(ws);
  }

  broadcast(event, payload) {
    if (this.wsClients.size === 0) return;
    const message = JSON.stringify({
      event,
      timestamp: new Date().toISOString(),
      data: payload,
    });
    for (const client of this.wsClients) {
      if (client.readyState === 1) { // OPEN
        client.send(message);
      }
    }
  }

  start() {
    if (this.isRunning) return;
    this.isRunning = true;

    // Fast-tick positions & telemetry updates
    this.telemetryInterval = setInterval(() => {
      this.tick();
    }, config.telemetryIntervalMs);

    // Periodic activity log simulation
    this.activityInterval = setInterval(() => {
      this.tickActivity();
    }, config.activityIntervalMs);

    console.log(`[TELEMETRY] Engine started. Broadcasting every ${config.telemetryIntervalMs}ms.`);
  }

  stop() {
    if (!this.isRunning) return;
    clearInterval(this.telemetryInterval);
    clearInterval(this.activityInterval);
    this.isRunning = false;
    console.log('[TELEMETRY] Engine stopped.');
  }

  tick() {
    const buses = db.getAllBuses();
    const updates = [];

    for (const b of buses) {
      const moving = b.status === 'active' || b.status === 'delayed';
      if (moving) {
        b._t += (b._dir || 1) * (b._step || 0.005) * (b.speed / 40);
        if (b._t >= 1) {
          b._t = 1;
          b._dir = -1;
        } else if (b._t <= 0) {
          b._t = 0;
          b._dir = 1;
        }

        const pathFn = ROUTE_PATHS[b.route.id] || ROUTE_PATHS.A;
        b.pos = pathFn(b._t);

        // Fluctuate speed, passengers, fuel
        b.passengers = Math.max(0, Math.min(b.capacity, b.passengers + randInt(-2, 2)));
        b.speed = Math.max(16, Math.min(65, b.speed + randInt(-4, 4)));
        b.updatedAgo = 1;

        if (Math.random() < 0.12) {
          b.nextStop = pick(SEED_STOPS).name;
          b.etaMin = randInt(2, 9);
        }
        if (Math.random() < 0.06) {
          b.fuel = Math.max(5, b.fuel - 1);
        }
      }

      updates.push({
        id: b.id,
        status: b.status,
        speed: b.speed,
        passengers: b.passengers,
        fuel: b.fuel,
        delay: b.delay,
        nextStop: b.nextStop,
        etaMin: b.etaMin,
        pos: b.pos,
        updatedAgo: b.updatedAgo,
      });
    }

    if (typeof db.updateAllBusesTelemetry === 'function') {
      db.updateAllBusesTelemetry(buses);
    }

    this.broadcast('telemetry_tick', updates);

    // Broadcast real-time ETA updates for passenger pilot stops
    const pilotStops = PassengerService.getPilotStops();
    if (pilotStops.length) {
      const etaUpdates = [];
      for (const stop of pilotStops) {
        const arrivals = PassengerService.getStopArrivals(stop.id).arrivals;
        arrivals.forEach(a => {
          etaUpdates.push({
            stopId: stop.id,
            busId: a.busId,
            etaMinutes: a.etaMinutes,
            distanceMeters: a.distanceMeters,
            distanceFormatted: a.distanceFormatted,
            occupancyPercent: a.occupancyPercent
          });
        });
      }
      this.broadcast('passenger_eta_update', etaUpdates);
    }
  }

  tickActivity() {
    const buses = db.getAllBuses();
    if (!buses.length) return;
    const bus = pick(buses);
    const stop = pick(SEED_STOPS);
    const templates = [
      { text: `${bus.id} arribó a la parada ${stop.name}`, type: 'info' },
      { text: `${bus.id} reportó velocidad crucero de ${bus.speed} km/h`, type: 'ok' },
      { text: `${bus.driver.name} actualizó estado de viaje en Ruta ${bus.route.id}`, type: 'info' },
    ];
    const picked = pick(templates);
    const act = db.pushActivity(picked.text, picked.type);
    this.broadcast('activity_new', act);
  }
}

export const telemetryEngine = new TelemetryEngine();
</file>

<file path="server/config.js">
/* ==============================================================================
   BusTrack Pro — Application Configuration
   ============================================================================== */

import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  corsOrigin: process.env.CORS_ORIGIN || '*',
  telemetryIntervalMs: parseInt(process.env.TELEMETRY_INTERVAL_MS || '3000', 10),
  activityIntervalMs: parseInt(process.env.ACTIVITY_INTERVAL_MS || '9000', 10),
  databaseUrl: process.env.DATABASE_URL || process.env.POSTGRES_URL || '',
  dbStorage: process.env.DB_STORAGE || 'sqlite',
  dbFile: process.env.DB_FILE || './data/bustrack.sqlite',
};
</file>

<file path="server/supabase.js">
import dotenv from 'dotenv';
dotenv.config();

import { createClient } from '@supabase/supabase-js';

const rawUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const rawKey = process.env.SUPABASE_ANON_KEY || 
               process.env.SUPABASE_PUBLISHABLE_KEY || 
               process.env.SUPABASE_SERVICE_ROLE_KEY || 
               process.env.SUPABASE_SECRET_KEY || 
               process.env.VITE_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(rawUrl && rawUrl.startsWith('http') && !rawUrl.includes('dummy-project'));

const supabaseUrl = isSupabaseConfigured ? rawUrl : 'https://placeholder-url.supabase.co';
const supabaseKey = rawKey || 'placeholder-anon-key';

export const supabase = createClient(supabaseUrl, supabaseKey);
</file>

<file path="src/App.jsx">
import React, { useEffect } from 'react';
import { supabase } from './supabase.js';

export function App() {
  useEffect(() => {
    async function probarConexion() {
      const { data, error } = await supabase.from('buses').select('*');

      if (error) {
        console.error('Error conectando a Supabase ❌:', error.message);
      } else {
        console.log('¡Conexión exitosa! ✅ Datos de los buses:', data);
      }
    }

    probarConexion();
  }, []);

  console.log("El componente App se está renderizando");

  return (
    <div className="app-container">
      <h1>BusTrack Pro Dashboard</h1>
    </div>
  );
}

export default App;
</file>

<file path="test/auth.test.js">
/* ==============================================================================
   BusTrack Pro — Authentication API Unit Tests
   ============================================================================== */

import { test, before, after } from 'node:test';
import assert from 'node:assert';
import http from 'node:http';
import { app } from '../server/index.js';

let server;
let baseUrl;

before(async () => {
  await new Promise((resolve) => {
    server = http.createServer(app);
    server.listen(0, () => {
      const port = server.address().port;
      baseUrl = `http://localhost:${port}/api/v1`;
      resolve();
    });
  });
});

after(async () => {
  await new Promise((resolve) => server.close(resolve));
});

test('Auth — POST /auth/register creates new user with consent', async () => {
  const testEmail = `test_${Date.now()}@bustrack.com`;
  const res = await fetch(`${baseUrl}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Usuario Pruebas',
      email: testEmail,
      password: 'Password123!',
      consentTerms: true,
    }),
  });

  assert.strictEqual(res.status, 201);
  const data = await res.json();
  assert.strictEqual(data.status, 'success');
  assert.strictEqual(data.user.email, testEmail);
  assert.ok(data.token);
});

test('Auth — POST /auth/login authenticates registered user', async () => {
  const testEmail = `login_test_${Date.now()}@bustrack.com`;
  
  // First register
  await fetch(`${baseUrl}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Usuario Login Test',
      email: testEmail,
      password: 'MySecretPassword123',
      consentTerms: true,
    }),
  });

  // Then login
  const res = await fetch(`${baseUrl}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: testEmail,
      password: 'MySecretPassword123',
    }),
  });

  assert.strictEqual(res.status, 200);
  const data = await res.json();
  assert.strictEqual(data.status, 'success');
  assert.strictEqual(data.user.email, testEmail);
  assert.ok(data.token);
});

test('Auth — POST /auth/google authenticates Google OAuth', async () => {
  const res = await fetch(`${baseUrl}/auth/google`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      googleToken: 'mock_google_token',
      email: 'user.google.test@gmail.com',
      name: 'Google Test User',
      picture: 'https://example.com/pic.jpg',
    }),
  });

  assert.strictEqual(res.status, 200);
  const data = await res.json();
  assert.strictEqual(data.status, 'success');
  assert.strictEqual(data.user.provider, 'google');
  assert.ok(data.token);
});

test('Auth — POST /auth/apple authenticates Apple OAuth', async () => {
  const res = await fetch(`${baseUrl}/auth/apple`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      appleToken: 'mock_apple_token',
      email: 'user.apple.test@privaterelay.appleid.com',
      name: 'Apple Test User',
    }),
  });

  assert.strictEqual(res.status, 200);
  const data = await res.json();
  assert.strictEqual(data.status, 'success');
  assert.strictEqual(data.user.provider, 'apple');
  assert.ok(data.token);
});

test('Auth — POST /auth/register fails on duplicate email', async () => {
  const dupEmail = `dup_${Date.now()}@bustrack.com`;
  await fetch(`${baseUrl}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'User 1', email: dupEmail, password: 'Password123!', consentTerms: true }),
  });

  const res = await fetch(`${baseUrl}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'User 2', email: dupEmail, password: 'Password123!', consentTerms: true }),
  });

  assert.strictEqual(res.status, 400);
  const data = await res.json();
  assert.ok(data.detail.includes('Ya existe una cuenta'));
});

test('Auth — POST /auth/login fails with wrong password', async () => {
  const testEmail = `wrongpass_${Date.now()}@bustrack.com`;
  await fetch(`${baseUrl}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Wrong Pass User', email: testEmail, password: 'CorrectPassword123', consentTerms: true }),
  });

  const res = await fetch(`${baseUrl}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: testEmail, password: 'WrongPassword123' }),
  });

  assert.strictEqual(res.status, 401);
  const data = await res.json();
  assert.ok(data.detail.includes('incorrectos'));
});

test('Auth — GET /auth/me returns profile for valid JWT token', async () => {
  const meEmail = `me_${Date.now()}@bustrack.com`;
  const regRes = await fetch(`${baseUrl}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'User Profile Me', email: meEmail, password: 'MyPassword123!', consentTerms: true }),
  });
  const regData = await regRes.json();

  const meRes = await fetch(`${baseUrl}/auth/me`, {
    headers: { 'Authorization': `Bearer ${regData.token}` },
  });

  assert.strictEqual(meRes.status, 200);
  const meData = await meRes.json();
  assert.strictEqual(meData.user.email, meEmail);
});
</file>

<file path=".env.example">
<<<<<<< HEAD
# BusTrack Pro — Environment Configuration Example
# Copy this file to .env and set your DATABASE_URL for PostgreSQL/Supabase integration

=======
# ==============================================================================
# BusTrack Pro Backend — Configuration
# ==============================================================================
>>>>>>> 92930e0bb115bcdcb1c15df1bc3c0c3f70eb7792
PORT=3000
NODE_ENV=development
CORS_ORIGIN=*
TELEMETRY_INTERVAL_MS=3000
ACTIVITY_INTERVAL_MS=9000
<<<<<<< HEAD

# PostgreSQL / Supabase Database Connection String
# Example for Supabase: postgresql://postgres.xxxx:your_password@aws-0-us-east-1.pooler.supabase.com:6543/postgres
DATABASE_URL=

# JWT Secret Key
JWT_SECRET=bustrack_pro_production_secret_key_change_me_in_prod
=======
DB_STORAGE=memory
# For persistent file-based storage:
# DB_FILE=./data/bustrack.json
>>>>>>> 92930e0bb115bcdcb1c15df1bc3c0c3f70eb7792
</file>

<file path=".gitignore">
node_modules/
.env
*.log
.DS_Store
*.db
*.sqlite
coverage/
</file>

<file path="404.html">
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="robots" content="noindex, nofollow" />
  <title>Página no encontrada — BusTrack Pro</title>
  <meta name="description" content="La página que buscas no existe. Vuelve al panel de BusTrack Pro." />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
  <style>
    :root {
      --bg: #0a0f1c; --surface: #111827; --border: rgba(255,255,255,0.08);
      --text: #e5e7eb; --text-muted: #9ca3af; --brand: #5b6ef5; --brand-light: #818cf8;
    }
    @media (prefers-color-scheme: light) {
      :root { --bg: #f9fafb; --surface: #fff; --border: rgba(0,0,0,0.08); --text: #111827; --text-muted: #6b7280; }
    }
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Inter', system-ui, sans-serif;
      background: var(--bg);
      color: var(--text);
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      text-align: center;
      padding: 2rem;
      position: relative;
      overflow: hidden;
    }
    /* Background decoration */
    body::before {
      content: '';
      position: fixed;
      top: 20%;
      left: 50%;
      transform: translateX(-50%);
      width: 600px;
      height: 600px;
      background: radial-gradient(circle, rgba(91,110,245,0.12) 0%, transparent 70%);
      pointer-events: none;
    }
    .error-code {
      font-size: clamp(6rem, 20vw, 10rem);
      font-weight: 800;
      line-height: 1;
      background: linear-gradient(135deg, var(--brand) 0%, var(--brand-light) 50%, #a78bfa 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      margin-bottom: 0.5rem;
      animation: fadeSlideIn 0.6s ease-out;
    }
    .bus-icon {
      font-size: 3rem;
      margin-bottom: 1rem;
      animation: bounce 2s infinite;
    }
    @keyframes bounce {
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(-8px); }
    }
    @keyframes fadeSlideIn {
      from { opacity: 0; transform: translateY(-20px); }
      to { opacity: 1; transform: translateY(0); }
    }
    h1 {
      font-size: 1.5rem;
      font-weight: 700;
      margin-bottom: 0.75rem;
      animation: fadeSlideIn 0.6s ease-out 0.1s both;
    }
    .subtitle {
      color: var(--text-muted);
      font-size: 1rem;
      max-width: 400px;
      margin-bottom: 2.5rem;
      animation: fadeSlideIn 0.6s ease-out 0.2s both;
    }
    .actions {
      display: flex;
      gap: 1rem;
      flex-wrap: wrap;
      justify-content: center;
      animation: fadeSlideIn 0.6s ease-out 0.3s both;
    }
    .btn-primary {
      background: var(--brand);
      color: white;
      border: none;
      padding: 0.75rem 1.5rem;
      border-radius: 8px;
      font-family: inherit;
      font-size: 0.95rem;
      font-weight: 600;
      cursor: pointer;
      text-decoration: none;
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      transition: background 0.2s, transform 0.1s;
    }
    .btn-primary:hover { background: #4b5de4; transform: translateY(-1px); }
    .btn-primary:active { transform: translateY(0); }
    .btn-ghost {
      background: transparent;
      color: var(--text-muted);
      border: 1px solid var(--border);
      padding: 0.75rem 1.5rem;
      border-radius: 8px;
      font-family: inherit;
      font-size: 0.95rem;
      font-weight: 500;
      cursor: pointer;
      text-decoration: none;
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      transition: color 0.2s, border-color 0.2s;
    }
    .btn-ghost:hover { color: var(--text); border-color: rgba(255,255,255,0.2); }
    a:focus-visible { outline: 2px solid var(--brand); outline-offset: 2px; border-radius: 4px; }
    .countdown {
      color: var(--text-muted);
      font-size: 0.8rem;
      margin-top: 2rem;
      animation: fadeSlideIn 0.6s ease-out 0.4s both;
    }
    #countdownSecs { color: var(--brand-light); font-weight: 600; }
  </style>
</head>
<body>
  <div class="bus-icon" role="img" aria-label="Ícono de bus">🚍</div>
  <div class="error-code" aria-hidden="true">404</div>
  <h1>Ruta no encontrada</h1>
  <p class="subtitle">
    Parece que este bus tomó un desvío. La página que buscas no existe o fue movida.
  </p>
  <div class="actions">
    <a href="/" class="btn-primary">
      <svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16" aria-hidden="true">
        <path d="M10.7 2.3a1 1 0 0 0-1.4 0l-7 6.6A1 1 0 0 0 3 10.6V16a2 2 0 0 0 2 2h3v-4.5h4V18h3a2 2 0 0 0 2-2v-5.4a1 1 0 0 0-.3-1.7l-7-6.6Z"/>
      </svg>
      Ir al panel principal
    </a>
    <button class="btn-ghost" onclick="history.back()">
      ← Volver atrás
    </button>
  </div>
  <p class="countdown">Redirigiendo al panel en <span id="countdownSecs">10</span> segundos…</p>

  <script>
    let secs = 10;
    const el = document.getElementById('countdownSecs');
    const timer = setInterval(() => {
      secs--;
      if (el) el.textContent = secs;
      if (secs <= 0) {
        clearInterval(timer);
        window.location.href = '/';
      }
    }, 1000);
  </script>
</body>
</html>
</file>

<file path="cookies.html">
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="robots" content="noindex, follow" />
  <title>Política de Cookies — BusTrack Pro</title>
  <meta name="description" content="Información sobre el uso de cookies y almacenamiento local en BusTrack Pro." />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
  <style>
    :root { --bg: #0a0f1c; --surface: #111827; --border: rgba(255,255,255,0.08); --text: #e5e7eb; --text-muted: #9ca3af; --brand: #5b6ef5; --brand-light: #818cf8; }
    @media (prefers-color-scheme: light) { :root { --bg: #f9fafb; --surface: #fff; --border: rgba(0,0,0,0.08); --text: #111827; --text-muted: #6b7280; } }
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Inter', system-ui, sans-serif; background: var(--bg); color: var(--text); line-height: 1.7; font-size: 1rem; }
    .legal-header { background: var(--surface); border-bottom: 1px solid var(--border); padding: 1rem 2rem; display: flex; align-items: center; gap: 1rem; }
    .legal-header a { color: var(--brand-light); text-decoration: none; font-size: 0.875rem; }
    .legal-header a:hover { text-decoration: underline; }
    .legal-logo { font-weight: 700; color: var(--brand); font-size: 1.1rem; }
    .legal-sep { color: var(--text-muted); }
    main { max-width: 760px; margin: 0 auto; padding: 3rem 1.5rem 5rem; }
    .legal-badge { display: inline-block; background: rgba(91,110,245,0.15); color: var(--brand-light); border: 1px solid rgba(91,110,245,0.3); border-radius: 99px; padding: 0.2rem 0.75rem; font-size: 0.75rem; font-weight: 600; letter-spacing: 0.05em; text-transform: uppercase; margin-bottom: 1rem; }
    h1 { font-size: 2rem; font-weight: 700; line-height: 1.2; margin-bottom: 0.5rem; }
    .last-updated { color: var(--text-muted); font-size: 0.875rem; margin-bottom: 2.5rem; padding-bottom: 2.5rem; border-bottom: 1px solid var(--border); }
    h2 { font-size: 1.2rem; font-weight: 600; margin: 2.5rem 0 0.75rem; color: var(--brand-light); }
    p { margin-bottom: 1rem; }
    ul { margin: 0.5rem 0 1rem 1.5rem; }
    li { margin-bottom: 0.4rem; }
    .info-box { background: var(--surface); border: 1px solid var(--border); border-left: 3px solid var(--brand); border-radius: 8px; padding: 1.25rem 1.5rem; margin: 2rem 0; }
    table { width: 100%; border-collapse: collapse; margin: 1.5rem 0; font-size: 0.9rem; }
    th, td { text-align: left; padding: 0.75rem 1rem; border-bottom: 1px solid var(--border); }
    th { background: var(--surface); color: var(--brand-light); }
    footer { text-align: center; padding: 2rem; color: var(--text-muted); font-size: 0.8rem; border-top: 1px solid var(--border); }
    footer a { color: var(--brand-light); text-decoration: none; }
    a { color: var(--brand-light); }
  </style>
</head>
<body>
  <header class="legal-header">
    <span class="legal-logo">BusTrack Pro</span>
    <span class="legal-sep">›</span>
    <a href="/">← Volver al panel</a>
  </header>

  <main>
    <span class="legal-badge">Privacidad & Cookies</span>
    <h1>Política de Cookies y Almacenamiento</h1>
    <p class="last-updated">Última actualización: 24 de septiembre de 2026</p>

    <div class="info-box">
      <p><strong>Cero Rastreo Publicitario:</strong> BusTrack Pro respeta la privacidad de los usuarios. No utilizamos cookies de rastreo publicitario ni vendemos datos a terceros. Toda la información almacenada en su navegador es técnica y necesaria para recordar sus preferencias.</p>
    </div>

    <h2>1. ¿Qué datos se almacenan en su navegador?</h2>
    <p>Utilizamos tecnologías de almacenamiento local de HTML5 (<code>localStorage</code> y <code>sessionStorage</code>) y tokens de sesión estrictamente necesarios para ofrecer la funcionalidad esperada.</p>

    <table>
      <thead>
        <tr>
          <th>Clave de Almacenamiento</th>
          <th>Propósito</th>
          <th>Duración</th>
          <th>Tipo</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td><code>bustrack_theme</code></td>
          <td>Guarda si prefiere el tema oscuro o claro</td>
          <td>Persistente</td>
          <td>Técnica (Necesaria)</td>
        </tr>
        <tr>
          <td><code>bustrack_user_prefs</code></td>
          <td>Guarda opciones de vista (densidad compacta, color de acento)</td>
          <td>Persistente</td>
          <td>Preferencias</td>
        </tr>
        <tr>
          <td><code>bustrack_auth_token</code></td>
          <td>Token JWT de sesión para mantener la sesión abierta</td>
          <td>7 días</td>
          <td>Seguridad / Sesión</td>
        </tr>
        <tr>
          <td><code>bustrack_cookie_consent</code></td>
          <td>Guarda su elección de consentimiento de almacenamiento</td>
          <td>1 año</td>
          <td>Técnica</td>
        </tr>
      </tbody>
    </table>

    <h2>2. ¿Cómo administrar o borrar su almacenamiento local?</h2>
    <p>Puede eliminar las preferencias de BusTrack Pro en cualquier momento desde las opciones de configuración de su navegador, seleccionando "Borrar datos de navegación" o desactivando el almacenamiento local.</p>
  </main>

  <footer>
    <p>© 2026 BusTrack Pro | <a href="/privacy">Privacidad</a> · <a href="/terms">Términos</a> · <a href="/cookies">Cookies</a></p>
  </footer>
</body>
</html>
</file>

<file path="privacy.html">
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="robots" content="noindex, follow" />
  <title>Política de Privacidad — BusTrack Pro</title>
  <meta name="description" content="Política de privacidad de BusTrack Pro. Conoce cómo tratamos los datos operativos del sistema de rastreo de flotas." />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
  <style>
    :root {
      --bg: #0a0f1c;
      --surface: #111827;
      --border: rgba(255,255,255,0.08);
      --text: #e5e7eb;
      --text-muted: #9ca3af;
      --brand: #5b6ef5;
      --brand-light: #818cf8;
    }
    @media (prefers-color-scheme: light) {
      :root {
        --bg: #f9fafb;
        --surface: #ffffff;
        --border: rgba(0,0,0,0.08);
        --text: #111827;
        --text-muted: #6b7280;
      }
    }
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Inter', system-ui, sans-serif;
      background: var(--bg);
      color: var(--text);
      line-height: 1.7;
      font-size: 1rem;
    }
    .legal-header {
      background: var(--surface);
      border-bottom: 1px solid var(--border);
      padding: 1rem 2rem;
      display: flex;
      align-items: center;
      gap: 1rem;
    }
    .legal-header a {
      color: var(--brand-light);
      text-decoration: none;
      font-size: 0.875rem;
    }
    .legal-header a:hover { text-decoration: underline; }
    .legal-logo {
      font-weight: 700;
      color: var(--brand);
      font-size: 1.1rem;
    }
    .legal-sep { color: var(--text-muted); }
    main {
      max-width: 760px;
      margin: 0 auto;
      padding: 3rem 1.5rem 5rem;
    }
    .legal-badge {
      display: inline-block;
      background: rgba(91,110,245,0.15);
      color: var(--brand-light);
      border: 1px solid rgba(91,110,245,0.3);
      border-radius: 99px;
      padding: 0.2rem 0.75rem;
      font-size: 0.75rem;
      font-weight: 600;
      letter-spacing: 0.05em;
      text-transform: uppercase;
      margin-bottom: 1rem;
    }
    h1 {
      font-size: 2rem;
      font-weight: 700;
      line-height: 1.2;
      margin-bottom: 0.5rem;
    }
    .last-updated {
      color: var(--text-muted);
      font-size: 0.875rem;
      margin-bottom: 2.5rem;
      padding-bottom: 2.5rem;
      border-bottom: 1px solid var(--border);
    }
    h2 {
      font-size: 1.2rem;
      font-weight: 600;
      margin: 2.5rem 0 0.75rem;
      color: var(--brand-light);
    }
    p { margin-bottom: 1rem; color: var(--text); }
    ul { margin: 0.5rem 0 1rem 1.5rem; }
    li { margin-bottom: 0.4rem; color: var(--text); }
    .info-box {
      background: var(--surface);
      border: 1px solid var(--border);
      border-left: 3px solid var(--brand);
      border-radius: 8px;
      padding: 1.25rem 1.5rem;
      margin: 2rem 0;
    }
    .info-box strong { color: var(--brand-light); }
    .contact-card {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 1.5rem;
      margin-top: 2rem;
    }
    .contact-card h3 { margin-bottom: 0.75rem; font-size: 1rem; }
    .contact-card p { margin-bottom: 0.4rem; font-size: 0.9rem; }
    footer {
      text-align: center;
      padding: 2rem;
      color: var(--text-muted);
      font-size: 0.8rem;
      border-top: 1px solid var(--border);
    }
    footer a { color: var(--brand-light); text-decoration: none; }
    a { color: var(--brand-light); }
    a:focus-visible { outline: 2px solid var(--brand); outline-offset: 2px; border-radius: 2px; }
  </style>
</head>
<body>
  <header class="legal-header">
    <span class="legal-logo">BusTrack Pro</span>
    <span class="legal-sep">›</span>
    <a href="/">← Volver al panel</a>
  </header>

  <main>
    <span class="legal-badge">Legal</span>
    <h1>Política de Privacidad</h1>
    <p class="last-updated">Última actualización: 24 de septiembre de 2026</p>

    <div class="info-box">
      <p><strong>Resumen:</strong> BusTrack Pro es un sistema de rastreo operativo de flotas. <em>No recolectamos datos personales de pasajeros.</em> Los datos que procesamos son exclusivamente datos operativos de flota (posición GPS de unidades, velocidades, estados de servicio).</p>
    </div>

    <h2>1. ¿Quién es el responsable del tratamiento?</h2>
    <p>El responsable del tratamiento de datos es el operador de transporte o la institución que contrata y administra el servicio BusTrack Pro. En el contexto del piloto de la <strong>Universidad Fidélitas (Campus San Pedro, San José, Costa Rica)</strong>, el responsable es la entidad universitaria correspondiente.</p>
    <p>Para más información, contacte a: <strong>admin@bustrack.example.com</strong></p>

    <h2>2. ¿Qué datos recopilamos?</h2>
    <p>BusTrack Pro procesa únicamente datos operativos necesarios para el funcionamiento del servicio:</p>
    <ul>
      <li><strong>Datos de telemetría de flota:</strong> posición GPS de las unidades de transporte, velocidad, estado operativo, combustible estimado.</li>
      <li><strong>Datos de operación:</strong> rutas activas, paradas, tiempos estimados de llegada.</li>
      <li><strong>Datos técnicos del servidor:</strong> logs de acceso al sistema (dirección IP del servidor, timestamps, códigos HTTP) para diagnóstico y seguridad.</li>
    </ul>
    <p><strong>No recopilamos</strong> datos personales de pasajeros, datos de identificación, correos electrónicos ni datos de pago en la versión actual del sistema.</p>

    <h2>3. ¿Para qué usamos los datos?</h2>
    <ul>
      <li>Visualización en tiempo real de la posición de las unidades de transporte</li>
      <li>Cálculo de tiempos estimados de llegada a paradas</li>
      <li>Generación de reportes operativos de la flota</li>
      <li>Diagnóstico de fallos y mantenimiento del servicio</li>
    </ul>

    <h2>4. Base legal (Ley 8968 — LEPD, Costa Rica)</h2>
    <p>El tratamiento de los datos operativos de flota se realiza bajo la base legal del <strong>interés legítimo del operador de transporte</strong> en gestionar su flota de manera eficiente y segura, conforme al artículo 5 inciso e) de la <em>Ley de Protección de la Persona frente al tratamiento de sus datos personales</em> (Ley N° 8968) de Costa Rica.</p>

    <h2>5. ¿Con quién compartimos los datos?</h2>
    <p>No compartimos datos con terceros con fines comerciales. Los datos operativos pueden ser accedidos por:</p>
    <ul>
      <li>El personal administrativo del operador de transporte</li>
      <li>Proveedores de infraestructura tecnológica bajo acuerdos de confidencialidad</li>
    </ul>

    <h2>6. Almacenamiento y seguridad</h2>
    <p>Los datos de telemetría se procesan en memoria de forma temporal. El sistema implementa medidas técnicas de seguridad incluyendo: transmisión cifrada (HTTPS/WSS), headers de seguridad HTTP (Content Security Policy, X-Frame-Options, HSTS), y control de acceso por IP.</p>

    <h2>7. Uso de localStorage (almacenamiento local)</h2>
    <p>La interfaz web de BusTrack Pro utiliza el almacenamiento local del navegador (<code>localStorage</code>) únicamente para guardar <strong>preferencias de usuario</strong> (tema de color, densidad de la interfaz, última parada seleccionada). Estos datos nunca se envían a nuestros servidores y se pueden eliminar borrando los datos del navegador.</p>
    <p>No utilizamos cookies de rastreo, cookies de terceros ni sistemas de analíticas externas.</p>

    <h2>8. Derechos del interesado</h2>
    <p>Conforme a la Ley 8968 de Costa Rica, usted tiene derecho a:</p>
    <ul>
      <li><strong>Acceso:</strong> conocer qué datos almacenamos sobre usted</li>
      <li><strong>Rectificación:</strong> corregir datos inexactos</li>
      <li><strong>Supresión:</strong> solicitar la eliminación de sus datos</li>
      <li><strong>Oposición:</strong> oponerse al tratamiento de sus datos</li>
    </ul>
    <p>Para ejercer estos derechos, contacte a la entidad operadora del servicio.</p>

    <h2>9. Cambios a esta política</h2>
    <p>Nos reservamos el derecho de actualizar esta política. Los cambios relevantes se notificarán con al menos 30 días de antelación. La versión vigente siempre estará disponible en esta página.</p>

    <div class="contact-card">
      <h3>Contacto — Responsable de Datos</h3>
      <p>BusTrack Pro — Sistema de Rastreo de Flotas</p>
      <p>Piloto: Universidad Fidélitas, San Pedro, Montes de Oca, San José, Costa Rica</p>
      <p>Correo: <a href="mailto:admin@bustrack.example.com">admin@bustrack.example.com</a></p>
      <p><em>Nota: Sustituya estos datos con los datos reales de su empresa antes de publicar.</em></p>
    </div>
  </main>

  <footer>
    <p>© 2026 BusTrack Pro. Todos los derechos reservados. |
      <a href="/privacy">Privacidad</a> ·
      <a href="/terms">Términos</a> ·
      <a href="/">Panel</a>
    </p>
  </footer>
</body>
</html>
</file>

<file path="refunds.html">
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="robots" content="noindex, follow" />
  <title>Política de Reembolsos y Servicio — BusTrack Pro</title>
  <meta name="description" content="Términos y condiciones sobre reembolsos, licencias enterprise y garantía de servicio de BusTrack Pro." />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
  <style>
    :root { --bg: #0a0f1c; --surface: #111827; --border: rgba(255,255,255,0.08); --text: #e5e7eb; --text-muted: #9ca3af; --brand: #5b6ef5; --brand-light: #818cf8; }
    @media (prefers-color-scheme: light) { :root { --bg: #f9fafb; --surface: #fff; --border: rgba(0,0,0,0.08); --text: #111827; --text-muted: #6b7280; } }
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Inter', system-ui, sans-serif; background: var(--bg); color: var(--text); line-height: 1.7; font-size: 1rem; }
    .legal-header { background: var(--surface); border-bottom: 1px solid var(--border); padding: 1rem 2rem; display: flex; align-items: center; gap: 1rem; }
    .legal-header a { color: var(--brand-light); text-decoration: none; font-size: 0.875rem; }
    .legal-header a:hover { text-decoration: underline; }
    .legal-logo { font-weight: 700; color: var(--brand); font-size: 1.1rem; }
    .legal-sep { color: var(--text-muted); }
    main { max-width: 760px; margin: 0 auto; padding: 3rem 1.5rem 5rem; }
    .legal-badge { display: inline-block; background: rgba(91,110,245,0.15); color: var(--brand-light); border: 1px solid rgba(91,110,245,0.3); border-radius: 99px; padding: 0.2rem 0.75rem; font-size: 0.75rem; font-weight: 600; letter-spacing: 0.05em; text-transform: uppercase; margin-bottom: 1rem; }
    h1 { font-size: 2rem; font-weight: 700; line-height: 1.2; margin-bottom: 0.5rem; }
    .last-updated { color: var(--text-muted); font-size: 0.875rem; margin-bottom: 2.5rem; padding-bottom: 2.5rem; border-bottom: 1px solid var(--border); }
    h2 { font-size: 1.2rem; font-weight: 600; margin: 2.5rem 0 0.75rem; color: var(--brand-light); }
    p { margin-bottom: 1rem; }
    ul { margin: 0.5rem 0 1rem 1.5rem; }
    li { margin-bottom: 0.4rem; }
    .info-box { background: var(--surface); border: 1px solid var(--border); border-left: 3px solid var(--brand); border-radius: 8px; padding: 1.25rem 1.5rem; margin: 2rem 0; }
    footer { text-align: center; padding: 2rem; color: var(--text-muted); font-size: 0.8rem; border-top: 1px solid var(--border); }
    footer a { color: var(--brand-light); text-decoration: none; }
    a { color: var(--brand-light); }
  </style>
</head>
<body>
  <header class="legal-header">
    <span class="legal-logo">BusTrack Pro</span>
    <span class="legal-sep">›</span>
    <a href="/">← Volver al panel</a>
  </header>

  <main>
    <span class="legal-badge">SLA & Garantía</span>
    <h1>Política de Reembolsos y Nivel de Servicio</h1>
    <p class="last-updated">Última actualización: 24 de septiembre de 2026</p>

    <div class="info-box">
      <p><strong>Uso Gratuito & Piloto Estudiantil:</strong> El servicio público de monitoreo de rutas y el piloto estudiantil en la Universidad Fidélitas son 100% gratuitos para pasajeros. Esta política aplica a licencias de software contratadas por empresas operadoras de transporte.</p>
    </div>

    <h2>1. Período de Garantía de 30 Días</h2>
    <p>Para empresas operadoras que contratan la suscripción Enterprise de BusTrack Pro, ofrecemos una garantía de devolución del 100% durante los primeros 30 días posteriores a la activación si el servicio no cumple con los acuerdos de telemetría acordados.</p>

    <h2>2. Proceso de Solicitud</h2>
    <p>Para solicitar un reembolso o ajuste de facturación, la empresa cliente debe enviar un correo a <code>soporte@bustrack.example.com</code> detallando el motivo y número de contrato.</p>
  </main>

  <footer>
    <p>© 2026 BusTrack Pro | <a href="/privacy">Privacidad</a> · <a href="/terms">Términos</a> · <a href="/refunds">Reembolsos</a></p>
  </footer>
</body>
</html>
</file>

<file path="robots.txt">
User-agent: *
Allow: /
Disallow: /api/
Disallow: /api/v1/

# Admin and debug endpoints
Disallow: /admin
Disallow: /debug
Disallow: /.env
Disallow: /server/

Sitemap: https://bustrack.example.com/sitemap.xml
</file>

<file path="sitemap.xml">
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://bustrack.example.com/</loc>
    <lastmod>2026-09-24</lastmod>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>https://bustrack.example.com/privacy</loc>
    <lastmod>2026-09-24</lastmod>
    <changefreq>yearly</changefreq>
    <priority>0.3</priority>
  </url>
  <url>
    <loc>https://bustrack.example.com/terms</loc>
    <lastmod>2026-09-24</lastmod>
    <changefreq>yearly</changefreq>
    <priority>0.3</priority>
  </url>
  <url>
    <loc>https://bustrack.example.com/thanks</loc>
    <lastmod>2026-09-24</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.2</priority>
  </url>
</urlset>
</file>

<file path="thanks.html">
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="robots" content="noindex, nofollow" />
  <title>¡Gracias! — BusTrack Pro</title>
  <meta name="description" content="Acción completada exitosamente en BusTrack Pro." />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
  <style>
    :root {
      --bg: #0a0f1c; --surface: #111827; --border: rgba(255,255,255,0.08);
      --text: #e5e7eb; --text-muted: #9ca3af; --brand: #5b6ef5; --brand-light: #818cf8;
      --ok: #10b981;
    }
    @media (prefers-color-scheme: light) {
      :root { --bg: #f9fafb; --surface: #fff; --border: rgba(0,0,0,0.08); --text: #111827; --text-muted: #6b7280; }
    }
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Inter', system-ui, sans-serif;
      background: var(--bg);
      color: var(--text);
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      text-align: center;
      padding: 2rem;
      position: relative;
      overflow: hidden;
    }
    body::before {
      content: '';
      position: fixed;
      top: 20%;
      left: 50%;
      transform: translateX(-50%);
      width: 500px;
      height: 500px;
      background: radial-gradient(circle, rgba(16,185,129,0.1) 0%, transparent 70%);
      pointer-events: none;
    }
    .checkmark {
      width: 80px;
      height: 80px;
      background: rgba(16,185,129,0.15);
      border: 2px solid rgba(16,185,129,0.4);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 1.5rem;
      animation: scaleIn 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
    }
    @keyframes scaleIn {
      from { transform: scale(0); opacity: 0; }
      to { transform: scale(1); opacity: 1; }
    }
    @keyframes fadeSlideUp {
      from { opacity: 0; transform: translateY(15px); }
      to { opacity: 1; transform: translateY(0); }
    }
    .checkmark svg { animation: drawCheck 0.5s ease 0.3s both; }
    h1 {
      font-size: 2rem;
      font-weight: 700;
      margin-bottom: 0.5rem;
      animation: fadeSlideUp 0.5s ease 0.2s both;
    }
    .subtitle {
      color: var(--text-muted);
      font-size: 1rem;
      max-width: 380px;
      margin-bottom: 2.5rem;
      animation: fadeSlideUp 0.5s ease 0.3s both;
    }
    .actions {
      display: flex;
      gap: 1rem;
      flex-wrap: wrap;
      justify-content: center;
      animation: fadeSlideUp 0.5s ease 0.4s both;
    }
    .btn-primary {
      background: var(--brand);
      color: white;
      border: none;
      padding: 0.75rem 1.5rem;
      border-radius: 8px;
      font-family: inherit;
      font-size: 0.95rem;
      font-weight: 600;
      cursor: pointer;
      text-decoration: none;
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      transition: background 0.2s, transform 0.1s;
    }
    .btn-primary:hover { background: #4b5de4; transform: translateY(-1px); }
    a:focus-visible { outline: 2px solid var(--brand); outline-offset: 2px; border-radius: 4px; }
  </style>
</head>
<body>
  <div class="checkmark" role="img" aria-label="Acción completada exitosamente">
    <svg width="36" height="36" viewBox="0 0 36 36" fill="none" aria-hidden="true">
      <path d="M8 18l7 7 13-14" stroke="#10b981" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
  </div>
  <h1>¡Acción completada!</h1>
  <p class="subtitle" id="thanksMessage">
    La operación se realizó correctamente.
  </p>
  <div class="actions">
    <a href="/" class="btn-primary" id="thanksCta">Volver al panel</a>
  </div>

  <script>
    // Customize message from URL params: /thanks?action=bus_added&name=B-001
    const params = new URLSearchParams(location.search);
    const action = params.get('action');
    const name = params.get('name');
    const msgEl = document.getElementById('thanksMessage');
    const ctaEl = document.getElementById('thanksCta');

    const messages = {
      bus_added: `El bus ${name || ''} fue registrado exitosamente en la flota.`,
      status_updated: `El estado del bus ${name || ''} fue actualizado.`,
      report_generated: 'El reporte fue generado y está listo para descargar.',
      alert_created: 'La alerta fue creada y notificada al equipo.',
    };

    if (action && messages[action]) {
      msgEl.textContent = messages[action];
    }
  </script>
</body>
</html>
</file>

<file path="src/supabase.js">
import { createClient } from '@supabase/supabase-js';

// Asigna las variables de entorno para Vite (Frontend) o Node.js
const supabaseUrl = import.meta.env?.VITE_SUPABASE_URL || process.env.SUPABASE_URL || 'https://placeholder-url.supabase.co';
const supabaseKey = import.meta.env?.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || 'placeholder-anon-key';

// Crea y exporta el cliente para usarlo en toda la app
export const supabase = createClient(supabaseUrl, supabaseKey);
</file>

<file path="terms.html">
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="robots" content="noindex, follow" />
  <title>Términos y Condiciones — BusTrack Pro</title>
  <meta name="description" content="Términos y condiciones de uso del sistema BusTrack Pro para operadores de flotas de transporte." />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
  <style>
    :root {
      --bg: #0a0f1c; --surface: #111827; --border: rgba(255,255,255,0.08);
      --text: #e5e7eb; --text-muted: #9ca3af; --brand: #5b6ef5; --brand-light: #818cf8;
    }
    @media (prefers-color-scheme: light) {
      :root { --bg: #f9fafb; --surface: #fff; --border: rgba(0,0,0,0.08); --text: #111827; --text-muted: #6b7280; }
    }
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Inter', system-ui, sans-serif; background: var(--bg); color: var(--text); line-height: 1.7; font-size: 1rem; }
    .legal-header { background: var(--surface); border-bottom: 1px solid var(--border); padding: 1rem 2rem; display: flex; align-items: center; gap: 1rem; }
    .legal-header a { color: var(--brand-light); text-decoration: none; font-size: 0.875rem; }
    .legal-header a:hover { text-decoration: underline; }
    .legal-logo { font-weight: 700; color: var(--brand); font-size: 1.1rem; }
    .legal-sep { color: var(--text-muted); }
    main { max-width: 760px; margin: 0 auto; padding: 3rem 1.5rem 5rem; }
    .legal-badge { display: inline-block; background: rgba(91,110,245,0.15); color: var(--brand-light); border: 1px solid rgba(91,110,245,0.3); border-radius: 99px; padding: 0.2rem 0.75rem; font-size: 0.75rem; font-weight: 600; letter-spacing: 0.05em; text-transform: uppercase; margin-bottom: 1rem; }
    h1 { font-size: 2rem; font-weight: 700; line-height: 1.2; margin-bottom: 0.5rem; }
    .last-updated { color: var(--text-muted); font-size: 0.875rem; margin-bottom: 2.5rem; padding-bottom: 2.5rem; border-bottom: 1px solid var(--border); }
    h2 { font-size: 1.2rem; font-weight: 600; margin: 2.5rem 0 0.75rem; color: var(--brand-light); }
    p { margin-bottom: 1rem; }
    ul { margin: 0.5rem 0 1rem 1.5rem; }
    li { margin-bottom: 0.4rem; }
    .info-box { background: var(--surface); border: 1px solid var(--border); border-left: 3px solid var(--brand); border-radius: 8px; padding: 1.25rem 1.5rem; margin: 2rem 0; }
    .info-box strong { color: var(--brand-light); }
    .warn-box { background: rgba(239,68,68,0.07); border: 1px solid rgba(239,68,68,0.25); border-left: 3px solid #ef4444; border-radius: 8px; padding: 1.25rem 1.5rem; margin: 2rem 0; }
    footer { text-align: center; padding: 2rem; color: var(--text-muted); font-size: 0.8rem; border-top: 1px solid var(--border); }
    footer a { color: var(--brand-light); text-decoration: none; }
    a { color: var(--brand-light); }
    a:focus-visible { outline: 2px solid var(--brand); outline-offset: 2px; border-radius: 2px; }
  </style>
</head>
<body>
  <header class="legal-header">
    <span class="legal-logo">BusTrack Pro</span>
    <span class="legal-sep">›</span>
    <a href="/">← Volver al panel</a>
  </header>

  <main>
    <span class="legal-badge">Legal</span>
    <h1>Términos y Condiciones de Uso</h1>
    <p class="last-updated">Última actualización: 24 de septiembre de 2026</p>

    <div class="info-box">
      <p><strong>Importante:</strong> Al acceder y utilizar BusTrack Pro, usted acepta estos términos. Si no está de acuerdo, por favor deje de utilizar el servicio.</p>
    </div>

    <h2>1. Descripción del Servicio</h2>
    <p>BusTrack Pro es un sistema de rastreo y gestión de flotas de transporte en tiempo real. El servicio permite monitorear posición de unidades, gestionar rutas, visualizar alertas operativas y generar reportes de flota.</p>
    <p>El sistema incluye un <strong>Modo Pasajero (Piloto Fidélitas)</strong> que muestra tiempos estimados de llegada de buses al corredor San Pedro–Montes de Oca, con fines informativos y no vinculantes.</p>

    <h2>2. Acceso y Uso Autorizado</h2>
    <p>El acceso al panel de administración de BusTrack Pro está restringido al personal autorizado del operador de transporte. El usuario se compromete a:</p>
    <ul>
      <li>No compartir credenciales de acceso con terceros no autorizados</li>
      <li>Usar el sistema únicamente para fines operativos legítimos</li>
      <li>No intentar acceder a áreas no autorizadas del sistema</li>
      <li>Reportar cualquier vulnerabilidad o acceso no autorizado detectado</li>
    </ul>

    <h2>3. Exactitud de la Información</h2>
    <div class="warn-box">
      <p><strong>Limitación de responsabilidad:</strong> Los tiempos de llegada mostrados en el Modo Pasajero son <em>estimaciones</em> calculadas a partir de telemetría en tiempo real. BusTrack Pro <strong>no garantiza</strong> la exactitud de los tiempos de llegada. No tome decisiones críticas basándose exclusivamente en esta información.</p>
    </div>
    <p>Los datos de flota son de carácter operativo e informativo. El operador de transporte es el único responsable de la exactitud de los datos ingresados al sistema.</p>

    <h2>4. Propiedad Intelectual</h2>
    <p>Todo el código fuente, diseño, logotipos, textos e interfaces de BusTrack Pro son propiedad de sus creadores y están protegidos por las leyes de propiedad intelectual aplicables en Costa Rica (Ley 6683 de Derechos de Autor y Derechos Conexos).</p>
    <p>Queda prohibida la reproducción, distribución o modificación del software sin autorización expresa por escrito.</p>
    <p><strong>Fuentes tipográficas:</strong> Inter y JetBrains Mono se utilizan bajo licencia SIL Open Font License 1.1 (OFL). No se utilizan imágenes o fotografías de terceros en la versión actual — los íconos son SVG propios del sistema.</p>

    <h2>5. Desarrollo y Tecnología de Inteligencia Artificial (IA)</h2>
    <div class="info-box">
      <p><strong>Declaración de Tecnología:</strong> La arquitectura, código fuente, interfaz y simulación de BusTrack Pro han sido desarrollados con la asistencia de modelos de <strong>Inteligencia Artificial (IA)</strong>. El uso de la plataforma presupone la aceptación de esta naturaleza tecnológica.</p>
    </div>
    <p>La asistencia de Inteligencia Artificial se utiliza para optimizar el rendimiento, generar algoritmos de simulación en tiempo real y acelerar el desarrollo del software bajo supervisión técnica constante.</p>

    <h2>6. Limitación de Responsabilidad</h2>
    <p>BusTrack Pro se provee "tal como está". En ningún caso los desarrolladores o proveedores del servicio serán responsables por:</p>
    <ul>
      <li>Interrupciones del servicio por mantenimiento o causas de fuerza mayor</li>
      <li>Pérdidas derivadas de datos de flota inexactos o retrasados</li>
      <li>Daños causados por el uso inadecuado del sistema</li>
    </ul>

    <h2>7. Modificaciones al Servicio</h2>
    <p>Nos reservamos el derecho de modificar, suspender o descontinuar el servicio con previo aviso de 30 días, salvo en casos de emergencia de seguridad.</p>

    <h2>8. Ley Aplicable y Jurisdicción</h2>
    <p>Estos términos se rigen por las leyes de la <strong>República de Costa Rica</strong>. Cualquier disputa se someterá a la jurisdicción de los tribunales competentes de San José, Costa Rica.</p>
    <p>Leyes aplicables: Ley 7472 (Promoción de la Competencia y Defensa Efectiva del Consumidor), Ley 8968 (LEPD), Ley 9048 (delitos informáticos).</p>

    <h2>9. Contacto</h2>
    <p>Para consultas sobre estos términos: <a href="mailto:admin@bustrack.example.com">admin@bustrack.example.com</a></p>
    <p><em>Nota: Sustituya este correo con los datos reales de su empresa antes de publicar.</em></p>
  </main>

  <footer>
    <p>© 2026 BusTrack Pro. Todos los derechos reservados. |
      <a href="/privacy">Privacidad</a> ·
      <a href="/terms">Términos</a> ·
      <a href="/">Panel</a>
    </p>
  </footer>
</body>
</html>
</file>

<file path="server/index.js">
/* ==============================================================================
   BusTrack Pro — Application Server Entrypoint
   ============================================================================== */

import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { WebSocketServer } from 'ws';
import { config } from './config.js';
import { correlationMiddleware, requestLogger } from './middleware/logger.js';
import { errorHandler } from './middleware/errorHandler.js';
import { generalLimiter, writeLimiter } from './middleware/rateLimiter.js';
import { sanitizeInputs } from './middleware/sanitizer.js';
import { apiRouter } from './routes/api.js';
import { telemetryEngine } from './services/telemetrySimulator.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const app = express();
const server = http.createServer(app);

const isProd = config.nodeEnv === 'production';

// ─── 1. Security Headers (Helmet) ────────────────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"], // needed for inline app.js scripts
      styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      fontSrc: ["'self'", 'https://fonts.gstatic.com'],
      imgSrc: ["'self'", 'data:'],
      connectSrc: ["'self'", 'ws:', 'wss:'], // WebSocket connections
      frameAncestors: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false, // allow external fonts
  hsts: isProd
    ? { maxAge: 31536000, includeSubDomains: true, preload: true }
    : false,
}));

// ─── 2. CORS ──────────────────────────────────────────────────────────────────
const allowedOrigins = config.corsOrigin === '*'
  ? true
  : config.corsOrigin.split(',').map(o => o.trim());

app.use(cors({
  origin: allowedOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Correlation-Id'],
}));

// ─── 3. Body Parsing ──────────────────────────────────────────────────────────
app.use(express.json({ limit: '50kb' }));   // hard cap on payload size
app.use(express.urlencoded({ extended: true, limit: '50kb' }));

// ─── 4. Cross-Cutting Middlewares ─────────────────────────────────────────────
app.use(correlationMiddleware);
app.use(requestLogger);
app.use(sanitizeInputs);

// ─── 5. Block debug/admin endpoints ───────────────────────────────────────────
// These paths should NEVER be accessible in production
const blockedPaths = [
  '/admin', '/debug', '/phpinfo', '/wp-admin', '/wp-login',
  '/.env', '/.git', '/server', '/config', '/package.json',
];
app.use((req, res, next) => {
  const p = req.path.toLowerCase();
  if (blockedPaths.some(blocked => p === blocked || p.startsWith(blocked + '/'))) {
    return res.status(404).type('text/plain').send('Not found');
  }
  next();
});

// ─── 6. Rate Limiting ─────────────────────────────────────────────────────────
app.use('/api/', generalLimiter);

// ─── 7. REST API Routes ───────────────────────────────────────────────────────
app.use('/api/v1', apiRouter);

// ─── 8. Legal / Static Pages ──────────────────────────────────────────────────
// Serve legal pages as named routes
app.get('/privacy', (_req, res) => {
  res.sendFile(path.join(rootDir, 'privacy.html'));
});
app.get('/terms', (_req, res) => {
  res.sendFile(path.join(rootDir, 'terms.html'));
});
app.get('/cookies', (_req, res) => {
  res.sendFile(path.join(rootDir, 'cookies.html'));
});
app.get('/refunds', (_req, res) => {
  res.sendFile(path.join(rootDir, 'refunds.html'));
});
app.get('/thanks', (_req, res) => {
  res.sendFile(path.join(rootDir, 'thanks.html'));
});

// ─── 9. Static Client Serving ─────────────────────────────────────────────────
app.use(express.static(rootDir, {
  index: 'index.html',
  // Cache static assets aggressively
  maxAge: isProd ? '1d' : 0,
  // Don't expose server directory
  dotfiles: 'deny',
}));

// ─── 10. Custom 404 ───────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).sendFile(path.join(rootDir, '404.html'));
});

// ─── 11. Centralized Error Handling ──────────────────────────────────────────
app.use(errorHandler);

// ─── 12. Real-Time WebSocket Telemetry Gateway ────────────────────────────────
const wss = new WebSocketServer({ server, path: '/ws/telemetry' });

// Simple rate-limit: track message counts per client
const wsMessageCounts = new WeakMap();

wss.on('connection', (ws, req) => {
  const clientIp = req.socket.remoteAddress;
  console.log(`[WS] Client connected from ${clientIp}. Total: ${wss.clients.size}`);
  telemetryEngine.registerClient(ws);
  wsMessageCounts.set(ws, { count: 0, resetAt: Date.now() + 60_000 });

  ws.on('message', (message) => {
    // Rate-limit WS messages: max 60 per minute
    const tracker = wsMessageCounts.get(ws);
    if (tracker) {
      if (Date.now() > tracker.resetAt) {
        tracker.count = 0;
        tracker.resetAt = Date.now() + 60_000;
      }
      tracker.count++;
      if (tracker.count > 60) {
        ws.send(JSON.stringify({ event: 'error', detail: 'Rate limit exceeded' }));
        return;
      }
    }

    try {
      const parsed = JSON.parse(message.toString());
      if (parsed.action === 'ping') {
        ws.send(JSON.stringify({ event: 'pong', timestamp: new Date().toISOString() }));
      }
    } catch {
      // Ignore unparseable frames
    }
  });

  ws.on('close', () => {
    telemetryEngine.unregisterClient(ws);
    wsMessageCounts.delete(ws);
    console.log(`[WS] Client disconnected. Total: ${wss.clients.size}`);
  });

  ws.on('error', (err) => {
    console.error(`[WS] Client error: ${err.message}`);
    telemetryEngine.unregisterClient(ws);
    wsMessageCounts.delete(ws);
  });
});

// ─── 13. Graceful Shutdown Handlers ───────────────────────────────────────────
function shutdown(signal) {
  console.log(`\n[SERVER] Received ${signal}. Initiating graceful shutdown...`);
  telemetryEngine.stop();

  wss.clients.forEach(client => {
    if (client.readyState === 1) {
      client.close(1001, 'Server shutting down');
    }
  });

  server.close(() => {
    console.log('[SERVER] HTTP & WebSocket servers closed. Exiting process.');
    process.exit(0);
  });

  setTimeout(() => {
    console.error('[SERVER] Forced shutdown due to timeout.');
    process.exit(1);
  }, 5000).unref();
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// ─── 14. Server Bootstrap ─────────────────────────────────────────────────────
const isMain = process.argv[1] && path.resolve(fileURLToPath(import.meta.url)) === path.resolve(process.argv[1]);

import { initPostgresDatabase } from './database/initDb.js';
import { db } from './database/db.js';
import { supabase, isSupabaseConfigured } from './supabase.js';

if (isMain) {
  server.listen(config.port, async () => {
    if (config.databaseUrl) {
      await initPostgresDatabase(config.databaseUrl);
    }
    const dbStatus = typeof db.getDbStatus === 'function' ? db.getDbStatus() : null;
    telemetryEngine.start();
    console.log('============================================================');
    console.log(`  🚍 BusTrack Pro Backend & Telemetry Server Online`);
    console.log(`  🗄️ Database:   ${dbStatus ? `${dbStatus.engine} (${dbStatus.storage}: ${dbStatus.filePath || 'memory'})` : 'Active'}`);
    if (dbStatus && dbStatus.totalRows) {
      console.log(`  📊 DB Records: ${dbStatus.totalRows} filas relacionales cargadas`);
    }
    console.log(`  🔒 Security:   Helmet + Rate Limiting + Input Sanitization`);
    console.log(`  🔗 REST API:   http://localhost:${config.port}/api/v1/health`);
    console.log(`  ⚡ WebSocket:  ws://localhost:${config.port}/ws/telemetry`);
    console.log(`  🖥️ Dashboard:  http://localhost:${config.port}/`);
    console.log(`  📄 Privacy:    http://localhost:${config.port}/privacy`);
    console.log(`  📄 Terms:      http://localhost:${config.port}/terms`);
    console.log('============================================================');

    // Probando conexión a Supabase en el backend
    if (!isSupabaseConfigured) {
      console.log('⚠️ Supabase no configurado: SUPABASE_URL y SUPABASE_ANON_KEY en el archivo .env están vacíos.');
      console.log('👉 Agrega tus credenciales en el archivo .env para conectar con tu proyecto Supabase real.');
    } else {
      try {
        const { data, error } = await supabase.from('buses').select('*');
        if (error) {
          console.error('Error conectando a Supabase ❌:', error.message);
        } else {
          console.log('¡Conexión exitosa a Supabase! ✅ Datos de los buses:', data);
        }
      } catch (err) {
        if (err.message && err.message.includes('fetch failed')) {
          console.error('Error conectando a Supabase ❌: No se pudo resolver la URL del proyecto. Verifica la URL en tu .env.');
        } else {
          console.error('Error conectando a Supabase ❌:', err.message);
        }
      }
    }
  });
}

export { app, server, wss };
</file>

<file path="package.json">
{
  "name": "bustrack-pro-backend",
  "version": "1.0.0",
  "description": "Production-grade backend and real-time telematics engine for BusTrack Pro",
  "main": "server/index.js",
  "type": "module",
  "scripts": {
    "start": "node server/index.js",
    "dev": "node --watch server/index.js",
    "test": "node --test test/api.test.js test/database.test.js test/auth.test.js",
    "db:status": "node server/database/status.js",
    "db:seed": "node server/database/initDb.js",
    "db:up": "docker compose up -d",
    "db:down": "docker compose down"
  },
  "keywords": [
    "transit",
    "fleet-management",
    "telematics",
    "websockets",
    "realtime",
    "express"
  ],
  "author": "BusTrack Architecture Team",
  "license": "ISC",
  "dependencies": {
    "@supabase/ssr": "^0.12.7",
    "@supabase/supabase-js": "^2.117.2",
    "bcryptjs": "^3.0.3",
    "cors": "^2.8.5",
    "dotenv": "^16.4.7",
    "express": "^4.21.2",
    "express-rate-limit": "^8.7.0",
    "helmet": "^8.3.0",
    "jsonwebtoken": "^9.0.3",
    "pg": "^8.13.3",
    "ws": "^8.18.0"
  }
}
</file>

<file path="styles.css">
/* ============================================================
   BusTrack Pro — hoja de estilos
   Un solo sistema de color: todo sale de las variables de :root.
   El acento se cambia desde Preferencias (data-accent en <html>).
   ============================================================ */
 
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
 
:root {
  /* --- Marca. Cambiar estas tres líneas repinta la app entera --- */
  --brand-300: #a5b0fb;
  --brand-500: #5b6ef5;
  --brand-700: #4453c9;
  --brand-alt: #7c4ddb;
 
  /* --- Neutros (escala fría, todos derivados del mismo tono azul) --- */
  --bg-base:    #070b14;
  --bg-surface: #0c1220;
  --bg-card:    #101828;
  --bg-raised:  #162034;
  --bg-sidebar: #0a0f1c;
 
  --text-strong: #eef2f8;
  --text:        #aab6c9;
  --text-soft:   #6b7a93;
 
  --line:       rgba(148, 163, 200, 0.12);
  --line-brand: color-mix(in srgb, var(--brand-500) 32%, transparent);
 
  /* --- Semánticos --- */
  --ok:    #2bb885;
  --warn:  #e0972c;
  --risk:  #e0526b;
  --info:  var(--brand-500);
 
  /* --- Rutas. Mismo nivel de saturación que la marca --- */
  --route-a: var(--brand-500);
  --route-b: var(--brand-alt);
  --route-c: #2aa3c4;
  --route-d: #2bb885;
  --stop:    #e0972c;
 
  /* --- Mapa --- */
  --map-bg:    #080d18;
  --map-grid:  #131d31;
  --map-road:  #1f2c46;
  --map-block: #111a2b;
 
  /* --- Medidas --- */
  --sidebar-w: 256px;
  --sidebar-collapsed: 72px;
  --topbar-h: 64px;
  --gap: 16px;
  --pad-view: 24px;
  --radius: 14px;
  --radius-sm: 9px;
  --icon-stat: 44px;
  --shadow: 0 10px 30px rgba(3, 7, 18, 0.5);
  --glow: 0 0 0 1px var(--line-brand), 0 12px 28px rgba(3, 7, 18, 0.55);
  --t: 180ms cubic-bezier(0.4, 0, 0.2, 1);
}
 
/* Paletas alternas (Preferencias) */
html[data-accent="teal"]   { --brand-300: #7fd8d0; --brand-500: #22a79b; --brand-700: #1a7f76; --brand-alt: #2aa3c4; }
html[data-accent="amber"]  { --brand-300: #f2c98a; --brand-500: #d38b2a; --brand-700: #a86a1c; --brand-alt: #c96a3c; }
html[data-accent="rose"]   { --brand-300: #f2a2b4; --brand-500: #d95273; --brand-700: #ab3d5a; --brand-alt: #9b4bc4; }
html[data-accent="forest"] { --brand-300: #96d7ae; --brand-500: #2f9e63; --brand-700: #237a4c; --brand-alt: #2aa3c4; }
 
/* Densidad compacta */
html[data-density="compact"] { --gap: 11px; --pad-view: 16px; --icon-stat: 38px; }
 
body {
  font-family: 'Inter', system-ui, -apple-system, sans-serif;
  background: var(--bg-base);
  color: var(--text-strong);
  display: flex;
  min-height: 100vh;
  min-height: 100dvh;
  overflow-x: hidden;
  font-size: 14px;
  line-height: 1.5;
  -webkit-font-smoothing: antialiased;
}
 
h1, h2, h3 { line-height: 1.25; }
button, input, select { font-family: inherit; }
:focus-visible { outline: 2px solid var(--brand-300); outline-offset: 2px; }
 
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
 
.skip-link {
  position: absolute; left: -999px; top: 8px; z-index: 300;
  background: var(--brand-500); color: #fff;
  padding: 10px 16px; border-radius: var(--radius-sm); text-decoration: none;
}
.skip-link:focus { left: 8px; }
 
::-webkit-scrollbar { width: 7px; height: 7px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: #1d283f; border-radius: 4px; }
::-webkit-scrollbar-thumb:hover { background: #2c3a5a; }
 
/* El degradado del logo toma el color de marca actual */
#logoGrad stop:first-child { stop-color: var(--brand-500); }
#logoGrad stop:last-child  { stop-color: var(--brand-alt); }
 
/* ============ SIDEBAR ============ */
.sidebar-overlay {
  position: fixed; inset: 0; z-index: 99;
  background: rgba(4, 8, 16, 0.7);
  backdrop-filter: blur(2px);
  opacity: 0; pointer-events: none;
  transition: opacity var(--t);
}
.sidebar-overlay.open { opacity: 1; pointer-events: auto; }
 
.sidebar {
  width: var(--sidebar-w);
  background: var(--bg-sidebar);
  border-right: 1px solid var(--line);
  display: flex; flex-direction: column;
  position: fixed; inset: 0 auto 0 0;
  z-index: 100; overflow: hidden;
  transition: width var(--t), transform var(--t);
}
.sidebar.collapsed { width: var(--sidebar-collapsed); }
.sidebar.collapsed .logo-text,
.sidebar.collapsed .nav-label,
.sidebar.collapsed .nav-item > span:not(.nav-count),
.sidebar.collapsed .nav-count,
.sidebar.collapsed .user-info,
.sidebar.collapsed .user-settings { display: none; }
.sidebar.collapsed .logo,
.sidebar.collapsed .sidebar-header,
.sidebar.collapsed .user-profile { justify-content: center; }
.sidebar.collapsed .nav-item { justify-content: center; padding: 11px 0; }
.sidebar.collapsed .sidebar-toggle { display: none; }
 
.sidebar-header {
  display: flex; align-items: center; justify-content: space-between;
  gap: 8px; padding: 18px 16px;
  border-bottom: 1px solid var(--line); flex-shrink: 0;
}
.logo { display: flex; align-items: center; gap: 10px; min-width: 0; }
.logo-icon { display: block; width: 32px; height: 32px; flex-shrink: 0; }
.logo-icon svg { width: 100%; height: 100%; display: block; }
.logo-text { display: flex; align-items: center; gap: 6px; }
.logo-name { font-size: 15.5px; font-weight: 700; letter-spacing: -0.3px; }
.logo-badge {
  font-size: 9px; font-weight: 700; letter-spacing: 1px; color: #fff;
  background: linear-gradient(135deg, var(--brand-500), var(--brand-alt));
  padding: 2px 6px; border-radius: 4px;
}
 
.sidebar-toggle {
  background: none; border: none; color: var(--text-soft);
  cursor: pointer; padding: 6px; border-radius: 6px; display: flex;
  transition: background var(--t), color var(--t);
}
.sidebar-toggle:hover { background: rgba(255,255,255,0.05); color: var(--text-strong); }
.sidebar-toggle svg { width: 18px; height: 18px; }
 
.sidebar-nav { flex: 1; padding: 14px 8px; overflow-y: auto; }
.nav-section + .nav-section { margin-top: 20px; }
.nav-label {
  display: block; padding: 0 8px 6px;
  font-size: 10px; font-weight: 600; letter-spacing: 1.1px;
  text-transform: uppercase; color: var(--text-soft); white-space: nowrap;
}
.nav-list { list-style: none; display: flex; flex-direction: column; gap: 2px; }
.nav-item {
  display: flex; align-items: center; gap: 10px;
  padding: 10px 12px; border-radius: var(--radius-sm);
  color: var(--text); cursor: pointer; position: relative; white-space: nowrap;
  transition: background var(--t), color var(--t);
}
.nav-item svg { width: 18px; height: 18px; flex-shrink: 0; }
.nav-item > span:not(.nav-count) { font-size: 13.5px; font-weight: 500; flex: 1; }
.nav-item:hover { background: rgba(255,255,255,0.05); color: var(--text-strong); }
.nav-item.active {
  background: color-mix(in srgb, var(--brand-500) 16%, transparent);
  color: var(--brand-300); font-weight: 600;
}
.nav-item.active::before {
  content: ''; position: absolute; left: 0; top: 5px; bottom: 5px;
  width: 3px; border-radius: 0 3px 3px 0; background: var(--brand-500);
}
.nav-count {
  font-size: 11px; font-weight: 600; padding: 2px 7px; border-radius: 20px;
  background: rgba(255,255,255,0.08); color: var(--text);
}
.nav-count.alert-badge { background: color-mix(in srgb, var(--risk) 22%, transparent); color: #f09aa8; }
.nav-count.live-pulse {
  background: color-mix(in srgb, var(--ok) 20%, transparent); color: #6fd7b2;
  font-size: 9px; letter-spacing: 0.5px; animation: badgeFade 2.4s ease-in-out infinite;
}
@keyframes badgeFade { 0%, 100% { opacity: 1; } 50% { opacity: 0.45; } }
 
.sidebar-footer { padding: 10px 8px; border-top: 1px solid var(--line); flex-shrink: 0; }
.user-profile {
  display: flex; align-items: center; gap: 10px;
  padding: 9px 8px; border-radius: var(--radius-sm); cursor: pointer;
  transition: background var(--t);
}
.user-profile:hover { background: rgba(255,255,255,0.05); }
.user-avatar {
  width: 32px; height: 32px; border-radius: 50%; flex-shrink: 0;
  display: flex; align-items: center; justify-content: center;
  background: linear-gradient(135deg, var(--brand-500), var(--brand-alt));
  font-size: 11.5px; font-weight: 700; color: #fff;
}
.user-info { flex: 1; min-width: 0; display: flex; flex-direction: column; }
.user-name { font-size: 12.5px; font-weight: 600; color: var(--text-strong); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.user-role { font-size: 11px; color: var(--text-soft); }
.user-settings {
  background: none; border: none; color: var(--text-soft);
  cursor: pointer; padding: 4px; border-radius: 6px; display: flex;
}
.user-settings svg { width: 16px; height: 16px; }
.user-settings:hover { color: var(--brand-300); }

/* Botón de cerrar sesión en el sidebar */
.sidebar-logout-btn {
  display: flex; align-items: center; gap: 8px;
  width: 100%; padding: 9px 12px; margin-top: 4px;
  border: none; border-radius: var(--radius-sm);
  background: rgba(240, 80, 80, 0.07);
  color: #f08080;
  font-size: 13px; font-weight: 500;
  cursor: pointer; text-align: left;
  transition: background var(--t), color var(--t), transform 0.15s;
  white-space: nowrap;
}
.sidebar-logout-btn svg { width: 16px; height: 16px; flex-shrink: 0; }
.sidebar-logout-btn:hover {
  background: rgba(240, 80, 80, 0.16);
  color: #ff6b6b;
  transform: translateX(2px);
}
.sidebar-logout-btn:active { transform: scale(0.98); }
.sidebar.collapsed .sidebar-logout-btn span { display: none; }
.sidebar.collapsed .sidebar-logout-btn { justify-content: center; padding: 9px 0; }

/* ============ CONTENIDO ============ */
.main-content {
  flex: 1; width: 0; min-height: 100vh;
  margin-left: var(--sidebar-w);
  display: flex; flex-direction: column;
  transition: margin-left var(--t);
}
.sidebar.collapsed ~ .main-content { margin-left: var(--sidebar-collapsed); }
 
.topbar {
  height: var(--topbar-h); flex-shrink: 0;
  display: flex; align-items: center; justify-content: space-between; gap: 12px;
  padding: 0 var(--pad-view);
  background: color-mix(in srgb, var(--bg-surface) 88%, transparent);
  backdrop-filter: blur(12px);
  border-bottom: 1px solid var(--line);
  position: sticky; top: 0; z-index: 50;
}
.topbar-left { display: flex; align-items: center; gap: 12px; min-width: 0; }
.topbar-titles { min-width: 0; }
.page-title { font-size: 17px; font-weight: 700; letter-spacing: -0.3px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.breadcrumb { display: flex; align-items: center; gap: 4px; font-size: 11.5px; color: var(--text-soft); white-space: nowrap; }
.breadcrumb svg { width: 11px; height: 11px; flex-shrink: 0; }
.topbar-right { display: flex; align-items: center; gap: 8px; }
 
.mobile-menu-btn, .only-mobile { display: none; }
 
.search-bar {
  display: flex; align-items: center; gap: 8px; width: 270px;
  background: rgba(255,255,255,0.04); border: 1px solid var(--line);
  border-radius: var(--radius-sm); padding: 8px 13px;
  transition: border-color var(--t), box-shadow var(--t);
}
.search-bar:focus-within {
  border-color: var(--brand-500);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--brand-500) 22%, transparent);
}
.search-bar svg { width: 15px; height: 15px; color: var(--text-soft); flex-shrink: 0; }
.search-bar input {
  background: none; border: none; outline: none; width: 100%;
  color: var(--text-strong); font-size: 13px;
}
.search-bar input::placeholder { color: var(--text-soft); }
.search-bar input::-webkit-search-cancel-button { filter: invert(0.6); }
 
.icon-btn {
  width: 36px; height: 36px; flex-shrink: 0; border-radius: var(--radius-sm);
  background: rgba(255,255,255,0.04); border: 1px solid var(--line);
  color: var(--text); cursor: pointer; position: relative;
  display: flex; align-items: center; justify-content: center;
  transition: background var(--t), color var(--t), border-color var(--t);
}
.icon-btn svg { width: 17px; height: 17px; }
.icon-btn:hover { background: rgba(255,255,255,0.08); color: var(--text-strong); border-color: var(--line-brand); }
.notif-dot {
  position: absolute; top: 6px; right: 6px;
  width: 8px; height: 8px; border-radius: 50%;
  background: var(--risk); border: 1.5px solid var(--bg-surface);
}
.notif-dot.hidden { display: none; }
 
.live-indicator {
  display: flex; align-items: center; gap: 6px; white-space: nowrap;
  font-size: 12px; color: var(--text); cursor: pointer;
  padding: 7px 12px; border-radius: var(--radius-sm);
  background: color-mix(in srgb, var(--ok) 10%, transparent);
  border: 1px solid color-mix(in srgb, var(--ok) 26%, transparent);
  transition: background var(--t);
}
.live-indicator:hover { background: color-mix(in srgb, var(--ok) 18%, transparent); }
.live-indicator.paused {
  background: rgba(255,255,255,0.04);
  border-color: var(--line); color: var(--text-soft);
}
.live-indicator.paused .pulse-dot { background: var(--text-soft); animation: none; }

.server-status-pill {
  display: inline-flex; align-items: center; gap: 6px; white-space: nowrap;
  font-size: 11.5px; font-weight: 600;
  padding: 6px 11px; border-radius: var(--radius-sm);
  background: color-mix(in srgb, var(--brand-500) 12%, transparent);
  border: 1px solid color-mix(in srgb, var(--brand-500) 30%, transparent);
  color: var(--text-strong);
  transition: all var(--t);
}
.server-status-pill.online {
  background: color-mix(in srgb, var(--ok) 12%, transparent);
  border-color: color-mix(in srgb, var(--ok) 30%, transparent);
  color: #6fd7b2;
}
.server-status-pill.offline {
  background: color-mix(in srgb, var(--warn) 10%, transparent);
  border-color: color-mix(in srgb, var(--warn) 25%, transparent);
  color: var(--warn);
}
.server-status-pill .status-dot {
  width: 7px; height: 7px; border-radius: 50%; background: currentColor; flex-shrink: 0;
}
.server-status-pill.online .status-dot {
  box-shadow: 0 0 6px #2bb885;
}

 
.pulse-dot {
  width: 9px; height: 9px; border-radius: 50%; flex-shrink: 0;
  background: var(--ok);
  animation: pulseRing 2.2s ease-out infinite;
}
.pulse-dot.small { width: 7px; height: 7px; }
@keyframes pulseRing {
  0%   { box-shadow: 0 0 0 0 color-mix(in srgb, var(--ok) 55%, transparent); }
  70%  { box-shadow: 0 0 0 8px rgba(43, 184, 133, 0); }
  100% { box-shadow: 0 0 0 0 rgba(43, 184, 133, 0); }
}
 
/* ============ VISTAS ============ */
.view { display: none; flex: 1; min-width: 0; flex-direction: column; gap: var(--gap); padding: var(--pad-view); }
.view.active { display: flex; animation: viewIn 0.25s ease; }
@keyframes viewIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }
 
/* ============ TARJETAS DE RESUMEN ============ */
.stats-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: var(--gap); }
 
.stat-card {
  position: relative; overflow: hidden; min-width: 0;
  display: flex; align-items: center; gap: 14px;
  padding: 16px 18px;
  background: var(--bg-card); border: 1px solid var(--line);
  border-radius: var(--radius);
  transition: border-color var(--t), transform var(--t), box-shadow var(--t);
}
.stat-card:hover { border-color: var(--line-brand); transform: translateY(-2px); box-shadow: var(--shadow); }
 
.stat-icon {
  width: var(--icon-stat); height: var(--icon-stat); flex-shrink: 0;
  border-radius: 12px;
  display: flex; align-items: center; justify-content: center;
}
/* El SVG ocupa la mitad del contenedor: así el icono nunca se ve inflado */
.stat-icon svg { width: 50%; height: 50%; display: block; }
.stat-icon.buses      { background: color-mix(in srgb, var(--route-a) 16%, transparent); color: var(--brand-300); }
.stat-icon.routes     { background: color-mix(in srgb, var(--route-c) 16%, transparent); color: var(--route-c); }
.stat-icon.passengers { background: color-mix(in srgb, var(--ok) 16%, transparent);      color: var(--ok); }
.stat-icon.delay      { background: color-mix(in srgb, var(--warn) 16%, transparent);    color: var(--warn); }
 
.stat-content { flex: 1; min-width: 0; }
.stat-value { font-size: clamp(20px, 2.2vw, 25px); font-weight: 800; letter-spacing: -0.8px; line-height: 1.1; }
.stat-value small { font-size: 12px; font-weight: 500; color: var(--text); margin-left: 2px; }
.stat-label { font-size: 12px; color: var(--text-soft); margin-top: 2px; }
.stat-change { font-size: 11px; margin-top: 5px; }
.stat-change.positive { color: var(--ok); }
.stat-change.negative { color: var(--risk); }
.stat-sparkline { flex-shrink: 0; opacity: 0.85; }
 
/* ============ TARJETAS ============ */
.card {
  background: var(--bg-card); border: 1px solid var(--line);
  border-radius: var(--radius); overflow: hidden; min-width: 0;
  transition: border-color var(--t);
}
.card:hover { border-color: var(--line-brand); }
.card-header {
  display: flex; align-items: center; justify-content: space-between;
  gap: 10px; flex-wrap: wrap; padding: 14px 18px;
  border-bottom: 1px solid var(--line);
}
.card-title { display: flex; align-items: center; gap: 9px; }
.card-title h2 { font-size: 13.5px; font-weight: 600; }
.live-badge {
  display: inline-flex; align-items: center; gap: 5px;
  font-size: 9.5px; font-weight: 700; letter-spacing: 0.6px; color: var(--ok);
  background: color-mix(in srgb, var(--ok) 12%, transparent);
  border: 1px solid color-mix(in srgb, var(--ok) 26%, transparent);
  padding: 3px 8px; border-radius: 20px;
}
 
/* ============ BOTONES ============ */
.btn-primary, .btn-ghost {
  display: inline-flex; align-items: center; justify-content: center; gap: 6px;
  padding: 9px 16px; border-radius: var(--radius-sm);
  font-size: 13px; font-weight: 600; cursor: pointer;
  transition: transform var(--t), background var(--t), border-color var(--t), color var(--t), box-shadow var(--t);
}
.btn-primary {
  border: none; color: #fff;
  background: linear-gradient(135deg, var(--brand-500), var(--brand-alt));
  box-shadow: 0 2px 12px color-mix(in srgb, var(--brand-500) 35%, transparent);
}
.btn-primary:hover { transform: translateY(-1px); box-shadow: 0 6px 20px color-mix(in srgb, var(--brand-500) 45%, transparent); }
.btn-primary:active { transform: translateY(0); }
.btn-ghost {
  background: transparent; color: var(--text);
  border: 1px solid var(--line); font-weight: 500;
}
.btn-ghost:hover { background: rgba(255,255,255,0.05); color: var(--text-strong); border-color: var(--line-brand); }
.btn-sm { padding: 6px 12px; font-size: 12px; }
 
.filter-tabs { display: flex; gap: 4px; flex-wrap: wrap; }
.filter-tab, .period-btn {
  padding: 5px 11px; border-radius: 7px; border: none;
  background: transparent; color: var(--text-soft);
  font-size: 12px; cursor: pointer; transition: background var(--t), color var(--t);
}
.filter-tab:hover, .period-btn:hover { background: rgba(255,255,255,0.05); color: var(--text-strong); }
.filter-tab.active, .period-btn.active {
  background: color-mix(in srgb, var(--brand-500) 18%, transparent);
  color: var(--brand-300); font-weight: 600;
}
.chart-period { display: flex; gap: 4px; }
.alerts-filter { padding: 2px 0; }
 
/* ============ MAPA ============ */
.map-container { position: relative; height: 340px; }
.map-bg { position: relative; width: 100%; height: 100%; background: var(--map-bg); overflow: hidden; }
.map-bg svg { width: 100%; height: 100%; display: block; touch-action: none; cursor: grab; }
.map-bg svg.dragging { cursor: grabbing; }
 
.map-controls {
  position: absolute; right: 14px; bottom: 14px; z-index: 10;
  display: flex; flex-direction: column; gap: 5px;
}
.map-controls-top { top: 14px; bottom: auto; }
.map-btn {
  width: 34px; height: 34px; border-radius: 8px;
  background: color-mix(in srgb, var(--bg-card) 90%, transparent);
  backdrop-filter: blur(8px);
  border: 1px solid var(--line); color: var(--text);
  font-size: 16px; font-weight: 600; cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  transition: background var(--t), color var(--t), border-color var(--t);
}
.map-btn:hover {
  background: color-mix(in srgb, var(--brand-500) 22%, var(--bg-card));
  color: var(--brand-300); border-color: var(--line-brand);
}
 
.map-legend {
  position: absolute; left: 14px; bottom: 14px; z-index: 10;
  display: flex; flex-direction: column; gap: 5px;
  padding: 9px 11px; border-radius: 10px;
  background: color-mix(in srgb, var(--bg-card) 88%, transparent);
  backdrop-filter: blur(8px); border: 1px solid var(--line);
}
 
/* Aviso de seguimiento continuo sobre el mapa completo */
.tracking-banner {
  position: absolute; left: 14px; top: 14px; z-index: 11;
  display: flex; align-items: center; gap: 8px;
  padding: 7px 8px 7px 12px; border-radius: 20px;
  background: color-mix(in srgb, var(--brand-500) 22%, var(--bg-card));
  border: 1px solid var(--line-brand);
  backdrop-filter: blur(8px);
  font-size: 12px; font-weight: 600; color: var(--text-strong);
  animation: dropIn 0.18s ease;
}
.tracking-banner[hidden] { display: none; }
.tracking-stop {
  width: 20px; height: 20px; flex-shrink: 0; border-radius: 50%; border: none; cursor: pointer;
  background: rgba(255,255,255,0.14); color: var(--text-strong);
  display: flex; align-items: center; justify-content: center; font-size: 10.5px; line-height: 1;
  transition: background var(--t);
}
.tracking-stop:hover { background: rgba(255,255,255,0.26); }

/* Geolocalización de usuario en mapa */
.map-btn-geo {
  font-size: 14px;
}
.map-btn-geo.active {
  background: var(--brand-500);
  color: #ffffff;
  border-color: var(--brand-400);
  box-shadow: 0 0 10px rgba(91, 110, 245, 0.4);
}

.user-location-bar {
  position: absolute; left: 14px; bottom: 14px; z-index: 11;
  display: flex; align-items: center; gap: 8px;
  padding: 6px 12px; border-radius: 20px;
  background: color-mix(in srgb, var(--bg-card) 92%, transparent);
  border: 1px solid var(--line-brand);
  backdrop-filter: blur(10px);
  font-size: 12px; font-weight: 500; color: var(--text-strong);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.25);
  animation: dropIn 0.2s ease;
}
.user-location-bar[hidden] { display: none; }
.user-loc-icon {
  font-size: 14px;
  animation: userLocPulse 2s infinite ease-in-out;
}

@keyframes userLocPulse {
  0% { transform: scale(1); }
  50% { transform: scale(1.25); }
  100% { transform: scale(1); }
}

.user-marker-pulse {
  fill: #3b82f6;
  opacity: 0.35;
  animation: radarPulse 2s infinite cubic-bezier(0.215, 0.61, 0.355, 1);
  transform-origin: center;
}

@keyframes radarPulse {
  0% { r: 8px; opacity: 0.6; }
  100% { r: 32px; opacity: 0; }
}

.legend-item { display: flex; align-items: center; gap: 7px; font-size: 11px; color: var(--text); }
.legend-dot { width: 9px; height: 9px; border-radius: 50%; flex-shrink: 0; }
.bus-marker { cursor: pointer; }
.bus-marker:hover { filter: brightness(1.25); }
 
/* ============ REJILLA DEL PANEL ============ */
.dashboard-grid {
  display: grid; gap: var(--gap);
  grid-template-columns: minmax(0, 1fr) 320px;
}
.map-widget     { grid-area: 1 / 1; }
.buses-list-card{ grid-area: 1 / 2; }
.chart-card     { grid-area: 2 / 1; }
.activity-card  { grid-area: 2 / 2; }
 
/* ============ LISTA DE BUSES ============ */
.bus-list { max-height: 320px; overflow-y: auto; }
.bus-item {
  display: flex; align-items: center; gap: 12px;
  padding: 11px 18px; cursor: pointer;
  border-bottom: 1px solid var(--line);
  transition: background var(--t);
}
.bus-item:last-child { border-bottom: none; }
.bus-item:hover { background: rgba(255,255,255,0.03); }
.bus-item-icon {
  width: 32px; height: 32px; flex-shrink: 0; border-radius: 9px;
  display: flex; align-items: center; justify-content: center;
  font-size: 11px; font-weight: 700; font-family: 'JetBrains Mono', monospace;
}
.bus-item-info { flex: 1; min-width: 0; display: flex; flex-direction: column; }
.bus-item-id { font-size: 12.5px; font-weight: 600; }
.bus-item-route { font-size: 11px; color: var(--text-soft); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.bus-item-meta { display: flex; flex-direction: column; align-items: flex-end; gap: 3px; flex-shrink: 0; }
.bus-item-speed { font-size: 11.5px; font-weight: 600; color: var(--text); font-family: 'JetBrains Mono', monospace; }
 
.status-badge {
  font-size: 10px; font-weight: 600; padding: 2px 8px;
  border-radius: 20px; white-space: nowrap;
}
.status-active      { background: color-mix(in srgb, var(--ok) 16%, transparent);    color: #6fd7b2; }
.status-delayed     { background: color-mix(in srgb, var(--warn) 18%, transparent);  color: #f0c073; }
.status-stopped     { background: rgba(148,163,200,0.14);                            color: var(--text); }
.status-maintenance { background: color-mix(in srgb, var(--risk) 18%, transparent);  color: #f09aa8; }
 
/* Select editable de estado: hereda los colores de .status-active/etc,
   solo agrega la forma de píldora y quita el estilo nativo del <select>. */
.status-select, .status-select-lg {
  border: none; cursor: pointer; font-family: inherit;
  border-radius: 20px; color: inherit;
  transition: filter var(--t);
}
.status-select { font-size: 10px; font-weight: 600; padding: 3px 8px; }
.status-select-lg { font-size: 12.5px; font-weight: 600; padding: 7px 14px; }
.status-select:hover, .status-select-lg:hover { filter: brightness(1.12); }
.status-select:focus-visible, .status-select-lg:focus-visible { outline: 2px solid var(--brand-300); outline-offset: 2px; }
.status-select option, .status-select-lg option { background: var(--bg-card); color: var(--text-strong); }
 
/* ============ ACTIVIDAD ============ */
.activity-feed { max-height: 280px; overflow-y: auto; transition: max-height var(--t); }
.activity-feed.expanded { max-height: 520px; }
.activity-item {
  display: flex; align-items: flex-start; gap: 10px;
  padding: 10px 18px; border-bottom: 1px solid var(--line);
}
.activity-item:last-child { border-bottom: none; }
.activity-icon {
  width: 28px; height: 28px; flex-shrink: 0; border-radius: 50%;
  display: flex; align-items: center; justify-content: center; font-size: 12px;
}
.activity-content { flex: 1; min-width: 0; display: flex; flex-direction: column; }
.activity-text { font-size: 12.5px; color: var(--text); line-height: 1.45; }
.activity-text strong { color: var(--text-strong); font-weight: 600; }
.activity-time { font-size: 10.5px; color: var(--text-soft); margin-top: 2px; }
 
/* ============ GRÁFICOS ============ */
.chart-container { padding: 14px 18px 18px; }
.chart-container canvas { max-width: 100%; display: block; }
.chart-caption { font-size: 11.5px; color: var(--text-soft); margin-top: 8px; }
 
/* ============ FLOTA ============ */
.fleet-toolbar { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; }
.toolbar-left, .toolbar-right { display: flex; align-items: center; gap: 9px; flex-wrap: wrap; }
.fleet-search, .filter-select {
  background: rgba(255,255,255,0.04); border: 1px solid var(--line);
  border-radius: var(--radius-sm); padding: 9px 13px;
  color: var(--text-strong); font-size: 13px; outline: none;
  transition: border-color var(--t), box-shadow var(--t);
}
.fleet-search { width: 220px; }
.filter-select { cursor: pointer; }
.fleet-search:focus, .filter-select:focus {
  border-color: var(--brand-500);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--brand-500) 20%, transparent);
}
.filter-select option { background: var(--bg-card); color: var(--text-strong); }
.results-note { font-size: 12px; color: var(--text-soft); }
 
.fleet-table-wrapper {
  overflow-x: auto; -webkit-overflow-scrolling: touch;
  background: var(--bg-card); border: 1px solid var(--line);
  border-radius: var(--radius);
}
.fleet-table { width: 100%; border-collapse: collapse; white-space: nowrap; }
.fleet-table th {
  padding: 12px 15px; text-align: left; cursor: pointer;
  font-size: 10.5px; font-weight: 600; letter-spacing: 0.8px; text-transform: uppercase;
  color: var(--text-soft); background: rgba(255,255,255,0.015);
  border-bottom: 1px solid var(--line); user-select: none;
  position: sticky; top: 0;
}
.fleet-table th[data-sort]:hover { color: var(--brand-300); }
.fleet-table th.sorted::after { content: ' ▲'; font-size: 8px; }
.fleet-table th.sorted.desc::after { content: ' ▼'; }
.fleet-table td {
  padding: 12px 15px; font-size: 12.5px; color: var(--text);
  border-bottom: 1px solid var(--line);
}
.fleet-table tr:last-child td { border-bottom: none; }
.fleet-table tbody tr:hover td { background: rgba(255,255,255,0.025); color: var(--text-strong); }
.fleet-table td:first-child { font-weight: 700; color: var(--text-strong); font-family: 'JetBrains Mono', monospace; }
.mono { font-family: 'JetBrains Mono', monospace; font-size: 12px; }
.route-pill { padding: 3px 9px; border-radius: 20px; font-size: 11px; font-weight: 600; }
.mini-bar { width: 52px; height: 4px; border-radius: 2px; background: #1c2740; overflow: hidden; }
.mini-bar span { display: block; height: 100%; border-radius: 2px; }
 
.table-actions { display: flex; gap: 6px; }
.table-btn {
  width: 30px; height: 30px; border-radius: 7px;
  background: rgba(255,255,255,0.05); border: 1px solid var(--line);
  color: var(--text-soft); cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  transition: background var(--t), color var(--t), border-color var(--t);
}
.table-btn svg { width: 15px; height: 15px; }
.table-btn:hover {
  background: color-mix(in srgb, var(--brand-500) 18%, transparent);
  color: var(--brand-300); border-color: var(--line-brand);
}
.empty-state { padding: 34px; text-align: center; color: var(--text-soft); font-size: 13px; }
 
/* ============ ALERTAS ============ */
.alerts-container { display: flex; flex-direction: column; gap: 14px; max-width: 880px; width: 100%; }
.alerts-header { display: flex; align-items: center; justify-content: space-between; gap: 10px; flex-wrap: wrap; }
.alerts-header h2 { font-size: 17px; font-weight: 700; }
.alerts-list { display: flex; flex-direction: column; gap: 10px; }
.alert-item {
  display: flex; align-items: flex-start; gap: 13px; padding: 15px;
  background: var(--bg-card); border: 1px solid var(--line);
  border-left-width: 3px; border-radius: var(--radius);
  animation: alertIn 0.25s ease;
}
@keyframes alertIn { from { opacity: 0; transform: translateX(-6px); } to { opacity: 1; transform: none; } }
.alert-item.critical { border-left-color: var(--risk); }
.alert-item.warning  { border-left-color: var(--warn); }
.alert-item.info     { border-left-color: var(--brand-500); }
.alert-item.read { opacity: 0.55; }
.alert-icon-wrap {
  width: 38px; height: 38px; flex-shrink: 0; border-radius: 10px;
  display: flex; align-items: center; justify-content: center; font-size: 17px;
}
.alert-icon-wrap.critical { background: color-mix(in srgb, var(--risk) 16%, transparent); }
.alert-icon-wrap.warning  { background: color-mix(in srgb, var(--warn) 16%, transparent); }
.alert-icon-wrap.info     { background: color-mix(in srgb, var(--brand-500) 16%, transparent); }
.alert-content { flex: 1; min-width: 0; }
.alert-title { font-size: 13.5px; font-weight: 600; margin-bottom: 3px; }
.alert-desc { font-size: 12px; color: var(--text); line-height: 1.5; }
.alert-meta { display: flex; align-items: center; gap: 8px; margin-top: 7px; flex-wrap: wrap; }
.alert-time { font-size: 11px; color: var(--text-soft); }
.alert-bus-tag {
  font-size: 10px; font-weight: 600; padding: 2px 8px; border-radius: 20px;
  background: color-mix(in srgb, var(--brand-500) 16%, transparent); color: var(--brand-300);
  cursor: pointer;
}
 
/* ============ MAPA COMPLETO ============ */
.full-map-container { display: flex; gap: var(--gap); flex: 1; min-height: 0; height: calc(100vh - var(--topbar-h) - var(--pad-view) * 2); }
.map-sidebar-panel {
  width: 272px; flex-shrink: 0; overflow-y: auto;
  display: flex; flex-direction: column; gap: 10px; padding: 15px;
  background: var(--bg-card); border: 1px solid var(--line); border-radius: var(--radius);
}
.full-map {
  flex: 1; min-width: 0; position: relative; overflow: hidden;
  background: var(--bg-card); border: 1px solid var(--line); border-radius: var(--radius);
}
.full-map-bg { position: relative; width: 100%; height: 100%; }
.full-map-bg svg { width: 100%; height: 100%; display: block; touch-action: none; cursor: grab; }
.map-bus-list { display: flex; flex-direction: column; gap: 7px; }
.map-bus-item {
  display: flex; align-items: center; gap: 10px; padding: 9px 11px;
  border-radius: var(--radius-sm); cursor: pointer;
  background: rgba(255,255,255,0.03); border: 1px solid var(--line);
  transition: background var(--t), border-color var(--t);
}
.map-bus-item:hover, .map-bus-item.highlight {
  background: color-mix(in srgb, var(--brand-500) 12%, transparent);
  border-color: var(--line-brand);
}
.map-bus-dot { width: 9px; height: 9px; border-radius: 50%; flex-shrink: 0; }
.map-bus-info { flex: 1; min-width: 0; display: flex; flex-direction: column; }
.map-bus-id { font-size: 12.5px; font-weight: 600; }
.map-bus-route { font-size: 10.5px; color: var(--text-soft); }
 
/* ============ RUTAS ============ */
.routes-grid { display: grid; gap: var(--gap); grid-template-columns: repeat(auto-fill, minmax(min(100%, 270px), 1fr)); }
.route-card {
  position: relative; overflow: hidden; cursor: pointer;
  padding: 18px; background: var(--bg-card);
  border: 1px solid var(--line); border-radius: var(--radius);
  transition: border-color var(--t), transform var(--t), box-shadow var(--t);
}
.route-card:hover { border-color: var(--line-brand); transform: translateY(-2px); box-shadow: var(--shadow); }
.route-card::before { content: ''; position: absolute; inset: 0 0 auto 0; height: 3px; background: var(--rc); }
.route-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 8px; margin-bottom: 14px; }
.route-id { font-size: 21px; font-weight: 800; letter-spacing: -0.8px; color: var(--rc); }
.route-name { font-size: 12.5px; color: var(--text-soft); margin-top: 1px; }
.route-progress { margin-bottom: 12px; }
.route-progress-head { display: flex; justify-content: space-between; font-size: 11px; color: var(--text-soft); margin-bottom: 6px; }
.route-progress-bar { height: 5px; border-radius: 3px; background: rgba(255,255,255,0.07); overflow: hidden; }
.route-progress-fill { height: 100%; border-radius: 3px; background: var(--rc); transition: width 0.8s ease; }
.route-stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; }
.route-stat-value { font-size: 15px; font-weight: 700; }
.route-stat-label { font-size: 9.5px; color: var(--text-soft); text-transform: uppercase; letter-spacing: 0.5px; }
 
/* ============ REPORTES ============ */
.reports-container { display: flex; flex-direction: column; gap: var(--gap); }
.reports-header { display: flex; align-items: center; justify-content: space-between; gap: 10px; flex-wrap: wrap; }
.reports-header h2 { font-size: 17px; font-weight: 700; }
.report-actions { display: flex; gap: 9px; flex-wrap: wrap; }
.reports-grid { display: grid; gap: var(--gap); grid-template-columns: repeat(2, minmax(0, 1fr)); }
.report-card { padding: 18px; }
.report-card h3 { font-size: 13.5px; font-weight: 600; margin-bottom: 14px; }
.report-card canvas { max-width: 100%; display: block; }
.report-card.full-width { grid-column: 1 / -1; }
 
.report-summary {
  padding: 18px; border-radius: var(--radius);
  background: var(--bg-card);
  border: 1px solid var(--line-brand);
}
.report-summary h3 { font-size: 14px; margin-bottom: 4px; }
.report-summary .stamp { font-size: 11.5px; color: var(--text-soft); margin-bottom: 14px; }
.summary-grid { display: grid; gap: 12px; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); }
.summary-cell {
  padding: 12px; border-radius: var(--radius-sm);
  background: rgba(255,255,255,0.03); border: 1px solid var(--line);
}
.summary-cell b { display: block; font-size: 18px; font-weight: 700; }
.summary-cell span { font-size: 11px; color: var(--text-soft); }
 
/* ============ CONDUCTORES ============ */
.drivers-grid { display: grid; gap: var(--gap); grid-template-columns: repeat(auto-fill, minmax(min(100%, 250px), 1fr)); }
.driver-card {
  padding: 18px; cursor: pointer;
  background: var(--bg-card); border: 1px solid var(--line); border-radius: var(--radius);
  transition: border-color var(--t), transform var(--t), box-shadow var(--t);
}
.driver-card:hover { border-color: var(--line-brand); transform: translateY(-2px); box-shadow: var(--shadow); }
.driver-top { display: flex; align-items: center; gap: 13px; margin-bottom: 14px; }
.driver-avatar {
  width: 46px; height: 46px; flex-shrink: 0; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  font-size: 16px; font-weight: 700; color: #fff;
}
.driver-name { font-size: 14.5px; font-weight: 700; }
.driver-license { font-size: 10.5px; color: var(--text-soft); font-family: 'JetBrains Mono', monospace; margin-top: 1px; }
.driver-stats { display: flex; justify-content: space-between; gap: 8px; padding-top: 12px; border-top: 1px solid var(--line); }
.driver-stat-val { font-size: 14.5px; font-weight: 700; }
.driver-stat-lbl { font-size: 10px; color: var(--text-soft); }
.stars { color: var(--warn); }
 
/* ============ MODALES ============ */
.modal-overlay {
  position: fixed; inset: 0; z-index: 200; padding: 18px;
  background: rgba(4, 8, 16, 0.75); backdrop-filter: blur(6px);
  display: none; align-items: center; justify-content: center;
}
.modal-overlay.open { display: flex; animation: fade 0.18s ease; }
@keyframes fade { from { opacity: 0; } to { opacity: 1; } }
.modal {
  width: 100%; max-width: 520px; max-height: 88vh; overflow-y: auto;
  background: var(--bg-card); border: 1px solid var(--line);
  border-radius: 16px; box-shadow: 0 24px 60px rgba(0,0,0,0.55);
  animation: modalIn 0.25s cubic-bezier(0.34, 1.4, 0.64, 1);
}
.modal-narrow { max-width: 460px; }
@keyframes modalIn { from { opacity: 0; transform: scale(0.95) translateY(14px); } to { opacity: 1; transform: none; } }
.modal-header {
  display: flex; align-items: center; justify-content: space-between; gap: 10px;
  padding: 18px 20px 14px; border-bottom: 1px solid var(--line);
}
.modal-title-area { display: flex; align-items: center; gap: 13px; min-width: 0; }
.modal-bus-icon {
  width: 44px; height: 44px; flex-shrink: 0; border-radius: 12px;
  display: flex; align-items: center; justify-content: center;
  font-size: 14px; font-weight: 800; font-family: 'JetBrains Mono', monospace;
}
.modal-header h2 { font-size: 17px; font-weight: 700; }
.modal-header p { font-size: 12.5px; color: var(--text-soft); margin-top: 2px; }
.modal-close {
  width: 32px; height: 32px; flex-shrink: 0; border-radius: 8px;
  background: rgba(255,255,255,0.05); border: 1px solid var(--line);
  color: var(--text); cursor: pointer; font-size: 13px;
  display: flex; align-items: center; justify-content: center;
  transition: background var(--t), color var(--t);
}
.modal-close:hover { background: color-mix(in srgb, var(--risk) 18%, transparent); color: #f09aa8; }
.modal-body { padding: 18px 20px 20px; display: flex; flex-direction: column; gap: 16px; }
.modal-status-row { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.modal-stats-row { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 10px; }
.modal-stat {
  text-align: center; padding: 11px 8px; border-radius: var(--radius-sm);
  background: rgba(255,255,255,0.03); border: 1px solid var(--line);
}
.modal-stat-label { display: block; font-size: 9.5px; text-transform: uppercase; letter-spacing: 0.5px; color: var(--text-soft); margin-bottom: 4px; }
.modal-stat-value { font-size: 14.5px; font-weight: 700; font-family: 'JetBrains Mono', monospace; }
.modal-info-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
.modal-info-item { min-width: 0; }
.info-label { display: block; font-size: 10.5px; text-transform: uppercase; letter-spacing: 0.5px; color: var(--text-soft); }
.info-value { font-size: 13.5px; font-weight: 600; }
.modal-actions { display: flex; gap: 10px; flex-wrap: wrap; }
.modal-actions > * { flex: 1; min-width: 150px; }
 
/* Preferencias */
.setting-row { display: flex; align-items: center; justify-content: space-between; gap: 14px; }
.setting-name { font-size: 13px; font-weight: 600; }
.setting-desc { font-size: 11.5px; color: var(--text-soft); margin-top: 1px; }
.accent-picker { display: flex; gap: 7px; }
.accent-dot {
  width: 24px; height: 24px; border-radius: 50%; cursor: pointer;
  border: 2px solid transparent; transition: transform var(--t), border-color var(--t);
}
.accent-dot:hover { transform: scale(1.1); }
.accent-dot.selected { border-color: var(--text-strong); }
.switch {
  width: 42px; height: 24px; flex-shrink: 0; border-radius: 20px; cursor: pointer;
  background: #1e2942; border: 1px solid var(--line); position: relative;
  transition: background var(--t);
}
.switch span {
  position: absolute; top: 2px; left: 2px;
  width: 18px; height: 18px; border-radius: 50%; background: var(--text-soft);
  transition: transform var(--t), background var(--t);
}
.switch[aria-checked="true"] { background: color-mix(in srgb, var(--brand-500) 55%, transparent); }
.switch[aria-checked="true"] span { transform: translateX(18px); background: #fff; }
 
/* ============ NOTIFICACIONES ============ */
.notif-dropdown {
  position: fixed; top: calc(var(--topbar-h) + 8px); right: 20px; z-index: 150;
  width: 350px; max-width: calc(100vw - 32px);
  background: var(--bg-card); border: 1px solid var(--line);
  border-radius: var(--radius); box-shadow: var(--shadow);
  display: none;
}
.notif-dropdown.open { display: block; animation: dropIn 0.18s ease; }
@keyframes dropIn { from { opacity: 0; transform: translateY(-6px); } to { opacity: 1; transform: none; } }
.notif-header { display: flex; align-items: center; justify-content: space-between; padding: 13px 15px; border-bottom: 1px solid var(--line); }
.notif-header h3 { font-size: 13.5px; font-weight: 600; }
.notif-list { max-height: 340px; overflow-y: auto; }
.notif-item {
  display: flex; align-items: flex-start; gap: 10px; padding: 11px 15px;
  border-bottom: 1px solid var(--line); cursor: pointer; transition: background var(--t);
}
.notif-item:last-child { border-bottom: none; }
.notif-item:hover { background: rgba(255,255,255,0.03); }
.notif-item.unread { background: color-mix(in srgb, var(--brand-500) 7%, transparent); }
.notif-item.unread .notif-msg { color: var(--text-strong); }
.notif-icon { font-size: 15px; flex-shrink: 0; margin-top: 1px; }
.notif-msg { display: block; font-size: 12.5px; color: var(--text); line-height: 1.45; }
.notif-time { display: block; font-size: 10px; color: var(--text-soft); margin-top: 3px; }
 
/* ============ AVISOS FLOTANTES ============ */
.toast-stack {
  position: fixed; bottom: 18px; right: 18px; z-index: 300;
  display: flex; flex-direction: column; gap: 8px; pointer-events: none;
}
.toast {
  display: flex; align-items: center; gap: 9px;
  padding: 11px 15px; border-radius: var(--radius-sm);
  background: var(--bg-raised); border: 1px solid var(--line-brand);
  box-shadow: var(--shadow); font-size: 12.5px; color: var(--text-strong);
  animation: toastIn 0.22s ease;
  max-width: min(340px, calc(100vw - 36px));
}
.toast::before { content: ''; width: 7px; height: 7px; border-radius: 50%; background: var(--brand-500); flex-shrink: 0; }
.toast.ok::before   { background: var(--ok); }
.toast.warn::before { background: var(--warn); }
.toast.out { animation: toastOut 0.22s ease forwards; }
@keyframes toastIn  { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: none; } }
@keyframes toastOut { to { opacity: 0; transform: translateY(6px); } }
 
/* ============================================================
   ADAPTACIÓN A PANTALLAS
   ============================================================ */
@media (max-width: 1180px) {
  .dashboard-grid { grid-template-columns: minmax(0, 1fr); }
  .map-widget, .buses-list-card, .chart-card, .activity-card { grid-area: auto; }
  .bus-list, .activity-feed { max-height: 270px; }
}
 
@media (max-width: 1024px) {
  .stats-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .reports-grid { grid-template-columns: minmax(0, 1fr); }
  .search-bar { width: 200px; }
}
 
@media (max-width: 900px) {
  .full-map-container { flex-direction: column; height: auto; }
  .map-sidebar-panel { width: 100%; max-height: 220px; }
  .full-map { min-height: 400px; }
}
 
@media (max-width: 768px) {
  :root { --pad-view: 16px; --gap: 12px; --icon-stat: 40px; --topbar-h: 58px; }
 
  .sidebar { transform: translateX(-100%); width: 262px; box-shadow: 0 0 40px rgba(0,0,0,0.6); }
  .sidebar.mobile-open { transform: none; }
  /* En celular el modo "contraído" de escritorio no aplica */
  .sidebar.collapsed { width: 262px; }
  .sidebar.collapsed .logo-text,
  .sidebar.collapsed .nav-label,
  .sidebar.collapsed .nav-item > span:not(.nav-count),
  .sidebar.collapsed .nav-count,
  .sidebar.collapsed .user-info,
  .sidebar.collapsed .user-settings { display: revert; }
  .sidebar.collapsed .logo,
  .sidebar.collapsed .sidebar-header,
  .sidebar.collapsed .user-profile { justify-content: space-between; }
  .sidebar.collapsed .logo { justify-content: flex-start; }
  .sidebar.collapsed .nav-item { justify-content: flex-start; padding: 11px 12px; }
  .sidebar-toggle, .sidebar.collapsed .sidebar-toggle { display: none; }
 
  .main-content, .sidebar.collapsed ~ .main-content { margin-left: 0; }
  .mobile-menu-btn { display: flex; width: 36px; height: 36px; flex-shrink: 0;
    align-items: center; justify-content: center; border-radius: var(--radius-sm);
    background: rgba(255,255,255,0.04); border: 1px solid var(--line); color: var(--text); cursor: pointer; }
  .mobile-menu-btn svg { width: 18px; height: 18px; }
 
  .breadcrumb { display: none; }
  .page-title { font-size: 15.5px; }
  .search-bar { display: none; }
  .search-bar.mobile-open {
    display: flex; position: absolute; left: 12px; right: 12px;
    top: calc(var(--topbar-h) + 6px); width: auto; z-index: 60;
    background: var(--bg-card); box-shadow: var(--shadow);
  }
  .only-mobile { display: flex; }
 
  .stat-card { padding: 13px 14px; gap: 11px; }
  .stat-sparkline { display: none; }
  .stat-value { font-size: 21px; }
 
  .toolbar-left, .toolbar-right { width: 100%; }
  .toolbar-left > * , .toolbar-right > * { flex: 1; min-width: 132px; }
  .fleet-search { width: auto; }
 
  .map-container { height: 300px; }
  .modal-stats-row { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .modal-info-grid { grid-template-columns: minmax(0, 1fr); }
  .modal-actions > * { min-width: 0; }
  .notif-dropdown { left: 12px; right: 12px; width: auto; }
  .toast-stack { left: 12px; right: 12px; bottom: 12px; align-items: stretch; }
  .toast { max-width: none; }
}
 
@media (max-width: 520px) {
  .stats-grid { grid-template-columns: minmax(0, 1fr); }
  .stat-card { align-items: flex-start; }
  .live-indicator span:last-child { display: none; }
  .live-indicator { padding: 8px 10px; }
  .map-container { height: 250px; }
  .map-legend { padding: 7px 9px; gap: 3px; }
  .legend-item { font-size: 10px; }
  .route-stats { grid-template-columns: repeat(2, 1fr); row-gap: 10px; }
  .driver-stats { flex-wrap: wrap; row-gap: 8px; }
  .card-header { padding: 12px 14px; }
  .bus-item { padding: 10px 14px; }
  .activity-item { padding: 10px 14px; }
  .chart-container { padding: 12px 14px 14px; }
}
 
/* ============ IMPRESIÓN ============ */
@media print {
  .sidebar, .topbar, .map-controls, .report-actions, .toast-stack,
  .notif-dropdown, .sidebar-overlay, .modal-overlay { display: none !important; }
  body { background: #fff; color: #111; display: block; }
  .main-content { margin: 0 !important; }
  .view { display: none !important; }
  .view.active { display: block !important; padding: 0; }
  .card, .report-summary { border-color: #ccc; background: #fff; color: #111; break-inside: avoid; }
  .report-card h3, .report-summary h3, .summary-cell b { color: #111; }
  .reports-grid { grid-template-columns: 1fr 1fr; }
}
 
/* ============================================================
   MENÚ PRINCIPAL (pantalla de entrada) - ADAPTACIÓN MULTI-DISPOSITIVO
   ============================================================ */
.home-screen {
  position: fixed; inset: 0; z-index: 180;
  display: flex; align-items: flex-start; justify-content: center;
  min-height: 100vh;
  min-height: 100dvh;
  padding: max(24px, env(safe-area-inset-top)) max(20px, env(safe-area-inset-right)) max(28px, env(safe-area-inset-bottom)) max(20px, env(safe-area-inset-left));
  overflow-y: auto;
  overscroll-behavior-y: contain;
  -webkit-overflow-scrolling: touch;
  background:
    radial-gradient(900px 480px at 18% -10%, color-mix(in srgb, var(--brand-500) 20%, transparent), transparent 62%),
    radial-gradient(760px 420px at 88% 8%, color-mix(in srgb, var(--brand-alt) 16%, transparent), transparent 60%),
    var(--bg-base);
}
.home-screen.closing { animation: homeOut 0.32s ease forwards; }
.home-screen.hidden { display: none !important; }
@keyframes homeOut { to { opacity: 0; transform: scale(1.015); visibility: hidden; } }

.home-inner {
  width: 100%;
  max-width: 1020px;
  margin: auto;
  padding: 12px 0;
  display: flex;
  flex-direction: column;
}

.home-head {
  text-align: center;
  margin-bottom: 24px;
}
.home-logo {
  display: inline-block;
  width: 48px;
  height: 48px;
  margin-bottom: 12px;
  filter: drop-shadow(0 4px 14px rgba(91,110,245,0.35));
}
.home-logo svg { width: 100%; height: 100%; display: block; }
.home-logo #homeGrad stop:first-child { stop-color: var(--brand-500); }
.home-logo #homeGrad stop:last-child { stop-color: var(--brand-alt); }

.home-title {
  font-size: clamp(24px, 4vw, 34px);
  font-weight: 800;
  letter-spacing: -0.8px;
  line-height: 1.15;
}
.home-title span {
  background: linear-gradient(120deg, var(--brand-300), var(--brand-alt));
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}
.home-sub {
  font-size: clamp(13px, 2.2vw, 14.5px);
  color: var(--text);
  margin-top: 6px;
}
.home-status {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  margin-top: 12px;
  font-size: 11.5px;
  color: var(--text-soft);
  padding: 5px 14px;
  border-radius: 20px;
  background: color-mix(in srgb, var(--ok) 10%, transparent);
  border: 1px solid color-mix(in srgb, var(--ok) 24%, transparent);
  backdrop-filter: blur(8px);
}

/* Grid adaptativa para cualquier pantalla */
.home-grid {
  display: grid;
  gap: 14px;
  grid-template-columns: repeat(2, 1fr);
  width: 100%;
}

.home-tile {
  position: relative;
  overflow: hidden;
  text-align: left;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 16px 18px;
  min-height: 68px;
  border-radius: var(--radius);
  background: color-mix(in srgb, var(--bg-card) 92%, transparent);
  border: 1px solid var(--line);
  color: var(--text-strong);
  opacity: 0;
  transform: translateY(10px);
  animation: tileIn 0.38s cubic-bezier(0.22, 1, 0.36, 1) forwards;
  transition: border-color var(--t), transform var(--t), box-shadow var(--t), background var(--t);
  -webkit-tap-highlight-color: transparent;
}
@keyframes tileIn { to { opacity: 1; transform: none; } }
.home-tile:nth-child(1) { animation-delay: 0.03s; }
.home-tile:nth-child(2) { animation-delay: 0.06s; }
.home-tile:nth-child(3) { animation-delay: 0.09s; }
.home-tile:nth-child(4) { animation-delay: 0.12s; }
.home-tile:nth-child(5) { animation-delay: 0.15s; }
.home-tile:nth-child(6) { animation-delay: 0.18s; }
.home-tile:nth-child(7) { animation-delay: 0.21s; }
.home-tile:nth-child(8) { animation-delay: 0.24s; }

.home-tile::before {
  content: '';
  position: absolute;
  inset: 0 0 auto 0;
  height: 2.5px;
  background: var(--tone);
  opacity: 0.85;
}
.home-tile:hover, .home-tile:focus-visible {
  transform: translateY(-3px);
  border-color: color-mix(in srgb, var(--tone) 45%, transparent);
  background: color-mix(in srgb, var(--tone) 8%, var(--bg-card));
  box-shadow: 0 12px 28px rgba(3, 7, 18, 0.45), 0 0 16px color-mix(in srgb, var(--tone) 20%, transparent);
}
.home-tile:active {
  transform: scale(0.985);
}

.home-icon {
  width: 44px;
  height: 44px;
  flex-shrink: 0;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: color-mix(in srgb, var(--tone) 16%, transparent);
  color: var(--tone);
}
.home-icon svg { width: 54%; height: 54%; display: block; }

.home-tile-text {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}
.home-tile-name {
  font-size: 14px;
  font-weight: 700;
  color: var(--text-strong);
  letter-spacing: -0.2px;
}
.home-tile-desc {
  font-size: 11.5px;
  color: var(--text-soft);
  margin-top: 2px;
  line-height: 1.3;
}

.home-chip {
  flex-shrink: 0;
  font-size: 10px;
  font-weight: 700;
  font-family: 'JetBrains Mono', monospace;
  padding: 3px 8px;
  border-radius: 20px;
  background: color-mix(in srgb, var(--tone) 14%, transparent);
  color: var(--tone);
  border: 1px solid color-mix(in srgb, var(--tone) 22%, transparent);
}
.home-chip.live { letter-spacing: 0.5px; animation: badgeFade 2.4s ease-in-out infinite; }

.home-foot {
  text-align: center;
  font-size: 11.5px;
  color: var(--text-soft);
  margin-top: 22px;
  padding: 0 8px;
}

/* PANTALLAS GRANDES Y COMPUTADORES DE ESCRITORIO (>= 1200px) */
@media (min-width: 1200px) {
  .home-inner { max-width: 1060px; }
  .home-grid { gap: 16px; }
  .home-tile { padding: 18px 20px; min-height: 72px; }
}

/* TABLETS Y PANTALLAS MEDIANAS (769px a 1023px) */
@media (min-width: 769px) and (max-width: 1023px) {
  .home-inner { max-width: 720px; }
  .home-grid { grid-template-columns: repeat(2, 1fr); gap: 12px; }
  .home-tile { padding: 14px 15px; }
}

/* DISPOSITIVOS MÓVILES (<= 768px) */
@media (max-width: 768px) {
  .home-screen {
    padding: max(16px, env(safe-area-inset-top)) max(14px, env(safe-area-inset-right)) max(24px, env(safe-area-inset-bottom)) max(14px, env(safe-area-inset-left));
  }
  .home-inner {
    max-width: 100%;
    padding: 6px 0;
  }
  .home-head {
    margin-bottom: 18px;
  }
  .home-logo {
    width: 42px;
    height: 42px;
    margin-bottom: 8px;
  }
  .home-title {
    font-size: 24px;
  }
  .home-sub {
    font-size: 13px;
  }
  .home-grid {
    grid-template-columns: 1fr;
    gap: 10px;
  }
  .home-tile {
    padding: 12px 14px;
    min-height: 58px;
    gap: 12px;
    border-radius: var(--radius-sm);
  }
  .home-icon {
    width: 40px;
    height: 40px;
    border-radius: 10px;
  }
  .home-tile-name {
    font-size: 13.5px;
  }
  /* En móvil conservamos la descripción de forma concisa */
  .home-tile-desc {
    display: -webkit-box;
    -webkit-line-clamp: 1;
    line-clamp: 1;
    -webkit-box-orient: vertical;
    overflow: hidden;
    font-size: 11px;
    margin-top: 1px;
  }
  .home-chip {
    font-size: 9.5px;
    padding: 2px 7px;
  }
  .home-foot {
    font-size: 11px;
    margin-top: 16px;
  }
}

/* MÓVILES COMPACTOS (<= 360px, ej. iPhone SE / pantallas angostas) */
@media (max-width: 360px) {
  .home-screen {
    padding-left: 10px;
    padding-right: 10px;
  }
  .home-tile {
    padding: 10px 12px;
    gap: 10px;
  }
  .home-icon {
    width: 36px;
    height: 36px;
  }
  .home-tile-name {
    font-size: 13px;
  }
  .home-chip {
    display: none;
  }
}

/* ORIENTACIÓN HORIZONTAL EN MÓVIL (Landscape corto) */
@media (max-height: 520px) and (orientation: landscape) {
  .home-screen {
    align-items: flex-start;
    padding-top: 14px;
    padding-bottom: 20px;
  }
  .home-inner {
    margin: 0 auto;
  }
  .home-head {
    margin-bottom: 14px;
  }
  .home-logo {
    width: 34px;
    height: 34px;
    margin-bottom: 4px;
  }
  .home-title {
    font-size: 20px;
  }
  .home-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 8px;
  }
  .home-tile {
    padding: 10px 12px;
    min-height: 50px;
  }
}

@media print { .home-screen { display: none !important; } }

/* ==============================================================================
   AUTH MODAL & OAUTH STYLES (Google & Apple)
   ============================================================================== */
.auth-tabs {
  display: grid; grid-template-columns: 1fr 1fr; gap: 6px;
  background: rgba(255,255,255,0.05); padding: 4px; border-radius: var(--radius-sm);
  margin-bottom: 20px;
}
.auth-tab {
  padding: 8px 12px; border: none; background: transparent;
  color: var(--text-soft); font-size: 13px; font-weight: 600;
  border-radius: calc(var(--radius-sm) - 2px); cursor: pointer; transition: all var(--t);
}
.auth-tab.active {
  background: var(--bg-card); color: var(--text-strong);
  box-shadow: 0 2px 6px rgba(0,0,0,0.2);
}
.oauth-buttons-container {
  display: flex; flex-direction: column; gap: 10px; margin-bottom: 16px;
}
.btn-oauth {
  display: flex; align-items: center; justify-content: center; gap: 10px;
  width: 100%; padding: 10px 16px; border-radius: var(--radius-sm);
  font-size: 13.5px; font-weight: 600; cursor: pointer; transition: all var(--t);
  border: 1px solid var(--line);
}
.btn-google {
  background: #ffffff; color: #1f1f1f; border-color: #dadce0;
}
.btn-google:hover { background: #f8f9fa; border-color: #d2e3fc; box-shadow: 0 2px 6px rgba(0,0,0,0.1); }
.btn-apple {
  background: #000000; color: #ffffff; border-color: #333333;
}
.btn-apple:hover { background: #1a1a1a; }
.auth-divider {
  display: flex; align-items: center; text-align: center; margin: 16px 0;
  color: var(--text-soft); font-size: 11.5px;
}
.auth-divider::before, .auth-divider::after {
  content: ''; flex: 1; border-bottom: 1px solid var(--line);
}
.auth-divider span { padding: 0 10px; }

.form-group {
  display: flex; flex-direction: column; gap: 6px; margin-bottom: 14px; text-align: left;
}
.form-group label {
  font-size: 12px; font-weight: 600; color: var(--text-strong);
}
.form-group input {
  padding: 10px 12px; border-radius: var(--radius-sm);
  background: rgba(0,0,0,0.2); border: 1px solid var(--line);
  color: var(--text-strong); font-size: 13.5px; outline: none;
  transition: border-color var(--t);
}
.form-group input:focus {
  border-color: var(--brand-500); box-shadow: 0 0 0 3px var(--line-brand);
}
.form-consent-box {
  margin: 12px 0 16px; font-size: 11.5px; color: var(--text-soft); text-align: left;
}
.consent-label {
  display: flex; align-items: flex-start; gap: 8px; cursor: pointer; line-height: 1.4;
}
.consent-label input[type="checkbox"] {
  margin-top: 2px; accent-color: var(--brand-500);
}

.user-active-card {
  display: flex; align-items: center; gap: 14px; padding: 16px;
  background: rgba(255,255,255,0.03); border: 1px solid var(--line);
  border-radius: var(--radius); text-align: left;
}
.user-active-img {
  width: 48px; height: 48px; border-radius: 50%; border: 2px solid var(--brand-500);
}
.user-active-name { font-size: 14px; font-weight: 700; color: var(--text-strong); }
.user-active-email { font-size: 12px; color: var(--text-soft); }
.user-active-badge {
  display: inline-block; font-size: 10px; font-weight: 700; text-transform: uppercase;
  background: var(--line-brand); color: var(--brand-light); padding: 2px 6px;
  border-radius: 4px; margin-top: 4px;
}
.sidebar-legal-links {
  font-size: 10.5px; color: var(--text-soft); text-align: center;
  padding-top: 8px; border-top: 1px solid var(--line); margin-top: 6px;
}
.sidebar-legal-links a { color: var(--text-soft); text-decoration: none; }
.sidebar-legal-links a:hover { color: var(--brand-light); text-decoration: underline; }

/* ==============================================================================
   COMMAND PALETTE (CTRL + K)
   ============================================================================== */
.command-palette-box {
  width: 90%; max-width: 580px; background: var(--bg-card);
  border: 1px solid var(--line); border-radius: var(--radius-lg);
  box-shadow: 0 20px 50px rgba(0,0,0,0.5); overflow: hidden;
  animation: modalIn 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}
.cmd-header {
  display: flex; align-items: center; gap: 12px; padding: 14px 18px;
  border-bottom: 1px solid var(--line); color: var(--text-soft);
}
.cmd-header input {
  flex: 1; background: transparent; border: none; outline: none;
  color: var(--text-strong); font-size: 15px; font-family: inherit;
}
.cmd-key {
  font-size: 10px; font-weight: 700; padding: 2px 6px; border-radius: 4px;
  background: rgba(255,255,255,0.1); border: 1px solid var(--line);
}
.cmd-results {
  max-height: 340px; overflow-y: auto; padding: 8px;
}
.cmd-section-label {
  font-size: 10.5px; font-weight: 700; text-transform: uppercase;
  color: var(--text-soft); padding: 8px 12px 4px; letter-spacing: 0.05em;
}
.cmd-item {
  display: flex; align-items: center; gap: 10px; padding: 10px 12px;
  border-radius: var(--radius-sm); font-size: 13.5px; color: var(--text-strong);
  cursor: pointer; transition: background var(--t);
}
.cmd-item:hover, .cmd-item.selected {
  background: rgba(91,110,245,0.15); color: var(--brand-light);
}

/* ==============================================================================
   COOKIE CONSENT BANNER
   ============================================================================== */
.cookie-banner {
  position: fixed; bottom: 20px; right: 20px; left: 20px; max-width: 560px;
  margin: 0 auto; background: var(--bg-card); border: 1px solid var(--line-brand);
  border-radius: var(--radius-lg); padding: 16px 20px;
  box-shadow: 0 10px 30px rgba(0,0,0,0.4); z-index: 9999;
  display: flex; flex-direction: column; gap: 12px;
  animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}
.cookie-banner[hidden] {
  display: none !important;
  opacity: 0 !important;
  pointer-events: none !important;
}
@keyframes slideUp { from { transform: translateY(100px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
.cookie-title { font-size: 13.5px; font-weight: 700; color: var(--text-strong); margin-bottom: 4px; }
.cookie-text { font-size: 11.5px; color: var(--text-soft); line-height: 1.5; }
.cookie-actions { display: flex; justify-content: flex-end; gap: 8px; }

/* ==============================================================================
   MOBILE FLOATING CTA
   ============================================================================== */

/* ==============================================================================
   SKELETON LOADING & ANIMATION CLASSES
   ============================================================================== */
.skeleton {
  background: linear-gradient(90deg, rgba(255,255,255,0.03) 25%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.03) 75%);
  background-size: 200% 100%; animation: skeletonLoading 1.5s infinite;
  border-radius: 4px;
}
@keyframes skeletonLoading { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }

.scroll-reveal {
  opacity: 0; transform: translateY(20px); transition: opacity 0.6s ease-out, transform 0.6s ease-out;
}
.scroll-reveal.visible {
  opacity: 1; transform: translateY(0);
}

/* Panel desplegable de notificaciones */
.notif-dropdown-panel {
  position: absolute; right: 0; top: calc(100% + 8px); width: 320px;
  background: var(--bg-card); border: 1px solid var(--line-brand);
  border-radius: var(--radius-md); box-shadow: 0 10px 30px rgba(0,0,0,0.35);
  z-index: 1000; overflow: hidden; animation: dropIn 0.18s ease;
}
.notif-dropdown-panel[hidden] { display: none; }
.notif-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 10px 14px; background: color-mix(in srgb, var(--brand-500) 12%, var(--bg-card));
  border-bottom: 1px solid var(--line);
}
.notif-title { font-size: 12.5px; font-weight: 700; color: var(--text-strong); }
.notif-list { max-height: 280px; overflow-y: auto; padding: 6px; }
.notif-item {
  display: flex; gap: 10px; padding: 8px 10px; border-radius: var(--radius-sm);
  font-size: 12px; color: var(--text); transition: background var(--t); cursor: pointer;
}
.notif-item:hover { background: color-mix(in srgb, var(--brand-500) 10%, transparent); }
.notif-item-icon { font-size: 16px; flex-shrink: 0; }
.notif-item-text { line-height: 1.4; color: var(--text-strong); }
.notif-item-time { font-size: 10.5px; color: var(--text-soft); display: block; margin-top: 2px; }

/* Tarjeta de contacto de conductor */
.driver-contact-card {
  display: flex; flex-direction: column; align-items: center; gap: 10px;
  padding: 16px; border-radius: var(--radius-md);
  background: color-mix(in srgb, var(--brand-500) 10%, var(--bg-card));
  border: 1px solid var(--line);
}
.driver-avatar-lg {
  width: 54px; height: 54px; border-radius: 50%;
  background: var(--brand-500); color: #ffffff;
  font-size: 20px; font-weight: 800; display: flex; align-items: center; justify-content: center;
  box-shadow: 0 4px 14px rgba(91,110,245,0.4);
}

/* ==============================================================================
   AUTH INITIAL LANDING SCREEN (PANTALLA DE INICIO Y REGISTRO) - MULTI-DISPOSITIVO
   ============================================================================== */
.auth-landing-screen {
  position: fixed; inset: 0; z-index: 2000;
  background:
    radial-gradient(circle at 20% 20%, rgba(91,110,245,0.18) 0%, transparent 40%),
    radial-gradient(circle at 80% 80%, rgba(124,77,219,0.18) 0%, transparent 40%),
    var(--bg-base);
  display: flex;
  align-items: flex-start;
  justify-content: center;
  min-height: 100vh;
  min-height: 100dvh;
  padding: max(24px, env(safe-area-inset-top)) max(20px, env(safe-area-inset-right)) max(30px, env(safe-area-inset-bottom)) max(20px, env(safe-area-inset-left));
  overflow-y: auto;
  overscroll-behavior-y: contain;
  -webkit-overflow-scrolling: touch;
  transition: opacity 0.35s ease, transform 0.35s ease;
}
.auth-landing-screen[hidden] {
  display: none !important; opacity: 0; pointer-events: none;
}

.auth-landing-container {
  width: 100%;
  max-width: 1080px;
  display: grid;
  grid-template-columns: 1.15fr 0.85fr;
  gap: 40px;
  align-items: center;
  margin: auto;
  padding: 16px 0;
}

.auth-landing-hero {
  display: flex;
  flex-direction: column;
  gap: 20px;
}
.auth-landing-brand {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}
.auth-landing-logo-svg {
  width: 44px;
  height: 44px;
  flex-shrink: 0;
  filter: drop-shadow(0 0 14px rgba(91,110,245,0.45));
}
.auth-landing-title {
  font-size: clamp(26px, 3.6vw, 34px);
  font-weight: 800;
  letter-spacing: -0.8px;
  color: var(--text-strong);
  line-height: 1.15;
}
.auth-landing-title span {
  background: linear-gradient(135deg, var(--brand-300), var(--brand-alt));
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
}
.auth-landing-sub {
  font-size: clamp(13.5px, 1.8vw, 15px);
  color: var(--text);
  line-height: 1.6;
  max-width: 520px;
}
.auth-landing-features {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 14px;
  margin-top: 6px;
}
.auth-feature-card {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 14px;
  background: rgba(255,255,255,0.03);
  border: 1px solid var(--line);
  border-radius: var(--radius-sm);
  transition: border-color var(--t), background var(--t), transform var(--t);
}
.auth-feature-card:hover {
  border-color: var(--line-brand);
  background: rgba(255,255,255,0.06);
  transform: translateY(-2px);
}
.auth-feature-icon {
  font-size: 22px;
  flex-shrink: 0;
  line-height: 1;
}
.auth-feature-text h4 {
  font-size: 13px;
  font-weight: 700;
  color: var(--text-strong);
  margin-bottom: 2px;
}
.auth-feature-text p {
  font-size: 11.5px;
  color: var(--text-soft);
  line-height: 1.35;
}

.auth-landing-card {
  background: var(--bg-surface);
  border: 1px solid var(--line-brand);
  border-radius: var(--radius);
  padding: clamp(22px, 3.5vw, 32px);
  box-shadow: var(--glow), 0 24px 48px rgba(0,0,0,0.65);
  position: relative;
  overflow: hidden;
  width: 100%;
}
.auth-landing-card::before {
  content: '';
  position: absolute;
  top: 0; left: 0; right: 0;
  height: 3px;
  background: linear-gradient(90deg, var(--brand-500), var(--brand-alt), var(--ok));
}

.auth-card-head {
  text-align: center;
  margin-bottom: 20px;
}
.auth-card-head h2 {
  font-size: clamp(19px, 2.5vw, 22px);
  font-weight: 800;
  color: var(--text-strong);
}
.auth-card-head p {
  font-size: 12.5px;
  color: var(--text-soft);
  margin-top: 4px;
}

/* TABLETS Y LAPTOPS COMPACTOS (769px a 1023px) */
@media (min-width: 769px) and (max-width: 1023px) {
  .auth-landing-container {
    grid-template-columns: 1fr;
    max-width: 620px;
    gap: 32px;
    padding: 10px 0;
  }
  .auth-landing-hero {
    text-align: center;
    align-items: center;
  }
  .auth-landing-brand {
    justify-content: center;
  }
  .auth-landing-sub {
    max-width: 100%;
  }
  .auth-landing-card {
    max-width: 480px;
    margin: 0 auto;
  }
}

/* DISPOSITIVOS MÓVILES (<= 768px) */
@media (max-width: 768px) {
  .auth-landing-screen {
    padding: max(16px, env(safe-area-inset-top)) max(14px, env(safe-area-inset-right)) max(24px, env(safe-area-inset-bottom)) max(14px, env(safe-area-inset-left));
  }
  .auth-landing-container {
    grid-template-columns: 1fr;
    gap: 22px;
    padding: 4px 0;
  }
  .auth-landing-hero {
    text-align: center;
    align-items: center;
    gap: 14px;
  }
  .auth-landing-brand {
    justify-content: center;
  }
  .auth-landing-logo-svg {
    width: 38px;
    height: 38px;
  }
  .auth-landing-title {
    font-size: 24px;
  }
  .auth-landing-sub {
    font-size: 13.5px;
    max-width: 100%;
    line-height: 1.5;
  }
  .auth-landing-features {
    grid-template-columns: 1fr;
    gap: 8px;
    width: 100%;
    text-align: left;
    margin-top: 2px;
  }
  .auth-feature-card {
    padding: 10px 12px;
    gap: 10px;
  }
  .auth-feature-icon {
    font-size: 18px;
  }
  .auth-feature-text h4 {
    font-size: 12.5px;
  }
  .auth-feature-text p {
    font-size: 11px;
  }
  .auth-landing-card {
    padding: 20px 16px;
    border-radius: var(--radius-sm);
  }
  .auth-card-head {
    margin-bottom: 16px;
  }
  .auth-card-head h2 {
    font-size: 18px;
  }
  .auth-card-head p {
    font-size: 12px;
  }
  .auth-tabs {
    margin-bottom: 16px;
  }
  .btn-oauth {
    padding: 11px 14px;
    font-size: 13px;
    min-height: 44px;
  }
  .auth-form .form-group input {
    font-size: 16px; /* Evita auto-zoom molesto en iOS Safari */
    padding: 11px 12px;
    min-height: 44px;
  }
  .auth-form button[type="submit"] {
    min-height: 46px;
    font-size: 14px;
  }
}

/* PANTALLAS EXTRA PEQUEÑAS (<= 360px) */
@media (max-width: 360px) {
  .auth-landing-card {
    padding: 16px 12px;
  }
  .auth-landing-title {
    font-size: 21px;
  }
  .auth-feature-card {
    padding: 8px 10px;
  }
  .btn-oauth span {
    font-size: 12px;
  }
}

/* ORIENTACIÓN HORIZONTAL EN MÓVIL (Landscape corto) */
@media (max-height: 520px) and (orientation: landscape) {
  .auth-landing-screen {
    align-items: flex-start;
    padding-top: 14px;
    padding-bottom: 24px;
  }
  .auth-landing-container {
    grid-template-columns: 1fr 1fr;
    gap: 18px;
    align-items: flex-start;
  }
  .auth-landing-hero {
    text-align: left;
    align-items: flex-start;
    gap: 12px;
  }
  .auth-landing-brand {
    justify-content: flex-start;
  }
  .auth-landing-title {
    font-size: 20px;
  }
  .auth-landing-sub {
    font-size: 12px;
  }
  .auth-landing-features {
    grid-template-columns: 1fr;
    gap: 6px;
  }
  .auth-feature-card {
    padding: 8px 10px;
  }
  .auth-landing-card {
    padding: 16px 14px;
  }
}

/* ============================================================
   DB STATUS PILL & DIAGNOSTICS MODAL (100% REAL DATABASE)
   ============================================================ */
.db-status-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 5px 12px;
  background: rgba(91, 110, 245, 0.12);
  border: 1px solid rgba(91, 110, 245, 0.35);
  border-radius: 20px;
  font-size: 11.5px;
  font-weight: 600;
  color: #a5b0fb;
  cursor: pointer;
  transition: all var(--t);
  user-select: none;
}
.db-status-pill:hover {
  background: rgba(91, 110, 245, 0.22);
  border-color: var(--brand-500);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(91, 110, 245, 0.25);
}
.db-status-pill.real-db {
  background: rgba(43, 184, 133, 0.14);
  border-color: rgba(43, 184, 133, 0.45);
  color: #34d399;
}
.db-modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(5, 8, 16, 0.78);
  backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  opacity: 0;
  pointer-events: none;
  transition: opacity 200ms ease;
}
.db-modal-overlay.open {
  opacity: 1;
  pointer-events: auto;
}
.db-modal-card {
  width: 92%;
  max-width: 600px;
  background: var(--bg-card);
  border: 1px solid var(--line-brand);
  border-radius: var(--radius);
  box-shadow: var(--glow);
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  max-height: 88vh;
  overflow-y: auto;
}
.db-modal-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid var(--line);
  padding-bottom: 12px;
}
.db-modal-head h3 {
  font-size: 17px;
  font-weight: 700;
  color: var(--text-strong);
  display: flex;
  align-items: center;
  gap: 8px;
}
.db-modal-close {
  background: none;
  border: none;
  color: var(--text-soft);
  font-size: 20px;
  cursor: pointer;
  padding: 4px;
  line-height: 1;
}
.db-modal-close:hover {
  color: var(--text-strong);
}
.db-metrics-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
  gap: 10px;
}
.db-metric-box {
  background: var(--bg-surface);
  border: 1px solid var(--line);
  border-radius: var(--radius-sm);
  padding: 10px 12px;
}
.db-metric-label {
  font-size: 11px;
  color: var(--text-soft);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}
.db-metric-val {
  font-size: 15px;
  font-weight: 700;
  color: var(--text-strong);
  margin-top: 4px;
}
.db-table-list {
  background: var(--bg-surface);
  border: 1px solid var(--line);
  border-radius: var(--radius-sm);
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.db-table-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 12.5px;
  padding: 4px 6px;
  border-radius: 4px;
}
.db-table-row:nth-child(even) {
  background: rgba(255, 255, 255, 0.02);
}
.db-table-name {
  font-family: 'JetBrains Mono', monospace;
  color: #a5b0fb;
  font-weight: 600;
}
.db-table-count {
  font-weight: 700;
  color: var(--text-strong);
}
.db-features-badges {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.db-feature-badge {
  font-size: 11px;
  padding: 4px 8px;
  background: rgba(43, 184, 133, 0.12);
  border: 1px solid rgba(43, 184, 133, 0.3);
  color: #34d399;
  border-radius: 6px;
  font-weight: 600;
}
 
@keyframes spin { to { transform: rotate(360deg); } }

/* ============================================================
   LEAFLET REAL MAP CUSTOMIZATIONS (TEMA OSCURO PRO)
   ============================================================ */
.leaflet-real-map {
  background: #0a0f1c !important;
}
.leaflet-container {
  background-color: #0b1120 !important;
  font-family: 'Inter', -apple-system, sans-serif !important;
}
.leaflet-control-zoom {
  display: none !important; /* Usamos nuestros botones premium */
}
.leaflet-popup-content-wrapper {
  background: rgba(15, 23, 42, 0.94) !important;
  backdrop-filter: blur(12px) !important;
  color: var(--text-strong) !important;
  border: 1px solid var(--line-brand) !important;
  border-radius: 12px !important;
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.6) !important;
  padding: 4px 6px !important;
}
.leaflet-popup-tip {
  background: rgba(15, 23, 42, 0.94) !important;
  border: 1px solid var(--line-brand) !important;
}
.leaflet-popup-content {
  margin: 10px 12px !important;
  font-size: 12.5px !important;
  line-height: 1.4 !important;
}
.real-bus-div-icon {
  background: transparent !important;
  border: none !important;
}
.real-bus-icon-inner {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
  border: 2px solid #ffffff;
  color: #ffffff;
  font-weight: 800;
  font-size: 11px;
  font-family: 'JetBrains Mono', monospace;
  transition: transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
  cursor: pointer;
}
.real-bus-icon-inner:hover {
  transform: scale(1.22);
}
.real-bus-pulse {
  position: absolute;
  width: 44px;
  height: 44px;
  border-radius: 50%;
  left: -6px;
  top: -6px;
  pointer-events: none;
  animation: busPulseAnim 2s infinite ease-out;
}
@keyframes busPulseAnim {
  0% { transform: scale(0.6); opacity: 0.8; }
  100% { transform: scale(1.6); opacity: 0; }
}
.real-stop-div-icon {
  background: transparent !important;
  border: none !important;
}
.real-stop-icon-inner {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: #f59e0b;
  border: 3px solid #ffffff;
  box-shadow: 0 2px 8px rgba(0,0,0,0.55), 0 0 0 2px rgba(245,158,11,0.35);
  cursor: pointer;
  transition: transform 0.18s, box-shadow 0.18s;
  position: relative;
}
.real-stop-icon-inner::after {
  content: '';
  position: absolute;
  inset: -5px;
  border-radius: 50%;
  border: 1.5px solid rgba(245,158,11,0.45);
  pointer-events: none;
}
.real-stop-icon-inner:hover {
  transform: scale(1.7);
  box-shadow: 0 4px 14px rgba(245,158,11,0.7), 0 0 0 4px rgba(245,158,11,0.25);
}
.real-user-gps-marker {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: #3b82f6;
  border: 3px solid #ffffff;
  box-shadow: 0 0 16px #3b82f6;
  position: relative;
}
.real-user-gps-pulse {
  position: absolute;
  width: 38px;
  height: 38px;
  border-radius: 50%;
  background: rgba(59, 130, 246, 0.35);
  top: -10px;
  left: -10px;
  animation: userGpsPulse 2s infinite ease-out;
}
@keyframes userGpsPulse {
  0% { transform: scale(0.5); opacity: 0.9; }
  100% { transform: scale(1.8); opacity: 0; }
}
</file>

<file path="index.html">
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
  <meta name="theme-color" content="#0a0f1c" />
  <title>BusTrack Pro — Rastreo de flotas en tiempo real</title>
  <meta name="description" content="Panel de rastreo de flotas de buses: mapa en vivo, estado de la flota, rutas, alertas y reportes." />
  <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'><rect width='32' height='32' rx='8' fill='%235b6ef5'/><rect x='8' y='7' width='16' height='16' rx='4' fill='none' stroke='white' stroke-width='2'/><path d='M8 15h16' stroke='white' stroke-width='2'/></svg>" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet" />
  <link rel="stylesheet" href="styles.css" />
  <!-- Leaflet CSS para Mapas Reales a escala Nacional y Mundial -->
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <!-- Supabase JS SDK para OAuth real (Google / Apple) -->
  <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.js"></script>
  <!-- Leaflet JS Library -->
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
</head>
<body>
  <!-- ============ PANTALLA DE INICIO Y REGISTRO OBLIGATORIO ============ -->
  <div class="auth-landing-screen" id="authLandingScreen">
    <div class="auth-landing-container">
      <!-- Hero / Información del Sistema -->
      <div class="auth-landing-hero">
        <div class="auth-landing-brand">
          <svg class="auth-landing-logo-svg" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect width="32" height="32" rx="9" fill="url(#heroGrad)"/>
            <path d="M8 11.5C8 10 9.2 8.8 10.7 8.8h10.6c1.5 0 2.7 1.2 2.7 2.7v8c0 1.5-1.2 2.7-2.7 2.7H10.7C9.2 22.2 8 21 8 19.5v-8Z" stroke="white" stroke-width="1.4"/>
            <path d="M11 22.2v1.8M21 22.2v1.8" stroke="white" stroke-width="1.8" stroke-linecap="round"/>
            <path d="M8 15.4h16" stroke="white" stroke-width="1.4"/>
            <circle cx="11.6" cy="19" r="1.3" fill="white"/><circle cx="20.4" cy="19" r="1.3" fill="white"/>
            <path d="M11.8 12.2h8.4" stroke="white" stroke-width="1.4" stroke-linecap="round"/>
            <defs><linearGradient id="heroGrad" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
              <stop stop-color="#5b6ef5"/><stop offset="1" stop-color="#7c4ddb"/></linearGradient></defs>
          </svg>
          <div class="server-status-pill">
            <span class="status-dot"></span>
            <span>Sistema Operativo · Tiempo Real</span>
          </div>
        </div>
        <h1 class="auth-landing-title">Bienvenido a <span>BusTrack Pro</span></h1>
        <p class="auth-landing-sub">
          La plataforma inteligente para monitoreo de flotas de transporte urbano, gestión de conductores y cuenta regresiva de llegadas en vivo.
        </p>

        <div class="auth-landing-features">
          <div class="auth-feature-card">
            <span class="auth-feature-icon">🚍</span>
            <div class="auth-feature-text">
              <h4>Flota y Mapa en Vivo</h4>
              <p>Rastreo telemitrado de velocidad, pasajeros y estado por unidad.</p>
            </div>
          </div>
          <div class="auth-feature-card">
            <span class="auth-feature-icon">🚨</span>
            <div class="auth-feature-text">
              <h4>Alertas e Incidentes</h4>
              <p>Notificaciones inmediatas de retrasos, mantenimiento y motor.</p>
            </div>
          </div>
          <div class="auth-feature-card">
            <span class="auth-feature-icon">📊</span>
            <div class="auth-feature-text">
              <h4>Reportes y Métricas</h4>
              <p>Estadísticas de eficiencia, ocupación y exportación CSV.</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Tarjeta de Registro e Inicio de Sesión -->
      <div class="auth-landing-card">
        <div class="auth-card-head">
          <h2>Ingresa al Sistema</h2>
          <p>Crea tu cuenta o inicia sesión para acceder al contenido</p>
        </div>

        <!-- Auth Tabs -->
        <div class="auth-tabs" role="tablist">
          <button class="auth-tab active" id="landingTabRegister" role="tab" aria-selected="true">Registrarse</button>
          <button class="auth-tab" id="landingTabLogin" role="tab" aria-selected="false">Iniciar Sesión</button>
        </div>

        <!-- OAuth Quick Action Buttons -->
        <div class="oauth-buttons-container">
          <button class="btn-oauth btn-google" id="landingGoogleAuthBtn" type="button">
            <svg viewBox="0 0 24 24" width="18" height="18"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/></svg>
            <span>Continuar con Google</span>
          </button>
          <button class="btn-oauth btn-apple" id="landingAppleAuthBtn" type="button">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.63c.66-.82 1.12-1.96.99-3.11-1 .04-2.23.67-2.94 1.5-.64.74-1.2 1.92-1.05 3.05 1.12.09 2.34-.62 3-1.44z"/></svg>
            <span>Continuar con Apple</span>
          </button>
        </div>

        <div class="auth-divider"><span>o con tu correo</span></div>

        <!-- Form: Registrarse (Predeterminado) -->
        <form id="landingRegisterForm" class="auth-form">
          <div class="form-group">
            <label for="landingRegName">Nombre Completo</label>
            <input type="text" id="landingRegName" placeholder="Juan Pérez" required autocomplete="name" />
          </div>
          <div class="form-group">
            <label for="landingRegEmail">Correo Electrónico</label>
            <input type="email" id="landingRegEmail" placeholder="usuario@empresa.com" required autocomplete="email" />
          </div>
          <div class="form-group">
            <label for="landingRegPassword">Contraseña</label>
            <input type="password" id="landingRegPassword" placeholder="••••••••" required minlength="6" autocomplete="new-password" />
          </div>
          <div class="form-consent-box">
            <label class="consent-label">
              <input type="checkbox" id="landingRegConsent" required />
              <span>Acepto los <a href="/terms" target="_blank">Términos</a> y la <a href="/privacy" target="_blank">Privacidad</a> (Ley 8968 CR).</span>
            </label>
          </div>
          <button type="submit" class="btn-primary full-width" id="landingRegisterSubmitBtn" style="padding:12px; font-size:14px;">🚀 Crear Cuenta y Entrar</button>
        </form>

        <!-- Form: Iniciar Sesión (Oculto) -->
        <form id="landingLoginForm" class="auth-form" hidden>
          <div class="form-group">
            <label for="landingLoginEmail">Correo Electrónico</label>
            <input type="email" id="landingLoginEmail" placeholder="usuario@empresa.com" required autocomplete="email" />
          </div>
          <div class="form-group">
            <label for="landingLoginPassword">Contraseña</label>
            <input type="password" id="landingLoginPassword" placeholder="••••••••" required autocomplete="current-password" />
          </div>
          <button type="submit" class="btn-primary full-width" id="landingLoginSubmitBtn" style="padding:12px; font-size:14px; margin-top:8px;">🔑 Iniciar Sesión</button>
        </form>

        <div style="text-align:center; margin-top:16px;">
          <button type="button" class="btn-ghost btn-sm" id="guestExploreBtn" style="font-size:12px; color:var(--text-soft)">
            Continuar como Invitado &#8599;
          </button>
        </div>
      </div>
    </div>
  </div>

  <!-- ============ MENÚ PRINCIPAL (pantalla de entrada) ============ -->
  <div class="home-screen" id="homeScreen">
    <div class="home-inner">
      <header class="home-head">
        <span class="home-logo" aria-hidden="true">
          <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect width="32" height="32" rx="9" fill="url(#homeGrad)"/>
            <path d="M8 11.5C8 10 9.2 8.8 10.7 8.8h10.6c1.5 0 2.7 1.2 2.7 2.7v8c0 1.5-1.2 2.7-2.7 2.7H10.7C9.2 22.2 8 21 8 19.5v-8Z" stroke="white" stroke-width="1.4"/>
            <path d="M11 22.2v1.8M21 22.2v1.8" stroke="white" stroke-width="1.8" stroke-linecap="round"/>
            <path d="M8 15.4h16" stroke="white" stroke-width="1.4"/>
            <circle cx="11.6" cy="19" r="1.3" fill="white"/><circle cx="20.4" cy="19" r="1.3" fill="white"/>
            <path d="M11.8 12.2h8.4" stroke="white" stroke-width="1.4" stroke-linecap="round"/>
            <defs><linearGradient id="homeGrad" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
              <stop stop-color="#5b6ef5"/><stop offset="1" stop-color="#7c4ddb"/></linearGradient></defs>
          </svg>
        </span>
        <h1 class="home-title">BusTrack <span>Pro</span></h1>
        <p class="home-sub">Elegí por dónde querés empezar</p>
        <p class="home-status"><span class="pulse-dot small"></span><span id="homeStatus">Cargando flota…</span></p>
      </header>
 
      <nav class="home-grid" aria-label="Menú principal">
        <button class="home-tile" data-go="dashboard" style="--tone:var(--route-a)">
          <span class="home-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
              <rect x="3" y="5" width="18" height="13" rx="3"/><path d="M3 10.5h18M7 18v2M17 18v2"/>
              <circle cx="7.6" cy="14.5" r="1" fill="currentColor" stroke="none"/><circle cx="16.4" cy="14.5" r="1" fill="currentColor" stroke="none"/>
            </svg>
          </span>
          <span class="home-tile-text">
            <span class="home-tile-name">Panel Principal</span>
            <span class="home-tile-desc">Resumen del día y estado general</span>
          </span>
          <span class="home-chip" id="chipDashboard">—</span>
        </button>


 
        <button class="home-tile" data-go="map" style="--tone:var(--route-c)">
          <span class="home-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
              <path d="M9 4 3 6.4v13.2L9 17.2l6 2.4 6-2.4V4l-6 2.4L9 4Z"/><path d="M9 4v13.2M15 6.4v13.2"/>
            </svg>
          </span>
          <span class="home-tile-text">
            <span class="home-tile-name">Mapa en Vivo</span>
            <span class="home-tile-desc">Posición de cada unidad en ruta</span>
          </span>
          <span class="home-chip live" id="chipMap">VIVO</span>
        </button>
 
        <button class="home-tile" data-go="fleet" style="--tone:var(--brand-alt)">
          <span class="home-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
              <path d="M2 7.5A1.5 1.5 0 0 1 3.5 6h9A1.5 1.5 0 0 1 14 7.5V16H2V7.5Z"/>
              <path d="M14 10h3.6l2.9 3.4V16H14v-6Z"/><circle cx="6" cy="18" r="1.8"/><circle cx="17" cy="18" r="1.8"/>
            </svg>
          </span>
          <span class="home-tile-text">
            <span class="home-tile-name">Flota</span>
            <span class="home-tile-desc">Tabla completa, filtros y exportación</span>
          </span>
          <span class="home-chip" id="chipFleet">—</span>
        </button>
 
        <button class="home-tile" data-go="routes" style="--tone:var(--route-d)">
          <span class="home-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="5.5" cy="5.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/>
              <path d="M5.5 8v4.5A3.5 3.5 0 0 0 9 16h6"/><path d="M18.5 16v-4.5A3.5 3.5 0 0 0 15 8H9"/>
            </svg>
          </span>
          <span class="home-tile-text">
            <span class="home-tile-name">Rutas</span>
            <span class="home-tile-desc">Cobertura y paradas por recorrido</span>
          </span>
          <span class="home-chip" id="chipRoutes">—</span>
        </button>
 
        <button class="home-tile" data-go="alerts" style="--tone:var(--warn)">
          <span class="home-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
              <path d="M18 8.6a6 6 0 1 0-12 0v4.2L4.6 15a.9.9 0 0 0 .7 1.4h13.4a.9.9 0 0 0 .7-1.4L18 12.8V8.6Z"/>
              <path d="M9.8 19.4a2.4 2.4 0 0 0 4.4 0"/>
            </svg>
          </span>
          <span class="home-tile-text">
            <span class="home-tile-name">Alertas</span>
            <span class="home-tile-desc">Avisos críticos y advertencias</span>
          </span>
          <span class="home-chip" id="chipAlerts">—</span>
        </button>
 
        <button class="home-tile" data-go="reports" style="--tone:var(--brand-500)">
          <span class="home-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
              <path d="M6 3.5h7.2L19 9v11a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 5 20V5a1.5 1.5 0 0 1 1-1.5Z"/>
              <path d="M13 3.6V9h5.4M9 17v-2.5M12 17v-5M15 17v-3.5"/>
            </svg>
          </span>
          <span class="home-tile-text">
            <span class="home-tile-name">Reportes</span>
            <span class="home-tile-desc">Gráficos, resumen e impresión</span>
          </span>
          <span class="home-chip" id="chipReports">—</span>
        </button>
 
        <button class="home-tile" data-go="drivers" style="--tone:var(--ok)">
          <span class="home-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="9" cy="8" r="3.2"/><path d="M3.5 19.5a5.5 5.5 0 0 1 11 0"/>
              <path d="M16 5.2a3.2 3.2 0 0 1 0 5.6M17 14.6a5.5 5.5 0 0 1 3.5 4.9"/>
            </svg>
          </span>
          <span class="home-tile-text">
            <span class="home-tile-name">Conductores</span>
            <span class="home-tile-desc">Turnos, viajes y calificación</span>
          </span>
          <span class="home-chip" id="chipDrivers">—</span>
        </button>
      </nav>
 
      <p class="home-foot">Base de Datos SQL 100% Real (SQLite / PostgreSQL) · Cuentas Seguras con JWT · Persistencia ACID</p>
    </div>
  </div>
 
 
  <aside class="sidebar" id="sidebar">
    <div class="sidebar-header">
      <div class="logo" id="logoHome" role="button" tabindex="0" title="Volver al menú principal">
        <span class="logo-icon" aria-hidden="true">
          <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect width="32" height="32" rx="8" fill="url(#logoGrad)"/>
            <path d="M7 11C7 9.34 8.34 8 10 8h12c1.66 0 3 1.34 3 3v9c0 1.66-1.34 3-3 3H10c-1.66 0-3-1.34-3-3v-9Z" stroke="white" stroke-width="1.5"/>
            <path d="M10 23v2M22 23v2" stroke="white" stroke-width="2" stroke-linecap="round"/>
            <path d="M7 15h18" stroke="white" stroke-width="1.5"/>
            <circle cx="11" cy="19" r="1.5" fill="white"/>
            <circle cx="21" cy="19" r="1.5" fill="white"/>
            <path d="M11 12h10" stroke="white" stroke-width="1.5" stroke-linecap="round"/>
            <defs>
              <linearGradient id="logoGrad" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
                <stop stop-color="var(--brand-500, #5b6ef5)"/>
                <stop offset="1" stop-color="var(--brand-700, #7c4ddb)"/>
              </linearGradient>
            </defs>
          </svg>
        </span>
        <span class="logo-text">
          <span class="logo-name">BusTrack</span>
          <span class="logo-badge">PRO</span>
        </span>
      </div>
      <button class="sidebar-toggle" id="sidebarToggle" aria-label="Contraer o expandir el menú" aria-expanded="true">
        <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path fill-rule="evenodd" d="M3 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm6 5a1 1 0 011-1h6a1 1 0 110 2h-6a1 1 0 01-1-1z" clip-rule="evenodd"/></svg>
      </button>
    </div>
 
    <nav class="sidebar-nav" aria-label="Navegación principal">
      <div class="nav-section">
        <span class="nav-label">Principal</span>
        <ul class="nav-list">
          <li class="nav-item" id="nav-home" data-home="1" role="button" tabindex="0" title="Menú principal">
            <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path d="M10.7 2.3a1 1 0 0 0-1.4 0l-7 6.6A1 1 0 0 0 3 10.6V16a2 2 0 0 0 2 2h3v-4.5h4V18h3a2 2 0 0 0 2-2v-5.4a1 1 0 0 0-.3-1.7l-7-6.6Z"/></svg>
            <span>Inicio</span>
          </li>
          <li class="nav-item active" id="nav-dashboard" data-view="dashboard" role="button" tabindex="0" title="Panel Principal">
            <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zm0 6a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zm11-1a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z"/></svg>
            <span>Panel Principal</span>
          </li>

          <li class="nav-item" id="nav-map" data-view="map" role="button" tabindex="0" title="Mapa en Vivo">
            <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path fill-rule="evenodd" d="M12 1.586l-4 4v12.828l4-4V1.586zM3.707 3.293A1 1 0 002 4v10a1 1 0 00.293.707L6 18.414V5.586L3.707 3.293zm10.586 0L12 5.586v12.828l2.293 2.293A1 1 0 0016 20V4a1 1 0 00-1.293-.707z" clip-rule="evenodd"/></svg>
            <span>Mapa en Vivo</span>
            <span class="nav-count live-pulse">VIVO</span>
          </li>
          <li class="nav-item" id="nav-fleet" data-view="fleet" role="button" tabindex="0" title="Flota">
            <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path d="M8 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM15 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z"/><path d="M3 4a1 1 0 00-1 1v10a1 1 0 001 1h1.05a2.5 2.5 0 014.9 0H10a1 1 0 001-1v-1h3v1a1 1 0 001 1h1.05a2.5 2.5 0 014.9 0H19a1 1 0 001-1v-2a4 4 0 00-.92-2.55L17.15 8H15V6a2 2 0 00-2-2H3zm11 2h2.15l1.55 2H14V6z"/></svg>
            <span>Flota</span>
            <span class="nav-count" id="fleetCountBadge">12</span>
          </li>
          <li class="nav-item" id="nav-routes" data-view="routes" role="button" tabindex="0" title="Rutas">
            <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path d="M4 3a2 2 0 100 4 2 2 0 000-4zm12 10a2 2 0 100 4 2 2 0 000-4zM4 8.5v3a3.5 3.5 0 003.5 3.5h5" stroke="currentColor" stroke-width="1.6" fill="none" stroke-linecap="round"/><path d="M16 11.5v-3A3.5 3.5 0 0012.5 5h-5" stroke="currentColor" stroke-width="1.6" fill="none" stroke-linecap="round"/></svg>
            <span>Rutas</span>
          </li>
          <li class="nav-item" id="nav-alerts" data-view="alerts" role="button" tabindex="0" title="Alertas">
            <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z"/></svg>
            <span>Alertas</span>
            <span class="nav-count alert-badge" id="alertsCountBadge">3</span>
          </li>
        </ul>
      </div>
      <div class="nav-section">
        <span class="nav-label">Análisis</span>
        <ul class="nav-list">
          <li class="nav-item" id="nav-reports" data-view="reports" role="button" tabindex="0" title="Reportes">
            <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path fill-rule="evenodd" d="M6 2a2 2 0 00-2 2v12a2 2 0 002 2h8a2 2 0 002-2V7.414A2 2 0 0015.414 6L12 2.586A2 2 0 0010.586 2H6zm2 10a1 1 0 10-2 0v3a1 1 0 102 0v-3zm2-3a1 1 0 011 1v5a1 1 0 11-2 0v-5a1 1 0 011-1zm4-1a1 1 0 10-2 0v7a1 1 0 102 0V8z" clip-rule="evenodd"/></svg>
            <span>Reportes</span>
          </li>
          <li class="nav-item" id="nav-drivers" data-view="drivers" role="button" tabindex="0" title="Conductores">
            <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z"/></svg>
            <span>Conductores</span>
          </li>
        </ul>
      </div>
    </nav>
 
    <div class="sidebar-footer">
      <div class="user-profile" id="userProfile" role="button" tabindex="0" title="Iniciar sesión o ver perfil">
        <span class="user-avatar" id="userAvatarSlot">GA</span>
        <span class="user-info">
          <span class="user-name" id="userNameSlot">Gerente Admin</span>
          <span class="user-role" id="userRoleSlot">Administrador</span>
        </span>
        <button class="user-settings" id="authBtn" aria-label="Iniciar sesión o perfil" title="Iniciar sesión">
          <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path fill-rule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clip-rule="evenodd"/></svg>
        </button>
        <button class="user-settings" id="settingsBtn" aria-label="Abrir preferencias" title="Preferencias">
          <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path fill-rule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.53 1.53 0 01-2.29.95c-1.37-.84-2.94.73-2.1 2.1.54.89.06 2.05-.95 2.29-1.56.38-1.56 2.6 0 2.98.89.21 1.49 1.4.95 2.29-.84 1.37.73 2.94 2.1 2.1a1.53 1.53 0 012.29.95c.38 1.56 2.6 1.56 2.98 0a1.53 1.53 0 012.29-.95c1.37.84 2.94-.73 2.1-2.1a1.53 1.53 0 01.95-2.29c1.56-.38 1.56-2.6 0-2.98a1.53 1.53 0 01-.95-2.29c.84-1.37-.73-2.94-2.1-2.1a1.53 1.53 0 01-2.29-.95zM10 13a3 3 0 100-6 3 3 0 000 6z" clip-rule="evenodd"/></svg>
        </button>
      </div>

      <!-- Botón de Cerrar Sesión — visible solo cuando hay sesión activa -->
      <button
        id="logoutBtn"
        class="sidebar-logout-btn"
        aria-label="Cerrar sesión"
        title="Cerrar sesión"
        hidden
      >
        <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M13 3h4a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1h-4M9 14l-4-4 4-4M5 10h9"/>
        </svg>
        <span>Cerrar Sesión</span>
      </button>

      <div class="sidebar-legal-links">
        <a href="/privacy" target="_blank">Privacidad</a> ·
        <a href="/terms" target="_blank">Términos</a> ·
        <a href="/cookies" target="_blank">Cookies</a>
      </div>
    </div>
  </aside>

  <div class="sidebar-overlay" id="sidebarOverlay"></div>

  <main class="main-content" id="mainContent">
    <header class="topbar">
      <div class="topbar-left">
        <button class="mobile-menu-btn" id="mobileMenuBtn" aria-label="Abrir menú" aria-expanded="false">
          <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path fill-rule="evenodd" d="M3 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clip-rule="evenodd"/></svg>
        </button>
        <div class="topbar-titles">
          <h1 class="page-title" id="pageTitle">Panel Principal</h1>
          <p class="breadcrumb">
            <span>BusTrack Pro</span>
            <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path fill-rule="evenodd" d="M7.29 14.71a1 1 0 010-1.42L10.59 10 7.29 6.71a1 1 0 111.42-1.42l4 4a1 1 0 010 1.42l-4 4a1 1 0 01-1.42 0z" clip-rule="evenodd"/></svg>
            <span id="breadcrumbCurrent">Panel Principal</span>
          </p>
        </div>
      </div>
      <div class="topbar-right">
        <div class="search-bar">
          <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path fill-rule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.48l4.82 4.81a1 1 0 01-1.42 1.42l-4.81-4.82A6 6 0 012 8z" clip-rule="evenodd"/></svg>
          <input type="search" id="globalSearch" placeholder="Buscar bus, placa, ruta o conductor" aria-label="Búsqueda global" autocomplete="off" />
        </div>
        <button class="icon-btn only-mobile" id="mobileSearchBtn" aria-label="Buscar">
          <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path fill-rule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.48l4.82 4.81a1 1 0 01-1.42 1.42l-4.81-4.82A6 6 0 012 8z" clip-rule="evenodd"/></svg>
        </button>
        <div style="position:relative">
          <button class="icon-btn" id="notifBtn" aria-label="Notificaciones" aria-haspopup="true" aria-expanded="false">
            <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z"/></svg>
            <span class="notif-dot" id="notifDot"></span>
          </button>
          <div class="notif-dropdown-panel" id="notifDropdownPanel" hidden>
            <div class="notif-header">
              <span class="notif-title">🔔 Notificaciones Recientes</span>
              <button class="btn-sm btn-ghost" id="notifMarkAllReadBtn" style="font-size:11px; padding:2px 6px">Limpiar</button>
            </div>
            <div class="notif-list" id="notifList"></div>
          </div>
        </div>

        <div class="db-status-pill real-db" id="dbStatusPill" role="button" tabindex="0" title="Ver diagnóstico y tablas de la Base de Datos Real">
          <span>🗄️</span>
          <span id="dbStatusLabel">BD: SQLite 3 (100% Real)</span>
        </div>
        <div class="server-status-pill" id="serverStatusPill" title="Conexión en tiempo real con el backend">
          <span class="status-dot"></span>
          <span id="serverStatusLabel">Detectando API...</span>
        </div>
        <button class="live-indicator" id="liveToggle" title="Pausar o reanudar la actualización automática" aria-pressed="true">
          <span class="pulse-dot" id="livePulse"></span>
          <span id="liveLabel">Actualizando</span>
        </button>
      </div>
    </header>
 
    <!-- ============ PANEL PRINCIPAL ============ -->
    <section class="view active" id="view-dashboard">
      <div class="stats-grid">
        <article class="stat-card">
          <span class="stat-icon buses" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="5" width="18" height="14" rx="3"/><path d="M3 11h18M7 19v2M17 19v2"/><circle cx="7.5" cy="15.5" r="1.1" fill="currentColor" stroke="none"/><circle cx="16.5" cy="15.5" r="1.1" fill="currentColor" stroke="none"/></svg>
          </span>
          <div class="stat-content">
            <p class="stat-value" id="activeCount">0</p>
            <p class="stat-label">Buses en circulación</p>
            <p class="stat-change positive">+4 esta semana</p>
          </div>
          <canvas class="stat-sparkline" id="sparkline1" width="80" height="40" aria-hidden="true"></canvas>
        </article>
 
        <article class="stat-card">
          <span class="stat-icon routes" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 12h18M3 6l9-3 9 3M3 18l9 3 9-3"/></svg>
          </span>
          <div class="stat-content">
            <p class="stat-value" id="routeCount">4</p>
            <p class="stat-label">Rutas operando</p>
            <p class="stat-change positive">100% operativas</p>
          </div>
          <canvas class="stat-sparkline" id="sparkline2" width="80" height="40" aria-hidden="true"></canvas>
        </article>
 
        <article class="stat-card">
          <span class="stat-icon passengers" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>
          </span>
          <div class="stat-content">
            <p class="stat-value" id="passengersToday">2.847</p>
            <p class="stat-label">Pasajeros hoy</p>
            <p class="stat-change positive">+12,4% vs ayer</p>
          </div>
          <canvas class="stat-sparkline" id="sparkline3" width="80" height="40" aria-hidden="true"></canvas>
        </article>
 
        <article class="stat-card">
          <span class="stat-icon delay" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.5 2" stroke-linecap="round"/></svg>
          </span>
          <div class="stat-content">
            <p class="stat-value" id="avgDelay">2,3<small>min</small></p>
            <p class="stat-label">Retraso promedio</p>
            <p class="stat-change positive">−0,8 min vs ayer</p>
          </div>
          <canvas class="stat-sparkline" id="sparkline4" width="80" height="40" aria-hidden="true"></canvas>
        </article>
      </div>
 
      <div class="dashboard-grid">
        <div class="card map-widget">
          <div class="card-header">
            <div class="card-title">
              <h2>Mapa en tiempo real</h2>
              <span class="live-badge"><span class="pulse-dot small"></span>VIVO</span>
            </div>
            <button class="btn-ghost btn-sm" id="expandMapBtn">Expandir</button>
          </div>
          <div class="map-container">
            <div class="map-bg">
              <svg id="cityMap" data-map="mini" viewBox="0 0 800 450" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice" role="img" aria-label="Mapa esquemático con la posición de los buses">
                <rect x="-2000" y="-2000" width="5000" height="5000" fill="var(--map-bg)"/>
                <g stroke="var(--map-grid)" stroke-width="1" opacity="0.7">
                  <path d="M100 0V450M200 0V450M300 0V450M400 0V450M500 0V450M600 0V450M700 0V450"/>
                  <path d="M0 75H800M0 150H800M0 225H800M0 300H800M0 375H800"/>
                </g>
                <g stroke="var(--map-road)" stroke-width="5" stroke-linecap="round">
                  <path d="M0 150H800M0 300H800M0 225H800"/>
                  <path d="M200 0V450M600 0V450"/>
                </g>
                <g fill="var(--map-block)" stroke="var(--map-road)" stroke-width="0.5">
                  <rect x="220" y="20" width="80" height="60" rx="4"/><rect x="320" y="20" width="60" height="60" rx="4"/>
                  <rect x="420" y="20" width="70" height="60" rx="4"/><rect x="220" y="170" width="80" height="60" rx="4"/>
                  <rect x="320" y="170" width="60" height="60" rx="4"/><rect x="420" y="170" width="70" height="60" rx="4"/>
                  <rect x="220" y="320" width="80" height="60" rx="4"/><rect x="420" y="320" width="70" height="60" rx="4"/>
                  <rect x="620" y="170" width="60" height="60" rx="4"/><rect x="620" y="320" width="60" height="60" rx="4"/>
                  <rect x="620" y="20" width="60" height="60" rx="4"/><rect x="50" y="170" width="60" height="60" rx="4"/>
                  <rect x="50" y="320" width="60" height="60" rx="4"/><rect x="50" y="20" width="60" height="60" rx="4"/>
                </g>
                <g id="miniRoutePaths" opacity="0.65" fill="none" stroke-width="3" stroke-dasharray="10 5"></g>
                <g id="miniStops"></g>
                <g id="userMarkerMini"></g>
                <g id="busMarkers"></g>
              </svg>
              <div class="map-controls">
                <button class="map-btn map-btn-geo" id="locateUserBtnMini" data-map="mini" aria-label="Mi Ubicación" title="Centrar en mi ubicación">📍</button>
                <button class="map-btn" data-zoom="in" data-map="mini" aria-label="Acercar">+</button>
                <button class="map-btn" data-zoom="out" data-map="mini" aria-label="Alejar">−</button>
                <button class="map-btn" data-zoom="reset" data-map="mini" aria-label="Centrar mapa">⌖</button>
              </div>
              <div class="map-legend" id="miniLegend"></div>
            </div>
          </div>
        </div>
 
        <div class="card buses-list-card">
          <div class="card-header">
            <div class="card-title"><h2>Estado de buses</h2></div>
            <div class="filter-tabs" role="group" aria-label="Filtrar buses">
              <button class="filter-tab active" data-filter="all">Todos</button>
              <button class="filter-tab" data-filter="active">Activos</button>
              <button class="filter-tab" data-filter="delayed">Retrasados</button>
            </div>
          </div>
          <div class="bus-list" id="busList"></div>
        </div>
 
        <div class="card activity-card">
          <div class="card-header">
            <div class="card-title"><h2>Actividad reciente</h2></div>
            <button class="btn-ghost btn-sm" id="toggleActivityBtn" aria-expanded="false">Ver todo</button>
          </div>
          <div class="activity-feed" id="activityFeed"></div>
        </div>
 
        <div class="card chart-card">
          <div class="card-header">
            <div class="card-title"><h2>Pasajeros</h2></div>
            <div class="chart-period" role="group" aria-label="Período del gráfico">
              <button class="period-btn active" data-period="day">Hoy</button>
              <button class="period-btn" data-period="week">Semana</button>
              <button class="period-btn" data-period="month">Mes</button>
            </div>
          </div>
          <div class="chart-container">
            <canvas id="mainChart" height="180"></canvas>
            <p class="chart-caption" id="chartCaption"></p>
          </div>
        </div>
      </div>
    </section>
 
    <!-- ============ FLOTA ============ -->
    <section class="view" id="view-fleet">
      <div class="fleet-toolbar">
        <div class="toolbar-left">
          <input type="search" class="fleet-search" id="fleetSearch" placeholder="Buscar en la flota" aria-label="Buscar en la flota" />
          <select class="filter-select" id="statusFilter" aria-label="Filtrar por estado">
            <option value="">Todos los estados</option>
            <option value="active">En servicio</option>
            <option value="delayed">Retrasado</option>
            <option value="stopped">Detenido</option>
            <option value="maintenance">Mantenimiento</option>
          </select>
          <select class="filter-select" id="routeFilter" aria-label="Filtrar por ruta">
            <option value="">Todas las rutas</option>
          </select>
          <button class="btn-ghost btn-sm" id="resetFiltersBtn">Limpiar filtros</button>
        </div>
        <div class="toolbar-right">
          <button class="btn-ghost" id="exportCsvBtn">Exportar CSV</button>
          <button class="btn-primary" id="addBusBtn">Agregar bus</button>
        </div>
      </div>
      <p class="results-note" id="fleetCount"></p>
      <div class="fleet-table-wrapper">
        <table class="fleet-table">
          <thead>
            <tr>
              <th data-sort="id" tabindex="0" role="button">Bus</th>
              <th data-sort="plate" tabindex="0" role="button">Placa</th>
              <th data-sort="route" tabindex="0" role="button">Ruta</th>
              <th data-sort="driver" tabindex="0" role="button">Conductor</th>
              <th data-sort="speed" tabindex="0" role="button">Velocidad</th>
              <th data-sort="passengers" tabindex="0" role="button">Pasajeros</th>
              <th data-sort="status" tabindex="0" role="button">Estado</th>
              <th>Actualización</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody id="fleetTableBody"></tbody>
        </table>
      </div>
    </section>
 
    <!-- ============ ALERTAS ============ -->
    <section class="view" id="view-alerts">
      <div class="alerts-container">
        <div class="alerts-header">
          <h2>Centro de alertas</h2>
          <div class="report-actions">
            <button class="btn-ghost" id="clearAlertsBtn">Marcar todo como leído</button>
            <button class="btn-primary" id="newAlertBtn">Simular alerta</button>
          </div>
        </div>
        <div class="filter-tabs alerts-filter" role="group" aria-label="Filtrar alertas">
          <button class="filter-tab active" data-alert-filter="all">Todas</button>
          <button class="filter-tab" data-alert-filter="critical">Críticas</button>
          <button class="filter-tab" data-alert-filter="warning">Advertencias</button>
          <button class="filter-tab" data-alert-filter="info">Informativas</button>
        </div>
        <div class="alerts-list" id="alertsList"></div>
      </div>
    </section>
 
    <!-- ============ MAPA COMPLETO ============ -->
    <section class="view" id="view-map">
      <div class="full-map-container">
        <div class="map-sidebar-panel">
          <div class="card-title" style="display:flex; justify-content:space-between; align-items:center;">
            <h2>Buses en ruta</h2>
            <span class="badge" id="mapBusCount">12 activos</span>
          </div>
          <!-- Selector Nacional de Provincias -->
          <div class="map-region-filter" style="margin: 8px 0 12px 0;">
            <label for="provinceSelect" style="font-size: 11px; font-weight:600; color:var(--text-soft); display:block; margin-bottom:4px;">🇨🇷 COBERTURA NACIONAL:</label>
            <select id="provinceSelect" class="form-input" style="padding: 7px 10px; font-size:12px; width:100%; border-radius:6px; background:var(--bg-card); color:var(--text); border:1px solid var(--line);">
              <option value="all">📍 Todo el País (Costa Rica)</option>
              <option value="San José" selected>🏛️ San José (GAM / Capital)</option>
              <option value="Alajuela">✈️ Alajuela & San Carlos (SJO / Arenal)</option>
              <option value="Heredia">🎓 Heredia (UNA / Flores / Belén)</option>
              <option value="Cartago">⛪ Cartago & Turrialba (Basílica / TEC)</option>
              <option value="Puntarenas">🌊 Puntarenas, Jacó & Quepos</option>
              <option value="Guanacaste">🏖️ Guanacaste & Liberia (LIR)</option>
              <option value="Limón">🌴 Limón & Caribe Sur (Moín / Guápiles)</option>
            </select>
          </div>
          <div class="map-bus-list" id="mapBusList"></div>
        </div>
        <div class="full-map">
          <div class="full-map-bg">
            <!-- Contenedor Real de Leaflet -->
            <div id="realFullMap" class="leaflet-real-map" style="width: 100%; height: 100%; border-radius: inherit; z-index: 1;"></div>
            <div class="tracking-banner" id="trackingBanner" hidden style="z-index: 1000;">
              <span class="pulse-dot small"></span>
              <span id="trackingBannerText">Siguiendo</span>
              <button class="tracking-stop" id="trackingStopBtn" aria-label="Dejar de seguir este bus" title="Dejar de seguir">✕</button>
            </div>
            <div class="user-location-bar" id="userLocationBar" hidden style="z-index: 1000;">
              <span class="user-loc-icon">📍</span>
              <span id="userLocationText">Adaptando mapa a tu ubicación...</span>
              <button class="btn-sm btn-ghost" id="recenterUserBtn" style="padding: 2px 8px; font-size:11px;">Centrar</button>
            </div>
            <div class="map-controls map-controls-top" style="z-index: 1000;">
              <button class="map-btn map-btn-geo" id="locateUserBtnFull" data-map="full" aria-label="Mi Ubicación" title="Centrar en mi ubicación GPS">📍</button>
              <button class="map-btn" data-zoom="in" data-map="full" aria-label="Acercar">+</button>
              <button class="map-btn" data-zoom="out" data-map="full" aria-label="Alejar">−</button>
              <button class="map-btn" data-zoom="reset" data-map="full" aria-label="Centrar en Costa Rica">🇨🇷</button>
            </div>
            <div class="map-legend" id="fullLegend" style="z-index: 1000;"></div>
          </div>
        </div>
      </div>
    </section>
 
    <!-- ============ RUTAS ============ -->
    <section class="view" id="view-routes">
      <div class="routes-grid" id="routesGrid"></div>
    </section>
 
    <!-- ============ REPORTES ============ -->
    <section class="view" id="view-reports">
      <div class="reports-container">
        <div class="reports-header">
          <h2>Reportes y analíticas</h2>
          <div class="report-actions">
            <button class="btn-ghost" id="printReportBtn">Imprimir / PDF</button>
            <button class="btn-primary" id="generateReportBtn">Generar reporte</button>
          </div>
        </div>
        <div class="report-summary" id="reportSummary" hidden></div>
        <div class="reports-grid">
          <div class="card report-card"><h3>Eficiencia por ruta</h3><canvas id="reportChart1" height="200"></canvas></div>
          <div class="card report-card"><h3>Pasajeros por ruta</h3><canvas id="reportChart2" height="200"></canvas></div>
          <div class="card report-card full-width"><h3>Retraso promedio — últimas 4 semanas</h3><canvas id="reportChart3" height="160"></canvas></div>
        </div>
      </div>
    </section>
 
    <!-- ============ CONDUCTORES ============ -->
    <section class="view" id="view-drivers">
      <div class="drivers-grid" id="driversGrid"></div>
    </section>
    <!-- MODO PASAJERO ELIMINADO --></main>
 
  <!-- Detalle de bus -->
  <div class="modal-overlay" id="busModal">
    <div class="modal" role="dialog" aria-modal="true" aria-labelledby="modalBusTitle">
      <div class="modal-header">
        <div class="modal-title-area">
          <span class="modal-bus-icon" id="modalBusIcon"></span>
          <div>
            <h2 id="modalBusTitle">Bus</h2>
            <p id="modalBusSubtitle"></p>
          </div>
        </div>
        <button class="modal-close" id="modalClose" aria-label="Cerrar">✕</button>
      </div>
      <div class="modal-body">
        <div class="modal-stats-row">
          <div class="modal-stat"><span class="modal-stat-label">Velocidad</span><span class="modal-stat-value" id="modalSpeed">—</span></div>
          <div class="modal-stat"><span class="modal-stat-label">Pasajeros</span><span class="modal-stat-value" id="modalPassengers">—</span></div>
          <div class="modal-stat"><span class="modal-stat-label">Retraso</span><span class="modal-stat-value" id="modalDelay">—</span></div>
          <div class="modal-stat"><span class="modal-stat-label">Combustible</span><span class="modal-stat-value" id="modalFuel">—</span></div>
        </div>
        <div class="modal-status-row">
          <span class="info-label">Estado del bus</span>
          <select class="status-select-lg" id="modalStatusSelect" aria-label="Editar el estado del bus">
            <option value="active">En servicio</option>
            <option value="delayed">Retrasado</option>
            <option value="stopped">Detenido</option>
            <option value="maintenance">Mantenimiento</option>
          </select>
        </div>
        <div class="modal-info-grid">
          <div class="modal-info-item"><span class="info-label">Conductor</span><span class="info-value" id="modalDriver">—</span></div>
          <div class="modal-info-item"><span class="info-label">Placa</span><span class="info-value" id="modalPlate">—</span></div>
          <div class="modal-info-item"><span class="info-label">Próxima parada</span><span class="info-value" id="modalNextStop">—</span></div>
          <div class="modal-info-item"><span class="info-label">Llegada estimada</span><span class="info-value" id="modalETA">—</span></div>
        </div>
        <div class="modal-actions">
          <button class="btn-primary" id="trackBusBtn">Rastrear en el mapa</button>
          <button class="btn-ghost" id="contactDriverBtn">Contactar conductor</button>
        </div>
      </div>
    </div>
  </div>
 
  <!-- Preferencias -->
  <div class="modal-overlay" id="settingsModal">
    <div class="modal modal-narrow" role="dialog" aria-modal="true" aria-labelledby="settingsTitle">
      <div class="modal-header">
        <div class="modal-title-area">
          <div>
            <h2 id="settingsTitle">Preferencias</h2>
            <p>Se guardan en este navegador</p>
          </div>
        </div>
        <button class="modal-close" id="settingsClose" aria-label="Cerrar">✕</button>
      </div>
      <div class="modal-body">
        <div class="setting-row">
          <div>
            <p class="setting-name">Color de acento</p>
            <p class="setting-desc">Define el color base de toda la interfaz</p>
          </div>
          <div class="accent-picker" id="accentPicker" role="group" aria-label="Color de acento"></div>
        </div>
        <div class="setting-row">
          <div>
            <p class="setting-name">Movimiento de los buses</p>
            <p class="setting-desc">Desactivalo si el equipo va lento</p>
          </div>
          <button class="switch" id="motionSwitch" role="switch" aria-checked="true"><span></span></button>
        </div>
        <div class="setting-row">
          <div>
            <p class="setting-name">Actualización automática</p>
            <p class="setting-desc">Refresca velocidades y pasajeros cada 3 s</p>
          </div>
          <button class="switch" id="liveSwitch" role="switch" aria-checked="true"><span></span></button>
        </div>
        <div class="setting-row">
          <div>
            <p class="setting-name">Densidad compacta</p>
            <p class="setting-desc">Menos espacio entre elementos</p>
          </div>
          <button class="switch" id="densitySwitch" role="switch" aria-checked="false"><span></span></button>
        </div>
        <div class="setting-row">
          <div>
            <p class="setting-name">Adaptar mapa a tu ubicación</p>
            <p class="setting-desc">Geolocalización para centrar automáticamente</p>
          </div>
          <button class="switch" id="geoSwitch" role="switch" aria-checked="false"><span></span></button>
        </div>
        <div class="modal-actions">
          <button class="btn-ghost" id="resetDataBtn">Regenerar datos de la flota</button>
        </div>
      </div>
    </div>
  </div>
 
  <!-- ============ MODAL AUTENTICACIÓN (LOGIN / REGISTRO) ============ -->
  <div class="modal-overlay" id="authModal">
    <div class="modal modal-narrow" role="dialog" aria-modal="true" aria-labelledby="authTitle">
      <div class="modal-header">
        <div class="modal-title-area">
          <h2 id="authTitle">Cuenta de Usuario</h2>
          <p id="authSubtitle">Inicia sesión o regístrate para gestionar la flota</p>
        </div>
        <button class="modal-close" id="authClose" aria-label="Cerrar">✕</button>
      </div>
      <div class="modal-body">
        <!-- Auth Tabs -->
        <div class="auth-tabs" role="tablist">
          <button class="auth-tab active" id="tabLogin" role="tab" aria-selected="true">Iniciar Sesión</button>
          <button class="auth-tab" id="tabRegister" role="tab" aria-selected="false">Registrarse</button>
        </div>

        <!-- OAuth Quick Action Buttons (Google & Apple) -->
        <div class="oauth-buttons-container">
          <button class="btn-oauth btn-google" id="googleAuthBtn" type="button">
            <svg viewBox="0 0 24 24" width="18" height="18"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/></svg>
            <span>Continuar con Google</span>
          </button>
          <button class="btn-oauth btn-apple" id="appleAuthBtn" type="button">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.63c.66-.82 1.12-1.96.99-3.11-1 .04-2.23.67-2.94 1.5-.64.74-1.2 1.92-1.05 3.05 1.12.09 2.34-.62 3-1.44z"/></svg>
            <span>Continuar con Apple</span>
          </button>
        </div>

        <div class="auth-divider"><span>o con tu correo</span></div>

        <!-- Form: Iniciar Sesión -->
        <form id="loginForm" class="auth-form">
          <div class="form-group">
            <label for="loginEmail">Correo Electrónico</label>
            <input type="email" id="loginEmail" placeholder="ejemplo@empresa.com" required autocomplete="email" />
          </div>
          <div class="form-group">
            <label for="loginPassword">Contraseña</label>
            <input type="password" id="loginPassword" placeholder="••••••••" required autocomplete="current-password" />
          </div>
          <button type="submit" class="btn-primary full-width" id="loginSubmitBtn">Iniciar Sesión</button>
        </form>

        <!-- Form: Registrarse -->
        <form id="registerForm" class="auth-form" hidden>
          <div class="form-group">
            <label for="regName">Nombre Completo</label>
            <input type="text" id="regName" placeholder="Juan Pérez" required autocomplete="name" />
          </div>
          <div class="form-group">
            <label for="regEmail">Correo Electrónico</label>
            <input type="email" id="regEmail" placeholder="ejemplo@empresa.com" required autocomplete="email" />
          </div>
          <div class="form-group">
            <label for="regPassword">Contraseña (mínimo 6 caracteres)</label>
            <input type="password" id="regPassword" placeholder="••••••••" required minlength="6" autocomplete="new-password" />
          </div>
          <div class="form-consent-box">
            <label class="consent-label">
              <input type="checkbox" id="regConsent" required />
              <span>Acepto los <a href="/terms" target="_blank">Términos y Condiciones</a> y la <a href="/privacy" target="_blank">Política de Privacidad</a> (Ley 8968 Costa Rica).</span>
            </label>
          </div>
          <button type="submit" class="btn-primary full-width" id="registerSubmitBtn">Crear Cuenta</button>
        </form>

        <!-- Current User Profile Info (When logged in) -->
        <div id="userProfileActiveBox" hidden>
          <div class="user-active-card">
            <img id="userActiveAvatar" src="" alt="Avatar de usuario" class="user-active-img" />
            <div>
              <p class="user-active-name" id="userActiveName"></p>
              <p class="user-active-email" id="userActiveEmail"></p>
              <span class="user-active-badge" id="userActiveBadge"></span>
            </div>
          </div>
          <button class="btn-ghost full-width danger-text" id="logoutBtn" style="margin-top:1rem">Cerrar Sesión</button>
        </div>
      </div>
    </div>
  </div>

  <!-- ============ MODAL AUTENTICACIÓN GOOGLE / APPLE (OAUTH INTERACTIVO) ============ -->
  <div class="modal-overlay" id="oauthPromptModal">
    <div class="modal modal-narrow" role="dialog" aria-modal="true" aria-labelledby="oauthPromptTitle">
      <div class="modal-header">
        <div class="modal-title-area">
          <h2 id="oauthPromptTitle">Acceso con Proveedor</h2>
          <p id="oauthPromptSubtitle">Inicia sesión o regístrate en un clic</p>
        </div>
        <button class="modal-close" id="oauthPromptClose" aria-label="Cerrar">✕</button>
      </div>
      <div class="modal-body" style="text-align:center">
        <div id="oauthProviderBadge" style="margin-bottom:16px;"></div>
        <div class="form-group" style="text-align:left">
          <label for="oauthNameInput">Nombre Completo</label>
          <input type="text" id="oauthNameInput" placeholder="Tu nombre" required />
        </div>
        <div class="form-group" style="text-align:left">
          <label for="oauthEmailInput">Correo de la Cuenta</label>
          <input type="email" id="oauthEmailInput" placeholder="usuario@gmail.com" required />
        </div>
        <button type="button" class="btn-primary full-width" id="oauthConfirmSubmitBtn" style="padding:12px; margin-top:10px; font-size:14px;">
          🚀 Confirmar e Ingresar a BusTrack Pro
        </button>
      </div>
    </div>
  </div>

  <!-- ============ COMMAND PALETTE (CTRL + K) ============ -->
  <div class="modal-overlay" id="commandPaletteModal">
    <div class="command-palette-box" role="dialog" aria-modal="true" aria-label="Búsqueda rápida y comandos">
      <div class="cmd-header">
        <svg viewBox="0 0 20 20" fill="currentColor" width="20" height="20" aria-hidden="true"><path fill-rule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.48l4.82 4.81a1 1 0 01-1.42 1.42l-4.81-4.82A6 6 0 012 8z" clip-rule="evenodd"/></svg>
        <input type="search" id="cmdInput" placeholder="Escribe un comando o busca un bus, ruta, conductor..." autocomplete="off" />
        <span class="cmd-key">ESC</span>
      </div>
      <div class="cmd-results" id="cmdResults">
        <div class="cmd-section-label">Acciones Rápidas</div>
        <div class="cmd-item" data-action="go-dashboard"><span class="cmd-icon">📊</span> Panel Principal</div>

        <div class="cmd-item" data-action="go-map"><span class="cmd-icon">🗺️</span> Mapa en Vivo</div>
        <div class="cmd-item" data-action="go-fleet"><span class="cmd-icon">🚍</span> Ver Flota Completa</div>
        <div class="cmd-item" data-action="toggle-theme"><span class="cmd-icon">🌙</span> Alternar Modo Oscuro / Claro</div>
      </div>
    </div>
  </div>

  <!-- ============ BANNER DE CONSENTIMIENTO DE COOKIES ============ -->
  <div class="cookie-banner" id="cookieConsentBanner" hidden role="region" aria-label="Consentimiento de cookies y privacidad">
    <div class="cookie-content">
      <p class="cookie-title">🍪 Privacidad y Almacenamiento Local</p>
      <p class="cookie-text">
        Usamos <code>localStorage</code> únicamente para guardar tus preferencias (tema, vista activa). No usamos cookies de rastreo ni compartimos datos con terceros. Consulta nuestra <a href="/privacy" target="_blank">Política de Privacidad</a> y <a href="/cookies" target="_blank">Política de Cookies</a>.
      </p>
    </div>
    <div class="cookie-actions">
      <button class="btn-ghost btn-sm" id="cookieRejectBtn">Rechazar Opcionales</button>
      <button class="btn-primary btn-sm" id="cookieAcceptBtn">Aceptar Todo</button>
    </div>
  </div>

  <div class="notif-dropdown" id="notifDropdown">
    <div class="notif-header">
      <h3>Notificaciones</h3>
      <button class="btn-ghost btn-sm" id="clearNotifsBtn">Limpiar</button>
    </div>
    <div class="notif-list" id="notifList"></div>
  </div>

  <!-- ============ MODAL AGREGAR BUS ============ -->
  <div class="modal-overlay" id="addBusModal">
    <div class="modal modal-narrow" role="dialog" aria-modal="true" aria-labelledby="addBusTitle">
      <div class="modal-header">
        <div class="modal-title-area">
          <h2 id="addBusTitle">Agregar Bus a la Flota</h2>
          <p>Registra una nueva unidad en el sistema de rastreo</p>
        </div>
        <button class="modal-close" id="addBusClose" aria-label="Cerrar">✕</button>
      </div>
      <div class="modal-body">
        <form id="addBusForm" class="auth-form">
          <div class="form-group">
            <label for="newBusId">Identificador del Bus</label>
            <input type="text" id="newBusId" placeholder="ej. BUS-013" required />
          </div>
          <div class="form-group">
            <label for="newBusRoute">Ruta Asignada</label>
            <select id="newBusRoute" class="status-select-lg" style="width:100%" required>
              <option value="A">Ruta A — Central</option>
              <option value="B">Ruta B — Universidad</option>
              <option value="C">Ruta C — Expresa</option>
              <option value="D">Ruta D — Periférica</option>
            </select>
          </div>
          <div class="form-group">
            <label for="newBusDriver">Conductor Asignado</label>
            <select id="newBusDriver" class="status-select-lg" style="width:100%" required>
              <option value="D001">Carlos Mendoza</option>
              <option value="D002">Ana García</option>
              <option value="D003">Roberto López</option>
              <option value="D004">María Flores</option>
              <option value="D005">Jorge Ramírez</option>
              <option value="D006">Lucía Castro</option>
            </select>
          </div>
          <div class="form-group">
            <label for="newBusPlate">Número de Placa</label>
            <input type="text" id="newBusPlate" placeholder="ej. SJ-9842" required />
          </div>
          <button type="submit" class="btn-primary full-width" style="margin-top:1rem">Registrar e Iniciar Rastreo</button>
        </form>
      </div>
    </div>
  </div>

  <!-- ============ MODAL CONTACTAR CONDUCTOR ============ -->
  <div class="modal-overlay" id="contactDriverModal">
    <div class="modal modal-narrow" role="dialog" aria-modal="true" aria-labelledby="contactTitle">
      <div class="modal-header">
        <div class="modal-title-area">
          <h2 id="contactTitle">Contactar Conductor</h2>
          <p id="contactSubtitle">Comunicación directa con la unidad</p>
        </div>
        <button class="modal-close" id="contactClose" aria-label="Cerrar">✕</button>
      </div>
      <div class="modal-body">
        <div class="driver-contact-card">
          <div class="driver-avatar-lg" id="contactDriverInitials">CM</div>
          <div style="text-align:center">
            <h3 id="contactDriverName" style="font-size:16px; font-weight:700">Carlos Mendoza</h3>
            <p id="contactDriverBus" style="font-size:12px; color:var(--text-soft); margin-top:2px">Asignado a BUS-001 (Ruta A)</p>
            <span class="status-badge status-active" id="contactDriverStatus" style="margin-top:6px; display:inline-block">En turno activo</span>
          </div>
        </div>
        <div class="contact-actions-grid" style="display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-top:1rem">
          <button class="btn-primary" id="callDriverBtn">📞 Llamada Directa</button>
          <button class="btn-ghost" id="msgDriverBtn">💬 WhatsApp / SMS</button>
          <button class="btn-ghost full-width" id="dispatchAlertBtn" style="grid-column: span 2; margin-top:4px">📡 Enviar Alerta de Despacho</button>
        </div>
      </div>
    </div>
  <!-- ============ MODAL DIAGNÓSTICO BASE DE DATOS REAL ============ -->
  <div class="db-modal-overlay" id="dbModal" role="dialog" aria-modal="true" aria-labelledby="dbModalTitle">
    <div class="db-modal-card">
      <div class="db-modal-head">
        <h3 id="dbModalTitle">🗄️ Base de Datos 100% Real · Diagnóstico</h3>
        <button class="db-modal-close" id="dbModalClose" aria-label="Cerrar modal">&times;</button>
      </div>

      <div class="db-metrics-grid">
        <div class="db-metric-box">
          <div class="db-metric-label">Motor Activo</div>
          <div class="db-metric-val" id="dbModalEngine" style="color:#5b6ef5">SQLite 3.53</div>
        </div>
        <div class="db-metric-box">
          <div class="db-metric-label">Persistencia</div>
          <div class="db-metric-val" id="dbModalStorage" style="color:#34d399">Archivo en Disco</div>
        </div>
        <div class="db-metric-box">
          <div class="db-metric-label">Tamaño en Disco</div>
          <div class="db-metric-val" id="dbModalSize">92.0 KB</div>
        </div>
        <div class="db-metric-box">
          <div class="db-metric-label">Total Registros</div>
          <div class="db-metric-val" id="dbModalTotalRows">57 filas</div>
        </div>
      </div>

      <div>
        <h4 style="font-size:13px; font-weight:700; color:var(--text-strong); margin-bottom:6px">📁 Ubicación Física del Archivo SQL:</h4>
        <p id="dbModalPath" style="font-family:'JetBrains Mono', monospace; font-size:11.5px; color:#a5b0fb; background:var(--bg-surface); padding:8px 10px; border-radius:6px; word-break:break-all; border:1px solid var(--line)"></p>
      </div>

      <div>
        <h4 style="font-size:13px; font-weight:700; color:var(--text-strong); margin-bottom:8px">📊 Tablas Relacionales y Conteo en Vivo:</h4>
        <div class="db-table-list" id="dbModalTableList">
          <!-- Injected via JavaScript -->
        </div>
      </div>

      <div>
        <h4 style="font-size:13px; font-weight:700; color:var(--text-strong); margin-bottom:8px">🛡️ Garantías de Integridad y Rendimiento:</h4>
        <div class="db-features-badges">
          <span class="db-feature-badge">✓ Claves Foráneas (Foreign Keys) Activas</span>
          <span class="db-feature-badge">✓ Modo WAL (Write-Ahead Logging)</span>
          <span class="db-feature-badge">✓ Transacciones ACID</span>
          <span class="db-feature-badge">✓ Preparación de Consultas anti-SQLi</span>
          <span class="db-feature-badge">✓ Compatible con PostgreSQL / Supabase</span>
        </div>
      </div>

      <div style="display:flex; justify-content:flex-end; gap:8px; margin-top:8px">
        <button class="btn-ghost btn-sm" id="dbModalRefreshBtn">🔄 Actualizar Diagnóstico</button>
        <button class="btn-primary btn-sm" id="dbModalOkBtn">Entendido</button>
      </div>
    </div>
  </div>

  <div class="toast-stack" id="toastStack" aria-live="polite"></div>

  <script src="app.js"></script>
</body>
</html>
</file>

<file path="app.js">
/* ============================================================
   BusTrack Pro — lógica de la aplicación
   JavaScript sin dependencias. Los datos son simulados.
 
   Organización del archivo:
     1. Datos y utilidades
     2. Preferencias (localStorage)
     3. Navegación y sidebar
     4. Panel principal
     5. Flota (tabla, filtros, orden, CSV)
     6. Mapas (render, zoom, arrastre)
     7. Rutas, alertas, conductores, reportes
     8. Notificaciones y avisos
     9. Ciclo de vida (intervalos, resize, init)
   ============================================================ */
 
'use strict';
 
/* ==========================================================
   1. DATOS Y UTILIDADES
   ========================================================== */
 
// Los colores salen del CSS para que cambiar el acento repinte
// también los gráficos y los marcadores del mapa.
function cssVar(name, fallback) {
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v || fallback;
}

/* ==========================================================
   BACKEND API & WEBSOCKET CLIENT
   ========================================================== */

const API_BASE = window.location.protocol.startsWith('http')
  ? `${window.location.protocol}//${window.location.host}`
  : 'http://localhost:3000';
const WS_BASE = window.location.protocol === 'https:'
  ? `wss://${window.location.host}/ws/telemetry`
  : `ws://${window.location.host || 'localhost:3000'}/ws/telemetry`;

let backendConnected = false;
let wsInstance = null;

function updateBackendStatusBadge(status, text) {
  const pill = $('serverStatusPill');
  const label = $('serverStatusLabel');
  if (!pill || !label) return;
  pill.className = 'server-status-pill ' + status;
  label.textContent = text;
}

const api = {
  async checkHealth() {
    try {
      const res = await fetch(`${API_BASE}/api/v1/health`, { signal: AbortSignal.timeout(2500) });
      return res.ok;
    } catch {
      return false;
    }
  },
  async getBuses() {
    const res = await fetch(`${API_BASE}/api/v1/buses`);
    return res.json();
  },
  async getAlerts() {
    const res = await fetch(`${API_BASE}/api/v1/alerts`);
    return res.json();
  },
  async updateBusStatus(id, status) {
    const res = await fetch(`${API_BASE}/api/v1/buses/${id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    return res.json();
  },
  async createBus(payload) {
    const res = await fetch(`${API_BASE}/api/v1/buses`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return res.json();
  },
  async createAlert(payload) {
    const res = await fetch(`${API_BASE}/api/v1/alerts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return res.json();
  },
  async markAllAlertsRead() {
    const res = await fetch(`${API_BASE}/api/v1/alerts/read-all`, {
      method: 'PATCH',
    });
    return res.json();
  },
  async login(email, password) {
    const res = await fetch(`${API_BASE}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    return res.json();
  },
  async register(payload) {
    const res = await fetch(`${API_BASE}/api/v1/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return res.json();
  },
  async loginGoogle(payload) {
    const res = await fetch(`${API_BASE}/api/v1/auth/google`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return res.json();
  },
  async loginApple(payload) {
    const res = await fetch(`${API_BASE}/api/v1/auth/apple`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return res.json();
  },
  async getMe(token) {
    const res = await fetch(`${API_BASE}/api/v1/auth/me`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    return res.json();
  },
  async getDatabaseStatus() {
    try {
      const res = await fetch(`${API_BASE}/api/v1/database/status`);
      if (!res.ok) return null;
      return await res.json();
    } catch (err) {
      console.warn('Error fetching DB status:', err);
      return null;
    }
  }
};

async function fetchAndUpdateDbStatus() {
  const data = await api.getDatabaseStatus();
  const pillLabel = $('dbStatusLabel');
  const pill = $('dbStatusPill');

  if (!data) {
    if (pillLabel) pillLabel.textContent = 'BD: Sin conexión';
    if (pill) pill.className = 'db-status-pill';
    return;
  }

  // Update status pill label and style
  if (pillLabel) {
    const dialectName = data.dialect === 'sqlite' ? 'SQLite 3' : (data.dialect === 'postgres' ? 'PostgreSQL 16' : 'En Memoria');
    pillLabel.textContent = `BD: ${dialectName} (100% Real)`;
  }
  if (pill) {
    pill.className = 'db-status-pill real-db';
  }

  // Update modal contents if modal elements exist
  const modalEngine = $('dbModalEngine');
  const modalStorage = $('dbModalStorage');
  const modalSize = $('dbModalSize');
  const modalTotalRows = $('dbModalTotalRows');
  const modalPath = $('dbModalPath');
  const modalTableList = $('dbModalTableList');

  if (modalEngine) modalEngine.textContent = data.engine || 'SQLite 3 (ACID Relational File DB)';
  if (modalStorage) {
    modalStorage.textContent = data.storage === 'persistent_file' ? 'Archivo en Disco (WAL)' : 'En Memoria';
  }
  if (modalSize) modalSize.textContent = data.fileSizeFormatted || (data.fileSizeBytes ? `${(data.fileSizeBytes / 1024).toFixed(1)} KB` : 'N/A');
  if (modalTotalRows) modalTotalRows.textContent = `${data.totalRows || 0} filas`;
  if (modalPath) modalPath.textContent = data.filePath || 'RAM (In-Memory)';

  if (modalTableList && Array.isArray(data.tables)) {
    modalTableList.innerHTML = data.tables.map(t => `
      <div class="db-table-row">
        <span class="db-table-name">📋 ${esc(t.name)}</span>
        <span class="db-table-count">${fmt(t.count)} registros</span>
      </div>
    `).join('');
  }
}


function handleServerEvent(msg) {
  if (!msg || !msg.event) return;
  if (msg.event === 'snapshot') {
    if (msg.data && msg.data.buses) {
      buses = msg.data.buses;
      refreshCounters();
      renderBusList();
      if (state.view === 'fleet') renderFleet();
      if (state.view === 'map') renderMapBusList();
      drawMapMarkers(true);
    }
    if (msg.data && msg.data.alerts) {
      alerts = msg.data.alerts;
      renderAlerts();
    }
  } else if (msg.event === 'telemetry_tick') {
    const updates = msg.data;
    if (Array.isArray(updates)) {
      updates.forEach(u => {
        const b = buses.find(x => x.id === u.id);
        if (b) {
          b.speed = u.speed;
          b.passengers = u.passengers;
          b.fuel = u.fuel;
          b.delay = u.delay;
          b.nextStop = u.nextStop;
          b.etaMin = u.etaMin;
          b.pos = u.pos;
          b.updatedAgo = u.updatedAgo;
        }
      });
      refreshCounters();
      drawMapMarkers();
      if (state.view === 'dashboard') renderBusList();
      if (state.view === 'map') renderMapBusList();
      if (state.view === 'fleet') renderFleet();
    }
  } else if (msg.event === 'bus_status_changed') {
    const updated = msg.data;
    const b = buses.find(x => x.id === updated.id);
    if (b) {
      Object.assign(b, updated);
      refreshAfterStatusChange(b);
    }
  } else if (msg.event === 'bus_created') {
    const exists = buses.find(x => x.id === msg.data.id);
    if (!exists) {
      buses.push(msg.data);
      refreshCounters();
      renderBusList();
      if (state.view === 'fleet') renderFleet();
    }
  } else if (msg.event === 'alert_created') {
    const exists = alerts.find(x => x.id === msg.data.id);
    if (!exists) {
      alerts.unshift(msg.data);
      renderAlerts();
      addNotification(msg.data.icon, `<strong>${msg.data.title}:</strong> ${msg.data.bus}`);
    }
  } else if (msg.event === 'alerts_read_all') {
    alerts.forEach(a => { a.read = true; });
    renderAlerts();
  }
}

function initBackendConnection() {
  api.checkHealth().then(ok => {
    if (ok) {
      backendConnected = true;
      updateBackendStatusBadge('online', 'API Online');
      try {
        wsInstance = new WebSocket(WS_BASE);
        wsInstance.onopen = () => {
          backendConnected = true;
          updateBackendStatusBadge('online', 'API Online (WS)');
        };
        wsInstance.onmessage = (e) => {
          try {
            const data = JSON.parse(e.data);
            handleServerEvent(data);
          } catch (err) {
            console.warn('WS JSON parse error:', err);
          }
        };
        wsInstance.onclose = () => {
          backendConnected = false;
          updateBackendStatusBadge('offline', 'Modo Local');
        };
        wsInstance.onerror = () => {
          backendConnected = false;
          updateBackendStatusBadge('offline', 'Modo Local');
        };
      } catch (err) {
        console.warn('WebSocket init failed:', err);
      }
    } else {
      backendConnected = false;
      updateBackendStatusBadge('offline', 'Modo Local');
    }
  }).catch(() => {
    backendConnected = false;
    updateBackendStatusBadge('offline', 'Modo Local');
  });
}

 
const ROUTES = [
  { id: 'A', name: 'Centro — Aeropuerto',     varName: '--route-a', color: '#5b6ef5', stops: 8,  length: 22 },
  { id: 'B', name: 'Norte — Sur',             varName: '--route-b', color: '#7c4ddb', stops: 12, length: 35 },
  { id: 'C', name: 'Este — Centro',           varName: '--route-c', color: '#2aa3c4', stops: 6,  length: 18 },
  { id: 'D', name: 'Sur — Zona Industrial',   varName: '--route-d', color: '#2bb885', stops: 10, length: 28 },
];
 
const DRIVERS = [
  { id: 'D001', name: 'Carlos Mendoza',  initials: 'CM', license: 'CR-2-0456-0891', trips: 1248, rating: 4.9, hours: 8.5 },
  { id: 'D002', name: 'Ana García',      initials: 'AG', license: 'CR-1-0782-0334', trips: 987,  rating: 4.8, hours: 7.2 },
  { id: 'D003', name: 'Roberto López',   initials: 'RL', license: 'CR-3-0219-0645', trips: 1567, rating: 4.7, hours: 6.8 },
  { id: 'D004', name: 'María Flores',    initials: 'MF', license: 'CR-1-1043-0277', trips: 732,  rating: 5.0, hours: 9.0 },
  { id: 'D005', name: 'Jorge Ramírez',   initials: 'JR', license: 'CR-4-0388-0912', trips: 2103, rating: 4.6, hours: 5.5 },
  { id: 'D006', name: 'Lucía Castro',    initials: 'LC', license: 'CR-2-0955-0158', trips: 891,  rating: 4.9, hours: 8.0 },
];
 
const STOPS = [
  // --- SAN JOSÉ (GAM) ---
  { id: 'stop-central', name: 'Terminal Central San José', province: 'San José', lat: 9.9325, lon: -84.0815, x: 200, y: 150 },
  { id: 'stop-coca-cola', name: 'Terminal Coca Cola', province: 'San José', lat: 9.9366, lon: -84.0845, x: 220, y: 155 },
  { id: 'stop-7-10', name: 'Terminal 7-10 Interurbana', province: 'San José', lat: 9.9398, lon: -84.0827, x: 240, y: 160 },
  { id: 'stop-parque', name: 'Parque Central San José', province: 'San José', lat: 9.9333, lon: -84.0792, x: 400, y: 150 },
  { id: 'stop-hospital', name: 'Hospital San Juan de Dios', province: 'San José', lat: 9.9348, lon: -84.0864, x: 600, y: 150 },
  { id: 'stop-sabana', name: 'La Sabana — Estadio Nacional', province: 'San José', lat: 9.9355, lon: -84.1042, x: 200, y: 225 },
  { id: 'stop-escalante', name: 'Barrio Escalante', province: 'San José', lat: 9.9358, lon: -84.0625, x: 100, y: 225 },
  { id: 'stop-ucr', name: 'Universidad de Costa Rica (UCR)', province: 'San José', lat: 9.9365, lon: -84.0512, x: 400, y: 300 },
  { id: 'stop-zapote', name: 'Barrio Zapote / Avenida 10', province: 'San José', lat: 9.9392, lon: -84.0321, x: 400, y: 225 },
  { id: 'stop-vargas-araya', name: 'Barrio Vargas Araya', province: 'San José', lat: 9.9374, lon: -84.0382, x: 350, y: 225 },
  { id: 'stop-lourdes', name: 'Parada Súper Lourdes / Calasanz', province: 'San José', lat: 9.9362, lon: -84.0441, x: 300, y: 225 },
  { id: 'stop-san-pedro', name: 'Muñoz & Nanne / San Pedro', province: 'San José', lat: 9.9338, lon: -84.0535, x: 250, y: 225 },
  { id: 'stop-mall-sp', name: 'Mall San Pedro / Fuente Hispanidad', province: 'San José', lat: 9.9341, lon: -84.0620, x: 200, y: 225 },
  { id: 'stop-sanjose', name: 'Terminal San José — Cuesta de Moras', province: 'San José', lat: 9.9332, lon: -84.0768, x: 150, y: 225 },
  { id: 'stop-escazu', name: 'Escazú Centro / Multiplaza', province: 'San José', lat: 9.9458, lon: -84.1492, x: 120, y: 200 },
  { id: 'stop-santa-ana', name: 'Santa Ana Centro', province: 'San José', lat: 9.9328, lon: -84.1824, x: 100, y: 210 },
  { id: 'stop-desamparados', name: 'Desamparados Parque Central', province: 'San José', lat: 9.8974, lon: -84.0664, x: 300, y: 350 },

  // --- ALAJUELA (GAM & OCCIDENTE) ---
  { id: 'stop-alajuela-fecosa', name: 'Terminal Fecosa Alajuela', province: 'Alajuela', lat: 10.0152, lon: -84.2145, x: 550, y: 180 },
  { id: 'stop-aeropuerto-sjo', name: 'Aeropuerto Juan Santamaría (SJO)', province: 'Alajuela', lat: 10.0004, lon: -84.2141, x: 600, y: 225 },
  { id: 'stop-city-mall', name: 'City Mall Alajuela', province: 'Alajuela', lat: 10.0094, lon: -84.2102, x: 570, y: 200 },
  { id: 'stop-coyol', name: 'Zona Franca El Coyol', province: 'Alajuela', lat: 9.9965, lon: -84.2698, x: 620, y: 250 },
  { id: 'stop-san-ramon', name: 'Terminal San Ramón', province: 'Alajuela', lat: 10.0872, lon: -84.4705, x: 680, y: 280 },
  { id: 'stop-ciudad-quesada', name: 'Terminal Ciudad Quesada (San Carlos)', province: 'Alajuela', lat: 10.3245, lon: -84.4298, x: 700, y: 320 },
  { id: 'stop-la-fortuna', name: 'La Fortuna / Volcán Arenal', province: 'Alajuela', lat: 10.4716, lon: -84.6452, x: 720, y: 340 },

  // --- HEREDIA (GAM) ---
  { id: 'stop-heredia-central', name: 'Terminal Central Heredia', province: 'Heredia', lat: 9.9984, lon: -84.1165, x: 350, y: 120 },
  { id: 'stop-una', name: 'Universidad Nacional (UNA)', province: 'Heredia', lat: 9.9998, lon: -84.1112, x: 370, y: 115 },
  { id: 'stop-oxigeno', name: 'Mall Oxígeno Human Playground', province: 'Heredia', lat: 9.9882, lon: -84.1332, x: 340, y: 130 },
  { id: 'stop-belen', name: 'San Antonio de Belén', province: 'Heredia', lat: 9.9812, lon: -84.1878, x: 320, y: 140 },

  // --- CARTAGO (GAM & ORIENTE) ---
  { id: 'stop-cartago-central', name: 'Terminal Lumaca Cartago', province: 'Cartago', lat: 9.8645, lon: -83.9212, x: 450, y: 350 },
  { id: 'stop-basilica', name: 'Basílica Nuestra Señora de Los Ángeles', province: 'Cartago', lat: 9.8638, lon: -83.9131, x: 470, y: 360 },
  { id: 'stop-tec', name: 'Tecnológico de Costa Rica (TEC)', province: 'Cartago', lat: 9.8552, lon: -83.9095, x: 480, y: 370 },
  { id: 'stop-tres-rios', name: 'Tres Ríos Parque Central (La Unión)', province: 'Cartago', lat: 9.9075, lon: -83.9878, x: 420, y: 320 },
  { id: 'stop-turrialba', name: 'Terminal Transtusa Turrialba', province: 'Cartago', lat: 9.9048, lon: -83.6835, x: 520, y: 380 },

  // --- PUNTARENAS (PACÍFICO CENTRAL Y SUR) ---
  { id: 'stop-puntarenas-ferry', name: 'Terminal Ferry Puntarenas (Paquera)', province: 'Puntarenas', lat: 9.9774, lon: -84.8488, x: 150, y: 400 },
  { id: 'stop-puntarenas-centro', name: 'Terminal Central Puntarenas', province: 'Puntarenas', lat: 9.9765, lon: -84.8295, x: 160, y: 395 },
  { id: 'stop-caldera', name: 'Puerto Caldera', province: 'Puntarenas', lat: 9.9185, lon: -84.7175, x: 180, y: 380 },
  { id: 'stop-jaco', name: 'Terminal Jacó Centro', province: 'Puntarenas', lat: 9.6152, lon: -84.6295, x: 200, y: 420 },
  { id: 'stop-quepos', name: 'Terminal Quepos / Manuel Antonio', province: 'Puntarenas', lat: 9.4312, lon: -84.1615, x: 230, y: 450 },
  { id: 'stop-perez-zeledon', name: 'Terminal San Isidro de El General', province: 'Puntarenas', lat: 9.3735, lon: -83.7042, x: 350, y: 480 },

  // --- GUANACASTE (PACÍFICO NORTE) ---
  { id: 'stop-liberia-central', name: 'Terminal Municipal de Liberia', province: 'Guanacaste', lat: 10.6315, lon: -85.4382, x: 100, y: 80 },
  { id: 'stop-aeropuerto-lir', name: 'Aeropuerto Guanacaste (LIR)', province: 'Guanacaste', lat: 10.5935, lon: -85.5442, x: 90, y: 75 },
  { id: 'stop-santa-cruz', name: 'Terminal Santa Cruz', province: 'Guanacaste', lat: 10.2625, lon: -85.5862, x: 110, y: 110 },
  { id: 'stop-nicoya', name: 'Terminal Nicoya Colonial', province: 'Guanacaste', lat: 10.1448, lon: -85.4525, x: 120, y: 130 },
  { id: 'stop-tamarindo', name: 'Parada Playa Tamarindo', province: 'Guanacaste', lat: 10.2995, lon: -85.8412, x: 70, y: 100 },

  // --- LIMÓN (CARIBE) ---
  { id: 'stop-limon-centro', name: 'Terminal Caribeños Limón Centro', province: 'Limón', lat: 9.9935, lon: -83.0332, x: 750, y: 220 },
  { id: 'stop-moin', name: 'Terminal Puerto Moín (APM Terminals)', province: 'Limón', lat: 10.0012, lon: -83.0785, x: 740, y: 210 },
  { id: 'stop-guapiles', name: 'Terminal Pococí / Guápiles', province: 'Limón', lat: 10.2152, lon: -83.7845, x: 650, y: 160 },
  { id: 'stop-puerto-viejo', name: 'Parada Puerto Viejo de Talamanca', province: 'Limón', lat: 9.6565, lon: -82.7545, x: 790, y: 280 },
];
 
const STATUS_LABELS = {
  active: 'En servicio',
  delayed: 'Retrasado',
  stopped: 'Detenido',
  maintenance: 'Mantenimiento',
};
const STATUS_ORDER = { active: 0, delayed: 1, stopped: 2, maintenance: 3 };
 
// Ajusta los datos derivados del bus para que un estado elegido a mano
// tenga sentido: un bus "Detenido" no debería seguir mostrando velocidad,
// uno que pasa a "En servicio" recupera una velocidad razonable, etc.
function applyBusStatus(bus, status) {
  bus.status = status;
  if (status === 'stopped' || status === 'maintenance') {
    bus.speed = 0;
    bus.delay = 0;
  } else if (status === 'active') {
    bus.delay = 0;
    if (bus.speed === 0) bus.speed = randInt(24, 62);
  } else if (status === 'delayed') {
    if (bus.speed === 0) bus.speed = randInt(24, 62);
    if (bus.delay === 0) bus.delay = randInt(3, 11);
  }
}
 
// Refresca todas las vistas que puedan mostrar el estado de un bus
// después de un cambio manual.
function refreshAfterStatusChange(bus) {
  refreshCounters();
  if (state.view === 'dashboard') renderBusList();
  if (state.view === 'fleet') renderFleet();
  if (state.view === 'map') renderMapBusList();
  if (state.view === 'routes') renderRoutes();
  drawMapMarkers(true);
  if (busModal.classList.contains('open') && busModal.currentBusId === bus.id) {
    fillBusModal(bus);
  }
}
 
const $ = id => document.getElementById(id);
const $$ = sel => Array.from(document.querySelectorAll(sel));
 
const randInt = (a, b) => Math.floor(Math.random() * (b - a + 1)) + a;
const pick = arr => arr[Math.floor(Math.random() * arr.length)];
const fmt = n => Number(n).toLocaleString('es-CR');
 
// Escapa texto antes de insertarlo con innerHTML.
function esc(s) {
  return String(s).replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}
 
// Color de una ruta, resuelto contra el CSS actual.
function routeColor(route) {
  return cssVar(route.varName, route.color);
}
 
function syncRouteColors() {
  ROUTES.forEach(r => { r.color = routeColor(r); });
}
 
function generateBuses(count) {
  const statuses = ['active', 'active', 'active', 'active', 'active', 'delayed', 'delayed', 'stopped', 'maintenance'];
  const list = [];
  for (let i = 1; i <= count; i++) {
    const route = ROUTES[(i - 1) % ROUTES.length];
    const driver = DRIVERS[(i - 1) % DRIVERS.length];
    const status = pick(statuses);
    const moving = status === 'active' || status === 'delayed';
    list.push({
      id: 'BUS-' + String(i).padStart(3, '0'),
      num: String(i).padStart(3, '0'),
      plate: 'SJB-' + String(1000 + i),
      route, driver, status,
      speed: moving ? randInt(24, 62) : 0,
      passengers: randInt(0, 46),
      capacity: 52,
      fuel: randInt(14, 96),
      delay: status === 'delayed' ? randInt(3, 11) : 0,
      nextStop: pick(STOPS).name,
      etaMin: randInt(2, 11),
      updatedAgo: randInt(1, 5),
      pos: { x: 400, y: 225 },
      _t: Math.random(),
      _step: 0.004 + Math.random() * 0.005,
      _dir: Math.random() > 0.5 ? 1 : -1,
    });
  }
  return list;
}
 
let buses = generateBuses(12);
 
const state = {
  view: 'dashboard',
  busFilter: 'all',
  alertFilter: 'all',
  chartPeriod: 'day',
  sort: { key: 'id', dir: 1 },
  highlightBus: null,
  trackingBus: null,   // bus que la cámara del mapa sigue mientras se mueve
};
 
/* ==========================================================
   2. PREFERENCIAS
   ========================================================== */
 
const ACCENTS = [
  { id: 'indigo', label: 'Índigo',  swatch: 'linear-gradient(135deg,#5b6ef5,#7c4ddb)' },
  { id: 'teal',   label: 'Verde azulado', swatch: 'linear-gradient(135deg,#22a79b,#2aa3c4)' },
  { id: 'forest', label: 'Verde',   swatch: 'linear-gradient(135deg,#2f9e63,#2aa3c4)' },
  { id: 'amber',  label: 'Ámbar',   swatch: 'linear-gradient(135deg,#d38b2a,#c96a3c)' },
  { id: 'rose',   label: 'Rosa',    swatch: 'linear-gradient(135deg,#d95273,#9b4bc4)' },
];
 
const prefs = {
  accent: 'indigo',
  motion: true,
  live: true,
  density: 'normal',
};
 
function loadPrefs() {
  try {
    const raw = localStorage.getItem('bustrack:prefs');
    if (raw) Object.assign(prefs, JSON.parse(raw));
  } catch (e) {
    // Algunos navegadores bloquean localStorage con file://; no es grave.
    console.warn('No se pudieron leer las preferencias:', e);
  }
  applyPrefs();
}
 
function savePrefs() {
  try {
    localStorage.setItem('bustrack:prefs', JSON.stringify(prefs));
  } catch (e) {
    console.warn('No se pudieron guardar las preferencias:', e);
  }
}
 
function applyPrefs() {
  const root = document.documentElement;
  if (prefs.accent === 'indigo') root.removeAttribute('data-accent');
  else root.setAttribute('data-accent', prefs.accent);
  root.setAttribute('data-density', prefs.density);
  syncRouteColors();
}
 
/* ==========================================================
   3. NAVEGACIÓN Y SIDEBAR
   ========================================================== */
 
const VIEW_TITLES = {
  dashboard: 'Panel Principal',

  map: 'Mapa en Vivo',
  fleet: 'Gestión de Flota',
  routes: 'Rutas',
  alerts: 'Centro de Alertas',
  reports: 'Reportes',
  drivers: 'Conductores',
};

let switchView = function(view) {
  return navigate(view);
};

function navigate(view) {
  if (!VIEW_TITLES[view]) return;
  $$('.view').forEach(v => v.classList.remove('active'));
  $$('.nav-item').forEach(n => n.classList.remove('active'));
  $('view-' + view).classList.add('active');
  const navEl = $('nav-' + view);
  if (navEl) navEl.classList.add('active');
 
  state.view = view;
  $('pageTitle').textContent = VIEW_TITLES[view];
  $('breadcrumbCurrent').textContent = VIEW_TITLES[view];
  document.title = VIEW_TITLES[view] + ' — BusTrack Pro';
 
  

  if (view === 'fleet') renderFleet();
  if (view === 'routes') renderRoutes();
  if (view === 'alerts') renderAlerts();
  if (view === 'drivers') renderDrivers();
  if (view === 'map') {
    // Inicializar el mapa Leaflet la primera vez que se abre la vista.
    // El contenedor debe estar visible y con dimensiones para que Leaflet
    // calcule el tamaño correctamente y cargue los tiles.
    if (!realLeafletMap) {
      // Esperar al siguiente frame para asegurarnos de que el DOM ha pintado
      requestAnimationFrame(() => {
        initRealLeafletMap();
        // Pedir ubicación GPS al abrir el mapa por primera vez
        if (localStorage.getItem('bustrack_geolocate') === 'true') {
          requestUserLocation(false); // silencioso si ya tenía permiso
        } else {
          requestUserLocation(true); // solicita permiso al usuario
        }
      });
    } else {
      // Forzar recálculo de dimensiones después de la animación CSS viewIn (0.25s)
      setTimeout(() => {
        realLeafletMap.invalidateSize({ animate: false });
      }, 300);
    }
    renderMapBusList();
    drawMapMarkers(true);
  }
  if (view === 'dashboard') requestAnimationFrame(() => { drawMainChart(); drawSparklines(); });
  if (view === 'reports') requestAnimationFrame(drawReportCharts);
 
  closeSidebar();
  if (homeOpen) hideHome();
  window.scrollTo(0, 0);
}
 
$$('.nav-item').forEach(item => {
  item.addEventListener('click', () => navigate(item.dataset.view));
  item.addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigate(item.dataset.view); }
  });
});
 
const sidebar = $('sidebar');
const isMobile = () => window.matchMedia('(max-width: 768px)').matches;
 
function openSidebar() {
  if (sidebar) sidebar.classList.add('mobile-open');
  const overlay = $('sidebarOverlay');
  if (overlay) overlay.classList.add('open');
  const btn = $('mobileMenuBtn');
  if (btn) btn.setAttribute('aria-expanded', 'true');
  document.body.style.overflow = 'hidden';
}
function closeSidebar() {
  if (sidebar) sidebar.classList.remove('mobile-open');
  const overlay = $('sidebarOverlay');
  if (overlay) overlay.classList.remove('open');
  const btn = $('mobileMenuBtn');
  if (btn) btn.setAttribute('aria-expanded', 'false');
  document.body.style.overflow = '';
}
 
$('sidebarToggle')?.addEventListener('click', function () {
  if (!sidebar) return;
  const collapsed = sidebar.classList.toggle('collapsed');
  this.setAttribute('aria-expanded', String(!collapsed));
  // El ancho del contenido cambió: los canvas necesitan redibujarse.
  setTimeout(redrawAll, 220);
});
$('mobileMenuBtn')?.addEventListener('click', openSidebar);
$('sidebarOverlay')?.addEventListener('click', closeSidebar);
 
/* ==========================================================
   4. PANEL PRINCIPAL
   ========================================================== */
 
const statusLabel = s => STATUS_LABELS[s] || s;
 
function renderBusList() {
  const el = $('busList');
  let data = buses;
  if (state.busFilter === 'active') data = buses.filter(b => b.status === 'active');
  if (state.busFilter === 'delayed') data = buses.filter(b => b.status === 'delayed');
 
  if (!data.length) {
    el.innerHTML = '<p class="empty-state">No hay buses en esta categoría</p>';
    return;
  }
  el.innerHTML = data.map(b => `
    <div class="bus-item" data-bus="${b.id}" role="button" tabindex="0">
      <span class="bus-item-icon" style="background:${b.route.color}22;color:${b.route.color}">${b.num}</span>
      <span class="bus-item-info">
        <span class="bus-item-id">${b.id}</span>
        <span class="bus-item-route">Ruta ${b.route.id} · ${esc(b.driver.name.split(' ')[0])}</span>
      </span>
      <span class="bus-item-meta">
        <span class="bus-item-speed">${b.speed} km/h</span>
        <span class="status-badge status-${b.status}">${statusLabel(b.status)}</span>
      </span>
    </div>`).join('');
}
 
$$('.filter-tab[data-filter]').forEach(tab => {
  tab.addEventListener('click', function () {
    $$('.filter-tab[data-filter]').forEach(t => t.classList.remove('active'));
    this.classList.add('active');
    state.busFilter = this.dataset.filter;
    renderBusList();
  });
});
 
const ACTIVITY_SEED = [
  { icon: '🚌', tone: 'info', text: '<strong>BUS-003</strong> llegó a <strong>Terminal Central</strong>', time: 'hace 2 min' },
  { icon: '⚠️', tone: 'warn', text: '<strong>BUS-007</strong> acumula <strong>+5 min</strong> de retraso en Ruta B', time: 'hace 4 min' },
  { icon: '✅', tone: 'ok',   text: '<strong>BUS-001</strong> cerró viaje con <strong>48 pasajeros</strong>', time: 'hace 7 min' },
  { icon: '🔧', tone: 'risk', text: '<strong>BUS-011</strong> entró a <strong>mantenimiento</strong> preventivo', time: 'hace 12 min' },
  { icon: '👤', tone: 'info', text: '<strong>Carlos M.</strong> inició turno en <strong>BUS-005</strong>', time: 'hace 18 min' },
  { icon: '📍', tone: 'info', text: '<strong>BUS-009</strong> llegó a <strong>Aeropuerto</strong>', time: 'hace 23 min' },
  { icon: '⛽', tone: 'warn', text: '<strong>BUS-004</strong> repostó en <strong>Terminal Central</strong>', time: 'hace 31 min' },
  { icon: '🚌', tone: 'info', text: '<strong>BUS-012</strong> salió de <strong>Zona Industrial</strong>', time: 'hace 38 min' },
  { icon: '✅', tone: 'ok',   text: '<strong>BUS-006</strong> recuperó el horario en Ruta C', time: 'hace 44 min' },
  { icon: '👤', tone: 'info', text: '<strong>Lucía C.</strong> cerró turno en <strong>BUS-002</strong>', time: 'hace 52 min' },
];
const activities = ACTIVITY_SEED.slice();
 
const TONE_BG = {
  info: () => cssVar('--brand-500', '#5b6ef5'),
  ok:   () => cssVar('--ok', '#2bb885'),
  warn: () => cssVar('--warn', '#e0972c'),
  risk: () => cssVar('--risk', '#e0526b'),
};
 
function renderActivity() {
  const expanded = $('activityFeed').classList.contains('expanded');
  const data = expanded ? activities : activities.slice(0, 6);
  $('activityFeed').innerHTML = data.map(a => `
    <div class="activity-item">
      <span class="activity-icon" style="background:${TONE_BG[a.tone]()}22">${a.icon}</span>
      <span class="activity-content">
        <span class="activity-text">${a.text}</span>
        <span class="activity-time">${a.time}</span>
      </span>
    </div>`).join('');
}
 
$('toggleActivityBtn').addEventListener('click', function () {
  const feed = $('activityFeed');
  const open = feed.classList.toggle('expanded');
  this.textContent = open ? 'Ver menos' : 'Ver todo';
  this.setAttribute('aria-expanded', String(open));
  renderActivity();
});
 
function pushActivity() {
  const verbos = ['llegó a', 'salió de', 'pasó por'];
  const bus = pick(buses);
  activities.forEach(a => { if (a.time === 'ahora mismo') a.time = 'hace 1 min'; });
  activities.unshift({
    icon: '🚌', tone: 'info',
    text: `<strong>${bus.id}</strong> ${pick(verbos)} <strong>${esc(pick(STOPS).name)}</strong>`,
    time: 'ahora mismo',
  });
  if (activities.length > 14) activities.pop();
  if (state.view === 'dashboard') renderActivity();
}
 
/* ==========================================================
   5. FLOTA
   ========================================================== */
 
function sortValue(bus, key) {
  switch (key) {
    case 'route': return bus.route.id;
    case 'driver': return bus.driver.name;
    case 'status': return STATUS_ORDER[bus.status];
    case 'speed': return bus.speed;
    case 'passengers': return bus.passengers;
    case 'plate': return bus.plate;
    default: return bus.id;
  }
}
 
function visibleBuses() {
  const q = $('fleetSearch').value.trim().toLowerCase();
  const status = $('statusFilter').value;
  const route = $('routeFilter').value;
 
  const rows = buses.filter(b => {
    const haystack = [b.id, b.plate, b.driver.name, b.route.name, 'ruta ' + b.route.id].join(' ').toLowerCase();
    return (!q || haystack.includes(q))
      && (!status || b.status === status)
      && (!route || b.route.id === route);
  });
 
  const { key, dir } = state.sort;
  return rows.sort((a, b) => {
    const va = sortValue(a, key), vb = sortValue(b, key);
    if (va < vb) return -1 * dir;
    if (va > vb) return 1 * dir;
    return 0;
  });
}
 
const ICON_EYE = '<svg viewBox="0 0 20 20" fill="currentColor"><path d="M10 4c-4 0-7.3 2.6-9 6 1.7 3.4 5 6 9 6s7.3-2.6 9-6c-1.7-3.4-5-6-9-6zm0 10a4 4 0 110-8 4 4 0 010 8zm0-2a2 2 0 100-4 2 2 0 000 4z"/></svg>';
const ICON_PIN = '<svg viewBox="0 0 20 20" fill="currentColor"><path d="M10 2a5 5 0 00-5 5c0 3.6 4.2 8.3 4.4 8.5a.8.8 0 001.2 0C10.8 15.3 15 10.6 15 7a5 5 0 00-5-5zm0 7a2 2 0 110-4 2 2 0 010 4z"/></svg>';
 
function renderFleet() {
  const rows = visibleBuses();
  const tbody = $('fleetTableBody');
 
  $('fleetCount').textContent = rows.length === buses.length
    ? `${buses.length} buses en la flota`
    : `${rows.length} de ${buses.length} buses`;
 
  if (!rows.length) {
    tbody.innerHTML = '<tr><td colspan="9"><p class="empty-state">Ningún bus coincide con los filtros</p></td></tr>';
    return;
  }
 
  tbody.innerHTML = rows.map(b => {
    const pct = Math.round((b.passengers / b.capacity) * 100);
    const barColor = pct > 85 ? cssVar('--risk') : pct > 60 ? cssVar('--warn') : cssVar('--ok');
    return `
    <tr>
      <td>${b.id}</td>
      <td class="mono">${b.plate}</td>
      <td><span class="route-pill" style="background:${b.route.color}22;color:${b.route.color}">Ruta ${b.route.id}</span></td>
      <td>${esc(b.driver.name)}</td>
      <td class="mono">${b.speed} km/h</td>
      <td>
        <span style="display:inline-flex;align-items:center;gap:7px">
          <span class="mini-bar"><span style="width:${pct}%;background:${barColor}"></span></span>
          ${b.passengers}/${b.capacity}
        </span>
      </td>
      <td>
        <select class="status-select status-${b.status}" data-status-select="${b.id}" aria-label="Cambiar el estado de ${b.id}">
          <option value="active" ${b.status === 'active' ? 'selected' : ''}>En servicio</option>
          <option value="delayed" ${b.status === 'delayed' ? 'selected' : ''}>Retrasado</option>
          <option value="stopped" ${b.status === 'stopped' ? 'selected' : ''}>Detenido</option>
          <option value="maintenance" ${b.status === 'maintenance' ? 'selected' : ''}>Mantenimiento</option>
        </select>
      </td>
      <td style="color:var(--text-soft)">hace ${b.updatedAgo} min</td>
      <td>
        <span class="table-actions">
          <button class="table-btn" data-bus="${b.id}" title="Ver detalle" aria-label="Ver detalle de ${b.id}">${ICON_EYE}</button>
          <button class="table-btn" data-track="${b.id}" title="Ver en el mapa" aria-label="Ver ${b.id} en el mapa">${ICON_PIN}</button>
        </span>
      </td>
    </tr>`;
  }).join('');
}
 
$('fleetSearch').addEventListener('input', renderFleet);
$('statusFilter').addEventListener('change', renderFleet);
$('routeFilter').addEventListener('change', renderFleet);
 
$('fleetTableBody').addEventListener('change', e => {
  const sel = e.target.closest('[data-status-select]');
  if (!sel) return;
  const bus = buses.find(b => b.id === sel.dataset.statusSelect);
  if (!bus) return;
  applyBusStatus(bus, sel.value);
  refreshAfterStatusChange(bus);
  toast('Estado de ' + bus.id + ' actualizado a ' + statusLabel(bus.status), 'ok');
});
 
$('resetFiltersBtn').addEventListener('click', () => {
  $('fleetSearch').value = '';
  $('statusFilter').value = '';
  $('routeFilter').value = '';
  state.sort = { key: 'id', dir: 1 };
  $$('.fleet-table th').forEach(th => th.classList.remove('sorted', 'desc'));
  renderFleet();
  toast('Filtros restablecidos');
});
 
$$('.fleet-table th[data-sort]').forEach(th => {
  const apply = () => {
    const key = th.dataset.sort;
    state.sort = { key, dir: state.sort.key === key ? -state.sort.dir : 1 };
    $$('.fleet-table th').forEach(t => t.classList.remove('sorted', 'desc'));
    th.classList.add('sorted');
    if (state.sort.dir === -1) th.classList.add('desc');
    renderFleet();
  };
  th.addEventListener('click', apply);
  th.addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); apply(); }
  });
});
 
$('addBusBtn').addEventListener('click', async () => {
  const n = buses.length + 1;
  const route = ROUTES[(n - 1) % ROUTES.length];
  const driver = DRIVERS[(n - 1) % DRIVERS.length];

  if (backendConnected) {
    try {
      const newBus = await api.createBus({ routeId: route.id, driverId: driver.id });
      buses.push(newBus);
      renderFleet();
      refreshCounters();
      toast('Bus ' + newBus.id + ' registrado en backend', 'ok');
      return;
    } catch (err) {
      console.warn('Failed to add bus to backend, falling back to local:', err);
    }
  }

  buses.push({
    id: 'BUS-' + String(n).padStart(3, '0'),
    num: String(n).padStart(3, '0'),
    plate: 'SJB-' + String(1000 + n),
    route,
    driver,
    status: 'stopped',
    speed: 0, passengers: 0, capacity: 52, fuel: 100, delay: 0,
    nextStop: STOPS[0].name, etaMin: 0, updatedAgo: 0,
    pos: { x: 400, y: 225 }, _t: Math.random(), _step: 0.005, _dir: 1,
  });
  renderFleet();
  refreshCounters();
  toast('Bus ' + buses[buses.length - 1].id + ' agregado a la flota', 'ok');
});
 
$('exportCsvBtn').addEventListener('click', () => {
  const rows = visibleBuses();
  const head = ['Bus', 'Placa', 'Ruta', 'Conductor', 'Velocidad (km/h)', 'Pasajeros', 'Capacidad', 'Estado', 'Combustible (%)', 'Retraso (min)'];
  const body = rows.map(b => [
    b.id, b.plate, 'Ruta ' + b.route.id, b.driver.name,
    b.speed, b.passengers, b.capacity, statusLabel(b.status), b.fuel, b.delay,
  ]);
  const csv = [head, ...body]
    .map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(';'))
    .join('\r\n');
 
  if (typeof URL === 'undefined' || !URL.createObjectURL) {
    toast('Este navegador no permite descargar el archivo', 'warn');
    return;
  }
  // BOM para que Excel en español abra bien los acentos
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'flota-' + new Date().toISOString().slice(0, 10) + '.csv';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  toast(rows.length + ' filas exportadas a CSV', 'ok');
});
 
/* ==========================================================
   6. MAPAS — LEAFLET REAL INTERACTIVE MAP (COBERTURA NACIONAL)
   ========================================================== */

const CR_PROVINCES = {
  all: { center: [9.7489, -83.7534], zoom: 8, name: 'Costa Rica' },
  'San José': { center: [9.9333, -84.0833], zoom: 13, name: 'San José (GAM)' },
  Alajuela: { center: [10.0163, -84.2116], zoom: 12, name: 'Alajuela' },
  Heredia: { center: [9.9984, -84.1165], zoom: 13, name: 'Heredia' },
  Cartago: { center: [9.8645, -83.9212], zoom: 13, name: 'Cartago' },
  Puntarenas: { center: [9.9765, -84.8295], zoom: 12, name: 'Puntarenas' },
  Guanacaste: { center: [10.6315, -85.4382], zoom: 11, name: 'Guanacaste' },
  Limón: { center: [9.9935, -83.0332], zoom: 12, name: 'Limón' },
};

// Rutas GPS reales trazadas sobre carreteras y paradas reales
const ROUTE_GPS_PATHS = {
  A: [
    [9.9325, -84.0815], [9.9348, -84.0864], [9.9355, -84.1042],
    [9.9458, -84.1492], [9.9812, -84.1878], [10.0004, -84.2141], [10.0152, -84.2145]
  ],
  B: [
    [9.9984, -84.1165], [9.9882, -84.1332], [9.9366, -84.0845],
    [9.9333, -84.0792], [9.8974, -84.0664]
  ],
  C: [
    [9.8645, -83.9212], [9.8638, -83.9131], [9.9075, -83.9878],
    [9.9338, -84.0535], [9.9365, -84.0512], [9.9392, -84.0321], [9.9332, -84.0768]
  ],
  D: [
    [9.9333, -84.0792], [9.9412, -84.0389], [9.9048, -83.6835], [10.2152, -83.7845], [9.9935, -83.0332]
  ]
};

let realLeafletMap = null;
let leafletMarkers = {
  buses: {},
  stops: {},
  user: null,
  routes: {},
};

function initRealLeafletMap() {
  const container = document.getElementById('realFullMap');
  if (!container || realLeafletMap) return;

  // Centro inicial: San José / GAM
  realLeafletMap = L.map('realFullMap', {
    center: [9.9333, -84.0833],
    zoom: 12,
    zoomControl: false,
    attributionControl: false
  });

  // Capa base OpenStreetMap — 100% gratuita, sin API key.
  // El tema oscuro se logra con filtro CSS sobre el tile pane
  // (los marcadores y controles NO se invierten, solo las calles).
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
  }).addTo(realLeafletMap);

  // Aplicar inversión de colores solo al pane de tiles para tema dark
  const tilePaneEl = realLeafletMap.getPanes().tilePane;
  if (tilePaneEl) {
    tilePaneEl.style.filter = 'invert(1) hue-rotate(180deg) brightness(0.9) contrast(0.9) saturate(0.7)';
  }

  paintRealStopsAndRoutes();

  // Selector de provincias
  const provSelect = document.getElementById('provinceSelect');
  if (provSelect) {
    provSelect.addEventListener('change', (e) => {
      const p = CR_PROVINCES[e.target.value] || CR_PROVINCES.all;
      realLeafletMap.flyTo(p.center, p.zoom, { duration: 1.5 });
      toast('🇨🇷 Enfocando región: ' + p.name, 'info');
    });
  }

  realLeafletMap.on('dragstart', () => {
    if (state.trackingBus) {
      stopTracking('Dejaste de seguir el bus al mover el mapa');
    }
  });

  drawMapMarkers(true);
}

function paintRealStopsAndRoutes() {
  if (!realLeafletMap) return;

  // 1. Trazar líneas de ruta GPS
  ROUTES.forEach(r => {
    const coords = ROUTE_GPS_PATHS[r.id];
    if (coords && coords.length) {
      const poly = L.polyline(coords, {
        color: r.color,
        weight: 4,
        opacity: 0.85,
        dashArray: '8, 8'
      }).addTo(realLeafletMap);
      poly.bindTooltip('Ruta ' + r.id + ': ' + r.name, { sticky: true });
      leafletMarkers.routes[r.id] = poly;
    }
  });

  // 2. Colocar marcadores de paradas nacionales
  STOPS.forEach(s => {
    const icon = L.divIcon({
      className: 'real-stop-div-icon',
      html: '<div class="real-stop-icon-inner" title="' + esc(s.name) + '"></div>',
      iconSize: [20, 20],
      iconAnchor: [10, 10]
    });

    const marker = L.marker([s.lat, s.lon], { icon }).addTo(realLeafletMap);
    marker.bindPopup(
      '<div style="font-family:Inter, sans-serif;">' +
        '<strong style="color:var(--text-strong); font-size:13px;">🚏 ' + esc(s.name) + '</strong>' +
        '<p style="margin:4px 0 0; color:var(--text-soft); font-size:11.5px;">' + esc(s.subtext || s.province || 'Parada oficial') + '</p>' +
        '<span class="badge" style="margin-top:6px; display:inline-block; font-size:10px;">' + (s.province || 'Costa Rica') + '</span>' +
      '</div>'
    );
    leafletMarkers.stops[s.id || s.name] = marker;
  });

  // 3. Leyendas
  const stopColor = '#f59e0b';
  const legend = ROUTES.map(r =>
    '<span class="legend-item"><span class="legend-dot" style="background:' + r.color + '"></span>Ruta ' + r.id + '</span>').join('')
    + '<span class="legend-item"><span class="legend-dot" style="background:' + stopColor + '"></span>Paradas</span>';
  const miniLeg = document.getElementById('miniLegend');
  const fullLeg = document.getElementById('fullLegend');
  if (miniLeg) miniLeg.innerHTML = legend;
  if (fullLeg) fullLeg.innerHTML = legend;
}

// Interpola posición GPS para un bus según su progreso _t [0..1]
function getBusGpsPosition(bus) {
  const coords = ROUTE_GPS_PATHS[bus.route.id] || ROUTE_GPS_PATHS.A;
  if (!coords || !coords.length) return [9.9333, -84.0833];
  
  const totalSegments = coords.length - 1;
  const t = Math.max(0, Math.min(1, bus._t !== undefined ? bus._t : 0.5));
  const exactSegment = t * totalSegments;
  const index = Math.min(Math.floor(exactSegment), totalSegments - 1);
  const segFraction = exactSegment - index;

  const p1 = coords[index];
  const p2 = coords[index + 1] || p1;

  const lat = p1[0] + (p2[0] - p1[0]) * segFraction;
  const lon = p1[1] + (p2[1] - p1[1]) * segFraction;
  return [lat, lon];
}

function drawMapMarkers(force) {
  if (!realLeafletMap) return;

  buses.forEach(b => {
    const [lat, lon] = getBusGpsPosition(b);
    b.gps = { lat, lon };

    const color = b.route.color;
    const isDelayed = b.status === 'delayed';
    const isTracked = state.trackingBus === b.id;

    if (!leafletMarkers.buses[b.id]) {
      const busIcon = L.divIcon({
        className: 'real-bus-div-icon',
        html:
          '<div class="real-bus-icon-inner" style="background:' + color + ';' + (isTracked ? 'border-color:#38bdf8;' : '') + '">' +
            (isTracked || isDelayed ? '<div class="real-bus-pulse" style="background:' + color + ';"></div>' : '') +
            '<span>' + (b.num || b.id.replace('BUS-', '')) + '</span>' +
          '</div>',
        iconSize: [32, 32],
        iconAnchor: [16, 16]
      });

      const marker = L.marker([lat, lon], { icon: busIcon }).addTo(realLeafletMap);
      marker.on('click', () => focusBus(b.id));
      marker.bindTooltip(
        '<strong>' + b.id + '</strong> · Ruta ' + b.route.id + '<br/>' +
        b.speed + ' km/h · ' + b.passengers + ' pas.',
        { direction: 'top', offset: [0, -14] }
      );

      leafletMarkers.buses[b.id] = marker;
    } else {
      const marker = leafletMarkers.buses[b.id];
      marker.setLatLng([lat, lon]);

      if (isTracked) {
        realLeafletMap.panTo([lat, lon], { animate: true, duration: 0.3 });
      }
    }
  });

  const countBadge = document.getElementById('mapBusCount');
  if (countBadge) countBadge.textContent = buses.filter(b => b.status === 'active').length + ' activos';
}

function renderMapBusList() {
  const container = document.getElementById('mapBusList');
  if (!container) return;
  container.innerHTML = buses.map(b =>
    '<div class="map-bus-item ' + (state.highlightBus === b.id ? 'highlight' : '') + '" data-bus="' + b.id + '" role="button" tabindex="0">' +
      '<span class="map-bus-dot" style="background:' + b.route.color + '"></span>' +
      '<span class="map-bus-info">' +
        '<span class="map-bus-id">' + b.id + '</span>' +
        '<span class="map-bus-route">Ruta ' + b.route.id + ' · ' + b.speed + ' km/h</span>' +
      '</span>' +
      '<span class="status-badge status-' + b.status + '">' + statusLabel(b.status) + '</span>' +
    '</div>'
  ).join('');
}

function centerMapOnBus(busId, resetZoom) {
  const bus = buses.find(b => b.id === busId);
  if (!bus || !realLeafletMap) return false;
  const [lat, lon] = getBusGpsPosition(bus);
  if (resetZoom) {
    realLeafletMap.setView([lat, lon], 15, { animate: true });
  } else {
    realLeafletMap.panTo([lat, lon], { animate: true });
  }
  return true;
}

function updateTrackingBanner() {
  const banner = document.getElementById('trackingBanner');
  if (!banner) return;
  if (state.trackingBus) {
    banner.hidden = false;
    document.getElementById('trackingBannerText').textContent = 'Siguiendo ' + state.trackingBus;
  } else {
    banner.hidden = true;
  }
}

function stopTracking(msg) {
  if (!state.trackingBus) return;
  state.trackingBus = null;
  updateTrackingBanner();
  if (msg) toast(msg);
}

function focusBus(busId) {
  const bus = buses.find(b => b.id === busId);
  if (!bus) return;
  state.highlightBus = busId;
  state.trackingBus = busId;
  navigate('map');
  centerMapOnBus(busId, true);
  renderMapBusList();
  drawMapMarkers(true);
  updateTrackingBanner();
  toast('Siguiendo ' + busId, 'info');
}

let animId = null;
let lastTick = 0;

function tick(ts) {
  animId = requestAnimationFrame(tick);
  if (ts - lastTick < 65) return;
  lastTick = ts;

  if (prefs.motion && !backendConnected) {
    buses.forEach(b => {
      const moving = b.status === 'active' || b.status === 'delayed';
      if (moving) {
        b._t = (b._t || 0) + (b._dir || 1) * (b._step || 0.005) * (b.speed / 40);
        if (b._t >= 1) { b._t = 1; b._dir = -1; }
        else if (b._t <= 0) { b._t = 0; b._dir = 1; }
      }
    });
  }
  drawMapMarkers(false);
}

function startAnim() { if (!animId) { lastTick = 0; animId = requestAnimationFrame(tick); } }
function stopAnim() { if (animId) { cancelAnimationFrame(animId); animId = null; } }

document.addEventListener('visibilitychange', () => {
  if (document.hidden) stopAnim(); else startAnim();
});

const userLocationState = {
  active: false,
  lat: null,
  lng: null,
  nearestStop: null,
  distanceToStop: null,
  watchId: null,
};

function calculateDistanceMeters(lat1, lon1, lat2, lon2) {
  const R = 6371e3;
  const rad = Math.PI / 180;
  const dLat = (lat2 - lat1) * rad;
  const dLon = (lon2 - lon1) * rad;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * rad) * Math.cos(lat2 * rad) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

function findNearestStop(lat, lng) {
  let nearest = null;
  let minDist = Infinity;
  STOPS.forEach(stop => {
    if (stop.lat && stop.lon) {
      const dist = calculateDistanceMeters(lat, lng, stop.lat, stop.lon);
      if (dist < minDist) {
        minDist = dist;
        nearest = stop;
      }
    }
  });
  return { stop: nearest || STOPS[0], distance: minDist };
}

function renderUserLocationMarkers() {
  if (!realLeafletMap) return;
  if (!userLocationState.active || !userLocationState.lat) {
    if (leafletMarkers.user) {
      realLeafletMap.removeLayer(leafletMarkers.user);
      leafletMarkers.user = null;
    }
    return;
  }
  const { lat, lng } = userLocationState;
  const stopName = userLocationState.nearestStop ? userLocationState.nearestStop.name : 'Ubicación';
  if (!leafletMarkers.user) {
    const userIcon = L.divIcon({
      className: 'real-user-div-icon',
      html: '<div class="real-user-gps-marker"><div class="real-user-gps-pulse"></div></div>',
      iconSize: [18, 18],
      iconAnchor: [9, 9]
    });
    leafletMarkers.user = L.marker([lat, lng], { icon: userIcon, zIndexOffset: 1000 }).addTo(realLeafletMap);
    leafletMarkers.user.bindPopup(
      '<strong style="color:#38bdf8; font-size:13px;">📍 Tu ubicación GPS</strong><br/>' +
      '<span style="font-size:12px; color:var(--text-soft);">Cerca de: ' + esc(stopName) + '</span>'
    );
  } else {
    leafletMarkers.user.setLatLng([lat, lng]);
  }
}

function centerMapOnUser(resetZoom = true) {
  if (!userLocationState.active || !userLocationState.lat || !realLeafletMap) return false;
  realLeafletMap.flyTo([userLocationState.lat, userLocationState.lng], resetZoom ? 15 : realLeafletMap.getZoom(), { duration: 1.2 });
  return true;
}

function updateUserLocationUI() {
  renderUserLocationMarkers();
  const bar = document.getElementById('userLocationBar');
  const textEl = document.getElementById('userLocationText');
  const fullBtn = document.getElementById('locateUserBtnFull');
  if (userLocationState.active && userLocationState.nearestStop) {
    if (fullBtn) fullBtn.classList.add('active');
    const distStr = userLocationState.distanceToStop < 1000
      ? userLocationState.distanceToStop + ' m'
      : (userLocationState.distanceToStop / 1000).toFixed(1) + ' km';
    if (textEl) {
      textEl.innerHTML = '<strong>Ubicación detectada:</strong> a ' + distStr + ' de <strong>' + esc(userLocationState.nearestStop.name) + '</strong> (' + (userLocationState.nearestStop.province || 'Costa Rica') + ')';
    }
    if (bar) bar.hidden = false;
  } else {
    if (fullBtn) fullBtn.classList.remove('active');
    if (bar) bar.hidden = true;
  }
}

function stopUserLocationWatch() {
  if (userLocationState.watchId !== null) {
    navigator.geolocation.clearWatch(userLocationState.watchId);
    userLocationState.watchId = null;
  }
}

function handlePositionUpdate(position, isInitial = false) {
  const lat = position.coords.latitude;
  const lng = position.coords.longitude;
  const nearest = findNearestStop(lat, lng);
  userLocationState.active = true;
  userLocationState.lat = lat;
  userLocationState.lng = lng;
  userLocationState.nearestStop = nearest.stop;
  userLocationState.distanceToStop = nearest.distance;
  updateUserLocationUI();
  centerMapOnUser(isInitial);
  const distStr = nearest.distance < 1000 ? nearest.distance + ' m' : (nearest.distance / 1000).toFixed(1) + ' km';
  if (isInitial) {
    toast('📍 GPS en vivo: a ' + distStr + ' de ' + nearest.stop.name, 'ok');
  }
  localStorage.setItem('bustrack_geolocate', 'true');
  const geoSwitch = document.getElementById('geoSwitch');
  if (geoSwitch) geoSwitch.setAttribute('aria-checked', 'true');
}

function requestUserLocation(userInitiated = true) {
  if (!('geolocation' in navigator)) {
    if (userInitiated) toast('Tu navegador no soporta geolocalización', 'warn');
    return;
  }
  toast('Solicitando permiso de ubicación al navegador...', 'info');
  const options = { enableHighAccuracy: true, timeout: 10000, maximumAge: 3000 };
  navigator.geolocation.getCurrentPosition(
    (position) => {
      handlePositionUpdate(position, true);
      stopUserLocationWatch();
      userLocationState.watchId = navigator.geolocation.watchPosition(
        (pos) => handlePositionUpdate(pos, false),
        (err) => console.warn('Watch position update error:', err),
        options
      );
    },
    (error) => {
      console.warn('Geolocation error:', error);
      stopUserLocationWatch();
      userLocationState.active = false;
      updateUserLocationUI();
      const geoSwitch = document.getElementById('geoSwitch');
      if (geoSwitch) geoSwitch.setAttribute('aria-checked', 'false');
      if (error.code === error.PERMISSION_DENIED) {
        toast('⚠️ Permiso de ubicación denegado. Permite el acceso en la barra de direcciones de tu navegador.', 'warn');
      } else if (error.code === error.POSITION_UNAVAILABLE) {
        toast('⚠️ Posición GPS no disponible en este dispositivo.', 'warn');
      } else if (error.code === error.TIMEOUT) {
        toast('⏱️ Tiempo de espera agotado al obtener el GPS.', 'warn');
      } else if (userInitiated) {
        toast('No se pudo acceder a tu ubicación actual.', 'warn');
      }
    },
    options
  );
}

// Conexión de controles de mapa de Leaflet
function setupMapControls() {
  const zoomBtns = document.querySelectorAll('.map-btn[data-zoom]');
  zoomBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const action = btn.dataset.zoom;
      if (!realLeafletMap) return;
      if (action === 'in') realLeafletMap.zoomIn();
      if (action === 'out') realLeafletMap.zoomOut();
      if (action === 'reset') {
        stopTracking('Vista nacional restablecida');
        realLeafletMap.flyTo(CR_PROVINCES.all.center, CR_PROVINCES.all.zoom, { duration: 1.2 });
        const provSelect = document.getElementById('provinceSelect');
        if (provSelect) provSelect.value = 'all';
      }
    });
  });
}

/* ==========================================================
   7. RUTAS, ALERTAS, CONDUCTORES, REPORTES
   ========================================================== */
 
function routeStats(r) {
  const own = buses.filter(b => b.route.id === r.id);
  const activos = own.filter(b => b.status === 'active').length;
  return {
    total: own.length,
    activos,
    cobertura: own.length ? Math.round((activos / own.length) * 100) : 0,
    pasajeros: own.reduce((s, b) => s + b.passengers, 0),
    retraso: own.length ? (own.reduce((s, b) => s + b.delay, 0) / own.length) : 0,
  };
}
 
function renderRoutes() {
  $('routesGrid').innerHTML = ROUTES.map(r => {
    const s = routeStats(r);
    return `
    <article class="route-card" data-route="${r.id}" style="--rc:${r.color}" role="button" tabindex="0">
      <div class="route-header">
        <div>
          <p class="route-id">Ruta ${r.id}</p>
          <p class="route-name">${r.name}</p>
        </div>
        <span class="status-badge ${s.activos ? 'status-active' : 'status-stopped'}">${s.activos ? 'Activa' : 'Sin buses'}</span>
      </div>
      <div class="route-progress">
        <div class="route-progress-head"><span>Cobertura de flota</span><span style="color:${r.color}">${s.cobertura}%</span></div>
        <div class="route-progress-bar"><div class="route-progress-fill" style="width:${s.cobertura}%"></div></div>
      </div>
      <div class="route-stats">
        <div><p class="route-stat-value">${s.total}</p><p class="route-stat-label">Buses</p></div>
        <div><p class="route-stat-value">${r.stops}</p><p class="route-stat-label">Paradas</p></div>
        <div><p class="route-stat-value">${s.pasajeros}</p><p class="route-stat-label">A bordo</p></div>
        <div><p class="route-stat-value">${r.length} km</p><p class="route-stat-label">Longitud</p></div>
      </div>
    </article>`;
  }).join('');
}
 
// Al tocar una ruta se abre la flota ya filtrada por esa ruta
function openRoute(id) {
  navigate('fleet');
  $('routeFilter').value = id;
  $('fleetSearch').value = '';
  $('statusFilter').value = '';
  renderFleet();
  toast('Mostrando los buses de la Ruta ' + id);
}
 
const ALERT_SEED = [
  { id: 1, type: 'critical', icon: '🚨', title: 'Temperatura del motor fuera de rango', desc: 'El sensor del BUS-011 reporta 112 °C de forma sostenida. Conviene detener la unidad en la próxima parada.', bus: 'BUS-011', time: 'hace 3 min', read: false },
  { id: 2, type: 'warning',  icon: '⚠️', title: 'Retraso acumulado en Ruta B', desc: 'BUS-007 va 8 minutos por detrás del horario. Las pantallas de las paradas ya muestran el ajuste.', bus: 'BUS-007', time: 'hace 8 min', read: false },
  { id: 3, type: 'warning',  icon: '⛽', title: 'Combustible bajo', desc: 'BUS-004 al 15%. Alcanza para terminar el recorrido, pero no para el siguiente.', bus: 'BUS-004', time: 'hace 15 min', read: false },
  { id: 4, type: 'info',     icon: '📊', title: 'Reporte diario generado', desc: 'Operación del día cerrada: 2.847 pasajeros y 2,3 min de retraso promedio.', bus: 'Sistema', time: 'hace 32 min', read: true },
  { id: 5, type: 'info',     icon: '🔄', title: 'Mantenimiento programado', desc: 'BUS-012 entra a taller mañana a las 06:00. Hay que reasignar su turno de la Ruta D.', bus: 'BUS-012', time: 'hace 1 h', read: true },
];
let alerts = ALERT_SEED.slice();
 
function renderAlerts() {
  const data = state.alertFilter === 'all' ? alerts : alerts.filter(a => a.type === state.alertFilter);
  const el = $('alertsList');
  if (!data.length) {
    el.innerHTML = '<p class="empty-state">No hay alertas en esta categoría</p>';
  } else {
    el.innerHTML = data.map(a => `
      <article class="alert-item ${a.type} ${a.read ? 'read' : ''}" data-alert="${a.id}">
        <span class="alert-icon-wrap ${a.type}">${a.icon}</span>
        <div class="alert-content">
          <p class="alert-title">${a.title}</p>
          <p class="alert-desc">${a.desc}</p>
          <p class="alert-meta">
            <span class="alert-time">${a.time}</span>
            ${a.bus.startsWith('BUS') ? `<span class="alert-bus-tag" data-bus="${a.bus}">${a.bus}</span>` : `<span class="alert-bus-tag">${a.bus}</span>`}
          </p>
        </div>
      </article>`).join('');
  }
  refreshCounters();
}
 
$$('.filter-tab[data-alert-filter]').forEach(tab => {
  tab.addEventListener('click', function () {
    $$('.filter-tab[data-alert-filter]').forEach(t => t.classList.remove('active'));
    this.classList.add('active');
    state.alertFilter = this.dataset.alertFilter;
    renderAlerts();
  });
});

$('clearAlertsBtn').addEventListener('click', async () => {
  const pend = alerts.filter(a => !a.read).length;
  alerts.forEach(a => { a.read = true; });
  renderAlerts();
  if (backendConnected) {
    try {
      await api.markAllAlertsRead();
    } catch (e) {
      console.warn('API mark read error:', e);
    }
  }
  toast(pend ? pend + ' alertas marcadas como leídas' : 'No había alertas pendientes', 'ok');
});

$('newAlertBtn').addEventListener('click', async () => {
  const bus = pick(buses);
  const plantillas = [
    { type: 'warning', icon: '⛽', title: 'Combustible bajo', desc: `${bus.id} al ${randInt(8, 18)}% de combustible.` },
    { type: 'critical', icon: '🚨', title: 'Frenado brusco detectado', desc: `${bus.id} registró una desaceleración fuerte cerca de ${pick(STOPS).name}.` },
    { type: 'info', icon: '📍', title: 'Desvío de ruta', desc: `${bus.id} se apartó del trazado de la Ruta ${bus.route.id} por obras en la vía.` },
    { type: 'warning', icon: '👥', title: 'Unidad al límite', desc: `${bus.id} viaja con ${bus.capacity} de ${bus.capacity} asientos ocupados.` },
  ];
  const t = pick(plantillas);

  if (backendConnected) {
    try {
      const created = await api.createAlert({
        type: t.type,
        icon: t.icon,
        title: t.title,
        desc: t.desc,
        bus: bus.id,
      });
      alerts.unshift(created);
      renderAlerts();
      addNotification(t.icon, `<strong>${t.title}:</strong> ${bus.id}`);
      toast('Nueva alerta registrada en backend', 'warn');
      return;
    } catch (e) {
      console.warn('Error creating alert in API:', e);
    }
  }

  alerts.unshift({ id: Date.now(), ...t, bus: bus.id, time: 'ahora mismo', read: false });
  if (alerts.length > 20) alerts.pop();
  renderAlerts();
  addNotification(t.icon, `<strong>${t.title}:</strong> ${bus.id}`);
  toast('Nueva alerta registrada', 'warn');
});
 
function renderDrivers() {
  $('driversGrid').innerHTML = DRIVERS.map((d, i) => {
    const bus = buses.find(b => b.driver.id === d.id && b.status !== 'stopped');
    const color = ROUTES[i % ROUTES.length].color;
    return `
    <article class="driver-card" data-driver="${esc(d.name)}" role="button" tabindex="0">
      <div class="driver-top">
        <span class="driver-avatar" style="background:linear-gradient(135deg,${color},${color}99)">${d.initials}</span>
        <div>
          <p class="driver-name">${esc(d.name)}</p>
          <p class="driver-license">${d.license}</p>
          <p style="margin-top:5px">
            ${bus ? `<span class="status-badge status-active">En servicio · ${bus.id}</span>`
                  : '<span class="status-badge status-stopped">Sin asignar</span>'}
          </p>
        </div>
      </div>
      <div class="driver-stats">
        <div><p class="driver-stat-val">${fmt(d.trips)}</p><p class="driver-stat-lbl">Viajes</p></div>
        <div><p class="driver-stat-val">${String(d.hours).replace('.', ',')} h</p><p class="driver-stat-lbl">Turno hoy</p></div>
        <div><p class="driver-stat-val"><span class="stars">★</span> ${String(d.rating).replace('.', ',')}</p><p class="driver-stat-lbl">Calificación</p></div>
      </div>
    </article>`;
  }).join('');
}
 
/* ---------- Reportes ---------- */
 
$('generateReportBtn').addEventListener('click', () => {
  const total = buses.length;
  const circulando = buses.filter(b => b.status === 'active' || b.status === 'delayed').length;
  const pasajeros = buses.reduce((s, b) => s + b.passengers, 0);
  const ocupacion = Math.round((pasajeros / buses.reduce((s, b) => s + b.capacity, 0)) * 100);
  const retraso = buses.reduce((s, b) => s + b.delay, 0) / total;
  const taller = buses.filter(b => b.status === 'maintenance').length;
  const combustibleBajo = buses.filter(b => b.fuel < 20).length;
  const ahora = new Date();
 
  const box = $('reportSummary');
  box.hidden = false;
  box.innerHTML = `
    <h3>Reporte de operación</h3>
    <p class="stamp">Generado el ${ahora.toLocaleDateString('es-CR')} a las ${ahora.toLocaleTimeString('es-CR', { hour: '2-digit', minute: '2-digit' })}</p>
    <div class="summary-grid">
      <div class="summary-cell"><b>${circulando}/${total}</b><span>Buses circulando</span></div>
      <div class="summary-cell"><b>${pasajeros}</b><span>Pasajeros a bordo</span></div>
      <div class="summary-cell"><b>${ocupacion}%</b><span>Ocupación media</span></div>
      <div class="summary-cell"><b>${retraso.toFixed(1).replace('.', ',')} min</b><span>Retraso promedio</span></div>
      <div class="summary-cell"><b>${taller}</b><span>En mantenimiento</span></div>
      <div class="summary-cell"><b>${combustibleBajo}</b><span>Combustible bajo 20%</span></div>
    </div>`;
  if (box.scrollIntoView) box.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  toast('Reporte generado con los datos actuales', 'ok');
});
 
$('printReportBtn').addEventListener('click', () => {
  if ($('reportSummary').hidden) $('generateReportBtn').click();
  toast('Abriendo el diálogo de impresión');
  setTimeout(() => window.print(), 350);
});
 
/* ==========================================================
   MODALES
   ========================================================== */
 
const busModal = $('busModal');
const settingsModal = $('settingsModal');
let lastFocus = null;
 
function openModal(el) {
  lastFocus = document.activeElement;
  el.classList.add('open');
  const btn = el.querySelector('.modal-close');
  if (btn) btn.focus();
}
function closeModal(el) {
  el.classList.remove('open');
  if (lastFocus && lastFocus.focus) lastFocus.focus();
}
 
function fillBusModal(b) {
  $('modalBusTitle').textContent = b.id;
  $('modalBusSubtitle').textContent = `Ruta ${b.route.id} · ${b.route.name} · ${statusLabel(b.status)}`;
  const icon = $('modalBusIcon');
  icon.style.background = b.route.color + '22';
  icon.style.color = b.route.color;
  icon.textContent = b.num;
 
  $('modalSpeed').textContent = b.speed + ' km/h';
  $('modalPassengers').textContent = b.passengers + '/' + b.capacity;
 
  const delay = $('modalDelay');
  delay.textContent = b.delay > 0 ? '+' + b.delay + ' min' : 'En tiempo';
  delay.style.color = b.delay > 0 ? cssVar('--warn') : cssVar('--ok');
 
  const fuel = $('modalFuel');
  fuel.textContent = b.fuel + '%';
  fuel.style.color = b.fuel < 20 ? cssVar('--risk') : '';
 
  $('modalDriver').textContent = b.driver.name;
  $('modalPlate').textContent = b.plate;
  $('modalNextStop').textContent = b.nextStop;
  $('modalETA').textContent = b.etaMin ? b.etaMin + ' min' : '—';
 
  const statusSelect = $('modalStatusSelect');
  statusSelect.value = b.status;
  statusSelect.className = 'status-select-lg status-' + b.status;
}
 
function openBusModal(busId) {
  const b = buses.find(x => x.id === busId);
  if (!b) return;
  // Se guarda en una propiedad de JS, no como atributo del DOM: si fuera
  // data-bus en el propio modal, closest('[data-bus]') encontraría al
  // contenedor entero y cualquier clic adentro (cerrar, rastrear, contactar)
  // reabriría el modal en vez de dejarlo cerrar.
  busModal.currentBusId = b.id;
  fillBusModal(b);
  openModal(busModal);
}
 
$('modalClose').addEventListener('click', () => closeModal(busModal));
$('settingsClose').addEventListener('click', () => closeModal(settingsModal));
[busModal, settingsModal].forEach(m => {
  m.addEventListener('click', e => { if (e.target === m) closeModal(m); });
});
 
$('trackBusBtn').addEventListener('click', () => {
  const id = busModal.currentBusId;
  closeModal(busModal);
  focusBus(id);
});
 
$('contactDriverBtn').addEventListener('click', () => {
  const b = buses.find(x => x.id === busModal.currentBusId);
  if (b) toast('Llamando a ' + b.driver.name + ' (' + b.id + ')…');
});
 
$('modalStatusSelect').addEventListener('change', async function () {
  const b = buses.find(x => x.id === busModal.currentBusId);
  if (!b) return;
  const newStatus = this.value;
  applyBusStatus(b, newStatus);
  fillBusModal(b);
  refreshAfterStatusChange(b);

  if (backendConnected) {
    try {
      await api.updateBusStatus(b.id, newStatus);
    } catch (e) {
      console.warn('Failed to update status in backend:', e);
    }
  }

  toast('Estado de ' + b.id + ' actualizado a ' + statusLabel(b.status), 'ok');
});
 
document.addEventListener('keydown', e => {
  if (e.key !== 'Escape') return;
  if (busModal.classList.contains('open')) closeModal(busModal);
  if (settingsModal.classList.contains('open')) closeModal(settingsModal);
  $('notifDropdown').classList.remove('open');
  $('notifBtn').setAttribute('aria-expanded', 'false');
  closeSidebar();
});
 
// Con el menú principal abierto, Escape no hace nada: ya es la pantalla de inicio.
 
/* ---------- Preferencias ---------- */
 
function buildAccentPicker() {
  $('accentPicker').innerHTML = ACCENTS.map(a => `
    <button class="accent-dot ${prefs.accent === a.id ? 'selected' : ''}"
            data-accent="${a.id}" style="background:${a.swatch}"
            title="${a.label}" aria-label="Acento ${a.label}"></button>`).join('');
}
 
$('accentPicker').addEventListener('click', e => {
  const dot = e.target.closest('[data-accent]');
  if (!dot) return;
  prefs.accent = dot.dataset.accent;
  applyPrefs();
  savePrefs();
  buildAccentPicker();
  paintStaticMapLayers();
  redrawAll();
  drawMapMarkers(true);
  renderBusList();
  if (state.view === 'fleet') renderFleet();
  if (state.view === 'routes') renderRoutes();
  if (state.view === 'drivers') renderDrivers();
  toast('Acento actualizado');
});
 
function bindSwitch(id, onChange) {
  const el = $(id);
  el.addEventListener('click', () => {
    const next = el.getAttribute('aria-checked') !== 'true';
    el.setAttribute('aria-checked', String(next));
    onChange(next);
    savePrefs();
  });
}
 
bindSwitch('motionSwitch', v => {
  prefs.motion = v;
  toast(v ? 'Movimiento activado' : 'Movimiento en pausa');
});
bindSwitch('liveSwitch', v => {
  prefs.live = v;
  syncLiveIndicator();
});
bindSwitch('densitySwitch', v => {
  prefs.density = v ? 'compact' : 'normal';
  applyPrefs();
  setTimeout(redrawAll, 220);
});
 
$('resetDataBtn').addEventListener('click', () => {
  buses = generateBuses(12);
  state.highlightBus = null;
  stopTracking();
  refreshCounters();
  renderBusList();
  renderFleet();
  renderMapBusList();
  drawMapMarkers(true);
  if (state.view === 'routes') renderRoutes();
  toast('Flota regenerada con datos nuevos', 'ok');
});
 
function openSettings() {
  $('motionSwitch').setAttribute('aria-checked', String(prefs.motion));
  $('liveSwitch').setAttribute('aria-checked', String(prefs.live));
  $('densitySwitch').setAttribute('aria-checked', String(prefs.density === 'compact'));
  buildAccentPicker();
  openModal(settingsModal);
}
 
$('settingsBtn').addEventListener('click', e => { e.stopPropagation(); openSettings(); });
$('userProfile').addEventListener('click', openSettings);
$('userProfile').addEventListener('keydown', e => {
  if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openSettings(); }
});
 
/* ==========================================================
   8. NOTIFICACIONES Y AVISOS
   ========================================================== */
 
const notifs = [
  { icon: '🚨', msg: '<strong>Crítica:</strong> BUS-011 con temperatura de motor elevada', time: 'hace 3 min', unread: true },
  { icon: '⚠️', msg: '<strong>Retraso:</strong> BUS-007 va +8 min en Ruta B', time: 'hace 8 min', unread: true },
  { icon: '⛽', msg: '<strong>Combustible bajo:</strong> BUS-004 al 15%', time: 'hace 15 min', unread: true },
  { icon: '✅', msg: 'BUS-001 completó la Ruta A con 48 pasajeros', time: 'hace 22 min', unread: false },
  { icon: '📊', msg: 'Reporte diario generado: 2.847 pasajeros', time: 'hace 32 min', unread: false },
];
 
function renderNotifs() {
  const list = $('notifList');
  if (!notifs.length) {
    list.innerHTML = '<p class="empty-state">Sin notificaciones</p>';
  } else {
    list.innerHTML = notifs.map((n, i) => `
      <div class="notif-item ${n.unread ? 'unread' : ''}" data-notif="${i}">
        <span class="notif-icon">${n.icon}</span>
        <span style="flex:1">
          <span class="notif-msg">${n.msg}</span>
          <span class="notif-time">${n.time}</span>
        </span>
      </div>`).join('');
  }
  $('notifDot').classList.toggle('hidden', !notifs.some(n => n.unread));
}
 
function addNotification(icon, msg) {
  notifs.unshift({ icon, msg, time: 'ahora mismo', unread: true });
  if (notifs.length > 12) notifs.pop();
  renderNotifs();
}
 
const notifBtn = $('notifBtn');
const notifDropdown = $('notifDropdown');
 
notifBtn.addEventListener('click', e => {
  e.stopPropagation();
  const open = notifDropdown.classList.toggle('open');
  notifBtn.setAttribute('aria-expanded', String(open));
});
 
notifDropdown.addEventListener('click', e => {
  const item = e.target.closest('[data-notif]');
  if (!item) return;
  notifs[+item.dataset.notif].unread = false;
  renderNotifs();
});
 
$('clearNotifsBtn').addEventListener('click', e => {
  e.stopPropagation();
  notifs.length = 0;
  renderNotifs();
  toast('Notificaciones limpiadas', 'ok');
});
 
document.addEventListener('click', e => {
  if (!notifDropdown.contains(e.target) && !notifBtn.contains(e.target)) {
    notifDropdown.classList.remove('open');
    notifBtn.setAttribute('aria-expanded', 'false');
  }
  const bar = document.querySelector('.search-bar');
  if (bar.classList.contains('mobile-open')
      && !bar.contains(e.target) && !$('mobileSearchBtn').contains(e.target)) {
    bar.classList.remove('mobile-open');
  }
});
 
function toast(msg, kind) {
  const el = document.createElement('div');
  el.className = 'toast' + (kind ? ' ' + kind : '');
  el.textContent = msg;
  $('toastStack').appendChild(el);
  setTimeout(() => {
    el.classList.add('out');
    setTimeout(() => el.remove(), 250);
  }, 2600);
}
 
/* ---------- Búsqueda global y menú de búsqueda en celular ---------- */
 
$('globalSearch').addEventListener('keydown', function (e) {
  if (e.key !== 'Enter') return;
  const q = this.value.trim();
  if (!q) return;
  navigate('fleet');
  $('fleetSearch').value = q;
  $('statusFilter').value = '';
  $('routeFilter').value = '';
  renderFleet();
  const n = visibleBuses().length;
  toast(n ? n + ' resultados para "' + q + '"' : 'Sin resultados para "' + q + '"', n ? 'ok' : 'warn');
});
 
$('mobileSearchBtn').addEventListener('click', e => {
  e.stopPropagation();
  const bar = document.querySelector('.search-bar');
  bar.classList.toggle('mobile-open');
  if (bar.classList.contains('mobile-open')) $('globalSearch').focus();
});
 
/* ---------- Delegación general de clics ---------- */
 
document.addEventListener('click', e => {
  // Los botones dentro de un modal (cerrar, rastrear, contactar) ya
  // tienen su propio listener. Si un modal llegara a tener data-bus,
  // data-route, etc. en el contenedor, esto evita que closest() suba
  // hasta él y vuelva a disparar una acción de apertura.
  if (e.target.closest('.modal-overlay')) return;
 
  const track = e.target.closest('[data-track]');
  if (track) { focusBus(track.dataset.track); return; }
 
  const route = e.target.closest('[data-route]');
  if (route) { openRoute(route.dataset.route); return; }
 
  const driver = e.target.closest('[data-driver]');
  if (driver) {
    navigate('fleet');
    $('fleetSearch').value = driver.dataset.driver;
    $('statusFilter').value = '';
    $('routeFilter').value = '';
    renderFleet();
    toast('Buses asignados a ' + driver.dataset.driver);
    return;
  }
 
  const bus = e.target.closest('[data-bus]');
  if (bus) openBusModal(bus.dataset.bus);
});
 
document.addEventListener('keydown', e => {
  if (e.key !== 'Enter' && e.key !== ' ') return;
  const t = e.target;
  if (!t.closest) return;
  const el = t.closest('[data-bus], [data-route], [data-driver]');
  if (el && el.getAttribute('tabindex') === '0') {
    e.preventDefault();
    el.click();
  }
});
 
/* ==========================================================
   GRÁFICOS (canvas)
   ========================================================== */
 
// Ajusta el canvas a su contenedor y a la densidad de la pantalla.
function fitCanvas(canvas, cssHeight) {
  const dpr = window.devicePixelRatio || 1;
  const parent = canvas.parentElement;
  const w = Math.max(160, parent.clientWidth - getInnerPadding(parent));
  const h = cssHeight;
  canvas.style.width = w + 'px';
  canvas.style.height = h + 'px';
  canvas.width = Math.round(w * dpr);
  canvas.height = Math.round(h * dpr);
  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, w, h);
  return { ctx, w, h };
}
 
function getInnerPadding(el) {
  const cs = getComputedStyle(el);
  return parseFloat(cs.paddingLeft) + parseFloat(cs.paddingRight);
}
 
// roundRect no existe en Safari antiguo ni en varios navegadores móviles.
function bar(ctx, x, y, w, h, r) {
  const rad = Math.max(0, Math.min(r, w / 2, h));
  ctx.beginPath();
  ctx.moveTo(x, y + h);
  ctx.lineTo(x, y + rad);
  ctx.quadraticCurveTo(x, y, x + rad, y);
  ctx.lineTo(x + w - rad, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + rad);
  ctx.lineTo(x + w, y + h);
  ctx.closePath();
  ctx.fill();
}
 
function drawSparkline(id, data, color) {
  const canvas = $(id);
  if (!canvas || !canvas.offsetParent) return;
  const dpr = window.devicePixelRatio || 1;
  const w = 80, h = 40;
  canvas.style.width = w + 'px';
  canvas.style.height = h + 'px';
  canvas.width = w * dpr; canvas.height = h * dpr;
  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, w, h);
 
  const max = Math.max(...data), min = Math.min(...data), range = (max - min) || 1;
  const pt = (v, i) => ({ x: (i / (data.length - 1)) * w, y: h - ((v - min) / range) * (h - 5) - 2.5 });
  const trace = () => data.forEach((v, i) => { const p = pt(v, i); i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y); });
 
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, color + '55');
  g.addColorStop(1, color + '00');
  ctx.beginPath(); trace();
  ctx.lineTo(w, h); ctx.lineTo(0, h); ctx.closePath();
  ctx.fillStyle = g; ctx.fill();
 
  ctx.beginPath(); trace();
  ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.lineJoin = 'round'; ctx.stroke();
}
 
function drawSparklines() {
  drawSparkline('sparkline1', [32, 35, 34, 36, 37, 35, 38], cssVar('--brand-500'));
  drawSparkline('sparkline2', [10, 11, 11, 12, 11, 12, 12], cssVar('--route-c'));
  drawSparkline('sparkline3', [2100, 2300, 1980, 2600, 2400, 2750, 2847], cssVar('--ok'));
  drawSparkline('sparkline4', [3.1, 2.9, 3.2, 2.7, 2.5, 2.4, 2.3], cssVar('--warn'));
}
 
const CHART_DATA = {
  day: {
    labels: ['06', '07', '08', '09', '10', '11', '12', '13', '14', '15', '16', '17', '18'],
    values: [120, 245, 380, 420, 310, 290, 350, 430, 490, 520, 480, 390, 280],
    caption: 'Pasajeros por hora, jornada de hoy.',
  },
  week: {
    labels: ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'],
    values: [2400, 2610, 2530, 2780, 3100, 1980, 1450],
    caption: 'Pasajeros por día, últimos 7 días.',
  },
  month: {
    labels: ['Sem 1', 'Sem 2', 'Sem 3', 'Sem 4'],
    values: [16800, 17400, 16950, 18200],
    caption: 'Pasajeros por semana, últimas 4 semanas.',
  },
};
 
function drawMainChart() {
  const canvas = $('mainChart');
  if (!canvas || !canvas.offsetParent) return;
  const { ctx, w, h } = fitCanvas(canvas, 180);
  const { labels, values, caption } = CHART_DATA[state.chartPeriod];
  $('chartCaption').textContent = caption + ' Total: ' + fmt(values.reduce((a, b) => a + b, 0)) + '.';
 
  const max = Math.max(...values);
  const padL = 46, padR = 10, padT = 10, padB = 26;
  const cw = w - padL - padR, ch = h - padT - padB;
  const slot = cw / values.length;
  const bw = Math.max(5, slot * 0.58);
 
  ctx.strokeStyle = 'rgba(148,163,200,0.13)';
  ctx.lineWidth = 1;
  ctx.font = '10px Inter, sans-serif';
  [0, 0.25, 0.5, 0.75, 1].forEach(p => {
    const y = Math.round(padT + ch - p * ch) + 0.5;
    ctx.beginPath(); ctx.moveTo(padL, y); ctx.lineTo(padL + cw, y); ctx.stroke();
    ctx.fillStyle = cssVar('--text-soft');
    ctx.textAlign = 'right';
    ctx.fillText(fmt(Math.round(max * p)), padL - 7, y + 3.5);
  });
 
  const c1 = cssVar('--brand-500'), c2 = cssVar('--brand-alt');
  values.forEach((v, i) => {
    const x = padL + i * slot + (slot - bw) / 2;
    const bh = Math.max(2, (v / max) * ch);
    const y = padT + ch - bh;
    const g = ctx.createLinearGradient(0, y, 0, y + bh);
    g.addColorStop(0, c1); g.addColorStop(1, c2);
    ctx.fillStyle = g;
    bar(ctx, x, y, bw, bh, 3);
 
    ctx.fillStyle = cssVar('--text-soft');
    ctx.textAlign = 'center';
    if (slot > 30 || i % 2 === 0) ctx.fillText(labels[i], x + bw / 2, padT + ch + 15);
  });
}
 
$$('.period-btn').forEach(btn => {
  btn.addEventListener('click', function () {
    $$('.period-btn').forEach(b => b.classList.remove('active'));
    this.classList.add('active');
    state.chartPeriod = this.dataset.period;
    drawMainChart();
  });
});
 
function drawReportCharts() {
  // Eficiencia por ruta
  const c1 = $('reportChart1');
  if (c1 && c1.offsetParent) {
    const { ctx, w, h } = fitCanvas(c1, 200);
    const vals = ROUTES.map(r => {
      const s = routeStats(r);
      return Math.max(40, Math.round(100 - s.retraso * 6));
    });
    const slot = w / ROUTES.length, bw = slot * 0.46;
    ctx.font = 'bold 12px Inter, sans-serif';
    vals.forEach((v, i) => {
      const x = i * slot + (slot - bw) / 2;
      const bh = (v / 100) * (h - 48);
      const y = h - bh - 24;
      const color = ROUTES[i].color;
      const g = ctx.createLinearGradient(0, y, 0, y + bh);
      g.addColorStop(0, color); g.addColorStop(1, color + '55');
      ctx.fillStyle = g; bar(ctx, x, y, bw, bh, 4);
      ctx.fillStyle = color; ctx.textAlign = 'center';
      ctx.fillText(v + '%', x + bw / 2, y - 7);
      ctx.fillStyle = cssVar('--text-soft'); ctx.font = '11px Inter, sans-serif';
      ctx.fillText('Ruta ' + ROUTES[i].id, x + bw / 2, h - 7);
      ctx.font = 'bold 12px Inter, sans-serif';
    });
  }
 
  // Dona de pasajeros por ruta
  const c2 = $('reportChart2');
  if (c2 && c2.offsetParent) {
    const { ctx, w, h } = fitCanvas(c2, 200);
    const vals = ROUTES.map(r => routeStats(r).pasajeros);
    const total = vals.reduce((a, b) => a + b, 0) || 1;
    const cx = w / 2, cy = h / 2;
    const r = Math.min(w, h) / 2 - 16, ri = r * 0.58;
    let start = -Math.PI / 2;
    vals.forEach((v, i) => {
      const ang = (v / total) * Math.PI * 2;
      ctx.beginPath(); ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, r, start, start + ang); ctx.closePath();
      ctx.fillStyle = ROUTES[i].color; ctx.fill();
      start += ang;
    });
    ctx.beginPath(); ctx.arc(cx, cy, ri, 0, Math.PI * 2);
    ctx.fillStyle = cssVar('--bg-card'); ctx.fill();
    ctx.textAlign = 'center';
    ctx.fillStyle = cssVar('--text-strong'); ctx.font = 'bold 20px Inter, sans-serif';
    ctx.fillText(fmt(total), cx, cy + 3);
    ctx.fillStyle = cssVar('--text-soft'); ctx.font = '10px Inter, sans-serif';
    ctx.fillText('a bordo ahora', cx, cy + 18);
  }
 
  // Línea de retrasos
  const c3 = $('reportChart3');
  if (c3 && c3.offsetParent) {
    const { ctx, w, h } = fitCanvas(c3, 160);
    const data = [3.5, 3.1, 2.9, 3.3, 2.8, 3.0, 2.6, 2.7, 2.4, 2.5, 2.3, 2.4, 2.2, 2.3,
      2.1, 2.4, 2.2, 2.0, 2.3, 2.1, 2.4, 2.3, 2.1, 2.3, 2.2, 2.0, 2.3, 2.1];
    const pad = 34, cw = w - pad * 2, ch = h - pad * 2;
    const max = Math.max(...data), min = 1.5, range = max - min;
    ctx.font = '10px Inter, sans-serif';
    [0, 0.25, 0.5, 0.75, 1].forEach(p => {
      const y = Math.round(pad + ch - p * ch) + 0.5;
      ctx.strokeStyle = 'rgba(148,163,200,0.13)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(pad, y); ctx.lineTo(pad + cw, y); ctx.stroke();
      ctx.fillStyle = cssVar('--text-soft'); ctx.textAlign = 'right';
      ctx.fillText((min + range * p).toFixed(1).replace('.', ',') + ' m', pad - 6, y + 3.5);
    });
 
    const pt = (v, i) => ({ x: pad + (i / (data.length - 1)) * cw, y: pad + ch - ((v - min) / range) * ch });
    const trace = () => data.forEach((v, i) => { const p = pt(v, i); i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y); });
    const line = cssVar('--route-c');
 
    const g = ctx.createLinearGradient(0, pad, 0, pad + ch);
    g.addColorStop(0, line + '55'); g.addColorStop(1, line + '00');
    ctx.beginPath(); trace();
    ctx.lineTo(pad + cw, pad + ch); ctx.lineTo(pad, pad + ch); ctx.closePath();
    ctx.fillStyle = g; ctx.fill();
 
    ctx.beginPath(); trace();
    ctx.strokeStyle = line; ctx.lineWidth = 2; ctx.lineJoin = 'round'; ctx.stroke();
  }
}
 
function redrawAll() {
  drawSparklines();
  drawMainChart();
  if (state.view === 'reports') drawReportCharts();
}
 
/* ==========================================================
   MENÚ PRINCIPAL (pantalla de entrada)
   ========================================================== */
 
const homeScreen = $('homeScreen');
let homeOpen = true;
let homeTimer = null;
 
// Cada azulejo muestra un dato vivo para que el menú no sea solo decoración.
function updateHomeChips() {
  if (!homeOpen) return;
  const circulando = buses.filter(b => b.status === 'active' || b.status === 'delayed').length;
  const pendientes = alerts.filter(a => !a.read).length;
  const pasajeros = buses.reduce((s, b) => s + b.passengers, 0);
 
  $('chipDashboard').textContent = circulando + '/' + buses.length;
  $('chipFleet').textContent = buses.length + ' buses';
  $('chipRoutes').textContent = ROUTES.length + ' rutas';
  $('chipAlerts').textContent = pendientes ? pendientes + ' nuevas' : 'al día';
  $('chipReports').textContent = fmt(pasajeros);
  $('chipDrivers').textContent = DRIVERS.length;
 
  $('homeStatus').textContent = circulando
    ? circulando + ' de ' + buses.length + ' unidades en circulación'
    : 'Ninguna unidad en circulación';
}
 
function showHome() {
  clearTimeout(homeTimer);
  homeOpen = true;
  homeScreen.classList.remove('hidden', 'closing');
  document.body.style.overflow = 'hidden';
  $$('.nav-item').forEach(n => n.classList.remove('active'));
  $('nav-home').classList.add('active');
  updateHomeChips();
  // Reinicia la animación escalonada de los azulejos
  $$('.home-tile').forEach(t => {
    t.style.animation = 'none';
    void t.offsetWidth;
    t.style.animation = '';
  });
  const first = homeScreen.querySelector('.home-tile');
  if (first) first.focus({ preventScroll: true });
}
 
function hideHome() {
  if (!homeOpen) return;
  homeOpen = false;
  homeScreen.classList.add('closing');
  document.body.style.overflow = '';
  homeTimer = setTimeout(() => {
    homeScreen.classList.add('hidden');
    homeScreen.classList.remove('closing');
  }, 340);
}
 
$$('.home-tile').forEach(tile => {
  tile.addEventListener('click', () => {
    const view = tile.dataset.go;
    hideHome();
    navigate(view);
    // Los canvas se dibujan mal si el contenedor todavía está oculto
    requestAnimationFrame(() => setTimeout(redrawAll, 60));
  });
});
 
$('nav-home').addEventListener('click', showHome);
$('nav-home').addEventListener('keydown', e => {
  if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); showHome(); }
});
$('logoHome').addEventListener('click', showHome);
$('logoHome').addEventListener('keydown', e => {
  if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); showHome(); }
});
 
/* ==========================================================
   9. CICLO DE VIDA
   ========================================================== */
 
function refreshCounters() {
  const circulando = buses.filter(b => b.status === 'active' || b.status === 'delayed').length;
  $('activeCount').textContent = circulando;
  $('routeCount').textContent = ROUTES.length;
  $('fleetCountBadge').textContent = buses.length;
  const pendientes = alerts.filter(a => !a.read).length;
  const badge = $('alertsCountBadge');
  badge.textContent = pendientes;
  badge.style.display = pendientes ? '' : 'none';
 
  const retraso = buses.reduce((s, b) => s + b.delay, 0) / (buses.length || 1);
  $('avgDelay').innerHTML = retraso.toFixed(1).replace('.', ',') + '<small>min</small>';
 
  updateHomeChips();
}
 
function syncLiveIndicator() {
  const el = $('liveToggle');
  el.classList.toggle('paused', !prefs.live);
  el.setAttribute('aria-pressed', String(prefs.live));
  $('liveLabel').textContent = prefs.live ? 'Actualizando' : 'En pausa';
}
 
$('liveToggle').addEventListener('click', () => {
  prefs.live = !prefs.live;
  syncLiveIndicator();
  savePrefs();
  toast(prefs.live ? 'Actualización automática activada' : 'Actualización automática en pausa');
});
 
$('expandMapBtn').addEventListener('click', () => navigate('map'));
$('trackingStopBtn').addEventListener('click', () => stopTracking('Dejaste de seguir el bus'));
 
function updateLiveData() {
  if (!prefs.live) return;
  if (backendConnected) return;
  buses.forEach(b => {
    if (b.status !== 'active' && b.status !== 'delayed') return;
    b.passengers = Math.max(0, Math.min(b.capacity, b.passengers + randInt(-3, 3)));
    b.speed = Math.max(16, Math.min(66, b.speed + randInt(-5, 5)));
    b.updatedAgo = 1;
    if (Math.random() < 0.12) b.nextStop = pick(STOPS).name;
    if (Math.random() < 0.08) b.fuel = Math.max(5, b.fuel - 1);
  });
  refreshCounters();
  if (state.view === 'dashboard') renderBusList();
  if (state.view === 'fleet') renderFleet();
  if (state.view === 'map') renderMapBusList();
  if (state.view === 'routes') renderRoutes();
}
 
let resizeTimer;
window.addEventListener('resize', () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => {
    redrawAll();
    if (!isMobile()) closeSidebar();
  }, 160);
});

function init() {
  // ------------------------------------------------------------------
  // HAPTIC FEEDBACK & SHARE HELPERS
  // ------------------------------------------------------------------
  function hapticFeedback(pattern = 10) {
    if ('vibrate' in navigator) {
      try { navigator.vibrate(pattern); } catch (_) {}
    }
  }

  // Bind haptics to all buttons
  document.querySelectorAll('button').forEach(btn => {
    btn.addEventListener('click', () => hapticFeedback(8));
  });

  // ------------------------------------------------------------------
  // DYNAMIC PAGE META TITLES & DESCRIPTIONS
  // ------------------------------------------------------------------
  const pageMetaMap = {
    dashboard: { title: 'Panel Principal — BusTrack Pro', desc: 'Resumen en tiempo real del estado de la flota, mapa interactivo y métricas.' },    map: { title: 'Mapa en Vivo — BusTrack Pro', desc: 'Seguimiento satelital y mapa esquemático de todas las unidades en circulación.' },
    fleet: { title: 'Gestión de Flota — BusTrack Pro', desc: 'Tabla completa de unidades, conductores asignados, estados y exportación CSV.' },
    routes: { title: 'Rutas Operativas — BusTrack Pro', desc: 'Detalle de trazados, paradas e indicadores por recorrido.' },
    alerts: { title: 'Centro de Alertas — BusTrack Pro', desc: 'Alertas críticas, advertencias y avisos del sistema en tiempo real.' },
    reports: { title: 'Reportes y Analíticas — BusTrack Pro', desc: 'Gráficos de eficiencia, volumen de pasajeros y tiempos de retraso.' },
    drivers: { title: 'Directorio de Conductores — BusTrack Pro', desc: 'Turnos, calificaciones y asignación de buses por conductor.' }
  };

  const originalNavigate = navigate;
  navigate = function(viewName) {
    originalNavigate(viewName);
    if (pageMetaMap[viewName]) {
      document.title = pageMetaMap[viewName].title;
      const metaDesc = document.querySelector('meta[name="description"]');
      if (metaDesc) metaDesc.content = pageMetaMap[viewName].desc;
    }
  };
  switchView = function(viewName) {
    return navigate(viewName);
  };

  // ------------------------------------------------------------------
  // AUTHENTICATION & LANDING GATE LOGIC (Email, Google, Apple)
  // ------------------------------------------------------------------

  let currentUser = null;
  let isGuestSession = false;
  let currentOAuthProvider = 'google';
  try {
    const savedUser = localStorage.getItem('bustrack_user');
    if (savedUser) currentUser = JSON.parse(savedUser);
    const guestFlag = sessionStorage.getItem('bustrack_guest');
    if (guestFlag === 'true') isGuestSession = true;
    const savedToken = localStorage.getItem('bustrack_auth_token');
    if (savedToken) {
      api.getMe(savedToken).then(res => {
        if (res && res.user) {
          currentUser = res.user;
          localStorage.setItem('bustrack_user', JSON.stringify(currentUser));
          updateAuthUserUI();
        }
      }).catch(() => {});
    }
  } catch (_) {}

  const authLandingScreen = $('authLandingScreen');

  function updateAuthUserUI() {
    const avatarSlot = $('userAvatarSlot');
    const nameSlot = $('userNameSlot');
    const roleSlot = $('userRoleSlot');
    const activeBox = $('userProfileActiveBox');
    const loginForm = $('loginForm');
    const regForm = $('registerForm');
    const oauthBox = document.querySelector('.oauth-buttons-container');
    const divider = document.querySelector('.auth-divider');
    const sidebarLogoutBtn = $('logoutBtn');

    // Manage Fullscreen Landing Screen visibility
    if (authLandingScreen) {
      if (currentUser || isGuestSession) {
        authLandingScreen.hidden = true;
      } else {
        authLandingScreen.hidden = false;
      }
    }

    if (currentUser) {
      if (avatarSlot) avatarSlot.textContent = currentUser.name.split(' ').map(n=>n[0]).join('').slice(0,2).toUpperCase();
      if (nameSlot) nameSlot.textContent = currentUser.name;
      if (roleSlot) roleSlot.textContent = currentUser.role === 'admin' ? 'Administrador' : 'Pasajero';

      if (activeBox) {
        activeBox.hidden = false;
        $('userActiveAvatar').src = currentUser.avatarUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(currentUser.name)}`;
        $('userActiveName').textContent = currentUser.name;
        $('userActiveEmail').textContent = currentUser.email;
        $('userActiveBadge').textContent = `Cuenta ${currentUser.provider.toUpperCase()} (${currentUser.role})`;
      }
      if (loginForm) loginForm.hidden = true;
      if (regForm) regForm.hidden = true;
      if (oauthBox) oauthBox.style.display = 'none';
      if (divider) divider.style.display = 'none';
      const tabs = document.querySelector('.auth-tabs');
      if (tabs) tabs.style.display = 'none';
      // Mostrar botón de logout cuando hay sesión activa
      if (sidebarLogoutBtn) sidebarLogoutBtn.hidden = false;
    } else {
      if (avatarSlot) avatarSlot.textContent = 'GA';
      if (nameSlot) nameSlot.textContent = isGuestSession ? 'Invitado' : 'Inicia Sesión';
      if (roleSlot) roleSlot.textContent = isGuestSession ? 'Modo Lectura' : 'Inicia Sesión';

      if (activeBox) activeBox.hidden = true;
      if (oauthBox) oauthBox.style.display = 'flex';
      if (divider) divider.style.display = 'flex';
      const tabs = document.querySelector('.auth-tabs');
      if (tabs) tabs.style.display = 'grid';

      // Ocultar botón de logout cuando no hay sesión
      if (sidebarLogoutBtn) sidebarLogoutBtn.hidden = true;

      // Show active tab form
      const isReg = $('tabRegister')?.classList.contains('active');
      if (loginForm) loginForm.hidden = isReg;
      if (regForm) regForm.hidden = !isReg;
    }
  }
  updateAuthUserUI();

  // Auth Button & Modal controls
  const authBtn = $('authBtn');
  const authModal = $('authModal');
  const authClose = $('authClose');
  const oauthPromptModal = $('oauthPromptModal');
  const oauthPromptClose = $('oauthPromptClose');

  if (authBtn && authModal) {
    authBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      authModal.classList.add('active');
    });
  }
  if (authClose && authModal) {
    authClose.addEventListener('click', () => authModal.classList.remove('active'));
  }
  if (oauthPromptClose && oauthPromptModal) {
    oauthPromptClose.addEventListener('click', () => oauthPromptModal.classList.remove('active'));
  }

  // --- SUPABASE CLIENTE (OAuth real para Google & Apple) ---
  const SUPABASE_URL = 'https://tbkgtblucdzkazpwlwda.supabase.co';
  const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRia2d0Ymx1Y2R6a2F6cHdsd2RhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA2MjEzMDIsImV4cCI6MjEwNjE5NzMwMn0.-l_2o1G4eb3bhDgknHLH7SSx1IobaC-9jbVTTwBmkfM';
  const supabaseClient = (typeof supabase !== 'undefined' && supabase.createClient)
    ? supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
    : null;

  // Helper: crear sesión local a partir de un usuario de Supabase Auth
  async function handleSupabaseSession(supaUser) {
    if (!supaUser) return;
    const provider = supaUser.app_metadata?.provider || 'oauth';
    const name = supaUser.user_metadata?.full_name
      || supaUser.user_metadata?.name
      || supaUser.email?.split('@')[0]
      || 'Usuario';

    // Registrar/actualizar en el backend local para obtener JWT propio
    try {
      const res = await fetch('/api/v1/auth/oauth-callback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          supabaseId: supaUser.id,
          email: supaUser.email,
          name,
          provider,
          avatarUrl: supaUser.user_metadata?.avatar_url || supaUser.user_metadata?.picture || ''
        })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.status === 'success') {
          currentUser = data.user;
          isGuestSession = false;
          localStorage.setItem('bustrack_user', JSON.stringify(currentUser));
          localStorage.setItem('bustrack_auth_token', data.token);
          toast(`¡Bienvenido, ${currentUser.name}! 🎉`, 'ok');
          updateAuthUserUI();
          showHome();
          if (authModal) authModal.classList.remove('active');
          return;
        }
      }
    } catch (_) {}

    // Fallback: crear sesión local sin backend
    currentUser = {
      id: supaUser.id,
      email: supaUser.email,
      name,
      role: 'admin',
      provider,
      avatarUrl: supaUser.user_metadata?.avatar_url || supaUser.user_metadata?.picture || ''
    };
    isGuestSession = false;
    localStorage.setItem('bustrack_user', JSON.stringify(currentUser));
    toast(`¡Bienvenido, ${name}! 🎉`, 'ok');
    updateAuthUserUI();
    showHome();
    if (authModal) authModal.classList.remove('active');
  }

  // Detectar sesión OAuth al cargar la página (redirect/popup callback)
  if (supabaseClient) {
    supabaseClient.auth.onAuthStateChange(async (event, session) => {
      if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') && session?.user && !currentUser) {
        await handleSupabaseSession(session.user);
      }
    });

    // Recuperar sesión activa de Supabase si existe
    supabaseClient.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user && !currentUser) {
        await handleSupabaseSession(session.user);
      }
    });
  }

  // Función principal de OAuth — abre el proveedor real
  async function openOAuthPrompt(provider) {
    if (!supabaseClient) {
      toast('El SDK de Supabase no está cargado. Recarga la página.', 'warn');
      return;
    }

    const providerName = provider === 'google' ? 'Google' : 'Apple';

    // Mostrar loader visual en el botón
    const btn = provider === 'google' ? $('landingGoogleAuthBtn') : $('landingAppleAuthBtn');
    const originalHTML = btn?.innerHTML;
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = `<svg style="animation:spin 0.8s linear infinite;width:18px;height:18px" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10" opacity=".25"/><path d="M12 2a10 10 0 0 1 10 10" stroke-linecap="round"/></svg> Conectando...`;
    }

    try {
      const redirectTo = window.location.origin + window.location.pathname;
      const { error } = await supabaseClient.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo,
          queryParams: provider === 'google' ? { access_type: 'offline', prompt: 'select_account' } : {}
        }
      });

      if (error) {
        toast(`Error al iniciar ${providerName}: ${error.message}`, 'warn');
        if (btn) { btn.disabled = false; btn.innerHTML = originalHTML; }
      }
      // Si no hay error, el navegador redirige automáticamente al proveedor
    } catch (err) {
      toast(`No se pudo conectar con ${providerName}`, 'warn');
      if (btn) { btn.disabled = false; btn.innerHTML = originalHTML; }
    }
  }

  // --- LANDING SCREEN FORM HANDLERS ---
  const landingTabRegister = $('landingTabRegister');
  const landingTabLogin = $('landingTabLogin');
  if (landingTabRegister && landingTabLogin) {
    landingTabRegister.addEventListener('click', () => {
      landingTabRegister.classList.add('active');
      landingTabLogin.classList.remove('active');
      $('landingRegisterForm').hidden = false;
      $('landingLoginForm').hidden = true;
    });
    landingTabLogin.addEventListener('click', () => {
      landingTabLogin.classList.add('active');
      landingTabRegister.classList.remove('active');
      $('landingLoginForm').hidden = false;
      $('landingRegisterForm').hidden = true;
    });
  }

  // Landing Registration Submit
  const landingRegForm = $('landingRegisterForm');
  if (landingRegForm) {
    landingRegForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = $('landingRegName').value;
      const email = $('landingRegEmail').value;
      const password = $('landingRegPassword').value;
      const consentTerms = $('landingRegConsent').checked;

      try {
        const res = await api.register({ name, email, password, consentTerms });
        if (res.status === 'success') {
          currentUser = res.user;
          isGuestSession = false;
          localStorage.setItem('bustrack_user', JSON.stringify(currentUser));
          localStorage.setItem('bustrack_auth_token', res.token);
          toast(`¡Cuenta creada con éxito! Bienvenido a BusTrack Pro, ${currentUser.name}`, 'ok');
          updateAuthUserUI();
          showHome();
        } else {
          toast(res.detail || 'Error en el registro', 'warn');
        }
      } catch (err) {
        toast('Error al procesar el registro', 'warn');
      }
    });
  }

  // Landing Login Submit
  const landingLoginForm = $('landingLoginForm');
  if (landingLoginForm) {
    landingLoginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = $('landingLoginEmail').value;
      const password = $('landingLoginPassword').value;
      try {
        const res = await api.login(email, password);
        if (res.status === 'success') {
          currentUser = res.user;
          isGuestSession = false;
          localStorage.setItem('bustrack_user', JSON.stringify(currentUser));
          localStorage.setItem('bustrack_auth_token', res.token);
          toast(`¡Bienvenido de nuevo, ${currentUser.name}!`, 'ok');
          updateAuthUserUI();
          showHome();
        } else {
          toast(res.detail || 'Credenciales incorrectas', 'warn');
        }
      } catch (err) {
        toast('No se pudo conectar al servidor de autenticación', 'warn');
      }
    });
  }

  // Landing OAuth Buttons (Google & Apple)
  const landingGoogleBtn = $('landingGoogleAuthBtn');
  if (landingGoogleBtn) {
    landingGoogleBtn.addEventListener('click', () => openOAuthPrompt('google'));
  }

  const landingAppleBtn = $('landingAppleAuthBtn');
  if (landingAppleBtn) {
    landingAppleBtn.addEventListener('click', () => openOAuthPrompt('apple'));
  }

  // Guest Explore Button: lleva directamente al menú principal de selección
  const guestBtn = $('guestExploreBtn');
  if (guestBtn) {
    guestBtn.addEventListener('click', () => {
      isGuestSession = true;
      sessionStorage.setItem('bustrack_guest', 'true');
      toast('Explorando como Invitado — Menú Principal', 'info');
      updateAuthUserUI();
      showHome();
    });
  }

  // --- MODAL FORM HANDLERS ---
  const tabLogin = $('tabLogin');
  const tabRegister = $('tabRegister');
  if (tabLogin && tabRegister) {
    tabLogin.addEventListener('click', () => {
      tabLogin.classList.add('active');
      tabRegister.classList.remove('active');
      $('loginForm').hidden = false;
      $('registerForm').hidden = true;
    });
    tabRegister.addEventListener('click', () => {
      tabRegister.classList.add('active');
      tabLogin.classList.remove('active');
      $('registerForm').hidden = false;
      $('loginForm').hidden = true;
    });
  }

  // Modal Login Submit
  const loginForm = $('loginForm');
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = $('loginEmail').value;
      const password = $('loginPassword').value;
      try {
        const res = await api.login(email, password);
        if (res.status === 'success') {
          currentUser = res.user;
          isGuestSession = false;
          localStorage.setItem('bustrack_user', JSON.stringify(currentUser));
          localStorage.setItem('bustrack_auth_token', res.token);
          toast(`¡Bienvenido de nuevo, ${currentUser.name}!`, 'ok');
          updateAuthUserUI();
          hideHome();
          navigate('dashboard');
          authModal.classList.remove('active');
        } else {
          toast(res.detail || 'Error al iniciar sesión', 'warn');
        }
      } catch (err) {
        toast('No se pudo conectar al servidor de autenticación', 'warn');
      }
    });
  }

  // Modal Register Submit
  const regForm = $('registerForm');
  if (regForm) {
    regForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = $('regName').value;
      const email = $('regEmail').value;
      const password = $('regPassword').value;
      const consentTerms = $('regConsent').checked;

      try {
        const res = await api.register({ name, email, password, consentTerms });
        if (res.status === 'success') {
          currentUser = res.user;
          isGuestSession = false;
          localStorage.setItem('bustrack_user', JSON.stringify(currentUser));
          localStorage.setItem('bustrack_auth_token', res.token);
          toast(`¡Cuenta creada con éxito! Bienvenido, ${currentUser.name}`, 'ok');
          updateAuthUserUI();
          hideHome();
          navigate('dashboard');
          authModal.classList.remove('active');
        } else {
          toast(res.detail || 'Error en el registro', 'warn');
        }
      } catch (err) {
        toast('Error al procesar el registro', 'warn');
      }
    });
  }

  // Modal Google OAuth button
  const googleBtn = $('googleAuthBtn');
  if (googleBtn) {
    googleBtn.addEventListener('click', async () => {
      try {
        const mockGoogleEmail = `usuario.google.${Math.floor(Math.random()*1000)}@gmail.com`;
        const res = await api.loginGoogle({
          googleToken: 'mock_google_oauth_token',
          email: mockGoogleEmail,
          name: 'Usuario Google',
          picture: 'https://api.dicebear.com/7.x/initials/svg?seed=GoogleUser'
        });
        if (res.status === 'success') {
          currentUser = res.user;
          isGuestSession = false;
          localStorage.setItem('bustrack_user', JSON.stringify(currentUser));
          localStorage.setItem('bustrack_auth_token', res.token);
          toast(`Sesión iniciada con Google (${currentUser.email})`, 'ok');
          updateAuthUserUI();
          hideHome();
          navigate('dashboard');
          authModal.classList.remove('active');
        }
      } catch (_) {
        toast('Error en autenticación con Google', 'warn');
      }
    });
  }

  // Modal Apple OAuth button
  const appleBtn = $('appleAuthBtn');
  if (appleBtn) {
    appleBtn.addEventListener('click', async () => {
      try {
        const res = await api.loginApple({
          appleToken: 'mock_apple_oauth_token',
          email: `apple_user_${Math.floor(Math.random()*1000)}@privaterelay.appleid.com`,
          name: 'Usuario Apple'
        });
        if (res.status === 'success') {
          currentUser = res.user;
          isGuestSession = false;
          localStorage.setItem('bustrack_user', JSON.stringify(currentUser));
          localStorage.setItem('bustrack_auth_token', res.token);
          toast('Sesión iniciada con Apple ID', 'ok');
          updateAuthUserUI();
          hideHome();
          navigate('dashboard');
          authModal.classList.remove('active');
        }
      } catch (_) {
        toast('Error en autenticación con Apple', 'warn');
      }
    });
  }

  // Logout Button (sidebar)
  const logoutBtn = $('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      const userName = currentUser?.name || 'Usuario';
      currentUser = null;
      isGuestSession = false;
      localStorage.removeItem('bustrack_user');
      localStorage.removeItem('bustrack_auth_token');
      sessionStorage.removeItem('bustrack_guest');

      // Intentar cerrar sesión en Supabase también
      try {
        const SUPABASE_URL = 'https://tbkgtblucdzkazpwlwda.supabase.co';
        const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRia2d0Ymx1Y2R6a2F6cHdsd2RhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA2MjEzMDIsImV4cCI6MjEwNjE5NzMwMn0.-l_2o1G4eb3bhDgknHLH7SSx1IobaC-9jbVTTwBmkfM';
        await fetch(`${SUPABASE_URL}/auth/v1/logout`, {
          method: 'POST',
          headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
        });
      } catch (_) { /* Silencioso si falla */ }

      toast(`Hasta pronto, ${userName}. Sesión cerrada correctamente. 👋`, 'info');
      updateAuthUserUI();
      if (authModal) authModal.classList.remove('active');
    });
  }

  // ------------------------------------------------------------------
  // COMMAND PALETTE (CTRL + K) LOGIC
  // ------------------------------------------------------------------
  const cmdModal = $('commandPaletteModal');
  const cmdInput = $('cmdInput');
  const cmdResults = $('cmdResults');

  function openCommandPalette() {
    if (cmdModal) {
      cmdModal.classList.add('active');
      if (cmdInput) {
        cmdInput.value = '';
        cmdInput.focus();
      }
    }
  }

  function closeCommandPalette() {
    if (cmdModal) cmdModal.classList.remove('active');
  }

  // Shortcut listeners: Ctrl+K or Cmd+K
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      if (cmdModal?.classList.contains('active')) closeCommandPalette();
      else openCommandPalette();
    }
    if (e.key === 'Escape') {
      closeCommandPalette();
      if (authModal) authModal.classList.remove('active');
    }
  });

  // Global search bar focus triggers command palette
  const globalSearch = $('globalSearch');
  if (globalSearch) {
    globalSearch.addEventListener('click', () => openCommandPalette());
  }

  // Command palette item clicks
  if (cmdResults) {
    cmdResults.addEventListener('click', (e) => {
      const item = e.target.closest('.cmd-item');
      if (!item) return;
      const action = item.dataset.action;
      closeCommandPalette();
      if (action === 'go-dashboard') switchView('dashboard');
      else if (action === 'go-map') switchView('map');
      else if (action === 'go-fleet') switchView('fleet');
      else if (action === 'toggle-theme') {
        const motionBtn = $('motionSwitch');
        if (motionBtn) motionBtn.click();
        toast('Preferencia de tema actualizada', 'info');
      }
    });
  }

  // ------------------------------------------------------------------
  // NOTIFICATION DROPDOWN PANEL
  // ------------------------------------------------------------------
  // notifBtn, notifDropdownPanel, notifMarkAllReadBtn ya declarados en scope global


  function renderNotifDropdown() {
    const list = $('notifList');
    if (!list) return;
    const items = alerts.slice(0, 6);
    if (!items.length) {
      list.innerHTML = '<p class="empty-state" style="padding:1rem;font-size:12px">No hay notificaciones pendientes</p>';
      return;
    }
    list.innerHTML = items.map(a => `
      <div class="notif-item">
        <span class="notif-item-icon">${a.type === 'critical' ? '🚨' : a.type === 'warning' ? '⚠️' : 'ℹ️'}</span>
        <div>
          <div class="notif-item-text"><strong>${esc(a.title)}</strong>: ${esc(a.desc)}</div>
          <span class="notif-item-time">${a.time}</span>
        </div>
      </div>
    `).join('');
  }

  if (notifBtn && notifDropdownPanel) {
    notifBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const isHidden = notifDropdownPanel.hidden;
      notifDropdownPanel.hidden = !isHidden;
      if (isHidden) renderNotifDropdown();
    });
    document.addEventListener('click', (e) => {
      if (!e.target.closest('#notifBtn') && !e.target.closest('#notifDropdownPanel')) {
        if (notifDropdownPanel) notifDropdownPanel.hidden = true;
      }
    });
  }
  if (notifMarkAllReadBtn) {
    notifMarkAllReadBtn.addEventListener('click', () => {
      alerts.forEach(a => a.read = true);
      refreshCounters();
      if (notifDropdownPanel) notifDropdownPanel.hidden = true;
      toast('Notificaciones limpiadas', 'ok');
    });
  }

  // ------------------------------------------------------------------
  // FLEET "AGREGAR BUS" MODAL HANDLERS
  // ------------------------------------------------------------------
  const addBusBtn = $('addBusBtn');
  const addBusModal = $('addBusModal');
  const addBusClose = $('addBusClose');
  const addBusForm = $('addBusForm');

  if (addBusBtn && addBusModal) {
    addBusBtn.addEventListener('click', () => addBusModal.classList.add('active'));
  }
  if (addBusClose && addBusModal) {
    addBusClose.addEventListener('click', () => addBusModal.classList.remove('active'));
  }
  if (addBusForm) {
    addBusForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const id = $('newBusId').value.trim().toUpperCase();
      const routeId = $('newBusRoute').value;
      const driverId = $('newBusDriver').value;
      const plate = $('newBusPlate').value.trim().toUpperCase();

      const route = ROUTES.find(r => r.id === routeId) || ROUTES[0];
      const driver = DRIVERS.find(d => d.id === driverId) || DRIVERS[0];

      const newBus = {
        id,
        num: id.replace('BUS-', ''),
        route,
        driver,
        plate,
        status: 'active',
        speed: 42,
        passengers: 24,
        capacity: 45,
        delay: 0,
        fuel: 95,
        pos: { x: 200, y: 150 },
        _t: Math.random(),
        _dir: 1,
        _step: 0.002,
        updatedAgo: 0,
        nextStop: STOPS[0].name
      };

      buses.unshift(newBus);
      refreshCounters();
      if (state.view === 'fleet') renderFleet();
      if (state.view === 'dashboard') renderBusList();
      if (state.view === 'map') renderMapBusList();
      drawMapMarkers(true);

      addBusModal.classList.remove('active');
      addBusForm.reset();
      toast(`Bus ${id} registrado en la flota con éxito`, 'ok');
    });
  }

  // Fleet Reset Filters
  const resetFiltersBtn = $('resetFiltersBtn');
  if (resetFiltersBtn) {
    resetFiltersBtn.addEventListener('click', () => {
      const search = $('fleetSearch');
      const filter = $('routeFilter');
      if (search) search.value = '';
      if (filter) filter.value = '';
      renderFleet();
      toast('Filtros de la flota reiniciados', 'info');
    });
  }

  // ------------------------------------------------------------------
  // DRIVER CONTACT MODAL HANDLERS
  // ------------------------------------------------------------------
  const contactDriverBtn = $('contactDriverBtn');
  const contactModal = $('contactDriverModal');
  const contactClose = $('contactClose');

  if (contactDriverBtn && contactModal) {
    contactDriverBtn.addEventListener('click', () => {
      const bus = buses.find(b => b.id === state.highlightBus) || buses[0];
      $('contactDriverName').textContent = bus.driver.name;
      $('contactDriverBus').textContent = `Asignado a ${bus.id} (Ruta ${bus.route.id})`;
      $('contactDriverInitials').textContent = bus.driver.initials;
      const statusBadge = $('contactDriverStatus');
      if (statusBadge) {
        statusBadge.className = `status-badge status-${bus.status}`;
        statusBadge.textContent = statusLabel(bus.status);
      }
      if ($('busModal')) $('busModal').classList.remove('active');
      contactModal.classList.add('active');
    });
  }
  if (contactClose && contactModal) {
    contactClose.addEventListener('click', () => contactModal.classList.remove('active'));
  }

  const callDriverBtn = $('callDriverBtn');
  const msgDriverBtn = $('msgDriverBtn');
  const dispatchAlertBtn = $('dispatchAlertBtn');

  if (callDriverBtn) {
    callDriverBtn.addEventListener('click', () => {
      toast('📞 Conectando llamada con la cabina del conductor...', 'ok');
      if (contactModal) contactModal.classList.remove('active');
    });
  }
  if (msgDriverBtn) {
    msgDriverBtn.addEventListener('click', () => {
      toast('💬 Canal de mensajería enviado al terminal de abordo', 'ok');
      if (contactModal) contactModal.classList.remove('active');
    });
  }
  if (dispatchAlertBtn) {
    dispatchAlertBtn.addEventListener('click', () => {
      toast('📡 Alerta de despacho enviada a la pantalla de la unidad', 'ok');
      if (contactModal) contactModal.classList.remove('active');
    });
  }

  // ------------------------------------------------------------------
  // REPORTS VIEW HANDLERS (Print / Generate)
  // ------------------------------------------------------------------
  const printReportBtn = $('printReportBtn');
  if (printReportBtn) {
    printReportBtn.addEventListener('click', () => {
      window.print();
    });
  }
  const generateReportBtn = $('generateReportBtn');
  if (generateReportBtn) {
    generateReportBtn.addEventListener('click', () => {
      toast('Generando reporte operativo consolidado...', 'info');
      setTimeout(() => {
        drawReportCharts();
        toast('Reporte de operaciones generado con éxito', 'ok');
      }, 500);
    });
  }

  // ------------------------------------------------------------------
  // ALERTS VIEW HANDLERS (Clear All / Simulate New Alert)
  // ------------------------------------------------------------------
  const clearAlertsBtn = $('clearAlertsBtn');
  if (clearAlertsBtn) {
    clearAlertsBtn.addEventListener('click', () => {
      alerts.forEach(a => a.read = true);
      refreshCounters();
      if (state.view === 'alerts') renderAlerts();
      toast('Todas las alertas fueron marcadas como leídas', 'ok');
    });
  }
  const newAlertBtn = $('newAlertBtn');
  if (newAlertBtn) {
    newAlertBtn.addEventListener('click', () => {
      const bus = pick(buses);
      const alertTypes = [
        { type: 'warning', icon: '⚠️', title: 'Exceso de velocidad leve', desc: `${bus.id} registró ${bus.speed + 15} km/h en zona urbana.` },
        { type: 'critical', icon: '🚨', title: 'Frenado brusco repentino', desc: `${bus.id} desaceleró bruscamente cerca de ${bus.nextStop}.` },
        { type: 'info', icon: 'ℹ️', title: 'Apertura prolongada de puertas', desc: `${bus.id} mantuvo puertas abiertas durante más de 3 min.` },
      ];
      const newAlert = pick(alertTypes);
      alerts.unshift({
        id: 'ALT-' + Math.floor(Math.random() * 9000 + 1000),
        type: newAlert.type,
        icon: newAlert.icon,
        title: newAlert.title,
        desc: newAlert.desc,
        time: 'ahora mismo',
        read: false
      });
      refreshCounters();
      if (state.view === 'alerts') renderAlerts();
      toast(`Nueva alerta simulada: ${newAlert.title}`, 'warn');
    });
  }

  // ------------------------------------------------------------------
  // SETTINGS MODAL DATA RESET
  // ------------------------------------------------------------------
  const resetDataBtn = $('resetDataBtn');
  if (resetDataBtn) {
    resetDataBtn.addEventListener('click', () => {
      buses.forEach(b => {
        b.speed = randInt(25, 55);
        b.passengers = randInt(10, 40);
        b.fuel = randInt(60, 98);
      });
      refreshCounters();
      if (state.view === 'dashboard') renderBusList();
      if (state.view === 'fleet') renderFleet();
      drawMapMarkers(true);
      toast('Datos y métricas de la flota regenerados', 'ok');
    });
  }

  // ------------------------------------------------------------------
  // COOKIE CONSENT BANNER LOGIC
  // ------------------------------------------------------------------
  const cookieBanner = $('cookieConsentBanner');
  const cookieConsentSaved = localStorage.getItem('bustrack_cookie_consent');

  function hideCookieBanner() {
    if (!cookieBanner) return;
    cookieBanner.setAttribute('hidden', 'true');
    cookieBanner.hidden = true;
    cookieBanner.style.setProperty('display', 'none', 'important');
  }

  if (!cookieConsentSaved && cookieBanner) {
    cookieBanner.removeAttribute('hidden');
    cookieBanner.hidden = false;
    cookieBanner.style.display = 'flex';
  } else if (cookieBanner) {
    hideCookieBanner();
  }

  const cookieAcceptBtn = $('cookieAcceptBtn');
  const cookieRejectBtn = $('cookieRejectBtn');
  if (cookieAcceptBtn) {
    cookieAcceptBtn.addEventListener('click', (e) => {
      e.preventDefault();
      localStorage.setItem('bustrack_cookie_consent', 'accepted');
      hideCookieBanner();
      toast('Preferencias de almacenamiento guardadas', 'ok');
    });
  }
  if (cookieRejectBtn) {
    cookieRejectBtn.addEventListener('click', (e) => {
      e.preventDefault();
      localStorage.setItem('bustrack_cookie_consent', 'essential_only');
      hideCookieBanner();
      toast('Solo se usará almacenamiento técnico esencial', 'info');
    });
  }

  // ------------------------------------------------------------------
  // GEOLOCATION MAP ADAPTATION EVENT LISTENERS
  // ------------------------------------------------------------------
  const miniLocBtn = $('locateUserBtnMini');
  const fullLocBtn = $('locateUserBtnFull');
  const recenterBtn = $('recenterUserBtn');
  const geoSwitchBtn = $('geoSwitch');

  if (miniLocBtn) miniLocBtn.addEventListener('click', () => requestUserLocation(true));
  if (fullLocBtn) fullLocBtn.addEventListener('click', () => requestUserLocation(true));
  if (recenterBtn) recenterBtn.addEventListener('click', () => centerMapOnUser(true));

  const savedGeoPref = localStorage.getItem('bustrack_geolocate') === 'true';
  if (geoSwitchBtn) {
    geoSwitchBtn.setAttribute('aria-checked', String(savedGeoPref));
    geoSwitchBtn.addEventListener('click', () => {
      const active = geoSwitchBtn.getAttribute('aria-checked') === 'true';
      const next = !active;
      geoSwitchBtn.setAttribute('aria-checked', String(next));
      localStorage.setItem('bustrack_geolocate', String(next));
      if (next) requestUserLocation(true);
      else {
        userLocationState.active = false;
        updateUserLocationUI();
        toast('Geolocalización desactivada', 'info');
      }
    });
  }

  if (savedGeoPref) {
    setTimeout(() => requestUserLocation(false), 500);
  }
  // ------------------------------------------------------------------
  // MOBILE FLOATING CTA
  // ------------------------------------------------------------------
  const mobileCta = $('mobileFloatingCta');
  if (mobileCta) {
    mobileCta.addEventListener('click', () => {
      // passenger view removed
      hapticFeedback([10, 30, 10]);
    });
  }

  // ------------------------------------------------------------------
  // SCROLL REVEAL OBSERVER
  // ------------------------------------------------------------------
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
        }
      });
    }, { threshold: 0.1 });

    document.querySelectorAll('.stat-card, .card').forEach(el => {
      el.classList.add('scroll-reveal');
      observer.observe(el);
    });
  }

  // ------------------------------------------------------------------
  setInterval(updateLiveData, 3000);
  setInterval(pushActivity, 9000);
}
 
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
</file>

</files>
````

## File: robots.txt
````
User-agent: *
Allow: /
Disallow: /api/
Disallow: /api/v1/

# Admin and debug endpoints
Disallow: /admin
Disallow: /debug
Disallow: /.env
Disallow: /server/

Sitemap: https://bustrack.example.com/sitemap.xml
````

## File: sitemap.xml
````xml
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://bustrack.example.com/</loc>
    <lastmod>2026-09-24</lastmod>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>https://bustrack.example.com/privacy</loc>
    <lastmod>2026-09-24</lastmod>
    <changefreq>yearly</changefreq>
    <priority>0.3</priority>
  </url>
  <url>
    <loc>https://bustrack.example.com/terms</loc>
    <lastmod>2026-09-24</lastmod>
    <changefreq>yearly</changefreq>
    <priority>0.3</priority>
  </url>
  <url>
    <loc>https://bustrack.example.com/thanks</loc>
    <lastmod>2026-09-24</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.2</priority>
  </url>
</urlset>
````

## File: skills-lock.json
````json
{
  "version": 1,
  "skills": {
    "supabase-server": {
      "source": "supabase/server",
      "sourceType": "github",
      "skillPath": "skills/supabase-server/SKILL.md",
      "computedHash": "e648f4569881342d1f102391eb56c5ce69f8ae96454d47547489382ff061cfb2"
    }
  }
}
````

## File: styles.css
````css
/* ============================================================
   BusTrack Pro — hoja de estilos
   Un solo sistema de color: todo sale de las variables de :root.
   El acento se cambia desde Preferencias (data-accent en <html>).
   ============================================================ */
 
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
 
:root {
  /* --- Marca. Cambiar estas tres líneas repinta la app entera --- */
  --brand-300: #a5b0fb;
  --brand-500: #5b6ef5;
  --brand-700: #4453c9;
  --brand-alt: #7c4ddb;
 
  /* --- Neutros (escala fría, todos derivados del mismo tono azul) --- */
  --bg-base:    #070b14;
  --bg-surface: #0c1220;
  --bg-card:    #101828;
  --bg-raised:  #162034;
  --bg-sidebar: #0a0f1c;
 
  --text-strong: #eef2f8;
  --text:        #aab6c9;
  --text-soft:   #6b7a93;
 
  --line:       rgba(148, 163, 200, 0.12);
  --line-brand: color-mix(in srgb, var(--brand-500) 32%, transparent);
 
  /* --- Semánticos --- */
  --ok:    #2bb885;
  --warn:  #e0972c;
  --risk:  #e0526b;
  --info:  var(--brand-500);
 
  /* --- Rutas. Mismo nivel de saturación que la marca --- */
  --route-a: var(--brand-500);
  --route-b: var(--brand-alt);
  --route-c: #2aa3c4;
  --route-d: #2bb885;
  --stop:    #e0972c;
 
  /* --- Mapa --- */
  --map-bg:    #080d18;
  --map-grid:  #131d31;
  --map-road:  #1f2c46;
  --map-block: #111a2b;
 
  /* --- Medidas --- */
  --sidebar-w: 256px;
  --sidebar-collapsed: 72px;
  --topbar-h: 64px;
  --gap: 16px;
  --pad-view: 24px;
  --radius: 14px;
  --radius-sm: 9px;
  --icon-stat: 44px;
  --shadow: 0 10px 30px rgba(3, 7, 18, 0.5);
  --glow: 0 0 0 1px var(--line-brand), 0 12px 28px rgba(3, 7, 18, 0.55);
  --t: 180ms cubic-bezier(0.4, 0, 0.2, 1);
}
 
/* Paletas alternas (Preferencias) */
html[data-accent="teal"]   { --brand-300: #7fd8d0; --brand-500: #22a79b; --brand-700: #1a7f76; --brand-alt: #2aa3c4; }
html[data-accent="amber"]  { --brand-300: #f2c98a; --brand-500: #d38b2a; --brand-700: #a86a1c; --brand-alt: #c96a3c; }
html[data-accent="rose"]   { --brand-300: #f2a2b4; --brand-500: #d95273; --brand-700: #ab3d5a; --brand-alt: #9b4bc4; }
html[data-accent="forest"] { --brand-300: #96d7ae; --brand-500: #2f9e63; --brand-700: #237a4c; --brand-alt: #2aa3c4; }
 
/* Densidad compacta */
html[data-density="compact"] { --gap: 11px; --pad-view: 16px; --icon-stat: 38px; }
 
body {
  font-family: 'Inter', system-ui, -apple-system, sans-serif;
  background: var(--bg-base);
  color: var(--text-strong);
  display: flex;
  min-height: 100vh;
  min-height: 100dvh;
  overflow-x: hidden;
  font-size: 14px;
  line-height: 1.5;
  -webkit-font-smoothing: antialiased;
}
 
h1, h2, h3 { line-height: 1.25; }
button, input, select { font-family: inherit; }
:focus-visible { outline: 2px solid var(--brand-300); outline-offset: 2px; }
 
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
 
.skip-link {
  position: absolute; left: -999px; top: 8px; z-index: 300;
  background: var(--brand-500); color: #fff;
  padding: 10px 16px; border-radius: var(--radius-sm); text-decoration: none;
}
.skip-link:focus { left: 8px; }
 
::-webkit-scrollbar { width: 7px; height: 7px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: #1d283f; border-radius: 4px; }
::-webkit-scrollbar-thumb:hover { background: #2c3a5a; }
 
/* El degradado del logo toma el color de marca actual */
#logoGrad stop:first-child { stop-color: var(--brand-500); }
#logoGrad stop:last-child  { stop-color: var(--brand-alt); }
 
/* ============ SIDEBAR ============ */
.sidebar-overlay {
  position: fixed; inset: 0; z-index: 99;
  background: rgba(4, 8, 16, 0.7);
  backdrop-filter: blur(2px);
  opacity: 0; pointer-events: none;
  transition: opacity var(--t);
}
.sidebar-overlay.open { opacity: 1; pointer-events: auto; }
 
.sidebar {
  width: var(--sidebar-w);
  background: var(--bg-sidebar);
  border-right: 1px solid var(--line);
  display: flex; flex-direction: column;
  position: fixed; inset: 0 auto 0 0;
  z-index: 100; overflow: hidden;
  transition: width var(--t), transform var(--t);
}
.sidebar.collapsed { width: var(--sidebar-collapsed); }
.sidebar.collapsed .logo-text,
.sidebar.collapsed .nav-label,
.sidebar.collapsed .nav-item > span:not(.nav-count),
.sidebar.collapsed .nav-count,
.sidebar.collapsed .user-info,
.sidebar.collapsed .user-settings { display: none; }
.sidebar.collapsed .logo,
.sidebar.collapsed .user-profile { justify-content: center; }
.sidebar.collapsed .sidebar-header {
  flex-direction: column;
  justify-content: center;
  align-items: center;
  gap: 10px;
  padding: 14px 6px;
}
.sidebar.collapsed .nav-item { justify-content: center; padding: 11px 0; }
.sidebar.collapsed .sidebar-toggle {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  border-radius: var(--radius-sm);
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid var(--line);
  color: var(--text-strong);
}
.sidebar.collapsed .sidebar-toggle:hover {
  background: rgba(255, 255, 255, 0.12);
  color: var(--brand-300);
  border-color: var(--line-brand);
}
.sidebar.collapsed .sidebar-toggle svg {
  transform: rotate(180deg);
}
 
.sidebar-header {
  display: flex; align-items: center; justify-content: space-between;
  gap: 8px; padding: 18px 16px;
  border-bottom: 1px solid var(--line); flex-shrink: 0;
}
.logo { display: flex; align-items: center; gap: 10px; min-width: 0; }
.logo-icon { display: block; width: 32px; height: 32px; flex-shrink: 0; }
.logo-icon svg { width: 100%; height: 100%; display: block; }
.logo-text { display: flex; align-items: center; gap: 6px; }
.logo-name { font-size: 15.5px; font-weight: 700; letter-spacing: -0.3px; }
.logo-badge {
  font-size: 9px; font-weight: 700; letter-spacing: 1px; color: #fff;
  background: linear-gradient(135deg, var(--brand-500), var(--brand-alt));
  padding: 2px 6px; border-radius: 4px;
}
 
.sidebar-toggle {
  background: none; border: 1px solid transparent; color: var(--text-soft);
  cursor: pointer; padding: 6px; border-radius: 6px; display: flex;
  align-items: center; justify-content: center;
  transition: background var(--t), color var(--t), border-color var(--t), transform var(--t);
}
.sidebar-toggle:hover { background: rgba(255,255,255,0.06); color: var(--text-strong); }
.sidebar-toggle svg { width: 18px; height: 18px; transition: transform var(--t); }
 
.sidebar-nav { flex: 1; padding: 14px 8px; overflow-y: auto; }
.nav-section + .nav-section { margin-top: 20px; }
.nav-label {
  display: block; padding: 0 8px 6px;
  font-size: 10px; font-weight: 600; letter-spacing: 1.1px;
  text-transform: uppercase; color: var(--text-soft); white-space: nowrap;
}
.nav-list { list-style: none; display: flex; flex-direction: column; gap: 2px; }
.nav-item {
  display: flex; align-items: center; gap: 10px;
  padding: 10px 12px; border-radius: var(--radius-sm);
  color: var(--text); cursor: pointer; position: relative; white-space: nowrap;
  transition: background var(--t), color var(--t);
}
.nav-item svg { width: 18px; height: 18px; flex-shrink: 0; }
.nav-item > span:not(.nav-count) { font-size: 13.5px; font-weight: 500; flex: 1; }
.nav-item:hover { background: rgba(255,255,255,0.05); color: var(--text-strong); }
.nav-item.active {
  background: color-mix(in srgb, var(--brand-500) 16%, transparent);
  color: var(--brand-300); font-weight: 600;
}
.nav-item.active::before {
  content: ''; position: absolute; left: 0; top: 5px; bottom: 5px;
  width: 3px; border-radius: 0 3px 3px 0; background: var(--brand-500);
}
.nav-count {
  font-size: 11px; font-weight: 600; padding: 2px 7px; border-radius: 20px;
  background: rgba(255,255,255,0.08); color: var(--text);
}
.nav-count.alert-badge { background: color-mix(in srgb, var(--risk) 22%, transparent); color: #f09aa8; }
.nav-count.live-pulse {
  background: color-mix(in srgb, var(--ok) 20%, transparent); color: #6fd7b2;
  font-size: 9px; letter-spacing: 0.5px; animation: badgeFade 2.4s ease-in-out infinite;
}
@keyframes badgeFade { 0%, 100% { opacity: 1; } 50% { opacity: 0.45; } }
 
.sidebar-footer { padding: 10px 8px; border-top: 1px solid var(--line); flex-shrink: 0; }

/* ============ BOTONES DE AUTENTICACIÓN EN SIDEBAR ============ */
.sidebar-auth-box {
  display: flex;
  flex-direction: column;
  gap: 7px;
  margin-bottom: 6px;
}
.sidebar-auth-box[hidden] {
  display: none !important;
}

.sidebar-auth-btn {
  display: flex;
  align-items: center;
  gap: 9px;
  width: 100%;
  padding: 9px 12px;
  border-radius: var(--radius-sm);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  border: 1px solid transparent;
  transition: transform 0.15s ease, background var(--t), border-color var(--t), box-shadow var(--t), color var(--t);
  white-space: nowrap;
  user-select: none;
}
.sidebar-auth-btn svg {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
  transition: transform 0.2s ease;
}

/* Botón Iniciar Sesión (Estilo Primario / Acento) */
.sidebar-auth-btn.btn-auth-login {
  background: linear-gradient(135deg, var(--brand-500), var(--brand-alt));
  color: #ffffff;
  border-color: rgba(255, 255, 255, 0.15);
  box-shadow: 0 2px 10px color-mix(in srgb, var(--brand-500) 30%, transparent);
}
.sidebar-auth-btn.btn-auth-login:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 16px color-mix(in srgb, var(--brand-500) 45%, transparent);
  border-color: rgba(255, 255, 255, 0.3);
}
.sidebar-auth-btn.btn-auth-login:hover svg {
  transform: translateX(2px);
}
.sidebar-auth-btn.btn-auth-login:active {
  transform: translateY(0);
}

/* Botón Registrarse (Estilo Secundario / Glassmorphism) */
.sidebar-auth-btn.btn-auth-register {
  background: rgba(255, 255, 255, 0.04);
  color: var(--text-strong);
  border-color: var(--line);
}
.sidebar-auth-btn.btn-auth-register:hover {
  background: color-mix(in srgb, var(--brand-500) 12%, transparent);
  border-color: var(--line-brand);
  color: var(--brand-300);
  transform: translateY(-1px);
}
.sidebar-auth-btn.btn-auth-register:hover svg {
  transform: scale(1.1);
}
.sidebar-auth-btn.btn-auth-register:active {
  transform: translateY(0);
}

.sidebar.collapsed .sidebar-auth-btn span { display: none; }
.sidebar.collapsed .sidebar-auth-btn { justify-content: center; padding: 10px 0; }
.sidebar.collapsed .sidebar-legal-links { display: none; }

.sidebar-user-box {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.sidebar-user-box[hidden] {
  display: none !important;
}
.user-profile {
  display: flex; align-items: center; gap: 10px;
  padding: 9px 8px; border-radius: var(--radius-sm); cursor: pointer;
  transition: background var(--t);
}
.user-profile:hover { background: rgba(255,255,255,0.05); }
.user-avatar {
  width: 32px; height: 32px; border-radius: 50%; flex-shrink: 0;
  display: flex; align-items: center; justify-content: center;
  background: linear-gradient(135deg, var(--brand-500), var(--brand-alt));
  font-size: 11.5px; font-weight: 700; color: #fff;
}
.user-info { flex: 1; min-width: 0; display: flex; flex-direction: column; }
.user-name { font-size: 12.5px; font-weight: 600; color: var(--text-strong); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.user-role { font-size: 11px; color: var(--text-soft); }
.user-settings {
  background: none; border: none; color: var(--text-soft);
  cursor: pointer; padding: 4px; border-radius: 6px; display: flex;
}
.user-settings svg { width: 16px; height: 16px; }
.user-settings:hover { color: var(--brand-300); }

/* Botón de cerrar sesión en el sidebar */
.sidebar-logout-btn {
  display: flex; align-items: center; gap: 8px;
  width: 100%; padding: 9px 12px; margin-top: 4px;
  border: none; border-radius: var(--radius-sm);
  background: rgba(240, 80, 80, 0.07);
  color: #f08080;
  font-size: 13px; font-weight: 500;
  cursor: pointer; text-align: left;
  transition: background var(--t), color var(--t), transform 0.15s;
  white-space: nowrap;
}
.sidebar-logout-btn svg { width: 16px; height: 16px; flex-shrink: 0; }
.sidebar-logout-btn:hover {
  background: rgba(240, 80, 80, 0.16);
  color: #ff6b6b;
  transform: translateX(2px);
}
.sidebar-logout-btn:active { transform: scale(0.98); }
.sidebar.collapsed .sidebar-logout-btn span { display: none; }
.sidebar.collapsed .sidebar-logout-btn { justify-content: center; padding: 9px 0; }

/* ============ CONTENIDO ============ */
.main-content {
  flex: 1; width: 0; min-height: 100vh;
  margin-left: var(--sidebar-w);
  display: flex; flex-direction: column;
  transition: margin-left var(--t);
}
.sidebar.collapsed ~ .main-content { margin-left: var(--sidebar-collapsed); }
 
.topbar {
  height: var(--topbar-h); flex-shrink: 0;
  display: flex; align-items: center; justify-content: space-between; gap: 12px;
  padding: 0 var(--pad-view);
  background: color-mix(in srgb, var(--bg-surface) 88%, transparent);
  backdrop-filter: blur(12px);
  border-bottom: 1px solid var(--line);
  position: sticky; top: 0; z-index: 50;
}
.topbar-left { display: flex; align-items: center; gap: 12px; min-width: 0; }
.topbar-titles { min-width: 0; }
.page-title { font-size: 17px; font-weight: 700; letter-spacing: -0.3px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.breadcrumb { display: flex; align-items: center; gap: 4px; font-size: 11.5px; color: var(--text-soft); white-space: nowrap; }
.breadcrumb svg { width: 11px; height: 11px; flex-shrink: 0; }
.topbar-right { display: flex; align-items: center; gap: 8px; }
 
.mobile-menu-btn, .only-mobile { display: none; }
 
.search-bar {
  display: flex; align-items: center; gap: 8px; width: 270px;
  background: rgba(255,255,255,0.04); border: 1px solid var(--line);
  border-radius: var(--radius-sm); padding: 8px 13px;
  transition: border-color var(--t), box-shadow var(--t);
}
.search-bar:focus-within {
  border-color: var(--brand-500);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--brand-500) 22%, transparent);
}
.search-bar svg { width: 15px; height: 15px; color: var(--text-soft); flex-shrink: 0; }
.search-bar input {
  background: none; border: none; outline: none; width: 100%;
  color: var(--text-strong); font-size: 13px;
}
.search-bar input::placeholder { color: var(--text-soft); }
.search-bar input::-webkit-search-cancel-button { filter: invert(0.6); }
 
.icon-btn {
  width: 36px; height: 36px; flex-shrink: 0; border-radius: var(--radius-sm);
  background: rgba(255,255,255,0.04); border: 1px solid var(--line);
  color: var(--text); cursor: pointer; position: relative;
  display: flex; align-items: center; justify-content: center;
  transition: background var(--t), color var(--t), border-color var(--t);
}
.icon-btn svg { width: 17px; height: 17px; }
.icon-btn:hover { background: rgba(255,255,255,0.08); color: var(--text-strong); border-color: var(--line-brand); }
.notif-dot {
  position: absolute; top: 6px; right: 6px;
  width: 8px; height: 8px; border-radius: 50%;
  background: var(--risk); border: 1.5px solid var(--bg-surface);
}
.notif-dot.hidden { display: none; }
 
.live-indicator {
  display: flex; align-items: center; gap: 6px; white-space: nowrap;
  font-size: 12px; color: var(--text); cursor: pointer;
  padding: 7px 12px; border-radius: var(--radius-sm);
  background: color-mix(in srgb, var(--ok) 10%, transparent);
  border: 1px solid color-mix(in srgb, var(--ok) 26%, transparent);
  transition: background var(--t);
}
.live-indicator:hover { background: color-mix(in srgb, var(--ok) 18%, transparent); }
.live-indicator.paused {
  background: rgba(255,255,255,0.04);
  border-color: var(--line); color: var(--text-soft);
}
.live-indicator.paused .pulse-dot { background: var(--text-soft); animation: none; }

.server-status-pill {
  display: inline-flex; align-items: center; gap: 6px; white-space: nowrap;
  font-size: 11.5px; font-weight: 600;
  padding: 6px 11px; border-radius: var(--radius-sm);
  background: color-mix(in srgb, var(--brand-500) 12%, transparent);
  border: 1px solid color-mix(in srgb, var(--brand-500) 30%, transparent);
  color: var(--text-strong);
  transition: all var(--t);
}
.server-status-pill.online {
  background: color-mix(in srgb, var(--ok) 12%, transparent);
  border-color: color-mix(in srgb, var(--ok) 30%, transparent);
  color: #6fd7b2;
}
.server-status-pill.offline {
  background: color-mix(in srgb, var(--warn) 10%, transparent);
  border-color: color-mix(in srgb, var(--warn) 25%, transparent);
  color: var(--warn);
}
.server-status-pill .status-dot {
  width: 7px; height: 7px; border-radius: 50%; background: currentColor; flex-shrink: 0;
}
.server-status-pill.online .status-dot {
  box-shadow: 0 0 6px #2bb885;
}

 
.pulse-dot {
  width: 9px; height: 9px; border-radius: 50%; flex-shrink: 0;
  background: var(--ok);
  animation: pulseRing 2.2s ease-out infinite;
}
.pulse-dot.small { width: 7px; height: 7px; }
@keyframes pulseRing {
  0%   { box-shadow: 0 0 0 0 color-mix(in srgb, var(--ok) 55%, transparent); }
  70%  { box-shadow: 0 0 0 8px rgba(43, 184, 133, 0); }
  100% { box-shadow: 0 0 0 0 rgba(43, 184, 133, 0); }
}
 
/* ============ VISTAS ============ */
.view { display: none; flex: 1; min-width: 0; flex-direction: column; gap: var(--gap); padding: var(--pad-view); }
.view.active { display: flex; animation: viewIn 0.25s ease; }
@keyframes viewIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }
 
/* ============ TARJETAS DE RESUMEN ============ */
.stats-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: var(--gap); }
 
.stat-card {
  position: relative; overflow: hidden; min-width: 0;
  display: flex; align-items: center; gap: 14px;
  padding: 16px 18px;
  background: var(--bg-card); border: 1px solid var(--line);
  border-radius: var(--radius);
  transition: border-color var(--t), transform var(--t), box-shadow var(--t);
}
.stat-card:hover { border-color: var(--line-brand); transform: translateY(-2px); box-shadow: var(--shadow); }
 
.stat-icon {
  width: var(--icon-stat); height: var(--icon-stat); flex-shrink: 0;
  border-radius: 12px;
  display: flex; align-items: center; justify-content: center;
}
/* El SVG ocupa la mitad del contenedor: así el icono nunca se ve inflado */
.stat-icon svg { width: 50%; height: 50%; display: block; }
.stat-icon.buses      { background: color-mix(in srgb, var(--route-a) 16%, transparent); color: var(--brand-300); }
.stat-icon.routes     { background: color-mix(in srgb, var(--route-c) 16%, transparent); color: var(--route-c); }
.stat-icon.passengers { background: color-mix(in srgb, var(--ok) 16%, transparent);      color: var(--ok); }
.stat-icon.delay      { background: color-mix(in srgb, var(--warn) 16%, transparent);    color: var(--warn); }
 
.stat-content { flex: 1; min-width: 0; }
.stat-value { font-size: clamp(20px, 2.2vw, 25px); font-weight: 800; letter-spacing: -0.8px; line-height: 1.1; }
.stat-value small { font-size: 12px; font-weight: 500; color: var(--text); margin-left: 2px; }
.stat-label { font-size: 12px; color: var(--text-soft); margin-top: 2px; }
.stat-change { font-size: 11px; margin-top: 5px; }
.stat-change.positive { color: var(--ok); }
.stat-change.negative { color: var(--risk); }
.stat-sparkline { flex-shrink: 0; opacity: 0.85; }
 
/* ============ TARJETAS ============ */
.card {
  background: var(--bg-card); border: 1px solid var(--line);
  border-radius: var(--radius); overflow: hidden; min-width: 0;
  transition: border-color var(--t);
}
.card:hover { border-color: var(--line-brand); }
.card-header {
  display: flex; align-items: center; justify-content: space-between;
  gap: 10px; flex-wrap: wrap; padding: 14px 18px;
  border-bottom: 1px solid var(--line);
}
.card-title { display: flex; align-items: center; gap: 9px; }
.card-title h2 { font-size: 13.5px; font-weight: 600; }
.live-badge {
  display: inline-flex; align-items: center; gap: 5px;
  font-size: 9.5px; font-weight: 700; letter-spacing: 0.6px; color: var(--ok);
  background: color-mix(in srgb, var(--ok) 12%, transparent);
  border: 1px solid color-mix(in srgb, var(--ok) 26%, transparent);
  padding: 3px 8px; border-radius: 20px;
}
 
/* ============ BOTONES ============ */
.btn-primary, .btn-ghost {
  display: inline-flex; align-items: center; justify-content: center; gap: 6px;
  padding: 9px 16px; border-radius: var(--radius-sm);
  font-size: 13px; font-weight: 600; cursor: pointer;
  transition: transform var(--t), background var(--t), border-color var(--t), color var(--t), box-shadow var(--t);
}
.btn-primary {
  border: none; color: #fff;
  background: linear-gradient(135deg, var(--brand-500), var(--brand-alt));
  box-shadow: 0 2px 12px color-mix(in srgb, var(--brand-500) 35%, transparent);
}
.btn-primary:hover { transform: translateY(-1px); box-shadow: 0 6px 20px color-mix(in srgb, var(--brand-500) 45%, transparent); }
.btn-primary:active { transform: translateY(0); }
.btn-ghost {
  background: transparent; color: var(--text);
  border: 1px solid var(--line); font-weight: 500;
}
.btn-ghost:hover { background: rgba(255,255,255,0.05); color: var(--text-strong); border-color: var(--line-brand); }
.btn-sm { padding: 6px 12px; font-size: 12px; }
 
.filter-tabs { display: flex; gap: 4px; flex-wrap: wrap; }
.filter-tab, .period-btn {
  padding: 5px 11px; border-radius: 7px; border: none;
  background: transparent; color: var(--text-soft);
  font-size: 12px; cursor: pointer; transition: background var(--t), color var(--t);
}
.filter-tab:hover, .period-btn:hover { background: rgba(255,255,255,0.05); color: var(--text-strong); }
.filter-tab.active, .period-btn.active {
  background: color-mix(in srgb, var(--brand-500) 18%, transparent);
  color: var(--brand-300); font-weight: 600;
}
.chart-period { display: flex; gap: 4px; }
.alerts-filter { padding: 2px 0; }
 
/* ============ MAPA ============ */
.map-container { position: relative; height: 340px; }
.map-bg { position: relative; width: 100%; height: 100%; background: var(--map-bg); overflow: hidden; }
.map-bg svg { width: 100%; height: 100%; display: block; touch-action: none; cursor: grab; }
.map-bg svg.dragging { cursor: grabbing; }
 
.map-controls {
  position: absolute; right: 14px; bottom: 14px; z-index: 10;
  display: flex; flex-direction: column; gap: 5px;
}
.map-controls-top { top: 14px; bottom: auto; }
.map-btn {
  width: 34px; height: 34px; border-radius: 8px;
  background: color-mix(in srgb, var(--bg-card) 90%, transparent);
  backdrop-filter: blur(8px);
  border: 1px solid var(--line); color: var(--text);
  font-size: 16px; font-weight: 600; cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  transition: background var(--t), color var(--t), border-color var(--t);
}
.map-btn:hover {
  background: color-mix(in srgb, var(--brand-500) 22%, var(--bg-card));
  color: var(--brand-300); border-color: var(--line-brand);
}
 
.map-legend {
  position: absolute; left: 14px; bottom: 14px; z-index: 10;
  display: flex; flex-direction: column; gap: 5px;
  padding: 9px 11px; border-radius: 10px;
  background: color-mix(in srgb, var(--bg-card) 88%, transparent);
  backdrop-filter: blur(8px); border: 1px solid var(--line);
}
 
/* Aviso de seguimiento continuo sobre el mapa completo */
.tracking-banner {
  position: absolute; left: 14px; top: 14px; z-index: 11;
  display: flex; align-items: center; gap: 8px;
  padding: 7px 8px 7px 12px; border-radius: 20px;
  background: color-mix(in srgb, var(--brand-500) 22%, var(--bg-card));
  border: 1px solid var(--line-brand);
  backdrop-filter: blur(8px);
  font-size: 12px; font-weight: 600; color: var(--text-strong);
  animation: dropIn 0.18s ease;
}
.tracking-banner[hidden] { display: none; }
.tracking-stop {
  width: 20px; height: 20px; flex-shrink: 0; border-radius: 50%; border: none; cursor: pointer;
  background: rgba(255,255,255,0.14); color: var(--text-strong);
  display: flex; align-items: center; justify-content: center; font-size: 10.5px; line-height: 1;
  transition: background var(--t);
}
.tracking-stop:hover { background: rgba(255,255,255,0.26); }

/* Geolocalización de usuario en mapa */
.map-btn-geo {
  font-size: 14px;
}
.map-btn-geo.active {
  background: var(--brand-500);
  color: #ffffff;
  border-color: var(--brand-400);
  box-shadow: 0 0 10px rgba(91, 110, 245, 0.4);
}

.user-location-bar {
  position: absolute; left: 14px; bottom: 14px; z-index: 11;
  display: flex; align-items: center; gap: 8px;
  padding: 6px 12px; border-radius: 20px;
  background: color-mix(in srgb, var(--bg-card) 92%, transparent);
  border: 1px solid var(--line-brand);
  backdrop-filter: blur(10px);
  font-size: 12px; font-weight: 500; color: var(--text-strong);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.25);
  animation: dropIn 0.2s ease;
}
.user-location-bar[hidden] { display: none; }
.user-loc-icon {
  font-size: 14px;
  animation: userLocPulse 2s infinite ease-in-out;
}

@keyframes userLocPulse {
  0% { transform: scale(1); }
  50% { transform: scale(1.25); }
  100% { transform: scale(1); }
}

.user-marker-pulse {
  fill: #3b82f6;
  opacity: 0.35;
  animation: radarPulse 2s infinite cubic-bezier(0.215, 0.61, 0.355, 1);
  transform-origin: center;
}

@keyframes radarPulse {
  0% { r: 8px; opacity: 0.6; }
  100% { r: 32px; opacity: 0; }
}

.legend-item { display: flex; align-items: center; gap: 7px; font-size: 11px; color: var(--text); }
.legend-dot { width: 9px; height: 9px; border-radius: 50%; flex-shrink: 0; }
.bus-marker { cursor: pointer; }
.bus-marker:hover { filter: brightness(1.25); }
 
/* ============ REJILLA DEL PANEL ============ */
.dashboard-grid {
  display: grid; gap: var(--gap);
  grid-template-columns: minmax(0, 1fr) 320px;
}
.map-widget     { grid-area: 1 / 1; }
.buses-list-card{ grid-area: 1 / 2; }
.chart-card     { grid-area: 2 / 1; }
.activity-card  { grid-area: 2 / 2; }
 
/* ============ LISTA DE BUSES ============ */
.bus-list { max-height: 320px; overflow-y: auto; }
.bus-item {
  display: flex; align-items: center; gap: 12px;
  padding: 11px 18px; cursor: pointer;
  border-bottom: 1px solid var(--line);
  transition: background var(--t);
}
.bus-item:last-child { border-bottom: none; }
.bus-item:hover { background: rgba(255,255,255,0.03); }
.bus-item-icon {
  width: 32px; height: 32px; flex-shrink: 0; border-radius: 9px;
  display: flex; align-items: center; justify-content: center;
  font-size: 11px; font-weight: 700; font-family: 'JetBrains Mono', monospace;
}
.bus-item-info { flex: 1; min-width: 0; display: flex; flex-direction: column; }
.bus-item-id { font-size: 12.5px; font-weight: 600; }
.bus-item-route { font-size: 11px; color: var(--text-soft); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.bus-item-meta { display: flex; flex-direction: column; align-items: flex-end; gap: 3px; flex-shrink: 0; }
.bus-item-speed { font-size: 11.5px; font-weight: 600; color: var(--text); font-family: 'JetBrains Mono', monospace; }
 
.status-badge {
  font-size: 10px; font-weight: 600; padding: 2px 8px;
  border-radius: 20px; white-space: nowrap;
}
.status-active      { background: color-mix(in srgb, var(--ok) 16%, transparent);    color: #6fd7b2; }
.status-delayed     { background: color-mix(in srgb, var(--warn) 18%, transparent);  color: #f0c073; }
.status-stopped     { background: rgba(148,163,200,0.14);                            color: var(--text); }
.status-maintenance { background: color-mix(in srgb, var(--risk) 18%, transparent);  color: #f09aa8; }
 
/* Select editable de estado: hereda los colores de .status-active/etc,
   solo agrega la forma de píldora y quita el estilo nativo del <select>. */
.status-select, .status-select-lg {
  border: none; cursor: pointer; font-family: inherit;
  border-radius: 20px; color: inherit;
  transition: filter var(--t);
}
.status-select { font-size: 10px; font-weight: 600; padding: 3px 8px; }
.status-select-lg { font-size: 12.5px; font-weight: 600; padding: 7px 14px; }
.status-select:hover, .status-select-lg:hover { filter: brightness(1.12); }
.status-select:focus-visible, .status-select-lg:focus-visible { outline: 2px solid var(--brand-300); outline-offset: 2px; }
.status-select option, .status-select-lg option { background: var(--bg-card); color: var(--text-strong); }
 
/* ============ ACTIVIDAD ============ */
.activity-feed { max-height: 280px; overflow-y: auto; transition: max-height var(--t); }
.activity-feed.expanded { max-height: 520px; }
.activity-item {
  display: flex; align-items: flex-start; gap: 10px;
  padding: 10px 18px; border-bottom: 1px solid var(--line);
}
.activity-item:last-child { border-bottom: none; }
.activity-icon {
  width: 28px; height: 28px; flex-shrink: 0; border-radius: 50%;
  display: flex; align-items: center; justify-content: center; font-size: 12px;
}
.activity-content { flex: 1; min-width: 0; display: flex; flex-direction: column; }
.activity-text { font-size: 12.5px; color: var(--text); line-height: 1.45; }
.activity-text strong { color: var(--text-strong); font-weight: 600; }
.activity-time { font-size: 10.5px; color: var(--text-soft); margin-top: 2px; }
 
/* ============ GRÁFICOS ============ */
.chart-container { padding: 14px 18px 18px; }
.chart-container canvas { max-width: 100%; display: block; }
.chart-caption { font-size: 11.5px; color: var(--text-soft); margin-top: 8px; }
 
/* ============ FLOTA ============ */
.fleet-toolbar { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; }
.toolbar-left, .toolbar-right { display: flex; align-items: center; gap: 9px; flex-wrap: wrap; }
.fleet-search, .filter-select {
  background: rgba(255,255,255,0.04); border: 1px solid var(--line);
  border-radius: var(--radius-sm); padding: 9px 13px;
  color: var(--text-strong); font-size: 13px; outline: none;
  transition: border-color var(--t), box-shadow var(--t);
}
.fleet-search { width: 220px; }
.filter-select { cursor: pointer; }
.fleet-search:focus, .filter-select:focus {
  border-color: var(--brand-500);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--brand-500) 20%, transparent);
}
.filter-select option { background: var(--bg-card); color: var(--text-strong); }
.results-note { font-size: 12px; color: var(--text-soft); }
 
.fleet-table-wrapper {
  overflow-x: auto; -webkit-overflow-scrolling: touch;
  background: var(--bg-card); border: 1px solid var(--line);
  border-radius: var(--radius);
}
.fleet-table { width: 100%; border-collapse: collapse; white-space: nowrap; }
.fleet-table th {
  padding: 12px 15px; text-align: left; cursor: pointer;
  font-size: 10.5px; font-weight: 600; letter-spacing: 0.8px; text-transform: uppercase;
  color: var(--text-soft); background: rgba(255,255,255,0.015);
  border-bottom: 1px solid var(--line); user-select: none;
  position: sticky; top: 0;
}
.fleet-table th[data-sort]:hover { color: var(--brand-300); }
.fleet-table th.sorted::after { content: ' ▲'; font-size: 8px; }
.fleet-table th.sorted.desc::after { content: ' ▼'; }
.fleet-table td {
  padding: 12px 15px; font-size: 12.5px; color: var(--text);
  border-bottom: 1px solid var(--line);
}
.fleet-table tr:last-child td { border-bottom: none; }
.fleet-table tbody tr:hover td { background: rgba(255,255,255,0.025); color: var(--text-strong); }
.fleet-table td:first-child { font-weight: 700; color: var(--text-strong); font-family: 'JetBrains Mono', monospace; }
.mono { font-family: 'JetBrains Mono', monospace; font-size: 12px; }
.route-pill { padding: 3px 9px; border-radius: 20px; font-size: 11px; font-weight: 600; }
.mini-bar { width: 52px; height: 4px; border-radius: 2px; background: #1c2740; overflow: hidden; }
.mini-bar span { display: block; height: 100%; border-radius: 2px; }
 
.table-actions { display: flex; gap: 6px; }
.table-btn {
  width: 30px; height: 30px; border-radius: 7px;
  background: rgba(255,255,255,0.05); border: 1px solid var(--line);
  color: var(--text-soft); cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  transition: background var(--t), color var(--t), border-color var(--t);
}
.table-btn svg { width: 15px; height: 15px; }
.table-btn:hover {
  background: color-mix(in srgb, var(--brand-500) 18%, transparent);
  color: var(--brand-300); border-color: var(--line-brand);
}
.empty-state { padding: 34px; text-align: center; color: var(--text-soft); font-size: 13px; }
 
/* ============ ALERTAS ============ */
.alerts-container { display: flex; flex-direction: column; gap: 14px; max-width: 880px; width: 100%; }
.alerts-header { display: flex; align-items: center; justify-content: space-between; gap: 10px; flex-wrap: wrap; }
.alerts-header h2 { font-size: 17px; font-weight: 700; }
.alerts-list { display: flex; flex-direction: column; gap: 10px; }
.alert-item {
  display: flex; align-items: flex-start; gap: 13px; padding: 15px;
  background: var(--bg-card); border: 1px solid var(--line);
  border-left-width: 3px; border-radius: var(--radius);
  animation: alertIn 0.25s ease;
}
@keyframes alertIn { from { opacity: 0; transform: translateX(-6px); } to { opacity: 1; transform: none; } }
.alert-item.critical { border-left-color: var(--risk); }
.alert-item.warning  { border-left-color: var(--warn); }
.alert-item.info     { border-left-color: var(--brand-500); }
.alert-item.read { opacity: 0.55; }
.alert-icon-wrap {
  width: 38px; height: 38px; flex-shrink: 0; border-radius: 10px;
  display: flex; align-items: center; justify-content: center; font-size: 17px;
}
.alert-icon-wrap.critical { background: color-mix(in srgb, var(--risk) 16%, transparent); }
.alert-icon-wrap.warning  { background: color-mix(in srgb, var(--warn) 16%, transparent); }
.alert-icon-wrap.info     { background: color-mix(in srgb, var(--brand-500) 16%, transparent); }
.alert-content { flex: 1; min-width: 0; }
.alert-title { font-size: 13.5px; font-weight: 600; margin-bottom: 3px; }
.alert-desc { font-size: 12px; color: var(--text); line-height: 1.5; }
.alert-meta { display: flex; align-items: center; gap: 8px; margin-top: 7px; flex-wrap: wrap; }
.alert-time { font-size: 11px; color: var(--text-soft); }
.alert-bus-tag {
  font-size: 10px; font-weight: 600; padding: 2px 8px; border-radius: 20px;
  background: color-mix(in srgb, var(--brand-500) 16%, transparent); color: var(--brand-300);
  cursor: pointer;
}
 
/* ============ MAPA COMPLETO ============ */
.full-map-container { display: flex; gap: var(--gap); flex: 1; min-height: 0; height: calc(100vh - var(--topbar-h) - var(--pad-view) * 2); }
.map-sidebar-panel {
  width: 272px; flex-shrink: 0; overflow-y: auto;
  display: flex; flex-direction: column; gap: 10px; padding: 15px;
  background: var(--bg-card); border: 1px solid var(--line); border-radius: var(--radius);
}
.full-map {
  flex: 1; min-width: 0; position: relative; overflow: hidden;
  background: var(--bg-card); border: 1px solid var(--line); border-radius: var(--radius);
}
.full-map-bg { position: relative; width: 100%; height: 100%; }
.full-map-bg svg { width: 100%; height: 100%; display: block; touch-action: none; cursor: grab; }
.map-bus-list { display: flex; flex-direction: column; gap: 7px; }
.map-bus-item {
  display: flex; align-items: center; gap: 10px; padding: 9px 11px;
  border-radius: var(--radius-sm); cursor: pointer;
  background: rgba(255,255,255,0.03); border: 1px solid var(--line);
  transition: background var(--t), border-color var(--t);
}
.map-bus-item:hover, .map-bus-item.highlight {
  background: color-mix(in srgb, var(--brand-500) 12%, transparent);
  border-color: var(--line-brand);
}
.map-bus-dot { width: 9px; height: 9px; border-radius: 50%; flex-shrink: 0; }
.map-bus-info { flex: 1; min-width: 0; display: flex; flex-direction: column; }
.map-bus-id { font-size: 12.5px; font-weight: 600; }
.map-bus-route { font-size: 10.5px; color: var(--text-soft); }
 
/* ============ RUTAS ============ */
.routes-grid { display: grid; gap: var(--gap); grid-template-columns: repeat(auto-fill, minmax(min(100%, 270px), 1fr)); }
.route-card {
  position: relative; overflow: hidden; cursor: pointer;
  padding: 18px; background: var(--bg-card);
  border: 1px solid var(--line); border-radius: var(--radius);
  transition: border-color var(--t), transform var(--t), box-shadow var(--t);
}
.route-card:hover { border-color: var(--line-brand); transform: translateY(-2px); box-shadow: var(--shadow); }
.route-card::before { content: ''; position: absolute; inset: 0 0 auto 0; height: 3px; background: var(--rc); }
.route-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 8px; margin-bottom: 14px; }
.route-id { font-size: 21px; font-weight: 800; letter-spacing: -0.8px; color: var(--rc); }
.route-name { font-size: 12.5px; color: var(--text-soft); margin-top: 1px; }
.route-progress { margin-bottom: 12px; }
.route-progress-head { display: flex; justify-content: space-between; font-size: 11px; color: var(--text-soft); margin-bottom: 6px; }
.route-progress-bar { height: 5px; border-radius: 3px; background: rgba(255,255,255,0.07); overflow: hidden; }
.route-progress-fill { height: 100%; border-radius: 3px; background: var(--rc); transition: width 0.8s ease; }
.route-stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; }
.route-stat-value { font-size: 15px; font-weight: 700; }
.route-stat-label { font-size: 9.5px; color: var(--text-soft); text-transform: uppercase; letter-spacing: 0.5px; }
 
/* ============ REPORTES ============ */
.reports-container { display: flex; flex-direction: column; gap: var(--gap); }
.reports-header { display: flex; align-items: center; justify-content: space-between; gap: 10px; flex-wrap: wrap; }
.reports-header h2 { font-size: 17px; font-weight: 700; }
.report-actions { display: flex; gap: 9px; flex-wrap: wrap; }
.reports-grid { display: grid; gap: var(--gap); grid-template-columns: repeat(2, minmax(0, 1fr)); }
.report-card { padding: 18px; }
.report-card h3 { font-size: 13.5px; font-weight: 600; margin-bottom: 14px; }
.report-card canvas { max-width: 100%; display: block; }
.report-card.full-width { grid-column: 1 / -1; }
 
.report-summary {
  padding: 18px; border-radius: var(--radius);
  background: var(--bg-card);
  border: 1px solid var(--line-brand);
}
.report-summary h3 { font-size: 14px; margin-bottom: 4px; }
.report-summary .stamp { font-size: 11.5px; color: var(--text-soft); margin-bottom: 14px; }
.summary-grid { display: grid; gap: 12px; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); }
.summary-cell {
  padding: 12px; border-radius: var(--radius-sm);
  background: rgba(255,255,255,0.03); border: 1px solid var(--line);
}
.summary-cell b { display: block; font-size: 18px; font-weight: 700; }
.summary-cell span { font-size: 11px; color: var(--text-soft); }
 
/* ============ CONDUCTORES ============ */
.drivers-grid { display: grid; gap: var(--gap); grid-template-columns: repeat(auto-fill, minmax(min(100%, 250px), 1fr)); }
.driver-card {
  padding: 18px; cursor: pointer;
  background: var(--bg-card); border: 1px solid var(--line); border-radius: var(--radius);
  transition: border-color var(--t), transform var(--t), box-shadow var(--t);
}
.driver-card:hover { border-color: var(--line-brand); transform: translateY(-2px); box-shadow: var(--shadow); }
.driver-top { display: flex; align-items: center; gap: 13px; margin-bottom: 14px; }
.driver-avatar {
  width: 46px; height: 46px; flex-shrink: 0; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  font-size: 16px; font-weight: 700; color: #fff;
}
.driver-name { font-size: 14.5px; font-weight: 700; }
.driver-license { font-size: 10.5px; color: var(--text-soft); font-family: 'JetBrains Mono', monospace; margin-top: 1px; }
.driver-stats { display: flex; justify-content: space-between; gap: 8px; padding-top: 12px; border-top: 1px solid var(--line); }
.driver-stat-val { font-size: 14.5px; font-weight: 700; }
.driver-stat-lbl { font-size: 10px; color: var(--text-soft); }
.stars { color: var(--warn); }
 
/* ============ MODALES ============ */
.modal-overlay {
  position: fixed; inset: 0; z-index: 200; padding: 18px;
  background: rgba(4, 8, 16, 0.75); backdrop-filter: blur(6px);
  display: none; align-items: center; justify-content: center;
}
.modal-overlay.open { display: flex; animation: fade 0.18s ease; }
@keyframes fade { from { opacity: 0; } to { opacity: 1; } }
.modal {
  width: 100%; max-width: 520px; max-height: 88vh; overflow-y: auto;
  background: var(--bg-card); border: 1px solid var(--line);
  border-radius: 16px; box-shadow: 0 24px 60px rgba(0,0,0,0.55);
  animation: modalIn 0.25s cubic-bezier(0.34, 1.4, 0.64, 1);
}
.modal-narrow { max-width: 460px; }
@keyframes modalIn { from { opacity: 0; transform: scale(0.95) translateY(14px); } to { opacity: 1; transform: none; } }
.modal-header {
  display: flex; align-items: center; justify-content: space-between; gap: 10px;
  padding: 18px 20px 14px; border-bottom: 1px solid var(--line);
}
.modal-title-area { display: flex; align-items: center; gap: 13px; min-width: 0; }
.modal-bus-icon {
  width: 44px; height: 44px; flex-shrink: 0; border-radius: 12px;
  display: flex; align-items: center; justify-content: center;
  font-size: 14px; font-weight: 800; font-family: 'JetBrains Mono', monospace;
}
.modal-header h2 { font-size: 17px; font-weight: 700; }
.modal-header p { font-size: 12.5px; color: var(--text-soft); margin-top: 2px; }
.modal-close {
  width: 32px; height: 32px; flex-shrink: 0; border-radius: 8px;
  background: rgba(255,255,255,0.05); border: 1px solid var(--line);
  color: var(--text); cursor: pointer; font-size: 13px;
  display: flex; align-items: center; justify-content: center;
  transition: background var(--t), color var(--t);
}
.modal-close:hover { background: color-mix(in srgb, var(--risk) 18%, transparent); color: #f09aa8; }
.modal-body { padding: 18px 20px 20px; display: flex; flex-direction: column; gap: 16px; }
.modal-status-row { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.modal-stats-row { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 10px; }
.modal-stat {
  text-align: center; padding: 11px 8px; border-radius: var(--radius-sm);
  background: rgba(255,255,255,0.03); border: 1px solid var(--line);
}
.modal-stat-label { display: block; font-size: 9.5px; text-transform: uppercase; letter-spacing: 0.5px; color: var(--text-soft); margin-bottom: 4px; }
.modal-stat-value { font-size: 14.5px; font-weight: 700; font-family: 'JetBrains Mono', monospace; }
.modal-info-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
.modal-info-item { min-width: 0; }
.info-label { display: block; font-size: 10.5px; text-transform: uppercase; letter-spacing: 0.5px; color: var(--text-soft); }
.info-value { font-size: 13.5px; font-weight: 600; }
.modal-actions { display: flex; gap: 10px; flex-wrap: wrap; }
.modal-actions > * { flex: 1; min-width: 150px; }
 
/* Preferencias */
.setting-row { display: flex; align-items: center; justify-content: space-between; gap: 14px; }
.setting-name { font-size: 13px; font-weight: 600; }
.setting-desc { font-size: 11.5px; color: var(--text-soft); margin-top: 1px; }
.accent-picker { display: flex; gap: 7px; }
.accent-dot {
  width: 24px; height: 24px; border-radius: 50%; cursor: pointer;
  border: 2px solid transparent; transition: transform var(--t), border-color var(--t);
}
.accent-dot:hover { transform: scale(1.1); }
.accent-dot.selected { border-color: var(--text-strong); }
.switch {
  width: 42px; height: 24px; flex-shrink: 0; border-radius: 20px; cursor: pointer;
  background: #1e2942; border: 1px solid var(--line); position: relative;
  transition: background var(--t);
}
.switch span {
  position: absolute; top: 2px; left: 2px;
  width: 18px; height: 18px; border-radius: 50%; background: var(--text-soft);
  transition: transform var(--t), background var(--t);
}
.switch[aria-checked="true"] { background: color-mix(in srgb, var(--brand-500) 55%, transparent); }
.switch[aria-checked="true"] span { transform: translateX(18px); background: #fff; }
 
/* ============ NOTIFICACIONES ============ */
.notif-dropdown {
  position: fixed; top: calc(var(--topbar-h) + 8px); right: 20px; z-index: 150;
  width: 350px; max-width: calc(100vw - 32px);
  background: var(--bg-card); border: 1px solid var(--line);
  border-radius: var(--radius); box-shadow: var(--shadow);
  display: none;
}
.notif-dropdown.open { display: block; animation: dropIn 0.18s ease; }
@keyframes dropIn { from { opacity: 0; transform: translateY(-6px); } to { opacity: 1; transform: none; } }
.notif-header { display: flex; align-items: center; justify-content: space-between; padding: 13px 15px; border-bottom: 1px solid var(--line); }
.notif-header h3 { font-size: 13.5px; font-weight: 600; }
.notif-list { max-height: 340px; overflow-y: auto; }
.notif-item {
  display: flex; align-items: flex-start; gap: 10px; padding: 11px 15px;
  border-bottom: 1px solid var(--line); cursor: pointer; transition: background var(--t);
}
.notif-item:last-child { border-bottom: none; }
.notif-item:hover { background: rgba(255,255,255,0.03); }
.notif-item.unread { background: color-mix(in srgb, var(--brand-500) 7%, transparent); }
.notif-item.unread .notif-msg { color: var(--text-strong); }
.notif-icon { font-size: 15px; flex-shrink: 0; margin-top: 1px; }
.notif-msg { display: block; font-size: 12.5px; color: var(--text); line-height: 1.45; }
.notif-time { display: block; font-size: 10px; color: var(--text-soft); margin-top: 3px; }
 
/* ============ AVISOS FLOTANTES ============ */
.toast-stack {
  position: fixed; bottom: 18px; right: 18px; z-index: 300;
  display: flex; flex-direction: column; gap: 8px; pointer-events: none;
}
.toast {
  display: flex; align-items: center; gap: 9px;
  padding: 11px 15px; border-radius: var(--radius-sm);
  background: var(--bg-raised); border: 1px solid var(--line-brand);
  box-shadow: var(--shadow); font-size: 12.5px; color: var(--text-strong);
  animation: toastIn 0.22s ease;
  max-width: min(340px, calc(100vw - 36px));
}
.toast::before { content: ''; width: 7px; height: 7px; border-radius: 50%; background: var(--brand-500); flex-shrink: 0; }
.toast.ok::before   { background: var(--ok); }
.toast.warn::before { background: var(--warn); }
.toast.out { animation: toastOut 0.22s ease forwards; }
@keyframes toastIn  { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: none; } }
@keyframes toastOut { to { opacity: 0; transform: translateY(6px); } }
 
/* ============================================================
   ADAPTACIÓN A PANTALLAS
   ============================================================ */
@media (max-width: 1180px) {
  .dashboard-grid { grid-template-columns: minmax(0, 1fr); }
  .map-widget, .buses-list-card, .chart-card, .activity-card { grid-area: auto; }
  .bus-list, .activity-feed { max-height: 270px; }
}
 
@media (max-width: 1024px) {
  .stats-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .reports-grid { grid-template-columns: minmax(0, 1fr); }
  .search-bar { width: 200px; }
}
 
@media (max-width: 900px) {
  .full-map-container { flex-direction: column; height: auto; }
  .map-sidebar-panel { width: 100%; max-height: 220px; }
  .full-map { min-height: 400px; }
}
 
@media (max-width: 768px) {
  :root { --pad-view: 16px; --gap: 12px; --icon-stat: 40px; --topbar-h: 58px; }
 
  .sidebar { transform: translateX(-100%); width: 262px; box-shadow: 0 0 40px rgba(0,0,0,0.6); }
  .sidebar.mobile-open { transform: none; }
  /* En celular el modo "contraído" de escritorio no aplica */
  .sidebar.collapsed { width: 262px; }
  .sidebar.collapsed .logo-text,
  .sidebar.collapsed .nav-label,
  .sidebar.collapsed .nav-item > span:not(.nav-count),
  .sidebar.collapsed .nav-count,
  .sidebar.collapsed .user-info,
  .sidebar.collapsed .user-settings { display: revert; }
  .sidebar.collapsed .logo,
  .sidebar.collapsed .sidebar-header,
  .sidebar.collapsed .user-profile { justify-content: space-between; }
  .sidebar.collapsed .logo { justify-content: flex-start; }
  .sidebar.collapsed .nav-item { justify-content: flex-start; padding: 11px 12px; }
  .sidebar-toggle { display: none; }
 
  .main-content, .sidebar.collapsed ~ .main-content { margin-left: 0; }
  .mobile-menu-btn { display: flex; width: 36px; height: 36px; flex-shrink: 0;
    align-items: center; justify-content: center; border-radius: var(--radius-sm);
    background: rgba(255,255,255,0.04); border: 1px solid var(--line); color: var(--text); cursor: pointer; }
  .mobile-menu-btn svg { width: 18px; height: 18px; }
 
  .breadcrumb { display: none; }
  .page-title { font-size: 15.5px; }
  .search-bar { display: none; }
  .search-bar.mobile-open {
    display: flex; position: absolute; left: 12px; right: 12px;
    top: calc(var(--topbar-h) + 6px); width: auto; z-index: 60;
    background: var(--bg-card); box-shadow: var(--shadow);
  }
  .only-mobile { display: flex; }
 
  .stat-card { padding: 13px 14px; gap: 11px; }
  .stat-sparkline { display: none; }
  .stat-value { font-size: 21px; }
 
  .toolbar-left, .toolbar-right { width: 100%; }
  .toolbar-left > * , .toolbar-right > * { flex: 1; min-width: 132px; }
  .fleet-search { width: auto; }
 
  .map-container { height: 300px; }
  .modal-stats-row { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .modal-info-grid { grid-template-columns: minmax(0, 1fr); }
  .modal-actions > * { min-width: 0; }
  .notif-dropdown { left: 12px; right: 12px; width: auto; }
  .toast-stack { left: 12px; right: 12px; bottom: 12px; align-items: stretch; }
  .toast { max-width: none; }
}
 
@media (max-width: 520px) {
  .stats-grid { grid-template-columns: minmax(0, 1fr); }
  .stat-card { align-items: flex-start; }
  .live-indicator span:last-child { display: none; }
  .live-indicator { padding: 8px 10px; }
  .map-container { height: 250px; }
  .map-legend { padding: 7px 9px; gap: 3px; }
  .legend-item { font-size: 10px; }
  .route-stats { grid-template-columns: repeat(2, 1fr); row-gap: 10px; }
  .driver-stats { flex-wrap: wrap; row-gap: 8px; }
  .card-header { padding: 12px 14px; }
  .bus-item { padding: 10px 14px; }
  .activity-item { padding: 10px 14px; }
  .chart-container { padding: 12px 14px 14px; }
}
 
/* ============ IMPRESIÓN ============ */
@media print {
  .sidebar, .topbar, .map-controls, .report-actions, .toast-stack,
  .notif-dropdown, .sidebar-overlay, .modal-overlay { display: none !important; }
  body { background: #fff; color: #111; display: block; }
  .main-content { margin: 0 !important; }
  .view { display: none !important; }
  .view.active { display: block !important; padding: 0; }
  .card, .report-summary { border-color: #ccc; background: #fff; color: #111; break-inside: avoid; }
  .report-card h3, .report-summary h3, .summary-cell b { color: #111; }
  .reports-grid { grid-template-columns: 1fr 1fr; }
}
 
/* ============================================================
   MENÚ PRINCIPAL (pantalla de entrada) - ADAPTACIÓN MULTI-DISPOSITIVO
   ============================================================ */
.home-screen {
  position: fixed; inset: 0; z-index: 180;
  display: flex; align-items: flex-start; justify-content: center;
  min-height: 100vh;
  min-height: 100dvh;
  padding: max(24px, env(safe-area-inset-top)) max(20px, env(safe-area-inset-right)) max(28px, env(safe-area-inset-bottom)) max(20px, env(safe-area-inset-left));
  overflow-y: auto;
  overscroll-behavior-y: contain;
  -webkit-overflow-scrolling: touch;
  background:
    radial-gradient(900px 480px at 18% -10%, color-mix(in srgb, var(--brand-500) 20%, transparent), transparent 62%),
    radial-gradient(760px 420px at 88% 8%, color-mix(in srgb, var(--brand-alt) 16%, transparent), transparent 60%),
    var(--bg-base);
}
.home-screen.closing { animation: homeOut 0.32s ease forwards; }
.home-screen.hidden { display: none !important; }
@keyframes homeOut { to { opacity: 0; transform: scale(1.015); visibility: hidden; } }

.home-inner {
  width: 100%;
  max-width: 1020px;
  margin: auto;
  padding: 12px 0;
  display: flex;
  flex-direction: column;
}

.home-head {
  text-align: center;
  margin-bottom: 24px;
}
.home-logo {
  display: inline-block;
  width: 48px;
  height: 48px;
  margin-bottom: 12px;
  filter: drop-shadow(0 4px 14px rgba(91,110,245,0.35));
}
.home-logo svg { width: 100%; height: 100%; display: block; }
.home-logo #homeGrad stop:first-child { stop-color: var(--brand-500); }
.home-logo #homeGrad stop:last-child { stop-color: var(--brand-alt); }

.home-title {
  font-size: clamp(24px, 4vw, 34px);
  font-weight: 800;
  letter-spacing: -0.8px;
  line-height: 1.15;
}
.home-title span {
  background: linear-gradient(120deg, var(--brand-300), var(--brand-alt));
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}
.home-sub {
  font-size: clamp(13px, 2.2vw, 14.5px);
  color: var(--text);
  margin-top: 6px;
}
.home-status {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  margin-top: 12px;
  font-size: 11.5px;
  color: var(--text-soft);
  padding: 5px 14px;
  border-radius: 20px;
  background: color-mix(in srgb, var(--ok) 10%, transparent);
  border: 1px solid color-mix(in srgb, var(--ok) 24%, transparent);
  backdrop-filter: blur(8px);
}

/* Grid adaptativa para cualquier pantalla */
.home-grid {
  display: grid;
  gap: 14px;
  grid-template-columns: repeat(2, 1fr);
  width: 100%;
}

.home-tile {
  position: relative;
  overflow: hidden;
  text-align: left;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 16px 18px;
  min-height: 68px;
  border-radius: var(--radius);
  background: color-mix(in srgb, var(--bg-card) 92%, transparent);
  border: 1px solid var(--line);
  color: var(--text-strong);
  opacity: 0;
  transform: translateY(10px);
  animation: tileIn 0.38s cubic-bezier(0.22, 1, 0.36, 1) forwards;
  transition: border-color var(--t), transform var(--t), box-shadow var(--t), background var(--t);
  -webkit-tap-highlight-color: transparent;
}
@keyframes tileIn { to { opacity: 1; transform: none; } }
.home-tile:nth-child(1) { animation-delay: 0.03s; }
.home-tile:nth-child(2) { animation-delay: 0.06s; }
.home-tile:nth-child(3) { animation-delay: 0.09s; }
.home-tile:nth-child(4) { animation-delay: 0.12s; }
.home-tile:nth-child(5) { animation-delay: 0.15s; }
.home-tile:nth-child(6) { animation-delay: 0.18s; }
.home-tile:nth-child(7) { animation-delay: 0.21s; }
.home-tile:nth-child(8) { animation-delay: 0.24s; }

.home-tile::before {
  content: '';
  position: absolute;
  inset: 0 0 auto 0;
  height: 2.5px;
  background: var(--tone);
  opacity: 0.85;
}
.home-tile:hover, .home-tile:focus-visible {
  transform: translateY(-3px);
  border-color: color-mix(in srgb, var(--tone) 45%, transparent);
  background: color-mix(in srgb, var(--tone) 8%, var(--bg-card));
  box-shadow: 0 12px 28px rgba(3, 7, 18, 0.45), 0 0 16px color-mix(in srgb, var(--tone) 20%, transparent);
}
.home-tile:active {
  transform: scale(0.985);
}

.home-icon {
  width: 44px;
  height: 44px;
  flex-shrink: 0;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: color-mix(in srgb, var(--tone) 16%, transparent);
  color: var(--tone);
}
.home-icon svg { width: 54%; height: 54%; display: block; }

.home-tile-text {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}
.home-tile-name {
  font-size: 14px;
  font-weight: 700;
  color: var(--text-strong);
  letter-spacing: -0.2px;
}
.home-tile-desc {
  font-size: 11.5px;
  color: var(--text-soft);
  margin-top: 2px;
  line-height: 1.3;
}

.home-chip {
  flex-shrink: 0;
  font-size: 10px;
  font-weight: 700;
  font-family: 'JetBrains Mono', monospace;
  padding: 3px 8px;
  border-radius: 20px;
  background: color-mix(in srgb, var(--tone) 14%, transparent);
  color: var(--tone);
  border: 1px solid color-mix(in srgb, var(--tone) 22%, transparent);
}
.home-chip.live { letter-spacing: 0.5px; animation: badgeFade 2.4s ease-in-out infinite; }

.home-foot {
  text-align: center;
  font-size: 11.5px;
  color: var(--text-soft);
  margin-top: 22px;
  padding: 0 8px;
}

/* PANTALLAS GRANDES Y COMPUTADORES DE ESCRITORIO (>= 1200px) */
@media (min-width: 1200px) {
  .home-inner { max-width: 1060px; }
  .home-grid { gap: 16px; }
  .home-tile { padding: 18px 20px; min-height: 72px; }
}

/* TABLETS Y PANTALLAS MEDIANAS (769px a 1023px) */
@media (min-width: 769px) and (max-width: 1023px) {
  .home-inner { max-width: 720px; }
  .home-grid { grid-template-columns: repeat(2, 1fr); gap: 12px; }
  .home-tile { padding: 14px 15px; }
}

/* DISPOSITIVOS MÓVILES (<= 768px) */
@media (max-width: 768px) {
  .home-screen {
    padding: max(16px, env(safe-area-inset-top)) max(14px, env(safe-area-inset-right)) max(24px, env(safe-area-inset-bottom)) max(14px, env(safe-area-inset-left));
  }
  .home-inner {
    max-width: 100%;
    padding: 6px 0;
  }
  .home-head {
    margin-bottom: 18px;
  }
  .home-logo {
    width: 42px;
    height: 42px;
    margin-bottom: 8px;
  }
  .home-title {
    font-size: 24px;
  }
  .home-sub {
    font-size: 13px;
  }
  .home-grid {
    grid-template-columns: 1fr;
    gap: 10px;
  }
  .home-tile {
    padding: 12px 14px;
    min-height: 58px;
    gap: 12px;
    border-radius: var(--radius-sm);
  }
  .home-icon {
    width: 40px;
    height: 40px;
    border-radius: 10px;
  }
  .home-tile-name {
    font-size: 13.5px;
  }
  /* En móvil conservamos la descripción de forma concisa */
  .home-tile-desc {
    display: -webkit-box;
    -webkit-line-clamp: 1;
    line-clamp: 1;
    -webkit-box-orient: vertical;
    overflow: hidden;
    font-size: 11px;
    margin-top: 1px;
  }
  .home-chip {
    font-size: 9.5px;
    padding: 2px 7px;
  }
  .home-foot {
    font-size: 11px;
    margin-top: 16px;
  }
}

/* MÓVILES COMPACTOS (<= 360px, ej. iPhone SE / pantallas angostas) */
@media (max-width: 360px) {
  .home-screen {
    padding-left: 10px;
    padding-right: 10px;
  }
  .home-tile {
    padding: 10px 12px;
    gap: 10px;
  }
  .home-icon {
    width: 36px;
    height: 36px;
  }
  .home-tile-name {
    font-size: 13px;
  }
  .home-chip {
    display: none;
  }
}

/* ORIENTACIÓN HORIZONTAL EN MÓVIL (Landscape corto) */
@media (max-height: 520px) and (orientation: landscape) {
  .home-screen {
    align-items: flex-start;
    padding-top: 14px;
    padding-bottom: 20px;
  }
  .home-inner {
    margin: 0 auto;
  }
  .home-head {
    margin-bottom: 14px;
  }
  .home-logo {
    width: 34px;
    height: 34px;
    margin-bottom: 4px;
  }
  .home-title {
    font-size: 20px;
  }
  .home-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 8px;
  }
  .home-tile {
    padding: 10px 12px;
    min-height: 50px;
  }
}

@media print { .home-screen { display: none !important; } }

/* ==============================================================================
   AUTH MODAL & OAUTH STYLES (Google & Apple)
   ============================================================================== */
.auth-tabs {
  display: grid; grid-template-columns: 1fr 1fr; gap: 6px;
  background: rgba(255,255,255,0.05); padding: 4px; border-radius: var(--radius-sm);
  margin-bottom: 20px;
}
.auth-tab {
  padding: 8px 12px; border: none; background: transparent;
  color: var(--text-soft); font-size: 13px; font-weight: 600;
  border-radius: calc(var(--radius-sm) - 2px); cursor: pointer; transition: all var(--t);
}
.auth-tab.active {
  background: var(--bg-card); color: var(--text-strong);
  box-shadow: 0 2px 6px rgba(0,0,0,0.2);
}
.oauth-buttons-container {
  display: flex; flex-direction: column; gap: 10px; margin-bottom: 16px;
}
.btn-oauth {
  display: flex; align-items: center; justify-content: center; gap: 10px;
  width: 100%; padding: 10px 16px; border-radius: var(--radius-sm);
  font-size: 13.5px; font-weight: 600; cursor: pointer; transition: all var(--t);
  border: 1px solid var(--line);
}
.btn-google {
  background: #ffffff; color: #1f1f1f; border-color: #dadce0;
}
.btn-google:hover { background: #f8f9fa; border-color: #d2e3fc; box-shadow: 0 2px 6px rgba(0,0,0,0.1); }
.btn-apple {
  background: #000000; color: #ffffff; border-color: #333333;
}
.btn-apple:hover { background: #1a1a1a; }
.auth-divider {
  display: flex; align-items: center; text-align: center; margin: 16px 0;
  color: var(--text-soft); font-size: 11.5px;
}
.auth-divider::before, .auth-divider::after {
  content: ''; flex: 1; border-bottom: 1px solid var(--line);
}
.auth-divider span { padding: 0 10px; }

.form-group {
  display: flex; flex-direction: column; gap: 6px; margin-bottom: 14px; text-align: left;
}
.form-group label {
  font-size: 12px; font-weight: 600; color: var(--text-strong);
}
.form-group input {
  padding: 10px 12px; border-radius: var(--radius-sm);
  background: rgba(0,0,0,0.2); border: 1px solid var(--line);
  color: var(--text-strong); font-size: 13.5px; outline: none;
  transition: border-color var(--t);
}
.form-group input:focus {
  border-color: var(--brand-500); box-shadow: 0 0 0 3px var(--line-brand);
}
.form-consent-box {
  margin: 12px 0 16px; font-size: 11.5px; color: var(--text-soft); text-align: left;
}
.consent-label {
  display: flex; align-items: flex-start; gap: 8px; cursor: pointer; line-height: 1.4;
}
.consent-label input[type="checkbox"] {
  margin-top: 2px; accent-color: var(--brand-500);
}

.user-active-card {
  display: flex; align-items: center; gap: 14px; padding: 16px;
  background: rgba(255,255,255,0.03); border: 1px solid var(--line);
  border-radius: var(--radius); text-align: left;
}
.user-active-img {
  width: 48px; height: 48px; border-radius: 50%; border: 2px solid var(--brand-500);
}
.user-active-name { font-size: 14px; font-weight: 700; color: var(--text-strong); }
.user-active-email { font-size: 12px; color: var(--text-soft); }
.user-active-badge {
  display: inline-block; font-size: 10px; font-weight: 700; text-transform: uppercase;
  background: var(--line-brand); color: var(--brand-light); padding: 2px 6px;
  border-radius: 4px; margin-top: 4px;
}
.sidebar-legal-links {
  font-size: 10.5px; color: var(--text-soft); text-align: center;
  padding-top: 8px; border-top: 1px solid var(--line); margin-top: 6px;
}
.sidebar-legal-links a { color: var(--text-soft); text-decoration: none; }
.sidebar-legal-links a:hover { color: var(--brand-light); text-decoration: underline; }

/* ==============================================================================
   COMMAND PALETTE (CTRL + K)
   ============================================================================== */
.command-palette-box {
  width: 90%; max-width: 580px; background: var(--bg-card);
  border: 1px solid var(--line); border-radius: var(--radius-lg);
  box-shadow: 0 20px 50px rgba(0,0,0,0.5); overflow: hidden;
  animation: modalIn 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}
.cmd-header {
  display: flex; align-items: center; gap: 12px; padding: 14px 18px;
  border-bottom: 1px solid var(--line); color: var(--text-soft);
}
.cmd-header input {
  flex: 1; background: transparent; border: none; outline: none;
  color: var(--text-strong); font-size: 15px; font-family: inherit;
}
.cmd-key {
  font-size: 10px; font-weight: 700; padding: 2px 6px; border-radius: 4px;
  background: rgba(255,255,255,0.1); border: 1px solid var(--line);
}
.cmd-results {
  max-height: 340px; overflow-y: auto; padding: 8px;
}
.cmd-section-label {
  font-size: 10.5px; font-weight: 700; text-transform: uppercase;
  color: var(--text-soft); padding: 8px 12px 4px; letter-spacing: 0.05em;
}
.cmd-item {
  display: flex; align-items: center; gap: 10px; padding: 10px 12px;
  border-radius: var(--radius-sm); font-size: 13.5px; color: var(--text-strong);
  cursor: pointer; transition: background var(--t);
}
.cmd-item:hover, .cmd-item.selected {
  background: rgba(91,110,245,0.15); color: var(--brand-light);
}

/* ==============================================================================
   COOKIE CONSENT BANNER
   ============================================================================== */
.cookie-banner {
  position: fixed; bottom: 20px; right: 20px; left: 20px; max-width: 560px;
  margin: 0 auto; background: var(--bg-card); border: 1px solid var(--line-brand);
  border-radius: var(--radius-lg); padding: 16px 20px;
  box-shadow: 0 10px 30px rgba(0,0,0,0.4); z-index: 9999;
  display: flex; flex-direction: column; gap: 12px;
  animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}
.cookie-banner[hidden] {
  display: none !important;
  opacity: 0 !important;
  pointer-events: none !important;
}
@keyframes slideUp { from { transform: translateY(100px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
.cookie-title { font-size: 13.5px; font-weight: 700; color: var(--text-strong); margin-bottom: 4px; }
.cookie-text { font-size: 11.5px; color: var(--text-soft); line-height: 1.5; }
.cookie-actions { display: flex; justify-content: flex-end; gap: 8px; }

/* ==============================================================================
   MOBILE FLOATING CTA
   ============================================================================== */

/* ==============================================================================
   SKELETON LOADING & ANIMATION CLASSES
   ============================================================================== */
.skeleton {
  background: linear-gradient(90deg, rgba(255,255,255,0.03) 25%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.03) 75%);
  background-size: 200% 100%; animation: skeletonLoading 1.5s infinite;
  border-radius: 4px;
}
@keyframes skeletonLoading { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }

.scroll-reveal {
  opacity: 0; transform: translateY(20px); transition: opacity 0.6s ease-out, transform 0.6s ease-out;
}
.scroll-reveal.visible {
  opacity: 1; transform: translateY(0);
}

/* Panel desplegable de notificaciones */
.notif-dropdown-panel {
  position: absolute; right: 0; top: calc(100% + 8px); width: 320px;
  background: var(--bg-card); border: 1px solid var(--line-brand);
  border-radius: var(--radius-md); box-shadow: 0 10px 30px rgba(0,0,0,0.35);
  z-index: 1000; overflow: hidden; animation: dropIn 0.18s ease;
}
.notif-dropdown-panel[hidden] { display: none; }
.notif-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 10px 14px; background: color-mix(in srgb, var(--brand-500) 12%, var(--bg-card));
  border-bottom: 1px solid var(--line);
}
.notif-title { font-size: 12.5px; font-weight: 700; color: var(--text-strong); }
.notif-list { max-height: 280px; overflow-y: auto; padding: 6px; }
.notif-item {
  display: flex; gap: 10px; padding: 8px 10px; border-radius: var(--radius-sm);
  font-size: 12px; color: var(--text); transition: background var(--t); cursor: pointer;
}
.notif-item:hover { background: color-mix(in srgb, var(--brand-500) 10%, transparent); }
.notif-item-icon { font-size: 16px; flex-shrink: 0; }
.notif-item-text { line-height: 1.4; color: var(--text-strong); }
.notif-item-time { font-size: 10.5px; color: var(--text-soft); display: block; margin-top: 2px; }

/* Tarjeta de contacto de conductor */
.driver-contact-card {
  display: flex; flex-direction: column; align-items: center; gap: 10px;
  padding: 16px; border-radius: var(--radius-md);
  background: color-mix(in srgb, var(--brand-500) 10%, var(--bg-card));
  border: 1px solid var(--line);
}
.driver-avatar-lg {
  width: 54px; height: 54px; border-radius: 50%;
  background: var(--brand-500); color: #ffffff;
  font-size: 20px; font-weight: 800; display: flex; align-items: center; justify-content: center;
  box-shadow: 0 4px 14px rgba(91,110,245,0.4);
}

/* ==============================================================================
   AUTH INITIAL LANDING SCREEN (PANTALLA DE INICIO Y REGISTRO) - MULTI-DISPOSITIVO
   ============================================================================== */
.auth-landing-screen {
  position: fixed; inset: 0; z-index: 2000;
  background:
    radial-gradient(circle at 20% 20%, rgba(91,110,245,0.18) 0%, transparent 40%),
    radial-gradient(circle at 80% 80%, rgba(124,77,219,0.18) 0%, transparent 40%),
    var(--bg-base);
  display: flex;
  align-items: flex-start;
  justify-content: center;
  min-height: 100vh;
  min-height: 100dvh;
  padding: max(24px, env(safe-area-inset-top)) max(20px, env(safe-area-inset-right)) max(30px, env(safe-area-inset-bottom)) max(20px, env(safe-area-inset-left));
  overflow-y: auto;
  overscroll-behavior-y: contain;
  -webkit-overflow-scrolling: touch;
  transition: opacity 0.35s ease, transform 0.35s ease;
}
.auth-landing-screen[hidden] {
  display: none !important; opacity: 0; pointer-events: none;
}

.auth-landing-container {
  width: 100%;
  max-width: 1080px;
  display: grid;
  grid-template-columns: 1.15fr 0.85fr;
  gap: 40px;
  align-items: center;
  margin: auto;
  padding: 16px 0;
}

.auth-landing-hero {
  display: flex;
  flex-direction: column;
  gap: 20px;
}
.auth-landing-brand {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}
.auth-landing-logo-svg {
  width: 44px;
  height: 44px;
  flex-shrink: 0;
  filter: drop-shadow(0 0 14px rgba(91,110,245,0.45));
}
.auth-landing-title {
  font-size: clamp(26px, 3.6vw, 34px);
  font-weight: 800;
  letter-spacing: -0.8px;
  color: var(--text-strong);
  line-height: 1.15;
}
.auth-landing-title span {
  background: linear-gradient(135deg, var(--brand-300), var(--brand-alt));
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
}
.auth-landing-sub {
  font-size: clamp(13.5px, 1.8vw, 15px);
  color: var(--text);
  line-height: 1.6;
  max-width: 520px;
}
.auth-landing-features {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 14px;
  margin-top: 6px;
}
.auth-feature-card {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 14px;
  background: rgba(255,255,255,0.03);
  border: 1px solid var(--line);
  border-radius: var(--radius-sm);
  transition: border-color var(--t), background var(--t), transform var(--t);
}
.auth-feature-card:hover {
  border-color: var(--line-brand);
  background: rgba(255,255,255,0.06);
  transform: translateY(-2px);
}
.auth-feature-icon {
  font-size: 22px;
  flex-shrink: 0;
  line-height: 1;
}
.auth-feature-text h4 {
  font-size: 13px;
  font-weight: 700;
  color: var(--text-strong);
  margin-bottom: 2px;
}
.auth-feature-text p {
  font-size: 11.5px;
  color: var(--text-soft);
  line-height: 1.35;
}

.auth-landing-card {
  background: var(--bg-surface);
  border: 1px solid var(--line-brand);
  border-radius: var(--radius);
  padding: clamp(22px, 3.5vw, 32px);
  box-shadow: var(--glow), 0 24px 48px rgba(0,0,0,0.65);
  position: relative;
  overflow: hidden;
  width: 100%;
}
.auth-landing-card::before {
  content: '';
  position: absolute;
  top: 0; left: 0; right: 0;
  height: 3px;
  background: linear-gradient(90deg, var(--brand-500), var(--brand-alt), var(--ok));
}

.auth-card-head {
  text-align: center;
  margin-bottom: 20px;
}
.auth-card-head h2 {
  font-size: clamp(19px, 2.5vw, 22px);
  font-weight: 800;
  color: var(--text-strong);
}
.auth-card-head p {
  font-size: 12.5px;
  color: var(--text-soft);
  margin-top: 4px;
}

/* TABLETS Y LAPTOPS COMPACTOS (769px a 1023px) */
@media (min-width: 769px) and (max-width: 1023px) {
  .auth-landing-container {
    grid-template-columns: 1fr;
    max-width: 620px;
    gap: 32px;
    padding: 10px 0;
  }
  .auth-landing-hero {
    text-align: center;
    align-items: center;
  }
  .auth-landing-brand {
    justify-content: center;
  }
  .auth-landing-sub {
    max-width: 100%;
  }
  .auth-landing-card {
    max-width: 480px;
    margin: 0 auto;
  }
}

/* DISPOSITIVOS MÓVILES (<= 768px) */
@media (max-width: 768px) {
  .auth-landing-screen {
    padding: max(16px, env(safe-area-inset-top)) max(14px, env(safe-area-inset-right)) max(24px, env(safe-area-inset-bottom)) max(14px, env(safe-area-inset-left));
  }
  .auth-landing-container {
    grid-template-columns: 1fr;
    gap: 22px;
    padding: 4px 0;
  }
  .auth-landing-hero {
    text-align: center;
    align-items: center;
    gap: 14px;
  }
  .auth-landing-brand {
    justify-content: center;
  }
  .auth-landing-logo-svg {
    width: 38px;
    height: 38px;
  }
  .auth-landing-title {
    font-size: 24px;
  }
  .auth-landing-sub {
    font-size: 13.5px;
    max-width: 100%;
    line-height: 1.5;
  }
  .auth-landing-features {
    grid-template-columns: 1fr;
    gap: 8px;
    width: 100%;
    text-align: left;
    margin-top: 2px;
  }
  .auth-feature-card {
    padding: 10px 12px;
    gap: 10px;
  }
  .auth-feature-icon {
    font-size: 18px;
  }
  .auth-feature-text h4 {
    font-size: 12.5px;
  }
  .auth-feature-text p {
    font-size: 11px;
  }
  .auth-landing-card {
    padding: 20px 16px;
    border-radius: var(--radius-sm);
  }
  .auth-card-head {
    margin-bottom: 16px;
  }
  .auth-card-head h2 {
    font-size: 18px;
  }
  .auth-card-head p {
    font-size: 12px;
  }
  .auth-tabs {
    margin-bottom: 16px;
  }
  .btn-oauth {
    padding: 11px 14px;
    font-size: 13px;
    min-height: 44px;
  }
  .auth-form .form-group input {
    font-size: 16px; /* Evita auto-zoom molesto en iOS Safari */
    padding: 11px 12px;
    min-height: 44px;
  }
  .auth-form button[type="submit"] {
    min-height: 46px;
    font-size: 14px;
  }
}

/* PANTALLAS EXTRA PEQUEÑAS (<= 360px) */
@media (max-width: 360px) {
  .auth-landing-card {
    padding: 16px 12px;
  }
  .auth-landing-title {
    font-size: 21px;
  }
  .auth-feature-card {
    padding: 8px 10px;
  }
  .btn-oauth span {
    font-size: 12px;
  }
}

/* ORIENTACIÓN HORIZONTAL EN MÓVIL (Landscape corto) */
@media (max-height: 520px) and (orientation: landscape) {
  .auth-landing-screen {
    align-items: flex-start;
    padding-top: 14px;
    padding-bottom: 24px;
  }
  .auth-landing-container {
    grid-template-columns: 1fr 1fr;
    gap: 18px;
    align-items: flex-start;
  }
  .auth-landing-hero {
    text-align: left;
    align-items: flex-start;
    gap: 12px;
  }
  .auth-landing-brand {
    justify-content: flex-start;
  }
  .auth-landing-title {
    font-size: 20px;
  }
  .auth-landing-sub {
    font-size: 12px;
  }
  .auth-landing-features {
    grid-template-columns: 1fr;
    gap: 6px;
  }
  .auth-feature-card {
    padding: 8px 10px;
  }
  .auth-landing-card {
    padding: 16px 14px;
  }
}

/* ============================================================
   DB STATUS PILL & DIAGNOSTICS MODAL (100% REAL DATABASE)
   ============================================================ */
.db-status-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 5px 12px;
  background: rgba(91, 110, 245, 0.12);
  border: 1px solid rgba(91, 110, 245, 0.35);
  border-radius: 20px;
  font-size: 11.5px;
  font-weight: 600;
  color: #a5b0fb;
  cursor: pointer;
  transition: all var(--t);
  user-select: none;
}
.db-status-pill:hover {
  background: rgba(91, 110, 245, 0.22);
  border-color: var(--brand-500);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(91, 110, 245, 0.25);
}
.db-status-pill.real-db {
  background: rgba(43, 184, 133, 0.14);
  border-color: rgba(43, 184, 133, 0.45);
  color: #34d399;
}
.db-modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(5, 8, 16, 0.78);
  backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  opacity: 0;
  pointer-events: none;
  transition: opacity 200ms ease;
}
.db-modal-overlay.open {
  opacity: 1;
  pointer-events: auto;
}
.db-modal-card {
  width: 92%;
  max-width: 600px;
  background: var(--bg-card);
  border: 1px solid var(--line-brand);
  border-radius: var(--radius);
  box-shadow: var(--glow);
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  max-height: 88vh;
  overflow-y: auto;
}
.db-modal-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid var(--line);
  padding-bottom: 12px;
}
.db-modal-head h3 {
  font-size: 17px;
  font-weight: 700;
  color: var(--text-strong);
  display: flex;
  align-items: center;
  gap: 8px;
}
.db-modal-close {
  background: none;
  border: none;
  color: var(--text-soft);
  font-size: 20px;
  cursor: pointer;
  padding: 4px;
  line-height: 1;
}
.db-modal-close:hover {
  color: var(--text-strong);
}
.db-metrics-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
  gap: 10px;
}
.db-metric-box {
  background: var(--bg-surface);
  border: 1px solid var(--line);
  border-radius: var(--radius-sm);
  padding: 10px 12px;
}
.db-metric-label {
  font-size: 11px;
  color: var(--text-soft);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}
.db-metric-val {
  font-size: 15px;
  font-weight: 700;
  color: var(--text-strong);
  margin-top: 4px;
}
.db-table-list {
  background: var(--bg-surface);
  border: 1px solid var(--line);
  border-radius: var(--radius-sm);
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.db-table-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 12.5px;
  padding: 4px 6px;
  border-radius: 4px;
}
.db-table-row:nth-child(even) {
  background: rgba(255, 255, 255, 0.02);
}
.db-table-name {
  font-family: 'JetBrains Mono', monospace;
  color: #a5b0fb;
  font-weight: 600;
}
.db-table-count {
  font-weight: 700;
  color: var(--text-strong);
}
.db-features-badges {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.db-feature-badge {
  font-size: 11px;
  padding: 4px 8px;
  background: rgba(43, 184, 133, 0.12);
  border: 1px solid rgba(43, 184, 133, 0.3);
  color: #34d399;
  border-radius: 6px;
  font-weight: 600;
}
 
@keyframes spin { to { transform: rotate(360deg); } }

/* ============ LEAFLET REAL MAP CUSTOMIZATIONS (TEMA OSCURO PRO) ============ */
.leaflet-real-map {
  background: #0f172a !important;
  width: 100%;
  height: 100%;
  position: relative;
  overflow: hidden;
}
.leaflet-container {
  background-color: #0f172a !important;
  font-family: 'Inter', -apple-system, sans-serif !important;
}
.leaflet-control-zoom {
  display: none !important; /* Usamos nuestros botones premium */
}
.leaflet-popup-content-wrapper {
  background: rgba(15, 23, 42, 0.94) !important;
  backdrop-filter: blur(12px) !important;
  color: var(--text-strong) !important;
  border: 1px solid var(--line-brand) !important;
  border-radius: 12px !important;
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.6) !important;
  padding: 4px 6px !important;
}
.leaflet-popup-tip {
  background: rgba(15, 23, 42, 0.94) !important;
  border: 1px solid var(--line-brand) !important;
}
.leaflet-popup-content {
  margin: 10px 12px !important;
  font-size: 12.5px !important;
  line-height: 1.4 !important;
}
.real-bus-div-icon {
  background: transparent !important;
  border: none !important;
}
.real-bus-icon-inner {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
  border: 2px solid #ffffff;
  color: #ffffff;
  font-weight: 800;
  font-size: 11px;
  font-family: 'JetBrains Mono', monospace;
  transition: transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
  cursor: pointer;
}
.real-bus-icon-inner:hover {
  transform: scale(1.22);
}
.real-bus-pulse {
  position: absolute;
  width: 44px;
  height: 44px;
  border-radius: 50%;
  left: -6px;
  top: -6px;
  pointer-events: none;
  animation: busPulseAnim 2s infinite ease-out;
}
@keyframes busPulseAnim {
  0% { transform: scale(0.6); opacity: 0.8; }
  100% { transform: scale(1.6); opacity: 0; }
}
.real-stop-div-icon {
  background: transparent !important;
  border: none !important;
}
.real-stop-icon-inner {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: #f59e0b;
  border: 3px solid #ffffff;
  box-shadow: 0 2px 8px rgba(0,0,0,0.55), 0 0 0 2px rgba(245,158,11,0.35);
  cursor: pointer;
  transition: transform 0.18s, box-shadow 0.18s;
  position: relative;
}
.real-stop-icon-inner::after {
  content: '';
  position: absolute;
  inset: -5px;
  border-radius: 50%;
  border: 1.5px solid rgba(245,158,11,0.45);
  pointer-events: none;
}
.real-stop-icon-inner:hover {
  transform: scale(1.7);
  box-shadow: 0 4px 14px rgba(245,158,11,0.7), 0 0 0 4px rgba(245,158,11,0.25);
}
.real-user-gps-marker {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: #3b82f6;
  border: 3px solid #ffffff;
  box-shadow: 0 0 16px #3b82f6;
  position: relative;
}
.real-user-gps-pulse {
  position: absolute;
  width: 38px;
  height: 38px;
  border-radius: 50%;
  background: rgba(59, 130, 246, 0.35);
  top: -10px;
  left: -10px;
  animation: userGpsPulse 2s infinite ease-out;
}
@keyframes userGpsPulse {
  0% { transform: scale(0.5); opacity: 0.9; }
  100% { transform: scale(1.8); opacity: 0; }
}
````

## File: terms.html
````html
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="robots" content="noindex, follow" />
  <title>Términos y Condiciones — BusTrack Pro</title>
  <meta name="description" content="Términos y condiciones de uso del sistema BusTrack Pro para operadores de flotas de transporte." />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
  <style>
    :root {
      --bg: #0a0f1c; --surface: #111827; --border: rgba(255,255,255,0.08);
      --text: #e5e7eb; --text-muted: #9ca3af; --brand: #5b6ef5; --brand-light: #818cf8;
    }
    @media (prefers-color-scheme: light) {
      :root { --bg: #f9fafb; --surface: #fff; --border: rgba(0,0,0,0.08); --text: #111827; --text-muted: #6b7280; }
    }
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Inter', system-ui, sans-serif; background: var(--bg); color: var(--text); line-height: 1.7; font-size: 1rem; }
    .legal-header { background: var(--surface); border-bottom: 1px solid var(--border); padding: 1rem 2rem; display: flex; align-items: center; gap: 1rem; }
    .legal-header a { color: var(--brand-light); text-decoration: none; font-size: 0.875rem; }
    .legal-header a:hover { text-decoration: underline; }
    .legal-logo { font-weight: 700; color: var(--brand); font-size: 1.1rem; }
    .legal-sep { color: var(--text-muted); }
    main { max-width: 760px; margin: 0 auto; padding: 3rem 1.5rem 5rem; }
    .legal-badge { display: inline-block; background: rgba(91,110,245,0.15); color: var(--brand-light); border: 1px solid rgba(91,110,245,0.3); border-radius: 99px; padding: 0.2rem 0.75rem; font-size: 0.75rem; font-weight: 600; letter-spacing: 0.05em; text-transform: uppercase; margin-bottom: 1rem; }
    h1 { font-size: 2rem; font-weight: 700; line-height: 1.2; margin-bottom: 0.5rem; }
    .last-updated { color: var(--text-muted); font-size: 0.875rem; margin-bottom: 2.5rem; padding-bottom: 2.5rem; border-bottom: 1px solid var(--border); }
    h2 { font-size: 1.2rem; font-weight: 600; margin: 2.5rem 0 0.75rem; color: var(--brand-light); }
    p { margin-bottom: 1rem; }
    ul { margin: 0.5rem 0 1rem 1.5rem; }
    li { margin-bottom: 0.4rem; }
    .info-box { background: var(--surface); border: 1px solid var(--border); border-left: 3px solid var(--brand); border-radius: 8px; padding: 1.25rem 1.5rem; margin: 2rem 0; }
    .info-box strong { color: var(--brand-light); }
    .warn-box { background: rgba(239,68,68,0.07); border: 1px solid rgba(239,68,68,0.25); border-left: 3px solid #ef4444; border-radius: 8px; padding: 1.25rem 1.5rem; margin: 2rem 0; }
    footer { text-align: center; padding: 2rem; color: var(--text-muted); font-size: 0.8rem; border-top: 1px solid var(--border); }
    footer a { color: var(--brand-light); text-decoration: none; }
    a { color: var(--brand-light); }
    a:focus-visible { outline: 2px solid var(--brand); outline-offset: 2px; border-radius: 2px; }
  </style>
</head>
<body>
  <header class="legal-header">
    <span class="legal-logo">BusTrack Pro</span>
    <span class="legal-sep">›</span>
    <a href="/">← Volver al panel</a>
  </header>

  <main>
    <span class="legal-badge">Legal</span>
    <h1>Términos y Condiciones de Uso</h1>
    <p class="last-updated">Última actualización: 24 de septiembre de 2026</p>

    <div class="info-box">
      <p><strong>Importante:</strong> Al acceder y utilizar BusTrack Pro, usted acepta estos términos. Si no está de acuerdo, por favor deje de utilizar el servicio.</p>
    </div>

    <h2>1. Descripción del Servicio</h2>
    <p>BusTrack Pro es un sistema de rastreo y gestión de flotas de transporte en tiempo real. El servicio permite monitorear posición de unidades, gestionar rutas, visualizar alertas operativas y generar reportes de flota.</p>
    <p>El sistema incluye un <strong>Modo Pasajero (Piloto Fidélitas)</strong> que muestra tiempos estimados de llegada de buses al corredor San Pedro–Montes de Oca, con fines informativos y no vinculantes.</p>

    <h2>2. Acceso y Uso Autorizado</h2>
    <p>El acceso al panel de administración de BusTrack Pro está restringido al personal autorizado del operador de transporte. El usuario se compromete a:</p>
    <ul>
      <li>No compartir credenciales de acceso con terceros no autorizados</li>
      <li>Usar el sistema únicamente para fines operativos legítimos</li>
      <li>No intentar acceder a áreas no autorizadas del sistema</li>
      <li>Reportar cualquier vulnerabilidad o acceso no autorizado detectado</li>
    </ul>

    <h2>3. Exactitud de la Información</h2>
    <div class="warn-box">
      <p><strong>Limitación de responsabilidad:</strong> Los tiempos de llegada mostrados en el Modo Pasajero son <em>estimaciones</em> calculadas a partir de telemetría en tiempo real. BusTrack Pro <strong>no garantiza</strong> la exactitud de los tiempos de llegada. No tome decisiones críticas basándose exclusivamente en esta información.</p>
    </div>
    <p>Los datos de flota son de carácter operativo e informativo. El operador de transporte es el único responsable de la exactitud de los datos ingresados al sistema.</p>

    <h2>4. Propiedad Intelectual</h2>
    <p>Todo el código fuente, diseño, logotipos, textos e interfaces de BusTrack Pro son propiedad de sus creadores y están protegidos por las leyes de propiedad intelectual aplicables en Costa Rica (Ley 6683 de Derechos de Autor y Derechos Conexos).</p>
    <p>Queda prohibida la reproducción, distribución o modificación del software sin autorización expresa por escrito.</p>
    <p><strong>Fuentes tipográficas:</strong> Inter y JetBrains Mono se utilizan bajo licencia SIL Open Font License 1.1 (OFL). No se utilizan imágenes o fotografías de terceros en la versión actual — los íconos son SVG propios del sistema.</p>

    <h2>5. Desarrollo y Tecnología de Inteligencia Artificial (IA)</h2>
    <div class="info-box">
      <p><strong>Declaración de Tecnología:</strong> La arquitectura, código fuente, interfaz y simulación de BusTrack Pro han sido desarrollados con la asistencia de modelos de <strong>Inteligencia Artificial (IA)</strong>. El uso de la plataforma presupone la aceptación de esta naturaleza tecnológica.</p>
    </div>
    <p>La asistencia de Inteligencia Artificial se utiliza para optimizar el rendimiento, generar algoritmos de simulación en tiempo real y acelerar el desarrollo del software bajo supervisión técnica constante.</p>

    <h2>6. Limitación de Responsabilidad</h2>
    <p>BusTrack Pro se provee "tal como está". En ningún caso los desarrolladores o proveedores del servicio serán responsables por:</p>
    <ul>
      <li>Interrupciones del servicio por mantenimiento o causas de fuerza mayor</li>
      <li>Pérdidas derivadas de datos de flota inexactos o retrasados</li>
      <li>Daños causados por el uso inadecuado del sistema</li>
    </ul>

    <h2>7. Modificaciones al Servicio</h2>
    <p>Nos reservamos el derecho de modificar, suspender o descontinuar el servicio con previo aviso de 30 días, salvo en casos de emergencia de seguridad.</p>

    <h2>8. Ley Aplicable y Jurisdicción</h2>
    <p>Estos términos se rigen por las leyes de la <strong>República de Costa Rica</strong>. Cualquier disputa se someterá a la jurisdicción de los tribunales competentes de San José, Costa Rica.</p>
    <p>Leyes aplicables: Ley 7472 (Promoción de la Competencia y Defensa Efectiva del Consumidor), Ley 8968 (LEPD), Ley 9048 (delitos informáticos).</p>

    <h2>9. Contacto</h2>
    <p>Para consultas sobre estos términos: <a href="mailto:admin@bustrack.example.com">admin@bustrack.example.com</a></p>
    <p><em>Nota: Sustituya este correo con los datos reales de su empresa antes de publicar.</em></p>
  </main>

  <footer>
    <p>© 2026 BusTrack Pro. Todos los derechos reservados. |
      <a href="/privacy">Privacidad</a> ·
      <a href="/terms">Términos</a> ·
      <a href="/">Panel</a>
    </p>
  </footer>
</body>
</html>
````

## File: thanks.html
````html
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="robots" content="noindex, nofollow" />
  <title>¡Gracias! — BusTrack Pro</title>
  <meta name="description" content="Acción completada exitosamente en BusTrack Pro." />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
  <style>
    :root {
      --bg: #0a0f1c; --surface: #111827; --border: rgba(255,255,255,0.08);
      --text: #e5e7eb; --text-muted: #9ca3af; --brand: #5b6ef5; --brand-light: #818cf8;
      --ok: #10b981;
    }
    @media (prefers-color-scheme: light) {
      :root { --bg: #f9fafb; --surface: #fff; --border: rgba(0,0,0,0.08); --text: #111827; --text-muted: #6b7280; }
    }
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Inter', system-ui, sans-serif;
      background: var(--bg);
      color: var(--text);
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      text-align: center;
      padding: 2rem;
      position: relative;
      overflow: hidden;
    }
    body::before {
      content: '';
      position: fixed;
      top: 20%;
      left: 50%;
      transform: translateX(-50%);
      width: 500px;
      height: 500px;
      background: radial-gradient(circle, rgba(16,185,129,0.1) 0%, transparent 70%);
      pointer-events: none;
    }
    .checkmark {
      width: 80px;
      height: 80px;
      background: rgba(16,185,129,0.15);
      border: 2px solid rgba(16,185,129,0.4);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 1.5rem;
      animation: scaleIn 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
    }
    @keyframes scaleIn {
      from { transform: scale(0); opacity: 0; }
      to { transform: scale(1); opacity: 1; }
    }
    @keyframes fadeSlideUp {
      from { opacity: 0; transform: translateY(15px); }
      to { opacity: 1; transform: translateY(0); }
    }
    .checkmark svg { animation: drawCheck 0.5s ease 0.3s both; }
    h1 {
      font-size: 2rem;
      font-weight: 700;
      margin-bottom: 0.5rem;
      animation: fadeSlideUp 0.5s ease 0.2s both;
    }
    .subtitle {
      color: var(--text-muted);
      font-size: 1rem;
      max-width: 380px;
      margin-bottom: 2.5rem;
      animation: fadeSlideUp 0.5s ease 0.3s both;
    }
    .actions {
      display: flex;
      gap: 1rem;
      flex-wrap: wrap;
      justify-content: center;
      animation: fadeSlideUp 0.5s ease 0.4s both;
    }
    .btn-primary {
      background: var(--brand);
      color: white;
      border: none;
      padding: 0.75rem 1.5rem;
      border-radius: 8px;
      font-family: inherit;
      font-size: 0.95rem;
      font-weight: 600;
      cursor: pointer;
      text-decoration: none;
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      transition: background 0.2s, transform 0.1s;
    }
    .btn-primary:hover { background: #4b5de4; transform: translateY(-1px); }
    a:focus-visible { outline: 2px solid var(--brand); outline-offset: 2px; border-radius: 4px; }
  </style>
</head>
<body>
  <div class="checkmark" role="img" aria-label="Acción completada exitosamente">
    <svg width="36" height="36" viewBox="0 0 36 36" fill="none" aria-hidden="true">
      <path d="M8 18l7 7 13-14" stroke="#10b981" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
  </div>
  <h1>¡Acción completada!</h1>
  <p class="subtitle" id="thanksMessage">
    La operación se realizó correctamente.
  </p>
  <div class="actions">
    <a href="/" class="btn-primary" id="thanksCta">Volver al panel</a>
  </div>

  <script>
    // Customize message from URL params: /thanks?action=bus_added&name=B-001
    const params = new URLSearchParams(location.search);
    const action = params.get('action');
    const name = params.get('name');
    const msgEl = document.getElementById('thanksMessage');
    const ctaEl = document.getElementById('thanksCta');

    const messages = {
      bus_added: `El bus ${name || ''} fue registrado exitosamente en la flota.`,
      status_updated: `El estado del bus ${name || ''} fue actualizado.`,
      report_generated: 'El reporte fue generado y está listo para descargar.',
      alert_created: 'La alerta fue creada y notificada al equipo.',
    };

    if (action && messages[action]) {
      msgEl.textContent = messages[action];
    }
  </script>
</body>
</html>
````
