# SEER · Mantic Think

A minimal, SEER-styled chat website for Ollama models, deployed as a single
Cloudflare Worker. **Bring your own key** — each visitor enters their own
Ollama API key, which is stored only in their browser and never persisted on
the server.

Live: https://manticthink.com

## How it works

- **`public/index.html`** — the SEER-styled single-page chat UI (key-entry gate,
  streaming responses, model picker). Served as a Cloudflare static asset.
- **`worker.js`** — a Cloudflare Worker that:
  - `POST /api/validate` — verifies a visitor's key against the backend's
    authenticated `/api/me` endpoint.
  - `POST /api/chat` — proxies the chat request to the Ollama backend using the
    visitor's key (`Authorization: Bearer …`), streaming the NDJSON response
    straight back. Returns `401` without a key.
  - `GET /api/models` — the model list shown in the picker (from config).
  - `GET /api/catalog` — the backend's full model catalog (for the model manager).
  - `GET /api/fetch?url=…` — server-side fetch proxy for the `fetch_url` tool
    (auth-gated, http(s) only, loopback/private hosts blocked, ~64 KB read cap).
  - `POST /api/debate` — store a debate the user chose to **Share** (validated,
    200 KB cap, 1-year TTL) in the `DEBATES` KV namespace; returns a short id.
  - `GET /api/debate/:id` — fetch a shared debate by id.
  - `GET /d/:id` — short share link: serves the SPA (which loads and renders the
    debate read-only) and rewrites the OG/Twitter meta via `HTMLRewriter` so the
    link unfurls on social with the debate's topic and matchup.
  - `POST /api/codebase` — store a codebase the user chose to **Share** (validated,
    500 KB cap, 1-year TTL) in the `CODEBASES` KV namespace; returns a short id.
  - `GET /api/codebase/:id` — fetch a shared codebase by id.
  - `GET /c/:id` — short share link for a codebase: serves the SPA (which renders a
    read-only viewer) and rewrites the OG/Twitter meta via `HTMLRewriter`.
  - Everything else — the static SEER site, served with
    `Cross-Origin-Opener-Policy` / `Cross-Origin-Embedder-Policy` headers (via
    `public/_headers`) so the page is cross-origin isolated — required for
    `SharedArrayBuffer`, which powers interactive Python.

The visitor's key travels in the `Authorization` header from the browser and is
forwarded upstream per request. It is never stored or logged server-side.

## Features

Beyond basic chat, the UI includes:

- **Conversations** — local history with rename/delete, sidebar search, and a
  collapsible sidebar on desktop. The sidebar has three sections — **Chats**,
  **Projects**, and **Codebases**.
- **Codebases** — a VS Code / GitHub-like workspace where two coder models
  collaborate to build a multi-file project: a **Builder** (default
  `qwen3-coder`) writes and edits files through tool calls, while a **Reviewer**
  (default `kimi-k2.7-code`) critiques each round, looping until it's satisfied.
  Browse a collapsible file tree with type icons, hand-edit files with syntax
  highlighting, then save/export: download a ZIP, copy files, **push to a GitHub
  repo** (Git Data API — blobs → tree → commit → ref, with new repo/branch
  support), or **share a `/c/:id` link** that opens a friendly read-only view
  (file tree + the build conversation) with a CTA for non-users.
- **AI Debate** — pose a question and watch two models take turns (Debate, i.e.
  for vs against, or Discussion), with an optional impartial closing synthesis.
  Save debates to revisit, and share them via short `/d/:id` links that open a
  clean read-only view for non-users.
- **Local Ollama mode** — instead of a cloud key, point the app at the Ollama
  running on your own machine; requests go browser→localhost and never touch our
  server (needs `OLLAMA_ORIGINS=https://manticthink.com ollama serve`).
- **MCP connectors** — add a remote MCP tool server (URL + optional bearer
  token); its tools join the function-calling loop, browser-direct over
  Streamable HTTP.
- **Model presets** — save custom "models" (base model + system prompt + sampling
  params) and pick them from the model picker.
- **Models** — pick any backend model; add by name or browse the catalog.
- **Generation settings** — system prompt and sampling params (temperature,
  top_p, top_k, min_p, repeat penalty, max tokens, seed, stop).
- **Reasoning scaffolds** — reusable, structured system-prompt templates (with
  built-ins) compiled into a system message.
- **Projects** — per-project instructions + context files injected into every
  chat in the project.
- **Saved code** — save code blocks to a searchable library; run or copy them.
- **GitHub** — connect a token, browse repos/branches, and pull files in as
  context (read-only). The same token also powers **pushing a Codebase** to a
  repo, which needs write scope (`Contents: write`, or classic `repo` to create
  repos). Entirely client-side; GitHub's API is CORS-open.
- **Attachments** — PDFs (text-extracted via pdf.js) and text/code files as
  per-message context.
- **Visuals** — model output rendered as Mermaid diagrams, Chart.js charts, and
  Markdown tables.
- **Code execution** — run JavaScript (Web Worker) and Python (Pyodide/WASM)
  from code blocks, with interactive `input()` support.
- **Tools (function calling)** — opt-in; the model can call `run_javascript`,
  `run_python`, `calculator`, and `fetch_url`, executed in the sandboxes.

## Data & privacy

**Everything is stored in the visitor's browser; the server stores nothing
per-user — except debates and codebases you explicitly Share.** No accounts, no
cross-device sync.

- **In the browser** (`localStorage` / `sessionStorage`): the Ollama key, an
  optional GitHub token, conversations, projects, codebases (files + build
  chat), scaffolds, saved snippets, the model list, and settings. The API key is
  **session-only by default** unless *"Keep me signed in"* is checked (then it
  persists in `localStorage`).
- **Sent to Ollama** (per request): your messages, system prompt, any injected
  project / scaffold / attachment / GitHub-file context, and sampling options —
  under *your* key, forwarded by the Worker, never stored or logged.
- **Sent to GitHub** (if connected): calls go directly from your browser to
  `api.github.com` with your token.
- **Shared debates & codebases (the exceptions):** if you tap *Share*, that
  content is stored server-side in a KV namespace so the `/d/:id` (debate) or
  `/c/:id` (codebase: file contents + build conversation) link works for anyone
  who opens it — only what you explicitly share, kept ~1 year, never your key or
  other chats.
- **Server-side otherwise:** only aggregate, anonymous counters (Cloudflare
  Analytics Engine) — event name, outcome, and model — **never keys or message
  content.**

Privacy policy: <https://manticthink.com/privacy>.

## Tool execution & security

- **JS** runs in a throwaway **Web Worker** (no DOM, no `localStorage`, so no
  access to your keys), with captured output and a 10s timeout.
- **Python** runs via **Pyodide** in a persistent worker; interactive `input()`
  uses `SharedArrayBuffer` + `Atomics` (hence the COOP/COEP headers).
- **`fetch_url`** is proxied by `/api/fetch`: auth-gated, http(s) only, with
  loopback/private/link-local hosts and alternate IP encodings blocked, the host
  re-checked after redirects, and the response capped at ~64 KB.
- The Worker **whitelists and clamps** all sampling options before forwarding.
- Model-generated Markdown is sanitized with **DOMPurify**; Mermaid runs at
  `securityLevel: 'strict'`.
- **Codebase file tools** (`write_file` / `read_file` / `list_files` /
  `delete_file` / `rename_file`) mutate only the open codebase in your browser —
  never the filesystem and never the JS/Python sandbox. Paths are validated
  (no absolute paths or `..`) and size-capped.

## External runtime dependency

Loaded on demand, only when first used: **Pyodide** (for Python execution) from
`cdn.jsdelivr.net`, pinned to `v0.26.2`. This is the one runtime dependency not
self-hosted; everything else (Mermaid, Chart.js, pdf.js, marked, DOMPurify,
highlight.js, and the Inter / Geist Mono fonts) is vendored under
`public/vendor/`.

## Limits

- Attachments: PDF ≤ 15 MB (first 80 pages), text/code ≤ 1 MB; each capped to
  ~200k characters.
- GitHub: up to 40 files per attach; text files only.
- Tool loop: up to 8 iterations per turn.
- `fetch_url`: ~64 KB read, ~8k characters returned.
- Code execution: 10s (JS) / 30s (Python) timeouts.
- AI Debate: 1–4 rounds each; shared debates capped at 200 KB and kept ~1 year.
- Codebases: ≤ 200 KB/file, ~2 MB and 300 files per codebase; Builder↔Reviewer
  1–4 rounds (up to 8 tool calls/turn); shared codebases capped at 500 KB and
  kept ~1 year.

## Configuration

Edit `wrangler.toml` `[vars]`:

| Var | Purpose |
|-----|---------|
| `OLLAMA_BASE_URL` | Upstream base (default `https://ollama.com`) |
| `CHAT_MODELS` | Comma-separated model list shown in the picker |
| `DEFAULT_MODEL` | Model used when a request omits one |

There is no server-side API key — by design.

The Worker also binds two KV namespaces — `DEBATES` and `CODEBASES` (storage for
shared debates and codebases) — and an Analytics Engine dataset
`manticthink_events` (anonymous counters), all in `wrangler.toml`.

## Develop & deploy

```bash
npm install

# Local dev (point at any Ollama backend via .dev.vars)
npx wrangler dev

# Deploy (requires a Cloudflare API token with Workers access)
CLOUDFLARE_API_TOKEN=… npx wrangler deploy
```

Custom domains (`manticthink.com`, `www.manticthink.com`) are attached via the
`[[routes]]` entries in `wrangler.toml`.

## Tests

Pure Worker logic (option clamping, SSRF host-blocking, routing) lives in
`worker-lib.mjs` and is covered by `test/worker.test.mjs` — no external deps:

```bash
npm test    # node --test
```

## Author & license

Created and owned by **Colton Williams** — [LinkedIn](https://www.linkedin.com/in/colton-williams).

© 2026 Colton Williams. All rights reserved. This project is proprietary; see
[`LICENSE`](./LICENSE). No use, copying, or distribution without written
permission.
