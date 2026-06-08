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
  - Everything else — the static SEER site.

The visitor's key travels in the `Authorization` header from the browser and is
forwarded upstream per request. It is never stored or logged server-side.

## Configuration

Edit `wrangler.toml` `[vars]`:

| Var | Purpose |
|-----|---------|
| `OLLAMA_BASE_URL` | Upstream base (default `https://ollama.com`) |
| `CHAT_MODELS` | Comma-separated model list shown in the picker |
| `DEFAULT_MODEL` | Model used when a request omits one |

There is no server-side API key — by design.

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
