# ZIA YAML Studio

Paste a Zoho API documentation page, get a ZIA-agent-ready **OpenAPI 3.0.1 YAML**
spec back. No OpenAPI knowledge needed.

ZIA Agent Studio needs a precise OpenAPI spec before an agent can call any custom
API. Writing one by hand is the barrier this removes.

**Live:** https://yaml-roljsobe.onslate.in

---

## How it works

1. Copy any Zoho API docs page (Ctrl/⌘+A, copy)
2. Paste it in and click **Generate**
3. Download the `.yaml` and upload it to ZIA Agent Studio as a custom tool

```
Browser (Slate, static React)
   │  POST  /server/glm-proxy/execute
   ▼
Catalyst Function  (Advanced I/O, zero npm dependencies)
   │  refreshes a Zoho OAuth token, then calls
   ▼
Catalyst LLM Serving — GLM-4.7-Flash (crm-di-glm47b_30b_it)
   │
   ▼
sanitizeYaml → validateYaml → rendered in the browser
```

The browser never holds a credential. The proxy exists because the GLM endpoint
does not allow cross-origin browser calls, and because the OAuth token must stay
server-side.

---

## Architecture notes

**Why a proxy function at all?** Two reasons: CORS, and keeping the refresh token
off the client.

**Output is capped at 1300 tokens.** Advanced I/O functions are killed at 30
seconds — a hard Catalyst limit, not a setting. Measured GLM throughput is
~53 output tokens/sec, so 1300 tokens ≈ 25s and fits. A larger cap guarantees a
408 instead of a spec. When output does hit the cap the UI says so explicitly
rather than handing over a truncated file.

To lift that ceiling, move the proxy to **AppSail** (no timeout). The handler
logic ports over almost unchanged.

**The system prompt is deliberately economical.** Earlier versions told the model
to "expand response schemas realistically", which made it invent response fields
the docs never mentioned — both wrong and the main cause of truncation. It is now
forbidden from inventing field names and told to emit a minimal `data` array when
the docs do not document a response body.

**Validation is advisory, never blocking.** The YAML is always shown and
copyable; `validateYaml` reports errors and warnings alongside it.

**Sign-in gates only the download.** Generation and copy work without it.

---

## Local development

```bash
npm install
npm run dev
```

The Catalyst SDK is only injected on the deployed Slate site, so in local dev
`sdkAvailable` is false and the download is ungated. Generation still calls the
deployed proxy function.

| Command | |
|---|---|
| `npm run dev` | Vite dev server |
| `npm run build` | production build to `dist/` |
| `npm run lint` | ESLint |

---

## Deployment

**Frontend (Slate)** — auto-builds and deploys on push to `main`.

**Function (`glm-proxy`)** — manual upload; Catalyst Functions have no git-based
deploy. Zip these together and upload via Console → Functions → Deploy:

```
functions/glm-proxy/index.js
functions/glm-proxy/credentials.js      ← gitignored, see below
functions/glm-proxy/catalyst-config.json
```

### Credentials

The function needs a Zoho OAuth refresh token with scope
`QuickML.deployment.READ`. It reads credentials from environment variables first,
then falls back to `credentials.js`.

`credentials.js` and the real `catalyst-config.json` are **gitignored** — this
repo is public. Copy the `.example` files and fill them in:

```bash
cp functions/glm-proxy/credentials.example.js functions/glm-proxy/credentials.js
cp functions/glm-proxy/catalyst-config.example.json functions/glm-proxy/catalyst-config.json
```

To mint a refresh token: create a **Self Client** at
[api-console.zoho.in](https://api-console.zoho.in), generate a code for scope
`QuickML.deployment.READ`, then exchange it (the code expires in 10 minutes):

```bash
curl -X POST "https://accounts.zoho.in/oauth/v2/token" \
  -d "grant_type=authorization_code" \
  -d "client_id=<id>" -d "client_secret=<secret>" -d "code=<code>"
```

Refresh tokens do not expire, so this is a one-time step.

---

## Project structure

```
src/
├── main.tsx                 entry
├── App.tsx                  hash-based routing (home / #contact)
├── pages/
│   ├── Index.tsx            main generator UI
│   └── Contact.tsx
├── components/
│   ├── DocsInput.tsx        docs textarea
│   ├── YamlResult.tsx       output panel, copy / download / Swagger
│   └── LoginModal.tsx       embedded Zoho sign-in
└── utils/
    ├── glm.ts               proxy client, token cap, truncation detection
    ├── prompt.ts            system prompt
    ├── sanitizeYaml.ts      fixes model output quirks, injects OAuth block
    ├── validateYaml.ts      structural checks (advisory)
    ├── catalyst-auth.ts     Catalyst Web SDK wrapper
    ├── AuthContext.tsx      polls for the SDK, exposes auth state
    └── constants.ts         Zoho docs quick links

functions/glm-proxy/         Catalyst Advanced I/O proxy
```

---

## Stack

React 18 · TypeScript · Vite · Tailwind · js-yaml ·
Catalyst Slate (hosting) · Catalyst Functions (proxy) ·
Catalyst LLM Serving / GLM-4.7-Flash

## Known limitations

- **~1300 output tokens per request** — roughly one to three endpoints. Larger
  docs pages truncate, with a warning. AppSail lifts this.
- **The proxy endpoint has no gateway authentication** — anyone with the URL can
  spend the GLM quota. Add auth or throttling before treating this as public.
- The generated spec is a strong starting point, not a guarantee. Validate in
  [Swagger Editor](https://editor.swagger.io) (one click from the output panel)
  before shipping it to an agent.
