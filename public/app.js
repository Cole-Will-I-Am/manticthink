/* SEER · Mantic Think — chat app logic */
'use strict';

const KEY_STORE = 'mt_ollama_key';
const REMEMBER_KEY = 'mt_remember_key';
const $ = (id) => document.getElementById(id);

// API key storage: persistent (localStorage) is opt-in; otherwise session-only
// (sessionStorage, cleared when the tab closes) to limit XSS exposure.
function readKey() { try { return sessionStorage.getItem(KEY_STORE) || localStorage.getItem(KEY_STORE) || ''; } catch (e) { return ''; } }
function writeKey(key, persist) {
  try {
    localStorage.setItem(REMEMBER_KEY, persist ? '1' : '0');
    if (persist) { localStorage.setItem(KEY_STORE, key); sessionStorage.removeItem(KEY_STORE); }
    else { sessionStorage.setItem(KEY_STORE, key); localStorage.removeItem(KEY_STORE); }
  } catch (e) {}
}
function clearKey() { try { localStorage.removeItem(KEY_STORE); sessionStorage.removeItem(KEY_STORE); } catch (e) {} }
function rememberPref() { try { return localStorage.getItem(REMEMBER_KEY) !== '0'; } catch (e) { return true; } }

// Connection mode: 'cloud' (key via our proxy) or 'local' (the browser talks
// straight to the user's own Ollama instance — requests never touch our
// servers). Local model list is kept under its own storage key so switching
// modes doesn't clobber the cloud list.
const MODE_KEY = 'mt_mode';
const LOCAL_URL_KEY = 'mt_local_url';
const LOCAL_MODELS_KEY = 'mt_models_local';
let localMode = (() => { try { return localStorage.getItem(MODE_KEY) === 'local'; } catch (e) { return false; } })();
function setLocalMode(on) { localMode = on; try { localStorage.setItem(MODE_KEY, on ? 'local' : 'cloud'); } catch (e) {} }
function localBase() {
  try { return (localStorage.getItem(LOCAL_URL_KEY) || 'http://localhost:11434').replace(/\/+$/, ''); }
  catch (e) { return 'http://localhost:11434'; }
}
async function probeLocal(timeoutMs) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs || 4000);
  try {
    const r = await fetch(localBase() + '/api/tags', { signal: ctrl.signal });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    const d = await r.json();
    return (d.models || []).map((m) => m.name).filter(Boolean);
  } finally { clearTimeout(t); }
}
const els = {
  gate: $('gate'), keyInput: $('keyInput'), gateErr: $('gateErr'), connect: $('connect'), rememberKey: $('rememberKey'),
  connectLocal: $('connectLocal'), localHint: $('localHint'), modeBadge: $('modeBadge'),
  app: $('app'), scrim: $('scrim'), sidebar: $('sidebar'), convList: $('convList'),
  newChat: $('newChat'), newProject: $('newProject'), newCodebase: $('newCodebase'),
  disconnect: $('disconnect'), menuBtn: $('menuBtn'), collapseBtn: $('collapseBtn'),
  model: $('model'), headerTitle: $('headerTitle'),
  main: $('main'), thread: $('thread'), scrollBtn: $('scrollBtn'),
  input: $('input'), send: $('send'), err: $('err'),
  attachBtn: $('attachBtn'), fileInput: $('fileInput'), attachBar: $('attachBar'),
  settingsBtn: $('settingsBtn'), settingsModal: $('settingsModal'), setClose: $('setClose'),
  paramSliders: $('paramSliders'), sysPrompt: $('sysPrompt'),
  pNumPredict: $('pNumPredict'), pSeed: $('pSeed'), pStop: $('pStop'), setReset: $('setReset'),
  visualsToggle: $('visualsToggle'), toolsToggle: $('toolsToggle'), toolList: $('toolList'),
  mcpUrl: $('mcpUrl'), mcpToken: $('mcpToken'), mcpAdd: $('mcpAdd'), mcpErr: $('mcpErr'),
  manageModelsBtn: $('manageModelsBtn'), modelModal: $('modelModal'), mmClose: $('mmClose'),
  mmYours: $('mmYours'), mmInput: $('mmInput'), mmAdd: $('mmAdd'),
  mmSearch: $('mmSearch'), mmCatalog: $('mmCatalog'), mmCount: $('mmCount'),
  mmPresets: $('mmPresets'), mmPresetNew: $('mmPresetNew'),
  presetModal: $('presetModal'), pmTitle: $('pmTitle'), pmClose: $('pmClose'), pmErr: $('pmErr'),
  pmName: $('pmName'), pmBase: $('pmBase'), pmSystem: $('pmSystem'),
  pmTemp: $('pmTemp'), pmTopP: $('pmTopP'), pmTopK: $('pmTopK'), pmMaxTok: $('pmMaxTok'),
  pmSave: $('pmSave'), pmCancel: $('pmCancel'),
  scaffoldBtn: $('scaffoldBtn'), scaffoldBar: $('scaffoldBar'),
  debateBtn: $('debateBtn'), debateModal: $('debateModal'), dbClose: $('dbClose'),
  dbTopic: $('dbTopic'), dbModelA: $('dbModelA'), dbModelB: $('dbModelB'),
  dbMode: $('dbMode'), dbRounds: $('dbRounds'), dbStart: $('dbStart'), dbStop: $('dbStop'), dbFeed: $('dbFeed'),
  dbSave: $('dbSave'), dbSavedBtn: $('dbSavedBtn'), dbSaved: $('dbSaved'),
  dbSynth: $('dbSynth'), dbShare: $('dbShare'),
  dbCard: $('dbCard'), dbHead: $('dbHead'), dbCta: $('dbCta'), dbCtaStart: $('dbCtaStart'), dbCtaCopy: $('dbCtaCopy'),
  dbPair: $('dbPair'), dbRoles: $('dbRoles'), dbRolesWrap: $('dbRolesWrap'), dbSeats: $('dbSeats'),
  scaffoldModal: $('scaffoldModal'), scClose: $('scClose'), scSearch: $('scSearch'),
  scNew: $('scNew'), scList: $('scList'), scTemplates: $('scTemplates'),
  scaffoldBuilder: $('scaffoldBuilder'), sbTitle: $('sbTitle'), sbClose: $('sbClose'), sbErrors: $('sbErrors'),
  sbName: $('sbName'), sbSummary: $('sbSummary'), sbRole: $('sbRole'), sbPerspective: $('sbPerspective'), sbTone: $('sbTone'),
  sbSteps: $('sbSteps'), sbMust: $('sbMust'), sbNever: $('sbNever'), sbDisc: $('sbDisc'), sbProh: $('sbProh'),
  sbPreview: $('sbPreview'), sbSave: $('sbSave'), sbCancel: $('sbCancel'),
  snippetsBtn: $('snippetsBtn'), snippetsModal: $('snippetsModal'), snClose: $('snClose'), snSearch: $('snSearch'), snList: $('snList'),
  githubBtn: $('githubBtn'), githubModal: $('githubModal'), ghClose: $('ghClose'),
  ghGate: $('ghGate'), ghBrowser: $('ghBrowser'), ghToken: $('ghToken'), ghGateErr: $('ghGateErr'), ghConnect: $('ghConnect'),
  ghLogin: $('ghLogin'), ghDisconnect: $('ghDisconnect'), ghRepoSearch: $('ghRepoSearch'), ghRepoGo: $('ghRepoGo'), ghRepos: $('ghRepos'),
  ghRepoView: $('ghRepoView'), ghRepoName: $('ghRepoName'), ghBranch: $('ghBranch'), ghFileSearch: $('ghFileSearch'),
  ghFiles: $('ghFiles'), ghSelCount: $('ghSelCount'), ghAttach: $('ghAttach'),
  projectBar: $('projectBar'), projectModal: $('projectModal'), pjTitle: $('pjTitle'), pjClose: $('pjClose'),
  pjName: $('pjName'), pjInstr: $('pjInstr'), pjFiles: $('pjFiles'), pjSize: $('pjSize'), pjUpload: $('pjUpload'),
  pjPaste: $('pjPaste'), pjPasteName: $('pjPasteName'), pjPasteAdd: $('pjPasteAdd'),
  pjSave: $('pjSave'), pjDelete: $('pjDelete'), pjCancel: $('pjCancel'),
  chatPane: $('chatPane'), codebasePane: $('codebasePane'),
  cbBack: $('cbBack'), cbName: $('cbName'), cbModels: $('cbModels'), cbStatus: $('cbStatus'), cbStop: $('cbStop'),
  cbExportBtn: $('cbExportBtn'), cbExportMenu: $('cbExportMenu'), cbSettingsBtn: $('cbSettingsBtn'),
  cbNewFile: $('cbNewFile'), cbTree: $('cbTree'), cbEditPath: $('cbEditPath'), cbCopyFile: $('cbCopyFile'), cbEdit: $('cbEdit'),
  cbThread: $('cbThread'), cbErr: $('cbErr'), cbInput: $('cbInput'), cbSend: $('cbSend'),
  codebaseModal: $('codebaseModal'), cbmTitle: $('cbmTitle'), cbmClose: $('cbmClose'), cbmName: $('cbmName'),
  cbmBuilder: $('cbmBuilder'), cbmReviewer: $('cbmReviewer'), cbmReviewerOn: $('cbmReviewerOn'),
  cbmRounds: $('cbmRounds'), cbmRoundsVal: $('cbmRoundsVal'), cbmSave: $('cbmSave'), cbmDelete: $('cbmDelete'), cbmCancel: $('cbmCancel'),
  cbGithubModal: $('cbGithubModal'), cbghClose: $('cbghClose'), cbghGate: $('cbghGate'), cbghToken: $('cbghToken'), cbghGateErr: $('cbghGateErr'), cbghConnect: $('cbghConnect'),
  cbghForm: $('cbghForm'), cbghUser: $('cbghUser'), cbghRepo: $('cbghRepo'), cbghCreate: $('cbghCreate'), cbghBranch: $('cbghBranch'), cbghMsg: $('cbghMsg'), cbghForce: $('cbghForce'),
  cbghStatus: $('cbghStatus'), cbghPush: $('cbghPush'), cbghDisconnect: $('cbghDisconnect'), cbghCancel: $('cbghCancel'),
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
  els.visualsToggle.checked = visualsOn();
  els.toolsToggle.checked = toolsOn();
  renderToolList();
}
function openSettings() { renderSettings(); els.settingsModal.classList.remove('hidden'); }
function closeSettings() { els.settingsModal.classList.add('hidden'); }

/* ---------- Reasoning scaffolds ---------- */
// A scaffold is a structured, reusable system-prompt template. It compiles
// deterministically into a Markdown block injected as a system message ahead of
// the user's own system prompt. Ported from the SEER iOS app's scaffold engine.
const SCAFFOLDS_KEY = 'mt_scaffolds';
const SCAFFOLD_FLEX = "Reasoning scaffolds are meant for reasoning, not strict rules; adapt structure and depth to the user's request.";

function scNorm(v) { return (v || '').trim(); }
function scList(a) { return (a || []).map((x) => (x || '').trim()).filter(Boolean); }

function compileScaffold(s) {
  const sections = [];
  const name = scNorm(s.name);
  sections.push(name ? `## Reasoning Scaffold\n${name}` : '## Reasoning Scaffold');
  if (scNorm(s.summary)) sections.push(`## Purpose\n${scNorm(s.summary)}`);
  sections.push(`## Flexibility\n${SCAFFOLD_FLEX}`);
  sections.push(`## Role\n${scNorm(s.role)}`);
  sections.push(`## Perspective\n${scNorm(s.perspective)}`);
  if (scNorm(s.tone)) sections.push(`## Tone\n${scNorm(s.tone)}`);
  const steps = scList(s.reasoningSteps);
  if (steps.length) sections.push('## Reasoning Steps\n' + steps.map((st, i) => `${i + 1}. ${st}`).join('\n'));
  const out = [];
  if (scNorm(s.outputFormat)) out.push(`Preferred response shape (optional): ${scNorm(s.outputFormat)}`);
  const must = scList(s.mustInclude); if (must.length) out.push('Helpful elements to cover when relevant:\n' + must.map((x) => `- ${x}`).join('\n'));
  const never = scList(s.neverInclude); if (never.length) out.push('Avoid by default unless the user asks:\n' + never.map((x) => `- ${x}`).join('\n'));
  if (out.length) sections.push('## Output Guidance\n' + out.join('\n\n'));
  const safety = [];
  const disc = scList(s.disclaimers); if (disc.length) safety.push('Disclaimers:\n' + disc.map((x) => `- ${x}`).join('\n'));
  const proh = scList(s.prohibitedActions); if (proh.length) safety.push('Prohibited actions:\n' + proh.map((x) => `- ${x}`).join('\n'));
  if (safety.length) sections.push('## Safety Hints\n' + safety.join('\n\n'));
  return sections.join('\n\n');
}

function validateScaffold(d) {
  const errs = [];
  const name = scNorm(d.name), role = scNorm(d.role), persp = scNorm(d.perspective);
  const steps = scList(d.reasoningSteps);
  if (!name) errs.push('Name is required.');
  if (!role) errs.push('Role is required.');
  if (!persp) errs.push('Perspective is required.');
  if (!steps.length) errs.push('At least one reasoning step is required.');
  if (name.length > 80) errs.push('Name must be 80 characters or fewer.');
  if (scNorm(d.summary).length > 240) errs.push('Summary must be 240 characters or fewer.');
  if (role.length > 120) errs.push('Role must be 120 characters or fewer.');
  if (persp.length > 300) errs.push('Perspective must be 300 characters or fewer.');
  if (scNorm(d.tone).length > 120) errs.push('Tone must be 120 characters or fewer.');
  if (steps.length > 12) errs.push('Use 12 reasoning steps or fewer.');
  if (steps.some((s) => s.length > 220)) errs.push('Each reasoning step must be 220 characters or fewer.');
  if (scList(d.mustInclude).some((s) => s.length > 180)) errs.push('Each "helpful element" must be 180 characters or fewer.');
  if (scList(d.neverInclude).some((s) => s.length > 180)) errs.push('Each "avoid by default" item must be 180 characters or fewer.');
  if (scList(d.disclaimers).some((s) => s.length > 220)) errs.push('Each disclaimer must be 220 characters or fewer.');
  if (scList(d.prohibitedActions).some((s) => s.length > 220)) errs.push('Each prohibited action must be 220 characters or fewer.');
  return errs;
}

const SCAFFOLD_TEMPLATES = [
  { blurb: 'Layered structural reasoning for tensions, opportunities, and leverage.', draft: {
    name: 'Mantic', summary: 'Map layered system dynamics, find tension and alignment, then recommend leverage.',
    role: 'Structural reasoning analyst',
    perspective: 'Think in four internal layers and explain in plain language without framework jargon unless asked.',
    tone: 'Clear and pragmatic',
    reasoningSteps: [
      'Define the goal, decision horizon, and key constraints.',
      'Map Micro: individual or localized effects. Example: in a supply chain, disruptions at a single supplier can be quantified for immediate production impact.',
      'Map Meso: group-level or regional dynamics. Example: aggregated supplier disruptions impact regional manufacturing and logistics operations.',
      'Map Macro: system-wide impacts. Example: the cumulative effect on national or global supply chains.',
      'Map Meta: long-term evolution and paradigm shifts. Example: permanent industry-wide changes, such as a shift to localized production.',
      'Identify the strongest cross-layer tension and strongest alignment, then pick the highest-leverage intervention.',
      'Deliver the recommendation in plain language with assumptions, risk, opportunity, and next move.'],
    outputFormat: '', mustInclude: ['Working conclusion', 'Primary cross-layer tension', 'Biggest risk and best opportunity', 'Practical next move', 'Confidence and what would change it'],
    neverInclude: ['Framework jargon unless the user asks for it'], disclaimers: [], prohibitedActions: [] } },
  { blurb: 'High-signal code reviews focused on bugs, risks, and concrete fixes.', draft: {
    name: 'Code Expert/Reviewer', summary: 'Review code for correctness, regressions, performance risks, and test gaps.',
    role: 'Senior software engineer and code reviewer',
    perspective: 'Prioritize high-severity issues first, explain impact, and propose minimal, verifiable fixes.',
    tone: 'Direct and technical',
    reasoningSteps: [
      'Understand intent, constraints, and expected behavior before judging implementation.',
      'Identify correctness bugs, edge cases, and likely regressions.',
      'Assess maintainability, readability, and long-term risk in changed surfaces.',
      'Recommend concrete fixes with validation steps and missing tests.'],
    outputFormat: '', mustInclude: ['Highest-severity findings', 'Why they matter', 'Concrete fix path', 'Test coverage gaps'],
    neverInclude: ['Vague criticism without actionable guidance'], disclaimers: [], prohibitedActions: [] } },
  { blurb: 'Stepwise teaching with checks for understanding.', draft: {
    name: 'Tutor', summary: 'Explain concepts progressively and verify understanding.',
    role: 'Patient subject tutor', perspective: 'Concept-first, examples second, reinforce intuition.', tone: 'Supportive and clear',
    reasoningSteps: ['Assess learner intent and current understanding', 'Explain key concept in plain language', 'Give one concrete example', 'Provide a quick check question or recap'],
    outputFormat: '', mustInclude: ['Simple explanation', 'Example'], neverInclude: ['Shaming language'], disclaimers: [], prohibitedActions: [] } },
  { blurb: 'Root-cause debugging with actionable fixes.', draft: {
    name: 'Technical Debugger', summary: 'Diagnose technical issues and produce minimal-risk fixes.',
    role: 'Senior software debugger', perspective: 'Repro-first, isolate variables, fix smallest surface area.', tone: 'Precise and practical',
    reasoningSteps: ['Restate failure symptom and expected behavior', 'Generate likely root-cause hypotheses', 'Propose fastest verification steps', 'Recommend fix with validation checklist'],
    outputFormat: '', mustInclude: ['Likely root cause', 'Verification steps', 'Proposed fix'], neverInclude: ['Speculative claims without checks'], disclaimers: [], prohibitedActions: [] } },
  { blurb: 'Tradeoff-driven recommendations and decision framing.', draft: {
    name: 'Decision Coach', summary: 'Help choose between options with transparent tradeoffs.',
    role: 'Decision strategy coach', perspective: 'Clarify criteria, compare options, commit with confidence level.', tone: 'Grounded and pragmatic',
    reasoningSteps: ['Clarify objective and decision criteria', 'Compare options against criteria', 'Highlight key risks and mitigations', 'Recommend a choice and next action'],
    outputFormat: '', mustInclude: ['Decision criteria', 'Recommendation'], neverInclude: ['False certainty'], disclaimers: [], prohibitedActions: [] } },
  { blurb: 'Frontend UI/UX concept generation with practical execution direction.', draft: {
    name: 'Creative Strategist', summary: 'Design standout frontend UI/UX concepts and convert them into build-ready direction.',
    role: 'Frontend UI/UX creative strategist', perspective: 'Balance visual ambition with usability, accessibility, and implementation realism.', tone: 'Bold and practical',
    reasoningSteps: ['Define audience, product intent, and primary interaction goals.', 'Generate 3 distinct visual and interaction directions with different creative angles.', 'Evaluate each concept on clarity, conversion potential, accessibility, and engineering complexity.', 'Recommend one direction with component-level guidance and execution priorities.'],
    outputFormat: '', mustInclude: ['Concept options', 'Chosen UI direction', 'UX rationale', 'Implementation next steps'], neverInclude: ['Generic design cliches', 'Style advice without UX reasoning'], disclaimers: [], prohibitedActions: [] } },
  { blurb: 'Positioning, messaging, growth experiments, and revenue-oriented sales strategy.', draft: {
    name: 'Marketing/Sales Expert', summary: 'Create practical go-to-market and sales actions tied to conversion and revenue outcomes.',
    role: 'Marketing and sales strategy lead', perspective: 'Customer-segment first, positioning clarity, and measurable pipeline impact.', tone: 'Commercial and decisive',
    reasoningSteps: ['Identify target segment, core pain, and buying trigger.', 'Craft positioning, offer framing, and differentiated messaging.', 'Design channel and outreach plan with measurable funnel stages.', 'Recommend immediate experiments and a sales follow-up sequence.'],
    outputFormat: '', mustInclude: ['ICP segment', 'Value proposition', 'Offer and CTA', 'Channel plan', 'KPIs'], neverInclude: ['Vanity metrics without revenue linkage'], disclaimers: [], prohibitedActions: [] } },
];

function loadScaffolds() { try { const v = JSON.parse(localStorage.getItem(SCAFFOLDS_KEY)); return Array.isArray(v) ? v : []; } catch (e) { return []; } }
function saveScaffolds(list) { try { localStorage.setItem(SCAFFOLDS_KEY, JSON.stringify(list)); return true; } catch (e) { return false; } }
function getScaffold(id) { return loadScaffolds().find((s) => s.id === id) || null; }
function uidS() { return (crypto && crypto.randomUUID) ? crypto.randomUUID() : 's' + Date.now() + Math.random().toString(16).slice(2); }

/* ---------- Model presets (saved custom "models": base + system + params) ---------- */
const PRESETS_KEY = 'mt_presets';
function loadPresets() { try { const v = JSON.parse(localStorage.getItem(PRESETS_KEY)); return Array.isArray(v) ? v : []; } catch (e) { return []; } }
function savePresets(list) { try { localStorage.setItem(PRESETS_KEY, JSON.stringify(list)); return true; } catch (e) { return false; } }
function getPreset(id) { return loadPresets().find((p) => p.id === id) || null; }
function upsertPreset(p) { const all = loadPresets().filter((x) => x.id !== p.id); all.unshift(p); return savePresets(all); }
function deletePresetById(id) { savePresets(loadPresets().filter((p) => p.id !== id)); }
// Apply by COPYING onto the conversation — deliberately not via setSystem/
// setParam, which write through to the global defaults for unrelated chats.
// Editing a preset later doesn't retroactively change old conversations.
function applyPreset(conv, p) {
  if (!conv || !p) return;
  conv.presetId = p.id;
  conv.model = p.model;
  conv.system = p.system || '';
  conv.params = Object.assign({}, p.params || {});
  if (conv.messages.length) store.save(conv);
}
function escapeHtml(s) { return (s || '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }

function draftToScaffold(d, existing) {
  const now = Date.now();
  return {
    id: existing ? existing.id : uidS(),
    name: scNorm(d.name), summary: scNorm(d.summary), role: scNorm(d.role), perspective: scNorm(d.perspective), tone: scNorm(d.tone),
    reasoningSteps: scList(d.reasoningSteps), outputFormat: scNorm(d.outputFormat),
    mustInclude: scList(d.mustInclude), neverInclude: scList(d.neverInclude),
    disclaimers: scList(d.disclaimers), prohibitedActions: scList(d.prohibitedActions),
    createdAt: existing ? existing.createdAt : now, updatedAt: now, lastUsedAt: existing ? existing.lastUsedAt : null,
  };
}
function upsertScaffold(sc) { const all = loadScaffolds().filter((s) => s.id !== sc.id); all.unshift(sc); return saveScaffolds(all); }
function deleteScaffold(id) { saveScaffolds(loadScaffolds().filter((s) => s.id !== id)); if (current && current.scaffoldId === id) clearScaffold(); }
function touchScaffold(id) { const all = loadScaffolds(); const s = all.find((x) => x.id === id); if (s) { s.lastUsedAt = Date.now(); saveScaffolds(all); } }

// Resolve the conversation's attached scaffold, clearing a dangling reference.
function activeScaffold() {
  if (!current || !current.scaffoldId) return null;
  const s = getScaffold(current.scaffoldId);
  if (!s) { current.scaffoldId = null; current.scaffoldName = null; if (current.messages.length) store.save(current); renderScaffoldBar(); return null; }
  return s;
}
function attachScaffold(id) {
  const s = getScaffold(id); if (!s || !current) return;
  current.scaffoldId = s.id; current.scaffoldName = s.name;
  if (current.messages.length) store.save(current);
  renderScaffoldBar(); closeScaffoldModal();
}
function clearScaffold() {
  if (!current) return;
  current.scaffoldId = null; current.scaffoldName = null;
  if (current.messages.length) store.save(current);
  renderScaffoldBar();
}

function renderScaffoldBar() {
  const s = (current && current.scaffoldId) ? getScaffold(current.scaffoldId) : null;
  if (current && current.scaffoldId && !s) { current.scaffoldId = null; current.scaffoldName = null; }
  if (els.scaffoldBtn) els.scaffoldBtn.classList.toggle('on', !!s);
  if (!s) { els.scaffoldBar.classList.add('hidden'); els.scaffoldBar.innerHTML = ''; return; }
  els.scaffoldBar.classList.remove('hidden'); els.scaffoldBar.innerHTML = '';
  const chip = document.createElement('span'); chip.className = 'sb-name'; chip.textContent = '⌗ ' + s.name; chip.title = s.summary || s.name;
  const swap = document.createElement('button'); swap.className = 'sb-act'; swap.type = 'button'; swap.textContent = 'Swap'; swap.addEventListener('click', openScaffoldModal);
  const sep = document.createElement('span'); sep.className = 'sb-sep'; sep.textContent = '·';
  const clr = document.createElement('button'); clr.className = 'sb-act'; clr.type = 'button'; clr.textContent = 'Clear'; clr.addEventListener('click', clearScaffold);
  els.scaffoldBar.append(chip, swap, sep, clr);
}

function openScaffoldModal() { els.scSearch.value = ''; renderScaffoldList(); renderScaffoldTemplates(); els.scaffoldModal.classList.remove('hidden'); }
function closeScaffoldModal() { els.scaffoldModal.classList.add('hidden'); }

function renderScaffoldList() {
  const q = (els.scSearch.value || '').trim().toLowerCase();
  let list = loadScaffolds().sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
  if (q) list = list.filter((s) => (s.name || '').toLowerCase().includes(q) || (s.summary || '').toLowerCase().includes(q));
  els.scList.innerHTML = '';
  if (!list.length) {
    els.scList.innerHTML = '<div class="sc-empty">' + (q ? 'No matching scaffolds.' : 'No scaffolds yet — create one or start from a template below.') + '</div>';
    return;
  }
  for (const s of list) {
    const attached = current && current.scaffoldId === s.id;
    const row = document.createElement('div'); row.className = 'sc-row' + (attached ? ' active' : '');
    const main = document.createElement('div'); main.className = 'sc-main';
    const nm = document.createElement('div'); nm.className = 'sc-name'; nm.textContent = s.name; main.appendChild(nm);
    if (s.summary) { const sm = document.createElement('div'); sm.className = 'sc-sum'; sm.textContent = s.summary; main.appendChild(sm); }
    const meta = document.createElement('div'); meta.className = 'sc-meta'; meta.textContent = s.lastUsedAt ? ('Last used ' + relTime(s.lastUsedAt)) : 'Never used'; main.appendChild(meta);
    const acts = document.createElement('div'); acts.className = 'sc-acts';
    const att = document.createElement('button'); att.type = 'button'; att.textContent = attached ? 'Attached' : 'Attach';
    if (attached) att.disabled = true; else att.addEventListener('click', () => attachScaffold(s.id));
    const ed = document.createElement('button'); ed.type = 'button'; ed.className = 'sc-ghost'; ed.textContent = 'Edit'; ed.addEventListener('click', () => openBuilder(s, s.id));
    const dup = document.createElement('button'); dup.type = 'button'; dup.className = 'sc-ghost'; dup.textContent = '⧉'; dup.title = 'Duplicate';
    dup.addEventListener('click', () => { const d = Object.assign({}, s, { name: (s.name + ' copy').slice(0, 80) }); upsertScaffold(draftToScaffold(d, null)); renderScaffoldList(); });
    const del = document.createElement('button'); del.type = 'button'; del.className = 'sc-ghost'; del.textContent = '✕'; del.title = 'Delete';
    del.addEventListener('click', () => { if (confirm('Delete scaffold “' + s.name + '”?')) { deleteScaffold(s.id); renderScaffoldList(); } });
    acts.append(att, ed, dup, del);
    row.append(main, acts); els.scList.appendChild(row);
  }
}
function renderScaffoldTemplates() {
  els.scTemplates.innerHTML = '';
  for (const t of SCAFFOLD_TEMPLATES) {
    const row = document.createElement('div'); row.className = 'sc-tpl';
    const main = document.createElement('div'); main.className = 'sc-main';
    const nm = document.createElement('div'); nm.className = 'sc-tpl-name'; nm.textContent = t.draft.name;
    const sm = document.createElement('div'); sm.className = 'sc-tpl-sum'; sm.textContent = t.blurb;
    main.append(nm, sm);
    const use = document.createElement('span'); use.className = 'use'; use.textContent = 'Use →';
    row.append(main, use);
    row.addEventListener('click', () => openBuilder(t.draft, null));
    els.scTemplates.appendChild(row);
  }
}

/* ---------- Scaffold builder ---------- */
let builderEditingId = null;
const EMPTY_DRAFT = { name: '', summary: '', role: '', perspective: '', tone: '', reasoningSteps: [], mustInclude: [], neverInclude: [], disclaimers: [], prohibitedActions: [] };

function openBuilder(d, editingId) {
  builderEditingId = editingId || null;
  els.sbTitle.textContent = editingId ? 'Edit scaffold' : (d && d.name ? 'New scaffold — ' + d.name : 'New scaffold');
  els.sbName.value = d.name || ''; els.sbSummary.value = d.summary || ''; els.sbRole.value = d.role || '';
  els.sbPerspective.value = d.perspective || ''; els.sbTone.value = d.tone || '';
  els.sbSteps.value = (d.reasoningSteps || []).join('\n');
  els.sbMust.value = (d.mustInclude || []).join('\n'); els.sbNever.value = (d.neverInclude || []).join('\n');
  els.sbDisc.value = (d.disclaimers || []).join('\n'); els.sbProh.value = (d.prohibitedActions || []).join('\n');
  els.sbErrors.classList.add('hidden'); els.sbErrors.innerHTML = '';
  closeScaffoldModal();
  els.scaffoldBuilder.classList.remove('hidden');
  updateBuilderPreview();
}
function readBuilderDraft() {
  const lines = (v) => v.split('\n').map((x) => x.trim()).filter(Boolean);
  return {
    name: els.sbName.value, summary: els.sbSummary.value, role: els.sbRole.value,
    perspective: els.sbPerspective.value, tone: els.sbTone.value,
    reasoningSteps: lines(els.sbSteps.value), outputFormat: '',
    mustInclude: lines(els.sbMust.value), neverInclude: lines(els.sbNever.value),
    disclaimers: lines(els.sbDisc.value), prohibitedActions: lines(els.sbProh.value),
  };
}
function updateBuilderPreview() { els.sbPreview.textContent = compileScaffold(readBuilderDraft()); }
function closeBuilder() { els.scaffoldBuilder.classList.add('hidden'); builderEditingId = null; }
function saveBuilder() {
  const d = readBuilderDraft();
  const errs = validateScaffold(d);
  if (errs.length) {
    els.sbErrors.innerHTML = '<ul>' + errs.map((e) => '<li>' + escapeHtml(e) + '</li>').join('') + '</ul>';
    els.sbErrors.classList.remove('hidden');
    return;
  }
  const existing = builderEditingId ? getScaffold(builderEditingId) : null;
  const sc = draftToScaffold(d, existing);
  if (!upsertScaffold(sc)) {
    alert('Couldn’t save the scaffold — this browser’s storage is full. Delete some conversations or projects and try again.');
    return;   // keep the builder open so the work isn't lost
  }
  if (current && current.scaffoldId === sc.id) { current.scaffoldName = sc.name; if (current.messages.length) store.save(current); renderScaffoldBar(); }
  closeBuilder(); openScaffoldModal();
}

/* ---------- Projects (context workspaces) ---------- */
// A project = name + custom instructions + attached context files, plus its own
// grouped conversations (conv.projectId). The instructions and files are injected
// as a system message on every message in the project's chats.
const PROJECTS_KEY = 'mt_projects';
function loadProjects() { try { const v = JSON.parse(localStorage.getItem(PROJECTS_KEY)); return Array.isArray(v) ? v : []; } catch (e) { return []; } }
function saveProjects(list) { localStorage.setItem(PROJECTS_KEY, JSON.stringify(list)); } // may throw on quota — callers handle
function getProject(id) { return loadProjects().find((p) => p.id === id) || null; }
function upsertProject(p) { const all = loadProjects().filter((x) => x.id !== p.id); all.unshift(p); saveProjects(all); }
function projectOf(conv) { if (!conv || !conv.projectId) return null; const p = getProject(conv.projectId); if (!p) { conv.projectId = null; return null; } return p; }

function compileProjectContext(p) {
  const parts = [];
  const head = '## Project: ' + p.name;
  parts.push(p.instructions && p.instructions.trim() ? head + '\n' + p.instructions.trim() : head);
  for (const f of (p.files || [])) parts.push('### Project file: ' + f.name + '\n```\n' + f.content + '\n```');
  parts.push('Use the project context above when relevant to the conversation.');
  return parts.join('\n\n');
}

function scopedList() { const l = store.list(); return activeProjectId ? l.filter((c) => c.projectId === activeProjectId) : l; }

function setActiveProject(id) {
  activeProjectId = id || null;
  try { if (activeProjectId) localStorage.setItem('mt_active_project', activeProjectId); else localStorage.removeItem('mt_active_project'); } catch (e) {}
  openMostRecentOrNew();   // enter the workspace scope (renders sidebar)
}

// Three top-level section tabs (Chats / Projects / Codebases).
function renderSideTabs() {
  const bar = els.projectBar; if (!bar) return;
  if (activeProjectId && !getProject(activeProjectId)) activeProjectId = null;
  bar.innerHTML = '';
  for (const [key, label] of [['chats', 'Chats'], ['projects', 'Projects'], ['codebases', 'Codebases']]) {
    const b = document.createElement('button');
    b.className = 'side-tab' + (sideView === key ? ' active' : '');
    b.type = 'button'; b.textContent = label;
    b.addEventListener('click', () => switchSideView(key));
    bar.appendChild(b);
  }
}

function switchSideView(v) {
  setSideView(v);
  if (v !== 'codebases') { activeCodebaseId = null; cbReadOnly = false; try { localStorage.removeItem('mt_active_codebase'); } catch (e) {} }
  if (v === 'chats') { setActiveProject(null); applyPaneVisibility(); return; }  // leave any project scope, show all chats
  renderSidebar();
  applyPaneVisibility();
}

// Body of the Projects tab: a list of projects, or — when one is open — that
// project's chats with a back link.
function renderProjectsView() {
  const active = activeProjectId ? getProject(activeProjectId) : null;
  if (active) {
    const back = document.createElement('button'); back.className = 'proj-back'; back.type = 'button'; back.textContent = '‹ Projects';
    back.addEventListener('click', () => { activeProjectId = null; try { localStorage.removeItem('mt_active_project'); } catch (e) {} renderSidebar(); });
    els.convList.appendChild(back);
    const head = document.createElement('div'); head.className = 'proj-head';
    const nm = document.createElement('span'); nm.className = 'proj-head-name'; nm.textContent = active.name;
    const ed = document.createElement('button'); ed.className = 'proj-edit'; ed.type = 'button'; ed.textContent = 'Edit ⚙';
    ed.addEventListener('click', () => openProjectEditor(activeProjectId));
    head.append(nm, ed); els.convList.appendChild(head);
    const chats = store.list().filter((c) => c.projectId === activeProjectId);
    if (!chats.length) { const e = document.createElement('div'); e.className = 'conv-empty'; e.textContent = 'No chats in this project yet.'; els.convList.appendChild(e); }
    for (const c of chats) els.convList.appendChild(convRow(c));
    return;
  }
  const projects = loadProjects().sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
  if (!projects.length) { els.convList.innerHTML = '<div class="conv-empty">No projects yet. Create one with + New project.</div>'; return; }
  for (const p of projects) {
    const cnt = store.list().filter((c) => c.projectId === p.id).length;
    const row = document.createElement('div'); row.className = 'proj-row';
    const nm = document.createElement('div'); nm.className = 'proj-row-name'; nm.textContent = p.name;
    const meta = document.createElement('div'); meta.className = 'proj-row-meta'; meta.textContent = cnt + (cnt === 1 ? ' chat' : ' chats');
    row.append(nm, meta);
    row.addEventListener('click', () => { setSideView('projects'); setActiveProject(p.id); });
    els.convList.appendChild(row);
  }
}

function deleteProject(id) {
  for (const c of store.list()) { if (c.projectId === id) { const conv = store.load(c.id); if (conv) { conv.projectId = null; store.save(conv); } } }
  try { saveProjects(loadProjects().filter((p) => p.id !== id)); } catch (e) {}
  if (activeProjectId === id) { activeProjectId = null; try { localStorage.removeItem('mt_active_project'); } catch (e) {} }
  closeProjectEditor();
  openMostRecentOrNew();
}

/* ---------- Project editor ---------- */
let projectEditingId = null;
let projectDraft = { name: '', instructions: '', files: [] };
function fileBytes(s) { try { return new Blob([s]).size; } catch (e) { return (s || '').length; } }
function fmtBytes(n) { return n < 1024 ? n + ' B' : n < 1048576 ? (n / 1024).toFixed(1) + ' KB' : (n / 1048576).toFixed(2) + ' MB'; }

function openProjectEditor(id) {
  projectEditingId = id || null;
  const p = id ? getProject(id) : null;
  projectDraft = p
    ? { name: p.name, instructions: p.instructions || '', files: (p.files || []).map((f) => ({ id: f.id, name: f.name, content: f.content })) }
    : { name: '', instructions: '', files: [] };
  els.pjTitle.textContent = id ? 'Edit project' : 'New project';
  els.pjName.value = projectDraft.name; els.pjInstr.value = projectDraft.instructions;
  els.pjDelete.style.display = id ? '' : 'none';
  els.pjPaste.value = ''; els.pjPasteName.value = '';
  renderProjectFiles();
  els.projectModal.classList.remove('hidden');
}
function closeProjectEditor() { els.projectModal.classList.add('hidden'); projectEditingId = null; }
function renderProjectFiles() {
  els.pjFiles.innerHTML = ''; let total = 0;
  if (!projectDraft.files.length) els.pjFiles.innerHTML = '<div class="pj-empty">No files yet.</div>';
  for (const f of projectDraft.files) {
    const sz = fileBytes(f.content); total += sz;
    const row = document.createElement('div'); row.className = 'pj-file';
    const nm = document.createElement('span'); nm.className = 'pj-file-name'; nm.textContent = f.name;
    const szs = document.createElement('span'); szs.className = 'pj-file-size'; szs.textContent = fmtBytes(sz);
    const x = document.createElement('button'); x.type = 'button'; x.className = 'pj-file-x'; x.textContent = '✕'; x.title = 'Remove';
    x.addEventListener('click', () => { projectDraft.files = projectDraft.files.filter((g) => g.id !== f.id); renderProjectFiles(); });
    row.append(nm, szs, x); els.pjFiles.appendChild(row);
  }
  els.pjSize.textContent = projectDraft.files.length ? '· ' + fmtBytes(total) : '';
  els.pjSize.classList.toggle('warn', total > 512 * 1024);
}
function saveProject() {
  const name = els.pjName.value.trim() || 'Untitled project';
  const now = Date.now();
  const existing = projectEditingId ? getProject(projectEditingId) : null;
  const p = {
    id: existing ? existing.id : uidS(), name, instructions: els.pjInstr.value,
    files: projectDraft.files.map((f) => ({ id: f.id, name: f.name, content: f.content })),
    createdAt: existing ? existing.createdAt : now, updatedAt: now,
  };
  try { upsertProject(p); } catch (e) { alert('Could not save — browser storage may be full. Remove some files and try again.'); return; }
  closeProjectEditor();
  if (existing) renderSidebar();   // edited project's context applies on next send
  else { setSideView('projects'); setActiveProject(p.id); }   // land inside the new project
}

/* ---------- GitHub (BYO token, read-only → context) ---------- */
// Pure client-side: GitHub's REST API is CORS-open, so the browser talks to it
// directly with the user's token (stored locally, like the Ollama key). Selected
// files are fetched, decoded, and added as message attachments.
const GH = {
  token: localStorage.getItem('mt_github_token') || '',
  login: localStorage.getItem('mt_github_login') || '',
  repo: null, branch: '', tree: [], repos: [], selected: new Set(),
};
function ghHeaders() { return { Authorization: 'token ' + GH.token, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' }; }
async function ghApi(path) {
  const r = await fetch('https://api.github.com' + path, { headers: ghHeaders() });
  if (!r.ok) { const e = new Error('GitHub ' + r.status); e.status = r.status; try { e.detail = (await r.json()).message; } catch (_) {} throw e; }
  return r.json();
}
function ghIsTextPath(p) {
  const base = p.split('/').pop();
  return ATT_TEXT_RE.test(base) || /^(Dockerfile|Makefile|LICENSE|README|Procfile|\.gitignore|\.env\.example|\.npmrc|\.editorconfig)$/i.test(base);
}
function ghDecodeBase64(b64) {
  try { const bin = atob((b64 || '').replace(/\s/g, '')); const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0)); return new TextDecoder('utf-8', { fatal: false }).decode(bytes); }
  catch (e) { return ''; }
}
function updateGithubBtn() { if (els.githubBtn) els.githubBtn.classList.toggle('on', !!GH.token); }

function openGithubModal() { els.githubModal.classList.remove('hidden'); if (GH.token) showGhBrowser(); else showGhGate(); }
function closeGithubModal() { els.githubModal.classList.add('hidden'); }
function showGhGate() { els.ghGate.classList.remove('hidden'); els.ghBrowser.classList.add('hidden'); els.ghToken.value = ''; els.ghGateErr.textContent = ''; setTimeout(() => els.ghToken.focus(), 40); }
function showGhBrowser() {
  els.ghGate.classList.add('hidden'); els.ghBrowser.classList.remove('hidden');
  els.ghLogin.textContent = '@' + GH.login;
  els.ghRepoView.classList.add('hidden'); els.ghRepoSearch.value = '';
  loadGhRepos();
}
async function connectGithub() {
  const tok = els.ghToken.value.trim();
  if (!tok) { els.ghGateErr.textContent = 'Enter a token.'; return; }
  els.ghConnect.disabled = true; els.ghConnect.textContent = 'Connecting…'; GH.token = tok;
  try {
    const me = await ghApi('/user');
    GH.login = me.login;
    try { localStorage.setItem('mt_github_token', tok); localStorage.setItem('mt_github_login', me.login); } catch (e) {}
    updateGithubBtn(); showGhBrowser();
  } catch (e) { GH.token = ''; els.ghGateErr.textContent = e.status === 401 ? 'Token rejected.' : ('Could not connect' + (e.detail ? ': ' + e.detail : '.')); }
  finally { els.ghConnect.disabled = false; els.ghConnect.textContent = 'Connect'; }
}
function disconnectGithub() {
  GH.token = ''; GH.login = ''; GH.repo = null; GH.tree = []; GH.selected.clear();
  try { localStorage.removeItem('mt_github_token'); localStorage.removeItem('mt_github_login'); } catch (e) {}
  updateGithubBtn(); showGhGate();
}
async function loadGhRepos() {
  els.ghRepos.innerHTML = '<div class="gh-loading">Loading repos…</div>';
  try {
    const repos = await ghApi('/user/repos?per_page=100&sort=updated&affiliation=owner,collaborator,organization_member');
    GH.repos = repos.map((r) => ({ full: r.full_name, owner: r.owner.login, name: r.name, private: r.private }));
    renderGhRepos();
  } catch (e) { els.ghRepos.innerHTML = '<div class="gh-loading">Could not load repos' + (e.detail ? ': ' + escapeHtml(e.detail) : '') + '</div>'; }
}
function renderGhRepos() {
  const q = (els.ghRepoSearch.value || '').trim().toLowerCase();
  const list = GH.repos.filter((r) => !q || r.full.toLowerCase().includes(q)).slice(0, 60);
  els.ghRepos.innerHTML = '';
  if (!list.length) { els.ghRepos.innerHTML = '<div class="gh-loading">No matching repos.</div>'; return; }
  for (const r of list) {
    const row = document.createElement('button'); row.type = 'button'; row.className = 'gh-repo-row';
    const full = document.createElement('span'); full.className = 'gh-repo-full'; full.textContent = r.full;
    row.appendChild(full);
    if (r.private) { const b = document.createElement('span'); b.className = 'gh-badge'; b.textContent = 'private'; row.appendChild(b); }
    row.addEventListener('click', () => openGhRepo(r.owner, r.name));
    els.ghRepos.appendChild(row);
  }
}
function ghRepoGoManual() {
  const m = els.ghRepoSearch.value.trim().match(/^([\w.-]+)\/([\w.-]+)$/);
  if (m) openGhRepo(m[1], m[2]); else renderGhRepos();
}
async function openGhRepo(owner, name) {
  els.ghRepoView.classList.remove('hidden');
  els.ghRepoName.textContent = owner + '/' + name;
  els.ghFiles.innerHTML = '<div class="gh-loading">Loading…</div>';
  GH.selected.clear(); updateGhSel();
  try {
    const repo = await ghApi('/repos/' + owner + '/' + name);
    GH.repo = { owner, name };
    let branches = []; try { branches = await ghApi('/repos/' + owner + '/' + name + '/branches?per_page=100'); } catch (e) {}
    els.ghBranch.innerHTML = '';
    const names = branches.length ? branches.map((b) => b.name) : [repo.default_branch];
    for (const bn of names) { const o = document.createElement('option'); o.value = bn; o.textContent = bn; els.ghBranch.appendChild(o); }
    els.ghBranch.value = repo.default_branch;
    await loadGhTree(repo.default_branch);
  } catch (e) { els.ghFiles.innerHTML = '<div class="gh-loading">' + (e.status === 404 ? 'Repo not found or no access.' : 'Error' + (e.detail ? ': ' + escapeHtml(e.detail) : '')) + '</div>'; }
}
async function loadGhTree(branch) {
  GH.branch = branch; GH.selected.clear(); updateGhSel();
  els.ghFiles.innerHTML = '<div class="gh-loading">Loading files…</div>';
  try {
    const t = await ghApi('/repos/' + GH.repo.owner + '/' + GH.repo.name + '/git/trees/' + encodeURIComponent(branch) + '?recursive=1');
    GH.tree = (t.tree || []).filter((n) => n.type === 'blob' && ghIsTextPath(n.path));
    renderGhFiles(t.truncated);
  } catch (e) { els.ghFiles.innerHTML = '<div class="gh-loading">Could not load files' + (e.detail ? ': ' + escapeHtml(e.detail) : '') + '</div>'; }
}
function renderGhFiles(truncated) {
  const q = (els.ghFileSearch.value || '').trim().toLowerCase();
  const list = GH.tree.filter((n) => !q || n.path.toLowerCase().includes(q)).slice(0, 600);
  els.ghFiles.innerHTML = '';
  if (!GH.tree.length) { els.ghFiles.innerHTML = '<div class="gh-loading">No text files found.</div>'; return; }
  if (!list.length) { els.ghFiles.innerHTML = '<div class="gh-loading">No matching files.</div>'; return; }
  for (const n of list) {
    const row = document.createElement('label'); row.className = 'gh-file';
    const cb = document.createElement('input'); cb.type = 'checkbox'; cb.checked = GH.selected.has(n.path);
    cb.addEventListener('change', () => { if (cb.checked) GH.selected.add(n.path); else GH.selected.delete(n.path); updateGhSel(); });
    const path = document.createElement('span'); path.className = 'gh-file-path'; path.textContent = n.path;
    const sz = document.createElement('span'); sz.className = 'gh-file-size'; sz.textContent = fmtBytes(n.size || 0);
    row.append(cb, path, sz); els.ghFiles.appendChild(row);
  }
  if (truncated) { const w = document.createElement('div'); w.className = 'gh-loading'; w.textContent = 'Large repo — file list was truncated by GitHub. Use the filter to find files.'; els.ghFiles.appendChild(w); }
}
function updateGhSel() { const n = GH.selected.size; els.ghSelCount.textContent = n + ' selected'; els.ghAttach.disabled = !n; }
async function ghAttachSelected() {
  const paths = [...GH.selected]; if (!paths.length) return;
  if (paths.length > 40) { alert('Select 40 files or fewer.'); return; }
  els.ghAttach.disabled = true; els.ghAttach.textContent = 'Fetching…';
  const byPath = Object.fromEntries(GH.tree.map((n) => [n.path, n]));
  let added = 0;
  for (const p of paths) {
    const node = byPath[p]; if (!node) continue;
    try {
      const blob = await ghApi('/repos/' + GH.repo.owner + '/' + GH.repo.name + '/git/blobs/' + node.sha);
      let text = ghDecodeBase64(blob.content || '');
      if (!text) continue;
      if (text.length > ATT_TEXT_CAP) text = text.slice(0, ATT_TEXT_CAP);
      pendingAttachments.push({ id: uidS(), name: GH.repo.owner + '/' + GH.repo.name + ':' + p, size: node.size || text.length, text, status: 'ready', note: 'from GitHub' });
      added++;
    } catch (e) { /* skip unreadable file */ }
  }
  renderAttachments();
  els.ghAttach.disabled = false; els.ghAttach.textContent = 'Attach to chat';
  closeGithubModal();
  if (added) els.input.focus();
}

/* ---------- Saved code snippets ---------- */
const SNIPPETS_KEY = 'mt_snippets';
function loadSnippets() { try { const v = JSON.parse(localStorage.getItem(SNIPPETS_KEY)); return Array.isArray(v) ? v : []; } catch (e) { return []; } }
function saveSnippetsList(list) { try { localStorage.setItem(SNIPPETS_KEY, JSON.stringify(list)); return true; } catch (e) { return false; } }
function saveSnippet(code, language) {
  code = (code || '').replace(/\s+$/, '');
  if (!code.trim()) return false;
  const all = loadSnippets();
  if (all.some((s) => s.code === code)) return true;   // already saved
  const title = (code.split('\n').find((l) => l.trim()) || 'snippet').trim().slice(0, 60);
  all.unshift({ id: uidS(), title, language: language || '', code, createdAt: Date.now() });
  if (!saveSnippetsList(all)) return false;
  if (els.snippetsBtn) els.snippetsBtn.classList.add('on');
  return true;
}
function deleteSnippet(id) { saveSnippetsList(loadSnippets().filter((s) => s.id !== id)); renderSnippets(); }
function renameSnippet(id) {
  const all = loadSnippets(); const s = all.find((x) => x.id === id); if (!s) return;
  const nt = prompt('Rename snippet', s.title);
  if (nt && nt.trim()) { s.title = nt.trim().slice(0, 80); saveSnippetsList(all); renderSnippets(); }
}
function openSnippetsModal() { els.snSearch.value = ''; renderSnippets(); els.snippetsModal.classList.remove('hidden'); }
function closeSnippetsModal() { els.snippetsModal.classList.add('hidden'); }
function renderSnippets() {
  const q = (els.snSearch.value || '').trim().toLowerCase();
  let list = loadSnippets();
  if (q) list = list.filter((s) => s.title.toLowerCase().includes(q) || s.code.toLowerCase().includes(q) || (s.language || '').toLowerCase().includes(q));
  els.snList.innerHTML = '';
  if (!list.length) {
    els.snList.innerHTML = '<div class="sn-empty">' + (q ? 'No matching snippets.' : 'No saved code yet — click “Save” on any code block.') + '</div>';
    return;
  }
  for (const s of list) {
    const item = document.createElement('div'); item.className = 'sn-item';
    const head = document.createElement('div'); head.className = 'sn-head';
    const title = document.createElement('span'); title.className = 'sn-title'; title.textContent = s.title; title.title = s.title;
    head.appendChild(title);
    if (s.language) { const badge = document.createElement('span'); badge.className = 'sn-badge'; badge.textContent = s.language; head.appendChild(badge); }
    const acts = document.createElement('div'); acts.className = 'sn-acts';
    const pre = document.createElement('pre'); const code = document.createElement('code');
    if (s.language) code.className = 'language-' + s.language;
    code.textContent = s.code; pre.appendChild(code);
    const lang = (s.language || '').toLowerCase();
    const isPy = ['py', 'python', 'python3'].includes(lang), isJs = ['js', 'javascript', 'mjs', 'node'].includes(lang);
    if (isPy || isJs) {
      const run = document.createElement('button'); run.className = 'sn-btn'; run.type = 'button'; run.textContent = '▶ Run';
      run.addEventListener('click', () => runCodeBlock(pre, s.code, isPy ? 'python' : 'javascript', run));
      acts.appendChild(run);
    }
    const copy = document.createElement('button'); copy.className = 'sn-btn'; copy.type = 'button'; copy.textContent = 'Copy';
    copy.addEventListener('click', () => { navigator.clipboard.writeText(s.code); copy.textContent = 'Copied'; setTimeout(() => { copy.textContent = 'Copy'; }, 1200); });
    acts.appendChild(copy);
    const ren = document.createElement('button'); ren.className = 'sn-btn sn-ghost'; ren.type = 'button'; ren.textContent = 'Rename';
    ren.addEventListener('click', () => renameSnippet(s.id)); acts.appendChild(ren);
    const del = document.createElement('button'); del.className = 'sn-btn sn-ghost sn-del'; del.type = 'button'; del.textContent = 'Delete';
    del.addEventListener('click', () => { if (confirm('Delete this snippet?')) deleteSnippet(s.id); }); acts.appendChild(del);
    head.appendChild(acts);
    item.append(head, pre); els.snList.appendChild(item);
    try { window.hljs && hljs.highlightElement(code); } catch (e) {}
  }
}

let apiKey = readKey();
let current = null;              // active conversation { id, title, model, messages: [] }
let streaming = false;
let controller = null;
let autoFollow = true;
let activeProjectId = localStorage.getItem('mt_active_project') || null;  // null = not inside a project
let sideView = localStorage.getItem('mt_side_view') || 'chats';          // 'chats' | 'projects' | 'codebases'
// Invariant: a project is only "open" while the Projects tab is selected, so a
// stale scope can never misassign new chats created from the Chats tab.
if (sideView !== 'projects') activeProjectId = null;
let activeCodebaseId = localStorage.getItem('mt_active_codebase') || null;  // open codebase, or null = list view
// A codebase is only "open" while the Codebases tab is selected.
if (sideView !== 'codebases') activeCodebaseId = null;
function setSideView(v) { sideView = v; try { localStorage.setItem('mt_side_view', v); } catch (e) {} }

const SUGGESTIONS = [
  'Explain quantum entanglement simply',
  'Write a haiku about the sea',
  'Why won’t my CSS flexbox center?',
  'Three startup ideas in climate tech',
];

// Capability hint so models know they can emit inline visuals (toggle in settings).
const VISUALS_KEY = 'mt_visuals';
function visualsOn() { return localStorage.getItem(VISUALS_KEY) !== '0'; }
const VISUALS_HINT = [
  'You can include rich visuals directly in replies; they render as interactive elements, not code:',
  '- Diagrams: a fenced ```mermaid block (flowchart, sequence, pie, gantt, timeline, mindmap, state, class).',
  '- Data charts: a fenced ```chart block whose body is a Chart.js v4 JSON config, e.g. {"type":"bar","data":{"labels":[...],"datasets":[{"label":"...","data":[...]}]}}. JSON only, no JavaScript.',
  '- Tables: a normal GitHub-flavored Markdown table.',
  'Use a visual only when it genuinely aids understanding, and keep accompanying prose concise. Do not describe these formats or your tools to the user — just produce the visual.',
].join('\n');

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
/* ---------- Visuals: mermaid diagrams + chart.js charts (lazy-loaded) ---------- */
let _mermaidP = null, _chartP = null, _mmId = 0;
function loadScript(src) {
  return new Promise((res, rej) => {
    const s = document.createElement('script'); s.src = src; s.async = true;
    s.onload = () => res(); s.onerror = () => rej(new Error('Failed to load ' + src));
    document.head.appendChild(s);
  });
}
function ensureMermaid() {
  if (window.mermaid) return Promise.resolve(window.mermaid);
  if (!_mermaidP) _mermaidP = loadScript('/vendor/mermaid.bundle.js').then(() => {
    window.mermaid.initialize({ startOnLoad: false, theme: 'dark', securityLevel: 'strict', fontFamily: 'inherit' });
    return window.mermaid;
  });
  return _mermaidP;
}
function ensureChart() {
  if (window.Chart) return Promise.resolve(window.Chart);
  if (!_chartP) _chartP = loadScript('/vendor/chart.umd.min.js').then(() => {
    const C = window.Chart;
    C.defaults.color = '#9aa0aa'; C.defaults.borderColor = 'rgba(255,255,255,0.08)';
    if (C.defaults.font) C.defaults.font.family = 'inherit';
    return C;
  });
  return _chartP;
}
// Give chart datasets visible colors when the model omits them (Chart.js defaults
// are near-invisible on the dark theme).
const CHART_PALETTE = ['#6179ff', '#8c61f2', '#3ddb8f', '#ffb454', '#ff5d8f', '#4dd0e1', '#b388ff', '#f06292'];
function applyChartDefaults(cfg) {
  const ds = (cfg.data && cfg.data.datasets) || [];
  const perPoint = ['pie', 'doughnut', 'polarArea'].includes(cfg.type);
  ds.forEach((d, i) => {
    if (d.backgroundColor == null) {
      if (perPoint) d.backgroundColor = (d.data || []).map((_, j) => CHART_PALETTE[j % CHART_PALETTE.length]);
      else if (cfg.type === 'line') d.backgroundColor = 'rgba(97,121,255,0.15)';
      else d.backgroundColor = CHART_PALETTE[i % CHART_PALETTE.length];
    }
    if (d.borderColor == null && (cfg.type === 'line' || cfg.type === 'radar')) d.borderColor = CHART_PALETTE[i % CHART_PALETTE.length];
  });
}

// Replace ```mermaid and ```chart code fences in a rendered bubble with live visuals.
function renderVisuals(bubble) {
  bubble.querySelectorAll('pre code.language-mermaid').forEach((code) => {
    const pre = code.closest('pre'); if (!pre) return;
    const src = code.textContent || '';
    const holder = document.createElement('div'); holder.className = 'diagram';
    pre.replaceWith(holder);
    ensureMermaid().then((m) => m.render('mmd' + (++_mmId), src)).then((out) => {
      holder.innerHTML = (out && out.svg) || '';   // mermaid securityLevel:'strict' sanitizes its own output
      maybeScroll();
    }).catch((e) => { holder.className = 'diagram-err'; holder.textContent = 'Diagram error: ' + ((e && e.message) || e); });
  });
  bubble.querySelectorAll('pre code.language-chart').forEach((code) => {
    const pre = code.closest('pre'); if (!pre) return;
    let cfg; try { cfg = JSON.parse(code.textContent || ''); } catch (e) { return; }   // leave invalid JSON as a code block
    if (!cfg || typeof cfg !== 'object' || !cfg.type) return;
    cfg.options = Object.assign({ responsive: true, maintainAspectRatio: false }, cfg.options || {});
    applyChartDefaults(cfg);
    const holder = document.createElement('div'); holder.className = 'chart-box';
    const canvas = document.createElement('canvas'); holder.appendChild(canvas);
    pre.replaceWith(holder);
    ensureChart().then((C) => { try { new C(canvas, cfg); maybeScroll(); } catch (e) { holder.className = 'diagram-err'; holder.textContent = 'Chart error: ' + ((e && e.message) || e); } })
      .catch(() => { holder.className = 'diagram-err'; holder.textContent = 'Chart failed to load.'; });
  });
}

/* ---------- Code execution (sandboxed) ---------- */
// JS runs in a throwaway Web Worker (no DOM, no localStorage → no access to the
// user's keys); Python runs via Pyodide (CPython/WASM) in a persistent worker,
// loaded from the CDN on first run. Both capture stdout and enforce a timeout.
const JS_WORKER_SRC = `
'use strict';
function fmt(a){ if(typeof a==='string') return a; try{ return JSON.stringify(a); }catch(e){ return String(a); } }
function send(level,args){ postMessage({type:'out',level:level,text:Array.prototype.map.call(args,fmt).join(' ')}); }
console.log=function(){ send('log',arguments); };
console.info=function(){ send('log',arguments); };
console.warn=function(){ send('warn',arguments); };
console.error=function(){ send('error',arguments); };
self.onmessage=async function(e){
  postMessage({type:'ready'});
  try{
    const AsyncFunction = Object.getPrototypeOf(async function(){}).constructor;
    const r= await (new AsyncFunction(e.data))();
    if(r!==undefined) send('result',[r]);
  }catch(err){ send('error',[ (err&&err.stack)||String(err) ]); }
  postMessage({type:'done'});
};`;
const PY_WORKER_SRC = `
let ready=false, CTRL=null, DATA=null;
self.onmessage=async function(e){
  const code=e.data.code, sab=e.data.sab;
  if(sab && !CTRL){ CTRL=new Int32Array(sab,0,2); DATA=new Uint8Array(sab,8); }
  try{
    if(!ready){
      postMessage({type:'status',text:'Loading Python runtime (first run)…'});
      importScripts('https://cdn.jsdelivr.net/pyodide/v0.26.2/full/pyodide.js');
      self.py=await loadPyodide({indexURL:'https://cdn.jsdelivr.net/pyodide/v0.26.2/full/'});
      self.py.setStdout({batched:function(s){ postMessage({type:'out',level:'log',text:s}); }});
      self.py.setStderr({batched:function(s){ postMessage({type:'out',level:'error',text:s}); }});
      self.py.setStdin({stdin:function(){
        if(!CTRL){ postMessage({type:'stdin'}); return null; }    // not cross-origin isolated → EOF + note
        postMessage({type:'input-request'});
        Atomics.store(CTRL,0,0);
        Atomics.wait(CTRL,0,0);                                   // block until the page provides a line
        if(Atomics.load(CTRL,0)===2) return null;                // cancelled → EOF
        const len=Atomics.load(CTRL,1);
        return new TextDecoder().decode(DATA.slice(0,len));
      }});
      ready=true;
    }
    postMessage({type:'ready'});
    const r= await self.py.runPythonAsync(code);
    if(r!==undefined && r!==null) postMessage({type:'out',level:'result',text:String(r)});
  }catch(err){ postMessage({type:'out',level:'error',text:(err&&err.message)||String(err)}); }
  postMessage({type:'done'});
};`;

function runJs(code, onMsg, onDone) {
  const w = new Worker(URL.createObjectURL(new Blob([JS_WORKER_SRC], { type: 'application/javascript' })));
  let timer = null;
  w.onmessage = (e) => {
    const d = e.data;
    if (d.type === 'ready') { timer = setTimeout(() => { w.terminate(); onDone(true); }, 10000); }
    else if (d.type === 'done') { if (timer) clearTimeout(timer); w.terminate(); onDone(false); }
    else onMsg(d);
  };
  w.onerror = (ev) => { if (timer) clearTimeout(timer); onMsg({ type: 'out', level: 'error', text: ev.message || 'Worker error' }); w.terminate(); onDone(false); };
  w.postMessage(code);
}

let pyWorker = null;
const PY_EXEC_MS = 30000, PY_LOAD_MS = 60000;
function runPy(code, onMsg, onDone) {
  if (!pyWorker) {
    const w = new Worker(URL.createObjectURL(new Blob([PY_WORKER_SRC], { type: 'application/javascript' })));
    w._h = null;
    // Interactive stdin needs a SharedArrayBuffer, which needs cross-origin isolation.
    w._sab = (self.crossOriginIsolated && typeof SharedArrayBuffer !== 'undefined') ? new SharedArrayBuffer(65536) : null;
    w._ctrl = w._sab ? new Int32Array(w._sab, 0, 2) : null;
    w._data = w._sab ? new Uint8Array(w._sab, 8) : null;
    const arm = (h, ms) => { if (h.timer) clearTimeout(h.timer); h.timer = setTimeout(() => { w.terminate(); if (pyWorker === w) pyWorker = null; w._h = null; h.onDone(true); }, ms); };
    w.onmessage = (e) => {
      const h = w._h; if (!h) return; const d = e.data;
      if (d.type === 'ready') { arm(h, PY_EXEC_MS); }
      else if (d.type === 'done') { if (h.timer) clearTimeout(h.timer); w._h = null; h.onDone(false); }
      else if (d.type === 'input-request') {
        if (h.timer) { clearTimeout(h.timer); h.timer = null; }   // pause timeout while the user types
        h.onMsg({
          type: 'input-request',
          submit: (text) => {
            const enc = new TextEncoder().encode((text || '') + '\n');
            const n = Math.min(enc.length, w._data.length);
            w._data.set(enc.subarray(0, n));
            Atomics.store(w._ctrl, 1, n);
            Atomics.store(w._ctrl, 0, 1);
            Atomics.notify(w._ctrl, 0, 1);
            arm(h, PY_EXEC_MS);
          },
        });
      }
      else h.onMsg(d);
    };
    w.onerror = (ev) => { const h = w._h; if (h) { if (h.timer) clearTimeout(h.timer); h.onMsg({ type: 'out', level: 'error', text: ev.message || 'Python worker error' }); w._h = null; h.onDone(false); } w.terminate(); if (pyWorker === w) pyWorker = null; };
    pyWorker = w;
  }
  const w = pyWorker;
  if (w._h) { onMsg({ type: 'out', level: 'error', text: 'Python is busy — wait for the current run to finish.' }); onDone(false); return; }
  w._h = { onMsg, onDone, timer: setTimeout(() => { w.terminate(); if (pyWorker === w) pyWorker = null; w._h = null; onDone(true); }, PY_LOAD_MS) };
  w.postMessage({ code, sab: w._sab });
}

// Clean common copy-paste / model artifacts that break parsers: BOM, a leading
// shebang line, non-breaking/unicode spaces, and smart quotes.
function normalizeRunCode(s) {
  return (s || '')
    .replace(/^﻿/, '')
    .replace(/^#!.*\r?\n/, '')
    .replace(/ /g, ' ')
    .replace(/[‘’‛]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[ -   　]/g, ' ');
}
function ensureRunPanel(pre) {
  let p = pre.nextElementSibling;
  if (!p || !p.classList.contains('run-output')) { p = document.createElement('div'); p.className = 'run-output'; pre.after(p); }
  return p;
}
function runCodeBlock(pre, code, lang, runBtn) {
  const isPy = lang === 'python';
  code = normalizeRunCode(code);
  const panel = ensureRunPanel(pre); panel.innerHTML = '';
  const head = document.createElement('div'); head.className = 'ro-head';
  const label = document.createElement('span'); label.textContent = (isPy ? 'Python' : 'JavaScript') + ' output';
  const status = document.createElement('span'); status.className = 'ro-status'; status.textContent = 'running…';
  head.append(label, status);
  const body = document.createElement('div'); body.className = 'ro-body';
  panel.append(head, body);
  if (runBtn) { runBtn.disabled = true; runBtn.textContent = '▶ Running'; }
  let any = false, neededInput = false;
  const addLine = (cls, text) => { const d = document.createElement('div'); d.className = 'ro-line ' + cls; d.textContent = text; body.appendChild(d); };
  const onMsg = (m) => {
    if (m.type === 'status') { status.textContent = m.text; return; }
    if (m.type === 'stdin') { neededInput = true; return; }
    if (m.type === 'input-request') {
      status.textContent = 'waiting for input…';
      const row = document.createElement('div'); row.className = 'ro-input';
      const inp = document.createElement('input'); inp.type = 'text'; inp.placeholder = 'stdin — type and press Enter';
      inp.addEventListener('keydown', (ev) => {
        if (ev.key !== 'Enter') return;
        ev.preventDefault();
        const v = inp.value; row.remove(); addLine('ro-stdin', '› ' + v); any = true;
        status.textContent = 'running…'; m.submit(v); maybeScroll();
      });
      row.appendChild(inp); body.appendChild(row); inp.focus(); maybeScroll();
      return;
    }
    if (m.type === 'out') { any = true; addLine('ro-' + (m.level || 'log'), m.text); maybeScroll(); }
  };
  const onDone = (timedOut) => {
    status.textContent = timedOut ? 'stopped (timeout)' : 'done';
    if (neededInput) addLine('ro-muted', 'Note: this program reads interactive input (input()), which the sandbox doesn’t support. Replace input() with fixed values to run it here.');
    else if (!any && !timedOut) addLine('ro-muted', '(no output)');
    if (runBtn) { runBtn.disabled = false; runBtn.textContent = '▶ Run'; }
    maybeScroll();
  };
  if (isPy) runPy(code, onMsg, onDone); else runJs(code, onMsg, onDone);
}

function renderAssistantHTML(bubble, text) {
  bubble.classList.remove('plain');
  bubble.innerHTML = renderMarkdown(text);
  renderVisuals(bubble);
  bubble.querySelectorAll('pre code').forEach((el) => { try { window.hljs && hljs.highlightElement(el); } catch (e) {} });
  bubble.querySelectorAll('pre').forEach((pre) => {
    if (pre.querySelector('.code-actions')) return;
    const codeEl = pre.querySelector('code');
    const m = (codeEl && codeEl.className || '').match(/language-([\w+#.-]+)/);
    const lang = m ? m[1].toLowerCase() : '';
    const isPy = ['py', 'python', 'python3'].includes(lang);
    const isJs = ['js', 'javascript', 'mjs', 'node'].includes(lang);
    const actions = document.createElement('div'); actions.className = 'code-actions';
    if (isPy || isJs) {
      const run = document.createElement('button'); run.className = 'run-btn'; run.type = 'button'; run.textContent = '▶ Run';
      run.addEventListener('click', () => runCodeBlock(pre, (codeEl ? codeEl.textContent : pre.textContent), isPy ? 'python' : 'javascript', run));
      actions.appendChild(run);
    }
    const save = document.createElement('button'); save.className = 'save-btn'; save.type = 'button'; save.textContent = 'Save';
    save.addEventListener('click', () => {
      const ok = saveSnippet(codeEl ? codeEl.textContent : pre.textContent, lang);
      save.textContent = ok ? 'Saved' : 'Storage full'; save.classList.toggle('ok', ok);
      setTimeout(() => { save.textContent = 'Save'; save.classList.remove('ok'); }, ok ? 1200 : 2500);
    });
    actions.appendChild(save);
    const copy = document.createElement('button'); copy.className = 'copy-btn'; copy.type = 'button'; copy.textContent = 'Copy';
    copy.addEventListener('click', () => {
      navigator.clipboard.writeText(codeEl ? codeEl.innerText : pre.innerText);
      copy.textContent = 'Copied'; copy.classList.add('ok');
      setTimeout(() => { copy.textContent = 'Copy'; copy.classList.remove('ok'); }, 1200);
    });
    actions.appendChild(copy);
    pre.appendChild(actions);
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
    idx.unshift({ id: conv.id, title: conv.title, model: conv.model, updatedAt: conv.updatedAt, projectId: conv.projectId || null });
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
function authHeader() { return localMode ? {} : { authorization: 'Bearer ' + apiKey }; }
function showApp(show) {
  els.gate.classList.toggle('hidden', show);
  els.app.classList.toggle('hidden', !show);
  if (show) els.input.focus(); else els.keyInput.focus();
}
/* ---------- Model list (per-user, curated) ---------- */
const MODELS_KEY = 'mt_models';
let catalogModels = [];
let catalogLoaded = false;

function modelsKey() { return localMode ? LOCAL_MODELS_KEY : MODELS_KEY; }
function getUserModels() {
  try { const v = JSON.parse(localStorage.getItem(modelsKey())); if (Array.isArray(v) && v.length) return v; } catch (e) {}
  return null;
}
function setUserModels(list) {
  const uniq = [...new Set(list.filter(Boolean))];
  try { localStorage.setItem(modelsKey(), JSON.stringify(uniq)); } catch (e) {}
  return uniq;
}
function populateModelSelect() {
  // Empty value → the Worker substitutes its DEFAULT_MODEL; the literal string
  // "default" would be sent upstream verbatim and fail.
  const list = getUserModels() || [''];
  const presets = loadPresets();
  const cur = els.model.value;
  els.model.innerHTML = '';
  if (presets.length) {
    const og = document.createElement('optgroup'); og.label = 'Your presets';
    for (const p of presets) {
      const o = document.createElement('option'); o.value = 'preset:' + p.id; o.textContent = '★ ' + p.name;
      og.appendChild(o);
    }
    els.model.appendChild(og);
  }
  for (const m of list) { const o = document.createElement('option'); o.value = m; o.textContent = m || 'default'; els.model.appendChild(o); }
  const values = presets.map((p) => 'preset:' + p.id).concat(list);
  if (values.includes(cur)) els.model.value = cur;
}
// The picker may hold a preset value; requests always need the base model name.
function selectedModel() {
  const v = els.model.value;
  if (v && v.startsWith('preset:')) {
    const p = getPreset(v.slice(7));
    return p ? p.model : ((current && current.model) || '');
  }
  return v;
}
async function loadModels() {
  if (localMode) {
    // Refresh from the live local instance, merged with the stored list so
    // manually added names survive reloads; fall back to the cached list if
    // it's unreachable.
    try {
      const names = await probeLocal();
      if (names.length) setUserModels([...(getUserModels() || []), ...names]);
    } catch (e) {}
    populateModelSelect();
    return;
  }
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
  // The catalog is the cloud catalog — hide it when chatting with a local
  // instance (its models are whatever the user has pulled).
  const catalogSection = els.mmCatalog.closest('.mm-section');
  if (catalogSection) catalogSection.classList.toggle('hidden', localMode);
  renderPresetList(); renderYours(); renderCatalog();
  if (!localMode && !catalogLoaded) loadCatalog();
}

/* ---------- Preset manage list + builder ---------- */
let presetEditingId = null;
function renderPresetList() {
  const all = loadPresets();
  els.mmPresets.innerHTML = '';
  if (!all.length) {
    els.mmPresets.innerHTML = '<div class="mm-empty">No presets yet — bundle a base model with a personality and settings, then pick it like any model.</div>';
    return;
  }
  for (const p of all) {
    const row = document.createElement('div'); row.className = 'mm-row';
    const name = document.createElement('span'); name.textContent = '★ ' + p.name;
    const base = document.createElement('em'); base.className = 'preset-base'; base.textContent = p.model || 'default';
    const acts = document.createElement('div'); acts.className = 'preset-acts';
    const use = document.createElement('button'); use.type = 'button'; use.textContent = 'Use';
    use.addEventListener('click', () => {
      populateModelSelect();
      els.model.value = 'preset:' + p.id;
      if (current) applyPreset(current, p);
      closeModelModal();
    });
    const edit = document.createElement('button'); edit.type = 'button'; edit.textContent = 'Edit';
    edit.addEventListener('click', () => openPresetBuilder(p));
    const del = document.createElement('button'); del.type = 'button'; del.textContent = 'Delete';
    del.addEventListener('click', () => {
      if (!confirm('Delete the preset “' + p.name + '”? Conversations that used it keep their settings.')) return;
      const wasSelected = els.model.value === 'preset:' + p.id;
      deletePresetById(p.id);
      if (current && current.presetId === p.id) {
        delete current.presetId;
        if (current.messages.length) store.save(current);
      }
      populateModelSelect();
      if (wasSelected && current && current.model) {
        // The deleted preset was selected — fall back to the conversation's
        // own base model, not whatever sits first in the picker.
        if (![...els.model.options].some((o) => o.value === current.model)) {
          const o = document.createElement('option'); o.value = current.model; o.textContent = current.model;
          els.model.appendChild(o);
        }
        els.model.value = current.model;
      }
      renderPresetList();
    });
    acts.append(use, edit, del);
    row.append(name, base, acts);
    els.mmPresets.appendChild(row);
  }
}
function openPresetBuilder(p) {
  presetEditingId = p ? p.id : null;
  els.pmTitle.textContent = p ? 'Edit preset' : 'New preset';
  els.pmErr.textContent = '';
  els.pmBase.innerHTML = '';
  const models = getUserModels() || [];
  for (const m of models) { const o = document.createElement('option'); o.value = m; o.textContent = m || 'default'; els.pmBase.appendChild(o); }
  if (p && p.model && !models.includes(p.model)) {
    const o = document.createElement('option'); o.value = p.model; o.textContent = p.model;
    els.pmBase.appendChild(o);
  }
  els.pmName.value = p ? p.name : '';
  els.pmBase.value = p ? p.model : (models[0] || '');
  els.pmSystem.value = p ? (p.system || '') : '';
  const params = (p && p.params) || {};
  els.pmTemp.value = params.temperature ?? '';
  els.pmTopP.value = params.top_p ?? '';
  els.pmTopK.value = params.top_k ?? '';
  els.pmMaxTok.value = params.num_predict ?? '';
  els.modelModal.classList.add('hidden');
  els.presetModal.classList.remove('hidden');
  els.pmName.focus();
}
function closePresetBuilder(backToModels) {
  els.presetModal.classList.add('hidden');
  presetEditingId = null;
  if (backToModels) openModelModal();
}
function savePresetBuilder() {
  const name = els.pmName.value.trim();
  if (!name) { els.pmErr.textContent = 'Give the preset a name.'; return; }
  const params = {};
  const readNum = (el, key, min, max, integer) => {
    const raw = el.value.trim();
    if (raw === '') return true;
    const n = parseFloat(raw);
    if (!isFinite(n) || n < min || n > max) return false;
    params[key] = integer ? Math.round(n) : n;
    return true;
  };
  if (!readNum(els.pmTemp, 'temperature', 0, 2)) { els.pmErr.textContent = 'Temperature must be between 0 and 2.'; return; }
  if (!readNum(els.pmTopP, 'top_p', 0, 1)) { els.pmErr.textContent = 'Top P must be between 0 and 1.'; return; }
  if (!readNum(els.pmTopK, 'top_k', 0, 200, true)) { els.pmErr.textContent = 'Top K must be between 0 and 200.'; return; }
  if (!readNum(els.pmMaxTok, 'num_predict', -1, 1000000, true)) { els.pmErr.textContent = 'Max tokens must be -1 or higher.'; return; }
  const existing = presetEditingId ? getPreset(presetEditingId) : null;
  const p = {
    id: existing ? existing.id : uidS(),
    name, model: els.pmBase.value, system: els.pmSystem.value, params,
    createdAt: existing ? existing.createdAt : Date.now(), updatedAt: Date.now(),
  };
  if (!upsertPreset(p)) {
    els.pmErr.textContent = 'Couldn’t save — this browser’s storage is full. Delete old conversations and try again.';
    return;
  }
  populateModelSelect();
  closePresetBuilder(true);
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
  if (els.connectLocal) els.connectLocal.disabled = true;   // one connect path at a time
  try {
    const res = await validateKey(key);
    if (res.ok) { apiKey = key; writeKey(key, !els.rememberKey || els.rememberKey.checked); await loadModels(); enterApp(); }
    else els.gateErr.textContent = res.error || 'That key was rejected.';
  } catch (e) { els.gateErr.textContent = 'Network error. Try again.'; }
  finally { els.connect.disabled = false; els.connect.textContent = 'Connect'; if (els.connectLocal) els.connectLocal.disabled = false; }
}
async function connectLocal() {
  els.gateErr.textContent = '';
  els.connectLocal.disabled = true; els.connectLocal.textContent = 'Connecting…';
  els.connect.disabled = true;   // one connect path at a time
  try {
    const names = await probeLocal();
    if (!names.length) {
      els.gateErr.textContent = 'Connected, but no local models found — run e.g. `ollama pull llama3.2` first.';
      return;
    }
    setLocalMode(true);
    setUserModels(names);
    populateModelSelect();
    updateModeBadge();
    enterApp();
  } catch (e) {
    els.localHint.classList.remove('hidden');
    els.gateErr.textContent = 'Couldn’t reach Ollama at ' + localBase() + ' — see the steps below.';
  } finally { els.connectLocal.disabled = false; els.connectLocal.textContent = 'Use local Ollama'; els.connect.disabled = false; }
}
function updateModeBadge() {
  if (els.modeBadge) els.modeBadge.classList.toggle('hidden', !localMode);
}
function disconnect() {
  if (controller) controller.abort();   // stop any in-flight stream
  if (localMode) setLocalMode(false);
  apiKey = ''; clearKey();
  current = null; els.keyInput.value = '';
  updateModeBadge();
  showApp(false);  // conversations are kept in storage
}
function enterApp() {
  showApp(true);
  if (activeProjectId && !getProject(activeProjectId)) activeProjectId = null;
  if (activeCodebaseId && !getCodebase(activeCodebaseId)) activeCodebaseId = null;
  openMostRecentOrNew(); renderSidebar();
  if (sideView === 'codebases' && activeCodebaseId) openCodebase(activeCodebaseId);
  applyPaneVisibility();
}

/* ---------- Conversations ---------- */
function newConversation() {
  current = { id: uid(), title: 'New chat', model: selectedModel(), messages: [], updatedAt: Date.now(), projectId: activeProjectId || null };
  const pv = els.model.value;
  if (pv.startsWith('preset:')) { const p = getPreset(pv.slice(7)); if (p) applyPreset(current, p); }
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
  if (conv.presetId && getPreset(conv.presetId)) {
    els.model.value = 'preset:' + conv.presetId;
  } else if (conv.model) {
    // Keep the conversation on its own model even if it's gone from the list
    // (e.g. created in local mode, opened in cloud mode) — silently
    // substituting another model is worse than an explicit upstream error.
    if (![...els.model.options].some((o) => o.value === conv.model)) {
      const o = document.createElement('option'); o.value = conv.model; o.textContent = conv.model;
      els.model.appendChild(o);
    }
    els.model.value = conv.model;
  }
  renderConversation(); renderSidebar();
}
function openMostRecentOrNew() {
  const list = scopedList();
  const activeId = store.getActive();
  if (activeId && list.some((c) => c.id === activeId)) { openConversation(activeId); return; }
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
  e.innerHTML = '<img class="wordmark" src="/seer-wordmark.svg" alt="SEER" /><p>Ask anything. Responses stream from Ollama.</p>';
  const chips = document.createElement('div'); chips.className = 'chips';
  SUGGESTIONS.forEach((s) => {
    const c = document.createElement('button'); c.className = 'chip'; c.type = 'button'; c.textContent = s;
    c.addEventListener('click', () => { els.input.value = s; autosize(); send(); });
    chips.appendChild(c);
  });
  e.appendChild(chips); els.thread.appendChild(e);
}
function removeEmptyState() { const e = els.thread.querySelector('.empty'); if (e) e.remove(); }

function addUserBubble(text, attachments) {
  const wrap = document.createElement('div'); wrap.className = 'msg user';
  const col = document.createElement('div'); col.className = 'col';
  const role = document.createElement('div'); role.className = 'role'; role.textContent = 'You';
  col.appendChild(role);
  if (attachments && attachments.length) {
    const ab = document.createElement('div'); ab.className = 'msg-attachments';
    for (const a of attachments) { const c = document.createElement('span'); c.className = 'msg-att'; c.textContent = '📎 ' + a.name; ab.appendChild(c); }
    col.appendChild(ab);
  }
  if (text) { const bubble = document.createElement('div'); bubble.className = 'bubble'; bubble.textContent = text; col.appendChild(bubble); }
  wrap.appendChild(col); els.thread.appendChild(wrap); scrollDown();
}

function buildAssistantNode() {
  const wrap = document.createElement('div'); wrap.className = 'msg assistant';
  const col = document.createElement('div'); col.className = 'col';
  const role = document.createElement('div'); role.className = 'role'; role.textContent = 'SƎER';
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
    addToolCall(name, argsText) {
      const el = document.createElement('details'); el.className = 'toolcall';
      const sum = document.createElement('summary');
      sum.innerHTML = '🔧 <span class="tc-name"></span> <span class="tc-status">running…</span>';
      sum.querySelector('.tc-name').textContent = name;
      const body = document.createElement('div'); body.className = 'tc-body';
      const ap = document.createElement('pre'); ap.className = 'tc-args'; ap.textContent = argsText;
      const rp = document.createElement('pre'); rp.className = 'tc-result';
      body.append(ap, rp); el.append(sum, body);
      col.insertBefore(el, bubble); maybeScroll();
      return {
        setResult(text) { rp.textContent = text; const s = sum.querySelector('.tc-status'); s.textContent = 'done'; s.classList.add('ok'); maybeScroll(); },
        setError(text) { rp.textContent = text; rp.classList.add('tc-err'); const s = sum.querySelector('.tc-status'); s.textContent = 'error'; s.classList.add('err'); maybeScroll(); },
      };
    },
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
  if (m.toolRounds) for (const tr of m.toolRounds) { const ui = a.addToolCall(tr.name || 'tool', JSON.stringify(tr.args || {}, null, 2)); ui.setResult(String(tr.result == null ? '' : tr.result)); }
  if (m.content) { renderAssistantHTML(a.bubble, m.content); a.bubble.dataset.raw = m.content; }
  else a.bubble.textContent = m.toolRounds ? '' : '…';
  if (m.stats) a.setStats(m.stats);
  a.addActions();
}

function renderConversation() {
  els.thread.innerHTML = '';
  renderScaffoldBar();
  if (!current || current.messages.length === 0) { renderEmpty(); updateHeaderTitle(); return; }
  for (const m of current.messages) {
    if (m.role === 'user') addUserBubble(m.displayText != null ? m.displayText : m.content, m.attachments);
    else if (m.role === 'assistant') renderAssistantMessage(m);
  }
  updateHeaderTitle(); autoFollow = true; scrollDown(true);
}

// Build one conversation row (shared by the Chats tab and the in-project list).
function convRow(c) {
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
  return row;
}

function renderSidebar() {
  renderSideTabs();
  els.convList.innerHTML = '';
  if (sideView === 'codebases') { renderCodebasesView(); return; }
  if (sideView === 'projects') { renderProjectsView(); return; }
  // Chats tab: every conversation, regardless of project.
  const list = store.list();
  if (!list.length) { els.convList.innerHTML = '<div class="conv-empty">No conversations yet</div>'; return; }
  for (const c of list) els.convList.appendChild(convRow(c));
}

/* ---------- Tools (function calling, sandboxed) ---------- */
// Run code in the existing sandboxes and capture output as a string (for tools).
function runJsCapture(code) {
  return new Promise((res) => {
    const lines = [];
    runJs(normalizeRunCode(code || ''), (m) => { if (m.type === 'out') lines.push(m.text); }, (t) => { if (t) lines.push('[timed out]'); res(lines.join('\n') || '(no output)'); });
  });
}
function runPyCapture(code) {
  return new Promise((res) => {
    const lines = [];
    runPy(normalizeRunCode(code || ''), (m) => { if (m.type === 'out') lines.push(m.text); else if (m.type === 'input-request' && m.submit) m.submit(''); }, (t) => { if (t) lines.push('[timed out]'); res(lines.join('\n') || '(no output)'); });
  });
}
async function fetchUrlTool(url) {
  try {
    const r = await fetch('/api/fetch?url=' + encodeURIComponent(url || ''), { headers: authHeader() });
    const d = await r.json().catch(() => ({}));
    if (!r.ok || d.error) return 'Error: ' + (d.error || ('HTTP ' + r.status));
    return d.text || '(empty)';
  } catch (e) { return 'Error: ' + (e.message || e); }
}

const TOOL_DEFS = {
  run_javascript: {
    label: 'Run JavaScript', blurb: 'Execute JS in a sandbox',
    schema: { type: 'function', function: { name: 'run_javascript', description: 'Execute JavaScript in a secure sandbox and return its console output. Use for calculations, data transforms, JSON/string work, and algorithms. Print results with console.log.', parameters: { type: 'object', properties: { code: { type: 'string', description: 'JavaScript source to run.' } }, required: ['code'] } } },
    run: (a) => runJsCapture(a.code || ''),
  },
  run_python: {
    label: 'Run Python', blurb: 'Execute Python (Pyodide)',
    schema: { type: 'function', function: { name: 'run_python', description: 'Execute Python (CPython via Pyodide) in a sandbox and return stdout. Use for math, data, and algorithms. Print results with print().', parameters: { type: 'object', properties: { code: { type: 'string', description: 'Python source to run.' } }, required: ['code'] } } },
    run: (a) => runPyCapture(a.code || ''),
  },
  calculator: {
    label: 'Calculator', blurb: 'Evaluate an arithmetic expression',
    schema: { type: 'function', function: { name: 'calculator', description: 'Evaluate a single arithmetic expression (digits and + - * / % . parentheses only) and return the result. For anything more, use run_javascript.', parameters: { type: 'object', properties: { expression: { type: 'string', description: 'e.g. (1234*56)/7' } }, required: ['expression'] } } },
    run: (a) => {
      const expr = String(a.expression || '').trim();
      if (!expr || !/^[0-9+\-*/%.()eE\s]+$/.test(expr)) {
        return Promise.resolve('Error: the calculator only accepts arithmetic (digits and + - * / % . ( ) ). Use run_javascript for anything else.');
      }
      return runJsCapture('console.log(' + expr + ')');
    },
  },
  fetch_url: {
    label: 'Fetch URL', blurb: 'Read a public web page / API',
    schema: { type: 'function', function: { name: 'fetch_url', description: 'Fetch the text content of a public http(s) URL and return it (truncated to ~8000 chars). Use to read a web page or API response.', parameters: { type: 'object', properties: { url: { type: 'string', description: 'A public http(s) URL.' } }, required: ['url'] } } },
    run: (a) => fetchUrlTool(a.url || ''),
  },
};

const TOOLS_KEY = 'mt_tools';
function toolsConfig() { try { const v = JSON.parse(localStorage.getItem(TOOLS_KEY)); return (v && typeof v === 'object') ? v : {}; } catch (e) { return {}; } }
function setToolsConfig(c) { try { localStorage.setItem(TOOLS_KEY, JSON.stringify(c)); } catch (e) {} }
function toolsOn() { return toolsConfig().enabled === true; }
function toolEnabled(name) { return toolsConfig()[name] !== false; }   // each tool on by default once tools are enabled

/* ---------- MCP connectors (remote servers over Streamable HTTP) ----------
   Browser-direct: the page speaks JSON-RPC to the user's own MCP server; the
   server must allow CORS from this origin (same posture as local Ollama).
   No-auth or static bearer token only — no OAuth in v1. */
const MCP_KEY = 'mt_mcp_servers';
const mcpSessions = {};   // id -> { sessionId, protocolVersion } (per page load)
const mcpStatus = {};     // id -> 'off' | 'connecting' | 'ok' | 'error: …'
function loadMcpServers() { try { const v = JSON.parse(localStorage.getItem(MCP_KEY)); return Array.isArray(v) ? v : []; } catch (e) { return []; } }
function saveMcpServers(list) { try { localStorage.setItem(MCP_KEY, JSON.stringify(list)); return true; } catch (e) { return false; } }
function getMcpServer(id) { return loadMcpServers().find((s) => s.id === id) || null; }
function updateMcpServer(id, patch) {
  const all = loadMcpServers();
  const s = all.find((x) => x.id === id);
  if (!s) return null;
  Object.assign(s, patch);
  saveMcpServers(all);
  return s;
}

// A Streamable HTTP response is either plain JSON or an SSE stream whose
// `data:` lines carry JSON-RPC messages; resolve on the matching id.
async function mcpParseResponse(resp, wantId) {
  const ct = resp.headers.get('content-type') || '';
  if (ct.includes('text/event-stream')) {
    const reader = resp.body.getReader(); const dec = new TextDecoder(); let buf = '';
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buf += dec.decode(value, { stream: true });
      const events = buf.split('\n\n'); buf = events.pop();
      for (const ev of events) {
        const data = ev.split('\n').filter((l) => l.startsWith('data:')).map((l) => l.slice(5).trim()).join('');
        if (!data) continue;
        let msg; try { msg = JSON.parse(data); } catch (e) { continue; }
        if (msg.id === wantId) { try { reader.cancel(); } catch (e) {} return msg; }
      }
    }
    throw new Error('stream ended without a response');
  }
  const text = await resp.text();
  return text ? JSON.parse(text) : null;
}

let _mcpRpcId = 0;
async function mcpRpc(server, method, params, isNotification) {
  const sess = mcpSessions[server.id] || {};
  const id = isNotification ? undefined : ++_mcpRpcId;
  const headers = { 'content-type': 'application/json', accept: 'application/json, text/event-stream' };
  if (sess.sessionId) headers['mcp-session-id'] = sess.sessionId;
  if (sess.protocolVersion) headers['mcp-protocol-version'] = sess.protocolVersion;
  if (server.token) headers.authorization = 'Bearer ' + server.token;
  const resp = await fetch(server.url, {
    method: 'POST', headers,
    body: JSON.stringify({ jsonrpc: '2.0', ...(isNotification ? {} : { id }), method, ...(params !== undefined ? { params } : {}) }),
    signal: AbortSignal.timeout(30000),
  });
  const sid = resp.headers.get('mcp-session-id');
  if (sid) (mcpSessions[server.id] = mcpSessions[server.id] || {}).sessionId = sid;
  if (!resp.ok) {
    const detail = await resp.text().catch(() => '');
    const err = new Error('HTTP ' + resp.status + (detail ? ' — ' + detail.slice(0, 120) : ''));
    err.httpStatus = resp.status;
    throw err;
  }
  if (isNotification) { try { if (resp.body) await resp.body.cancel(); } catch (e) {} return null; }
  const msg = await mcpParseResponse(resp, id);
  if (msg && msg.error) throw new Error(msg.error.message || ('MCP error ' + msg.error.code));
  return msg ? msg.result : null;
}

async function mcpConnect(server) {
  mcpStatus[server.id] = 'connecting';
  try {
    delete mcpSessions[server.id];
    const init = await mcpRpc(server, 'initialize', {
      protocolVersion: '2025-03-26',
      capabilities: {},
      clientInfo: { name: 'seer-web', version: '1.0' },
    });
    (mcpSessions[server.id] = mcpSessions[server.id] || {}).protocolVersion = (init && init.protocolVersion) || '2025-03-26';
    await mcpRpc(server, 'notifications/initialized', undefined, true);
    const tools = [];
    let cursor;
    do {
      const page = await mcpRpc(server, 'tools/list', cursor ? { cursor } : {});
      for (const t of (page && page.tools) || []) {
        tools.push({ name: t.name, description: t.description || '', inputSchema: t.inputSchema || { type: 'object' } });
      }
      cursor = page && page.nextCursor;
    } while (cursor && tools.length < 200);
    const label = server.label || (init && init.serverInfo && init.serverInfo.name) || new URL(server.url).hostname;
    updateMcpServer(server.id, { tools, label });
    mcpStatus[server.id] = 'ok';
    return tools;
  } catch (e) {
    const hint = (e.name === 'TypeError')
      ? 'unreachable — the server must allow cross-origin requests from this site'
      : (e.message || String(e));
    mcpStatus[server.id] = 'error: ' + hint;
    throw e;
  }
}

async function mcpCallTool(serverId, name, args) {
  const server = getMcpServer(serverId);
  if (!server) return 'Error: that MCP server was removed.';
  const call = () => mcpRpc(server, 'tools/call', { name, arguments: args || {} });
  let result;
  try {
    if (!mcpSessions[serverId]) await mcpConnect(server);
    result = await call();
  } catch (e) {
    // Session may have expired (or this is the first call after a reload that
    // raced a dead session) — reconnect once and retry.
    try { await mcpConnect(server); result = await call(); }
    catch (e2) { return 'Error: ' + (mcpStatus[serverId] || e2.message || e2); }
  }
  const parts = ((result && result.content) || []).map((c) => (c.type === 'text' ? (c.text || '') : '[' + (c.type || 'content') + ']'));
  let text = parts.join('\n').slice(0, 8000);
  if (result && result.isError) text = 'Error: ' + (text || 'tool failed');
  return text || '(empty result)';
}

// name -> { serverId, tool } across enabled servers. First registration wins;
// names colliding with built-ins or earlier servers are excluded and surfaced
// as conflicts in the tools UI.
function mcpToolIndex() {
  const index = {}; const conflicts = new Set();
  for (const server of loadMcpServers()) {
    if (!server.enabled) continue;
    for (const tool of server.tools || []) {
      if (TOOL_DEFS[tool.name] || index[tool.name]) { conflicts.add(server.id + '/' + tool.name); continue; }
      if (server.disabledTools && server.disabledTools[tool.name]) continue;
      index[tool.name] = { serverId: server.id, tool };
    }
  }
  mcpToolIndex._conflicts = conflicts;
  return index;
}
function mcpToolDef(name) {
  const entry = mcpToolIndex()[name];
  if (!entry) return null;
  return { run: (args) => mcpCallTool(entry.serverId, name, args) };
}

function enabledToolSchemas() {
  const builtIn = Object.keys(TOOL_DEFS).filter(toolEnabled).map((k) => TOOL_DEFS[k].schema);
  const mcp = Object.entries(mcpToolIndex()).map(([name, e]) => ({
    type: 'function',
    function: { name, description: e.tool.description, parameters: e.tool.inputSchema || { type: 'object' } },
  }));
  return builtIn.concat(mcp);
}
function renderToolList() {
  if (!els.toolList) return;
  const on = toolsOn();
  els.toolList.innerHTML = '';
  for (const [key, def] of Object.entries(TOOL_DEFS)) {
    const row = document.createElement('label'); row.className = 'tool-row';
    const cb = document.createElement('input'); cb.type = 'checkbox'; cb.checked = toolEnabled(key); cb.disabled = !on;
    cb.addEventListener('change', () => { const c = toolsConfig(); c[key] = cb.checked; setToolsConfig(c); });
    const name = document.createElement('b'); name.textContent = def.label;
    const blurb = document.createElement('span'); blurb.textContent = ' — ' + def.blurb;
    row.append(cb, name, blurb); els.toolList.appendChild(row);
  }
  // MCP servers: a header row per server, then its tools as toggle rows.
  mcpToolIndex();   // refresh conflict set
  for (const server of loadMcpServers()) {
    const head = document.createElement('div'); head.className = 'mcp-server-row';
    const en = document.createElement('input'); en.type = 'checkbox'; en.checked = server.enabled !== false; en.disabled = !on;
    en.title = 'Enable this server';
    en.addEventListener('change', () => { updateMcpServer(server.id, { enabled: en.checked }); renderToolList(); });
    const dot = document.createElement('span');
    const status = mcpStatus[server.id] || (server.tools && server.tools.length ? 'ok' : 'off');
    dot.className = 'mcp-dot ' + (status.startsWith('error') ? 'error' : status);
    const name = document.createElement('b'); name.textContent = server.label || server.url;
    const meta = document.createElement('span'); meta.className = 'mcp-meta';
    meta.textContent = status.startsWith('error') ? status : ((server.tools || []).length + ' tool' + ((server.tools || []).length === 1 ? '' : 's'));
    meta.title = meta.textContent;
    const refresh = document.createElement('button'); refresh.type = 'button'; refresh.className = 'mcp-act'; refresh.textContent = '↻'; refresh.title = 'Reconnect';
    refresh.addEventListener('click', () => {
      mcpStatus[server.id] = 'connecting';
      renderToolList();
      mcpConnect(server).then(() => renderToolList()).catch(() => renderToolList());
    });
    const remove = document.createElement('button'); remove.type = 'button'; remove.className = 'mcp-act'; remove.textContent = '✕'; remove.title = 'Remove server';
    remove.addEventListener('click', () => {
      if (!confirm('Remove the MCP server “' + (server.label || server.url) + '”?')) return;
      saveMcpServers(loadMcpServers().filter((s) => s.id !== server.id));
      delete mcpSessions[server.id]; delete mcpStatus[server.id];
      renderToolList();
    });
    head.append(en, dot, name, meta, refresh, remove);
    els.toolList.appendChild(head);
    if (server.enabled === false) continue;
    for (const tool of server.tools || []) {
      const row = document.createElement('label'); row.className = 'tool-row mcp-tool-row';
      const conflict = mcpToolIndex._conflicts.has(server.id + '/' + tool.name);
      if (conflict) row.classList.add('conflict');
      const cb = document.createElement('input'); cb.type = 'checkbox';
      cb.checked = !conflict && !(server.disabledTools && server.disabledTools[tool.name]);
      cb.disabled = !on || conflict;
      cb.addEventListener('change', () => {
        const dt = Object.assign({}, server.disabledTools);
        if (cb.checked) delete dt[tool.name]; else dt[tool.name] = true;
        updateMcpServer(server.id, { disabledTools: dt });
      });
      const tn = document.createElement('b'); tn.textContent = tool.name;
      const tb = document.createElement('span');
      tb.textContent = conflict ? ' — name conflict, skipped' : (tool.description ? ' — ' + tool.description.slice(0, 80) : '');
      row.append(cb, tn, tb); els.toolList.appendChild(row);
    }
  }
}

// Rebuild the model-facing message list, expanding stored tool rounds so the
// model sees prior tool calls + results on follow-up turns.
function expandConversation() {
  const out = [];
  for (const m of current.messages) {
    if (m.role === 'user') { out.push({ role: 'user', content: m.content }); continue; }
    if (m.role !== 'assistant') continue;
    if (m.toolRounds && m.toolRounds.length) {
      for (const tr of m.toolRounds) {
        out.push({ role: 'assistant', content: '', tool_calls: [{ function: { name: tr.name, arguments: tr.args || {} } }] });
        out.push({ role: 'tool', content: String(tr.result == null ? '' : tr.result) });
      }
    }
    out.push({ role: 'assistant', content: m.content || '' });
  }
  return out;
}

/* ---------- Streaming ---------- */
function setStreaming(on) {
  streaming = on;
  els.send.classList.toggle('stopping', on);
  els.send.textContent = on ? '■' : '↑';
  els.send.title = on ? 'Stop' : 'Send';
}

async function streamAssistant() {
  // Pin the conversation this stream belongs to — the user can switch, delete,
  // or sign out mid-stream, and the reply must land in THIS conversation (or
  // nowhere), never whatever `current` happens to be at completion time.
  const conv = current;
  const a = buildAssistantNode();
  controller = new AbortController();
  setStreaming(true);

  const sysMsgs = [];
  const proj = projectOf(current);
  if (proj) sysMsgs.push({ role: 'system', content: compileProjectContext(proj) });
  const scaf = activeScaffold();
  if (scaf) { sysMsgs.push({ role: 'system', content: compileScaffold(scaf) }); touchScaffold(scaf.id); }
  if (visualsOn()) sysMsgs.push({ role: 'system', content: VISUALS_HINT });
  const sys = effectiveSystem().trim();
  if (sys) sysMsgs.push({ role: 'system', content: sys });

  const toolSchemas = toolsOn() ? enabledToolSchemas() : [];
  const toolsActive = toolSchemas.length > 0;
  const convo = [...sysMsgs, ...expandConversation()];
  const toolRounds = [];
  let acc = '', accThink = '', stats = null, firstTok = false, sawContent = false, failed = false, toolLimitHit = false;

  try {
    for (let iter = 0; iter < 8; iter++) {
      let resp;
      try {
        resp = await fetch(localMode ? localBase() + '/api/chat' : '/api/chat', {
          method: 'POST',
          headers: { 'content-type': 'application/json', ...authHeader() },
          body: JSON.stringify({ model: selectedModel(), messages: convo, options: buildOptions(), ...(toolsActive ? { tools: toolSchemas } : {}) }),
          signal: controller.signal,
        });
      } catch (e) {
        if (localMode && e.name !== 'AbortError') {
          throw new Error('Local Ollama unreachable — is it running with OLLAMA_ORIGINS=' + location.origin + ' ?');
        }
        throw e;
      }
      if (!localMode && resp.status === 401) { disconnect(); throw new Error('Your key was rejected — please reconnect.'); }
      if (!resp.ok || !resp.body) { const d = await resp.text().catch(() => ''); throw new Error('Request failed (' + resp.status + ') ' + d.slice(0, 160)); }
      const reader = resp.body.getReader(); const dec = new TextDecoder(); let buf = '';
      let turnContent = '', toolCalls = [];
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
            turnContent += msg.content; acc += msg.content; a.bubble.textContent = acc; a.bubble.classList.add('cursor'); maybeScroll();
          }
          if (msg.tool_calls && msg.tool_calls.length) for (const tc of msg.tool_calls) toolCalls.push(tc);
          if (obj.done) stats = { eval_count: obj.eval_count, eval_duration: obj.eval_duration };
        }
      }
      // Flush a final line that arrived without a trailing newline (stats live
      // on the done:true chunk).
      buf += dec.decode();
      const tail = buf.trim();
      if (tail) { try { const obj = JSON.parse(tail); if (obj.done) stats = { eval_count: obj.eval_count, eval_duration: obj.eval_duration }; } catch (e) {} }
      if (toolsActive && toolCalls.length) {
        a.clearTyping();
        convo.push({ role: 'assistant', content: turnContent, tool_calls: toolCalls });
        for (const tc of toolCalls) {
          // Stop must work between tool runs too, not just on the fetch.
          if (controller.signal.aborted) { const err = new Error('aborted'); err.name = 'AbortError'; throw err; }
          const name = tc.function && tc.function.name;
          let args = tc.function && tc.function.arguments;
          if (typeof args === 'string') { try { args = JSON.parse(args); } catch (e) { args = {}; } }
          args = args || {};
          const def = TOOL_DEFS[name] || mcpToolDef(name);
          const ui = a.addToolCall(name || 'tool', JSON.stringify(args, null, 2));
          let result;
          if (!def) { result = 'Error: unknown tool "' + name + '"'; ui.setError(result); }
          else { try { result = await def.run(args); ui.setResult(result); } catch (e) { result = 'Error: ' + (e.message || e); ui.setError(result); } }
          result = (typeof result === 'string') ? result : JSON.stringify(result);
          toolRounds.push({ name, args, result });
          convo.push({ role: 'tool', content: result });
        }
        if (controller.signal.aborted) { const err = new Error('aborted'); err.name = 'AbortError'; throw err; }
        if (iter === 7) toolLimitHit = true;   // loop is about to end with unanswered tool results
        continue;   // re-request with tool results
      }
      break;        // no tool calls → final answer
    }
  } catch (e) {
    if (e.name !== 'AbortError') { failed = true; showErr(e.message || 'Something went wrong.'); }
  }

  setStreaming(false); controller = null;
  a.clearTyping(); a.bubble.classList.remove('cursor');
  if (toolLimitHit && !failed) showErr('Tool-call limit reached (8 rounds) — the reply may be incomplete.');

  if (failed && !acc && !accThink && !toolRounds.length) {
    a.wrap.remove();
    // The user's message was already persisted by send(); nothing else to do.
    return;
  }

  if (acc) { renderAssistantHTML(a.bubble, acc); a.bubble.dataset.raw = acc; }
  else if (!accThink) { a.bubble.textContent = toolRounds.length ? '' : '…'; }
  a.collapseThinking();
  if (stats) a.setStats(stats);
  a.addActions();

  conv.messages.push({ role: 'assistant', content: acc, thinking: accThink || undefined, stats: stats || undefined, toolRounds: toolRounds.length ? toolRounds : undefined });
  if (conv.title === 'New chat') {
    const fu = conv.messages.find((m) => m.role === 'user');
    if (fu) {
      const base = (fu.displayText && fu.displayText.trim()) ? fu.displayText
        : (fu.attachments && fu.attachments[0] ? fu.attachments[0].name : fu.content);
      conv.title = (base.slice(0, 42).trim() || 'New chat');
    }
  }
  store.save(conv); renderSidebar();
  if (conv === current) { updateHeaderTitle(); maybeScroll(); }
}

/* ---------- File attachments (per-message, text-extracted) ---------- */
let pendingAttachments = [];
let _pdfjsP = null;
function ensurePdfjs() {
  if (window.pdfjsLib) return Promise.resolve(window.pdfjsLib);
  if (!_pdfjsP) _pdfjsP = loadScript('/vendor/pdf.min.js').then(() => {
    window.pdfjsLib.GlobalWorkerOptions.workerSrc = '/vendor/pdf.worker.min.js';
    return window.pdfjsLib;
  });
  return _pdfjsP;
}
const ATT_TEXT_RE = /\.(txt|md|markdown|csv|tsv|json|ya?ml|xml|html?|css|js|mjs|ts|tsx|jsx|py|rb|go|rs|java|c|h|cpp|cc|cs|php|sh|bash|sql|toml|ini|cfg|log)$/i;
function isPdfFile(f) { return /\.pdf$/i.test(f.name) || f.type === 'application/pdf'; }
function isTextFile(f) { return ATT_TEXT_RE.test(f.name) || (f.type || '').startsWith('text/'); }
const ATT_TEXT_CAP = 200000;

async function extractPdfText(buf) {
  const pdfjs = await ensurePdfjs();
  const doc = await pdfjs.getDocument({ data: buf }).promise;
  const maxPages = Math.min(doc.numPages, 80);
  const out = [];
  for (let i = 1; i <= maxPages; i++) {
    const page = await doc.getPage(i);
    const tc = await page.getTextContent();
    out.push(tc.items.map((it) => it.str).join(' '));
  }
  return { text: out.join('\n\n').replace(/[ \t]+/g, ' ').trim(), pages: doc.numPages, truncated: doc.numPages > maxPages };
}

async function addFiles(fileList) {
  for (const file of [...fileList]) {
    const att = { id: uidS(), name: file.name, size: file.size, text: '', status: 'loading', error: '', note: '' };
    pendingAttachments.push(att); renderAttachments();
    try {
      if (isPdfFile(file)) {
        if (file.size > 15 * 1024 * 1024) throw new Error('PDF too large (max 15 MB)');
        const r = await extractPdfText(await file.arrayBuffer());
        if (!r.text) throw new Error('No selectable text (scanned image?)');
        att.text = r.text; att.note = r.truncated ? `first 80 of ${r.pages} pages` : `${r.pages} pages`;
      } else if (isTextFile(file)) {
        if (file.size > 1024 * 1024) throw new Error('File too large (max 1 MB)');
        att.text = await file.text();
      } else {
        throw new Error('Unsupported file type');
      }
      if (att.text.length > ATT_TEXT_CAP) { att.text = att.text.slice(0, ATT_TEXT_CAP); att.note = (att.note ? att.note + ', ' : '') + 'truncated'; }
      att.status = 'ready';
    } catch (e) { att.status = 'error'; att.error = (e && e.message) || 'Could not read file'; }
    renderAttachments();
  }
}
function removeAttachment(id) { pendingAttachments = pendingAttachments.filter((a) => a.id !== id); renderAttachments(); }
function renderAttachments() {
  const bar = els.attachBar; if (!bar) return;
  bar.innerHTML = '';
  if (!pendingAttachments.length) { bar.classList.add('hidden'); return; }
  bar.classList.remove('hidden');
  for (const a of pendingAttachments) {
    const chip = document.createElement('span');
    chip.className = 'attach-chip' + (a.status === 'error' ? ' err' : a.status === 'loading' ? ' loading' : '');
    const name = document.createElement('span'); name.className = 'ac-name'; name.textContent = '📎 ' + a.name;
    const meta = document.createElement('span'); meta.className = 'ac-meta';
    meta.textContent = a.status === 'loading' ? 'reading…' : a.status === 'error' ? a.error : (a.note || fmtBytes(a.size));
    const x = document.createElement('button'); x.type = 'button'; x.textContent = '✕'; x.title = 'Remove';
    x.addEventListener('click', () => removeAttachment(a.id));
    chip.append(name, meta, x); bar.appendChild(chip);
  }
}
function buildMessageContent(typed, atts) {
  const parts = [];
  if (typed) parts.push(typed);
  for (const a of atts) parts.push('## Attached file: ' + a.name + '\n```\n' + a.text + '\n```');
  return parts.join('\n\n');
}

async function send() {
  if (streaming) return;
  if (pendingAttachments.some((a) => a.status === 'loading')) { showErr('Still reading a file — one moment.'); return; }
  const ready = pendingAttachments.filter((a) => a.status === 'ready');
  const typed = els.input.value.trim();
  if (!typed && !ready.length) return;
  showErr('');
  els.input.value = ''; autosize();
  if (!current) newConversation();
  removeEmptyState();
  const content = buildMessageContent(typed, ready);
  const attachments = ready.map((a) => ({ name: a.name, size: a.size }));
  current.messages.push({ role: 'user', content, displayText: typed, attachments: attachments.length ? attachments : undefined });
  store.save(current);   // persist now — a failed request must not lose the typed message
  addUserBubble(typed, attachments);
  pendingAttachments = []; renderAttachments();
  autoFollow = true;
  await streamAssistant();
}

async function regenerate(ev) {
  if (streaming || !current) return;
  // Regenerate always replaces the LAST reply — refuse from older rows, where
  // the click would silently delete the newest answer instead.
  if (ev && ev.target) {
    const row = ev.target.closest('.msg.assistant');
    const rows = document.querySelectorAll('#thread .msg.assistant');
    if (row && rows.length && row !== rows[rows.length - 1]) {
      showErr('Only the latest reply can be regenerated.');
      return;
    }
  }
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

let toastTimer = null;
function toast(msg) {
  let t = document.getElementById('mtToast');
  if (!t) { t = document.createElement('div'); t.id = 'mtToast'; t.className = 'mt-toast'; document.body.appendChild(t); }
  t.textContent = msg; t.classList.add('show');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('show'), 2200);
}

// Desktop-only: collapse the sidebar to reclaim chat width (persisted).
const SIDEBAR_KEY = 'mt_sidebar_collapsed';
const desktopMq = window.matchMedia('(min-width: 761px)');
function setSidebarCollapsed(on, persist) {
  document.body.classList.toggle('sidebar-collapsed', on);
  if (els.collapseBtn) els.collapseBtn.title = on ? 'Expand sidebar' : 'Collapse sidebar';
  if (persist !== false) { try { localStorage.setItem(SIDEBAR_KEY, on ? '1' : '0'); } catch (e) {} }
}
function toggleSidebar() { setSidebarCollapsed(!document.body.classList.contains('sidebar-collapsed')); }
try { if (localStorage.getItem(SIDEBAR_KEY) === '1') setSidebarCollapsed(true, false); } catch (e) {}

/* ---------- AI Debate ----------
   Two models take turns on a topic, in their own modal. Self-contained: it does
   not touch the chat conversation/store/streaming state. */
let debateController = null;
let debateRunning = false;
let currentDebate = null;   // { topic, modelA, modelB, mode, labels, rounds, transcript } of the live/last run

const DEBATES_KEY = 'mt_debates';
function loadDebates() { try { const v = JSON.parse(localStorage.getItem(DEBATES_KEY)); return Array.isArray(v) ? v : []; } catch (e) { return []; } }
function saveDebatesList(list) { try { localStorage.setItem(DEBATES_KEY, JSON.stringify(list)); return true; } catch (e) { return false; } }
function updateSavedCount() { const n = loadDebates().length; els.dbSavedBtn.textContent = n ? `Saved (${n})` : 'Saved'; }

function exitSharedView() {
  els.dbCard.classList.remove('db-view');
  els.dbCta.classList.add('hidden');
  els.dbHead.textContent = 'AI Debate';
}
function enterSharedView() {
  els.dbCard.classList.add('db-view');
  els.dbCta.classList.remove('hidden');
  els.dbHead.textContent = 'Shared debate · Mantic Think';
}
// "Start your own" from a shared link: drop the viewer and, if the visitor is in
// the app, give them a fresh debate setup; otherwise reveal the landing gate.
function startOwnFromShared() {
  exitSharedView();
  if (apiKey || localMode) { els.dbFeed.innerHTML = ''; openDebate(); }
  else { closeDebate(); }
}

function openDebate() {
  exitSharedView();
  els.dbCard.classList.remove('db-active');
  fillDebateModels();
  applyDebateMode();
  els.dbStop.classList.add('hidden');
  els.dbSave.classList.add('hidden');
  els.dbShare.classList.add('hidden');
  els.dbSaved.classList.add('hidden');
  els.dbFeed.classList.remove('hidden');
  els.dbStart.classList.remove('hidden');
  els.dbStart.disabled = false;
  updateSavedCount();
  els.debateModal.classList.remove('hidden');
  els.dbTopic.focus();
}
function closeDebate() {
  if (debateController) { try { debateController.abort(); } catch (e) {} }
  els.debateModal.classList.add('hidden');
}

function saveCurrentDebate() {
  if (!currentDebate || !currentDebate.transcript.length) return;
  const list = loadDebates();
  const rec = {
    id: uid(),
    topic: currentDebate.topic,
    mode: currentDebate.mode,
    participants: recordParticipants(currentDebate),
    transcript: currentDebate.transcript,
    savedAt: Date.now(),
  };
  list.unshift(rec);
  if (list.length > 100) list.length = 100;
  if (!saveDebatesList(list)) { showErr('Couldn’t save — this browser’s storage is full.'); return; }
  updateSavedCount();
  els.dbSave.textContent = '★ Saved'; els.dbSave.classList.add('saved'); els.dbSave.disabled = true;
}

function showSavedPanel() {
  renderSavedDebates();
  els.dbFeed.classList.add('hidden');
  els.dbSaved.classList.remove('hidden');
}
function hideSavedPanel() {
  els.dbSaved.classList.add('hidden');
  els.dbFeed.classList.remove('hidden');
}
function toggleSavedPanel() { if (els.dbSaved.classList.contains('hidden')) showSavedPanel(); else hideSavedPanel(); }

function renderSavedDebates() {
  const list = loadDebates();
  els.dbSaved.innerHTML = '';
  if (!list.length) { const e = document.createElement('div'); e.className = 'db-saved-empty'; e.textContent = 'No saved debates yet. Run one and tap ★ Save.'; els.dbSaved.appendChild(e); return; }
  for (const rec of list) {
    const item = document.createElement('div'); item.className = 'db-saved-item';
    const main = document.createElement('div'); main.className = 'db-saved-main';
    const topic = document.createElement('div'); topic.className = 'db-saved-topic'; topic.textContent = rec.topic;
    const meta = document.createElement('div'); meta.className = 'db-saved-meta';
    const when = new Date(rec.savedAt);
    const models = recordParticipants(rec).map((p) => p.model);
    meta.textContent = `${models.join(' · ')} · ${debateModeLabel(rec.mode)} · ${when.toLocaleDateString()}`;
    main.append(topic, meta);
    main.addEventListener('click', () => loadDebateRecord(rec));
    const share = document.createElement('button'); share.className = 'db-saved-del'; share.type = 'button'; share.textContent = '↗'; share.title = 'Copy share link';
    share.addEventListener('click', (e) => { e.stopPropagation(); shareDebate(rec, share); });
    const del = document.createElement('button'); del.className = 'db-saved-del'; del.type = 'button'; del.textContent = '✕'; del.title = 'Delete';
    del.addEventListener('click', (e) => {
      e.stopPropagation();
      saveDebatesList(loadDebates().filter((d) => d.id !== rec.id));
      updateSavedCount(); renderSavedDebates();
    });
    item.append(main, share, del); els.dbSaved.appendChild(item);
  }
}

function loadDebateRecord(rec) {
  els.dbTopic.value = rec.topic;
  if (['debate', 'discuss', 'roundtable'].includes(rec.mode)) els.dbMode.value = rec.mode;
  const participants = recordParticipants(rec);
  // Render the saved transcript into the feed (read-only review).
  els.dbFeed.innerHTML = '';
  addDebateHeader(rec.topic, participants, rec.mode);
  for (const t of rec.transcript) {
    const node = addDebateTurn(t.label, t.model, t.side);
    node.finalize(t.text);
  }
  currentDebate = { topic: rec.topic, mode: rec.mode, participants, rounds: 0, transcript: rec.transcript };
  els.dbSave.classList.add('hidden');   // already saved
  els.dbShare.classList.remove('hidden');
  hideSavedPanel();
}

// Share links encode the whole debate in the URL hash (no server storage),
// consistent with the site's browser-only data model.
function encodeDebate(rec) {
  const parts = recordParticipants(rec);
  const slim = { t: rec.topic, m: rec.mode, p: parts.map((p) => ({ m: p.model, l: p.label, s: p.side })),
    x: (rec.transcript || []).map((tr) => ({ s: tr.side, l: tr.label, m: tr.model, x: tr.text })) };
  const json = JSON.stringify(slim);
  return btoa(unescape(encodeURIComponent(json))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function decodeDebate(str) {
  try {
    const b64 = str.replace(/-/g, '+').replace(/_/g, '/');
    const s = JSON.parse(decodeURIComponent(escape(atob(b64))));
    if (!s || !Array.isArray(s.x)) return null;
    const participants = Array.isArray(s.p)
      ? s.p.map((p) => ({ model: p.m, label: p.l, side: p.s }))
      : (s.a && s.b ? [{ model: s.a, label: (s.l && s.l.A) || 'Proponent', side: 'A' }, { model: s.b, label: (s.l && s.l.B) || 'Opponent', side: 'B' }] : []);
    return { topic: s.t || '', mode: s.m || 'debate', participants,
      transcript: s.x.map((tr) => ({ side: tr.s, label: tr.l, model: tr.m, text: tr.x })) };
  } catch (e) { return null; }
}
async function shareDebate(rec, btn) {
  if (!rec || !rec.transcript || !rec.transcript.length) return;
  const orig = btn ? btn.textContent : null;
  if (btn) { btn.textContent = 'Creating link…'; btn.disabled = true; }
  let url = null;
  try {
    const slim = {
      topic: rec.topic, mode: rec.mode, participants: recordParticipants(rec),
      transcript: rec.transcript.map((t) => ({ side: t.side, label: t.label, model: t.model, text: t.text })),
    };
    const resp = await fetch('/api/debate', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(slim) });
    const d = await resp.json().catch(() => ({}));
    if (resp.ok && d.id) url = location.origin + '/d/' + d.id;
  } catch (e) {}
  // Fall back to a self-contained hash link if the server short link failed.
  if (!url) url = location.origin + '/#debate=' + encodeDebate(rec);
  if (btn) btn.disabled = false;
  let copied = true;
  try { await navigator.clipboard.writeText(url); } catch (e) { copied = false; }
  if (!copied) { if (btn && orig) btn.textContent = orig; window.prompt('Copy this debate link:', url); return; }
  if (btn) { btn.textContent = 'Link copied ✓'; setTimeout(() => { if (orig) btn.textContent = orig; }, 1400); }
}
function openSharedDebate(rec) {
  fillDebateModels();
  els.debateModal.classList.remove('hidden');
  loadDebateRecord(rec);
  currentDebate = rec;
  // Plain read-only presentation for (possibly non-user) visitors, with a CTA.
  enterSharedView();
}
async function maybeOpenSharedDebate() {
  // New: /d/<id> short links resolve from the server.
  const path = location.pathname.match(/^\/d\/([A-Za-z0-9_-]+)$/);
  if (path) {
    try {
      const resp = await fetch('/api/debate/' + encodeURIComponent(path[1]));
      const rec = await resp.json().catch(() => null);
      try { history.replaceState(null, '', '/'); } catch (e) {}
      if (resp.ok && rec && Array.isArray(rec.transcript) && rec.transcript.length) openSharedDebate(rec);
    } catch (e) {}
    return;
  }
  // Legacy: self-contained #debate=<base64> links.
  const h = (location.hash || '').match(/[#&]debate=([^&]+)/);
  if (!h) return;
  const rec = decodeDebate(h[1]);
  try { history.replaceState(null, '', location.pathname + location.search); } catch (e) {}
  if (rec && rec.transcript.length) openSharedDebate(rec);
}
function fillDebateModels() {
  const opts = [...els.model.options].filter((o) => !o.value.startsWith('preset:') && o.value);
  for (const sel of [els.dbModelA, els.dbModelB]) {
    const prev = sel.value;
    sel.innerHTML = '';
    for (const o of opts) { const c = document.createElement('option'); c.value = o.value; c.textContent = o.textContent; sel.appendChild(c); }
    if (prev && opts.some((o) => o.value === prev)) sel.value = prev;
  }
  // Default the two models to different choices when possible.
  if (els.dbModelB.options.length > 1 && els.dbModelA.value === els.dbModelB.value) els.dbModelB.selectedIndex = 1;
}

/* ---- Round table seats (2–4 models) ---- */
const MAX_SEATS = 4;
let seatModels = [];   // model name per seat
let seatRoles = [];    // optional perspective per seat

function debateModelList() {
  return [...els.model.options].filter((o) => !o.value.startsWith('preset:') && o.value).map((o) => o.value);
}
function ensureSeatDefaults() {
  const models = debateModelList();
  if (seatModels.length < 2) {
    seatModels = [models[0] || '', models[1] || models[0] || ''];
    seatRoles = ['', ''];
  }
  seatModels = seatModels.map((m) => (models.includes(m) ? m : (models[0] || '')));
}
function renderSeats() {
  const models = debateModelList();
  const rolesOn = els.dbRoles.checked;
  els.dbSeats.innerHTML = '';
  seatModels.forEach((m, i) => {
    const row = document.createElement('div'); row.className = 'db-seat-row';
    const num = document.createElement('span'); num.className = 'db-seat-num'; num.textContent = 'Seat ' + (i + 1);
    const sel = document.createElement('select'); sel.className = 'db-sel';
    for (const name of models) { const o = document.createElement('option'); o.value = name; o.textContent = name; sel.appendChild(o); }
    sel.value = m || (models[0] || '');
    sel.addEventListener('change', () => { seatModels[i] = sel.value; });
    row.append(num, sel);
    if (rolesOn) {
      const role = document.createElement('input'); role.className = 'db-seat-role'; role.type = 'text';
      role.placeholder = 'Perspective (optional)'; role.value = seatRoles[i] || '';
      role.addEventListener('input', () => { seatRoles[i] = role.value; });
      row.append(role);
    }
    if (seatModels.length > 2) {
      const rm = document.createElement('button'); rm.type = 'button'; rm.className = 'db-seat-rm'; rm.textContent = '✕'; rm.title = 'Remove seat';
      rm.addEventListener('click', () => { seatModels.splice(i, 1); seatRoles.splice(i, 1); renderSeats(); });
      row.append(rm);
    }
    els.dbSeats.appendChild(row);
  });
  if (seatModels.length < MAX_SEATS) {
    const add = document.createElement('button'); add.type = 'button'; add.className = 'db-seat-add'; add.textContent = '+ Add seat';
    add.addEventListener('click', () => {
      if (seatModels.length >= MAX_SEATS) return;
      const ms = debateModelList();
      seatModels.push(ms[seatModels.length % Math.max(ms.length, 1)] || ms[0] || '');
      seatRoles.push('');
      renderSeats();
    });
    els.dbSeats.appendChild(add);
  }
}
function applyDebateMode() {
  const rt = els.dbMode.value === 'roundtable';
  els.dbPair.classList.toggle('hidden', rt);
  els.dbSeats.classList.toggle('hidden', !rt);
  els.dbRolesWrap.classList.toggle('hidden', !rt);
  if (rt) { ensureSeatDefaults(); renderSeats(); }
}

/// The active list of debaters from the setup UI: [{model, label, side}].
function debateParticipants() {
  const mode = els.dbMode.value;
  if (mode === 'roundtable') {
    const rolesOn = els.dbRoles.checked;
    return seatModels.map((m, i) => ({
      model: m,
      label: (rolesOn && (seatRoles[i] || '').trim()) ? seatRoles[i].trim() : 'Seat ' + (i + 1),
      side: String(i),
    }));
  }
  const a = els.dbModelA.value, b = els.dbModelB.value;
  return mode === 'debate'
    ? [{ model: a, label: 'Proponent', side: 'A' }, { model: b, label: 'Opponent', side: 'B' }]
    : [{ model: a, label: 'Analyst A', side: 'A' }, { model: b, label: 'Analyst B', side: 'B' }];
}

/// Participants for a saved/shared record (new `participants`, or derived from
/// legacy modelA/modelB, or as a last resort from the transcript).
function recordParticipants(rec) {
  if (Array.isArray(rec.participants) && rec.participants.length) return rec.participants;
  if (rec.modelA && rec.modelB) {
    const labels = rec.labels || (rec.mode === 'debate' ? { A: 'Proponent', B: 'Opponent' } : { A: 'Analyst A', B: 'Analyst B' });
    return [{ model: rec.modelA, label: labels.A, side: 'A' }, { model: rec.modelB, label: labels.B, side: 'B' }];
  }
  const seen = {}; const out = [];
  for (const t of (rec.transcript || [])) {
    if (t.side === 'S' || seen[t.side]) continue;
    seen[t.side] = true; out.push({ model: t.model, label: t.label, side: t.side });
  }
  return out;
}
function debateModeLabel(mode) {
  return mode === 'debate' ? 'Debate' : mode === 'discuss' ? 'Discussion' : 'Round table';
}

function participantPersona(mode, p, n, topic) {
  if (mode === 'debate') {
    const role = p.side === 'A'
      ? 'the PROPONENT, arguing IN FAVOR of the proposition'
      : 'the OPPONENT, arguing AGAINST the proposition';
    return `You are ${role} in a structured debate. Topic: "${topic}". Make your strongest case, directly rebut the other side's most recent points, and stay strictly on topic. Be substantive but concise: under 150 words. Do not restate your role, narrate stage directions, or prefix your name — just give the argument in plain persuasive prose.`;
  }
  if (mode === 'discuss') {
    return `You are ${p.label}, one of two thoughtful analysts discussing a question together. Topic: "${topic}". Build on or respectfully challenge the other analyst's most recent points, add fresh angles, and avoid repeating what's already been said. Be concise: under 150 words. Do not prefix your name or narrate stage directions.`;
  }
  // round table
  const hasRole = !/^Seat \d+$/.test(p.label);
  const roleLine = hasRole ? ` Argue from your assigned perspective as "${p.label}".` : '';
  return `You are ${p.label}, one of ${n} participants at a round-table discussion. Topic: "${topic}".${roleLine} Engage directly with the most recent points from the other participants, add a fresh angle, and avoid repeating what's already been said. Be concise: under 150 words. Do not prefix your name or narrate stage directions.`;
}
function debateUserPrompt(topic, transcript, label, mode) {
  if (!transcript.length) {
    if (mode === 'debate') return `The debate topic is: "${topic}". Open with your position as the ${label}.`;
    if (mode === 'discuss') return `The question is: "${topic}". Open the discussion with your initial take as ${label}.`;
    return `The round-table topic is: "${topic}". Open with your initial take as ${label}.`;
  }
  const lines = transcript.map((t) => `[${t.label}]: ${t.text}`).join('\n\n');
  return `Topic: "${topic}"\n\nConversation so far:\n${lines}\n\nIt is now your turn as ${label}. Respond directly to the most recent points.`;
}
function synthesisPersona(mode, topic) {
  if (mode === 'debate') {
    return `You are an impartial moderator closing a debate on: "${topic}". Read the full transcript and write a brief, neutral synthesis: the single strongest point from each side, any genuine common ground, and a balanced judgment of which case was more persuasive and why. Be fair to both sides. Under 180 words. Do not prefix your name or narrate stage directions.`;
  }
  if (mode === 'discuss') {
    return `You are synthesizing a discussion on: "${topic}". Read the full transcript and summarize the key insights, where the analysts agreed and differed, and the most important takeaway. Neutral and concise — under 180 words. Do not prefix your name.`;
  }
  return `You are an impartial moderator closing a round-table discussion on: "${topic}". Read the full transcript and write a brief, neutral synthesis: each participant's strongest contribution, where they converged and diverged, and the key takeaway. Be fair to all. Under 200 words. Do not prefix your name.`;
}
function synthesisUserPrompt(topic, transcript, mode) {
  const lines = transcript.map((t) => `[${t.label}]: ${t.text}`).join('\n\n');
  const kind = mode === 'debate' ? 'synthesis and verdict' : (mode === 'roundtable' ? 'round-table synthesis' : 'synthesis');
  return `Topic: "${topic}"\n\nFull transcript:\n${lines}\n\nNow write the closing ${kind}.`;
}

function addDebateHeader(topic, participants, mode) {
  const h = document.createElement('div'); h.className = 'db-topic';
  const q = document.createElement('div'); q.className = 'db-q'; q.textContent = topic;
  const vs = document.createElement('div'); vs.className = 'db-vs';
  const sep = (participants.length === 2 && mode !== 'roundtable') ? '    vs    ' : '    ·    ';
  vs.textContent = participants.map((p) => `${p.label} · ${p.model}`).join(sep);
  h.append(q, vs); els.dbFeed.appendChild(h);
}
function addDebateTurn(label, model, side) {
  const turn = document.createElement('div'); turn.className = 'db-turn db-' + side;
  const head = document.createElement('div'); head.className = 'db-speaker'; head.textContent = `${label} · ${model}`;
  const body = document.createElement('div'); body.className = 'db-body bubble plain';
  const typing = document.createElement('span'); typing.className = 'typing'; typing.innerHTML = '<span></span><span></span><span></span>';
  body.appendChild(typing);
  turn.append(head, body); els.dbFeed.appendChild(turn);
  els.dbFeed.scrollTop = els.dbFeed.scrollHeight;
  let started = false;
  return {
    setText(t) { if (!started) { started = true; if (typing.parentElement) typing.remove(); } body.textContent = t; els.dbFeed.scrollTop = els.dbFeed.scrollHeight; },
    finalize(t) {
      if (typing.parentElement) typing.remove();
      if (t) { renderAssistantHTML(body, t); body.dataset.raw = t; } else { body.textContent = '…'; }
      els.dbFeed.scrollTop = els.dbFeed.scrollHeight;
    },
  };
}

async function streamDebateTurn(model, system, user, node, signal) {
  const messages = [{ role: 'system', content: system }, { role: 'user', content: user }];
  const resp = await fetch(localMode ? localBase() + '/api/chat' : '/api/chat', {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...authHeader() },
    body: JSON.stringify({ model, messages, stream: true }),
    signal,
  });
  if (!localMode && resp.status === 401) throw new Error('Your key was rejected — please reconnect.');
  if (!resp.ok || !resp.body) { const d = await resp.text().catch(() => ''); throw new Error('Request failed (' + resp.status + ') ' + d.slice(0, 160)); }
  const reader = resp.body.getReader(); const dec = new TextDecoder(); let buf = ''; let acc = '';
  while (true) {
    const { value, done } = await reader.read(); if (done) break;
    buf += dec.decode(value, { stream: true });
    const lines = buf.split('\n'); buf = lines.pop();
    for (const line of lines) {
      const t = line.trim(); if (!t) continue;
      let obj; try { obj = JSON.parse(t); } catch (e) { continue; }
      if (obj.error) throw new Error(obj.error);
      const msg = obj.message || {};
      if (msg.content) { acc += msg.content; node.setText(acc); }
    }
  }
  node.finalize(acc);
  return acc;
}

async function runDebate() {
  if (debateRunning) return;
  const topic = els.dbTopic.value.trim();
  if (!topic) { els.dbTopic.focus(); return; }
  const mode = els.dbMode.value;
  const participants = debateParticipants();
  if (participants.length < 2 || participants.some((p) => !p.model)) { showErr('Pick a model for every seat.'); return; }
  const rounds = Math.max(1, Math.min(6, parseInt(els.dbRounds.value, 10) || 2));

  debateRunning = true;
  els.dbCard.classList.add('db-active');
  els.dbStart.disabled = true;
  els.dbStop.classList.remove('hidden');
  els.dbSave.classList.add('hidden');
  els.dbShare.classList.add('hidden');
  els.dbSave.classList.remove('saved'); els.dbSave.textContent = '★ Save'; els.dbSave.disabled = false;
  hideSavedPanel();
  els.dbFeed.innerHTML = '';
  debateController = new AbortController();
  addDebateHeader(topic, participants, mode);

  const transcript = [];
  currentDebate = { topic, mode, participants, rounds, transcript };
  try {
    outer:
    for (let r = 0; r < rounds; r++) {
      for (const p of participants) {
        const node = addDebateTurn(p.label, p.model, p.side);
        const text = await streamDebateTurn(
          p.model,
          participantPersona(mode, p, participants.length, topic),
          debateUserPrompt(topic, transcript, p.label, mode),
          node,
          debateController.signal
        );
        transcript.push({ side: p.side, label: p.label, model: p.model, text });
        if (debateController.signal.aborted) break outer;
      }
    }
    // Optional closing synthesis from an impartial moderator (uses the first model).
    if (els.dbSynth.checked && !debateController.signal.aborted && transcript.length) {
      const synthModel = participants[0].model;
      const node = addDebateTurn('Synthesis', synthModel, 'S');
      const text = await streamDebateTurn(
        synthModel,
        synthesisPersona(mode, topic),
        synthesisUserPrompt(topic, transcript, mode),
        node,
        debateController.signal
      );
      transcript.push({ side: 'S', label: 'Synthesis', model: synthModel, text });
    }
  } catch (e) {
    if (e.name !== 'AbortError') {
      const err = document.createElement('div'); err.className = 'db-err';
      err.textContent = e.message || 'Something went wrong.'; els.dbFeed.appendChild(err);
    }
  }
  debateRunning = false;
  debateController = null;
  els.dbStop.classList.add('hidden');
  els.dbStart.disabled = false;
  els.dbStart.textContent = 'Restart debate';
  if (transcript.length) { els.dbSave.classList.remove('hidden'); els.dbShare.classList.remove('hidden'); }
}

/* ---------- Events ---------- */
els.connect.addEventListener('click', connect);
if (els.connectLocal) els.connectLocal.addEventListener('click', connectLocal);
els.keyInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') connect(); });
els.disconnect.addEventListener('click', disconnect);
els.newChat.addEventListener('click', () => { newConversation(); closeDrawer(); });
els.newProject.addEventListener('click', () => { openProjectEditor(null); closeDrawer(); });
els.newCodebase.addEventListener('click', () => { if (sideView !== 'codebases') switchSideView('codebases'); openCodebaseModal(null); closeDrawer(); });
// On desktop the ☰ (revealed only when collapsed) re-expands the sidebar; on
// phones it opens the drawer as before.
els.menuBtn.addEventListener('click', () => { if (desktopMq.matches) toggleSidebar(); else openDrawer(); });
if (els.collapseBtn) els.collapseBtn.addEventListener('click', toggleSidebar);
els.scrim.addEventListener('click', closeDrawer);

els.debateBtn.addEventListener('click', (e) => { e.stopPropagation(); openDebate(); closeDrawer(); });
els.dbClose.addEventListener('click', closeDebate);
els.debateModal.addEventListener('click', (e) => { if (e.target === els.debateModal) closeDebate(); });
els.dbStart.addEventListener('click', runDebate);
els.dbStop.addEventListener('click', () => { if (debateController) debateController.abort(); });
els.dbSave.addEventListener('click', saveCurrentDebate);
els.dbShare.addEventListener('click', () => shareDebate(currentDebate, els.dbShare));
els.dbSavedBtn.addEventListener('click', toggleSavedPanel);
els.dbCtaStart.addEventListener('click', startOwnFromShared);
els.dbCtaCopy.addEventListener('click', () => shareDebate(currentDebate, els.dbCtaCopy));
els.dbMode.addEventListener('change', applyDebateMode);
els.dbRoles.addEventListener('change', renderSeats);
els.model.addEventListener('change', () => {
  if (!current) return;
  const v = els.model.value;
  if (v.startsWith('preset:')) {
    const p = getPreset(v.slice(7));
    if (p) applyPreset(current, p);
    return;
  }
  current.model = v;
  if (current.presetId) { delete current.presetId; if (current.messages.length) store.save(current); }
});
els.send.addEventListener('click', () => { if (streaming) { if (controller) controller.abort(); } else send(); });
els.attachBtn.addEventListener('click', () => els.fileInput.click());
els.fileInput.addEventListener('change', () => { addFiles(els.fileInput.files); els.fileInput.value = ''; });

els.snippetsBtn.addEventListener('click', (e) => { e.stopPropagation(); openSnippetsModal(); });
els.snClose.addEventListener('click', closeSnippetsModal);
els.snippetsModal.addEventListener('click', (e) => { if (e.target === els.snippetsModal) closeSnippetsModal(); });
els.snSearch.addEventListener('input', renderSnippets);
if (loadSnippets().length) els.snippetsBtn.classList.add('on');

// On phones the header is too narrow for the model picker + tool icons, so move
// the tool cluster (saved code / GitHub / scaffolds / settings) into the drawer.
const toolsMq = window.matchMedia('(max-width: 760px)');
function placeTools() {
  const tools = document.getElementById('hdrTools');
  const slot = document.getElementById('toolsSlot');
  const header = document.querySelector('header');
  if (!tools || !slot || !header) return;
  if (toolsMq.matches) { slot.appendChild(tools); tools.classList.add('in-sidebar'); }
  else { header.appendChild(tools); tools.classList.remove('in-sidebar'); }
}
toolsMq.addEventListener('change', placeTools);
placeTools();

els.githubBtn.addEventListener('click', (e) => { e.stopPropagation(); openGithubModal(); });
els.ghClose.addEventListener('click', closeGithubModal);
els.githubModal.addEventListener('click', (e) => { if (e.target === els.githubModal) closeGithubModal(); });
els.ghConnect.addEventListener('click', connectGithub);
els.ghToken.addEventListener('keydown', (e) => { if (e.key === 'Enter') connectGithub(); });
els.ghDisconnect.addEventListener('click', disconnectGithub);
els.ghRepoSearch.addEventListener('input', renderGhRepos);
els.ghRepoGo.addEventListener('click', ghRepoGoManual);
els.ghRepoSearch.addEventListener('keydown', (e) => { if (e.key === 'Enter') ghRepoGoManual(); });
els.ghBranch.addEventListener('change', () => loadGhTree(els.ghBranch.value));
els.ghFileSearch.addEventListener('input', () => renderGhFiles(false));
els.ghAttach.addEventListener('click', ghAttachSelected);
updateGithubBtn();
els.input.addEventListener('input', autosize);
els.input.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey && !streaming) { e.preventDefault(); send(); } });
// Escape closes whichever modal is open (same as its ✕ / backdrop click).
document.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape') return;
  const open = [...document.querySelectorAll('.modal:not(.hidden)')].pop();
  if (open) open.classList.add('hidden');
});
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
els.visualsToggle.addEventListener('change', () => { try { localStorage.setItem(VISUALS_KEY, els.visualsToggle.checked ? '1' : '0'); } catch (e) {} });
els.toolsToggle.addEventListener('change', () => { const c = toolsConfig(); c.enabled = els.toolsToggle.checked; setToolsConfig(c); renderToolList(); });
els.mcpAdd.addEventListener('click', async () => {
  els.mcpErr.textContent = '';
  let url;
  try { url = new URL(els.mcpUrl.value.trim()); } catch (e) { els.mcpErr.textContent = 'Enter a full URL, e.g. https://example.com/mcp'; return; }
  if (!/^https?:$/.test(url.protocol)) { els.mcpErr.textContent = 'Only http(s) URLs are supported.'; return; }
  const server = { id: uidS(), label: '', url: url.toString(), token: els.mcpToken.value.trim(), enabled: true, tools: [], disabledTools: {} };
  const all = loadMcpServers(); all.push(server);
  if (!saveMcpServers(all)) { els.mcpErr.textContent = 'Couldn’t save — this browser’s storage is full.'; return; }
  els.mcpAdd.disabled = true; els.mcpAdd.textContent = 'Connecting…';
  try {
    await mcpConnect(server);
    els.mcpUrl.value = ''; els.mcpToken.value = '';
  } catch (e) {
    els.mcpErr.textContent = (mcpStatus[server.id] || '').replace(/^error: /, '') || 'Connection failed.';
  } finally {
    els.mcpAdd.disabled = false; els.mcpAdd.textContent = 'Connect';
    renderToolList();
  }
});

els.manageModelsBtn.addEventListener('click', (e) => { e.stopPropagation(); closeSettings(); openModelModal(); });
els.mmClose.addEventListener('click', closeModelModal);
els.mmPresetNew.addEventListener('click', () => openPresetBuilder(null));
els.pmSave.addEventListener('click', savePresetBuilder);
els.pmCancel.addEventListener('click', () => closePresetBuilder(true));
els.pmClose.addEventListener('click', () => closePresetBuilder(true));
els.presetModal.addEventListener('click', (e) => { if (e.target === els.presetModal) closePresetBuilder(true); });
els.modelModal.addEventListener('click', (e) => { if (e.target === els.modelModal) closeModelModal(); });
els.mmAdd.addEventListener('click', () => { addModel(els.mmInput.value); els.mmInput.value = ''; });
els.mmInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') { addModel(els.mmInput.value); els.mmInput.value = ''; } });
els.mmSearch.addEventListener('input', renderCatalog);

els.scaffoldBtn.addEventListener('click', (e) => { e.stopPropagation(); openScaffoldModal(); });
els.scClose.addEventListener('click', closeScaffoldModal);
els.scaffoldModal.addEventListener('click', (e) => { if (e.target === els.scaffoldModal) closeScaffoldModal(); });
els.scSearch.addEventListener('input', renderScaffoldList);
els.scNew.addEventListener('click', () => openBuilder(EMPTY_DRAFT, null));
els.sbClose.addEventListener('click', () => { closeBuilder(); openScaffoldModal(); });
els.sbCancel.addEventListener('click', () => { closeBuilder(); openScaffoldModal(); });
els.scaffoldBuilder.addEventListener('click', (e) => { if (e.target === els.scaffoldBuilder) { closeBuilder(); openScaffoldModal(); } });
els.sbSave.addEventListener('click', saveBuilder);
['sbName', 'sbSummary', 'sbRole', 'sbPerspective', 'sbTone', 'sbSteps', 'sbMust', 'sbNever', 'sbDisc', 'sbProh']
  .forEach((id) => els[id].addEventListener('input', updateBuilderPreview));

els.pjClose.addEventListener('click', closeProjectEditor);
els.pjCancel.addEventListener('click', closeProjectEditor);
els.projectModal.addEventListener('click', (e) => { if (e.target === els.projectModal) closeProjectEditor(); });
els.pjSave.addEventListener('click', saveProject);
els.pjDelete.addEventListener('click', () => { if (projectEditingId && confirm('Delete this project? Its chats are kept and moved to All chats.')) deleteProject(projectEditingId); });
els.pjUpload.addEventListener('change', async () => {
  for (const file of [...els.pjUpload.files]) {
    if (file.size > 200 * 1024) { alert('“' + file.name + '” is larger than 200 KB and was skipped.'); continue; }
    let text = ''; try { text = await file.text(); } catch (e) { continue; }
    projectDraft.files.push({ id: uidS(), name: file.name, content: text });
  }
  els.pjUpload.value = ''; renderProjectFiles();
});
els.pjPasteAdd.addEventListener('click', () => {
  const content = els.pjPaste.value; if (!content.trim()) return;
  if (content.length > 200 * 1024) { alert('Pasted text is larger than 200 KB — trim it down first (it gets injected into every prompt).'); return; }
  const name = els.pjPasteName.value.trim() || ('note-' + (projectDraft.files.length + 1) + '.txt');
  projectDraft.files.push({ id: uidS(), name, content });
  els.pjPaste.value = ''; els.pjPasteName.value = ''; renderProjectFiles();
});

/* ---------- Boot ---------- */
/* ========================= Codebases =========================
   A VS Code / GitHub-like workspace: chat with two coder models
   (Builder + Reviewer) to build a multi-file codebase, edit files by
   hand, and save/export. Files + build chat live in their own
   localStorage record (separate from conversations). */

const CB_INDEX = 'mt_codebases';
const CB_FILE_CAP = 200 * 1024;       // per-file byte cap (matches projects)
const CB_TOTAL_CAP = 2 * 1024 * 1024; // soft per-codebase ceiling
const CB_MAX_FILES = 300;

let currentCb = null;          // loaded codebase record (analog of `current`)
let cbActivePath = null;       // path of the file open in the editor
let cbEditTimer = null;        // debounce for hand-edits
let cbController = null;        // AbortController for an in-flight build
let cbBuilding = false;
let cbEditingId = null;        // codebase id being edited in the modal
let cbReadOnly = false;        // true when viewing a shared codebase (/c/<id>)
let cbCollapsed = new Set();   // collapsed folder paths (e.g. "src/util/")

const cbStore = {
  body: (id) => 'mt_codebase_' + id,
  _get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
  list() { return this._get(CB_INDEX, []); },
  load(id) { return this._get(this.body(id), null); },
  save(cb) {
    cb.updatedAt = Date.now();
    try { localStorage.setItem(this.body(cb.id), JSON.stringify(cb)); }
    catch (e) { toast('Storage full — export to ZIP or remove files to save.'); return false; }
    const idx = this.list().filter((c) => c.id !== cb.id);
    idx.unshift({ id: cb.id, name: cb.name, updatedAt: cb.updatedAt, fileCount: cb.files.length, models: cb.models });
    idx.sort((a, b) => b.updatedAt - a.updatedAt);
    try { localStorage.setItem(CB_INDEX, JSON.stringify(idx)); } catch (e) {}
    return true;
  },
  remove(id) {
    try { localStorage.removeItem(this.body(id)); } catch (e) {}
    try { localStorage.setItem(CB_INDEX, JSON.stringify(this.list().filter((c) => c.id !== id))); } catch (e) {}
  },
};
function loadCodebases() { return cbStore.list(); }
function getCodebase(id) { return cbStore.load(id); }
function cbTotalBytes(cb) { let n = 0; for (const f of (cb.files || [])) n += fileBytes(f.content); return n; }

// Pick sensible default models from the user's curated list.
function cbDefaultModels() {
  const list = debateModelList();
  const pick = (re) => list.find((m) => re.test(m));
  const builder = pick(/qwen.*coder/i) || pick(/coder/i) || list[0] || '';
  const reviewer = pick(/kimi/i) || list.find((m) => m !== builder) || builder;
  return { builder, reviewer };
}

// System message describing the codebase to the models (file list always;
// bodies only up to a budget so we never blow the context window).
function compileCodebaseContext(cb) {
  const parts = ['## Codebase: ' + (cb.name || 'Untitled')];
  const listing = (cb.files || []).map((f) => '- ' + f.path + ' (' + fmtBytes(fileBytes(f.content)) + ')').join('\n') || '(empty — no files yet)';
  parts.push('### Files\n' + listing);
  let budget = 40 * 1024;
  const ordered = [...(cb.files || [])].sort((a, b) => (a.path === cbActivePath ? -1 : b.path === cbActivePath ? 1 : (b.updatedAt || 0) - (a.updatedAt || 0)));
  const bodies = [];
  for (const f of ordered) { const sz = fileBytes(f.content); if (sz > budget) continue; bodies.push('#### ' + f.path + '\n```\n' + f.content + '\n```'); budget -= sz; }
  if (bodies.length) parts.push('### Current file contents\n' + bodies.join('\n\n'));
  parts.push('Use read_file to inspect any file not shown in full above. Make changes ONLY through the file tools.');
  return parts.join('\n\n');
}

/* ---- file-mutation tools (separate registry; bound to currentCb) ---- */
function cbNormPath(p) {
  p = String(p || '').trim().replace(/\\/g, '/').replace(/^\/+/, '').replace(/\/{2,}/g, '/');
  if (!p) return { err: 'path is empty' };
  if (p.length > 255) return { err: 'path too long (max 255)' };
  if (/\0/.test(p)) return { err: 'invalid character in path' };
  if (p.split('/').some((s) => s === '' || s === '.' || s === '..')) return { err: "path may not contain '.' or '..' segments" };
  return { path: p };
}
function cbGetFile(path) { return (currentCb && currentCb.files.find((f) => f.path === path)) || null; }
function cbAfterMutation() { cbStore.save(currentCb); cbRenderTree(); renderSidebar(); }

function cbToolWrite(path, content) {
  if (!currentCb) return 'Error: no codebase open';
  const n = cbNormPath(path); if (n.err) return 'Error: ' + n.err;
  content = String(content == null ? '' : content);
  if (content.length > CB_FILE_CAP) return 'Error: file exceeds the 200KB cap';
  let f = cbGetFile(n.path); const existed = !!f;
  if (!existed && currentCb.files.length >= CB_MAX_FILES) return 'Error: too many files (max ' + CB_MAX_FILES + ')';
  if (f) { f.content = content; f.updatedAt = Date.now(); } else { currentCb.files.push({ path: n.path, content, updatedAt: Date.now() }); }
  cbAfterMutation();
  if (cbActivePath === n.path) cbRefreshEditor();
  return 'ok: ' + (existed ? 'overwrote ' : 'wrote ') + n.path + ' (' + content.length + ' bytes)';
}
function cbToolRead(path) {
  if (!currentCb) return 'Error: no codebase open';
  const n = cbNormPath(path); if (n.err) return 'Error: ' + n.err;
  const f = cbGetFile(n.path); if (!f) return 'Error: no such file: ' + n.path;
  let c = f.content || ''; if (c.length > 50 * 1024) c = c.slice(0, 50 * 1024) + '\n…[truncated]'; return c;
}
function cbToolListFiles() {
  if (!currentCb) return 'Error: no codebase open';
  if (!currentCb.files.length) return '(no files yet)';
  return currentCb.files.map((f) => f.path + ' (' + fileBytes(f.content) + ' bytes)').join('\n');
}
function cbToolDelete(path) {
  if (!currentCb) return 'Error: no codebase open';
  const n = cbNormPath(path); if (n.err) return 'Error: ' + n.err;
  const before = currentCb.files.length;
  currentCb.files = currentCb.files.filter((f) => f.path !== n.path);
  if (currentCb.files.length === before) return 'Error: no such file: ' + n.path;
  if (cbActivePath === n.path) { cbActivePath = null; els.cbEdit.value = ''; els.cbEditPath.textContent = 'No file open'; }
  cbAfterMutation();
  return 'ok: deleted ' + n.path;
}
function cbToolRename(from, to) {
  if (!currentCb) return 'Error: no codebase open';
  const a = cbNormPath(from), b = cbNormPath(to);
  if (a.err) return 'Error: from: ' + a.err; if (b.err) return 'Error: to: ' + b.err;
  const f = cbGetFile(a.path); if (!f) return 'Error: no such file: ' + a.path;
  if (cbGetFile(b.path)) return 'Error: target already exists: ' + b.path;
  f.path = b.path; f.updatedAt = Date.now();
  if (cbActivePath === a.path) { cbActivePath = b.path; els.cbEditPath.textContent = b.path; }
  cbAfterMutation();
  return 'ok: renamed ' + a.path + ' → ' + b.path;
}

const CB_TOOL_DEFS = {
  write_file: { schema: { type: 'function', function: { name: 'write_file', description: 'Create or overwrite a file at a repo-relative path with COMPLETE contents (never partial diffs). Returns ok + byte size.', parameters: { type: 'object', properties: { path: { type: 'string', description: 'Repo-relative path, e.g. src/index.js' }, content: { type: 'string', description: 'Full file contents.' } }, required: ['path', 'content'] } } }, run: (a) => cbToolWrite(a.path, a.content) },
  read_file: { schema: { type: 'function', function: { name: 'read_file', description: 'Return the full current contents of a file.', parameters: { type: 'object', properties: { path: { type: 'string' } }, required: ['path'] } } }, run: (a) => cbToolRead(a.path) },
  list_files: { schema: { type: 'function', function: { name: 'list_files', description: 'List all file paths in the codebase with byte sizes.', parameters: { type: 'object', properties: {} } } }, run: () => cbToolListFiles() },
  delete_file: { schema: { type: 'function', function: { name: 'delete_file', description: 'Delete a file by path.', parameters: { type: 'object', properties: { path: { type: 'string' } }, required: ['path'] } } }, run: (a) => cbToolDelete(a.path) },
  rename_file: { schema: { type: 'function', function: { name: 'rename_file', description: 'Rename/move a file, preserving content.', parameters: { type: 'object', properties: { from: { type: 'string' }, to: { type: 'string' } }, required: ['from', 'to'] } } }, run: (a) => cbToolRename(a.from, a.to) },
};

/* ---- Builder + Reviewer orchestration ---- */
function cbExpandConversation(cb) {
  const out = [];
  for (const m of (cb.messages || [])) {
    if (m.role === 'user') { out.push({ role: 'user', content: m.content }); continue; }
    if (m.role !== 'assistant') continue;
    if (m.author === 'reviewer') { out.push({ role: 'user', content: 'Reviewer feedback on the previous changes:\n' + (m.content || '') }); continue; }
    if (m.toolRounds && m.toolRounds.length) {
      for (const tr of m.toolRounds) {
        out.push({ role: 'assistant', content: '', tool_calls: [{ function: { name: tr.name, arguments: tr.args || {} } }] });
        out.push({ role: 'tool', content: String(tr.result == null ? '' : tr.result) });
      }
    }
    out.push({ role: 'assistant', content: m.content || '' });
  }
  return out;
}
function cbBuilderPersona(cb) {
  return [
    'You are the Builder, a senior software engineer constructing a multi-file codebase named "' + (cb.name || 'project') + '".',
    'You make ALL file changes through the provided tools: write_file, read_file, list_files, delete_file, rename_file.',
    'Always read_file before editing an existing file unless you are creating it. Write COMPLETE, runnable file contents — never partial diffs or "// rest unchanged".',
    'Keep files focused and idiomatic; prefer small, composable files. Do not paste whole file bodies into the chat — they live in the file tree.',
    'When a Reviewer has raised concerns, address them directly in your next changes.',
    'After your tool calls, end with a 2–4 line plain-text summary of what you changed and why.',
  ].join('\n');
}
function cbReviewerPersona() {
  return [
    "You are the Reviewer, a senior engineer doing a focused code review of the Builder's latest changes. You CANNOT edit files.",
    "You are shown the Builder's summary and the files it changed this round.",
    'Flag correctness bugs, security issues, broken imports/paths, and missing pieces first; then maintainability.',
    'Be concrete and concise (under 180 words). Describe the fix — do not rewrite whole files.',
    'If the changes are sound, say so plainly (e.g. "Looks good — no blocking issues") so the Builder can stop.',
  ].join('\n');
}
function cbReviewerUserPrompt(cb, builderSummary, changedPaths) {
  const files = changedPaths.map((p) => {
    const f = cbGetFile(p); if (!f) return '#### ' + p + ' (deleted)';
    let c = f.content || ''; if (c.length > 20 * 1024) c = c.slice(0, 20 * 1024) + '\n…[truncated]';
    return '#### ' + p + '\n```\n' + c + '\n```';
  }).join('\n\n');
  return 'Builder summary:\n' + (builderSummary || '(none)') + '\n\nFiles changed this round:\n' + (files || '(none)') + '\n\nReview these changes.';
}
function cbReviewerApproves(text) {
  const t = (text || '').trim();
  if (t.length < 8) return true;
  return /\b(looks good|lgtm|no (blocking )?issues|no concerns|approved|ship it|all good)\b/i.test(t);
}

// Builder turn: streamed NDJSON + tool loop (mirrors streamAssistant, but
// parameterized by model/messages/tool-registry and not bound to `current`).
async function streamCodebaseBuild(model, messages, toolRegistry, node, signal) {
  const convo = [...messages]; const toolRounds = []; let acc = '';
  const schemas = Object.values(toolRegistry).map((t) => t.schema);
  for (let iter = 0; iter < 8; iter++) {
    const resp = await fetch(localMode ? localBase() + '/api/chat' : '/api/chat', {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...authHeader() },
      body: JSON.stringify({ model, messages: convo, tools: schemas, stream: true }),
      signal,
    });
    if (!localMode && resp.status === 401) throw new Error('Your key was rejected — please reconnect.');
    if (!resp.ok || !resp.body) { const d = await resp.text().catch(() => ''); throw new Error('Request failed (' + resp.status + ') ' + d.slice(0, 160)); }
    const reader = resp.body.getReader(); const dec = new TextDecoder(); let buf = '';
    let turnContent = '', toolCalls = [];
    while (true) {
      const { value, done } = await reader.read(); if (done) break;
      buf += dec.decode(value, { stream: true });
      const lines = buf.split('\n'); buf = lines.pop();
      for (const line of lines) {
        const t = line.trim(); if (!t) continue;
        let obj; try { obj = JSON.parse(t); } catch (e) { continue; }
        if (obj.error) throw new Error(obj.error);
        const msg = obj.message || {};
        if (msg.content) { node.clearTyping(); turnContent += msg.content; acc += msg.content; node.bubble.textContent = acc; node.bubble.classList.add('cursor'); node.scroll(); }
        if (msg.tool_calls && msg.tool_calls.length) for (const tc of msg.tool_calls) toolCalls.push(tc);
      }
    }
    buf += dec.decode();
    if (toolCalls.length) {
      node.clearTyping();
      convo.push({ role: 'assistant', content: turnContent, tool_calls: toolCalls });
      for (const tc of toolCalls) {
        if (signal.aborted) { const e = new Error('aborted'); e.name = 'AbortError'; throw e; }
        const name = tc.function && tc.function.name;
        let args = tc.function && tc.function.arguments;
        if (typeof args === 'string') { try { args = JSON.parse(args); } catch (e) { args = {}; } }
        args = args || {};
        const def = toolRegistry[name];
        const ui = node.addToolCall(name || 'tool', JSON.stringify(args, null, 2));
        let result;
        if (!def) { result = 'Error: unknown tool "' + name + '"'; ui.setError(result); }
        else { try { result = await def.run(args); ui.setResult(result); } catch (e) { result = 'Error: ' + (e.message || e); ui.setError(result); } }
        result = (typeof result === 'string') ? result : JSON.stringify(result);
        toolRounds.push({ name, args, result });
        convo.push({ role: 'tool', content: result });
      }
      if (signal.aborted) { const e = new Error('aborted'); e.name = 'AbortError'; throw e; }
      continue;
    }
    break;
  }
  node.bubble.classList.remove('cursor');
  if (acc) { renderAssistantHTML(node.bubble, acc); node.bubble.dataset.raw = acc; } else if (!node.bubble.textContent) node.bubble.textContent = '(no changes)';
  return { content: acc, toolRounds };
}

async function cbRunBuild(text) {
  if (cbBuilding || !currentCb) return;
  text = String(text || '').trim(); if (!text) return;
  cbShowErr('');
  currentCb.messages.push({ role: 'user', content: text });
  cbAddMsg('user', null).finalize(text);
  cbStore.save(currentCb);
  cbBuilding = true; cbController = new AbortController();
  els.cbStop.classList.remove('hidden'); els.cbSend.disabled = true;
  const bm = (currentCb.models && currentCb.models.builder) || '';
  const rm = (currentCb.models && currentCb.models.reviewer) || '';
  const reviewerEnabled = currentCb.reviewerEnabled !== false && !!rm;
  const rounds = Math.max(1, Math.min(4, parseInt(currentCb.rounds, 10) || 2));
  try {
    for (let r = 0; r < rounds; r++) {
      cbSetStatus('Builder working… (round ' + (r + 1) + '/' + rounds + ')');
      const bnode = cbAddMsg('builder', bm);
      const messages = [{ role: 'system', content: cbBuilderPersona(currentCb) }, { role: 'system', content: compileCodebaseContext(currentCb) }, ...cbExpandConversation(currentCb)];
      const out = await streamCodebaseBuild(bm, messages, CB_TOOL_DEFS, bnode, cbController.signal);
      currentCb.messages.push({ role: 'assistant', author: 'builder', content: out.content, toolRounds: out.toolRounds.length ? out.toolRounds : undefined });
      cbStore.save(currentCb);
      if (!reviewerEnabled || cbController.signal.aborted) break;
      const changed = [...new Set(out.toolRounds.filter((t) => ['write_file', 'rename_file', 'delete_file'].includes(t.name)).map((t) => (t.args && (t.args.to || t.args.path)) || '').filter(Boolean))];
      cbSetStatus('Reviewer reviewing…');
      const rnode = cbAddMsg('reviewer', rm);
      const critique = await streamDebateTurn(rm, cbReviewerPersona(), cbReviewerUserPrompt(currentCb, out.content, changed), rnode, cbController.signal);
      currentCb.messages.push({ role: 'assistant', author: 'reviewer', content: critique });
      cbStore.save(currentCb);
      if (cbReviewerApproves(critique)) break;
    }
  } catch (e) {
    if (e.name !== 'AbortError') cbShowErr(e.message || 'Build failed.');
  }
  cbBuilding = false; cbController = null;
  els.cbStop.classList.add('hidden'); els.cbSend.disabled = false;
  cbSetStatus(''); renderSidebar();
}

/* ---- workspace UI ---- */
function applyPaneVisibility() {
  const showCb = sideView === 'codebases' && (!!activeCodebaseId || cbReadOnly);
  if (els.codebasePane) els.codebasePane.classList.toggle('hidden', !showCb);
  if (els.chatPane) els.chatPane.classList.toggle('hidden', showCb);
}
function cbSetStatus(t) { if (els.cbStatus) els.cbStatus.textContent = t || ''; }
function cbShowErr(t) { if (!els.cbErr) return; els.cbErr.textContent = t || ''; els.cbErr.style.display = t ? 'block' : 'none'; }

function openCodebase(id) {
  const cb = getCodebase(id); if (!cb) return;
  cbReadOnly = false; cbCollapsed = new Set();
  activeCodebaseId = id; try { localStorage.setItem('mt_active_codebase', id); } catch (e) {}
  currentCb = cb; cbActivePath = null;
  renderCbWorkspace(); renderSidebar(); applyPaneVisibility(); closeDrawer();
}
function closeCodebase() {
  activeCodebaseId = null; currentCb = null; cbReadOnly = false; try { localStorage.removeItem('mt_active_codebase'); } catch (e) {}
  renderSidebar(); applyPaneVisibility();
}
function renderCbWorkspace() {
  if (!currentCb) return;
  els.cbName.value = currentCb.name || 'Untitled codebase';
  const m = currentCb.models || {};
  const badge = (model, color) => '<span class="cb-badge"><i style="background:' + color + '"></i>' + escapeHtml(model || '?') + '</span>';
  els.cbModels.innerHTML = badge(m.builder, 'var(--accent)') + (currentCb.reviewerEnabled !== false ? badge(m.reviewer, 'var(--accent-2)') : '<span class="cb-badge">solo</span>');
  cbRenderTree(); cbRenderChat();
  if (currentCb.files.length) openCbFile(currentCb.files[0].path);
  else { cbActivePath = null; els.cbEdit.value = ''; els.cbEditPath.textContent = 'No file open'; }
  cbShowErr(''); cbSetStatus('');
  els.codebasePane.classList.toggle('cb-readonly', !!cbReadOnly);
  els.cbEdit.readOnly = !!cbReadOnly;
  if (cbReadOnly) {
    const banner = document.createElement('div'); banner.className = 'cb-readonly-banner';
    const txt = document.createElement('span'); txt.textContent = 'Viewing a shared codebase (read-only).';
    const imp = document.createElement('button'); imp.className = 'cb-btn'; imp.type = 'button'; imp.textContent = 'Import a copy'; imp.addEventListener('click', cbImportShared);
    const dl = document.createElement('button'); dl.className = 'cb-btn'; dl.type = 'button'; dl.textContent = 'Download ZIP'; dl.addEventListener('click', () => cbDownloadZip(currentCb));
    banner.append(txt, imp, dl); els.cbThread.prepend(banner);
  }
}
const CB_FILE_SVG = '<svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path d="M9.2 1.5H4.5A1.5 1.5 0 0 0 3 3v10a1.5 1.5 0 0 0 1.5 1.5h7A1.5 1.5 0 0 0 13 13V5.3L9.2 1.5zM9 2.9 11.6 5.5H9.5A.5.5 0 0 1 9 5V2.9z"/></svg>';
const CB_DIR_SVG = '<svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path d="M1.75 3A1.75 1.75 0 0 0 0 4.75v6.5C0 12.22.78 13 1.75 13h12.5A1.75 1.75 0 0 0 16 11.25v-5A1.75 1.75 0 0 0 14.25 4.5H7.8L6.6 3.3A1.75 1.75 0 0 0 5.36 2.85H1.75z"/></svg>';
function cbFileColor(name) {
  const ext = (name.split('.').pop() || '').toLowerCase();
  const m = { js: '#e8c34a', mjs: '#e8c34a', cjs: '#e8c34a', jsx: '#61dafb', ts: '#3aa0ff', tsx: '#3aa0ff', json: '#d6b04a', md: '#7aa7d6', markdown: '#7aa7d6', css: '#8b6fe6', scss: '#cf6f9b', html: '#e8804d', htm: '#e8804d', py: '#5a9fd4', go: '#42c9d8', rs: '#d8a06a', rb: '#e0584f', java: '#d68a3a', c: '#7aa7d6', h: '#7aa7d6', cpp: '#6f9ee0', cc: '#6f9ee0', cs: '#7a9f5a', php: '#8a8ad6', sh: '#8fd05a', bash: '#8fd05a', sql: '#e0a84a', toml: '#b0764a', yml: '#d65a5a', yaml: '#d65a5a', xml: '#9a9a9a', txt: '#9a9a9a', svg: '#e8804d' };
  return m[ext] || 'var(--text-tertiary)';
}
function cbIconEl(svg, color) { const s = document.createElement('span'); s.className = 'cb-ficon'; s.innerHTML = svg; s.style.color = color; return s; }
function cbGuides(row, depth) { for (let i = 0; i < depth; i++) { const g = document.createElement('span'); g.className = 'cb-guide'; row.appendChild(g); } }
function cbRenderTree() {
  els.cbTree.innerHTML = '';
  if (!currentCb || !currentCb.files.length) { els.cbTree.innerHTML = '<div class="cb-tree-empty">No files yet</div>'; return; }
  const root = { dirs: {}, files: [] };
  for (const f of currentCb.files) {
    const parts = f.path.split('/'); let node = root;
    for (let i = 0; i < parts.length - 1; i++) { const d = parts[i]; node.dirs[d] = node.dirs[d] || { dirs: {}, files: [] }; node = node.dirs[d]; }
    node.files.push(f);
  }
  (function walk(node, depth, prefix) {
    for (const d of Object.keys(node.dirs).sort()) {
      const full = prefix + d + '/';
      const collapsed = cbCollapsed.has(full);
      const row = document.createElement('div'); row.className = 'cb-tree-row cb-tree-dir';
      cbGuides(row, depth);
      const chev = document.createElement('span'); chev.className = 'cb-chevron' + (collapsed ? '' : ' open'); chev.textContent = '▸'; row.appendChild(chev);
      row.appendChild(cbIconEl(CB_DIR_SVG, 'var(--text-tertiary)'));
      const nm = document.createElement('span'); nm.className = 'cb-tree-name'; nm.textContent = d; row.appendChild(nm);
      row.addEventListener('click', () => cbToggleFolder(full));
      els.cbTree.appendChild(row);
      if (!collapsed) walk(node.dirs[d], depth + 1, full);
    }
    for (const f of node.files.sort((a, b) => a.path.localeCompare(b.path))) {
      const base = f.path.split('/').pop();
      const row = document.createElement('div'); row.className = 'cb-tree-row cb-tree-file' + (f.path === cbActivePath ? ' active' : '');
      cbGuides(row, depth);
      const pad = document.createElement('span'); pad.className = 'cb-chevron'; pad.style.visibility = 'hidden'; pad.textContent = '▸'; row.appendChild(pad);
      row.appendChild(cbIconEl(CB_FILE_SVG, cbFileColor(base)));
      const nm = document.createElement('span'); nm.className = 'cb-tree-name'; nm.textContent = base;
      const x = document.createElement('button'); x.className = 'cb-tree-x'; x.type = 'button'; x.textContent = '✕'; x.title = 'Delete';
      x.addEventListener('click', (e) => { e.stopPropagation(); if (confirm('Delete ' + f.path + '?')) cbToolDelete(f.path); });
      row.append(nm, x); row.addEventListener('click', () => openCbFile(f.path)); els.cbTree.appendChild(row);
    }
  })(root, 0, '');
}
function cbToggleFolder(full) { if (cbCollapsed.has(full)) cbCollapsed.delete(full); else cbCollapsed.add(full); cbRenderTree(); }
function openCbFile(path) {
  // Make sure the file is visible: expand all its ancestor folders.
  const parts = path.split('/'); let pre = '';
  for (let i = 0; i < parts.length - 1; i++) { pre += parts[i] + '/'; cbCollapsed.delete(pre); }
  cbActivePath = path; const f = cbGetFile(path);
  els.cbEdit.value = f ? f.content : ''; els.cbEditPath.textContent = path; els.cbEdit.disabled = false; cbRenderTree();
}
function cbRefreshEditor() { if (!cbActivePath) return; const f = cbGetFile(cbActivePath); if (f && document.activeElement !== els.cbEdit) els.cbEdit.value = f.content; }
function cbNewFile() {
  if (!currentCb) return;
  const p = prompt('New file path', 'untitled.txt'); if (!p) return;
  const r = cbToolWrite(p, ''); if (r.indexOf('Error') === 0) { alert(r); return; }
  const n = cbNormPath(p); openCbFile(n.path);
}
function cbAddMsg(author, model) {
  const wrap = document.createElement('div'); wrap.className = 'cb-msg cb-msg-' + author;
  const head = document.createElement('div'); head.className = 'cb-msg-head';
  head.textContent = (author === 'builder' ? 'Builder' : author === 'reviewer' ? 'Reviewer' : 'You') + (model ? ' · ' + model : '');
  const col = document.createElement('div'); col.className = 'cb-msg-col';
  const bubble = document.createElement('div'); bubble.className = 'bubble plain';
  const typing = document.createElement('span'); typing.className = 'typing'; typing.innerHTML = '<span></span><span></span><span></span>';
  bubble.appendChild(typing); col.appendChild(bubble);
  wrap.append(head, col); els.cbThread.appendChild(wrap);
  const scroll = () => { els.cbThread.scrollTop = els.cbThread.scrollHeight; };
  scroll();
  let started = false;
  return {
    bubble, scroll,
    clearTyping() { if (typing.parentElement) typing.remove(); },
    setText(t) { if (!started) { started = true; if (typing.parentElement) typing.remove(); } bubble.textContent = t; scroll(); },
    addToolCall(name, argsText) {
      const el = document.createElement('details'); el.className = 'toolcall';
      const sum = document.createElement('summary'); sum.innerHTML = '🔧 <span class="tc-name"></span> <span class="tc-status">running…</span>';
      sum.querySelector('.tc-name').textContent = name;
      const body = document.createElement('div'); body.className = 'tc-body';
      const ap = document.createElement('pre'); ap.className = 'tc-args'; ap.textContent = argsText;
      const rp = document.createElement('pre'); rp.className = 'tc-result';
      body.append(ap, rp); el.append(sum, body); col.insertBefore(el, bubble); scroll();
      return {
        setResult(t) { rp.textContent = t; const s = sum.querySelector('.tc-status'); s.textContent = 'done'; s.classList.add('ok'); scroll(); },
        setError(t) { rp.textContent = t; rp.classList.add('tc-err'); const s = sum.querySelector('.tc-status'); s.textContent = 'error'; s.classList.add('err'); scroll(); },
      };
    },
    finalize(t) { if (typing.parentElement) typing.remove(); if (t) { renderAssistantHTML(bubble, t); bubble.dataset.raw = t; } else if (!bubble.textContent) bubble.textContent = '…'; scroll(); },
  };
}
function cbRenderChat() {
  els.cbThread.innerHTML = '';
  for (const m of (currentCb.messages || [])) {
    if (m.role === 'user') { cbAddMsg('user', null).finalize(m.content); }
    else if (m.role === 'assistant') {
      const author = m.author || 'builder';
      const model = author === 'reviewer' ? (currentCb.models && currentCb.models.reviewer) : (currentCb.models && currentCb.models.builder);
      const n = cbAddMsg(author, model);
      if (m.toolRounds) for (const tr of m.toolRounds) { const ui = n.addToolCall(tr.name || 'tool', JSON.stringify(tr.args || {}, null, 2)); ui.setResult(String(tr.result == null ? '' : tr.result)); }
      n.finalize(m.content);
    }
  }
}
function renderCodebasesView() {
  if (cbReadOnly) { els.convList.innerHTML = '<div class="conv-empty">Viewing a shared codebase.</div>'; return; }
  if (activeCodebaseId) {
    const cb = getCodebase(activeCodebaseId);
    if (cb) {
      const back = document.createElement('button'); back.className = 'proj-back'; back.type = 'button'; back.textContent = '‹ Codebases';
      back.addEventListener('click', closeCodebase); els.convList.appendChild(back);
      const head = document.createElement('div'); head.className = 'proj-head';
      const nm = document.createElement('span'); nm.className = 'proj-head-name'; nm.textContent = cb.name;
      const ed = document.createElement('button'); ed.className = 'proj-edit'; ed.type = 'button'; ed.textContent = 'Settings ⚙';
      ed.addEventListener('click', () => openCodebaseModal(cb.id));
      head.append(nm, ed); els.convList.appendChild(head);
      const info = document.createElement('div'); info.className = 'conv-empty';
      info.textContent = cb.files.length + (cb.files.length === 1 ? ' file' : ' files') + ' · ' + fmtBytes(cbTotalBytes(cb));
      els.convList.appendChild(info);
      return;
    }
    activeCodebaseId = null;
  }
  const list = loadCodebases().sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
  if (!list.length) { els.convList.innerHTML = '<div class="conv-empty">No codebases yet. Create one with + New codebase.</div>'; return; }
  for (const c of list) {
    const row = document.createElement('div'); row.className = 'proj-row';
    const nm = document.createElement('div'); nm.className = 'proj-row-name'; nm.textContent = c.name;
    const meta = document.createElement('div'); meta.className = 'proj-row-meta'; meta.textContent = (c.fileCount || 0) + ((c.fileCount || 0) === 1 ? ' file' : ' files');
    row.append(nm, meta); row.addEventListener('click', () => { setSideView('codebases'); openCodebase(c.id); });
    els.convList.appendChild(row);
  }
}

/* ---- create / settings modal ---- */
function openCodebaseModal(id) {
  cbEditingId = id || null;
  const cb = id ? getCodebase(id) : null;
  const list = debateModelList();
  const fill = (sel, val) => {
    sel.innerHTML = '';
    for (const m of list) { const o = document.createElement('option'); o.value = m; o.textContent = m; sel.appendChild(o); }
    if (val && !list.includes(val)) { const o = document.createElement('option'); o.value = val; o.textContent = val + ' (not in your list)'; sel.appendChild(o); }
    sel.value = val || list[0] || '';
  };
  const def = cbDefaultModels();
  const models = (cb && cb.models) || def;
  fill(els.cbmBuilder, models.builder || def.builder);
  fill(els.cbmReviewer, models.reviewer || def.reviewer);
  els.cbmName.value = cb ? cb.name : '';
  els.cbmReviewerOn.checked = cb ? (cb.reviewerEnabled !== false) : true;
  els.cbmReviewer.disabled = !els.cbmReviewerOn.checked;
  els.cbmRounds.value = cb ? (cb.rounds || 2) : 2; els.cbmRoundsVal.textContent = '· ' + els.cbmRounds.value;
  els.cbmTitle.textContent = cb ? 'Codebase settings' : 'New codebase';
  els.cbmSave.textContent = cb ? 'Save' : 'Create codebase';
  els.cbmDelete.style.display = cb ? '' : 'none';
  els.codebaseModal.classList.remove('hidden');
  els.cbmName.focus();
}
function closeCodebaseModal() { els.codebaseModal.classList.add('hidden'); cbEditingId = null; }
function saveCodebaseFromModal() {
  const name = els.cbmName.value.trim() || 'Untitled codebase';
  const models = { builder: els.cbmBuilder.value, reviewer: els.cbmReviewer.value };
  const reviewerEnabled = els.cbmReviewerOn.checked;
  const rounds = Math.max(1, Math.min(4, parseInt(els.cbmRounds.value, 10) || 2));
  if (cbEditingId) {
    const cb = getCodebase(cbEditingId); if (!cb) { closeCodebaseModal(); return; }
    cb.name = name; cb.models = models; cb.reviewerEnabled = reviewerEnabled; cb.rounds = rounds;
    cbStore.save(cb);
    if (currentCb && currentCb.id === cb.id) { currentCb = cb; renderCbWorkspace(); }
    closeCodebaseModal(); renderSidebar(); return;
  }
  const now = Date.now();
  const cb = { id: uid(), name, files: [], messages: [], models, reviewerEnabled, rounds, createdAt: now, updatedAt: now };
  cbStore.save(cb); closeCodebaseModal(); setSideView('codebases'); openCodebase(cb.id);
}
function deleteCodebaseFromModal() {
  if (!cbEditingId) return;
  if (!confirm('Delete this codebase and all its files? This cannot be undone.')) return;
  const id = cbEditingId; cbStore.remove(id);
  if (activeCodebaseId === id) closeCodebase();
  closeCodebaseModal(); renderSidebar();
}

/* ---- export: ZIP (dependency-free store-only) + copy ---- */
function cbCrc32(bytes) {
  let t = cbCrc32._t;
  if (!t) { t = cbCrc32._t = []; for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1); t[n] = c >>> 0; } }
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < bytes.length; i++) crc = t[(crc ^ bytes[i]) & 0xFF] ^ (crc >>> 8);
  return (crc ^ 0xFFFFFFFF) >>> 0;
}
function cbZipBlob(cb) {
  const enc = new TextEncoder(); const parts = []; const central = []; let offset = 0;
  const num = (n, bytes) => { const b = new Uint8Array(bytes); let v = n >>> 0; for (let i = 0; i < bytes; i++) { b[i] = v & 0xff; v = Math.floor(v / 256); } return b; };
  const push = (arr) => { parts.push(arr); offset += arr.length; };
  for (const f of (cb.files || [])) {
    const name = enc.encode(f.path); const data = enc.encode(f.content || ''); const crc = cbCrc32(data); const localOffset = offset;
    push(num(0x04034b50, 4)); push(num(20, 2)); push(num(0, 2)); push(num(0, 2)); push(num(0, 2)); push(num(0, 2));
    push(num(crc, 4)); push(num(data.length, 4)); push(num(data.length, 4)); push(num(name.length, 2)); push(num(0, 2)); push(name); push(data);
    central.push({ name, crc, len: data.length, localOffset });
  }
  const cdStart = offset;
  for (const c of central) {
    push(num(0x02014b50, 4)); push(num(20, 2)); push(num(20, 2)); push(num(0, 2)); push(num(0, 2)); push(num(0, 2)); push(num(0, 2));
    push(num(c.crc, 4)); push(num(c.len, 4)); push(num(c.len, 4)); push(num(c.name.length, 2)); push(num(0, 2)); push(num(0, 2)); push(num(0, 2)); push(num(0, 2)); push(num(0, 4)); push(num(c.localOffset, 4)); push(c.name);
  }
  const cdSize = offset - cdStart;
  push(num(0x06054b50, 4)); push(num(0, 2)); push(num(0, 2)); push(num(central.length, 2)); push(num(central.length, 2)); push(num(cdSize, 4)); push(num(cdStart, 4)); push(num(0, 2));
  return new Blob(parts, { type: 'application/zip' });
}
function cbDownloadZip(cb) {
  if (!cb) return;
  if (!cb.files.length) { toast('No files to export yet.'); return; }
  const blob = cbZipBlob(cb); const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = (cb.name || 'codebase').replace(/[^\w.-]+/g, '_') + '.zip';
  document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
}
async function shareCodebase() {
  if (!currentCb) return;
  if (!currentCb.files.length) { toast('Add files before sharing.'); return; }
  toast('Creating share link…');
  try {
    const slim = { name: currentCb.name, files: currentCb.files.map((f) => ({ path: f.path, content: f.content })), models: currentCb.models };
    const resp = await fetch('/api/codebase', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(slim) });
    const d = await resp.json().catch(() => ({}));
    if (resp.ok && d.id) {
      const link = location.origin + '/c/' + d.id;
      try { await navigator.clipboard.writeText(link); toast('Share link copied: ' + link); }
      catch (e) { toast('Share link: ' + link); }
      return;
    }
    toast((resp.status === 413 ? 'Too large to share' : 'Could not create link') + ' — downloading ZIP instead.');
    cbDownloadZip(currentCb);
  } catch (e) { toast('Share failed — downloading ZIP instead.'); cbDownloadZip(currentCb); }
}
// Read-only viewer for a /c/<id> shared codebase.
async function maybeOpenSharedCodebase() {
  const m = location.pathname.match(/^\/c\/([A-Za-z0-9_-]+)$/);
  if (!m) return false;
  try {
    const resp = await fetch('/api/codebase/' + encodeURIComponent(m[1]));
    const rec = await resp.json().catch(() => null);
    try { history.replaceState(null, '', '/'); } catch (e) {}
    if (resp.ok && rec && Array.isArray(rec.files)) { openSharedCodebase(rec); return true; }
  } catch (e) {}
  return false;
}
function openSharedCodebase(rec) {
  showApp(true);
  setSideView('codebases');
  cbReadOnly = true; cbCollapsed = new Set();
  currentCb = { id: 'shared-' + Date.now(), name: rec.name || 'Shared codebase', files: (rec.files || []).map((f) => ({ path: f.path, content: f.content, updatedAt: Date.now() })), messages: [], models: rec.models || {}, reviewerEnabled: false, rounds: 2 };
  activeCodebaseId = currentCb.id; cbActivePath = null;
  renderCbWorkspace(); renderSidebar(); applyPaneVisibility();
}
function cbImportShared() {
  if (!currentCb) return;
  const now = Date.now();
  const models = (currentCb.models && currentCb.models.builder) ? currentCb.models : cbDefaultModels();
  const cb = { id: uid(), name: (currentCb.name || 'Shared codebase') + ' (copy)', files: currentCb.files.map((f) => ({ path: f.path, content: f.content, updatedAt: now })), messages: [], models, reviewerEnabled: true, rounds: 2, createdAt: now, updatedAt: now };
  if (!cbStore.save(cb)) return;
  cbReadOnly = false; setSideView('codebases'); openCodebase(cb.id); toast('Imported a copy you can edit.');
}
/* ---- export: push to GitHub (browser-direct, Git Data API) ---- */
async function ghReq(method, path, body) {
  const r = await fetch('https://api.github.com' + path, { method, headers: { ...ghHeaders(), 'content-type': 'application/json' }, body: body != null ? JSON.stringify(body) : undefined });
  if (!r.ok) { const e = new Error('GitHub ' + r.status); e.status = r.status; try { e.detail = (await r.json()).message; } catch (_) {} throw e; }
  return r.json();
}
function ghB64(str) { return btoa(unescape(encodeURIComponent(str || ''))); }
function cbghErr(t) { els.cbghGateErr.textContent = t || ''; els.cbghGateErr.style.display = t ? 'block' : 'none'; }
function cbghSetStatus(t) { els.cbghStatus.textContent = t || ''; }
function cbghToggleGate() {
  const connected = !!GH.token;
  els.cbghGate.classList.toggle('hidden', connected);
  els.cbghForm.classList.toggle('hidden', !connected);
  els.cbghUser.textContent = GH.login ? '· @' + GH.login : '';
}
function pushCodebaseToGithub() {
  if (!currentCb) return;
  if (!currentCb.files.length) { toast('Add files before pushing.'); return; }
  const slug = (currentCb.name || 'codebase').toLowerCase().replace(/[^a-z0-9._-]+/g, '-').replace(/^-+|-+$/g, '') || 'codebase';
  els.cbghRepo.value = (GH.login ? GH.login + '/' : '') + slug;
  els.cbghBranch.value = 'main';
  els.cbghMsg.value = 'Update from Mantic Think: ' + (currentCb.name || 'codebase');
  els.cbghCreate.checked = false; els.cbghForce.checked = false; els.cbghToken.value = '';
  cbghErr(''); cbghSetStatus(''); cbghToggleGate();
  els.cbGithubModal.classList.remove('hidden');
}
async function cbghConnect() {
  const tok = els.cbghToken.value.trim(); if (!tok) { cbghErr('Enter a token.'); return; }
  els.cbghConnect.disabled = true; els.cbghConnect.textContent = 'Connecting…'; GH.token = tok;
  try {
    const me = await ghApi('/user'); GH.login = me.login;
    try { localStorage.setItem('mt_github_token', tok); localStorage.setItem('mt_github_login', me.login); } catch (e) {}
    updateGithubBtn(); cbghErr(''); cbghToggleGate();
    if (els.cbghRepo.value.indexOf('/') < 0) els.cbghRepo.value = GH.login + '/' + els.cbghRepo.value;
  } catch (e) { GH.token = ''; cbghErr(e.status === 401 ? 'Token rejected.' : ('Could not connect' + (e.detail ? ': ' + e.detail : '.'))); }
  finally { els.cbghConnect.disabled = false; els.cbghConnect.textContent = 'Connect'; }
}
async function cbghPushNow() {
  if (!currentCb || !GH.token) return;
  const full = els.cbghRepo.value.trim().replace(/^\/+|\/+$/g, '');
  const m = full.match(/^([^/]+)\/([^/]+)$/); if (!m) { cbghSetStatus('Enter the repository as owner/repo.'); return; }
  const owner = m[1], repo = m[2];
  const branch = els.cbghBranch.value.trim() || 'main';
  const message = els.cbghMsg.value.trim() || 'Update from Mantic Think';
  const create = els.cbghCreate.checked, force = els.cbghForce.checked;
  els.cbghPush.disabled = true;
  try {
    cbghSetStatus('Checking repository…');
    let repoInfo = null;
    try { repoInfo = await ghApi('/repos/' + owner + '/' + repo); }
    catch (e) {
      if (e.status === 404 && create) { cbghSetStatus('Creating private repo…'); repoInfo = await ghReq('POST', '/user/repos', { name: repo, private: true, auto_init: true }); }
      else if (e.status === 404) { cbghSetStatus('Repo not found — tick "Create" to make it.'); els.cbghPush.disabled = false; return; }
      else throw e;
    }
    const defBranch = repoInfo.default_branch || 'main';
    let targetExists = true, baseSha = null;
    try { const ref = await ghApi('/repos/' + owner + '/' + repo + '/git/ref/heads/' + encodeURIComponent(branch)); baseSha = ref.object.sha; }
    catch (e) {
      if (e.status === 404) { targetExists = false; const ref = await ghApi('/repos/' + owner + '/' + repo + '/git/ref/heads/' + encodeURIComponent(defBranch)); baseSha = ref.object.sha; }
      else throw e;
    }
    const baseCommit = await ghApi('/repos/' + owner + '/' + repo + '/git/commits/' + baseSha);
    cbghSetStatus('Uploading ' + currentCb.files.length + ' files…');
    const treeItems = [];
    for (const f of currentCb.files) {
      const blob = await ghReq('POST', '/repos/' + owner + '/' + repo + '/git/blobs', { content: ghB64(f.content), encoding: 'base64' });
      treeItems.push({ path: f.path, mode: '100644', type: 'blob', sha: blob.sha });
    }
    cbghSetStatus('Creating commit…');
    const newTree = await ghReq('POST', '/repos/' + owner + '/' + repo + '/git/trees', { base_tree: baseCommit.tree.sha, tree: treeItems });
    const newCommit = await ghReq('POST', '/repos/' + owner + '/' + repo + '/git/commits', { message, tree: newTree.sha, parents: [baseSha] });
    if (targetExists) await ghReq('PATCH', '/repos/' + owner + '/' + repo + '/git/refs/heads/' + encodeURIComponent(branch), { sha: newCommit.sha, force });
    else await ghReq('POST', '/repos/' + owner + '/' + repo + '/git/refs', { ref: 'refs/heads/' + branch, sha: newCommit.sha });
    const commitUrl = (repoInfo.html_url || ('https://github.com/' + owner + '/' + repo)) + '/commit/' + newCommit.sha;
    cbghSetStatus('Pushed ✓');
    toast('Pushed to ' + owner + '/' + repo + ' @ ' + branch);
    try { window.open(commitUrl, '_blank', 'noopener'); } catch (e) {}
    setTimeout(() => els.cbGithubModal.classList.add('hidden'), 900);
  } catch (e) {
    if (e.status === 403) cbghSetStatus('Push failed (403) — your token lacks write access (needs Contents: write).');
    else if (e.status === 422) cbghSetStatus('Push rejected (422) — the branch moved. Tick "Force push" to overwrite, or pull first.');
    else cbghSetStatus('Push failed: ' + (e.detail || e.message || e));
  } finally { els.cbghPush.disabled = false; }
}
els.cbghClose.addEventListener('click', () => els.cbGithubModal.classList.add('hidden'));
els.cbghCancel.addEventListener('click', () => els.cbGithubModal.classList.add('hidden'));
els.cbGithubModal.addEventListener('click', (e) => { if (e.target === els.cbGithubModal) els.cbGithubModal.classList.add('hidden'); });
els.cbghConnect.addEventListener('click', cbghConnect);
els.cbghPush.addEventListener('click', cbghPushNow);
els.cbghDisconnect.addEventListener('click', () => { disconnectGithub(); cbghToggleGate(); });

/* ---- workspace event wiring ---- */
function cbAutosize() { els.cbInput.style.height = 'auto'; els.cbInput.style.height = Math.min(els.cbInput.scrollHeight, 160) + 'px'; }
els.cbBack.addEventListener('click', closeCodebase);
els.cbNewFile.addEventListener('click', cbNewFile);
els.cbStop.addEventListener('click', () => { if (cbController) cbController.abort(); });
els.cbSettingsBtn.addEventListener('click', () => { if (currentCb) openCodebaseModal(currentCb.id); });
els.cbSend.addEventListener('click', () => { const t = els.cbInput.value; els.cbInput.value = ''; cbAutosize(); cbRunBuild(t); });
els.cbInput.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); els.cbSend.click(); } });
els.cbInput.addEventListener('input', cbAutosize);
els.cbName.addEventListener('change', () => { if (!currentCb) return; currentCb.name = els.cbName.value.trim() || 'Untitled codebase'; cbStore.save(currentCb); renderCbWorkspace(); renderSidebar(); });
els.cbEdit.addEventListener('input', () => {
  if (!currentCb || !cbActivePath) return;
  const f = cbGetFile(cbActivePath); if (f) { f.content = els.cbEdit.value; f.updatedAt = Date.now(); }
  clearTimeout(cbEditTimer); cbEditTimer = setTimeout(() => { cbStore.save(currentCb); renderSidebar(); }, 500);
});
els.cbCopyFile.addEventListener('click', () => {
  if (!cbActivePath) return; const f = cbGetFile(cbActivePath); if (!f) return;
  navigator.clipboard.writeText(f.content || ''); els.cbCopyFile.textContent = 'Copied'; setTimeout(() => els.cbCopyFile.textContent = 'Copy', 1200);
});
els.cbExportBtn.addEventListener('click', (e) => { e.stopPropagation(); els.cbExportMenu.classList.toggle('hidden'); });
document.addEventListener('click', () => els.cbExportMenu.classList.add('hidden'));
els.cbExportMenu.addEventListener('click', (e) => {
  const b = e.target.closest('button[data-act]'); if (!b) return;
  els.cbExportMenu.classList.add('hidden');
  const act = b.dataset.act;
  if (act === 'zip') cbDownloadZip(currentCb);
  else if (act === 'copy') els.cbCopyFile.click();
  else if (act === 'share') shareCodebase();
  else if (act === 'github') pushCodebaseToGithub();
});
els.cbmClose.addEventListener('click', closeCodebaseModal);
els.cbmCancel.addEventListener('click', closeCodebaseModal);
els.codebaseModal.addEventListener('click', (e) => { if (e.target === els.codebaseModal) closeCodebaseModal(); });
els.cbmSave.addEventListener('click', saveCodebaseFromModal);
els.cbmDelete.addEventListener('click', deleteCodebaseFromModal);
els.cbmRounds.addEventListener('input', () => { els.cbmRoundsVal.textContent = '· ' + els.cbmRounds.value; });
els.cbmReviewerOn.addEventListener('change', () => { els.cbmReviewer.disabled = !els.cbmReviewerOn.checked; });

// Draggable splitters: resize the file-tree / chat columns; widths persist.
function cbApplyPaneWidths() {
  const grid = els.codebasePane.querySelector('.cb-grid'); if (!grid) return;
  const tw = localStorage.getItem('mt_cb_tree_w'); const cw = localStorage.getItem('mt_cb_chat_w');
  if (tw) grid.style.setProperty('--cb-tree-w', tw + 'px');
  if (cw) grid.style.setProperty('--cb-chat-w', cw + 'px');
}
function cbInitSplitters() {
  const grid = els.codebasePane.querySelector('.cb-grid'); if (!grid) return;
  cbApplyPaneWidths();
  grid.querySelectorAll('.cb-splitter').forEach((sp) => {
    sp.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      const which = sp.dataset.split;
      sp.classList.add('dragging');
      const rect = grid.getBoundingClientRect();
      const move = (ev) => {
        const min = 150, reserve = 420;
        if (which === 'tree') { const w = Math.max(min, Math.min(rect.width - reserve, ev.clientX - rect.left)); grid.style.setProperty('--cb-tree-w', w + 'px'); }
        else { const w = Math.max(260, Math.min(rect.width - reserve, rect.right - ev.clientX)); grid.style.setProperty('--cb-chat-w', w + 'px'); }
      };
      const up = () => {
        sp.classList.remove('dragging');
        document.removeEventListener('pointermove', move); document.removeEventListener('pointerup', up);
        try {
          const t = parseInt(grid.style.getPropertyValue('--cb-tree-w'), 10); if (t) localStorage.setItem('mt_cb_tree_w', t);
          const c = parseInt(grid.style.getPropertyValue('--cb-chat-w'), 10); if (c) localStorage.setItem('mt_cb_chat_w', c);
        } catch (e) {}
      };
      document.addEventListener('pointermove', move); document.addEventListener('pointerup', up);
    });
  });
}
cbInitSplitters();

(async function boot() {
  if (await maybeOpenSharedCodebase()) return;   // a /c/<id> link opens a read-only codebase viewer
  maybeOpenSharedDebate();   // a /#debate=… link opens the shared debate over the gate/app
  if (els.rememberKey) els.rememberKey.checked = rememberPref();
  if (localMode) {
    try {
      const names = await probeLocal();
      if (names.length) {
        setUserModels(names); populateModelSelect(); updateModeBadge(); enterApp(); return;
      }
    } catch (e) {}
    setLocalMode(false);  // local instance gone — fall back to the gate
  }
  if (apiKey) {
    const res = await validateKey(apiKey).catch(() => ({ ok: false }));
    if (res.ok) { await loadModels(); enterApp(); return; }
    clearKey(); apiKey = '';
  }
  showApp(false);
})();
