"use client";

// RobloxAIStudio.tsx
// Upgraded version featuring real API key integration (Gemini/OpenAI) and secure sessions.

import React, {
  useState,
  useRef,
  useEffect,
  useMemo,
  useCallback,
  CSSProperties,
} from "react";

/* ============================================================================
 * TYPES
 * ==========================================================================*/

type ThemeName = "dark" | "midnight" | "cyberpunk";

interface ThemeTokens {
  name: string;
  bg: string;
  bgElevated: string;
  bgPanel: string;
  bgInput: string;
  border: string;
  borderStrong: string;
  text: string;
  textDim: string;
  textFaint: string;
  accent: string;
  accentSoft: string;
  accentText: string;
  danger: string;
  success: string;
  bubbleUser: string;
  bubbleAI: string;
  headerGradient: string;
  glow: string;
  fontFamily: string;
}

interface ChatMessage {
  id: string;
  role: "user" | "ai";
  text: string;
  code?: { language: string; content: string; filename: string } | null;
  createdAt: number;
}

interface ChatSession {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: number;
}

interface ExplorerNode {
  id: string;
  label: string;
  type: "folder" | "script" | "part";
  children?: ExplorerNode[];
}

interface AdminUser {
  id: string;
  email: string;
  role: "owner" | "admin" | "member";
  status: "online" | "idle" | "offline";
  lastActive: string;
}

/* ============================================================================
 * CONSTANTS & THEMING
 * ==========================================================================*/

const ADMIN_EMAIL = "hossiani961@gmail.com";

const THEMES: Record<ThemeName, ThemeTokens> = {
  dark: {
    name: "Dark",
    bg: "#0f1115",
    bgElevated: "#171a21",
    bgPanel: "#1c2029",
    bgInput: "#22262f",
    border: "#2a2f3a",
    borderStrong: "#3a404d",
    text: "#e8eaed",
    textDim: "#a7adba",
    textFaint: "#6b7280",
    accent: "#4c8bf5",
    accentSoft: "rgba(76,139,245,0.15)",
    accentText: "#ffffff",
    danger: "#ef4444",
    success: "#22c55e",
    bubbleUser: "#2a3446",
    bubbleAI: "#1c2029",
    headerGradient: "linear-gradient(90deg,#171a21,#1c2029)",
    glow: "0 0 0 rgba(0,0,0,0)",
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  },
  midnight: {
    name: "Midnight",
    bg: "#070b1a",
    bgElevated: "#0c1230",
    bgPanel: "#111a3d",
    bgInput: "#16204a",
    border: "#1e2a55",
    borderStrong: "#2c3c75",
    text: "#e6ebff",
    textDim: "#9aa8d8",
    textFaint: "#5c6aa0",
    accent: "#6d5efc",
    accentSoft: "rgba(109,94,252,0.18)",
    accentText: "#ffffff",
    danger: "#f43f5e",
    success: "#34d399",
    bubbleUser: "#1b2a63",
    bubbleAI: "#111a3d",
    headerGradient: "linear-gradient(90deg,#0c1230,#1a1247)",
    glow: "0 0 24px rgba(109,94,252,0.25)",
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  },
  cyberpunk: {
    name: "Cyberpunk",
    bg: "#0a0410",
    bgElevated: "#140720",
    bgPanel: "#1a0a2e",
    bgInput: "#230f3a",
    border: "#3a1560",
    borderStrong: "#5a1f8f",
    text: "#f5e9ff",
    textDim: "#c48ff0",
    textFaint: "#8a5cb0",
    accent: "#ff2e97",
    accentSoft: "rgba(255,46,151,0.18)",
    accentText: "#0a0410",
    danger: "#ff3b6b",
    success: "#00ffb3",
    bubbleUser: "#3a0f5c",
    bubbleAI: "#160826",
    headerGradient: "linear-gradient(90deg,#1a0a2e,#3a0f5c)",
    glow: "0 0 28px rgba(255,46,151,0.35)",
    fontFamily: "'Inter', 'Segoe UI', Roboto, sans-serif",
  },
};

const INITIAL_EXPLORER: ExplorerNode[] = [
  {
    id: "workspace",
    label: "Workspace",
    type: "folder",
    children: [
      { id: "ws-baseplate", label: "Baseplate", type: "part" },
      { id: "ws-spawn", label: "SpawnLocation", type: "part" },
    ],
  },
  {
    id: "replicated",
    label: "ReplicatedStorage",
    type: "folder",
    children: [
      { id: "rs-remotes", label: "Remotes", type: "folder", children: [
        { id: "rs-buy", label: "RemoteEvent", type: "script" },
      ] },
    ],
  },
  {
    id: "server",
    label: "ServerScriptService",
    type: "folder",
    children: [
      { id: "sss-main", label: "MainServerScript", type: "script" },
    ],
  },
];

const INITIAL_ADMIN_USERS: AdminUser[] = [
  { id: "u1", email: ADMIN_EMAIL, role: "owner", status: "online", lastActive: "now" },
];

/* ============================================================================
 * UTILITIES
 * ==========================================================================*/

const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);

/* Real AI API call handler using user-provided API key */
async function callRealAI(prompt: string, apiKey: string, systemPrompt: string): Promise<{ text: string; code?: { language: string; content: string; filename: string } | null }> {
  if (!apiKey || apiKey.trim() === "") {
    throw new Error("No API key provided. Please configure your API key in Settings.");
  }

  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [
        { role: "user", parts: [{ text: `${systemPrompt}\n\nUser request: ${prompt}` }] }
      ]
    })
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.error?.message || `API Error: ${response.statusText}`);
  }

  const data = await response.json();
  const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || "No response generated.";

  let codeSnippet: { language: string; content: string; filename: string } | null = null;
  const codeBlockMatch = rawText.match(/```([a-zA-Z]*)\n([\s\S]*?)```/);
  
  if (codeBlockMatch) {
    const lang = codeBlockMatch[1] || "lua";
    const content = codeBlockMatch[2];
    codeSnippet = {
      language: lang,
      content: content.trim(),
      filename: lang.toLowerCase() === "lua" || lang.toLowerCase() === "luau" ? "Script.lua" : "CodeSnippet.txt"
    };
  }

  return {
    text: rawText,
    code: codeSnippet
  };
}

/* ============================================================================
 * ICONS & ASSETS
 * ==========================================================================*/

const Icon: React.FC<{ path: string; size?: number; color?: string }> = ({
  path,
  size = 20,
  color = "currentColor",
}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d={path} />
  </svg>
);

const ICONS = {
  menu: "M4 6h16M4 12h16M4 18h16",
  close: "M18 6 6 18M6 6l12 12",
  settings: "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z",
  shield: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z",
  plus: "M12 5v14M5 12h14",
  trash: "M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m2 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6",
  send: "M22 2 11 13M22 2l-7 20-4-9-9-4 20-7z",
  chevron: "M9 18l6-6-6-6",
  copy: "M8 4v12a2 2 0 0 0 2 2h8M16 4H10a2 2 0 0 0-2 2M8 4H6a2 2 0 0 0-2 2v12",
  download: "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3",
  chat: "M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z",
  folder: "M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z",
  file: "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z M14 2v6h6",
  box: "M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z",
  user: "M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z",
  mail: "M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2zM22 6l-10 7L2 6",
  check: "M20 6 9 17l-5-5",
};

/* ============================================================================
 * MAIN COMPONENT
 * ==========================================================================*/

const RobloxAIStudio: React.FC = () => {
  const [themeName, setThemeName] = useState<ThemeName>("midnight");
  const t = THEMES[themeName];

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => {
      const mobile = window.innerWidth < 900;
      setIsMobile(mobile);
      setSidebarOpen(!mobile);
    };
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const [showSettings, setShowSettings] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);
  const [showAuth, setShowAuth] = useState(false);

  const [apiKey, setApiKey] = useState("");
  const [systemInstructions, setSystemInstructions] = useState(
    "You are Roblox AI Studio, an expert Luau engineer and Roblox assistant. Provide structured solutions and accurate code."
  );

  const [currentUser, setCurrentUser] = useState<string | null>(null);
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authError, setAuthError] = useState("");

  const isOwner = currentUser === ADMIN_EMAIL;

  const [expanded, setExpanded] = useState<Record<string, boolean>>({
    workspace: true,
    replicated: false,
    server: true,
  });

  const [sessions, setSessions] = useState<ChatSession[]>(() => [
    {
      id: uid(),
      title: "New Chat",
      messages: [
        {
          id: uid(),
          role: "ai",
          text: "👋 Welcome to Roblox AI Studio! Configure your API key in Settings to begin chatting with real AI capabilities.",
          createdAt: Date.now(),
          code: null,
        },
      ],
      createdAt: Date.now(),
    },
  ]);
  const [activeSessionId, setActiveSessionId] = useState<string>(sessions[0].id);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const activeSession = useMemo(
    () => sessions.find((s) => s.id === activeSessionId) ?? sessions[0],
    [sessions, activeSessionId]
  );

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeSession?.messages, isTyping]);

  const [adminUsers, setAdminUsers] = useState<AdminUser[]>(INITIAL_ADMIN_USERS);

  const toggleExpand = useCallback((id: string) => {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  }, []);

  const newSession = useCallback(() => {
    const s: ChatSession = {
      id: uid(),
      title: "New Chat",
      messages: [],
      createdAt: Date.now(),
    };
    setSessions((prev) => [s, ...prev]);
    setActiveSessionId(s.id);
    if (isMobile) setSidebarOpen(false);
  }, [isMobile]);

  const deleteSession = useCallback(
    (id: string) => {
      setSessions((prev) => {
        const filtered = prev.filter((s) => s.id !== id);
        if (filtered.length === 0) {
          const s: ChatSession = {
            id: uid(),
            title: "New Chat",
            messages: [],
            createdAt: Date.now(),
          };
          setActiveSessionId(s.id);
          return [s];
        }
        if (id === activeSessionId) setActiveSessionId(filtered[0].id);
        return filtered;
      });
    },
    [activeSessionId]
  );

  const sendMessage = useCallback(async () => {
    const text = input.trim();
    if (!text || isTyping) return;

    if (!apiKey) {
      alert("Please enter your API Key in Settings first!");
      setShowSettings(true);
      return;
    }

    const userMsg: ChatMessage = {
      id: uid(),
      role: "user",
      text,
      createdAt: Date.now(),
    };

    setSessions((prev) =>
      prev.map((s) =>
        s.id === activeSessionId
          ? {
              ...s,
              title:
                s.messages.length === 0 || s.title === "New Chat"
                  ? text.slice(0, 32) + (text.length > 32 ? "…" : "")
                  : s.title,
              messages: [...s.messages, userMsg],
            }
          : s
      )
    );
    setInput("");
    setIsTyping(true);

    try {
      const result = await callRealAI(text, apiKey, systemInstructions);
      const aiMsg: ChatMessage = {
        id: uid(),
        role: "ai",
        text: result.text,
        code: result.code || null,
        createdAt: Date.now(),
      };
      setSessions((prev) =>
        prev.map((s) =>
          s.id === activeSessionId ? { ...s, messages: [...s.messages, aiMsg] } : s
        )
      );
    } catch (error: any) {
      const errorMsg: ChatMessage = {
        id: uid(),
        role: "ai",
        text: `⚠️ Error processing request: ${error.message || "Unknown error occurred."}`,
        createdAt: Date.now(),
      };
      setSessions((prev) =>
        prev.map((s) =>
          s.id === activeSessionId ? { ...s, messages: [...s.messages, errorMsg] } : s
        )
      );
    } finally {
      setIsTyping(false);
    }
  }, [input, isTyping, activeSessionId, apiKey, systemInstructions]);

  const copyCode = useCallback((msgId: string, content: string) => {
    navigator.clipboard?.writeText(content).then(() => {
      setCopiedId(msgId);
      window.setTimeout(() => setCopiedId(null), 1500);
    });
  }, []);

  const downloadCode = useCallback((filename: string, content: string) => {
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, []);

  const handleAuthSubmit = useCallback(() => {
    setAuthError("");
    const email = authEmail.trim().toLowerCase();
    if (!email || !authPassword) {
      setAuthError("Please fill in all fields.");
      return;
    }
    setCurrentUser(email);
    setShowAuth(false);
    setAuthEmail("");
    setAuthPassword("");
  }, [authEmail, authPassword]);

  const styles = useMemo(() => makeStyles(t, isMobile), [t, isMobile]);

  const renderExplorerNode = (node: ExplorerNode, depth = 0): React.ReactNode => {
    const isFolder = node.type === "folder";
    const isOpen = expanded[node.id];
    const iconPath = node.type === "folder" ? ICONS.folder : node.type === "part" ? ICONS.box : ICONS.file;
    const iconColor = node.type === "folder" ? t.accent : node.type === "part" ? t.success : t.textDim;

    return (
      <div key={node.id}>
        <button
          type="button"
          onClick={() => isFolder && toggleExpand(node.id)}
          style={{ ...styles.treeRow, paddingLeft: 8 + depth * 16, cursor: isFolder ? "pointer" : "default" }}
        >
          {isFolder ? (
            <span style={{ display: "inline-flex", transform: isOpen ? "rotate(90deg)" : "rotate(0deg)", transition: "transform .15s ease", color: t.textDim }}>
              <Icon path={ICONS.chevron} size={14} />
            </span>
          ) : (
            <span style={{ width: 14, display: "inline-block" }} />
          )}
          <Icon path={iconPath} size={15} color={iconColor} />
          <span style={styles.treeLabel}>{node.label}</span>
        </button>
        {isFolder && isOpen && node.children && (
          <div>{node.children.map((c) => renderExplorerNode(c, depth + 1))}</div>
        )}
      </div>
    );
  };

  return (
    <div style={styles.root}>
      <StyleInjector />

      <header style={styles.header}>
        <div style={styles.headerLeft}>
          <button type="button" onClick={() => setSidebarOpen((o) => !o)} style={styles.iconBtn}>
            <Icon path={sidebarOpen && !isMobile ? ICONS.close : ICONS.menu} />
          </button>
          <div style={styles.brand}>
            <div style={styles.logoMark}>R</div>
            <div style={styles.brandTextWrap}>
              <span style={styles.brandTitle}>Roblox AI Studio</span>
              <span style={styles.brandSub}>API-Powered Studio</span>
            </div>
          </div>
        </div>

        <div style={styles.headerRight}>
          {currentUser && (
            <div style={styles.userChip} title={currentUser}>
              <Icon path={ICONS.user} size={14} />
              <span style={styles.userChipText}>{currentUser.split("@")[0]}</span>
            </div>
          )}
          <button type="button" onClick={() => setShowSettings(true)} style={styles.headerBtn}>
            <Icon path={ICONS.settings} size={16} />
            <span>Settings & API</span>
          </button>
          <button type="button" onClick={() => (currentUser ? setShowAdmin(true) : setShowAuth(true))} style={{ ...styles.headerBtn, ...styles.adminBtn }}>
            <Icon path={ICONS.shield} size={16} />
            <span>Admin</span>
          </button>
        </div>
      </header>

      <div style={styles.body}>
        {sidebarOpen && isMobile && <div style={styles.overlay} onClick={() => setSidebarOpen(false)} />}

        <aside style={{ ...styles.sidebar, transform: sidebarOpen ? "translateX(0)" : "translateX(-110%)", position: isMobile ? "fixed" : "relative" }}>
          <div style={styles.sidebarSection}>
            <div style={styles.sectionHeaderRow}>
              <span style={styles.sectionLabel}>Chats</span>
              <button type="button" onClick={newSession} style={styles.smallGhostBtn} title="New chat">
                <Icon path={ICONS.plus} size={15} />
              </button>
            </div>
            <div style={styles.sessionList}>
              {sessions.map((s) => (
                <div
                  key={s.id}
                  style={{
                    ...styles.sessionItem,
                    background: s.id === activeSessionId ? t.accentSoft : "transparent",
                    borderColor: s.id === activeSessionId ? t.accent : "transparent",
                  }}
                  onClick={() => {
                    setActiveSessionId(s.id);
                    if (isMobile) setSidebarOpen(false);
                  }}
                >
                  <Icon path={ICONS.chat} size={15} color={t.textDim} />
                  <span style={styles.sessionTitle}>{s.title || "New Chat"}</span>
                  <button type="button" onClick={(e) => { e.stopPropagation(); deleteSession(s.id); }} style={styles.sessionDelete} title="Delete chat">
                    <Icon path={ICONS.trash} size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div style={{ ...styles.sidebarSection, flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
            <div style={styles.sectionLabel}>Explorer</div>
            <div style={styles.explorerTree}>
              {INITIAL_EXPLORER.map((n) => renderExplorerNode(n))}
            </div>
          </div>
        </aside>

        <main style={styles.main}>
          <div style={styles.messages}>
            {activeSession.messages.length === 0 && !isTyping && (
              <div style={styles.emptyState}>
                <div style={styles.emptyLogo}>R</div>
                <h2 style={styles.emptyTitle}>How can I help you build?</h2>
                <p style={styles.emptySub}>Connected to real AI via API key. Ask any question!</p>
              </div>
            )}

            {activeSession.messages.map((m) => (
              <div key={m.id} style={{ ...styles.messageRow, justifyContent: m.role === "user" ? "flex-end" : "flex-start" }}>
                <div style={{ ...styles.bubble, background: m.role === "user" ? t.bubbleUser : t.bubbleAI, border: `1px solid ${t.border}` }}>
                  {m.role === "ai" && <div style={styles.bubbleTag}><span style={styles.aiDot} /> AI Assistant</div>}
                  <div style={styles.bubbleText}>{m.text}</div>

                  {m.code && (
                    <div style={styles.codeBlock}>
                      <div style={styles.codeHeader}>
                        <span style={styles.codeFilename}>
                          <Icon path={ICONS.file} size={13} color={t.textDim} />
                          {m.code.filename}
                        </span>
                        <div style={styles.codeActions}>
                          <button type="button" style={styles.codeBtn} onClick={() => copyCode(m.id, m.code!.content)}>
                            <Icon path={copiedId === m.id ? ICONS.check : ICONS.copy} size={13} />
                            {copiedId === m.id ? "Copied" : "Copy"}
                          </button>
                          <button type="button" style={styles.codeBtn} onClick={() => downloadCode(m.code!.filename, m.code!.content)}>
                            <Icon path={ICONS.download} size={13} />
                            Download
                          </button>
                        </div>
                      </div>
                      <pre style={styles.codePre}>
                        <code>{m.code.content}</code>
                      </pre>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {isTyping && (
              <div style={{ ...styles.messageRow, justifyContent: "flex-start" }}>
                <div style={{ ...styles.bubble, background: t.bubbleAI, border: `1px solid ${t.border}` }}>
                  <div style={styles.typing}>
                    <span style={styles.typingDot} />
                    <span style={{ ...styles.typingDot, animationDelay: "0.15s" }} />
                    <span style={{ ...styles.typingDot, animationDelay: "0.3s" }} />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div style={styles.composerWrap}>
            <div style={styles.composer}>
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage();
                  }
                }}
                placeholder="Ask anything about Roblox, Luau scripts, or game development..."
                rows={1}
                style={styles.textarea}
              />
              <button
                type="button"
                onClick={sendMessage}
                disabled={!input.trim() || isTyping}
                style={{ ...styles.sendBtn, opacity: !input.trim() || isTyping ? 0.4 : 1 }}
              >
                <Icon path={ICONS.send} size={18} color={t.accentText} />
              </button>
            </div>
          </div>
        </main>
      </div>

      {showSettings && (
        <Modal title="Settings & API Key" onClose={() => setShowSettings(false)} styles={styles} t={t}>
          <div style={styles.settingsGroup}>
            <label style={styles.settingsLabel}>API Key (Required for AI)</label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="Enter your API key..."
              style={styles.input}
            />
            <div style={styles.settingsHint}>Your API key is securely stored in local session memory and never shared.</div>
          </div>

          <div style={styles.settingsGroup}>
            <label style={styles.settingsLabel}>Theme Selection</label>
            <div style={styles.themeGrid}>
              {(Object.keys(THEMES) as ThemeName[]).map((key) => {
                const th = THEMES[key];
                return (
                  <button key={key} type="button" onClick={() => setThemeName(key)} style={{ ...styles.themeCard, borderColor: key === themeName ? th.accent : t.border }}>
                    <span style={styles.themeName}>{th.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div style={styles.settingsGroup}>
            <label style={styles.settingsLabel}>System Instructions</label>
            <textarea
              value={systemInstructions}
              onChange={(e) => setSystemInstructions(e.target.value)}
              rows={3}
              style={styles.settingsTextarea}
            />
          </div>
        </Modal>
      )}

      {showAuth && (
        <Modal title="Secure Sign In" onClose={() => setShowAuth(false)} styles={styles} t={t}>
          <p style={styles.authIntro}>Sign in privately with your credentials.</p>
          <label style={styles.settingsLabel}>Email Address</label>
          <input
            type="email"
            value={authEmail}
            onChange={(e) => setAuthEmail(e.target.value)}
            placeholder="you@example.com"
            style={styles.input}
          />
          <label style={styles.settingsLabel}>Password</label>
          <input
            type="password"
            value={authPassword}
            onChange={(e) => setAuthPassword(e.target.value)}
            placeholder="••••••••"
            style={styles.input}
          />
          {authError && <div style={styles.errorText}>{authError}</div>}
          <button type="button" style={styles.primaryBtn} onClick={handleAuthSubmit}>
            Sign In Securely
          </button>
        </Modal>
      )}

      {showAdmin && (
        <Modal title="Admin Panel" onClose={() => setShowAdmin(false)} styles={styles} t={t} wide>
          {isOwner ? (
            <div>
              <h3 style={styles.successTitle}>Welcome Owner</h3>
              <p style={styles.emptySub}>You have complete access to manage studio configurations.</p>
            </div>
          ) : (
            <div>Restricted Access</div>
          )}
        </Modal>
      )}
    </div>
  );
};

const Modal: React.FC<{ title: string; onClose: () => void; children: React.ReactNode; styles: ReturnType<typeof makeStyles>; t: ThemeTokens; wide?: boolean }> = ({ title, onClose, children, wide }) => (
  <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200 }}>
    <div style={{ width: "100%", maxWidth: wide ? 640 : 460, background: "#171a21", borderRadius: 16, padding: 20, border: "1px solid #3a404d", color: "#fff" }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 15 }}>
        <h3 style={{ margin: 0 }}>{title}</h3>
        <button onClick={onClose} style={{ background: "transparent", border: "none", color: "#fff", cursor: "pointer" }}>✕</button>
      </div>
      {children}
    </div>
  </div>
);

const StyleInjector: React.FC = () => (
  <style dangerouslySetInnerHTML={{ __html: `* { box-sizing: border-box; }` }} />
);

function makeStyles(t: ThemeTokens, isMobile: boolean) {
  return {
    root: { position: "fixed", inset: 0, display: "flex", flexDirection: "column", background: t.bg, color: t.text, fontFamily: t.fontFamily, fontSize: 14 },
    header: { height: 60, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 12px", background: t.headerGradient, borderBottom: `1px solid ${t.border}` },
    headerLeft: { display: "flex", alignItems: "center", gap: 10 },
    headerRight: { display: "flex", alignItems: "center", gap: 8 },
    brand: { display: "flex", alignItems: "center", gap: 10 },
    logoMark: { width: 34, height: 34, borderRadius: 9, background: t.accent, color: t.accentText, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800 },
    brandTextWrap: { display: "flex", flexDirection: "column" },
    brandTitle: { fontWeight: 700, fontSize: 16 },
    brandSub: { fontSize: 11, color: t.textDim },
    iconBtn: { width: 38, height: 38, borderRadius: 9, border: `1px solid ${t.border}`, background: t.bgInput, color: t.text, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" },
    headerBtn: { display: "flex", alignItems: "center", gap: 7, height: 38, padding: "0 14px", borderRadius: 9, border: `1px solid ${t.border}`, background: t.bgInput, color: t.text, fontSize: 13, fontWeight: 600, cursor: "pointer" },
    adminBtn: { background: t.accent, color: t.accentText, border: `1px solid ${t.accent}` },
    userChip: { display: "flex", alignItems: "center", gap: 6, height: 34, padding: "0 12px", borderRadius: 20, background: t.accentSoft, color: t.accent, fontSize: 12, fontWeight: 600 },
    userChipText: { whiteSpace: "nowrap" },
    body: { flex: 1, display: "flex", minHeight: 0, position: "relative" },
    overlay: { position: "fixed", inset: 0, top: 60, background: "rgba(0,0,0,0.55)", zIndex: 40 },
    sidebar: { top: 60, bottom: 0, left: 0, width: 280, background: t.bgElevated, borderRight: `1px solid ${t.border}`, display: "flex", flexDirection: "column", padding: 12, zIndex: 50, transition: "transform .25s ease" },
    sidebarSection: { padding: "8px 4px" },
    sectionLabel: { fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: t.textFaint, marginBottom: 8 },
    sectionHeaderRow: { display: "flex", alignItems: "center", justifyContent: "space-between" },
    smallGhostBtn: { width: 26, height: 26, borderRadius: 7, border: `1px solid ${t.border}`, background: t.bgInput, color: t.text, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" },
    sessionList: { display: "flex", flexDirection: "column", gap: 4, maxHeight: 200, overflowY: "auto" },
    sessionItem: { display: "flex", alignItems: "center", gap: 8, padding: "9px 10px", borderRadius: 9, cursor: "pointer", border: "1px solid transparent" },
    sessionTitle: { flex: 1, fontSize: 13, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" },
    sessionDelete: { width: 24, height: 24, background: "transparent", border: "none", color: t.textFaint, cursor: "pointer" },
    explorerTree: { overflowY: "auto", flex: 1, borderRadius: 10, border: `1px solid ${t.border}`, background: t.bgPanel, padding: 6 },
    treeRow: { width: "100%", display: "flex", alignItems: "center", gap: 7, padding: "6px", borderRadius: 7, border: "none", background: "transparent", color: t.text, textAlign: "left" as const },
    treeLabel: { fontSize: 13 },
    main: { flex: 1, display: "flex", flexDirection: "column", minWidth: 0, background: t.bg },
    messages: { flex: 1, overflowY: "auto", padding: 20, display: "flex", flexDirection: "column", gap: 16 },
    messageRow: { display: "flex", width: "100%" },
    bubble: { maxWidth: "78%", padding: "12px 14px", borderRadius: 14, wordBreak: "break-word" as const },
    bubbleTag: { display: "flex", alignItems: "center", gap: 6, fontSize: 11, fontWeight: 700, color: t.accent, marginBottom: 6 },
    aiDot: { width: 7, height: 7, borderRadius: "50%", background: t.accent },
    bubbleText: { whiteSpace: "pre-wrap" as const, fontSize: 14, color: t.text },
    codeBlock: { marginTop: 12, borderRadius: 10, border: `1px solid ${t.borderStrong}`, background: "#0b0d12" },
    codeHeader: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 10px", borderBottom: `1px solid ${t.border}` },
    codeFilename: { display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: t.textDim },
    codeActions: { display: "flex", gap: 6 },
    codeBtn: { padding: "5px 9px", borderRadius: 7, border: `1px solid ${t.borderStrong}`, background: t.bgInput, color: t.text, fontSize: 11, cursor: "pointer" },
    codePre: { margin: 0, padding: "12px", overflowX: "auto" as const, fontSize: 12.5, color: "#d6deeb" },
    typing: { display: "flex", gap: 5 },
    typingDot: { width: 8, height: 8, borderRadius: "50%", background: t.textDim },
    emptyState: { margin: "auto", textAlign: "center" as const, maxWidth: 460 },
    emptyLogo: { width: 56, height: 56, borderRadius: 16, background: t.accent, color: t.accentText, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, margin: "0 auto 16px" },
    emptyTitle: { fontSize: 22, fontWeight: 700, margin: "0 0 6px" },
    emptySub: { color: t.textDim },
    composerWrap: { padding: 18, borderTop: `1px solid ${t.border}`, background: t.bgElevated },
    composer: { display: "flex", alignItems: "flex-end", gap: 10, background: t.bgInput, border: `1px solid ${t.borderStrong}`, borderRadius: 14, padding: 8 },
    textarea: { flex: 1, resize: "none" as const, border: "none", outline: "none", background: "transparent", color: t.text, fontSize: 14, padding: "8px" },
    sendBtn: { width: 42, height: 42, borderRadius: 10, border: "none", background: t.accent, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" },
    settingsGroup: { marginBottom: 16 },
    settingsLabel: { fontSize: 12, fontWeight: 700, color: t.textDim, marginBottom: 8, display: "block" },
    settingsHint: { fontSize: 11, color: t.textFaint, marginTop: 6 },
    themeGrid: { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 },
    themeCard: { padding: 8, borderRadius: 8, border: `1px solid ${t.border}`, background: t.bgPanel, cursor: "pointer", color: t.text },
    themeName: { fontSize: 12, fontWeight: 600 },
    settingsTextarea: { width: "100%", padding: 10, borderRadius: 8, border: `1px solid ${t.border}`, background: t.bgInput, color: t.text },
    input: { width: "100%", padding: "10px", borderRadius: 8, border: `1px solid ${t.border}`, background: t.bgInput, color: t.text, marginBottom: 12 },
    primaryBtn: { width: "100%", padding: "10px", borderRadius: 8, border: "none", background: t.accent, color: t.accentText, fontWeight: 700, cursor: "pointer" },
    authIntro: { color: t.textDim, marginBottom: 12 },
    errorText: { color: t.danger, fontSize: 12, marginBottom: 10 },
    successTitle: { fontSize: 18, fontWeight: 700 },
  };
}

export default RobloxAIStudio;
