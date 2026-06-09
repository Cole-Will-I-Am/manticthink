/* SEER · Mantic Think — chat app logic */
'use strict';

const KEY_STORE = 'mt_ollama_key';
const $ = (id) => document.getElementById(id);
const els = {
  gate: $('gate'), keyInput: $('keyInput'), gateErr: $('gateErr'), connect: $('connect'),
  app: $('app'), scrim: $('scrim'), sidebar: $('sidebar'), convList: $('convList'),
  newChat: $('newChat'), disconnect: $('disconnect'), menuBtn: $('menuBtn'),
  model: $('model'), headerTitle: $('headerTitle'),
  main: $('main'), thread: $('thread'), scrollBtn: $('scrollBtn'),
  input: $('input'), send: $('send'), err: $('err'),
  settingsBtn: $('settingsBtn'), settingsModal: $('settingsModal'), setClose: $('setClose'),
  paramSliders: $('paramSliders'), sysPrompt: $('sysPrompt'),
  pNumPredict: $('pNumPredict'), pSeed: $('pSeed'), pStop: $('pStop'), setReset: $('setReset'),
  manageModelsBtn: $('manageModelsBtn'), modelModal: $('modelModal'), mmClose: $('mmClose'),
  mmYours: $('mmYours'), mmInput: $('mmInput'), mmAdd: $('mmAdd'),
  mmSearch: $('mmSearch'), mmCatalog: $('mmCatalog'), mmCount: $('mmCount'),
};

/* ---------- Generation settings (per-conversation, with global defaults) ---------- */
// Each conversation may override these via `current.params` (numbers / stop[]) and
// `current.system` (string). Editing a control also writes through to the global
// defaults (mt_default_params), so the next new chat inherits the last-used values.
const PARAM_DEFS = [
  { key: 'temperature',    label: 'Temperature',    min: 0, max: 2,   step: 0.05, def: 0.8, fmt: (v) => v.toFixed(2) },
  { key: 'top_p',          label: 'Top P',          min: 0, max: 1,   step: 0.01, def: 0.9, fmt: (v) => v.toFixed(2) },
  { key: 'top_k',          label: 'Top K',          min: 0, max: 200, step: 1,    def: 40,  fmt: (v) => String(v | 0) },
  { key: 'min_p',          label: 'Min P',          min: 0, max: 1,   step: 0.01, def: 0.0, fmt: (v) => v.toFixed(2) },
  { key: 'repeat_penalty', label: 'Repeat penalty', min: 0, max: 2,   step: 0.01, def: 1.1, fmt: (v) => v.toFixed(2) },
];
const PARAM_DEFAULTS_KEY = 'mt_default_params';
const SLIDER_KEYS = new Set(PARAM_DEFS.map((d) => d.key));

let paramDefaults = (() => {
  try { const v = JSON.parse(localStorage.getItem(PARAM_DEFAULTS_KEY)); return (v && typeof v === 'object') ? v : {}; } catch (e) { return {}; }
})();
// Migrate the old single-temperature default, if present.
(function migrateTemp() {
  const t = parseFloat(localStorage.getItem('mt_default_temp'));
  if (isFinite(t) && paramDefaults.temperature === undefined) { paramDefaults.temperature = t; saveDefaults(); }
})();
function saveDefaults() { try { localStorage.setItem(PARAM_DEFAULTS_KEY, JSON.stringify(paramDefaults)); } catch (e) {} }

// Effective value for the active conversation: per-conv override → global default → factory.
function effective(key) {
  if (current && current.params && current.params[key] !== undefined) return current.params[key];
  if (paramDefaults[key] !== undefined) return paramDefaults[key];
  const d = PARAM_DEFS.find((p) => p.key === key);
  return d ? d.def : undefined;
}
function effectiveSystem() {
  if (current && typeof current.system === 'string') return current.system;
  return (typeof paramDefaults._system === 'string') ? paramDefaults._system : '';
}
function isUnset(val) { return val === undefined || val === null || (Array.isArray(val) && !val.length); }
function setParam(key, val) {
  if (!current) return;
  current.params = current.params || {};
  if (isUnset(val)) { delete current.params[key]; delete paramDefaults[key]; }
  else { current.params[key] = val; paramDefaults[key] = val; }
  saveDefaults();
  if (current.messages.length) store.save(current);
}
function setSystem(text) {
  if (!current) return;
  current.system = text;
  if (text) paramDefaults._system = text; else delete paramDefaults._system;
  saveDefaults();
  if (current.messages.length) store.save(current);
}
function resetSettings() {
  paramDefaults = {}; saveDefaults();
  if (current) { current.params = {}; current.system = ''; if (current.messages.length) store.save(current); }
  renderSettings();
}

// Build the upstream `options` object from the active conversation's effective values.
function buildOptions() {
  const o = {};
  for (const d of PARAM_DEFS) { const v = effective(d.key); if (typeof v === 'number') o[d.key] = v; }
  const np = effective('num_predict'); if (typeof np === 'number') o.num_predict = np;
  const sd = effective('seed'); if (typeof sd === 'number') o.seed = sd;
  const st = effective('stop'); if (Array.isArray(st) && st.length) o.stop = st;
  return o;
}

function renderSettings() {
  els.paramSliders.innerHTML = '';
  for (const d of PARAM_DEFS) {
    const v = effective(d.key);
    const row = document.createElement('div'); row.className = 'sp-row';
    const lab = document.createElement('div'); lab.className = 'sp-label';
    const name = document.createElement('span'); name.textContent = d.label;
    const val = document.createElement('span'); val.textContent = d.fmt(v);
    lab.appendChild(name); lab.appendChild(val);
    const inp = document.createElement('input');
    inp.type = 'range'; inp.min = d.min; inp.max = d.max; inp.step = d.step; inp.value = v;
    inp.addEventListener('input', () => { const nv = parseFloat(inp.value); val.textContent = d.fmt(nv); setParam(d.key, nv); });
    row.appendChild(lab); row.appendChild(inp); els.paramSliders.appendChild(row);
  }
  els.sysPrompt.value = effectiveSystem();
  const np = effective('num_predict'); els.pNumPredict.value = (typeof np === 'number') ? np : '';
  const sd = effective('seed'); els.pSeed.value = (typeof sd === 'number') ? sd : '';
  const st = effective('stop'); els.pStop.value = (Array.isArray(st) && st.length) ? st.join(', ') : '';
}
function openSettings() { renderSettings(); els.settingsModal.classList.remove('hidden'); }
function closeSettings() { els.settingsModal.classList.add('hidden'); }

let apiKey = localStorage.getItem(KEY_STORE) || '';
let current = null;              // active conversation { id, title, model, messages: [] }
let streaming = false;
let controller = null;
let autoFollow = true;

const SUGGESTIONS = [
  'Explain quantum entanglement simply',
  'Write a haiku about the sea',
  'Why won’t my CSS flexbox center?',
  'Three startup ideas in climate tech',
];

/* ---------- Markdown (sanitized) ---------- */
if (window.marked) marked.setOptions({ gfm: true, breaks: true });
if (window.DOMPurify) {
  DOMPurify.addHook('afterSanitizeAttributes', (node) => {
    if (node.tagName === 'A') { node.setAttribute('target', '_blank'); node.setAttribute('rel', 'noopener nofollow'); }
  });
}
function renderMarkdown(text) {
  const dirty = window.marked ? marked.parse(text || '') : (text || '');
  return window.DOMPurify
    ? DOMPurify.sanitize(dirty, { FORBID_TAGS: ['style', 'script', 'iframe', 'form', 'input', 'button'], FORBID_ATTR: ['style'] })
    : '';
}
function renderAssistantHTML(bubble, text) {
  bubble.classList.remove('plain');
  bubble.innerHTML = renderMarkdown(text);
  bubble.querySelectorAll('pre code').forEach((el) => { try { window.hljs && hljs.highlightElement(el); } catch (e) {} });
  bubble.querySelectorAll('pre').forEach((pre) => {
    if (pre.querySelector('.copy-btn')) return;
    const btn = document.createElement('button');
    btn.className = 'copy-btn'; btn.type = 'button'; btn.textContent = 'Copy';
    btn.addEventListener('click', () => {
      const code = pre.querySelector('code');
      navigator.clipboard.writeText(code ? code.innerText : pre.innerText);
      btn.textContent = 'Copied'; btn.classList.add('ok');
      setTimeout(() => { btn.textContent = 'Copy'; btn.classList.remove('ok'); }, 1200);
    });
    pre.appendChild(btn);
  });
}

/* ---------- Storage ---------- */
const store = {
  INDEX: 'mt_conversations', ACTIVE: 'mt_active_conv',
  body: (id) => 'mt_conv_' + id,
  _get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
  _set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} },
  list() { return this._get(this.INDEX, []); },
  load(id) { return this._get(this.body(id), null); },
  save(conv) {
    conv.updatedAt = Date.now();
    this._set(this.body(conv.id), conv);
    const idx = this.list().filter((c) => c.id !== conv.id);
    idx.unshift({ id: conv.id, title: conv.title, model: conv.model, updatedAt: conv.updatedAt });
    idx.sort((a, b) => b.updatedAt - a.updatedAt);
    this._set(this.INDEX, idx);
  },
  remove(id) { try { localStorage.removeItem(this.body(id)); } catch (e) {} this._set(this.INDEX, this.list().filter((c) => c.id !== id)); },
  rename(id, title) { const c = this.load(id); if (c) { c.title = title; this.save(c); } },
  getActive() { try { return localStorage.getItem(this.ACTIVE); } catch (e) { return null; } },
  setActive(id) { try { localStorage.setItem(this.ACTIVE, id); } catch (e) {} },
};

function uid() { return (crypto && crypto.randomUUID) ? crypto.randomUUID() : 'c' + Date.now() + Math.random().toString(16).slice(2); }
function relTime(ts) {
  if (!ts) return '';
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return Math.floor(s / 60) + 'm ago';
  if (s < 86400) return Math.floor(s / 3600) + 'h ago';
  return Math.floor(s / 86400) + 'd ago';
}

/* ---------- Auth / gate ---------- */
function authHeader() { return { authorization: 'Bearer ' + apiKey }; }
function showApp(show) {
  els.gate.classList.toggle('hidden', show);
  els.app.classList.toggle('hidden', !show);
  if (show) els.input.focus(); else els.keyInput.focus();
}
/* ---------- Model list (per-user, curated) ---------- */
const MODELS_KEY = 'mt_models';
let catalogModels = [];
let catalogLoaded = false;

function getUserModels() {
  try { const v = JSON.parse(localStorage.getItem(MODELS_KEY)); if (Array.isArray(v) && v.length) return v; } catch (e) {}
  return null;
}
function setUserModels(list) {
  const uniq = [...new Set(list.filter(Boolean))];
  try { localStorage.setItem(MODELS_KEY, JSON.stringify(uniq)); } catch (e) {}
  return uniq;
}
function populateModelSelect() {
  const list = getUserModels() || ['default'];
  const cur = els.model.value;
  els.model.innerHTML = '';
  for (const m of list) { const o = document.createElement('option'); o.value = m; o.textContent = m; els.model.appendChild(o); }
  if (list.includes(cur)) els.model.value = cur;
}
async function loadModels() {
  if (!getUserModels()) {                       // seed from the site default once
    try { const r = await fetch('/api/models'); const d = await r.json(); if (d.models && d.models.length) setUserModels(d.models); } catch (e) {}
  }
  populateModelSelect();
}

function addModel(name) {
  name = (name || '').trim();
  if (!name) return;
  const list = getUserModels() || [];
  if (!list.includes(name)) setUserModels([...list, name]);
  populateModelSelect(); renderYours(); renderCatalog();
}
function removeModel(name) {
  setUserModels((getUserModels() || []).filter((m) => m !== name));
  populateModelSelect(); renderYours(); renderCatalog();
}

function renderYours() {
  const list = getUserModels() || [];
  els.mmYours.innerHTML = '';
  if (!list.length) { els.mmYours.innerHTML = '<div class="mm-empty">No models yet — add one below.</div>'; return; }
  for (const m of list) {
    const chip = document.createElement('span'); chip.className = 'mm-chip';
    const name = document.createElement('span'); name.textContent = m;
    const x = document.createElement('button'); x.type = 'button'; x.textContent = '✕'; x.title = 'Remove';
    x.addEventListener('click', () => removeModel(m));
    chip.appendChild(name); chip.appendChild(x); els.mmYours.appendChild(chip);
  }
}
function renderCatalog() {
  const q = (els.mmSearch.value || '').trim().toLowerCase();
  const owned = new Set(getUserModels() || []);
  els.mmCount.textContent = catalogModels.length ? '(' + catalogModels.length + ')' : '';
  if (!catalogLoaded) { els.mmCatalog.innerHTML = '<div class="mm-loading">Loading catalog…</div>'; return; }
  const list = catalogModels.filter((m) => !q || m.toLowerCase().includes(q));
  els.mmCatalog.innerHTML = '';
  if (!list.length) { els.mmCatalog.innerHTML = '<div class="mm-loading">No matching models.</div>'; return; }
  for (const m of list) {
    const row = document.createElement('div'); row.className = 'mm-row';
    const name = document.createElement('span'); name.textContent = m;
    const btn = document.createElement('button'); btn.type = 'button';
    if (owned.has(m)) { btn.textContent = 'Added'; btn.disabled = true; }
    else { btn.textContent = '+ Add'; btn.addEventListener('click', () => addModel(m)); }
    row.appendChild(name); row.appendChild(btn); els.mmCatalog.appendChild(row);
  }
}
async function loadCatalog() {
  try { const r = await fetch('/api/catalog', { headers: authHeader() }); const d = await r.json(); catalogModels = d.models || []; }
  catch (e) { catalogModels = []; }
  catalogLoaded = true; renderCatalog();
}
function openModelModal() {
  closeSettings();
  els.mmInput.value = ''; els.mmSearch.value = '';
  els.modelModal.classList.remove('hidden');
  renderYours(); renderCatalog();
  if (!catalogLoaded) loadCatalog();
}
function closeModelModal() { els.modelModal.classList.add('hidden'); }
async function validateKey(key) {
  const r = await fetch('/api/validate', { method: 'POST', headers: { authorization: 'Bearer ' + key } });
  return r.json().catch(() => ({ ok: false }));
}
async function connect() {
  const key = els.keyInput.value.trim();
  els.gateErr.textContent = '';
  if (!key) { els.gateErr.textContent = 'Enter your Ollama API key.'; return; }
  els.connect.disabled = true; els.connect.textContent = 'Connecting…';
  try {
    const res = await validateKey(key);
    if (res.ok) { apiKey = key; localStorage.setItem(KEY_STORE, key); await loadModels(); enterApp(); }
    else els.gateErr.textContent = res.error || 'That key was rejected.';
  } catch (e) { els.gateErr.textContent = 'Network error. Try again.'; }
  finally { els.connect.disabled = false; els.connect.textContent = 'Connect'; }
}
function disconnect() {
  apiKey = ''; localStorage.removeItem(KEY_STORE);
  current = null; els.keyInput.value = '';
  showApp(false);  // conversations are kept in storage
}
function enterApp() { showApp(true); openMostRecentOrNew(); renderSidebar(); }

/* ---------- Conversations ---------- */
function newConversation() {
  current = { id: uid(), title: 'New chat', model: els.model.value, messages: [], updatedAt: Date.now() };
  store.setActive(current.id);
  renderConversation(); renderSidebar();
  els.input.focus();
}
function openConversation(id) {
  const conv = store.load(id);
  if (!conv) return;
  // Migrate the legacy per-conversation `temperature` field into `params`.
  if (typeof conv.temperature === 'number' && (!conv.params || conv.params.temperature === undefined)) {
    conv.params = conv.params || {}; conv.params.temperature = conv.temperature;
  }
  current = conv; store.setActive(id);
  if (conv.model && [...els.model.options].some((o) => o.value === conv.model)) els.model.value = conv.model;
  renderConversation(); renderSidebar();
}
function openMostRecentOrNew() {
  const list = store.list();
  if (list.length) openConversation(list[0].id); else newConversation();
}
function deleteConversation(id) {
  store.remove(id);
  if (current && current.id === id) { current = null; openMostRecentOrNew(); }
  renderSidebar();
}

/* ---------- Rendering ---------- */
function updateHeaderTitle() { els.headerTitle.textContent = (current && current.messages.length && current.title) ? current.title : 'Mantic Think'; }

function renderEmpty() {
  const e = document.createElement('div'); e.className = 'empty';
  e.innerHTML = '<span class="wordmark">SEER</span><p>Ask anything. Responses stream from Ollama.</p>';
  const chips = document.createElement('div'); chips.className = 'chips';
  SUGGESTIONS.forEach((s) => {
    const c = document.createElement('button'); c.className = 'chip'; c.type = 'button'; c.textContent = s;
    c.addEventListener('click', () => { els.input.value = s; autosize(); send(); });
    chips.appendChild(c);
  });
  e.appendChild(chips); els.thread.appendChild(e);
}
function removeEmptyState() { const e = els.thread.querySelector('.empty'); if (e) e.remove(); }

function addUserBubble(text) {
  const wrap = document.createElement('div'); wrap.className = 'msg user';
  const col = document.createElement('div'); col.className = 'col';
  const role = document.createElement('div'); role.className = 'role'; role.textContent = 'You';
  const bubble = document.createElement('div'); bubble.className = 'bubble'; bubble.textContent = text;
  col.appendChild(role); col.appendChild(bubble); wrap.appendChild(col);
  els.thread.appendChild(wrap); scrollDown();
}

function buildAssistantNode() {
  const wrap = document.createElement('div'); wrap.className = 'msg assistant';
  const col = document.createElement('div'); col.className = 'col';
  const role = document.createElement('div'); role.className = 'role'; role.textContent = 'SEER';
  col.appendChild(role);
  const bubble = document.createElement('div'); bubble.className = 'bubble plain';
  const typing = document.createElement('span'); typing.className = 'typing';
  typing.innerHTML = '<span></span><span></span><span></span>';
  bubble.appendChild(typing);
  col.appendChild(bubble); wrap.appendChild(col); els.thread.appendChild(wrap); scrollDown();

  let thinkEl = null, thinkBody = null;
  function ensureThink() {
    if (thinkEl) return;
    thinkEl = document.createElement('details'); thinkEl.className = 'thinking'; thinkEl.open = true;
    const sum = document.createElement('summary'); sum.textContent = 'Thinking';
    thinkBody = document.createElement('div'); thinkBody.className = 'think-body';
    thinkEl.appendChild(sum); thinkEl.appendChild(thinkBody);
    col.insertBefore(thinkEl, bubble);
  }
  return {
    wrap, col, bubble,
    clearTyping() { if (typing.parentElement) typing.remove(); },
    setThinking(t) { ensureThink(); thinkBody.textContent = t; },
    collapseThinking() { if (thinkEl) thinkEl.open = false; },
    setStats(s) {
      const div = document.createElement('div'); div.className = 'stats';
      const toks = s.eval_count; const secs = s.eval_duration ? s.eval_duration / 1e9 : 0;
      div.textContent = (secs && toks) ? `${toks} tokens · ${(toks / secs).toFixed(1)} tok/s` : (toks ? `${toks} tokens` : '');
      if (div.textContent) col.appendChild(div);
    },
    addActions() {
      const row = document.createElement('div'); row.className = 'actions';
      const copy = document.createElement('button'); copy.className = 'act-btn'; copy.type = 'button'; copy.textContent = 'Copy';
      copy.addEventListener('click', () => {
        navigator.clipboard.writeText(bubble.dataset.raw || bubble.textContent);
        copy.textContent = 'Copied'; copy.classList.add('ok');
        setTimeout(() => { copy.textContent = 'Copy'; copy.classList.remove('ok'); }, 1200);
      });
      const regen = document.createElement('button'); regen.className = 'act-btn'; regen.type = 'button'; regen.textContent = 'Regenerate';
      regen.addEventListener('click', regenerate);
      row.appendChild(copy); row.appendChild(regen); col.appendChild(row);
    },
  };
}

function renderAssistantMessage(m) {
  const a = buildAssistantNode();
  a.clearTyping();
  if (m.thinking) { a.setThinking(m.thinking); a.collapseThinking(); }
  if (m.content) { renderAssistantHTML(a.bubble, m.content); a.bubble.dataset.raw = m.content; }
  else a.bubble.textContent = '…';
  if (m.stats) a.setStats(m.stats);
  a.addActions();
}

function renderConversation() {
  els.thread.innerHTML = '';
  if (!current || current.messages.length === 0) { renderEmpty(); updateHeaderTitle(); return; }
  for (const m of current.messages) {
    if (m.role === 'user') addUserBubble(m.content);
    else if (m.role === 'assistant') renderAssistantMessage(m);
  }
  updateHeaderTitle(); autoFollow = true; scrollDown(true);
}

function renderSidebar() {
  const list = store.list();
  els.convList.innerHTML = '';
  if (!list.length) { els.convList.innerHTML = '<div class="conv-empty">No conversations yet</div>'; return; }
  for (const c of list) {
    const row = document.createElement('div');
    row.className = 'conv-row' + (current && c.id === current.id ? ' active' : '');
    const title = document.createElement('div'); title.className = 'conv-title'; title.textContent = c.title || 'Untitled';
    const time = document.createElement('div'); time.className = 'conv-time'; time.textContent = relTime(c.updatedAt);
    const acts = document.createElement('div'); acts.className = 'conv-actions';
    const ren = document.createElement('button'); ren.className = 'conv-act'; ren.type = 'button'; ren.textContent = '✎'; ren.title = 'Rename';
    ren.addEventListener('click', (ev) => {
      ev.stopPropagation();
      const nt = prompt('Rename conversation', c.title || '');
      if (nt && nt.trim()) { store.rename(c.id, nt.trim()); if (current && current.id === c.id) { current.title = nt.trim(); updateHeaderTitle(); } renderSidebar(); }
    });
    const del = document.createElement('button'); del.className = 'conv-act del'; del.type = 'button'; del.textContent = '✕'; del.title = 'Delete';
    del.addEventListener('click', (ev) => { ev.stopPropagation(); if (confirm('Delete this conversation?')) deleteConversation(c.id); });
    acts.appendChild(ren); acts.appendChild(del);
    row.appendChild(title); row.appendChild(time); row.appendChild(acts);
    row.addEventListener('click', () => { openConversation(c.id); closeDrawer(); });
    els.convList.appendChild(row);
  }
}

/* ---------- Streaming ---------- */
function setStreaming(on) {
  streaming = on;
  els.send.classList.toggle('stopping', on);
  els.send.textContent = on ? '■' : '↑';
  els.send.title = on ? 'Stop' : 'Send';
}

async function streamAssistant() {
  const a = buildAssistantNode();
  controller = new AbortController();
  setStreaming(true);
  let acc = '', accThink = '', stats = null, firstTok = false, sawContent = false, failed = false;
  try {
    const reqMsgs = [];
    const sys = effectiveSystem().trim();
    if (sys) reqMsgs.push({ role: 'system', content: sys });
    for (const m of current.messages) reqMsgs.push({ role: m.role, content: m.content });
    const resp = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...authHeader() },
      body: JSON.stringify({ model: els.model.value, messages: reqMsgs, options: buildOptions() }),
      signal: controller.signal,
    });
    if (resp.status === 401) { disconnect(); throw new Error('Your key was rejected — please reconnect.'); }
    if (!resp.ok || !resp.body) { const d = await resp.text().catch(() => ''); throw new Error('Request failed (' + resp.status + ') ' + d.slice(0, 160)); }
    const reader = resp.body.getReader(); const dec = new TextDecoder(); let buf = '';
    while (true) {
      const { value, done } = await reader.read(); if (done) break;
      buf += dec.decode(value, { stream: true });
      const lines = buf.split('\n'); buf = lines.pop();
      for (const line of lines) {
        const t = line.trim(); if (!t) continue;
        let obj; try { obj = JSON.parse(t); } catch (e) { continue; }
        if (obj.error) throw new Error(obj.error);
        const msg = obj.message || {};
        if (msg.thinking) { if (!firstTok) { firstTok = true; a.clearTyping(); } accThink += msg.thinking; a.setThinking(accThink); maybeScroll(); }
        if (msg.content) {
          if (!firstTok) { firstTok = true; a.clearTyping(); }
          if (!sawContent) { sawContent = true; a.collapseThinking(); }
          acc += msg.content; a.bubble.textContent = acc; a.bubble.classList.add('cursor'); maybeScroll();
        }
        if (obj.done) stats = { eval_count: obj.eval_count, eval_duration: obj.eval_duration };
      }
    }
  } catch (e) {
    if (e.name !== 'AbortError') { failed = true; showErr(e.message || 'Something went wrong.'); }
  }

  setStreaming(false); controller = null;
  a.clearTyping(); a.bubble.classList.remove('cursor');

  if (failed && !acc && !accThink) { a.wrap.remove(); return; }

  if (acc) { renderAssistantHTML(a.bubble, acc); a.bubble.dataset.raw = acc; }
  else if (!accThink) { a.bubble.textContent = '…'; }
  a.collapseThinking();
  if (stats) a.setStats(stats);
  a.addActions();

  current.messages.push({ role: 'assistant', content: acc, thinking: accThink || undefined, stats: stats || undefined });
  if (current.title === 'New chat') {
    const fu = current.messages.find((m) => m.role === 'user');
    if (fu) current.title = (fu.content.slice(0, 42).trim() || 'New chat');
  }
  store.save(current); renderSidebar(); updateHeaderTitle(); maybeScroll(true);
}

async function send() {
  const text = els.input.value.trim();
  if (!text || streaming) return;
  showErr('');
  els.input.value = ''; autosize();
  if (!current) newConversation();
  removeEmptyState();
  current.messages.push({ role: 'user', content: text });
  addUserBubble(text);
  autoFollow = true;
  await streamAssistant();
}

async function regenerate() {
  if (streaming || !current) return;
  if (current.messages.length && current.messages[current.messages.length - 1].role === 'assistant') current.messages.pop();
  if (!current.messages.some((m) => m.role === 'user')) return;
  renderConversation();
  autoFollow = true;
  await streamAssistant();
}

/* ---------- Misc UI ---------- */
function showErr(msg) { els.err.textContent = msg; els.err.style.display = msg ? 'block' : 'none'; }
function autosize() { els.input.style.height = 'auto'; els.input.style.height = Math.min(els.input.scrollHeight, 180) + 'px'; }
function nearBottom() { return els.main.scrollHeight - els.main.scrollTop - els.main.clientHeight < 90; }
function scrollDown(force) { if (force || autoFollow) els.main.scrollTop = els.main.scrollHeight; }
function maybeScroll(force) { scrollDown(force); }
function openDrawer() { document.body.classList.add('drawer-open'); }
function closeDrawer() { document.body.classList.remove('drawer-open'); }

/* ---------- Events ---------- */
els.connect.addEventListener('click', connect);
els.keyInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') connect(); });
els.disconnect.addEventListener('click', disconnect);
els.newChat.addEventListener('click', () => { newConversation(); closeDrawer(); });
els.menuBtn.addEventListener('click', openDrawer);
els.scrim.addEventListener('click', closeDrawer);
els.model.addEventListener('change', () => { if (current) { current.model = els.model.value; } });
els.send.addEventListener('click', () => { if (streaming) { if (controller) controller.abort(); } else send(); });
els.input.addEventListener('input', autosize);
els.input.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); if (!streaming) send(); } });
els.main.addEventListener('scroll', () => { autoFollow = nearBottom(); els.scrollBtn.classList.toggle('hidden', autoFollow); });
els.scrollBtn.addEventListener('click', () => { autoFollow = true; scrollDown(true); });

els.settingsBtn.addEventListener('click', (e) => { e.stopPropagation(); openSettings(); });
els.setClose.addEventListener('click', closeSettings);
els.settingsModal.addEventListener('click', (e) => { if (e.target === els.settingsModal) closeSettings(); });
els.sysPrompt.addEventListener('input', () => setSystem(els.sysPrompt.value));
els.pNumPredict.addEventListener('input', () => {
  const r = els.pNumPredict.value.trim();
  if (r === '') return setParam('num_predict', undefined);
  const n = parseInt(r, 10); setParam('num_predict', isFinite(n) ? n : undefined);
});
els.pSeed.addEventListener('input', () => {
  const r = els.pSeed.value.trim();
  if (r === '') return setParam('seed', undefined);
  const n = parseInt(r, 10); setParam('seed', isFinite(n) ? n : undefined);
});
els.pStop.addEventListener('input', () => {
  const arr = els.pStop.value.split(/[\n,]/).map((s) => s.trim()).filter(Boolean);
  setParam('stop', arr.length ? arr : undefined);
});
els.setReset.addEventListener('click', resetSettings);

els.manageModelsBtn.addEventListener('click', (e) => { e.stopPropagation(); closeSettings(); openModelModal(); });
els.mmClose.addEventListener('click', closeModelModal);
els.modelModal.addEventListener('click', (e) => { if (e.target === els.modelModal) closeModelModal(); });
els.mmAdd.addEventListener('click', () => { addModel(els.mmInput.value); els.mmInput.value = ''; });
els.mmInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') { addModel(els.mmInput.value); els.mmInput.value = ''; } });
els.mmSearch.addEventListener('input', renderCatalog);

/* ---------- Boot ---------- */
(async function boot() {
  if (apiKey) {
    const res = await validateKey(apiKey).catch(() => ({ ok: false }));
    if (res.ok) { await loadModels(); enterApp(); return; }
    localStorage.removeItem(KEY_STORE); apiKey = '';
  }
  showApp(false);
})();
