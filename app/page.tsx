"use client";

// app/page.tsx — RDM-ENGINE Chat Interface
// Built completely to route all chats through your Render / OpenRouter backend.

import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";

/* ============================================================================
   CONSTANTS / CONFIG
   ============================================================================ */

const IDENTITY = {
  name: "RDM-ENGINE",
  tagline: "Made & developed by RDM-ENGINE",
  systemBase:
    "You are RDM-ENGINE, an advanced AI assistant. You were made and developed by RDM-ENGINE. " +
    "Always identify yourself as being created by RDM-ENGINE. Be helpful, precise, and thoughtful.",
};

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

const LS_KEYS = {
  users: "rdm.users.v1",
  session: "rdm.session.v1",
  chats: "rdm.chats.v1",
  activeChat: "rdm.activeChat.v1",
  draftPrefix: "rdm.draft.",
  settings: "rdm.settings.v1",
};

const DEFAULT_SETTINGS = {
  theme: "midnight", 
  rainbow: true,
  sound: true,
  animations: true,
  systemPrompt: IDENTITY.systemBase,
  temperature: 0.7,
  model: "rdm-2.1-common",
};

// Interactive status steps shown before each AI response.
const STATUS_STEPS = ["Thinking...", "Searching Through Asset Store..."];

/* ============================================================================
   LOCALSTORAGE HELPERS (rock-solid, guarded)
   ============================================================================ */

const store = {
  get(key: string, fallback: any) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch {
      return fallback;
    }
  },
  set(key: string, val: any) {
    try {
      localStorage.setItem(key, JSON.stringify(val));
    } catch {}
  },
  raw(key: string, fallback = "") {
    try {
      return localStorage.getItem(key) ?? fallback;
    } catch {
      return fallback;
    }
  },
  setRaw(key: string, val: string) {
    try {
      localStorage.setItem(key, val);
    } catch {}
  },
  remove(key: string) {
    try {
      localStorage.removeItem(key);
    } catch {}
  },
};

/* ============================================================================
   LIGHTWEIGHT PASSWORD HASHING
   ============================================================================ */

async function hashPassword(password: string, salt: string) {
  const enc = new TextEncoder();
  const data = enc.encode(`${salt}::${password}`);
  if (window.crypto?.subtle) {
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

/* ============================================================================
   MARKDOWN → HTML 
   ============================================================================ */

function escapeHtml(str: string) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function renderMarkdown(md: string) {
  if (!md) return "";
  const codeBlocks: string[] = [];
  let text = md.replace(/```(\w*)\n?([\s\S]*?)```/g, (_, lang, code) => {
    const idx = codeBlocks.length;
    codeBlocks.push(
      `<pre class="rdm-code"><div class="rdm-code-lang">${
        escapeHtml(lang) || "code"
      }</div><code>${escapeHtml(code.replace(/\n$/, ""))}</code></pre>`
    );
    return `\u0000CODE${idx}\u0000`;
  });

  text = escapeHtml(text);

  text = text.replace(/^### (.*)$/gm, "<h3>$1</h3>");
  text = text.replace(/^## (.*)$/gm, "<h2>$1</h2>");
  text = text.replace(/^# (.*)$/gm, "<h1>$1</h1>");
  text = text.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  text = text.replace(/\*(.+?)\*/g, "<em>$1</em>");
  text = text.replace(/`([^`]+?)`/g, '<code class="rdm-inline">$1</code>');
  text = text.replace(/^(?:- |\* )(.*)$/gm, "<li>$1</li>");
  text = text.replace(/(<li>[\s\S]*?<\/li>)/g, (m) =>
    m.includes("</li>\n") || true ? `<ul>${m.replace(/\n/g, "")}</ul>` : m
  );
  text = text.replace(/\n/g, "<br/>");
  text = text.replace(/\u0000CODE(\d+)\u0000/g, (_, i) => codeBlocks[+i]);
  return text;
}

/* ============================================================================
   AUTO CHAT TITLE GENERATOR
   ============================================================================ */

function generateChatTitle(firstPrompt: string) {
  if (!firstPrompt) return "New Chat";
  const cleaned = firstPrompt
    .replace(/[#*`_>~-]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  const stop = new Set([
    "the","a","an","and","or","but","to","of","in","on","for","with",
    "how","what","why","can","you","please","i","me","my","is","are","do",
  ]);
  const words = cleaned.split(" ").filter((w) => w.length > 1);
  const keyWords = words.filter((w) => !stop.has(w.toLowerCase())).slice(0, 5);
  const title = (keyWords.length ? keyWords : words.slice(0, 5)).join(" ");
  const finalTitle = title.length > 42 ? title.slice(0, 42) + "…" : title;
  return finalTitle
    ? finalTitle.charAt(0).toUpperCase() + finalTitle.slice(1)
    : "New Chat";
}

/* ============================================================================
   SOUND FX
   ============================================================================ */

function playBlip(freq = 660, dur = 0.08, enabled = true) {
  if (!enabled) return;
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
};

/* ============================================================================
   AUTH SCREEN
   ============================================================================ */

function AuthScreen({ onAuth, rainbow }: any) {
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
      const users = store.get(LS_KEYS.users, {});
      if (mode === "register") {
        if (!name.trim()) return setError("Please enter your name.");
        if (password.length < 6)
          return setError("Password must be at least 6 characters.");
        if (password !== confirm)
          return setError("Passwords do not match.");
        if (users[em]) return setError("An account with this email exists.");
        const salt = makeSalt();
        const hash = await hashPassword(password, salt);
        users[em] = { name: name.trim(), email: em, salt, hash, pro: false };
        store.set(LS_KEYS.users, users);
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
        <div className="rdm-auth-logo">
          <div className={`rdm-logo-orb ${rainbow ? "rainbow-orb" : ""}`}>
            <Icon path={Icons.sparkle} size={26} />
          </div>
          <h1 className={rainbow ? "rainbow-text" : ""}>RDM-ENGINE</h1>
          <p className="rdm-muted">{IDENTITY.tagline}</p>
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

        <button
          className={`rdm-btn-primary ${rainbow ? "rainbow-btn" : ""}`}
          disabled={busy}
        >
          {busy ? "Please wait…" : mode === "login" ? "Sign In" : "Create Account"}
        </button>

        <p className="rdm-muted rdm-fineprint">
          Your credentials are stored securely on this device only.
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
                {m.pro && !isPro && (
                  <span className="rdm-lock-mini">🔒</span>
                )}
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
   PRO UPGRADE MODAL
   ============================================================================ */

function ProModal({ open, onClose, user, onUpgrade, rainbow }: any) {
  if (!open) return null;
  const loggedIn = !!user;

  const features = [
    { icon: "⚡", title: "25% More Usage", desc: "Higher limits so your flow never stops." },
    { icon: "🧬", title: "Unlock RDM 2.4 XOR", desc: "Ultra thinking, ultra-fast code, GUI mastery." },
    { icon: "🚀", title: "Faster, Reliable Coding", desc: "Priority routing tuned for developers." },
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
          <p className="rdm-muted">
            Supercharge your RDM-ENGINE experience.
          </p>
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
            Preview upcoming features and updates, plus exclusive{" "}
            <em>weekend</em> and <em>annual</em> discounts for Pro members.
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
  if (!open) return null;

  const update = (patch: any) => setSettings((s: any) => ({ ...s, ...patch }));

  return (
    <div className="rdm-modal-overlay fade-in" onClick={onClose}>
      <div
        className="rdm-settings-card glass slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="rdm-settings-head">
          <h2>Settings</h2>
          <button className="rdm-icon-btn" onClick={onClose} aria-label="Close">
            <Icon path={Icons.x} size={20} />
          </button>
        </div>

        <div className="rdm-settings-tabs">
          {[
            ["studio", "Studio"],
            ["chat", "Chat Adjuster"],
            ["pro", "RDM Pro"],
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
                    className={`rdm-theme-chip ${t} ${
                      settings.theme === t ? "sel" : ""
                    }`}
                    onClick={() => update({ theme: t })}
                  >
                    {t}
                  </button>
                ))}
              </div>

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
            </div>
          )}

          {tab === "chat" && (
            <div className="fade-in">
              <label className="rdm-field-label">
                System Instructions (Chat Adjuster)
              </label>
              <textarea
                className="rdm-textarea"
                rows={6}
                value={settings.systemPrompt}
                onChange={(e) => update({ systemPrompt: e.target.value })}
              />
              <p className="rdm-muted rdm-fineprint">
                Defines RDM-ENGINE's behavior. Identity as RDM-ENGINE is always
                preserved.
              </p>

              <label className="rdm-field-label" style={{ marginTop: 16 }}>
                Creativity: {settings.temperature.toFixed(2)}
              </label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={settings.temperature}
                onChange={(e) =>
                  update({ temperature: parseFloat(e.target.value) })
                }
                className="rdm-range"
              />

              <button
                className="rdm-btn-ghost"
                style={{ marginTop: 14 }}
                onClick={() => update({ systemPrompt: IDENTITY.systemBase })}
              >
                Reset to Default
              </button>
            </div>
          )}

          {tab === "pro" && (
            <div className="fade-in rdm-settings-pro">
              <div className={`rdm-crown ${rainbow ? "rainbow-text" : ""}`}>
                <Icon path={Icons.crown} size={34} />
              </div>
              <h3>{user?.pro ? "RDM Pro Active" : "Upgrade to RDM Pro"}</h3>
              <p className="rdm-muted">
                25% more usage, the XOR model, faster coding, and early feature
                previews.
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
              <button className="rdm-link-btn" onClick={() => {
                onClose();
                onOpenPro();
              }}>
                Click to see the usage.
              </button>
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
   FORMATTING TOOLBAR
   ============================================================================ */

function FormatToolbar({ onFormat, rainbow }: any) {
  const tools = [
    { key: "bold", icon: Icons.bold, title: "Bold", wrap: ["**", "**"] },
    {
      key: "header",
      icon: Icons.header,
      title: "Huge Bold (Header)",
      wrap: ["# ", ""],
      line: true,
    },
    { key: "italic", icon: Icons.italic, title: "Italic", wrap: ["*", "*"] },
    {
      key: "code",
      icon: Icons.code,
      title: "Code Block",
      wrap: ["\n```\n", "\n```\n"],
    },
    {
      key: "list",
      icon: Icons.list,
      title: "Bullet List",
      wrap: ["- ", ""],
      line: true,
    },
    {
      key: "quote",
      icon: Icons.quote,
      title: "Quote",
      wrap: ["> ", ""],
      line: true,
    },
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
    </div>
  );
}

/* ============================================================================
   CHAT MESSAGE BUBBLE
   ============================================================================ */

function MessageBubble({ msg, rainbow }: any) {
  const isUser = msg.role === "user";
  return (
    <div className={`rdm-msg-row ${isUser ? "user" : "ai"} fade-in-up`}>
      {!isUser && (
        <div className={`rdm-avatar ai ${rainbow ? "rainbow-orb" : ""}`}>
          <Icon path={Icons.sparkle} size={16} />
        </div>
      )}
      <div className={`rdm-bubble ${isUser ? "user" : "ai"}`}>
        {msg.image && (
          <img src={msg.image} alt="attachment" className="rdm-msg-img" />
        )}
        <div
          className="rdm-md"
          dangerouslySetInnerHTML={{ __html: renderMarkdown(msg.content) }}
        />
      </div>
      {isUser && <div className="rdm-avatar user">You</div>}
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
          <span /><span /><span />
        </div>
      </div>
    </div>
  );
}

/* ============================================================================
   STATUS STEPS ("Thinking..." / "Searching Through Asset Store...")
   ============================================================================ */

function StatusSteps({ step, rainbow }: any) {
  const isSearch = /search/i.test(step);
  return (
    <div className="rdm-msg-row ai fade-in">
      <div className={`rdm-avatar ai ${rainbow ? "rainbow-orb" : ""}`}>
        <Icon path={Icons.sparkle} size={16} />
      </div>
      <div className="rdm-bubble ai">
        <div className="rdm-status-step">
          {isSearch ? (
            <Icon path={Icons.search} size={15} className="rdm-status-spin" />
          ) : (
            <span className="rdm-status-dot" />
          )}
          <span className={`rdm-status-text ${rainbow ? "rainbow-text" : ""}`}>
            {step}
          </span>
        </div>
      </div>
    </div>
  );
}

/* ============================================================================
   MAIN APP
   ============================================================================ */

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [authChecked, setAuthChecked] = useState(false);

  const [settings, setSettings] = useState(() =>
    store.get(LS_KEYS.settings, DEFAULT_SETTINGS)
  );

  const [chats, setChats] = useState<any[]>(() => store.get(LS_KEYS.chats, []));
  const [activeId, setActiveId] = useState(() =>
    store.get(LS_KEYS.activeChat, null)
  );

  const [input, setInput] = useState("");
  const [attachment, setAttachment] = useState<any>(null); 
  const [sending, setSending] = useState(false);
  const [statusStep, setStatusStep] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [proOpen, setProOpen] = useState(false);
  const [renamingId, setRenamingId] = useState(null);
  const [renameVal, setRenameVal] = useState("");

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const rainbow = settings.rainbow;

  useEffect(() => {
    const session = store.get(LS_KEYS.session, null);
    if (session?.email) {
      const users = store.get(LS_KEYS.users, {});
      const rec = users[session.email];
      if (rec) setUser({ name: rec.name, email: rec.email, pro: !!rec.pro });
    }
    setAuthChecked(true);
  }, []);

  useEffect(() => store.set(LS_KEYS.settings, settings), [settings]);
  useEffect(() => store.set(LS_KEYS.chats, chats), [chats]);
  useEffect(() => store.set(LS_KEYS.activeChat, activeId), [activeId]);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", settings.theme);
    document.documentElement.setAttribute(
      "data-anim",
      settings.animations ? "on" : "off"
    );
  }, [settings.theme, settings.animations]);

  useEffect(() => {
    if (!user) return;
    const draft = store.raw(LS_KEYS.draftPrefix + (activeId || "new"), "");
    setInput(draft);
  }, [activeId, user]);

  useEffect(() => {
    if (!user) return;
    const t = setTimeout(() => {
      store.setRaw(LS_KEYS.draftPrefix + (activeId || "new"), input);
    }, 300);
    return () => clearTimeout(t);
  }, [input, activeId, user]);

  const activeChat = useMemo(
    () => chats.find((c) => c.id === activeId) || null,
    [chats, activeId]
  );

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: settings.animations ? "smooth" : "auto",
    });
  }, [activeChat?.messages?.length, sending, statusStep, settings.animations]);

  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = Math.min(ta.scrollHeight, 200) + "px";
  }, [input]);

  const handleAuth = (u: any) => {
    setUser(u);
    store.set(LS_KEYS.session, { email: u.email });
    playBlip(880, 0.1, settings.sound);
  };

  const handleLogout = () => {
    setUser(null);
    store.remove(LS_KEYS.session);
    setSidebarOpen(false);
  };

  const newChat = () => {
    setActiveId(null);
    setInput("");
    setAttachment(null);
    setSidebarOpen(false);
  };

  const deleteChat = (id: string) => {
    setChats((cs) => cs.filter((c) => c.id !== id));
    store.remove(LS_KEYS.draftPrefix + id);
    if (activeId === id) setActiveId(null);
  };

  const commitRename = (id: string) => {
    if (renameVal.trim())
      setChats((cs) =>
        cs.map((c) => (c.id === id ? { ...c, title: renameVal.trim() } : c))
      );
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
    const placeholder = selected || (tool.line ? "" : tool.title.toLowerCase());
    const next = before + pre + placeholder + post + after;
    setInput(next);
    requestAnimationFrame(() => {
      ta.focus();
      const cursor = start + pre.length + placeholder.length;
      ta.setSelectionRange(cursor, cursor);
    });
  };

  const onPickImage = (e: any) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = () =>
      setAttachment({ dataUrl: reader.result, name: file.name });
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  // Runs the interactive status steps before the AI response.
  const runStatusSteps = async () => {
    for (const step of STATUS_STEPS) {
      setStatusStep(step);
      await new Promise((r) => setTimeout(r, settings.animations ? 850 : 0));
    }
    setStatusStep(null);
  };

  const send = async () => {
    const text = input.trim();
    if ((!text && !attachment) || sending) return;

    playBlip(660, 0.07, settings.sound);

    const userMsg = {
      id: crypto.randomUUID?.() || String(Date.now()),
      role: "user",
      content: text,
      image: attachment?.dataUrl || null,
      ts: Date.now(),
    };

    let chatId = activeId;
    let isNew = false;

    setChats((prev) => {
      if (chatId) {
        return prev.map((c) =>
          c.id === chatId
            ? { ...c, messages: [...c.messages, userMsg], updated: Date.now() }
            : c
        );
      }
      isNew = true;
      chatId = crypto.randomUUID?.() || String(Date.now());
      const newC = {
        id: chatId,
        title: generateChatTitle(text || attachment?.name || "New Chat"),
        model: settings.model,
        messages: [userMsg],
        created: Date.now(),
        updated: Date.now(),
      };
      return [newC, ...prev];
    });

    if (isNew) setActiveId(chatId);
    setInput("");
    setAttachment(null);
    store.remove(LS_KEYS.draftPrefix + (activeId || "new"));
    setSending(true);

    // Show the required interactive status animations first.
    await runStatusSteps();

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: settings.model,
          system: settings.systemPrompt,
          temperature: settings.temperature,
          messages: activeChat ? [...activeChat.messages, userMsg] : [userMsg],
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to reach Render engine via OpenRouter.");
      }

      const data = await response.json();
      const reply = data.reply || data.choices?.[0]?.message?.content || "No response received.";

      const aiMsg = {
        id: crypto.randomUUID?.() || String(Date.now() + 1),
        role: "assistant",
        content: reply,
        ts: Date.now(),
      };

      setChats((prev) =>
        prev.map((c) =>
          c.id === chatId
            ? { ...c, messages: [...c.messages, aiMsg], updated: Date.now() }
            : c
        )
      );
      playBlip(990, 0.09, settings.sound);
    } catch (err) {
      const aiMsg = {
        id: String(Date.now() + 2),
        role: "assistant",
        content:
          "⚠️ Failed to communicate with Render backend or OpenRouter key is missing/invalid.",
        ts: Date.now(),
      };
      setChats((prev) =>
        prev.map((c) =>
          c.id === chatId ? { ...c, messages: [...c.messages, aiMsg] } : c
        )
      );
    } finally {
      setSending(false);
      setStatusStep(null);
    }
  };

  const onKeyDown = (e: any) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  const handleUpgrade = () => {
    if (!user) return;
    
    // Displays the payment method notice
    alert("No Payment Method Yet.");
  };

  const needPro = () => setProOpen(true);

  if (!authChecked) {
    return (
      <div className="rdm-root rdm-boot">
        <div className={`rdm-logo-orb ${rainbow ? "rainbow-orb" : ""} big`}>
          <Icon path={Icons.sparkle} size={30} />
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="rdm-root">
        <StyleSheet />
        <AuthScreen onAuth={handleAuth} rainbow={rainbow} />
      </div>
    );
  }

  return (
    <div className="rdm-root">
      <StyleSheet />
      {sidebarOpen && (
        <div className="rdm-backdrop" onClick={() => setSidebarOpen(false)} />
      )}
      <aside className={`rdm-sidebar ${sidebarOpen ? "open" : ""}`}>
        <div className="rdm-sidebar-head">
          <div className="rdm-brand">
            <div className={`rdm-logo-orb sm ${rainbow ? "rainbow-orb" : ""}`}>
              <Icon path={Icons.sparkle} size={16} />
            </div>
            <span className={rainbow ? "rainbow-text" : ""}>RDM-ENGINE</span>
          </div>
        </div>

        <button
          className={`rdm-newchat ${rainbow ? "rainbow-btn" : ""}`}
          onClick={newChat}
        >
          <Icon path={Icons.plus} size={16} /> New Chat
        </button>

        <div className="rdm-chat-list">
          {chats.length === 0 && (
            <div className="rdm-empty-list">No chats yet.</div>
          )}
          {chats.map((c) => (
            <div
              key={c.id}
              className={`rdm-chat-item ${c.id === activeId ? "active" : ""}`}
              onClick={() => {
                setActiveId(c.id);
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

        <div className="rdm-sidebar-foot">
          <button
            className="rdm-user-chip"
            onClick={() => setSettingsOpen(true)}
          >
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
          <button
            className="rdm-icon-btn rdm-menu-btn"
            onClick={() => setSidebarOpen(true)}
          >
            <Icon path={Icons.menu} size={20} />
          </button>

          <ModelSelector
            current={settings.model}
            onChange={(m: any) => setSettings((s: any) => ({ ...s, model: m }))}
            isPro={!!user.pro}
            onNeedPro={needPro}
            rainbow={rainbow}
          />

          <div className="rdm-header-right">
            {!user.pro && (
              <button
                className={`rdm-pro-pill ${rainbow ? "rainbow-btn" : ""}`}
                onClick={() => setProOpen(true)}
              >
                <Icon path={Icons.crown} size={14} /> Get Pro
              </button>
            )}
            <button
              className="rdm-icon-btn"
              onClick={() => setSettingsOpen(true)}
              title="Settings"
            >
              <Icon path={Icons.settings} size={19} />
            </button>
          </div>
        </header>

        <div className="rdm-scroll" ref={scrollRef}>
          <div className="rdm-messages">
            {!activeChat || activeChat.messages.length === 0 ? (
              <WelcomeState rainbow={rainbow} name={user.name} />
            ) : (
              activeChat.messages.map((m: any) => (
                <MessageBubble key={m.id} msg={m} rainbow={rainbow} />
              ))
            )}
            {statusStep ? (
              <StatusSteps step={statusStep} rainbow={rainbow} />
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
                <button
                  className="rdm-attach-x"
                  onClick={() => setAttachment(null)}
                >
                  <Icon path={Icons.x} size={14} />
                </button>
              </div>
            )}

            <div className="rdm-input-row">
              <button
                className="rdm-icon-btn"
                onClick={() => fileRef.current?.click()}
                title="Attach image"
              >
                <Icon path={Icons.image} size={19} />
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                hidden
                onChange={onPickImage}
              />
              <textarea
                ref={textareaRef}
                className="rdm-textarea-input"
                placeholder="Message RDM-ENGINE…"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={onKeyDown}
                rows={1}
              />
              <button
                className={`rdm-send-btn ${rainbow ? "rainbow-btn" : ""} ${
                  input.trim() || attachment ? "ready" : ""
                }`}
                onClick={send}
                disabled={sending || (!input.trim() && !attachment)}
              >
                <Icon path={Icons.send} size={18} />
              </button>
            </div>
          </div>
          <div className="rdm-disclaimer">
            RDM-ENGINE — made & developed by RDM-ENGINE. Press{" "}
            <kbd>Enter</kbd> to send, <kbd>Shift</kbd>+<kbd>Enter</kbd> for new
            line.
          </div>
        </div>
      </main>

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
   WELCOME STATE
   ============================================================================ */

function WelcomeState({ rainbow, name }: any) {
  const suggestions = [
    "Build me a landing page in React",
    "Explain quantum computing simply",
    "Write a poem about the ocean",
    "Debug my Python function",
  ];
  return (
    <div className="rdm-welcome fade-in">
      <div className={`rdm-logo-orb big ${rainbow ? "rainbow-orb" : ""}`}>
        <Icon path={Icons.sparkle} size={34} />
      </div>
      <h1 className={rainbow ? "rainbow-text" : ""}>
        Hello{name ? `, ${name.split(" ")[0]}` : ""} 👋
      </h1>
      <p className="rdm-muted">
        I'm <strong>RDM-ENGINE</strong>, made & developed by RDM-ENGINE. How can
        I help you today?
      </p>
      <div className="rdm-suggest-grid">
        {suggestions.map((s) => (
          <div className="rdm-suggest-card" key={s}>
            {s}
          </div>
        ))}
      </div>
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
  --accent2:#4dd0ff; --danger:#ff5c6a; --radius:16px;
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
html,body,#root{height:100%;margin:0}
body{background:var(--bg);color:var(--text);
  font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif}
kbd{background:var(--panel2);border:1px solid var(--border);border-radius:5px;
  padding:1px 5px;font-size:11px}

.rdm-root{display:flex;height:100vh;width:100%;overflow:hidden;
  background:radial-gradient(1200px 600px at 80% -10%, var(--bg2), var(--bg))}
.rdm-boot{align-items:center;justify-content:center}

[data-anim="off"] *{animation:none!important;transition:none!important}

/* ---------- RAINBOW ---------- */
@keyframes rainbowShift{0%{background-position:0% 50%}50%{background-position:100% 50%}100%{background-position:0% 50%}}
@keyframes spinGlow{0%{transform:rotate(0)}100%{transform:rotate(360deg)}}
.rainbow-text{background:linear-gradient(90deg,#ff5c8a,#ffb347,#ffe66d,#7bed9f,#4dd0ff,#7c6bff,#ff5c8a);
  background-size:300% 100%;-webkit-background-clip:text;background-clip:text;
  -webkit-text-fill-color:transparent;animation:rainbowShift 6s linear infinite;font-weight:800}
.rainbow-btn{background:linear-gradient(90deg,#ff5c8a,#7c6bff,#4dd0ff,#7bed9f,#ff5c8a)!important;
  background-size:300% 100%!important;animation:rainbowShift 5s linear infinite;
  color:#fff!important;border:none!important}
.rainbow-btn:hover{filter:brightness(1.1)}
.rainbow-border{position:relative}
.rainbow-border::before{content:"";position:absolute;inset:-2px;border-radius:inherit;
  background:linear-gradient(90deg,#ff5c8a,#ffb347,#7bed9f,#4dd0ff,#7c6bff,#ff5c8a);
  background-size:300% 100%;animation:rainbowShift 5s linear infinite;z-index:-1;
  filter:blur(1px);opacity:.85}
.rainbow-border-soft{border:1px solid transparent;
  background:linear-gradient(var(--panel),var(--panel)) padding-box,
  linear-gradient(90deg,#ff5c8a55,#7c6bff55,#4dd0ff55) border-box}
.rainbow-orb{background:conic-gradient(from 0deg,#ff5c8a,#ffb347,#ffe66d,#7bed9f,#4dd0ff,#7c6bff,#ff5c8a)!important;
  animation:spinGlow 8s linear infinite;box-shadow:0 0 24px #7c6bff88}

/* ---------- GLASS ---------- */
.glass{background:linear-gradient(180deg,rgba(255,255,255,.04),rgba(255,255,255,.01));
  backdrop-filter:blur(14px);border:1px solid var(--border)}

/* ---------- ANIMATIONS ---------- */
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

/* ---------- LOGO ORB ---------- */
.rdm-logo-orb{width:52px;height:52px;border-radius:16px;display:grid;place-items:center;
  background:linear-gradient(135deg,var(--accent),var(--accent2));color:#fff;
  box-shadow:0 8px 30px rgba(124,107,255,.35)}
.rdm-logo-orb.sm{width:28px;height:28px;border-radius:9px}
.rdm-logo-orb.big{width:72px;height:72px;border-radius:22px}

/* ---------- AUTH ---------- */
.rdm-auth-wrap{position:relative;flex:1;display:grid;place-items:center;padding:24px;overflow:hidden}
.rdm-auth-bg{position:absolute;inset:0;background:
  radial-gradient(600px 400px at 20% 20%,#7c6bff33,transparent),
  radial-gradient(500px 400px at 80% 80%,#4dd0ff22,transparent);animation:fadeIn 1s}
.rdm-auth-card{width:100%;max-width:400px;padding:34px 28px;border-radius:24px;
  display:flex;flex-direction:column;gap:14px;z-index:1;animation:slideUp .5s}
.rdm-auth-logo{text-align:center;margin-bottom:6px}
.rdm-auth-logo .rdm-logo-orb{margin:0 auto 12px}
.rdm-auth-logo h1{margin:0;font-size:26px;letter-spacing:.5px}
.rdm-tab-switch{display:flex;background:var(--bg);border:1px solid var(--border);
  border-radius:12px;padding:4px;margin-bottom:6px}
.rdm-tab-switch button{flex:1;padding:9px;border:none;background:none;color:var(--muted);
  font-weight:600;border-radius:9px;cursor:pointer;transition:.2s}
.rdm-tab-switch button.active{background:var(--accent);color:#fff}
.rdm-input,.rdm-textarea{width:100%;padding:13px 15px;background:var(--bg);
  border:1px solid var(--border);border-radius:12px;color:var(--text);font-size:14px;
  outline:none;transition:.2s;font-family:inherit}
.rdm-input:focus,.rdm-textarea:focus{border-color:var(--accent);box-shadow:0 0 0 3px var(--accent)33}
.rdm-error{background:#ff5c6a22;color:#ff9aa5;padding:10px 12px;border-radius:10px;font-size:13px}
.rdm-btn-primary{padding:13px;border:none;border-radius:12px;background:var(--accent);
  color:#fff;font-weight:700;cursor:pointer;font-size:14px;transition:.2s;
  display:flex;align-items:center;justify-content:center;gap:8px}
.rdm-btn-primary:hover{filter:brightness(1.1);transform:translateY(-1px)}
.rdm-btn-primary:disabled{opacity:.6;cursor:not-allowed}
.rdm-btn-ghost{padding:9px 14px;border:1px solid var(--border);border-radius:10px;
  background:none;color:var(--text);cursor:pointer;font-size:13px}
.rdm-btn-ghost:hover{background:var(--panel2)}
.rdm-muted{color:var(--muted);font-size:13px}
.rdm-fineprint{font-size:11.5px;text-align:center;margin:0}

/* ---------- SIDEBAR ---------- */
.rdm-sidebar{width:280px;flex-shrink:0;background:var(--panel);border-right:1px solid var(--border);
  display:flex;flex-direction:column;padding:14px;gap:12px;transition:transform .3s cubic-bezier(.2,.8,.2,1)}
.rdm-sidebar-head{display:flex;align-items:center;justify-content:space-between}
.rdm-brand{display:flex;align-items:center;gap:9px;font-weight:800;font-size:16px}
.rdm-newchat{display:flex;align-items:center;justify-content:center;gap:8px;padding:11px;
  border:1px solid var(--border);border-radius:12px;background:var(--panel2);color:var(--text);
  font-weight:600;cursor:pointer;transition:.2s}
.rdm-newchat:hover{transform:translateY(-1px)}
.rdm-chat-list{flex:1;overflow-y:auto;display:flex;flex-direction:column;gap:4px;margin:-4px}
.rdm-chat-list::-webkit-scrollbar{width:6px}
.rdm-chat-list::-webkit-scrollbar-thumb{background:var(--border);border-radius:3px}
.rdm-empty-list{color:var(--muted);font-size:13px;text-align:center;padding:20px 0}
.rdm-chat-item{display:flex;align-items:center;gap:6px;padding:10px 11px;border-radius:11px;
  cursor:pointer;transition:.15s;position:relative}
.rdm-chat-item:hover{background:var(--panel2)}
.rdm-chat-item.active{background:var(--accent)22;box-shadow:inset 0 0 0 1px var(--accent)55}
.rdm-chat-title{flex:1;font-size:13.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.rdm-chat-actions{display:flex;gap:2px;opacity:0;transition:.15s}
.rdm-chat-item:hover .rdm-chat-actions{opacity:1}
.rdm-mini-btn{border:none;background:none;color:var(--muted);cursor:pointer;padding:4px;
  border-radius:6px;display:grid;place-items:center}
.rdm-mini-btn:hover{background:var(--bg);color:var(--text)}
.rdm-mini-btn.danger:hover{color:var(--danger)}
.rdm-rename-input{flex:1;background:var(--bg);border:1px solid var(--accent);border-radius:7px;
  color:var(--text);padding:4px 7px;font-size:13px;outline:none}
.rdm-sidebar-foot{display:flex;gap:8px;align-items:center;border-top:1px solid var(--border);padding-top:12px}
.rdm-user-chip{flex:1;display:flex;align-items:center;gap:9px;padding:8px;border:none;
  background:none;color:var(--text);cursor:pointer;border-radius:11px;transition:.15s}
.rdm-user-chip:hover{background:var(--panel2)}
.rdm-user-meta{flex:1;text-align:left;overflow:hidden}
.rdm-user-name{display:block;font-size:13px;font-weight:600;display:flex;align-items:center;gap:6px}
.rdm-user-email{display:block;font-size:11px;color:var(--muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.rdm-pro-tag{font-size:9px;background:linear-gradient(90deg,#ffb347,#ff5c8a);color:#fff;
  padding:1px 5px;border-radius:5px;font-weight:800}
.rdm-logout-btn{border:1px solid var(--border);background:none;color:var(--muted);
  padding:9px;border-radius:10px;cursor:pointer;display:grid;place-items:center}
.rdm-logout-btn:hover{color:var(--danger);border-color:var(--danger)}

/* ---------- AVATARS ---------- */
.rdm-avatar{width:32px;height:32px;border-radius:10px;flex-shrink:0;display:grid;place-items:center;
  font-size:12px;font-weight:700}
.rdm-avatar.ai{background:linear-gradient(135deg,var(--accent),var(--accent2));color:#fff}
.rdm-avatar.user{background:var(--panel2);color:var(--text);border:1px solid var(--border)}
.rdm-avatar.sm{width:30px;height:30px;border-radius:9px}
.rdm-avatar.pro{box-shadow:0 0 0 2px #ffb347}

/* ---------- MAIN ---------- */
.rdm-main{flex:1;display:flex;flex-direction:column;min-width:0}
.rdm-header{display:flex;align-items:center;gap:12px;padding:12px 18px;
  border-bottom:1px solid var(--border);background:var(--bg2)cc;backdrop-filter:blur(10px)}
.rdm-header-right{margin-left:auto;display:flex;align-items:center;gap:8px}
.rdm-icon-btn{border:none;background:none;color:var(--text);cursor:pointer;padding:9px;
  border-radius:10px;display:grid;place-items:center;transition:.15s}
.rdm-icon-btn:hover{background:var(--panel2)}
.rdm-menu-btn{display:none}
.rdm-pro-pill{display:flex;align-items:center;gap:6px;padding:8px 13px;border-radius:20px;
  border:1px solid var(--border);background:var(--panel2);color:var(--text);cursor:pointer;
  font-size:12.5px;font-weight:700;transition:.2s}
.rdm-pro-pill:hover{transform:translateY(-1px)}

/* ---------- MODEL SELECTOR ---------- */
.rdm-model-select{position:relative}
.rdm-model-trigger{display:flex;align-items:center;gap:9px;padding:9px 14px;border-radius:12px;
  background:var(--panel2);border:1px solid var(--border);color:var(--text);cursor:pointer;
  font-weight:600;font-size:13.5px;transition:.2s}
.rdm-model-trigger:hover{filter:brightness(1.1)}
.rdm-model-dot{width:8px;height:8px;border-radius:50%;background:#7bed9f;box-shadow:0 0 8px #7bed9f}
.rdm-model-menu{position:absolute;top:calc(100% + 8px);left:0;width:290px;border-radius:14px;
  padding:6px;z-index:50;display:flex;flex-direction:column;gap:2px}
.rdm-model-item{text-align:left;padding:11px 12px;border:none;background:none;color:var(--text);
  cursor:pointer;border-radius:10px;display:flex;flex-direction:column;gap:2px;transition:.15s}
.rdm-model-item:hover{background:var(--panel2)}
.rdm-model-item.sel{background:var(--accent)22;box-shadow:inset 0 0 0 1px var(--accent)55}
.rdm-model-item-main{display:flex;align-items:center;justify-content:space-between}
.rdm-model-item-label{font-weight:700;font-size:13.5px}
.rdm-model-item-desc{font-size:11.5px;color:var(--muted)}
.rdm-lock-mini{font-size:11px;opacity:.8}

/* ---------- SCROLL / MESSAGES ---------- */
.rdm-scroll{flex:1;overflow-y:auto;scroll-behavior:smooth}
.rdm-scroll::-webkit-scrollbar{width:8px}
.rdm-scroll::-webkit-scrollbar-thumb{background:var(--border);border-radius:4px}
.rdm-messages{max-width:820px;margin:0 auto;padding:26px 18px 10px;display:flex;flex-direction:column;gap:20px}
.rdm-msg-row{display:flex;gap:12px;align-items:flex-start}
.rdm-msg-row.user{flex-direction:row-reverse}
.rdm-bubble{max-width:80%;padding:13px 16px;border-radius:16px;line-height:1.6;font-size:14.5px;
  word-wrap:break-word;overflow-wrap:break-word}
.rdm-bubble.ai{background:var(--panel);border:1px solid var(--border);border-top-left-radius:5px}
.rdm-bubble.user{background:linear-gradient(135deg,var(--accent),var(--accent2));color:#fff;border-top-right-radius:5px}
.rdm-msg-img{max-width:240px;border-radius:11px;margin-bottom:8px;display:block}

/* ---------- MARKDOWN ---------- */
.rdm-md h1{font-size:22px;margin:8px 0}
.rdm-md h2{font-size:18px;margin:8px 0}
.rdm-md h3{font-size:16px;margin:6px 0}
.rdm-md ul{margin:6px 0;padding-left:20px}
.rdm-md li{margin:3px 0}
.rdm-md .rdm-inline{background:var(--bg);padding:2px 6px;border-radius:5px;font-size:13px;
  font-family:'SF Mono',Menlo,Consolas,monospace}
.rdm-code{background:var(--bg);border:1px solid var(--border);border-radius:11px;padding:0;
  overflow-x:auto;margin:10px 0;position:relative}
.rdm-code-lang{font-size:10.5px;color:var(--muted);padding:6px 12px;border-bottom:1px solid var(--border);
  text-transform:uppercase;letter-spacing:.5px}
.rdm-code code{display:block;padding:12px;font-family:'SF Mono',Menlo,Consolas,monospace;
  font-size:12.5px;line-height:1.6;white-space:pre}

/* ---------- TYPING ---------- */
.rdm-typing{display:flex;gap:5px;padding:4px 2px}
.rdm-typing span{width:8px;height:8px;border-radius:50%;background:var(--accent);
  animation:typing 1.2s infinite ease-in-out}
.rdm-typing span:nth-child(2){animation-delay:.2s}
.rdm-typing span:nth-child(3){animation-delay:.4s}
@keyframes typing{0%,60%,100%{transform:translateY(0);opacity:.5}30%{transform:translateY(-6px);opacity:1}}

/* ---------- STATUS STEPS ---------- */
.rdm-status-step{display:flex;align-items:center;gap:9px;padding:2px 0}
.rdm-status-text{font-size:13.5px;font-weight:600;color:var(--text)}
.rdm-status-dot{width:9px;height:9px;border-radius:50%;background:var(--accent);
  box-shadow:0 0 10px var(--accent);animation:statusPing 1s ease-in-out infinite}
.rdm-status-spin{color:var(--accent2);animation:statusSpin 1.1s linear infinite}
@keyframes statusPing{0%,100%{transform:scale(.85);opacity:.6}50%{transform:scale(1.15);opacity:1}}
@keyframes statusSpin{from{transform:rotate(0)}to{transform:rotate(360deg)}}

/* ---------- WELCOME ---------- */
.rdm-welcome{text-align:center;padding:50px 20px;display:flex;flex-direction:column;align-items:center;gap:8px}
.rdm-welcome .rdm-logo-orb{margin-bottom:8px}
.rdm-welcome h1{margin:6px 0;font-size:30px}
.rdm-suggest-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:24px;width:100%;max-width:520px}
.rdm-suggest-card{padding:14px;border:1px solid var(--border);border-radius:13px;background:var(--panel);
  font-size:13.5px;text-align:left;cursor:pointer;transition:.2s}
.rdm-suggest-card:hover{border-color:var(--accent);transform:translateY(-2px);background:var(--panel2)}

/* ---------- COMPOSER ---------- */
.rdm-composer-wrap{padding:12px 18px 16px;max-width:820px;margin:0 auto;width:100%}
.rdm-composer{border-radius:20px;padding:10px 12px}
.rdm-toolbar{display:flex;gap:3px;padding-bottom:8px;margin-bottom:6px;border-bottom:1px solid var(--border);
  flex-wrap:wrap}
.rdm-tool-btn{border:none;background:none;color:var(--muted);cursor:pointer;padding:7px;
  border-radius:8px;display:grid;place-items:center;transition:.15s}
.rdm-tool-btn:hover{background:var(--panel2);color:var(--accent)}
.rdm-input-row{display:flex;align-items:flex-end;gap:8px}
.rdm-textarea-input{flex:1;background:none;border:none;color:var(--text);resize:none;outline:none;
  font-size:14.5px;font-family:inherit;line-height:1.5;max-height:200px;padding:8px 4px}
.rdm-send-btn{border:none;background:var(--panel2);color:var(--muted);cursor:pointer;
  width:40px;height:40px;border-radius:12px;display:grid;place-items:center;transition:.2s;flex-shrink:0}
.rdm-send-btn.ready{background:var(--accent);color:#fff}
.rdm-send-btn.ready:hover{transform:translateY(-1px) scale(1.05)}
.rdm-send-btn:disabled{cursor:not-allowed}
.rdm-disclaimer{text-align:center;font-size:11px;color:var(--muted);margin-top:10px}

/* ---------- ATTACHMENT ---------- */
.rdm-attach-preview{display:flex;align-items:center;gap:10px;padding:8px;background:var(--bg);
  border:1px solid var(--border);border-radius:12px;margin-bottom:8px;position:relative}
.rdm-attach-preview img{width:44px;height:44px;object-fit:cover;border-radius:8px}
.rdm-attach-name{font-size:12.5px;color:var(--muted);flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.rdm-attach-x{border:none;background:var(--panel2);color:var(--text);cursor:pointer;
  width:26px;height:26px;border-radius:7px;display:grid;place-items:center}
.rdm-attach-x:hover{background:var(--danger);color:#fff}

/* ---------- MODALS ---------- */
.rdm-modal-overlay{position:fixed;inset:0;background:rgba(4,5,10,.7);backdrop-filter:blur(4px);
  display:grid;place-items:center;z-index:100;padding:20px}
.rdm-modal-x{position:absolute;top:16px;right:16px;border:none;background:var(--panel2);
  color:var(--text);cursor:pointer;width:34px;height:34px;border-radius:10px;display:grid;place-items:center;transition:.2s}
.rdm-modal-x:hover{background:var(--danger);color:#fff;transform:rotate(90deg)}

/* ---------- SETTINGS ---------- */
.rdm-settings-card{width:100%;max-width:520px;max-height:86vh;overflow-y:auto;border-radius:22px;padding:24px}
.rdm-settings-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:18px}
.rdm-settings-head h2{margin:0;font-size:20px}
.rdm-settings-tabs{display:flex;gap:4px;background:var(--bg);border-radius:12px;padding:4px;margin-bottom:20px}
.rdm-settings-tabs button{flex:1;padding:9px;border:none;background:none;color:var(--muted);
  font-weight:600;border-radius:9px;cursor:pointer;font-size:13px;transition:.2s}
.rdm-settings-tabs button.active{background:var(--accent);color:#fff}
.rdm-field-label{display:block;font-size:13px;font-weight:600;margin-bottom:9px;color:var(--muted)}
.rdm-theme-row{display:flex;gap:8px;margin-bottom:18px}
.rdm-theme-chip{flex:1;padding:12px;border-radius:11px;border:2px solid var(--border);
  cursor:pointer;text-transform:capitalize;font-size:12.5px;font-weight:600;color:var(--text);transition:.2s}
.rdm-theme-chip.midnight{background:linear-gradient(135deg,#12131f,#7c6bff44)}
.rdm-theme-chip.aurora{background:linear-gradient(135deg,#0a1b24,#00e0c644)}
.rdm-theme-chip.mono{background:linear-gradient(135deg,#141416,#88888844)}
.rdm-theme-chip.sel{border-color:var(--accent)}
.rdm-toggle-row{display:flex;align-items:center;justify-content:space-between;padding:13px 0;
  border-bottom:1px solid var(--border);cursor:pointer}
.rdm-toggle-label{font-size:14px;font-weight:600}
.rdm-toggle-desc{font-size:12px;color:var(--muted);margin-top:2px}
.rdm-switch{width:44px;height:25px;border-radius:13px;background:var(--border);position:relative;transition:.2s;flex-shrink:0}
.rdm-switch.on{background:var(--accent)}
.rdm-switch-knob{position:absolute;top:3px;left:3px;width:19px;height:19px;border-radius:50%;
  background:#fff;transition:.25s cubic-bezier(.2,.8,.2,1)}
.rdm-switch.on .rdm-switch-knob{left:22px}
.rdm-range{width:100%;accent-color:var(--accent)}
.rdm-settings-pro{text-align:center;display:flex;flex-direction:column;align-items:center;gap:10px;padding:10px 0}
.rdm-link-btn{background:none;border:none;color:var(--accent);cursor:pointer;font-size:13px;text-decoration:underline}

/* ---------- PRO MODAL ---------- */
.rdm-pro-card{width:100%;max-width:540px;max-height:88vh;overflow-y:auto;border-radius:24px;
  padding:32px 26px;position:relative}
.rdm-pro-hero{text-align:center;margin-bottom:22px}
.rdm-crown{color:#ffb347;display:flex;justify-content:center;margin-bottom:6px}
.rdm-pro-hero h2{margin:6px 0;font-size:26px}
.rdm-discount-badge{display:inline-block;margin-top:12px;padding:7px 16px;border-radius:20px;
  background:linear-gradient(90deg,#ff5c8a,#ffb347);color:#fff;font-weight:800;font-size:13px}
.rdm-pro-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:20px}
.rdm-pro-feature{display:flex;gap:12px;padding:15px;background:var(--panel2);border:1px solid var(--border);
  border-radius:14px}
.rdm-pro-feature-icon{font-size:24px;line-height:1}
.rdm-pro-feature-title{font-weight:700;font-size:14px;margin-bottom:3px}
.rdm-pro-feature-desc{font-size:12px;color:var(--muted);line-height:1.4}
.rdm-pro-updates{background:var(--panel2);border:1px solid var(--border);border-radius:14px;
  padding:16px;margin-bottom:18px}
.rdm-pro-updates strong{font-size:14px}
.rdm-pro-updates p{margin:6px 0 0}
.rdm-pro-loginnote{background:#ffb34722;color:#ffcf8a;padding:13px;border-radius:12px;
  text-align:center;font-size:13px;font-weight:600}
.rdm-pro-active{background:#7bed9f22;color:#7bed9f;padding:13px;border-radius:12px;text-align:center;font-weight:700}
.rdm-pro-buy{width:100%;font-size:15px;padding:15px}

/* ---------- BACKDROP ---------- */
.rdm-backdrop{position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:40;display:none}

/* ---------- RESPONSIVE ---------- */
@media (max-width:860px){
  .rdm-sidebar{position:fixed;top:0;left:0;bottom:0;z-index:50;transform:translateX(-100%);
    box-shadow:8px 0 40px rgba(0,0,0,.5)}
  .rdm-sidebar.open{transform:translateX(0)}
  .rdm-backdrop{display:block}
  .rdm-menu-btn{display:grid}
  .rdm-bubble{max-width:88%}
  .rdm-suggest-grid{grid-template-columns:1fr}
  .rdm-pro-grid{grid-template-columns:1fr}
  .rdm-model-name{max-width:120px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .rdm-welcome h1{font-size:24px}
}
@media (max-width:480px){
  .rdm-header{padding:10px 12px;gap:8px}
  .rdm-pro-pill span:not(.rdm-crown){display:none}
  .rdm-composer-wrap{padding:8px 10px 12px}
  .rdm-messages{padding:16px 12px 8px}
  .rdm-model-menu{width:min(290px,calc(100vw - 40px))}
}
`;
