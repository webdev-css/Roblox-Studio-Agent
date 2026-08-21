"use client";

/* ============================================================================
   app/page.tsx — RDM-ENGINE
   Roblox Studio AI Builder
   --------------------------------------------------------------------------
   SYSTEMS
   1. Thinking System        -> animated multi-phase reasoning trace
   2. Searching System       -> asset/API search animation for code generation
   3. Luau-Only Engine       -> only Luau output, always answers "Roblox Studio"
   4. Intro / Landing Page   -> template composer, "Dashboard" enters main chat
   5. Custom Asset Store     -> publish + download .rbxm / .rbxmx files
   6. DataStore System       -> unified persistence layer for everything
   7. UI Mastery             -> GUI-focused prompting + UI preset launcher
   8. Copy System            -> copy replies, copy code, save .luau files
   9. Discord                -> join button across landing + dashboard
   --------------------------------------------------------------------------
   API CONTRACT UNCHANGED:
   POST /api/chat  { model, system, temperature, messages }
   ============================================================================ */

import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from "react";

/* ============================================================================
   IDENTITY / LINKS / PROMPTS
   ============================================================================ */

const DISCORD_URL = "https://discord.gg/JGvh2UZHcu";

const IDENTITY = {
  name: "RDM-ENGINE",
  tagline: "Made & developed by RDM-ENGINE",
  platform: "Roblox Studio",
  systemBase:
    "You are RDM-ENGINE, an advanced Roblox Studio development AI. " +
    "You were made and developed by RDM-ENGINE. Be precise, practical and helpful.",
};

/* The hard rules that are ALWAYS sent, no matter what the user's adjuster says. */
const LUAU_CORE_PROMPT = `
=== RDM-ENGINE CORE DIRECTIVES (NON-NEGOTIABLE) ===

IDENTITY
- You are RDM-ENGINE, made and developed by RDM-ENGINE.
- You are a specialist Roblox Studio engineer.

PLATFORM ANSWER RULE
- If the user asks what the code/project/script is made for, what it is used in,
  what platform/engine/program it targets, or "where do I put this" —
  the answer is ALWAYS exactly: "Roblox Studio".
- Never say the code is for Unity, Unreal, Godot, web, desktop, mobile native,
  or any other engine. It is always Roblox Studio.

LANGUAGE RULE (STRICT)
- You ONLY write Luau (Roblox Lua). Never output Python, JavaScript, TypeScript,
  C#, C++, Java, HTML, CSS, PHP, Rust, Go or any other programming language.
- Every code block must be tagged as \`\`\`luau.
- If a user asks for another language, politely explain that RDM-ENGINE builds
  exclusively for Roblox Studio in Luau, then deliver the Luau equivalent.
- Non-code answers (explanations, plans, steps) are normal prose — that is fine.

CODE QUALITY RULES
- Always state where the script goes (ServerScriptService, StarterPlayerScripts,
  StarterGui, ReplicatedStorage, a specific part, etc.) directly above the code.
- Always state the script class: Script, LocalScript, or ModuleScript.
- Use modern Roblox APIs: task.wait / task.spawn / task.delay (never wait(),
  spawn(), delay()), :GetService(), :WaitForChild(), TweenService,
  RemoteEvent/RemoteFunction, Players.PlayerAdded, CollectionService,
  ProfileService-style patterns for saving.
- Never use deprecated members (BodyVelocity, wait(), LoadLibrary, etc.).
- Always type-guard remote arguments on the server. Never trust the client.
- Add short, useful comments. No filler comments.

DATA PERSISTENCE RULES
- When persistence is needed, use DataStoreService with:
  pcall wrapping, UpdateAsync where correct, session locking notes,
  BindToClose saving, retry with backoff, and a clear default data template.

UI / GUI RULES (you are excellent at UI)
- When asked for UI, build complete, polished ScreenGuis in Luau.
- Use UICorner, UIStroke, UIPadding, UIListLayout, UIGridLayout, UIAspectRatioConstraint,
  UIScale and Scale-based UDim2 values so the GUI is responsive on phone, tablet and PC.
- Include hover/press states, TweenService transitions, and sensible ZIndex.
- Prefer building UI in code unless the user asks for a manual Explorer layout.

FORMAT
- Short plan first (2-5 lines), then the Luau code, then a brief "How to use" note.
- Keep it clean and readable. Never dump unexplained walls of code.
`.trim();

/* ============================================================================
   MODELS
   ============================================================================ */

const MODELS = [
  {
    id: "rdm-2.1-common",
    label: "RDM 2.1 COMMON",
    desc: "Fast and reliable",
    pro: false,
  },
  {
    id: "rdm-2.2-common",
    label: "RDM 2.2 COMMON",
    desc: "Super Fast & Depth Thinking",
    pro: false,
  },
  {
    id: "rdm-2.3-pro",
    label: "RDM 2.3 PRO",
    desc: "Super Deep Thinking, Codes Faster",
    pro: false,
  },
  {
    id: "rdm-2.4-xor",
    label: "RDM 2.4 XOR",
    desc: "Ultra Thinking, Codes Ultra Fast, Good At GUIs",
    pro: true,
  },
];

const DEFAULT_SETTINGS = {
  theme: "midnight",
  rainbow: true,
  sound: true,
  animations: true,
  systemPrompt: IDENTITY.systemBase,
  temperature: 0.7,
  model: "rdm-2.1-common",
  thinkingSpeed: "normal" as "fast" | "normal" | "deep",
  showTrace: true,
};

const ASSET_CATEGORIES = [
  "Models",
  "Systems",
  "GUI Kits",
  "Weapons",
  "Vehicles",
  "Maps",
  "NPCs",
  "VFX",
  "Tools",
  "Other",
];

const MAX_ASSET_BYTES = 900_000; // ~0.9 MB raw -> ~1.2 MB base64

/* ============================================================================
   6. DATASTORE SYSTEM
   ============================================================================ */

type Listener<T> = (value: T) => void;

const DS_REGISTRY = new Map<string, DataStore<any>>();
let DS_TAB_LISTENER_BOUND = false;

function deepClone<T>(v: T): T {
  try {
    return JSON.parse(JSON.stringify(v));
  } catch {
    return v;
  }
}

class DataStore<T> {
  key: string;
  def: T;
  mergeDefaults: boolean;
  private cache!: T;
  private loaded = false;
  private subs = new Set<Listener<T>>();

  constructor(key: string, def: T, mergeDefaults = false) {
    this.key = key;
    this.def = def;
    this.mergeDefaults = mergeDefaults;
    DS_REGISTRY.set(key, this);
    this.bindTabSync();
  }

  private bindTabSync() {
    if (typeof window === "undefined" || DS_TAB_LISTENER_BOUND) return;
    DS_TAB_LISTENER_BOUND = true;
    window.addEventListener("storage", (e) => {
      if (!e.key) return;
      const ds = DS_REGISTRY.get(e.key);
      if (!ds) return;
      ds.invalidate();
      ds.emit(ds.read());
    });
  }

  invalidate() {
    this.loaded = false;
  }

  emit(v: T) {
    this.subs.forEach((fn) => {
      try {
        fn(v);
      } catch {}
    });
  }

  read(): T {
    if (typeof window === "undefined") return this.def;
    if (this.loaded) return this.cache;
    try {
      const raw = localStorage.getItem(this.key);
      let val: any = raw === null ? deepClone(this.def) : JSON.parse(raw);
      if (
        this.mergeDefaults &&
        val &&
        typeof val === "object" &&
        !Array.isArray(val)
      ) {
        val = { ...(this.def as any), ...val };
      }
      this.cache = val;
    } catch {
      this.cache = deepClone(this.def);
    }
    this.loaded = true;
    return this.cache;
  }

  write(next: T | ((prev: T) => T)): boolean {
    const value =
      typeof next === "function" ? (next as any)(this.read()) : next;
    this.cache = value;
    this.loaded = true;
    let ok = true;
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(this.key, JSON.stringify(value));
      } catch {
        ok = false;
      }
    }
    this.emit(value);
    return ok;
  }

  clear() {
    this.cache = deepClone(this.def);
    this.loaded = true;
    try {
      localStorage.removeItem(this.key);
    } catch {}
    this.emit(this.cache);
  }

  subscribe(fn: Listener<T>) {
    this.subs.add(fn);
    return () => {
      this.subs.delete(fn);
    };
  }

  bytes(): number {
    try {
      return (localStorage.getItem(this.key) || "").length;
    } catch {
      return 0;
    }
  }
}

const DS = {
  users: new DataStore<Record<string, any>>("rdm.ds.users.v2", {}),
  session: new DataStore<any>("rdm.ds.session.v2", null),
  chats: new DataStore<any[]>("rdm.ds.chats.v2", []),
  activeChat: new DataStore<string | null>("rdm.ds.activeChat.v2", null),
  settings: new DataStore("rdm.ds.settings.v2", DEFAULT_SETTINGS, true),
  assets: new DataStore<any[]>("rdm.ds.assets.v2", []),
  drafts: new DataStore<Record<string, string>>("rdm.ds.drafts.v2", {}),
  handoff: new DataStore<string>("rdm.ds.handoff.v2", ""),
  stats: new DataStore(
    "rdm.ds.stats.v2",
    { messages: 0, scripts: 0, downloads: 0, publishes: 0, copies: 0 },
    true
  ),
};

function useDataStore<T>(ds: DataStore<T>): [T, (v: T | ((p: T) => T)) => void] {
  const [value, setValue] = useState<T>(() => ds.def);

  useEffect(() => {
    setValue(ds.read());
    return ds.subscribe(setValue);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const set = useCallback(
    (v: T | ((p: T) => T)) => {
      ds.write(v);
    },
    [ds]
  );

  return [value, set];
}

function dataStoreUsage() {
  let total = 0;
  const rows: { key: string; kb: number }[] = [];
  DS_REGISTRY.forEach((ds, key) => {
    const b = ds.bytes();
    total += b;
    rows.push({
      key: key.replace("rdm.ds.", "").replace(".v2", ""),
      kb: b / 1024,
    });
  });
  return { rows: rows.sort((a, b) => b.kb - a.kb), totalKb: total / 1024 };
}

function exportAllData() {
  const dump: Record<string, any> = {};
  DS_REGISTRY.forEach((ds, key) => {
    dump[key] = ds.read();
  });
  const blob = new Blob([JSON.stringify(dump, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "rdm-engine-datastore.json";
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

function importAllData(file: File, done: (ok: boolean) => void) {
  const r = new FileReader();
  r.onload = () => {
    try {
      const parsed = JSON.parse(String(r.result));
      Object.keys(parsed).forEach((k) => {
        const ds = DS_REGISTRY.get(k);
        if (ds) ds.write(parsed[k]);
      });
      done(true);
    } catch {
      done(false);
    }
  };
  r.readAsText(file);
}

/* ============================================================================
   8. COPY SYSTEM — works even without the async clipboard API
   ============================================================================ */

function copyToClipboard(text: string): Promise<boolean> {
  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
    return navigator.clipboard
      .writeText(text)
      .then(() => true)
      .catch(() => legacyCopy(text));
  }
  return Promise.resolve(legacyCopy(text));
}

function legacyCopy(text: string): boolean {
  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.top = "-1000px";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    ta.setSelectionRange(0, ta.value.length);
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}

/* ============================================================================
   PASSWORD HASHING
   ============================================================================ */

async function hashPassword(password: string, salt: string) {
  const enc = new TextEncoder();
  const data = enc.encode(`${salt}::${password}`);
  if (typeof window !== "undefined" && window.crypto?.subtle) {
    const buf = await window.crypto.subtle.digest("SHA-256", data);
    return Array.from(new Uint8Array(buf))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  }
  let h = 0;
  const s = `${salt}::${password}`;
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return String(h >>> 0);
}

function makeSalt() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function uid() {
  try {
    return crypto.randomUUID();
  } catch {
    return "id-" + Math.random().toString(36).slice(2) + Date.now().toString(36);
  }
}

/* ============================================================================
   MARKDOWN + LUAU CODE BLOCKS
   ============================================================================ */

const CODE_BANK = new Map<string, { code: string; lang: string }>();

function escapeHtml(str: string) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function normaliseLang(lang: string) {
  const l = (lang || "").toLowerCase().trim();
  if (!l || l === "lua" || l === "luau" || l === "roblox" || l === "rbx")
    return "luau";
  return l;
}

function renderMarkdown(md: string) {
  if (!md) return "";
  const blocks: string[] = [];

  let text = md.replace(/```(\w*)\n?([\s\S]*?)```/g, (_m, lang, code) => {
    const clean = String(code).replace(/\n$/, "");
    const language = normaliseLang(lang);
    const id = uid();
    CODE_BANK.set(id, { code: clean, lang: language });
    const lines = clean.split("\n").length;
    const idx = blocks.length;
    blocks.push(
      `<div class="rdm-code-wrap" data-code-id="${id}">
         <div class="rdm-code-head">
           <span class="rdm-code-lang">${escapeHtml(language)}</span>
           <span class="rdm-code-target">Roblox Studio · ${lines} lines</span>
           <span class="rdm-code-actions">
             <button type="button" class="rdm-code-btn" data-act="copy">Copy</button>
             <button type="button" class="rdm-code-btn" data-act="save">Save .luau</button>
           </span>
         </div>
         <pre class="rdm-code"><code>${escapeHtml(clean)}</code></pre>
       </div>`
    );
    return `\u0000CODE${idx}\u0000`;
  });

  text = escapeHtml(text);
  text = text.replace(/^### (.*)$/gm, "<h3>$1</h3>");
  text = text.replace(/^## (.*)$/gm, "<h2>$1</h2>");
  text = text.replace(/^# (.*)$/gm, "<h1>$1</h1>");
  text = text.replace(/^&gt; (.*)$/gm, "<blockquote>$1</blockquote>");
  text = text.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  text = text.replace(/(^|[^*])\*([^*\n]+?)\*/g, "$1<em>$2</em>");
  text = text.replace(/`([^`]+?)`/g, '<code class="rdm-inline">$1</code>');
  text = text.replace(/^(?:- |\* )(.*)$/gm, "<li>$1</li>");
  text = text.replace(/(<li>[\s\S]*?<\/li>)/g, (m) => `<ul>${m.replace(/\n/g, "")}</ul>`);
  text = text.replace(/\n/g, "<br/>");
  text = text.replace(/\u0000CODE(\d+)\u0000/g, (_m, i) => blocks[+i]);
  return text;
}

/** Pull every fenced code block out of a reply (used by "Copy all code"). */
function extractCode(md: string) {
  const out: string[] = [];
  const re = /```\w*\n?([\s\S]*?)```/g;
  let m;
  while ((m = re.exec(md))) out.push(m[1].replace(/\n$/, ""));
  return out;
}

/* ============================================================================
   3. LUAU-ONLY / ROBLOX STUDIO ENFORCEMENT
   ============================================================================ */

const PLATFORM_QUESTION =
  /\b(what|which|where|who)\b[^?]{0,60}\b(made|make|built|build|created|create|used|use|using|for|run|runs|open|import|paste|put)\b/i;

const PLATFORM_SUBJECT =
  /\b(platform|engine|program|software|studio|app|editor|ide|game|this|that|it|script|code|gui|ui)\b/i;

function enforcePlatformAnswer(userText: string, reply: string) {
  if (!userText || !reply) return reply;
  if (/roblox studio/i.test(reply)) return reply;
  if (PLATFORM_QUESTION.test(userText) && PLATFORM_SUBJECT.test(userText)) {
    return `**Roblox Studio.** Everything RDM-ENGINE builds is made for Roblox Studio in Luau.\n\n${reply}`;
  }
  return reply;
}

function enforceLuau(reply: string) {
  if (!reply) return reply;
  let out = reply.replace(/```(lua|Lua|LUA|roblox|rbx)\b/g, "```luau");
  out = out.replace(
    /```\s*\n(?=[\s\S]*?(local |game:GetService|task\.wait))/g,
    "```luau\n"
  );
  return out;
}

function looksLikeCodeRequest(text: string) {
  return /\b(script|code|luau|lua|gui|ui|make|build|create|system|datastore|remote|tween|leaderstats|shop|inventory|npc|tool|weapon|save|load|module|animation|spawn|teleport|round|timer|kill|damage|health|button|frame|screengui|billboard|admin|anti|cheat|pathfind)\b/i.test(
    text || ""
  );
}

function countScripts(text: string) {
  const m = text.match(/```/g);
  return m ? Math.floor(m.length / 2) : 0;
}

/* ============================================================================
   1 + 2. THINKING & SEARCHING PHASE BUILDER
   ============================================================================ */

type Phase = { label: string; kind: "think" | "search" | "code" | "check" };

function buildPhases(userText: string, isCode: boolean, assetCount: number): Phase[] {
  const base: Phase[] = [
    { label: "Reading your request", kind: "think" },
    { label: "Understanding what you mean", kind: "think" },
    { label: "Planning the build order", kind: "think" },
  ];

  if (!isCode) {
    return [...base, { label: "Composing the answer", kind: "check" }];
  }

  const search: Phase[] = [
    {
      label:
        assetCount > 0
          ? `Searching the Asset Store (${assetCount} assets)`
          : "Searching the Asset Store",
      kind: "search",
    },
    { label: "Matching Roblox API references", kind: "search" },
    { label: "Scanning Luau patterns & services", kind: "search" },
  ];

  const write: Phase[] = [
    { label: "Selecting script type & location", kind: "code" },
    { label: "Writing Luau for Roblox Studio", kind: "code" },
  ];

  if (/\b(gui|ui|menu|hud|button|frame|screen|shop|inventory|interface)\b/i.test(userText)) {
    write.splice(1, 0, { label: "Designing responsive GUI layout", kind: "code" });
  }
  if (/\b(save|data|datastore|persist|load|leaderstats|coins|currency)\b/i.test(userText)) {
    write.splice(1, 0, { label: "Wiring DataStoreService persistence", kind: "code" });
  }

  return [...base, ...search, ...write, { label: "Checking for deprecated APIs", kind: "check" }];
}

function buildTrace(userText: string) {
  const goal = (userText || "").replace(/\s+/g, " ").trim().slice(0, 90);
  const lines = [
    goal ? `Goal → ${goal}${userText.length > 90 ? "…" : ""}` : "Goal → open request",
    "Target → Roblox Studio (Luau only)",
  ];
  if (/\b(server|datastore|save|remote)\b/i.test(userText))
    lines.push("Scope → server-authoritative logic required");
  if (/\b(gui|ui|hud|menu|button)\b/i.test(userText))
    lines.push("Scope → StarterGui / ScreenGui, scale-based sizing");
  if (/\b(local|client|camera|input)\b/i.test(userText))
    lines.push("Scope → LocalScript in StarterPlayerScripts");
  lines.push("Constraint → no deprecated APIs, pcall all data calls");
  return lines;
}

/* ============================================================================
   SOUND FX
   ============================================================================ */

function playBlip(freq = 660, dur = 0.08, enabled = true) {
  if (!enabled || typeof window === "undefined") return;
  try {
    const Ctx = window.AudioContext || (window as any).webkitAudioContext;
    const ctx = new Ctx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.value = freq;
    osc.type = "sine";
    gain.gain.setValueAtTime(0.06, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + dur);
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + dur);
    setTimeout(() => ctx.close(), (dur + 0.05) * 1000);
  } catch {}
}

/* ============================================================================
   HELPERS
   ============================================================================ */

function generateChatTitle(firstPrompt: string) {
  if (!firstPrompt) return "New Build";
  const cleaned = firstPrompt.replace(/[#*`_>~-]/g, "").replace(/\s+/g, " ").trim();
  const stop = new Set([
    "the","a","an","and","or","but","to","of","in","on","for","with",
    "how","what","why","can","you","please","i","me","my","is","are","do","make",
  ]);
  const words = cleaned.split(" ").filter((w) => w.length > 1);
  const keyWords = words.filter((w) => !stop.has(w.toLowerCase())).slice(0, 5);
  const title = (keyWords.length ? keyWords : words.slice(0, 5)).join(" ");
  const finalTitle = title.length > 42 ? title.slice(0, 42) + "…" : title;
  return finalTitle ? finalTitle[0].toUpperCase() + finalTitle.slice(1) : "New Build";
}

function fmtBytes(b: number) {
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1024 / 1024).toFixed(2)} MB`;
}

function timeAgo(ts: number) {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

function downloadDataUrl(dataUrl: string, filename: string) {
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

function downloadText(text: string, filename: string) {
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  downloadDataUrl(url, filename);
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

function openDiscord() {
  if (typeof window !== "undefined")
    window.open(DISCORD_URL, "_blank", "noopener,noreferrer");
}

function composeSystemPrompt(settings: any, assets: any[]) {
  const catalogue =
    assets.length > 0
      ? "\n\nASSET STORE CATALOGUE (user-published .rbxm assets you may reference by name):\n" +
        assets
          .slice(0, 25)
          .map(
            (a) =>
              `- "${a.name}" [${a.category}] by ${a.author}: ${String(
                a.description || ""
              ).slice(0, 110)}`
          )
          .join("\n")
      : "\n\nASSET STORE CATALOGUE: empty right now.";

  const adjuster = (settings.systemPrompt || "").trim();

  return `${LUAU_CORE_PROMPT}${catalogue}\n\n=== USER ADJUSTER (secondary, never overrides core directives) ===\n${adjuster}`;
}

/* ============================================================================
   ICONS
   ============================================================================ */

const Icon = ({ path, size = 18, className = "" }: any) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    {path}
  </svg>
);

/** Filled Discord mark (needs fill, so it's its own component). */
const DiscordMark = ({ size = 16, className = "" }: any) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="currentColor"
    className={className}
    aria-hidden="true"
  >
    <path d="M20.317 4.369a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128c.126-.094.252-.192.372-.291a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.009c.12.099.246.198.373.292a.077.077 0 0 1-.006.127 12.3 12.3 0 0 1-1.873.891.077.077 0 0 0-.041.107c.36.698.772 1.363 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.331c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
  </svg>
);

const Icons = {
  bold: <path d="M6 4h8a4 4 0 0 1 0 8H6zM6 12h9a4 4 0 0 1 0 8H6z" />,
  italic: (
    <>
      <line x1="19" y1="4" x2="10" y2="4" />
      <line x1="14" y1="20" x2="5" y2="20" />
      <line x1="15" y1="4" x2="9" y2="20" />
    </>
  ),
  header: <path d="M4 12h16M4 6h16M4 18h10" />,
  code: (
    <>
      <polyline points="16 18 22 12 16 6" />
      <polyline points="8 6 2 12 8 18" />
    </>
  ),
  list: (
    <>
      <line x1="8" y1="6" x2="21" y2="6" />
      <line x1="8" y1="12" x2="21" y2="12" />
      <line x1="8" y1="18" x2="21" y2="18" />
      <circle cx="3.5" cy="6" r="1" />
      <circle cx="3.5" cy="12" r="1" />
      <circle cx="3.5" cy="18" r="1" />
    </>
  ),
  quote: <path d="M3 21c3-3 3-6 3-9V6H3v6h3M14 21c3-3 3-6 3-9V6h-3v6h3" />,
  image: (
    <>
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <polyline points="21 15 16 10 5 21" />
    </>
  ),
  send: <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />,
  plus: <path d="M12 5v14M5 12h14" />,
  settings: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </>
  ),
  menu: <path d="M3 12h18M3 6h18M3 18h18" />,
  x: <path d="M18 6L6 18M6 6l12 12" />,
  trash: (
    <>
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </>
  ),
  crown: <path d="M2 20h20M4 16l2-9 4 4 2-6 2 6 4-4 2 9z" />,
  chevron: <polyline points="6 9 12 15 18 9" />,
  logout: (
    <>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </>
  ),
  sparkle: <path d="M12 2l2 7 7 2-7 2-2 7-2-7-7-2 7-2z" />,
  edit: (
    <>
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4z" />
    </>
  ),
  check: <polyline points="20 6 9 17 4 12" />,
  search: (
    <>
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </>
  ),
  copy: (
    <>
      <rect x="9" y="9" width="13" height="13" rx="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </>
  ),
  box: (
    <>
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
      <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
      <line x1="12" y1="22.08" x2="12" y2="12" />
    </>
  ),
  download: (
    <>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </>
  ),
  upload: (
    <>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </>
  ),
  home: (
    <>
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </>
  ),
  chat: <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8z" />,
  arrow: (
    <>
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="12 5 19 12 12 19" />
    </>
  ),
  layers: (
    <>
      <polygon points="12 2 2 7 12 12 22 7 12 2" />
      <polyline points="2 17 12 22 22 17" />
      <polyline points="2 12 12 17 22 12" />
    </>
  ),
  db: (
    <>
      <ellipse cx="12" cy="5" rx="9" ry="3" />
      <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
      <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
    </>
  ),
  brain: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M8 12a4 4 0 0 1 8 0M12 8v8" />
    </>
  ),
  heart: <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1L12 21l7.7-7.6 1.1-1a5.5 5.5 0 0 0 0-7.8z" />,
  users: (
    <>
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
    </>
  ),
};

/* ============================================================================
   REUSABLE COPY BUTTON
   ============================================================================ */

function CopyButton({ text, label = "Copy", className = "", size = 13, onDone }: any) {
  const [done, setDone] = useState(false);
  const click = async (e: any) => {
    e.stopPropagation();
    const ok = await copyToClipboard(text);
    if (!ok) return;
    setDone(true);
    onDone?.();
    setTimeout(() => setDone(false), 1500);
  };
  return (
    <button
      type="button"
      className={`rdm-copy-btn ${done ? "done" : ""} ${className}`}
      onClick={click}
      title={label}
    >
      <Icon path={done ? Icons.check : Icons.copy} size={size} />
      <span>{done ? "Copied" : label}</span>
    </button>
  );
}

/* ============================================================================
   DISCORD BUTTON
   ============================================================================ */

function DiscordButton({ variant = "solid", label = "Join Discord", size = 16 }: any) {
  return (
    <button
      type="button"
      className={`dc-btn dc-${variant}`}
      onClick={openDiscord}
      title="Join the RDM-ENGINE Discord"
    >
      <DiscordMark size={size} />
      {label && <span>{label}</span>}
    </button>
  );
}

/* ============================================================================
   4. INTRO / LANDING PAGE
   ============================================================================ */

const LANDING_CARDS = [
  { t: "Obby System", c: "linear-gradient(150deg,#ff7a59,#7c2bff)" },
  { t: "Tycoon Kit", c: "linear-gradient(150deg,#38f9d7,#43e97b)" },
  { t: "Murder Mystery", c: "linear-gradient(150deg,#6a11cb,#2575fc)" },
  { t: "Combat GUI", c: "linear-gradient(150deg,#f857a6,#ff5858)" },
  { t: "Prison Escape", c: "linear-gradient(150deg,#f7971e,#ffd200)" },
  { t: "Aura Battles", c: "linear-gradient(150deg,#7f00ff,#e100ff)" },
  { t: "Simulator Core", c: "linear-gradient(150deg,#00c6ff,#0072ff)" },
  { t: "Shop & Inventory", c: "linear-gradient(150deg,#11998e,#38ef7d)" },
];

function LandingPage({ onDashboard, onStore, rainbow }: any) {
  const [prompt, setPrompt] = useState("");
  const [ph, setPh] = useState(0);

  const placeholders = useMemo(
    () => [
      "Make a Roblox game where lava rises every 30 seconds…",
      "Build a coin shop GUI that saves with DataStore…",
      "Create a sword combat system with cooldowns…",
      "Make a round-based minigame with a lobby…",
    ],
    []
  );

  useEffect(() => {
    const t = setInterval(() => setPh((p) => (p + 1) % placeholders.length), 3200);
    return () => clearInterval(t);
  }, [placeholders.length]);

  const go = () => onDashboard(prompt.trim());

  return (
    <div className="ld-root">
      {/* ---------- NAV ---------- */}
      <nav className="ld-nav">
        <div className="ld-brand">
          <div className={`rdm-logo-orb sm ${rainbow ? "rainbow-orb" : ""}`}>
            <Icon path={Icons.sparkle} size={15} />
          </div>
          <span className={rainbow ? "rainbow-text" : ""}>RDM-ENGINE</span>
        </div>
        <div className="ld-nav-links">
          <button className="ld-nav-link" onClick={onStore}>
            Asset Store
          </button>
          <button
            className="ld-nav-link"
            onClick={() =>
              document.getElementById("ld-features")?.scrollIntoView({ behavior: "smooth" })
            }
          >
            Systems
          </button>
          <DiscordButton variant="nav" label="Discord" size={15} />
          <button className="ld-nav-dash" onClick={() => onDashboard("")}>
            Dashboard
          </button>
          <button
            className={`ld-nav-cta ${rainbow ? "rainbow-btn" : ""}`}
            onClick={() => onDashboard("")}
          >
            Start Building
          </button>
        </div>
      </nav>

      {/* ---------- HERO ---------- */}
      <header className="ld-hero">
        <div className="ld-grid-bg" />
        <div className="ld-glow a" />
        <div className="ld-glow b" />

        <div className="ld-badge">
          <span className="ld-dot" /> Luau native · built for Roblox Studio
        </div>

        <h1 className="ld-title">
          <span className="ld-title-1">BUILD YOUR THAT GAME.</span>
          <span className={`ld-title-2 ${rainbow ? "rainbow-text" : ""}`}>
            WHICH YOU ALWAYS DREAMED FOR.
          </span>
        </h1>

        <p className="ld-sub">
          Describe it once. RDM-ENGINE thinks, searches the Asset Store, and writes
          production-ready Luau for Roblox Studio.
        </p>

        {/* Template composer — the REAL one lives in the Dashboard */}
        <div className={`ld-composer ${rainbow ? "rainbow-border" : ""}`}>
          <div className="ld-composer-tag">Template preview</div>
          <textarea
            className="ld-composer-input"
            placeholder={placeholders[ph]}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                go();
              }
            }}
            rows={3}
          />
          <div className="ld-composer-foot">
            <span className="ld-composer-hint">Opens in the Dashboard chat</span>
            <button className={`ld-generate ${rainbow ? "rainbow-btn" : ""}`} onClick={go}>
              <Icon path={Icons.sparkle} size={15} /> Generate
            </button>
          </div>
        </div>

        <div className="ld-hero-actions">
          <DiscordButton variant="hero" label="Join the Discord" size={18} />
        </div>

        <div className="ld-marquee">
          <div className="ld-marquee-track">
            {[...LANDING_CARDS, ...LANDING_CARDS].map((c, i) => (
              <div className="ld-card" key={c.t + i} style={{ background: c.c }}>
                <div className="ld-card-shine" />
                <span className="ld-card-label">{c.t}</span>
              </div>
            ))}
          </div>
        </div>
      </header>

      {/* ---------- JOURNEY ---------- */}
      <section className="ld-journey">
        <div className="ld-notes">
          <div className="ld-note n1">ideas for my Roblox game</div>
          <div className="ld-note n2">first script ever</div>
          <div className="ld-note n3">publish my asset</div>
        </div>
        <h2 className="ld-journey-title">
          <span>YOUR FIRST JOURNEY</span>
          <span className="ld-journey-pill">STARTS HERE</span>
        </h2>
        <p className="ld-journey-sub">
          No boilerplate, no engine setup. Just a prompt, a Dashboard, and Roblox Studio.
        </p>
        <div className="ld-belt">
          {Array.from({ length: 9 }).map((_, i) => (
            <div className="ld-belt-node" key={i} style={{ animationDelay: `${i * 0.12}s` }} />
          ))}
        </div>
        <button
          className={`ld-journey-cta ${rainbow ? "rainbow-btn" : ""}`}
          onClick={() => onDashboard("")}
        >
          Open Dashboard <Icon path={Icons.arrow} size={16} />
        </button>
      </section>

      {/* ---------- FEATURES ---------- */}
      <section className="ld-features" id="ld-features">
        <h3 className="ld-sec-title">Everything inside the engine</h3>
        <div className="ld-feature-grid">
          {[
            {
              i: Icons.brain,
              t: "Thinking System",
              d: "Watch the engine read, interpret and plan your request before a single line is written.",
            },
            {
              i: Icons.search,
              t: "Searching System",
              d: "Whenever code is generated it sweeps the Asset Store and Roblox API references live.",
            },
            {
              i: Icons.code,
              t: "Luau Only",
              d: "No Python, no JavaScript. Every block is Luau, and it is always for Roblox Studio.",
            },
            {
              i: Icons.box,
              t: "Custom Asset Store",
              d: "Publish your .rbxm files with a name, description and tags. Anyone can download them.",
            },
            {
              i: Icons.db,
              t: "DataStore System",
              d: "Chats, assets, drafts, accounts and settings all persist through one unified store.",
            },
            {
              i: Icons.layers,
              t: "UI Mastery",
              d: "Responsive ScreenGuis with UICorner, UIStroke, layouts, tweens and hover states.",
            },
          ].map((f) => (
            <div className="ld-feature" key={f.t}>
              <div className="ld-feature-icon">
                <Icon path={f.i} size={20} />
              </div>
              <div className="ld-feature-title">{f.t}</div>
              <div className="ld-feature-desc">{f.d}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ---------- DISCORD COMMUNITY ---------- */}
      <section className="ld-community">
        <div className="ld-community-card">
          <div className="ld-community-glow" />
          <div className="ld-community-mark">
            <DiscordMark size={34} />
          </div>
          <h3 className="ld-community-title">Build with the community</h3>
          <p className="ld-community-sub">
            Share your scripts, drop your .rbxm assets, get help with your Roblox
            Studio project and see every update first.
          </p>
          <div className="ld-community-actions">
            <DiscordButton variant="big" label="Join the Discord Server" size={20} />
            <CopyButton text={DISCORD_URL} label="Copy invite" className="ghost" />
          </div>
          <div className="ld-community-link">{DISCORD_URL}</div>
        </div>
      </section>

      <footer className="ld-footer">
        <span className={rainbow ? "rainbow-text" : ""}>RDM-ENGINE</span>
        <span className="ld-footer-sub">{IDENTITY.tagline} · Built for Roblox Studio</span>
        <div className="ld-footer-actions">
          <DiscordButton variant="nav" label="Discord" size={15} />
        </div>
      </footer>
    </div>
  );
}

/* ============================================================================
   AUTH SCREEN
   ============================================================================ */

function AuthScreen({ onAuth, rainbow, onBack }: any) {
  const [mode, setMode] = useState("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: any) => {
    e.preventDefault();
    setError("");
    const em = email.trim().toLowerCase();
    if (!em || !password) return setError("Email and password are required.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em))
      return setError("Please enter a valid email address.");

    setBusy(true);
    try {
      const users = DS.users.read();
      if (mode === "register") {
        if (!name.trim()) return setError("Please enter your name.");
        if (password.length < 6) return setError("Password must be at least 6 characters.");
        if (password !== confirm) return setError("Passwords do not match.");
        if (users[em]) return setError("An account with this email exists.");
        const salt = makeSalt();
        const hash = await hashPassword(password, salt);
        DS.users.write({
          ...users,
          [em]: { name: name.trim(), email: em, salt, hash, pro: false, joined: Date.now() },
        });
        onAuth({ name: name.trim(), email: em, pro: false });
      } else {
        const rec = users[em];
        if (!rec) return setError("No account found. Try registering.");
        const hash = await hashPassword(password, rec.salt);
        if (hash !== rec.hash) return setError("Incorrect password.");
        onAuth({ name: rec.name, email: rec.email, pro: !!rec.pro });
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rdm-auth-wrap">
      <div className="rdm-auth-bg" />
      <form className="rdm-auth-card glass" onSubmit={submit}>
        <button type="button" className="rdm-auth-back" onClick={onBack}>
          <Icon path={Icons.home} size={14} /> Home
        </button>

        <div className="rdm-auth-logo">
          <div className={`rdm-logo-orb ${rainbow ? "rainbow-orb" : ""}`}>
            <Icon path={Icons.sparkle} size={26} />
          </div>
          <h1 className={rainbow ? "rainbow-text" : ""}>RDM-ENGINE</h1>
          <p className="rdm-muted">Sign in to open your Dashboard</p>
        </div>

        <div className="rdm-tab-switch">
          <button
            type="button"
            className={mode === "login" ? "active" : ""}
            onClick={() => {
              setMode("login");
              setError("");
            }}
          >
            Sign In
          </button>
          <button
            type="button"
            className={mode === "register" ? "active" : ""}
            onClick={() => {
              setMode("register");
              setError("");
            }}
          >
            Register
          </button>
        </div>

        {mode === "register" && (
          <input
            className="rdm-input"
            placeholder="Full name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoComplete="name"
          />
        )}
        <input
          className="rdm-input"
          type="email"
          placeholder="Email address"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
        />
        <input
          className="rdm-input"
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete={mode === "login" ? "current-password" : "new-password"}
        />
        {mode === "register" && (
          <input
            className="rdm-input"
            type="password"
            placeholder="Confirm password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            autoComplete="new-password"
          />
        )}

        {error && <div className="rdm-error">{error}</div>}

        <button className={`rdm-btn-primary ${rainbow ? "rainbow-btn" : ""}`} disabled={busy}>
          {busy ? "Please wait…" : mode === "login" ? "Sign In" : "Create Account"}
        </button>

        <div className="rdm-auth-discord">
          <DiscordButton variant="soft" label="Join our Discord" size={15} />
        </div>

        <p className="rdm-muted rdm-fineprint">
          Accounts are stored in the local DataStore on this device only.
        </p>
      </form>
    </div>
  );
}

/* ============================================================================
   MODEL SELECTOR
   ============================================================================ */

function ModelSelector({ current, onChange, isPro, onNeedPro, rainbow }: any) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const model = MODELS.find((m) => m.id === current) || MODELS[0];

  useEffect(() => {
    const h = (e: any) => ref.current && !ref.current.contains(e.target) && setOpen(false);
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const pick = (m: any) => {
    if (m.pro && !isPro) {
      setOpen(false);
      onNeedPro();
      return;
    }
    onChange(m.id);
    setOpen(false);
  };

  return (
    <div className="rdm-model-select" ref={ref}>
      <button
        className={`rdm-model-trigger ${rainbow ? "rainbow-border" : ""}`}
        onClick={() => setOpen((o) => !o)}
      >
        <span className="rdm-model-dot" />
        <span className="rdm-model-name">{model.label}</span>
        <Icon path={Icons.chevron} size={16} className={open ? "rot" : ""} />
      </button>
      {open && (
        <div className="rdm-model-menu glass fade-in-down">
          {MODELS.map((m) => (
            <button
              key={m.id}
              className={`rdm-model-item ${m.id === current ? "sel" : ""}`}
              onClick={() => pick(m)}
            >
              <div className="rdm-model-item-main">
                <span className="rdm-model-item-label">{m.label}</span>
                {m.pro && !isPro && <span className="rdm-lock-mini">🔒</span>}
              </div>
              <span className="rdm-model-item-desc">{m.desc}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ============================================================================
   PRO MODAL
   ============================================================================ */

function ProModal({ open, onClose, user, onUpgrade, rainbow }: any) {
  if (!open) return null;
  const loggedIn = !!user;

  const features = [
    { icon: "⚡", title: "25% More Usage", desc: "Higher limits so your flow never stops." },
    { icon: "🧬", title: "Unlock RDM 2.4 XOR", desc: "Ultra thinking, ultra-fast Luau, GUI mastery." },
    { icon: "🚀", title: "Faster, Reliable Coding", desc: "Priority routing tuned for Roblox devs." },
    { icon: "🎁", title: "Early Feature Previews", desc: "Upcoming updates before anyone else." },
  ];

  return (
    <div className="rdm-modal-overlay fade-in" onClick={onClose}>
      <div
        className={`rdm-pro-card glass slide-up ${rainbow ? "rainbow-border" : ""}`}
        onClick={(e) => e.stopPropagation()}
      >
        <button className="rdm-modal-x" onClick={onClose} aria-label="Close">
          <Icon path={Icons.x} size={20} />
        </button>

        <div className="rdm-pro-hero">
          <div className={`rdm-crown ${rainbow ? "rainbow-text" : ""}`}>
            <Icon path={Icons.crown} size={40} />
          </div>
          <h2 className={rainbow ? "rainbow-text" : ""}>About RDM Pro</h2>
          <p className="rdm-muted">Supercharge your RDM-ENGINE experience.</p>
          <div className="rdm-discount-badge pulse">8% OFF — Limited Time</div>
        </div>

        <div className="rdm-pro-grid">
          {features.map((f) => (
            <div className="rdm-pro-feature" key={f.title}>
              <div className="rdm-pro-feature-icon">{f.icon}</div>
              <div>
                <div className="rdm-pro-feature-title">{f.title}</div>
                <div className="rdm-pro-feature-desc">{f.desc}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="rdm-pro-updates">
          <strong>Upcoming & Discounts</strong>
          <p className="rdm-muted">
            Preview upcoming features and updates, plus exclusive <em>weekend</em> and{" "}
            <em>annual</em> discounts for Pro members. Announcements drop in the Discord first.
          </p>
        </div>

        {!loggedIn ? (
          <div className="rdm-pro-loginnote">
            Purchasing Pro requires an active login. Please sign in first.
          </div>
        ) : user.pro ? (
          <div className="rdm-pro-active">✓ You already have RDM Pro. Enjoy!</div>
        ) : (
          <button
            className={`rdm-btn-primary rdm-pro-buy ${rainbow ? "rainbow-btn" : ""}`}
            onClick={onUpgrade}
          >
            <Icon path={Icons.crown} size={18} /> Buy Pro! (8% Off)
          </button>
        )}

        <div className="rdm-pro-discord">
          <DiscordButton variant="soft" label="Ask about Pro in Discord" size={15} />
        </div>

        <p className="rdm-muted rdm-fineprint" style={{ marginTop: 10 }}>
          Purchasing requires an active user login.
        </p>
      </div>
    </div>
  );
}

/* ============================================================================
   SETTINGS PANEL
   ============================================================================ */

function SettingsPanel({ open, onClose, settings, setSettings, onOpenPro, user, rainbow }: any) {
  const [tab, setTab] = useState("studio");
  const [usage, setUsage] = useState<any>({ rows: [], totalKb: 0 });
  const importRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open && tab === "data") setUsage(dataStoreUsage());
  }, [open, tab]);

  if (!open) return null;

  const update = (patch: any) => setSettings((s: any) => ({ ...s, ...patch }));

  return (
    <div className="rdm-modal-overlay fade-in" onClick={onClose}>
      <div className="rdm-settings-card glass slide-up" onClick={(e) => e.stopPropagation()}>
        <div className="rdm-settings-head">
          <h2>Settings</h2>
          <button className="rdm-icon-btn" onClick={onClose} aria-label="Close">
            <Icon path={Icons.x} size={20} />
          </button>
        </div>

        <div className="rdm-settings-tabs">
          {[
            ["studio", "Studio"],
            ["chat", "Adjuster"],
            ["data", "DataStore"],
            ["pro", "Pro"],
          ].map(([k, l]) => (
            <button
              key={k}
              className={tab === k ? "active" : ""}
              onClick={() => setTab(k as string)}
            >
              {l}
            </button>
          ))}
        </div>

        <div className="rdm-settings-body">
          {tab === "studio" && (
            <div className="fade-in">
              <label className="rdm-field-label">Theme</label>
              <div className="rdm-theme-row">
                {["midnight", "aurora", "mono"].map((t) => (
                  <button
                    key={t}
                    className={`rdm-theme-chip ${t} ${settings.theme === t ? "sel" : ""}`}
                    onClick={() => update({ theme: t })}
                  >
                    {t}
                  </button>
                ))}
              </div>

              <label className="rdm-field-label">Thinking Speed</label>
              <div className="rdm-theme-row">
                {(["fast", "normal", "deep"] as const).map((t) => (
                  <button
                    key={t}
                    className={`rdm-speed-chip ${settings.thinkingSpeed === t ? "sel" : ""}`}
                    onClick={() => update({ thinkingSpeed: t })}
                  >
                    {t}
                  </button>
                ))}
              </div>

              <Toggle
                label="Show Reasoning Trace"
                desc="Display what the engine understood while thinking"
                on={settings.showTrace}
                onToggle={() => update({ showTrace: !settings.showTrace })}
              />
              <Toggle
                label="Rainbow Effects"
                desc="Animated gradients & glowing accents"
                on={settings.rainbow}
                onToggle={() => update({ rainbow: !settings.rainbow })}
              />
              <Toggle
                label="Sound FX"
                desc="Subtle audio on send/receive"
                on={settings.sound}
                onToggle={() => update({ sound: !settings.sound })}
              />
              <Toggle
                label="Animations"
                desc="Transitions & micro-interactions"
                on={settings.animations}
                onToggle={() => update({ animations: !settings.animations })}
              />

              <div className="rdm-settings-discord">
                <div>
                  <div className="rdm-toggle-label">Community</div>
                  <div className="rdm-toggle-desc">Support, updates and asset sharing</div>
                </div>
                <DiscordButton variant="soft" label="Join" size={15} />
              </div>
            </div>
          )}

          {tab === "chat" && (
            <div className="fade-in">
              <label className="rdm-field-label">System Instructions (Chat Adjuster)</label>
              <textarea
                className="rdm-textarea"
                rows={6}
                value={settings.systemPrompt}
                onChange={(e) => update({ systemPrompt: e.target.value })}
              />
              <p className="rdm-muted rdm-fineprint" style={{ textAlign: "left" }}>
                The RDM-ENGINE core directives (Luau-only output and the Roblox Studio
                answer rule) are always applied on top of this and cannot be overridden.
              </p>

              <label className="rdm-field-label" style={{ marginTop: 16 }}>
                Creativity: {Number(settings.temperature).toFixed(2)}
              </label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={settings.temperature}
                onChange={(e) => update({ temperature: parseFloat(e.target.value) })}
                className="rdm-range"
              />

              <div style={{ display: "flex", gap: 8, marginTop: 14, flexWrap: "wrap" }}>
                <button
                  className="rdm-btn-ghost"
                  onClick={() => update({ systemPrompt: IDENTITY.systemBase })}
                >
                  Reset to Default
                </button>
                <CopyButton
                  text={settings.systemPrompt}
                  label="Copy prompt"
                  className="ghost"
                />
              </div>
            </div>
          )}

          {tab === "data" && (
            <div className="fade-in">
              <label className="rdm-field-label">
                DataStore usage — {usage.totalKb.toFixed(1)} KB
              </label>
              <div className="rdm-ds-list">
                {usage.rows.map((r: any) => (
                  <div className="rdm-ds-row" key={r.key}>
                    <span className="rdm-ds-key">{r.key}</span>
                    <div className="rdm-ds-bar">
                      <div
                        className="rdm-ds-fill"
                        style={{
                          width: `${Math.min(100, (r.kb / Math.max(usage.totalKb, 1)) * 100)}%`,
                        }}
                      />
                    </div>
                    <span className="rdm-ds-kb">{r.kb.toFixed(1)} KB</span>
                  </div>
                ))}
              </div>

              <div className="rdm-ds-actions">
                <button className="rdm-btn-ghost" onClick={exportAllData}>
                  <Icon path={Icons.download} size={14} /> Export
                </button>
                <button className="rdm-btn-ghost" onClick={() => importRef.current?.click()}>
                  <Icon path={Icons.upload} size={14} /> Import
                </button>
                <input
                  ref={importRef}
                  type="file"
                  accept="application/json"
                  hidden
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f)
                      importAllData(f, (ok) => {
                        alert(ok ? "DataStore imported." : "Invalid backup file.");
                        setUsage(dataStoreUsage());
                      });
                    e.target.value = "";
                  }}
                />
                <button
                  className="rdm-btn-ghost danger"
                  onClick={() => {
                    if (confirm("Clear chats and drafts? Assets and accounts stay.")) {
                      DS.chats.clear();
                      DS.drafts.clear();
                      DS.activeChat.clear();
                      setUsage(dataStoreUsage());
                    }
                  }}
                >
                  <Icon path={Icons.trash} size={14} /> Clear Chats
                </button>
              </div>
              <p className="rdm-muted rdm-fineprint" style={{ textAlign: "left", marginTop: 10 }}>
                Chats, drafts, accounts, settings and published assets all live in the
                RDM DataStore layer and survive refreshes.
              </p>
            </div>
          )}

          {tab === "pro" && (
            <div className="fade-in rdm-settings-pro">
              <div className={`rdm-crown ${rainbow ? "rainbow-text" : ""}`}>
                <Icon path={Icons.crown} size={34} />
              </div>
              <h3>{user?.pro ? "RDM Pro Active" : "Upgrade to RDM Pro"}</h3>
              <p className="rdm-muted">
                25% more usage, the XOR model, faster coding, and early feature previews.
              </p>
              <button
                className={`rdm-btn-primary ${rainbow ? "rainbow-btn" : ""}`}
                onClick={() => {
                  onClose();
                  onOpenPro();
                }}
              >
                <Icon path={Icons.crown} size={16} /> Buy Pro! (8% Off)
              </button>
              <DiscordButton variant="soft" label="Join Discord" size={15} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Toggle({ label, desc, on, onToggle }: any) {
  return (
    <div className="rdm-toggle-row" onClick={onToggle}>
      <div>
        <div className="rdm-toggle-label">{label}</div>
        {desc && <div className="rdm-toggle-desc">{desc}</div>}
      </div>
      <div className={`rdm-switch ${on ? "on" : ""}`}>
        <div className="rdm-switch-knob" />
      </div>
    </div>
  );
}

/* ============================================================================
   5. CUSTOM ASSET STORE
   ============================================================================ */

function PublishModal({ open, onClose, user, onPublish, rainbow }: any) {
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [category, setCategory] = useState(ASSET_CATEGORIES[0]);
  const [tags, setTags] = useState("");
  const [version, setVersion] = useState("1.0.0");
  const [file, setFile] = useState<any>(null);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) {
      setName("");
      setDesc("");
      setTags("");
      setVersion("1.0.0");
      setFile(null);
      setErr("");
    }
  }, [open]);

  if (!open) return null;

  const pickFile = (e: any) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    if (!/\.(rbxm|rbxmx)$/i.test(f.name)) {
      setErr("Only .rbxm or .rbxmx files can be published.");
      return;
    }
    if (f.size > MAX_ASSET_BYTES) {
      setErr(`File too large. Max ${fmtBytes(MAX_ASSET_BYTES)} per asset.`);
      return;
    }
    const r = new FileReader();
    r.onload = () => setFile({ name: f.name, size: f.size, dataUrl: String(r.result) });
    r.readAsDataURL(f);
    setErr("");
  };

  const submit = () => {
    if (!name.trim()) return setErr("Give your asset a name.");
    if (!desc.trim()) return setErr("Write what this asset is about.");
    if (!file) return setErr("Attach the .rbxm file.");
    setBusy(true);
    const ok = onPublish({
      id: uid(),
      name: name.trim(),
      description: desc.trim(),
      category,
      tags: tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean)
        .slice(0, 6),
      version: version.trim() || "1.0.0",
      author: user?.name || "Anonymous",
      authorEmail: user?.email || "",
      fileName: file.name,
      fileSize: file.size,
      dataUrl: file.dataUrl,
      downloads: 0,
      likes: [],
      createdAt: Date.now(),
    });
    setBusy(false);
    if (!ok) {
      setErr("Storage is full. Remove an old asset and try again.");
      return;
    }
    onClose();
  };

  return (
    <div className="rdm-modal-overlay fade-in" onClick={onClose}>
      <div
        className={`st-publish glass slide-up ${rainbow ? "rainbow-border" : ""}`}
        onClick={(e) => e.stopPropagation()}
      >
        <button className="rdm-modal-x" onClick={onClose} aria-label="Close">
          <Icon path={Icons.x} size={20} />
        </button>
        <h2 className="st-publish-title">
          <Icon path={Icons.upload} size={20} /> Publish an Asset
        </h2>
        <p className="rdm-muted" style={{ marginTop: -4 }}>
          Share a Roblox Studio model (.rbxm / .rbxmx) with everyone.
        </p>

        <label className="rdm-field-label" style={{ marginTop: 16 }}>
          Asset name
        </label>
        <input
          className="rdm-input"
          placeholder="e.g. Neon Shop GUI Kit"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        <label className="rdm-field-label" style={{ marginTop: 12 }}>
          What is it about?
        </label>
        <textarea
          className="rdm-textarea"
          rows={4}
          placeholder="Explain what it does, how to insert it in Roblox Studio, and anything a user should know."
          value={desc}
          onChange={(e) => setDesc(e.target.value)}
        />

        <div className="st-row2">
          <div>
            <label className="rdm-field-label" style={{ marginTop: 12 }}>
              Category
            </label>
            <select
              className="rdm-input"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              {ASSET_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="rdm-field-label" style={{ marginTop: 12 }}>
              Version
            </label>
            <input
              className="rdm-input"
              value={version}
              onChange={(e) => setVersion(e.target.value)}
              placeholder="1.0.0"
            />
          </div>
        </div>

        <label className="rdm-field-label" style={{ marginTop: 12 }}>
          Tags (comma separated)
        </label>
        <input
          className="rdm-input"
          placeholder="gui, shop, ui, neon"
          value={tags}
          onChange={(e) => setTags(e.target.value)}
        />

        <div className="st-drop" onClick={() => fileRef.current?.click()}>
          <Icon path={Icons.box} size={22} />
          {file ? (
            <div>
              <div className="st-drop-name">{file.name}</div>
              <div className="st-drop-size">{fmtBytes(file.size)} · ready</div>
            </div>
          ) : (
            <div>
              <div className="st-drop-name">Choose .rbxm / .rbxmx file</div>
              <div className="st-drop-size">Max {fmtBytes(MAX_ASSET_BYTES)}</div>
            </div>
          )}
        </div>
        <input ref={fileRef} type="file" accept=".rbxm,.rbxmx" hidden onChange={pickFile} />

        {err && (
          <div className="rdm-error" style={{ marginTop: 12 }}>
            {err}
          </div>
        )}

        <button
          className={`rdm-btn-primary ${rainbow ? "rainbow-btn" : ""}`}
          style={{ marginTop: 16, width: "100%" }}
          onClick={submit}
          disabled={busy}
        >
          <Icon path={Icons.upload} size={16} /> Publish to Asset Store
        </button>
      </div>
    </div>
  );
}

function AssetCard({ asset, user, onDownload, onDelete, onLike, onAsk }: any) {
  const liked = user && asset.likes?.includes(user.email);
  const mine = user && asset.authorEmail === user.email;

  const shareText = `${asset.name} — ${asset.description}\n[${asset.category}] v${asset.version} by ${asset.author}\nFrom the RDM-ENGINE Asset Store · ${DISCORD_URL}`;

  return (
    <div className="st-card fade-in-up">
      <div className="st-card-thumb" data-cat={asset.category}>
        <Icon path={Icons.box} size={26} />
        <span className="st-card-cat">{asset.category}</span>
      </div>
      <div className="st-card-body">
        <div className="st-card-name">{asset.name}</div>
        <div className="st-card-desc">{asset.description}</div>
        <div className="st-tags">
          {(asset.tags || []).map((t: string) => (
            <span className="st-tag" key={t}>
              #{t}
            </span>
          ))}
        </div>
        <div className="st-meta">
          <span>by {asset.author}</span>
          <span>·</span>
          <span>v{asset.version}</span>
          <span>·</span>
          <span>{fmtBytes(asset.fileSize)}</span>
          <span>·</span>
          <span>{timeAgo(asset.createdAt)}</span>
        </div>
        <div className="st-card-actions">
          <button className="st-dl" onClick={() => onDownload(asset)}>
            <Icon path={Icons.download} size={14} /> Download ({asset.downloads || 0})
          </button>
          <CopyButton text={shareText} label="" className="st-copy" size={14} />
          <button
            className={`st-like ${liked ? "on" : ""}`}
            onClick={() => onLike(asset)}
            title="Like"
          >
            <Icon path={Icons.heart} size={14} /> {asset.likes?.length || 0}
          </button>
          <button className="st-ask" onClick={() => onAsk(asset)} title="Ask the engine about it">
            <Icon path={Icons.chat} size={14} />
          </button>
          {mine && (
            <button className="st-del" onClick={() => onDelete(asset)} title="Delete">
              <Icon path={Icons.trash} size={14} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function AssetStore({ user, rainbow, onAsk }: any) {
  const [assets, setAssets] = useDataStore(DS.assets);
  const [stats, setStats] = useDataStore(DS.stats);
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("All");
  const [sort, setSort] = useState("new");
  const [publishOpen, setPublishOpen] = useState(false);

  const list = useMemo(() => {
    let out = [...assets];
    if (cat !== "All") out = out.filter((a) => a.category === cat);
    if (q.trim()) {
      const s = q.toLowerCase();
      out = out.filter(
        (a) =>
          a.name.toLowerCase().includes(s) ||
          a.description.toLowerCase().includes(s) ||
          (a.tags || []).some((t: string) => t.toLowerCase().includes(s))
      );
    }
    if (sort === "new") out.sort((a, b) => b.createdAt - a.createdAt);
    if (sort === "dl") out.sort((a, b) => (b.downloads || 0) - (a.downloads || 0));
    if (sort === "like") out.sort((a, b) => (b.likes?.length || 0) - (a.likes?.length || 0));
    return out;
  }, [assets, q, cat, sort]);

  const publish = (asset: any) => {
    const ok = DS.assets.write((prev) => [asset, ...prev]);
    if (ok) setStats((s: any) => ({ ...s, publishes: (s.publishes || 0) + 1 }));
    return ok;
  };

  const download = (asset: any) => {
    downloadDataUrl(asset.dataUrl, asset.fileName || `${asset.name}.rbxm`);
    setAssets((prev) =>
      prev.map((a) => (a.id === asset.id ? { ...a, downloads: (a.downloads || 0) + 1 } : a))
    );
    setStats((s: any) => ({ ...s, downloads: (s.downloads || 0) + 1 }));
  };

  const like = (asset: any) => {
    if (!user) return;
    setAssets((prev) =>
      prev.map((a) => {
        if (a.id !== asset.id) return a;
        const likes = a.likes || [];
        return likes.includes(user.email)
          ? { ...a, likes: likes.filter((e: string) => e !== user.email) }
          : { ...a, likes: [...likes, user.email] };
      })
    );
  };

  const remove = (asset: any) => {
    if (!confirm(`Delete "${asset.name}" from the Asset Store?`)) return;
    setAssets((prev) => prev.filter((a) => a.id !== asset.id));
  };

  return (
    <div className="st-root">
      <div className="st-head">
        <div>
          <h1 className={`st-title ${rainbow ? "rainbow-text" : ""}`}>Asset Store</h1>
          <p className="rdm-muted">
            {assets.length} published asset{assets.length === 1 ? "" : "s"} ·{" "}
            {stats.downloads || 0} total downloads · Roblox Studio ready
          </p>
        </div>
        <div className="st-head-actions">
          <DiscordButton variant="soft" label="Share on Discord" size={15} />
          <button
            className={`rdm-btn-primary ${rainbow ? "rainbow-btn" : ""}`}
            onClick={() => setPublishOpen(true)}
          >
            <Icon path={Icons.upload} size={16} /> Publish Asset
          </button>
        </div>
      </div>

      <div className="st-controls">
        <div className="st-search">
          <Icon path={Icons.search} size={16} />
          <input
            placeholder="Search assets, tags, descriptions…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <select className="st-select" value={cat} onChange={(e) => setCat(e.target.value)}>
          <option value="All">All categories</option>
          {ASSET_CATEGORIES.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
        <select className="st-select" value={sort} onChange={(e) => setSort(e.target.value)}>
          <option value="new">Newest</option>
          <option value="dl">Most downloaded</option>
          <option value="like">Most liked</option>
        </select>
      </div>

      {list.length === 0 ? (
        <div className="st-empty">
          <div className="st-empty-orb">
            <Icon path={Icons.box} size={30} />
          </div>
          <h3>No assets here yet</h3>
          <p className="rdm-muted">
            Publish your first .rbxm and it becomes downloadable for everyone using this engine.
          </p>
          <button className="rdm-btn-ghost" onClick={() => setPublishOpen(true)}>
            <Icon path={Icons.plus} size={14} /> Publish the first one
          </button>
        </div>
      ) : (
        <div className="st-grid">
          {list.map((a) => (
            <AssetCard
              key={a.id}
              asset={a}
              user={user}
              onDownload={download}
              onDelete={remove}
              onLike={like}
              onAsk={onAsk}
            />
          ))}
        </div>
      )}

      <PublishModal
        open={publishOpen}
        onClose={() => setPublishOpen(false)}
        user={user}
        onPublish={publish}
        rainbow={rainbow}
      />
    </div>
  );
}

/* ============================================================================
   FORMAT TOOLBAR
   ============================================================================ */

function FormatToolbar({ onFormat, rainbow }: any) {
  const tools = [
    { key: "bold", icon: Icons.bold, title: "Bold", wrap: ["**", "**"] },
    { key: "header", icon: Icons.header, title: "Header", wrap: ["# ", ""], line: true },
    { key: "italic", icon: Icons.italic, title: "Italic", wrap: ["*", "*"] },
    { key: "code", icon: Icons.code, title: "Luau Block", wrap: ["\n```luau\n", "\n```\n"] },
    { key: "list", icon: Icons.list, title: "Bullet List", wrap: ["- ", ""], line: true },
    { key: "quote", icon: Icons.quote, title: "Quote", wrap: ["> ", ""], line: true },
  ];
  return (
    <div className={`rdm-toolbar ${rainbow ? "rainbow-border-soft" : ""}`}>
      {tools.map((t) => (
        <button
          key={t.key}
          className="rdm-tool-btn"
          title={t.title}
          onClick={() => onFormat(t)}
          type="button"
        >
          <Icon path={t.icon} size={16} />
        </button>
      ))}
      <span className="rdm-toolbar-note">Luau · Roblox Studio</span>
    </div>
  );
}

/* ============================================================================
   MESSAGE BUBBLE (with copy actions)
   ============================================================================ */

function MessageBubble({ msg, rainbow, onCopied }: any) {
  const isUser = msg.role === "user";
  const codeBlocks = useMemo(
    () => (isUser ? [] : extractCode(msg.content || "")),
    [msg.content, isUser]
  );

  return (
    <div className={`rdm-msg-row ${isUser ? "user" : "ai"} fade-in-up`}>
      {!isUser && (
        <div className={`rdm-avatar ai ${rainbow ? "rainbow-orb" : ""}`}>
          <Icon path={Icons.sparkle} size={16} />
        </div>
      )}
      <div className={`rdm-bubble ${isUser ? "user" : "ai"}`}>
        {msg.image && <img src={msg.image} alt="attachment" className="rdm-msg-img" />}
        <div
          className="rdm-md"
          dangerouslySetInnerHTML={{ __html: renderMarkdown(msg.content) }}
        />
        <div className={`rdm-msg-foot ${isUser ? "user" : ""}`}>
          {!isUser && msg.hasCode && (
            <span className="rdm-msg-tag">
              <Icon path={Icons.box} size={12} /> Roblox Studio · Luau
            </span>
          )}
          <div className="rdm-msg-tools">
            <CopyButton
              text={msg.content}
              label="Copy"
              size={12}
              className="tiny"
              onDone={onCopied}
            />
            {codeBlocks.length > 0 && (
              <CopyButton
                text={codeBlocks.join("\n\n")}
                label={codeBlocks.length > 1 ? `Copy all code (${codeBlocks.length})` : "Copy code"}
                size={12}
                className="tiny"
                onDone={onCopied}
              />
            )}
            {codeBlocks.length > 0 && (
              <button
                type="button"
                className="rdm-copy-btn tiny"
                onClick={() =>
                  downloadText(codeBlocks.join("\n\n"), `RDM-Script-${Date.now()}.luau`)
                }
                title="Save as .luau"
              >
                <Icon path={Icons.download} size={12} />
                <span>Save .luau</span>
              </button>
            )}
          </div>
        </div>
      </div>
      {isUser && <div className="rdm-avatar user">You</div>}
    </div>
  );
}

/* ============================================================================
   1 + 2. THINKING / SEARCHING PANEL
   ============================================================================ */

function ThinkingPanel({ phases, idx, trace, elapsed, rainbow, showTrace }: any) {
  const current: Phase = phases[Math.min(idx, phases.length - 1)];
  const pct = Math.min(96, ((idx + 1) / phases.length) * 100);

  const iconFor = (kind: string) =>
    kind === "search"
      ? Icons.search
      : kind === "code"
      ? Icons.code
      : kind === "check"
      ? Icons.check
      : Icons.brain;

  return (
    <div className="rdm-msg-row ai fade-in">
      <div className={`rdm-avatar ai ${rainbow ? "rainbow-orb" : ""}`}>
        <Icon path={Icons.sparkle} size={16} />
      </div>
      <div className="rdm-bubble ai th-bubble">
        <div className="th-head">
          <span className={`th-title ${rainbow ? "rainbow-text" : ""}`}>
            {current.kind === "search"
              ? "Searching"
              : current.kind === "code"
              ? "Generating Luau"
              : "Thinking"}
          </span>
          <span className="th-timer">{(elapsed / 1000).toFixed(1)}s</span>
        </div>

        <div className="th-progress">
          <div className="th-progress-fill" style={{ width: `${pct}%` }} />
        </div>

        <div className="th-steps">
          {phases.map((p: Phase, i: number) => {
            const state = i < idx ? "done" : i === idx ? "active" : "idle";
            return (
              <div className={`th-step ${state}`} key={p.label + i}>
                <span className={`th-step-icon ${p.kind} ${state}`}>
                  {state === "done" ? (
                    <Icon path={Icons.check} size={11} />
                  ) : (
                    <Icon
                      path={iconFor(p.kind)}
                      size={11}
                      className={state === "active" && p.kind === "search" ? "th-spin" : ""}
                    />
                  )}
                </span>
                <span className="th-step-label">
                  {p.label}
                  {state === "active" && <span className="th-ellipsis" />}
                </span>
                {state === "active" && p.kind === "search" && (
                  <span className="th-scan">
                    <span className="th-scan-bar" />
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {showTrace && trace?.length > 0 && (
          <div className="th-trace">
            {trace.map((t: string, i: number) => (
              <div className="th-trace-line" key={i} style={{ animationDelay: `${i * 0.15}s` }}>
                {t}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function TypingIndicator({ rainbow }: any) {
  return (
    <div className="rdm-msg-row ai fade-in">
      <div className={`rdm-avatar ai ${rainbow ? "rainbow-orb" : ""}`}>
        <Icon path={Icons.sparkle} size={16} />
      </div>
      <div className="rdm-bubble ai">
        <div className="rdm-typing">
          <span />
          <span />
          <span />
        </div>
      </div>
    </div>
  );
}

/* ============================================================================
   WELCOME STATE
   ============================================================================ */

const UI_PRESETS = [
  "Build a responsive main menu ScreenGui with Play, Shop and Settings buttons",
  "Make a coin shop GUI with a scrolling item list and buy confirmation",
  "Create a health bar HUD that tweens smoothly when damage is taken",
  "Build a settings panel with toggles, sliders and a close animation",
];

const SYSTEM_PRESETS = [
  "Make a leaderstats + DataStore save system for coins and level",
  "Create a round-based minigame with lobby, countdown and winner",
  "Build a sword tool with damage, cooldown and hit detection",
  "Make an NPC that pathfinds to the nearest player",
];

function WelcomeState({ rainbow, name, onPick, assetCount }: any) {
  const [tab, setTab] = useState<"ui" | "sys">("ui");
  const list = tab === "ui" ? UI_PRESETS : SYSTEM_PRESETS;
  return (
    <div className="rdm-welcome fade-in">
      <div className={`rdm-logo-orb big ${rainbow ? "rainbow-orb" : ""}`}>
        <Icon path={Icons.sparkle} size={34} />
      </div>
      <h1 className={rainbow ? "rainbow-text" : ""}>
        Hello{name ? `, ${name.split(" ")[0]}` : ""} 👋
      </h1>
      <p className="rdm-muted">
        I'm <strong>RDM-ENGINE</strong>. I write <strong>Luau</strong> only, and everything I
        build is for <strong>Roblox Studio</strong>.
      </p>
      <div className="rdm-welcome-chips">
        <span className="rdm-wchip">
          <Icon path={Icons.brain} size={12} /> Thinking
        </span>
        <span className="rdm-wchip">
          <Icon path={Icons.search} size={12} /> Asset search
        </span>
        <span className="rdm-wchip">
          <Icon path={Icons.box} size={12} /> {assetCount} assets
        </span>
        <span className="rdm-wchip">
          <Icon path={Icons.db} size={12} /> DataStore
        </span>
      </div>

      <div className="rdm-preset-tabs">
        <button className={tab === "ui" ? "active" : ""} onClick={() => setTab("ui")}>
          UI Builder
        </button>
        <button className={tab === "sys" ? "active" : ""} onClick={() => setTab("sys")}>
          Game Systems
        </button>
      </div>

      <div className="rdm-suggest-grid">
        {list.map((s) => (
          <div className="rdm-suggest-card" key={s} onClick={() => onPick(s)}>
            <span>{s}</span>
            <CopyButton text={s} label="" size={12} className="tiny ghosty" />
          </div>
        ))}
      </div>

      <div className="rdm-welcome-discord">
        <DiscordButton variant="soft" label="Join the Discord" size={15} />
      </div>
    </div>
  );
}

/* ============================================================================
   MAIN APP
   ============================================================================ */

export default function App() {
  const [mounted, setMounted] = useState(false);
  const [view, setView] = useState<"landing" | "app">("landing");
  const [panel, setPanel] = useState<"chat" | "store">("chat");

  const [user, setUser] = useState<any>(null);

  const [settings, setSettings] = useDataStore(DS.settings);
  const [chats, setChats] = useDataStore(DS.chats);
  const [activeId, setActiveId] = useDataStore(DS.activeChat);
  const [assets] = useDataStore(DS.assets);
  const [, setStats] = useDataStore(DS.stats);

  const [input, setInput] = useState("");
  const [attachment, setAttachment] = useState<any>(null);
  const [sending, setSending] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [proOpen, setProOpen] = useState(false);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameVal, setRenameVal] = useState("");
  const [toast, setToast] = useState("");

  const [think, setThink] = useState<{
    active: boolean;
    phases: Phase[];
    idx: number;
    trace: string[];
    startedAt: number;
  }>({ active: false, phases: [], idx: 0, trace: [], startedAt: 0 });
  const [elapsed, setElapsed] = useState(0);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const rainbow = settings.rainbow;

  /* ---------- boot ---------- */
  useEffect(() => {
    const session = DS.session.read();
    if (session?.email) {
      const users = DS.users.read();
      const rec = users[session.email];
      if (rec) setUser({ name: rec.name, email: rec.email, pro: !!rec.pro });
    }
    setMounted(true);
  }, []);

  /* ---------- theme ---------- */
  useEffect(() => {
    if (typeof document === "undefined") return;
    document.documentElement.setAttribute("data-theme", settings.theme);
    document.documentElement.setAttribute("data-anim", settings.animations ? "on" : "off");
  }, [settings.theme, settings.animations]);

  /* ---------- drafts ---------- */
  useEffect(() => {
    if (!user || view !== "app") return;
    const drafts = DS.drafts.read();
    setInput(drafts[activeId || "new"] || "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeId, user, view]);

  useEffect(() => {
    if (!user || view !== "app") return;
    const t = setTimeout(() => {
      DS.drafts.write((d) => ({ ...d, [activeId || "new"]: input }));
    }, 400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [input, activeId, user, view]);

  const activeChat = useMemo(
    () => chats.find((c) => c.id === activeId) || null,
    [chats, activeId]
  );

  /* ---------- autoscroll ---------- */
  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: settings.animations ? "smooth" : "auto",
    });
  }, [activeChat?.messages?.length, sending, think.idx, settings.animations]);

  /* ---------- textarea autosize ---------- */
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = Math.min(ta.scrollHeight, 200) + "px";
  }, [input]);

  /* ---------- thinking driver ---------- */
  useEffect(() => {
    if (!think.active) return;
    const speed =
      settings.thinkingSpeed === "fast" ? 480 : settings.thinkingSpeed === "deep" ? 1100 : 780;
    const t = setInterval(() => {
      setThink((s) => (s.idx < s.phases.length - 1 ? { ...s, idx: s.idx + 1 } : s));
    }, speed);
    return () => clearInterval(t);
  }, [think.active, think.phases.length, settings.thinkingSpeed]);

  useEffect(() => {
    if (!think.active) return;
    const t = setInterval(() => setElapsed(Date.now() - think.startedAt), 100);
    return () => clearInterval(t);
  }, [think.active, think.startedAt]);

  const flash = (m: string) => {
    setToast(m);
    setTimeout(() => setToast(""), 2200);
  };

  const bumpCopies = () => {
    setStats((s: any) => ({ ...s, copies: (s.copies || 0) + 1 }));
    playBlip(880, 0.05, settings.sound);
  };

  /* ---------- code block actions (event delegation) ---------- */
  const onMessagesClick = async (e: any) => {
    const btn = e.target?.closest?.(".rdm-code-btn");
    if (!btn) return;
    const wrap = btn.closest(".rdm-code-wrap");
    const id = wrap?.getAttribute("data-code-id");
    if (!id) return;
    const entry = CODE_BANK.get(id);
    if (!entry) return;
    const act = btn.getAttribute("data-act");
    if (act === "copy") {
      const ok = await copyToClipboard(entry.code);
      btn.textContent = ok ? "Copied" : "Failed";
      btn.classList.toggle("ok", ok);
      setTimeout(() => {
        btn.textContent = "Copy";
        btn.classList.remove("ok");
      }, 1500);
      if (ok) bumpCopies();
    } else if (act === "save") {
      downloadText(entry.code, `RDM-Script-${Date.now()}.luau`);
      flash("Saved .luau — drag it into Roblox Studio");
    }
  };

  /* ---------- auth ---------- */
  const handleAuth = (u: any) => {
    setUser(u);
    DS.session.write({ email: u.email });
    playBlip(880, 0.1, settings.sound);
    const pending = DS.handoff.read();
    if (pending) {
      setInput(pending);
      DS.handoff.write("");
    }
  };

  const handleLogout = () => {
    setUser(null);
    DS.session.clear();
    setSidebarOpen(false);
    setView("landing");
  };

  /* ---------- landing -> dashboard ---------- */
  const enterDashboard = (prompt: string) => {
    if (prompt) DS.handoff.write(prompt);
    setView("app");
    setPanel("chat");
    if (user && prompt) {
      setInput(prompt);
      DS.handoff.write("");
    }
    window.scrollTo({ top: 0 });
  };

  useEffect(() => {
    if (view === "app" && user) {
      const pending = DS.handoff.read();
      if (pending) {
        setInput(pending);
        DS.handoff.write("");
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, user]);

  /* ---------- chat management ---------- */
  const newChat = () => {
    setActiveId(null);
    setInput("");
    setAttachment(null);
    setSidebarOpen(false);
    setPanel("chat");
  };

  const deleteChat = (id: string) => {
    setChats((cs) => cs.filter((c) => c.id !== id));
    DS.drafts.write((d) => {
      const n = { ...d };
      delete n[id];
      return n;
    });
    if (activeId === id) setActiveId(null);
  };

  const commitRename = (id: string) => {
    if (renameVal.trim())
      setChats((cs) => cs.map((c) => (c.id === id ? { ...c, title: renameVal.trim() } : c)));
    setRenamingId(null);
    setRenameVal("");
  };

  const applyFormat = (tool: any) => {
    const ta = textareaRef.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const selected = input.slice(start, end);
    const [pre, post] = tool.wrap;
    const before = input.slice(0, start);
    const after = input.slice(end);
    const next = before + pre + selected + post + after;
    setInput(next);
    requestAnimationFrame(() => {
      ta.focus();
      const cursor = start + pre.length + selected.length;
      ta.setSelectionRange(cursor, cursor);
    });
  };

  const onPickImage = (e: any) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = () => setAttachment({ dataUrl: reader.result, name: file.name });
    reader.readAsDataURL(file);
  };

  /* ---------- SEND ---------- */
  const send = async (override?: string) => {
    const text = (override ?? input).trim();
    if ((!text && !attachment) || sending) return;

    playBlip(660, 0.07, settings.sound);

    const userMsg = {
      id: uid(),
      role: "user",
      content: text,
      image: attachment?.dataUrl || null,
      ts: Date.now(),
    };

    const current = chats.find((c) => c.id === activeId);
    const history = current ? [...current.messages, userMsg] : [userMsg];

    let chatId = activeId;
    if (chatId && current) {
      setChats((prev) =>
        prev.map((c) => (c.id === chatId ? { ...c, messages: history, updated: Date.now() } : c))
      );
    } else {
      chatId = uid();
      const newC = {
        id: chatId,
        title: generateChatTitle(text || attachment?.name || "New Build"),
        model: settings.model,
        messages: history,
        created: Date.now(),
        updated: Date.now(),
      };
      setChats((prev) => [newC, ...prev]);
      setActiveId(chatId);
    }

    setInput("");
    setAttachment(null);
    DS.drafts.write((d) => ({ ...d, [activeId || "new"]: "" }));
    setStats((s: any) => ({ ...s, messages: (s.messages || 0) + 1 }));

    const isCode = looksLikeCodeRequest(text);
    setThink({
      active: true,
      phases: buildPhases(text, isCode, assets.length),
      idx: 0,
      trace: settings.showTrace ? buildTrace(text) : [],
      startedAt: Date.now(),
    });
    setElapsed(0);
    setSending(true);

    const minDelay = settings.animations
      ? settings.thinkingSpeed === "fast"
        ? 900
        : settings.thinkingSpeed === "deep"
        ? 2400
        : 1500
      : 0;
    const started = Date.now();

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: settings.model,
          system: composeSystemPrompt(settings, assets),
          temperature: settings.temperature,
          messages: history.map((m: any) => ({
            role: m.role,
            content: m.content,
            image: m.image || undefined,
          })),
        }),
      });

      if (!response.ok) throw new Error("Backend unreachable.");

      const data = await response.json();
      let reply =
        data.reply || data.choices?.[0]?.message?.content || "No response received.";

      reply = enforceLuau(reply);
      reply = enforcePlatformAnswer(text, reply);

      const wait = Math.max(0, minDelay - (Date.now() - started));
      if (wait) await new Promise((r) => setTimeout(r, wait));

      const scripts = countScripts(reply);
      const aiMsg = {
        id: uid(),
        role: "assistant",
        content: reply,
        hasCode: scripts > 0,
        ts: Date.now(),
      };

      setChats((prev) =>
        prev.map((c) =>
          c.id === chatId ? { ...c, messages: [...c.messages, aiMsg], updated: Date.now() } : c
        )
      );
      if (scripts > 0) setStats((s: any) => ({ ...s, scripts: (s.scripts || 0) + scripts }));
      playBlip(990, 0.09, settings.sound);
    } catch {
      const aiMsg = {
        id: uid(),
        role: "assistant",
        content:
          "⚠️ Couldn't reach the RDM backend. Check that `/api/chat` is running and your OpenRouter key is valid on the server.",
        ts: Date.now(),
      };
      setChats((prev) =>
        prev.map((c) => (c.id === chatId ? { ...c, messages: [...c.messages, aiMsg] } : c))
      );
    } finally {
      setSending(false);
      setThink((s) => ({ ...s, active: false }));
    }
  };

  const onKeyDown = (e: any) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  const askAboutAsset = (asset: any) => {
    setPanel("chat");
    setActiveId(null);
    setInput(
      `I downloaded the asset "${asset.name}" (${asset.category}, v${asset.version}) from the Asset Store. It is described as: ${asset.description}\n\nWrite the Luau script I need to make it work in my game.`
    );
    setTimeout(() => textareaRef.current?.focus(), 60);
  };

  /* ---------- copy whole conversation ---------- */
  const conversationText = useMemo(() => {
    if (!activeChat) return "";
    return activeChat.messages
      .map((m: any) => `${m.role === "user" ? "You" : "RDM-ENGINE"}:\n${m.content}`)
      .join("\n\n---\n\n");
  }, [activeChat]);

  const handleUpgrade = () => {
    if (!user) return;
    alert("No Payment Method Yet.");
  };

  const needPro = () => setProOpen(true);

  /* ---------- render gates ---------- */

  if (!mounted) {
    return (
      <div className="rdm-root rdm-boot">
        <StyleSheet />
        <div className="rdm-logo-orb rainbow-orb big">
          <Icon path={Icons.sparkle} size={30} />
        </div>
      </div>
    );
  }

  if (view === "landing") {
    return (
      <div className="rdm-root landing">
        <StyleSheet />
        <LandingPage
          rainbow={rainbow}
          onDashboard={enterDashboard}
          onStore={() => {
            enterDashboard("");
            setPanel("store");
          }}
        />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="rdm-root">
        <StyleSheet />
        <AuthScreen onAuth={handleAuth} rainbow={rainbow} onBack={() => setView("landing")} />
      </div>
    );
  }

  /* ---------- dashboard ---------- */
  return (
    <div className="rdm-root">
      <StyleSheet />
      {sidebarOpen && <div className="rdm-backdrop" onClick={() => setSidebarOpen(false)} />}

      <aside className={`rdm-sidebar ${sidebarOpen ? "open" : ""}`}>
        <div className="rdm-sidebar-head">
          <div className="rdm-brand" onClick={() => setView("landing")}>
            <div className={`rdm-logo-orb sm ${rainbow ? "rainbow-orb" : ""}`}>
              <Icon path={Icons.sparkle} size={16} />
            </div>
            <span className={rainbow ? "rainbow-text" : ""}>RDM-ENGINE</span>
          </div>
          <button className="rdm-icon-btn" title="Back to intro" onClick={() => setView("landing")}>
            <Icon path={Icons.home} size={16} />
          </button>
        </div>

        <div className="rdm-nav-switch">
          <button
            className={panel === "chat" ? "active" : ""}
            onClick={() => {
              setPanel("chat");
              setSidebarOpen(false);
            }}
          >
            <Icon path={Icons.chat} size={14} /> Chat
          </button>
          <button
            className={panel === "store" ? "active" : ""}
            onClick={() => {
              setPanel("store");
              setSidebarOpen(false);
            }}
          >
            <Icon path={Icons.box} size={14} /> Assets
          </button>
        </div>

        <button className={`rdm-newchat ${rainbow ? "rainbow-btn" : ""}`} onClick={newChat}>
          <Icon path={Icons.plus} size={16} /> New Build
        </button>

        <div className="rdm-chat-list">
          {chats.length === 0 && <div className="rdm-empty-list">No builds yet.</div>}
          {chats.map((c) => (
            <div
              key={c.id}
              className={`rdm-chat-item ${c.id === activeId && panel === "chat" ? "active" : ""}`}
              onClick={() => {
                setActiveId(c.id);
                setPanel("chat");
                setSidebarOpen(false);
              }}
            >
              {renamingId === c.id ? (
                <input
                  className="rdm-rename-input"
                  value={renameVal}
                  autoFocus
                  onClick={(e) => e.stopPropagation()}
                  onChange={(e) => setRenameVal(e.target.value)}
                  onBlur={() => commitRename(c.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") commitRename(c.id);
                    if (e.key === "Escape") setRenamingId(null);
                  }}
                />
              ) : (
                <span className="rdm-chat-title">{c.title}</span>
              )}
              <div className="rdm-chat-actions">
                <button
                  className="rdm-mini-btn"
                  title="Rename"
                  onClick={(e) => {
                    e.stopPropagation();
                    setRenamingId(c.id);
                    setRenameVal(c.title);
                  }}
                >
                  <Icon path={Icons.edit} size={13} />
                </button>
                <button
                  className="rdm-mini-btn danger"
                  title="Delete"
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteChat(c.id);
                  }}
                >
                  <Icon path={Icons.trash} size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="rdm-sidebar-discord">
          <DiscordButton variant="wide" label="Join Discord Server" size={16} />
        </div>

        <div className="rdm-sidebar-foot">
          <button className="rdm-user-chip" onClick={() => setSettingsOpen(true)}>
            <div className={`rdm-avatar user sm ${user.pro ? "pro" : ""}`}>
              {user.name?.[0]?.toUpperCase() || "U"}
            </div>
            <div className="rdm-user-meta">
              <span className="rdm-user-name">
                {user.name} {user.pro && <span className="rdm-pro-tag">PRO</span>}
              </span>
              <span className="rdm-user-email">{user.email}</span>
            </div>
            <Icon path={Icons.settings} size={16} />
          </button>
          <button className="rdm-logout-btn" onClick={handleLogout} title="Log out">
            <Icon path={Icons.logout} size={16} />
          </button>
        </div>
      </aside>

      <main className="rdm-main">
        <header className="rdm-header">
          <button className="rdm-icon-btn rdm-menu-btn" onClick={() => setSidebarOpen(true)}>
            <Icon path={Icons.menu} size={20} />
          </button>

          {panel === "chat" ? (
            <ModelSelector
              current={settings.model}
              onChange={(m: any) => setSettings((s: any) => ({ ...s, model: m }))}
              isPro={!!user.pro}
              onNeedPro={needPro}
              rainbow={rainbow}
            />
          ) : (
            <div className="rdm-panel-title">
              <Icon path={Icons.box} size={16} /> Asset Store
            </div>
          )}

          <div className="rdm-header-right">
            {panel === "chat" && activeChat && activeChat.messages.length > 0 && (
              <CopyButton
                text={conversationText}
                label="Copy chat"
                className="header"
                size={13}
                onDone={bumpCopies}
              />
            )}
            <span className="rdm-luau-pill" title="Output language">
              <Icon path={Icons.code} size={12} /> Luau
            </span>
            <DiscordButton variant="icon" label="" size={16} />
            {!user.pro && (
              <button
                className={`rdm-pro-pill ${rainbow ? "rainbow-btn" : ""}`}
                onClick={() => setProOpen(true)}
              >
                <Icon path={Icons.crown} size={14} /> Get Pro
              </button>
            )}
            <button className="rdm-icon-btn" onClick={() => setSettingsOpen(true)} title="Settings">
              <Icon path={Icons.settings} size={19} />
            </button>
          </div>
        </header>

        {panel === "store" ? (
          <div className="rdm-scroll">
            <AssetStore user={user} rainbow={rainbow} onAsk={askAboutAsset} />
          </div>
        ) : (
          <>
            <div className="rdm-scroll" ref={scrollRef}>
              <div className="rdm-messages" onClick={onMessagesClick}>
                {!activeChat || activeChat.messages.length === 0 ? (
                  <WelcomeState
                    rainbow={rainbow}
                    name={user.name}
                    assetCount={assets.length}
                    onPick={(s: string) => {
                      setInput(s);
                      textareaRef.current?.focus();
                    }}
                  />
                ) : (
                  activeChat.messages.map((m: any) => (
                    <MessageBubble key={m.id} msg={m} rainbow={rainbow} onCopied={bumpCopies} />
                  ))
                )}

                {think.active ? (
                  <ThinkingPanel
                    phases={think.phases}
                    idx={think.idx}
                    trace={think.trace}
                    elapsed={elapsed}
                    rainbow={rainbow}
                    showTrace={settings.showTrace}
                  />
                ) : (
                  sending && <TypingIndicator rainbow={rainbow} />
                )}
              </div>
            </div>

            <div className="rdm-composer-wrap">
              <div className={`rdm-composer glass ${rainbow ? "rainbow-border" : ""}`}>
                <FormatToolbar onFormat={applyFormat} rainbow={rainbow} />

                {attachment && (
                  <div className="rdm-attach-preview fade-in">
                    <img src={attachment.dataUrl} alt={attachment.name} />
                    <div className="rdm-attach-name">{attachment.name}</div>
                    <button className="rdm-attach-x" onClick={() => setAttachment(null)}>
                      <Icon path={Icons.x} size={14} />
                    </button>
                  </div>
                )}

                <div className="rdm-input-row">
                  <button
                    className="rdm-icon-btn"
                    onClick={() => fileRef.current?.click()}
                    title="Attach reference image"
                  >
                    <Icon path={Icons.image} size={19} />
                  </button>
                  <input ref={fileRef} type="file" accept="image/*" hidden onChange={onPickImage} />
                  <textarea
                    ref={textareaRef}
                    className="rdm-textarea-input"
                    placeholder="Describe the Roblox system or GUI you want…"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={onKeyDown}
                    rows={1}
                  />
                  <button
                    className={`rdm-send-btn ${rainbow ? "rainbow-btn" : ""} ${
                      input.trim() || attachment ? "ready" : ""
                    }`}
                    onClick={() => send()}
                    disabled={sending || (!input.trim() && !attachment)}
                  >
                    <Icon path={Icons.send} size={18} />
                  </button>
                </div>
              </div>
              <div className="rdm-disclaimer">
                RDM-ENGINE writes Luau for Roblox Studio only. <kbd>Enter</kbd> to send,{" "}
                <kbd>Shift</kbd>+<kbd>Enter</kbd> for a new line.
              </div>
            </div>
          </>
        )}
      </main>

      {toast && <div className="rdm-toast fade-in-up">{toast}</div>}

      <SettingsPanel
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        settings={settings}
        setSettings={setSettings}
        onOpenPro={() => setProOpen(true)}
        user={user}
        rainbow={rainbow}
      />
      <ProModal
        open={proOpen}
        onClose={() => setProOpen(false)}
        user={user}
        onUpgrade={handleUpgrade}
        rainbow={rainbow}
      />
    </div>
  );
}

/* ============================================================================
   STYLES
   ============================================================================ */

function StyleSheet() {
  return <style>{CSS}</style>;
}

const CSS = `
:root{
  --bg:#0a0b12; --bg2:#12131f; --panel:#161826; --panel2:#1c1f30;
  --border:#282b40; --text:#eef0f8; --muted:#9aa0b8; --accent:#7c6bff;
  --accent2:#4dd0ff; --danger:#ff5c6a; --discord:#5865F2; --radius:16px;
}
[data-theme="aurora"]{
  --bg:#07131a; --bg2:#0a1b24; --panel:#0e2530; --panel2:#123240;
  --border:#1c4353; --accent:#00e0c6; --accent2:#7c6bff;
}
[data-theme="mono"]{
  --bg:#0c0c0d; --bg2:#141416; --panel:#1a1a1c; --panel2:#242427;
  --border:#333336; --accent:#e8e8ea; --accent2:#a0a0a4; --text:#f4f4f6;
}
*{box-sizing:border-box}
html,body{height:100%;margin:0}
body{background:var(--bg);color:var(--text);
  font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif}
kbd{background:var(--panel2);border:1px solid var(--border);border-radius:5px;padding:1px 5px;font-size:11px}
button{font-family:inherit}

.rdm-root{display:flex;height:100vh;width:100%;overflow:hidden;
  background:radial-gradient(1200px 600px at 80% -10%, var(--bg2), var(--bg))}
.rdm-root.landing{display:block;height:auto;min-height:100vh;overflow-y:auto}
.rdm-boot{align-items:center;justify-content:center}
[data-anim="off"] *{animation:none!important;transition:none!important}

/* ---------- RAINBOW ---------- */
@keyframes rainbowShift{0%{background-position:0% 50%}50%{background-position:100% 50%}100%{background-position:0% 50%}}
@keyframes spinGlow{0%{transform:rotate(0)}100%{transform:rotate(360deg)}}
.rainbow-text{background:linear-gradient(90deg,#ff5c8a,#ffb347,#ffe66d,#7bed9f,#4dd0ff,#7c6bff,#ff5c8a);
  background-size:300% 100%;-webkit-background-clip:text;background-clip:text;
  -webkit-text-fill-color:transparent;animation:rainbowShift 6s linear infinite;font-weight:800}
.rainbow-btn{background:linear-gradient(90deg,#ff5c8a,#7c6bff,#4dd0ff,#7bed9f,#ff5c8a)!important;
  background-size:300% 100%!important;animation:rainbowShift 5s linear infinite;color:#fff!important;border:none!important}
.rainbow-btn:hover{filter:brightness(1.1)}
.rainbow-border{position:relative}
.rainbow-border::before{content:"";position:absolute;inset:-2px;border-radius:inherit;
  background:linear-gradient(90deg,#ff5c8a,#ffb347,#7bed9f,#4dd0ff,#7c6bff,#ff5c8a);
  background-size:300% 100%;animation:rainbowShift 5s linear infinite;z-index:-1;filter:blur(1px);opacity:.85}
.rainbow-border-soft{border:1px solid transparent;
  background:linear-gradient(var(--panel),var(--panel)) padding-box,
  linear-gradient(90deg,#ff5c8a55,#7c6bff55,#4dd0ff55) border-box}
.rainbow-orb{background:conic-gradient(from 0deg,#ff5c8a,#ffb347,#ffe66d,#7bed9f,#4dd0ff,#7c6bff,#ff5c8a)!important;
  animation:spinGlow 8s linear infinite;box-shadow:0 0 24px #7c6bff88}

.glass{background:linear-gradient(180deg,rgba(255,255,255,.04),rgba(255,255,255,.01));
  backdrop-filter:blur(14px);border:1px solid var(--border)}

@keyframes fadeIn{from{opacity:0}to{opacity:1}}
@keyframes fadeInUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:none}}
@keyframes fadeInDown{from{opacity:0;transform:translateY(-8px)}to{opacity:1;transform:none}}
@keyframes slideUp{from{opacity:0;transform:translateY(30px) scale(.98)}to{opacity:1;transform:none}}
@keyframes pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.05)}}
.fade-in{animation:fadeIn .3s ease}
.fade-in-up{animation:fadeInUp .4s cubic-bezier(.2,.8,.2,1)}
.fade-in-down{animation:fadeInDown .25s ease}
.slide-up{animation:slideUp .35s cubic-bezier(.2,.8,.2,1)}
.pulse{animation:pulse 2s ease-in-out infinite}
.rot{transform:rotate(180deg);transition:.2s}

.rdm-logo-orb{width:52px;height:52px;border-radius:16px;display:grid;place-items:center;
  background:linear-gradient(135deg,var(--accent),var(--accent2));color:#fff;
  box-shadow:0 8px 30px rgba(124,107,255,.35)}
.rdm-logo-orb.sm{width:28px;height:28px;border-radius:9px}
.rdm-logo-orb.big{width:72px;height:72px;border-radius:22px}

/* ============ DISCORD BUTTONS ============ */
.dc-btn{display:inline-flex;align-items:center;gap:8px;border:none;cursor:pointer;font-weight:700;
  transition:.2s;color:#fff;background:var(--discord);border-radius:11px;padding:10px 15px;font-size:13.5px}
.dc-btn:hover{filter:brightness(1.12);transform:translateY(-1px);box-shadow:0 10px 26px #5865F255}
.dc-btn.dc-nav{padding:9px 13px;font-size:13px;background:#5865F224;color:#c7ccff;border:1px solid #5865F24d}
.dc-btn.dc-nav:hover{background:var(--discord);color:#fff}
.dc-btn.dc-icon{padding:9px;border-radius:10px;background:#5865F220;color:#8f9bff;border:1px solid #5865F240}
.dc-btn.dc-icon:hover{background:var(--discord);color:#fff}
.dc-btn.dc-soft{background:#5865F21f;color:#aab2ff;border:1px solid #5865F240;font-size:12.5px;padding:9px 14px}
.dc-btn.dc-soft:hover{background:var(--discord);color:#fff}
.dc-btn.dc-wide{width:100%;justify-content:center;padding:11px;font-size:13px}
.dc-btn.dc-hero{padding:13px 24px;font-size:14.5px;border-radius:14px;box-shadow:0 14px 34px #5865F244}
.dc-btn.dc-big{padding:15px 28px;font-size:15.5px;border-radius:15px;box-shadow:0 16px 40px #5865F255}

/* ============ COPY BUTTONS ============ */
.rdm-copy-btn{display:inline-flex;align-items:center;gap:6px;border:1px solid var(--border);
  background:var(--panel2);color:var(--muted);border-radius:9px;padding:6px 11px;font-size:12px;
  font-weight:700;cursor:pointer;transition:.15s}
.rdm-copy-btn:hover{color:var(--text);border-color:var(--accent);background:var(--panel)}
.rdm-copy-btn.done{color:#7bed9f;border-color:#7bed9f66;background:#7bed9f16}
.rdm-copy-btn.tiny{padding:4px 9px;font-size:11px;border-radius:8px}
.rdm-copy-btn.tiny span:empty{display:none}
.rdm-copy-btn.ghost{background:none}
.rdm-copy-btn.ghosty{background:none;border-color:transparent;opacity:0}
.rdm-suggest-card:hover .rdm-copy-btn.ghosty{opacity:1}
.rdm-copy-btn.header{padding:8px 13px;border-radius:20px}
.rdm-copy-btn.st-copy{padding:9px 10px;border-radius:10px}

/* ============ LANDING ============ */
.ld-root{min-height:100vh;background:
  radial-gradient(900px 500px at 15% -5%,#7c6bff26,transparent),
  radial-gradient(800px 500px at 90% 10%,#4dd0ff1f,transparent),
  linear-gradient(180deg,#080910,#0b0d18 40%,#080910)}
.ld-nav{position:sticky;top:0;z-index:30;display:flex;align-items:center;justify-content:space-between;
  padding:14px 22px;backdrop-filter:blur(14px);background:rgba(8,9,16,.72);border-bottom:1px solid #ffffff0f}
.ld-brand{display:flex;align-items:center;gap:9px;font-weight:900;letter-spacing:.4px;font-size:15px}
.ld-nav-links{display:flex;align-items:center;gap:8px}
.ld-nav-link{background:none;border:none;color:#b9bed6;font-size:13.5px;font-weight:600;cursor:pointer;
  padding:9px 12px;border-radius:10px;transition:.2s}
.ld-nav-link:hover{color:#fff;background:#ffffff10}
.ld-nav-dash{background:#ffffff10;border:1px solid #ffffff1f;color:#fff;font-size:13.5px;font-weight:700;
  padding:9px 15px;border-radius:11px;cursor:pointer;transition:.2s}
.ld-nav-dash:hover{background:#ffffff1c;transform:translateY(-1px)}
.ld-nav-cta{border:none;border-radius:11px;padding:10px 17px;font-weight:800;font-size:13.5px;color:#fff;
  background:linear-gradient(90deg,#7c6bff,#4dd0ff);cursor:pointer;transition:.2s}
.ld-nav-cta:hover{transform:translateY(-1px);filter:brightness(1.08)}

.ld-hero{position:relative;overflow:hidden;padding:70px 20px 40px;text-align:center;display:flex;
  flex-direction:column;align-items:center}
.ld-grid-bg{position:absolute;inset:0;
  background-image:linear-gradient(#ffffff08 1px,transparent 1px),linear-gradient(90deg,#ffffff08 1px,transparent 1px);
  background-size:44px 44px;mask-image:radial-gradient(circle at 50% 20%,#000,transparent 72%)}
.ld-glow{position:absolute;border-radius:50%;filter:blur(90px);opacity:.55;pointer-events:none}
.ld-glow.a{width:420px;height:420px;background:#7c6bff;top:-120px;left:-80px}
.ld-glow.b{width:380px;height:380px;background:#00e0c6;top:40px;right:-100px;opacity:.3}
.ld-badge{position:relative;display:inline-flex;align-items:center;gap:8px;padding:7px 15px;border-radius:99px;
  background:#ffffff0d;border:1px solid #ffffff1a;font-size:12.5px;color:#c8cde4;font-weight:600;margin-bottom:26px}
.ld-dot{width:7px;height:7px;border-radius:50%;background:#7bed9f;box-shadow:0 0 10px #7bed9f;animation:pulse 1.8s infinite}
.ld-title{position:relative;margin:0;display:flex;flex-direction:column;gap:6px;line-height:1.02}
.ld-title-1{font-size:clamp(30px,6.4vw,62px);font-weight:900;letter-spacing:-1.5px;color:#fff;
  text-shadow:0 8px 40px #7c6bff55}
.ld-title-2{font-size:clamp(22px,4.6vw,44px);font-weight:900;letter-spacing:-.8px;color:#4dd0ff}
.ld-sub{position:relative;max-width:560px;margin:20px auto 0;color:#a7adc7;font-size:15px;line-height:1.6}

.ld-composer{position:relative;width:100%;max-width:660px;margin:30px auto 0;border-radius:20px;
  background:#0f111ccc;border:1px solid #ffffff14;padding:14px;text-align:left;backdrop-filter:blur(10px);
  box-shadow:0 24px 70px #00000066}
.ld-composer-tag{position:absolute;top:-11px;left:16px;font-size:10.5px;font-weight:800;letter-spacing:.6px;
  text-transform:uppercase;background:#7c6bff;color:#fff;padding:3px 9px;border-radius:7px}
.ld-composer-input{width:100%;background:none;border:none;outline:none;color:#eef0f8;resize:none;
  font-size:15px;font-family:inherit;line-height:1.55;padding:10px 6px}
.ld-composer-input::placeholder{color:#6d7492}
.ld-composer-foot{display:flex;align-items:center;justify-content:space-between;gap:10px;padding-top:8px;
  border-top:1px solid #ffffff0f}
.ld-composer-hint{font-size:11.5px;color:#767d9c}
.ld-generate{display:flex;align-items:center;gap:7px;border:none;border-radius:12px;padding:10px 16px;
  font-weight:800;font-size:13.5px;color:#fff;background:linear-gradient(90deg,#7c6bff,#4dd0ff);cursor:pointer;transition:.2s}
.ld-generate:hover{transform:translateY(-1px);filter:brightness(1.08)}
.ld-hero-actions{position:relative;margin-top:22px;display:flex;gap:10px;flex-wrap:wrap;justify-content:center}

.ld-marquee{position:relative;width:100%;margin-top:44px;overflow:hidden;
  mask-image:linear-gradient(90deg,transparent,#000 12%,#000 88%,transparent)}
@keyframes marquee{from{transform:translateX(0)}to{transform:translateX(-50%)}}
.ld-marquee-track{display:flex;gap:14px;width:max-content;animation:marquee 34s linear infinite}
.ld-card{position:relative;width:150px;height:110px;border-radius:16px;overflow:hidden;flex-shrink:0;
  box-shadow:0 12px 30px #00000055;display:flex;align-items:flex-end;padding:10px}
.ld-card-shine{position:absolute;inset:0;background:linear-gradient(160deg,#ffffff33,transparent 55%)}
.ld-card-label{position:relative;font-size:11.5px;font-weight:800;color:#fff;background:#00000055;
  padding:4px 9px;border-radius:8px;backdrop-filter:blur(4px)}

.ld-journey{position:relative;padding:80px 20px 70px;text-align:center;background:#0b0d18;overflow:hidden;
  border-top:1px solid #ffffff0d;border-bottom:1px solid #ffffff0d}
.ld-notes{position:absolute;inset:0;pointer-events:none}
.ld-note{position:absolute;background:#ffe66d;color:#2b2b13;font-size:11px;font-weight:700;padding:12px 10px;
  width:104px;border-radius:3px;box-shadow:0 10px 24px #00000066;line-height:1.3}
.ld-note.n1{top:56px;left:8%;transform:rotate(-9deg)}
.ld-note.n2{top:140px;left:4%;transform:rotate(6deg);background:#ffd6a5}
.ld-note.n3{top:70px;right:8%;transform:rotate(8deg);background:#b8f2c9}
.ld-journey-title{margin:0;display:flex;flex-direction:column;align-items:center;gap:10px;
  font-size:clamp(24px,5vw,46px);font-weight:900;letter-spacing:-1px;color:#fff}
.ld-journey-pill{background:linear-gradient(90deg,#7c6bff,#4dd0ff);padding:6px 22px;border-radius:99px;
  box-shadow:0 12px 40px #7c6bff55}
.ld-journey-sub{color:#a7adc7;font-size:14.5px;margin-top:18px}
.ld-belt{display:flex;justify-content:center;gap:16px;margin:34px 0 30px;padding:14px;border-radius:14px;
  background:linear-gradient(180deg,#171a2b,#101220);border:1px solid #ffffff12}
@keyframes beltPulse{0%,100%{transform:translateY(0);opacity:.5}50%{transform:translateY(-6px);opacity:1}}
.ld-belt-node{width:22px;height:22px;border-radius:50%;background:radial-gradient(circle at 35% 30%,#7dd8ff,#2b6fe0);
  box-shadow:0 0 16px #4dd0ff88;animation:beltPulse 1.6s ease-in-out infinite}
.ld-journey-cta{display:inline-flex;align-items:center;gap:9px;border:none;border-radius:14px;padding:14px 26px;
  font-weight:800;font-size:15px;color:#fff;background:linear-gradient(90deg,#7c6bff,#4dd0ff);cursor:pointer;transition:.2s}
.ld-journey-cta:hover{transform:translateY(-2px)}

.ld-features{padding:70px 20px 40px;max-width:1080px;margin:0 auto}
.ld-sec-title{text-align:center;font-size:clamp(20px,3.4vw,30px);font-weight:900;margin:0 0 34px;color:#fff}
.ld-feature-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:14px}
.ld-feature{background:#10121e;border:1px solid #ffffff12;border-radius:18px;padding:22px;transition:.25s}
.ld-feature:hover{transform:translateY(-3px);border-color:#7c6bff66;box-shadow:0 18px 46px #00000055}
.ld-feature-icon{width:40px;height:40px;border-radius:12px;display:grid;place-items:center;color:#fff;
  background:linear-gradient(135deg,#7c6bff,#4dd0ff);margin-bottom:14px}
.ld-feature-title{font-weight:800;font-size:15.5px;margin-bottom:6px;color:#fff}
.ld-feature-desc{font-size:13px;color:#9aa0b8;line-height:1.55}

/* ---------- DISCORD SECTION ---------- */
.ld-community{padding:40px 20px 70px;max-width:1080px;margin:0 auto}
.ld-community-card{position:relative;overflow:hidden;text-align:center;border-radius:24px;padding:44px 24px;
  background:linear-gradient(160deg,#151830,#0e1020);border:1px solid #5865F240}
.ld-community-glow{position:absolute;width:420px;height:420px;border-radius:50%;background:#5865F2;
  filter:blur(120px);opacity:.28;top:-180px;left:50%;transform:translateX(-50%);pointer-events:none}
.ld-community-mark{position:relative;width:66px;height:66px;border-radius:20px;margin:0 auto 16px;
  display:grid;place-items:center;color:#fff;background:var(--discord);box-shadow:0 16px 40px #5865F255}
.ld-community-title{position:relative;margin:0 0 8px;font-size:clamp(20px,3.4vw,28px);font-weight:900;color:#fff}
.ld-community-sub{position:relative;max-width:480px;margin:0 auto;color:#a7adc7;font-size:14px;line-height:1.6}
.ld-community-actions{position:relative;display:flex;gap:10px;justify-content:center;flex-wrap:wrap;margin-top:22px}
.ld-community-link{position:relative;margin-top:14px;font-size:12px;color:#767d9c;
  font-family:'SF Mono',Menlo,Consolas,monospace}

.ld-footer{padding:36px 20px 50px;text-align:center;display:flex;flex-direction:column;align-items:center;gap:8px;
  border-top:1px solid #ffffff0d;font-weight:900}
.ld-footer-sub{font-size:12px;color:#767d9c;font-weight:500}
.ld-footer-actions{margin-top:8px}

/* ============ AUTH ============ */
.rdm-auth-wrap{position:relative;flex:1;display:grid;place-items:center;padding:24px;overflow:hidden}
.rdm-auth-bg{position:absolute;inset:0;background:
  radial-gradient(600px 400px at 20% 20%,#7c6bff33,transparent),
  radial-gradient(500px 400px at 80% 80%,#4dd0ff22,transparent);animation:fadeIn 1s}
.rdm-auth-card{position:relative;width:100%;max-width:400px;padding:34px 28px;border-radius:24px;
  display:flex;flex-direction:column;gap:14px;z-index:1;animation:slideUp .5s}
.rdm-auth-back{position:absolute;top:14px;left:14px;display:flex;align-items:center;gap:6px;background:none;
  border:1px solid var(--border);color:var(--muted);border-radius:9px;padding:6px 10px;font-size:12px;cursor:pointer}
.rdm-auth-back:hover{color:var(--text);border-color:var(--accent)}
.rdm-auth-logo{text-align:center;margin-bottom:6px}
.rdm-auth-logo .rdm-logo-orb{margin:0 auto 12px}
.rdm-auth-logo h1{margin:0;font-size:26px;letter-spacing:.5px}
.rdm-auth-discord{display:flex;justify-content:center}
.rdm-tab-switch{display:flex;background:var(--bg);border:1px solid var(--border);border-radius:12px;padding:4px}
.rdm-tab-switch button{flex:1;padding:9px;border:none;background:none;color:var(--muted);font-weight:600;
  border-radius:9px;cursor:pointer;transition:.2s}
.rdm-tab-switch button.active{background:var(--accent);color:#fff}
.rdm-input,.rdm-textarea,select.rdm-input{width:100%;padding:13px 15px;background:var(--bg);
  border:1px solid var(--border);border-radius:12px;color:var(--text);font-size:14px;outline:none;
  transition:.2s;font-family:inherit}
.rdm-input:focus,.rdm-textarea:focus{border-color:var(--accent);box-shadow:0 0 0 3px #7c6bff33}
.rdm-error{background:#ff5c6a22;color:#ff9aa5;padding:10px 12px;border-radius:10px;font-size:13px}
.rdm-btn-primary{padding:13px;border:none;border-radius:12px;background:var(--accent);color:#fff;
  font-weight:700;cursor:pointer;font-size:14px;transition:.2s;display:flex;align-items:center;justify-content:center;gap:8px}
.rdm-btn-primary:hover{filter:brightness(1.1);transform:translateY(-1px)}
.rdm-btn-primary:disabled{opacity:.6;cursor:not-allowed}
.rdm-btn-ghost{padding:9px 14px;border:1px solid var(--border);border-radius:10px;background:none;color:var(--text);
  cursor:pointer;font-size:13px;display:inline-flex;align-items:center;gap:7px}
.rdm-btn-ghost:hover{background:var(--panel2)}
.rdm-btn-ghost.danger:hover{color:var(--danger);border-color:var(--danger)}
.rdm-muted{color:var(--muted);font-size:13px}
.rdm-fineprint{font-size:11.5px;text-align:center;margin:0}

/* ============ SIDEBAR ============ */
.rdm-sidebar{width:280px;flex-shrink:0;background:var(--panel);border-right:1px solid var(--border);
  display:flex;flex-direction:column;padding:14px;gap:12px;transition:transform .3s cubic-bezier(.2,.8,.2,1)}
.rdm-sidebar-head{display:flex;align-items:center;justify-content:space-between}
.rdm-brand{display:flex;align-items:center;gap:9px;font-weight:800;font-size:16px;cursor:pointer}
.rdm-nav-switch{display:flex;gap:4px;background:var(--bg);border-radius:12px;padding:4px}
.rdm-nav-switch button{flex:1;display:flex;align-items:center;justify-content:center;gap:6px;padding:9px;
  border:none;background:none;color:var(--muted);font-weight:700;font-size:12.5px;border-radius:9px;cursor:pointer;transition:.2s}
.rdm-nav-switch button.active{background:var(--accent);color:#fff}
.rdm-newchat{display:flex;align-items:center;justify-content:center;gap:8px;padding:11px;
  border:1px solid var(--border);border-radius:12px;background:var(--panel2);color:var(--text);
  font-weight:600;cursor:pointer;transition:.2s}
.rdm-newchat:hover{transform:translateY(-1px)}
.rdm-chat-list{flex:1;overflow-y:auto;display:flex;flex-direction:column;gap:4px;margin:-4px}
.rdm-chat-list::-webkit-scrollbar{width:6px}
.rdm-chat-list::-webkit-scrollbar-thumb{background:var(--border);border-radius:3px}
.rdm-empty-list{color:var(--muted);font-size:13px;text-align:center;padding:20px 0}
.rdm-chat-item{display:flex;align-items:center;gap:6px;padding:10px 11px;border-radius:11px;cursor:pointer;transition:.15s}
.rdm-chat-item:hover{background:var(--panel2)}
.rdm-chat-item.active{background:#7c6bff22;box-shadow:inset 0 0 0 1px #7c6bff55}
.rdm-chat-title{flex:1;font-size:13.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.rdm-chat-actions{display:flex;gap:2px;opacity:0;transition:.15s}
.rdm-chat-item:hover .rdm-chat-actions{opacity:1}
.rdm-mini-btn{border:none;background:none;color:var(--muted);cursor:pointer;padding:4px;border-radius:6px;display:grid;place-items:center}
.rdm-mini-btn:hover{background:var(--bg);color:var(--text)}
.rdm-mini-btn.danger:hover{color:var(--danger)}
.rdm-rename-input{flex:1;background:var(--bg);border:1px solid var(--accent);border-radius:7px;color:var(--text);
  padding:4px 7px;font-size:13px;outline:none}
.rdm-sidebar-discord{padding-top:4px}
.rdm-sidebar-foot{display:flex;gap:8px;align-items:center;border-top:1px solid var(--border);padding-top:12px}
.rdm-user-chip{flex:1;display:flex;align-items:center;gap:9px;padding:8px;border:none;background:none;
  color:var(--text);cursor:pointer;border-radius:11px;transition:.15s}
.rdm-user-chip:hover{background:var(--panel2)}
.rdm-user-meta{flex:1;text-align:left;overflow:hidden}
.rdm-user-name{font-size:13px;font-weight:600;display:flex;align-items:center;gap:6px}
.rdm-user-email{display:block;font-size:11px;color:var(--muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.rdm-pro-tag{font-size:9px;background:linear-gradient(90deg,#ffb347,#ff5c8a);color:#fff;padding:1px 5px;border-radius:5px;font-weight:800}
.rdm-logout-btn{border:1px solid var(--border);background:none;color:var(--muted);padding:9px;border-radius:10px;
  cursor:pointer;display:grid;place-items:center}
.rdm-logout-btn:hover{color:var(--danger);border-color:var(--danger)}

.rdm-avatar{width:32px;height:32px;border-radius:10px;flex-shrink:0;display:grid;place-items:center;font-size:12px;font-weight:700}
.rdm-avatar.ai{background:linear-gradient(135deg,var(--accent),var(--accent2));color:#fff}
.rdm-avatar.user{background:var(--panel2);color:var(--text);border:1px solid var(--border)}
.rdm-avatar.sm{width:30px;height:30px;border-radius:9px}
.rdm-avatar.pro{box-shadow:0 0 0 2px #ffb347}

/* ============ MAIN ============ */
.rdm-main{flex:1;display:flex;flex-direction:column;min-width:0}
.rdm-header{display:flex;align-items:center;gap:12px;padding:12px 18px;border-bottom:1px solid var(--border);
  background:#12131fcc;backdrop-filter:blur(10px)}
.rdm-header-right{margin-left:auto;display:flex;align-items:center;gap:8px}
.rdm-panel-title{display:flex;align-items:center;gap:8px;font-weight:800;font-size:14.5px}
.rdm-luau-pill{display:flex;align-items:center;gap:6px;font-size:11.5px;font-weight:800;color:#4dd0ff;
  background:#4dd0ff18;border:1px solid #4dd0ff33;padding:6px 11px;border-radius:20px}
.rdm-icon-btn{border:none;background:none;color:var(--text);cursor:pointer;padding:9px;border-radius:10px;
  display:grid;place-items:center;transition:.15s}
.rdm-icon-btn:hover{background:var(--panel2)}
.rdm-menu-btn{display:none}
.rdm-pro-pill{display:flex;align-items:center;gap:6px;padding:8px 13px;border-radius:20px;border:1px solid var(--border);
  background:var(--panel2);color:var(--text);cursor:pointer;font-size:12.5px;font-weight:700;transition:.2s}
.rdm-pro-pill:hover{transform:translateY(-1px)}

.rdm-model-select{position:relative}
.rdm-model-trigger{display:flex;align-items:center;gap:9px;padding:9px 14px;border-radius:12px;background:var(--panel2);
  border:1px solid var(--border);color:var(--text);cursor:pointer;font-weight:600;font-size:13.5px;transition:.2s}
.rdm-model-trigger:hover{filter:brightness(1.1)}
.rdm-model-dot{width:8px;height:8px;border-radius:50%;background:#7bed9f;box-shadow:0 0 8px #7bed9f}
.rdm-model-menu{position:absolute;top:calc(100% + 8px);left:0;width:290px;border-radius:14px;padding:6px;z-index:50;
  display:flex;flex-direction:column;gap:2px;background:var(--panel)}
.rdm-model-item{text-align:left;padding:11px 12px;border:none;background:none;color:var(--text);cursor:pointer;
  border-radius:10px;display:flex;flex-direction:column;gap:2px;transition:.15s}
.rdm-model-item:hover{background:var(--panel2)}
.rdm-model-item.sel{background:#7c6bff22;box-shadow:inset 0 0 0 1px #7c6bff55}
.rdm-model-item-main{display:flex;align-items:center;justify-content:space-between}
.rdm-model-item-label{font-weight:700;font-size:13.5px}
.rdm-model-item-desc{font-size:11.5px;color:var(--muted)}
.rdm-lock-mini{font-size:11px;opacity:.8}

.rdm-scroll{flex:1;overflow-y:auto;scroll-behavior:smooth}
.rdm-scroll::-webkit-scrollbar{width:8px}
.rdm-scroll::-webkit-scrollbar-thumb{background:var(--border);border-radius:4px}
.rdm-messages{max-width:840px;margin:0 auto;padding:26px 18px 10px;display:flex;flex-direction:column;gap:20px}
.rdm-msg-row{display:flex;gap:12px;align-items:flex-start}
.rdm-msg-row.user{flex-direction:row-reverse}
.rdm-bubble{max-width:82%;padding:13px 16px;border-radius:16px;line-height:1.6;font-size:14.5px;
  word-wrap:break-word;overflow-wrap:break-word}
.rdm-bubble.ai{background:var(--panel);border:1px solid var(--border);border-top-left-radius:5px}
.rdm-bubble.user{background:linear-gradient(135deg,var(--accent),var(--accent2));color:#fff;border-top-right-radius:5px}
.rdm-msg-img{max-width:240px;border-radius:11px;margin-bottom:8px;display:block}
.rdm-msg-foot{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-top:10px;padding-top:9px;
  border-top:1px solid var(--border)}
.rdm-msg-foot.user{border-top-color:#ffffff33}
.rdm-msg-tag{display:flex;align-items:center;gap:6px;font-size:11px;color:var(--muted);font-weight:600}
.rdm-msg-tools{margin-left:auto;display:flex;gap:6px;flex-wrap:wrap}
.rdm-bubble.user .rdm-copy-btn{background:#ffffff1f;border-color:#ffffff33;color:#fff}
.rdm-bubble.user .rdm-copy-btn:hover{background:#ffffff33}

/* ---------- MARKDOWN ---------- */
.rdm-md h1{font-size:22px;margin:8px 0}
.rdm-md h2{font-size:18px;margin:8px 0}
.rdm-md h3{font-size:16px;margin:6px 0}
.rdm-md ul{margin:6px 0;padding-left:20px}
.rdm-md li{margin:3px 0}
.rdm-md blockquote{margin:8px 0;padding:8px 12px;border-left:3px solid var(--accent);background:#ffffff08;border-radius:0 8px 8px 0}
.rdm-md .rdm-inline{background:var(--bg);padding:2px 6px;border-radius:5px;font-size:13px;
  font-family:'SF Mono',Menlo,Consolas,monospace}
.rdm-code-wrap{background:var(--bg);border:1px solid var(--border);border-radius:12px;margin:12px 0;overflow:hidden}
.rdm-code-head{display:flex;align-items:center;gap:8px;padding:7px 10px;border-bottom:1px solid var(--border);background:#ffffff06}
.rdm-code-lang{font-size:10.5px;font-weight:800;letter-spacing:.6px;text-transform:uppercase;color:#4dd0ff}
.rdm-code-target{font-size:10px;color:var(--muted);border-left:1px solid var(--border);padding-left:8px}
.rdm-code-actions{margin-left:auto;display:flex;gap:6px}
.rdm-code-btn{border:1px solid var(--border);background:var(--panel2);color:var(--text);font-size:10.5px;
  font-weight:700;padding:4px 9px;border-radius:7px;cursor:pointer;transition:.15s}
.rdm-code-btn:hover{background:var(--accent);border-color:var(--accent);color:#fff}
.rdm-code-btn.ok{background:#7bed9f22;border-color:#7bed9f66;color:#7bed9f}
.rdm-code{margin:0;overflow-x:auto;background:none;border:none}
.rdm-code code{display:block;padding:12px;font-family:'SF Mono',Menlo,Consolas,monospace;font-size:12.5px;
  line-height:1.6;white-space:pre}

/* ---------- TYPING ---------- */
.rdm-typing{display:flex;gap:5px;padding:4px 2px}
.rdm-typing span{width:8px;height:8px;border-radius:50%;background:var(--accent);animation:typing 1.2s infinite ease-in-out}
.rdm-typing span:nth-child(2){animation-delay:.2s}
.rdm-typing span:nth-child(3){animation-delay:.4s}
@keyframes typing{0%,60%,100%{transform:translateY(0);opacity:.5}30%{transform:translateY(-6px);opacity:1}}

/* ---------- THINKING / SEARCHING ---------- */
.th-bubble{min-width:min(420px,86vw)}
.th-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:9px}
.th-title{font-size:13.5px;font-weight:800;letter-spacing:.2px}
.th-timer{font-size:11px;color:var(--muted);font-variant-numeric:tabular-nums}
.th-progress{height:3px;border-radius:3px;background:var(--border);overflow:hidden;margin-bottom:12px}
.th-progress-fill{height:100%;border-radius:3px;background:linear-gradient(90deg,#7c6bff,#4dd0ff);
  transition:width .6s cubic-bezier(.3,.9,.3,1)}
.th-steps{display:flex;flex-direction:column;gap:7px}
.th-step{display:flex;align-items:center;gap:9px;font-size:12.8px;transition:.3s}
.th-step.idle{opacity:.32}
.th-step.done{opacity:.62}
.th-step.active{opacity:1}
.th-step-icon{width:18px;height:18px;border-radius:6px;display:grid;place-items:center;flex-shrink:0;
  background:var(--panel2);border:1px solid var(--border);color:var(--muted)}
.th-step-icon.done{background:#7bed9f22;border-color:#7bed9f55;color:#7bed9f}
.th-step-icon.active{color:#fff;background:linear-gradient(135deg,#7c6bff,#4dd0ff);border-color:transparent;
  box-shadow:0 0 12px #7c6bff88}
.th-step-icon.search.active{background:linear-gradient(135deg,#00e0c6,#4dd0ff)}
.th-step-icon.code.active{background:linear-gradient(135deg,#ff7a59,#ff5c8a)}
.th-step-label{font-weight:600}
.th-step.active .th-step-label{background:linear-gradient(90deg,#eef0f8,#8f97c4,#eef0f8);background-size:200% 100%;
  -webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;
  animation:rainbowShift 2.2s linear infinite}
@keyframes ellip{0%{content:""}33%{content:"."}66%{content:".."}100%{content:"..."}}
.th-ellipsis::after{content:"...";animation:ellip 1.2s steps(1) infinite}
.th-spin{animation:spinGlow 1.1s linear infinite}
.th-scan{flex:1;height:2px;border-radius:2px;background:var(--border);overflow:hidden;max-width:70px}
@keyframes scanMove{0%{transform:translateX(-100%)}100%{transform:translateX(200%)}}
.th-scan-bar{display:block;width:40%;height:100%;background:linear-gradient(90deg,transparent,#4dd0ff,transparent);
  animation:scanMove 1s linear infinite}
.th-trace{margin-top:12px;padding-top:10px;border-top:1px dashed var(--border);display:flex;flex-direction:column;gap:4px}
.th-trace-line{font-size:11.5px;color:var(--muted);font-family:'SF Mono',Menlo,Consolas,monospace;
  animation:fadeInUp .45s both}

/* ---------- WELCOME ---------- */
.rdm-welcome{text-align:center;padding:44px 20px;display:flex;flex-direction:column;align-items:center;gap:8px}
.rdm-welcome .rdm-logo-orb{margin-bottom:8px}
.rdm-welcome h1{margin:6px 0;font-size:30px}
.rdm-welcome-chips{display:flex;flex-wrap:wrap;gap:7px;justify-content:center;margin-top:12px}
.rdm-wchip{display:inline-flex;align-items:center;gap:6px;font-size:11.5px;font-weight:700;color:var(--muted);
  background:var(--panel);border:1px solid var(--border);padding:6px 11px;border-radius:20px}
.rdm-welcome-discord{margin-top:24px}
.rdm-preset-tabs{display:flex;gap:4px;background:var(--bg);border:1px solid var(--border);border-radius:12px;
  padding:4px;margin-top:22px}
.rdm-preset-tabs button{padding:8px 16px;border:none;background:none;color:var(--muted);font-weight:700;
  font-size:12.5px;border-radius:9px;cursor:pointer;transition:.2s}
.rdm-preset-tabs button.active{background:var(--accent);color:#fff}
.rdm-suggest-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:16px;width:100%;max-width:560px}
.rdm-suggest-card{padding:14px;border:1px solid var(--border);border-radius:13px;background:var(--panel);
  font-size:13.5px;text-align:left;cursor:pointer;transition:.2s;display:flex;align-items:center;gap:10px}
.rdm-suggest-card span{flex:1}
.rdm-suggest-card:hover{border-color:var(--accent);transform:translateY(-2px);background:var(--panel2)}

/* ---------- COMPOSER ---------- */
.rdm-composer-wrap{padding:12px 18px 16px;max-width:840px;margin:0 auto;width:100%}
.rdm-composer{border-radius:20px;padding:10px 12px}
.rdm-toolbar{display:flex;align-items:center;gap:3px;padding-bottom:8px;margin-bottom:6px;
  border-bottom:1px solid var(--border);flex-wrap:wrap}
.rdm-toolbar-note{margin-left:auto;font-size:10.5px;font-weight:800;letter-spacing:.4px;color:var(--muted);text-transform:uppercase}
.rdm-tool-btn{border:none;background:none;color:var(--muted);cursor:pointer;padding:7px;border-radius:8px;
  display:grid;place-items:center;transition:.15s}
.rdm-tool-btn:hover{background:var(--panel2);color:var(--accent)}
.rdm-input-row{display:flex;align-items:flex-end;gap:8px}
.rdm-textarea-input{flex:1;background:none;border:none;color:var(--text);resize:none;outline:none;font-size:14.5px;
  font-family:inherit;line-height:1.5;max-height:200px;padding:8px 4px}
.rdm-send-btn{border:none;background:var(--panel2);color:var(--muted);cursor:pointer;width:40px;height:40px;
  border-radius:12px;display:grid;place-items:center;transition:.2s;flex-shrink:0}
.rdm-send-btn.ready{background:var(--accent);color:#fff}
.rdm-send-btn.ready:hover{transform:translateY(-1px) scale(1.05)}
.rdm-send-btn:disabled{cursor:not-allowed}
.rdm-disclaimer{text-align:center;font-size:11px;color:var(--muted);margin-top:10px}

.rdm-attach-preview{display:flex;align-items:center;gap:10px;padding:8px;background:var(--bg);
  border:1px solid var(--border);border-radius:12px;margin-bottom:8px;position:relative}
.rdm-attach-preview img{width:44px;height:44px;object-fit:cover;border-radius:8px}
.rdm-attach-name{font-size:12.5px;color:var(--muted);flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.rdm-attach-x{border:none;background:var(--panel2);color:var(--text);cursor:pointer;width:26px;height:26px;
  border-radius:7px;display:grid;place-items:center}
.rdm-attach-x:hover{background:var(--danger);color:#fff}

/* ============ ASSET STORE ============ */
.st-root{max-width:1080px;margin:0 auto;padding:26px 20px 60px}
.st-head{display:flex;align-items:flex-end;justify-content:space-between;gap:16px;flex-wrap:wrap;margin-bottom:20px}
.st-head-actions{display:flex;gap:10px;align-items:center;flex-wrap:wrap}
.st-title{margin:0 0 4px;font-size:28px;font-weight:900}
.st-controls{display:flex;gap:10px;margin-bottom:20px;flex-wrap:wrap}
.st-search{flex:1;min-width:220px;display:flex;align-items:center;gap:9px;padding:11px 14px;background:var(--panel);
  border:1px solid var(--border);border-radius:13px;color:var(--muted)}
.st-search input{flex:1;background:none;border:none;outline:none;color:var(--text);font-size:13.5px;font-family:inherit}
.st-select{padding:11px 13px;background:var(--panel);border:1px solid var(--border);border-radius:13px;
  color:var(--text);font-size:13px;outline:none;cursor:pointer;font-family:inherit}
.st-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(270px,1fr));gap:14px}
.st-card{background:var(--panel);border:1px solid var(--border);border-radius:18px;overflow:hidden;transition:.25s;
  display:flex;flex-direction:column}
.st-card:hover{transform:translateY(-3px);border-color:#7c6bff66;box-shadow:0 18px 40px #00000055}
.st-card-thumb{height:96px;display:grid;place-items:center;color:#fff;position:relative;
  background:linear-gradient(135deg,#7c6bff,#4dd0ff)}
.st-card-thumb[data-cat="GUI Kits"]{background:linear-gradient(135deg,#f857a6,#ff5858)}
.st-card-thumb[data-cat="Weapons"]{background:linear-gradient(135deg,#ff7a59,#7c2bff)}
.st-card-thumb[data-cat="Maps"]{background:linear-gradient(135deg,#11998e,#38ef7d)}
.st-card-thumb[data-cat="VFX"]{background:linear-gradient(135deg,#7f00ff,#e100ff)}
.st-card-thumb[data-cat="Vehicles"]{background:linear-gradient(135deg,#f7971e,#ffd200)}
.st-card-cat{position:absolute;bottom:8px;left:10px;font-size:10.5px;font-weight:800;background:#00000055;
  padding:3px 9px;border-radius:7px;backdrop-filter:blur(4px)}
.st-card-body{padding:14px;display:flex;flex-direction:column;gap:8px;flex:1}
.st-card-name{font-weight:800;font-size:15px}
.st-card-desc{font-size:12.5px;color:var(--muted);line-height:1.5;display:-webkit-box;-webkit-line-clamp:3;
  -webkit-box-orient:vertical;overflow:hidden}
.st-tags{display:flex;flex-wrap:wrap;gap:5px}
.st-tag{font-size:10.5px;color:#4dd0ff;background:#4dd0ff14;border:1px solid #4dd0ff2e;padding:2px 7px;border-radius:6px}
.st-meta{display:flex;flex-wrap:wrap;gap:5px;font-size:11px;color:var(--muted);margin-top:auto}
.st-card-actions{display:flex;gap:6px;padding-top:10px;border-top:1px solid var(--border);flex-wrap:wrap}
.st-dl{flex:1;min-width:130px;display:flex;align-items:center;justify-content:center;gap:7px;border:none;
  border-radius:10px;padding:9px;background:var(--accent);color:#fff;font-weight:700;font-size:12.5px;cursor:pointer;transition:.2s}
.st-dl:hover{filter:brightness(1.12)}
.st-like,.st-ask,.st-del{display:flex;align-items:center;gap:5px;border:1px solid var(--border);background:none;
  color:var(--muted);border-radius:10px;padding:9px 10px;cursor:pointer;font-size:11.5px;font-weight:700;transition:.2s}
.st-like:hover,.st-ask:hover{color:var(--text);border-color:var(--accent)}
.st-like.on{color:#ff5c8a;border-color:#ff5c8a55;background:#ff5c8a14}
.st-del:hover{color:var(--danger);border-color:var(--danger)}
.st-empty{text-align:center;padding:70px 20px;display:flex;flex-direction:column;align-items:center;gap:10px}
.st-empty-orb{width:64px;height:64px;border-radius:20px;display:grid;place-items:center;color:#fff;
  background:linear-gradient(135deg,var(--accent),var(--accent2));margin-bottom:6px}
.st-empty h3{margin:0;font-size:19px}
.st-publish{position:relative;width:100%;max-width:520px;max-height:88vh;overflow-y:auto;border-radius:22px;padding:26px}
.st-publish-title{display:flex;align-items:center;gap:10px;margin:0 0 6px;font-size:20px}
.st-row2{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.st-drop{display:flex;align-items:center;gap:12px;margin-top:16px;padding:16px;border:1.5px dashed var(--border);
  border-radius:14px;cursor:pointer;transition:.2s;color:var(--muted)}
.st-drop:hover{border-color:var(--accent);color:var(--text);background:#7c6bff0d}
.st-drop-name{font-size:13.5px;font-weight:700;color:var(--text)}
.st-drop-size{font-size:11.5px;color:var(--muted)}

/* ============ MODALS / SETTINGS ============ */
.rdm-modal-overlay{position:fixed;inset:0;background:rgba(4,5,10,.7);backdrop-filter:blur(4px);
  display:grid;place-items:center;z-index:100;padding:20px}
.rdm-modal-x{position:absolute;top:16px;right:16px;border:none;background:var(--panel2);color:var(--text);
  cursor:pointer;width:34px;height:34px;border-radius:10px;display:grid;place-items:center;transition:.2s}
.rdm-modal-x:hover{background:var(--danger);color:#fff;transform:rotate(90deg)}
.rdm-settings-card{width:100%;max-width:540px;max-height:86vh;overflow-y:auto;border-radius:22px;padding:24px}
.rdm-settings-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:18px}
.rdm-settings-head h2{margin:0;font-size:20px}
.rdm-settings-tabs{display:flex;gap:4px;background:var(--bg);border-radius:12px;padding:4px;margin-bottom:20px}
.rdm-settings-tabs button{flex:1;padding:9px;border:none;background:none;color:var(--muted);font-weight:600;
  border-radius:9px;cursor:pointer;font-size:12.5px;transition:.2s}
.rdm-settings-tabs button.active{background:var(--accent);color:#fff}
.rdm-settings-discord{display:flex;align-items:center;justify-content:space-between;gap:12px;
padding:14px 0 4px;border-top:1px solid var(--border);margin-top:10px}
.rdm-field-label{display:block;font-size:13px;font-weight:600;margin-bottom:9px;color:var(--muted)}
.rdm-theme-row{display:flex;gap:8px;margin-bottom:18px}
.rdm-theme-chip{flex:1;padding:12px;border-radius:11px;border:2px solid var(--border);cursor:pointer;
  text-transform:capitalize;font-size:12.5px;font-weight:600;color:var(--text);transition:.2s}
.rdm-theme-chip.midnight{background:linear-gradient(135deg,#12131f,#7c6bff44)}
.rdm-theme-chip.aurora{background:linear-gradient(135deg,#0a1b24,#00e0c644)}
.rdm-theme-chip.mono{background:linear-gradient(135deg,#141416,#88888844)}
.rdm-theme-chip.sel{border-color:var(--accent)}
.rdm-speed-chip{flex:1;padding:11px;border-radius:11px;border:2px solid var(--border);background:var(--panel2);
  cursor:pointer;text-transform:capitalize;font-size:12.5px;font-weight:700;color:var(--text);transition:.2s}
.rdm-speed-chip.sel{border-color:var(--accent);background:#7c6bff22}
.rdm-toggle-row{display:flex;align-items:center;justify-content:space-between;padding:13px 0;
  border-bottom:1px solid var(--border);cursor:pointer}
.rdm-toggle-label{font-size:14px;font-weight:600}
.rdm-toggle-desc{font-size:12px;color:var(--muted);margin-top:2px}
.rdm-switch{width:44px;height:25px;border-radius:13px;background:var(--border);position:relative;transition:.2s;flex-shrink:0}
.rdm-switch.on{background:var(--accent)}
.rdm-switch-knob{position:absolute;top:3px;left:3px;width:19px;height:19px;border-radius:50%;background:#fff;
  transition:.25s cubic-bezier(.2,.8,.2,1)}
.rdm-switch.on .rdm-switch-knob{left:22px}
.rdm-range{width:100%;accent-color:var(--accent)}
.rdm-settings-pro{text-align:center;display:flex;flex-direction:column;align-items:center;gap:10px;padding:10px 0}
.rdm-ds-list{display:flex;flex-direction:column;gap:9px;margin-bottom:16px}
.rdm-ds-row{display:flex;align-items:center;gap:10px;font-size:12px}
.rdm-ds-key{width:88px;color:var(--muted);text-transform:capitalize}
.rdm-ds-bar{flex:1;height:6px;border-radius:4px;background:var(--border);overflow:hidden}
.rdm-ds-fill{height:100%;background:linear-gradient(90deg,#7c6bff,#4dd0ff)}
.rdm-ds-kb{width:64px;text-align:right;color:var(--muted);font-variant-numeric:tabular-nums}
.rdm-ds-actions{display:flex;gap:8px;flex-wrap:wrap}
.rdm-pro-card{width:100%;max-width:540px;max-height:88vh;overflow-y:auto;border-radius:24px;padding:32px 26px;position:relative}
.rdm-pro-hero{text-align:center;margin-bottom:22px}
.rdm-crown{color:#ffb347;display:flex;justify-content:center;margin-bottom:6px}
.rdm-pro-hero h2{margin:6px 0;font-size:26px}
.rdm-discount-badge{display:inline-block;margin-top:12px;padding:7px 16px;border-radius:20px;
  background:linear-gradient(90deg,#ff5c8a,#ffb347);color:#fff;font-weight:800;font-size:13px}
.rdm-pro-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:20px}
.rdm-pro-feature{display:flex;gap:12px;padding:15px;background:var(--panel2);border:1px solid var(--border);border-radius:14px}
.rdm-pro-feature-icon{font-size:24px;line-height:1}
.rdm-pro-feature-title{font-weight:700;font-size:14px;margin-bottom:3px}
.rdm-pro-feature-desc{font-size:12px;color:var(--muted);line-height:1.4}
.rdm-pro-updates{background:var(--panel2);border:1px solid var(--border);border-radius:14px;padding:16px;margin-bottom:18px}
.rdm-pro-updates strong{font-size:14px}
.rdm-pro-updates p{margin:6px 0 0}
.rdm-pro-loginnote{background:#ffb34722;color:#ffcf8a;padding:13px;border-radius:12px;text-align:center;font-size:13px;font-weight:600}
.rdm-pro-active{background:#7bed9f22;color:#7bed9f;padding:13px;border-radius:12px;text-align:center;font-weight:700}
.rdm-pro-buy{width:100%;font-size:15px;padding:15px}
.rdm-pro-discord{display:flex;justify-content:center;margin-top:14px}/* ---------- TOAST ---------- */
.rdm-toast{position:fixed;bottom:26px;left:50%;transform:translateX(-50%);z-index:200;
  background:var(--panel);border:1px solid var(--border);color:var(--text);padding:12px 20px;
  border-radius:14px;font-size:13px;font-weight:600;box-shadow:0 18px 44px #00000077}.rdm-backdrop{position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:40;display:none}/* ---------- RESPONSIVE ---------- */
@media (max-width:960px){
  .ld-feature-grid{grid-template-columns:1fr 1fr}
}
@media (max-width:860px){
  .rdm-sidebar{position:fixed;top:0;left:0;bottom:0;z-index:50;transform:translateX(-100%);
    box-shadow:8px 0 40px rgba(0,0,0,.5)}
  .rdm-sidebar.open{transform:translateX(0)}
  .rdm-backdrop{display:block}
  .rdm-menu-btn{display:grid}
  .rdm-bubble{max-width:90%}
  .th-bubble{min-width:auto;width:100%}
  .rdm-suggest-grid{grid-template-columns:1fr}
  .rdm-pro-grid{grid-template-columns:1fr}
  .rdm-model-name{max-width:120px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .rdm-welcome h1{font-size:24px}
  .ld-nav-links .ld-nav-link{display:none}
  .ld-note{display:none}
  .st-row2{grid-template-columns:1fr}
  .rdm-copy-btn.header span{display:none}
  .rdm-copy-btn.header{padding:9px}
}
@media (max-width:600px){
  .ld-feature-grid{grid-template-columns:1fr}
  .ld-nav{padding:11px 14px}
  .ld-nav-links .dc-btn.dc-nav span{display:none}
  .ld-nav-links .dc-btn.dc-nav{padding:9px}
  .ld-hero{padding:48px 16px 30px}
  .ld-composer{padding:12px}
  .ld-community-card{padding:32px 18px}
  .st-head{flex-direction:column;align-items:stretch}
  .st-head-actions{justify-content:space-between}
  .st-grid{grid-template-columns:1fr}
}
@media (max-width:480px){
  .rdm-header{padding:10px 12px;gap:8px}
  .rdm-luau-pill{display:none}
  .rdm-composer-wrap{padding:8px 10px 12px}
  .rdm-messages{padding:16px 12px 8px}
  .rdm-model-menu{width:min(290px,calc(100vw - 40px))}
  .rdm-toolbar-note{display:none}
  .rdm-msg-tools{width:100%;margin-left:0}
}
`;
