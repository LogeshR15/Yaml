# ZIA YAML Studio

> Convert Zoho API documentation into ZIA-agent-ready OpenAPI 3.0.1 YAML specs in seconds. No developer needed.

---

## What Is This?

**ZIA YAML Studio** is a browser-based tool that solves a specific problem:

Zoho ZIA Agent Studio requires a custom OpenAPI 3.0.1 YAML file to connect agents to APIs that aren't available as built-in tools. Writing these YAML files manually requires deep OpenAPI knowledge — a barrier for non-technical business users.

This tool removes that barrier. You copy text from any Zoho API documentation page, paste it in, and get a production-ready OpenAPI spec that you can upload directly to ZIA Agent Studio.

---

## Who Is It For?

- **Business users** who need to build ZIA agents but can't write YAML
- **Zoho admins** who want to connect agents to Zoho Desk, FSM, CRM, Books, or any other Zoho product API
- **Developers** who want to speed up repetitive OpenAPI spec creation

---

## How It Works

```
1. Copy text from a Zoho API docs page  (Ctrl+A, Ctrl+C)
        ↓
2. Paste into ZIA YAML Studio
        ↓
3. Click Generate — Gemini AI reads the docs and writes the OpenAPI spec
        ↓
4. Download the .yaml file
        ↓
5. Upload to ZIA Agent Studio → Tools → Custom Tool → Schema
```

---

## Features

- **AI-powered conversion** — Uses Google Gemini (free tier, BYOK) to parse unstructured API docs
- **ZIA-optimised output** — Generates OpenAPI 3.0.1 (the version ZIA Agent Studio requires)
- **Smart prompt** — Enforces all ZIA compatibility rules: correct `operationId` format, `securitySchemes` placement, array `items`, Zoho ID types as `string`, OAuth2 scopes, MCP-ready `description` fields
- **Model fallback** — Tries 6 Gemini models in sequence; if one is overloaded or unavailable, silently moves to the next
- **Output sanitizer** — Auto-fixes common AI generation artifacts (unclosed quotes, malformed security blocks, invisible browser characters)
- **Validation** — Checks the output against OpenAPI structural rules before displaying
- **Swagger Editor link** — One click to validate in Swagger Editor for detailed error inspection
- **No backend** — Runs entirely in the browser; your API key is stored only in localStorage
- **No login required** — No Firebase, no Google auth, no account needed

---

## Supported Zoho APIs

Quick links to documentation pages you can copy from:

| Product | API Docs |
|---------|----------|
| Zoho Desk | https://desk.zoho.com/DeskAPIDocument |
| Zoho CRM | https://www.zoho.com/crm/developer/docs/api/v8/ |
| Zoho FSM | https://www.zoho.com/fsm/developer/help/api/ |
| Zoho Books | https://www.zoho.com/books/api/v3/ |
| Zoho Projects | https://projects.zoho.com/api-docs |
| Zoho People | https://www.zoho.com/people/api/overview.html |
| Zoho Inventory | https://www.zoho.com/inventory/api/v1/ |
| Zoho Sign | https://www.zoho.com/sign/api/ |

All Zoho APIs use OAuth 2.0. The generated YAML includes the correct `authorizationUrl` and `tokenUrl` automatically.

---

## Getting Started (Local)

### Prerequisites
- Node.js 22.x ([install with nvm](https://github.com/nvm-sh/nvm))
- A free Google Gemini API key from [aistudio.google.com/apikey](https://aistudio.google.com/apikey)

### Run Locally

```bash
# 1. Clone the repository
git clone https://github.com/LogeshR15/Yaml.git
cd Yaml

# 2. Install dependencies
npm install

# 3. Start the dev server
npm run dev
```

Open **http://localhost:8080** in your browser.

No `.env` file is needed. The app runs without any environment variables.

### Getting a Free Gemini API Key

1. Go to [aistudio.google.com/apikey](https://aistudio.google.com/apikey)
2. Sign in with your Google account
3. Click **Create API key**
4. Copy the key (starts with `AIza...`)
5. Paste it into the **Set up Gemini API key** section in the app and click Save

Free tier limits: **1,500 requests/day**, no credit card required.

---

## Deployment on Zoho Catalyst

This is a pure static frontend — no backend or database required.

**Recommended stack:** Node.js (22.14.0) on Catalyst AppSail
**Minimum machine type:** 2 Core / 4 GB RAM / 30 GB Storage

```bash
# Build for production
npm run build

# The dist/ folder contains the static files to deploy
```

Deploy the `dist/` folder to Catalyst AppSail or any static hosting service.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | React 18 + TypeScript 5 |
| Build tool | Vite 5 (SWC compiler) |
| Styling | Tailwind CSS |
| UI components | shadcn/ui + Radix UI |
| Icons | Lucide React |
| YAML parsing | js-yaml |
| Routing | React Router v6 |
| AI provider | Google Gemini API (user's own key) |
| State management | React useState (no Redux/Zustand) |
| Auth | None |
| Backend | None |
| Database | None |

---

## Project Structure

```
src/
├── pages/
│   └── Index.tsx              # Main page — orchestrates the 3-step flow
├── components/
│   ├── Navbar.tsx             # Top navigation bar
│   ├── KeySetup.tsx           # Gemini API key input and storage
│   ├── DocsInput.tsx          # Paste zone for API documentation
│   └── YamlResult.tsx         # Output panel with copy/download/validate
└── utils/
    ├── gemini.ts              # Gemini API client with 6-model fallback
    ├── prompt.ts              # System prompt with ZIA-specific OpenAPI rules
    ├── sanitizeYaml.ts        # Post-processing to fix AI generation artifacts
    └── validateYaml.ts        # Structural validation against OpenAPI rules
```

---

## OpenAPI Rules Enforced

The AI prompt is tuned to produce ZIA-compatible specs. Key rules applied automatically:

| Rule | Why It Matters |
|------|---------------|
| `openapi: 3.0.1` | ZIA Agent Studio requires exactly this version |
| `operationId` = camelCase verb+noun | Becomes the tool name the LLM uses to call the API |
| Rich `description` on every operation | Primary signal ZIA uses to select the right tool |
| `securitySchemes` under `components` | Root-level placement causes spec rejection |
| All arrays have `items` | Agents can't interpret typeless arrays |
| Zoho IDs as `type: string` | 18-digit IDs overflow `integer` type |
| `format: date` on date fields | Prevents LLM from hallucinating date formats |
| `enum` on fixed-value fields | Constrains agent to valid values |
| `example` on all parameters | Improves tool-calling accuracy in ZIA |

---

## Known Limitations

- Output quality depends on how much detail is in the pasted docs — more text = better YAML
- Gemini free tier has rate limits; the tool falls back through 6 models automatically
- The tool generates a first-pass spec; complex APIs may need minor manual edits
- Zoho Catalyst deployment has not been tested end-to-end (local dev only)

---

## About ZIA Agents

Zoho ZIA Agents are autonomous AI agents that can call REST APIs as tools. To connect an agent to a custom API:

1. In ZIA Agent Studio, go to **Tools → Create Tool Group → Custom**
2. Under **Schema**, upload an OpenAPI 3.0.1 YAML file
3. Create a **Connection** with the OAuth credentials for the target API
4. The agent will use the `operationId` and `description` fields to decide when and how to call each endpoint

More: [Zoho ZIA Agents](https://www.zoho.com/agents/) · [ZIA Agent Studio](https://www.zoho.com/agents/resources/help/)
