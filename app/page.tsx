"use client";

import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";

/* ============================================================================
   TYPES & INTERFACES
   ============================================================================ */

type ThemeName = "dark" | "midnight" | "cyberpunk";

interface ChatMessage {
  id: string;
  role: "user" | "ai";
  text: string;
  createdAt: number;
  code?: {
    language: string;
    filename: string;
    content: string;
  } | null;
  images?: string[] | null;
}

interface ChatSession {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: number;
}

interface ModelOption {
  id: string;
  name: string;
  desc: string;
  provider: string;
  badge?: string;
}

interface ExplorerNode {
  id: string;
  name: string;
  type: "folder" | "script" | "localscript" | "module" | "gui" | "sound";
  children?: ExplorerNode[];
}

interface AdminUser {
  email: string;
  role: "Owner" | "Admin" | "Moderator";
  joinedDate: string;
  status: "Active" | "Banned";
}

/* ============================================================================
   CONSTANTS & DATA
   ============================================================================ */

const MODELS: ModelOption[] = [
  { id: "rdm-2.2", name: "RDM-2.2 (Ultra)", desc: "Lightning fast Luau and GUI generator", provider: "OpenRouter / Claude-3.5", badge: "Default" },
  { id: "rdm-2.1-pro", name: "RDM-2.1 Pro", desc: "Advanced architectural reasoning & complex state systems", provider: "OpenRouter / Claude-3.5" },
  { id: "rdm-1.1-mythical", name: "RDM-1.1 Mythical", desc: "Legacy optimized model for specialized Roblox structures", provider: "OpenRouter / GPT-4o" },
];

const INITIAL_EXPLORER_TREE: ExplorerNode[] = [
  {
    id: "ws",
    name: "Workspace",
    type: "folder",
    children: [
      { id: "map", name: "NinjaTemple_Map", type: "folder" },
      { id: "spawn", name: "SpawnLocation", type: "folder" },
    ],
  },
  {
    id: "ss",
    name: "ServerScriptService",
    type: "folder",
    children: [
      { id: "ss_handler", name: "DataStoreHandler.server.lua", type: "script" },
      { id: "ss_combat", name: "CombatManager.server.lua", type: "script" },
    ],
  },
  {
    id: "sis",
    name: "StarterGui",
    type: "folder",
    children: [
      {
        id: "gui_main",
        name: "MainHUD",
        type: "gui",
        children: [
          { id: "gui_shop", name: "ShopFrame", type: "gui" },
          { id: "gui_stats", name: "PlayerStats", type: "gui" },
        ],
      },
    ],
  },
  {
    id: "sps",
    name: "StarterPlayerScripts",
    type: "folder",
    children: [
      { id: "sps_client", name: "ClientController.client.lua", type: "localscript" },
      { id: "sps_fly", name: "FlySystem.client.lua", type: "localscript" },
    ],
  },
];

const DEFAULT_ADMINS: AdminUser[] = [
  { email: "hossiani961@gmail.com", role: "Owner", joinedDate: "2026-01-10", status: "Active" },
  { email: "dev_roblox99@gmail.com", role: "Admin", joinedDate: "2026-02-14", status: "Active" },
  { email: "scripter_pro@roblox.net", role: "Moderator", joinedDate: "2026-03-01", status: "Active" },
];

const THEMES: Record<ThemeName, { bg: string; surface: string; border: string; text: string; textMuted: string; primary: string; hover: string; codeBg: string }> = {
  dark: {
    bg: "#0d1117",
    surface: "#161b22",
    border: "#30363d",
    text: "#e6edf3",
    textMuted: "#8b949e",
    primary: "#238636",
    hover: "#2ea043",
    codeBg: "#010409",
  },
  midnight: {
    bg: "#090a0f",
    surface: "#121520",
    border: "#202538",
    text: "#f0f6fc",
    textMuted: "#9198a1",
    primary: "#6366f1",
    hover: "#4f46e5",
    codeBg: "#05060a",
  },
  cyberpunk: {
    bg: "#0b0514",
    surface: "#150a24",
    border: "#3b1c5e",
    text: "#fdf4ff",
    textMuted: "#c084fc",
    primary: "#ec4899",
    hover: "#db2777",
    codeBg: "#05020a",
  },
};

/* ============================================================================
   UTILITY HELPERS
   ============================================================================ */

function uid(): string {
  return Math.random().toString(36).substring(2, 9);
}

function detectIntent(text: string): "image" | "script" | "text" {
  const lower = text.toLowerCase();
  if (lower.includes("gui") || lower.includes("image") || lower.includes("icon") || lower.includes("gamepass") || lower.includes("ui") || lower.includes("design")) {
    if (lower.includes("script") || lower.includes("code") || lower.includes("function")) return "script";
    return "image";
  }
  if (lower.includes("script") || lower.includes("code") || lower.includes("function") || lower.includes("lua") || lower.includes("make a") || lower.includes("create")) {
    return "script";
  }
  return "text";
}

function generateImages(prompt: string): string[] {
  const seed = encodeURIComponent(prompt.slice(0, 20));
  return [
    `https://picsum.photos/seed/${seed}1/400/300`,
    `https://picsum.photos/seed/${seed}2/400/300`,
  ];
}

async function callAIApi(prompt: string, modelId: string, systemInstructions: string): Promise<string> {
  const response = await fetch("/api/chat", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ prompt, modelId, systemInstructions })
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "Response not generated. Please try again.");
  }

  return data.content;
}

/* ============================================================================
   SUB-COMPONENTS
   ============================================================================ */

function Icon({ name, size = 18, color }: { name: string; size?: number; color?: string }) {
  const commonProps = { width: size, height: size, fill: "none", stroke: color || "currentColor", strokeWidth: 2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  switch (name) {
    case "menu":
      return <svg {...commonProps} viewBox="0 0 24 24"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>;
    case "plus":
      return <svg {...commonProps} viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>;
    case "settings":
      return <svg {...commonProps} viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>;
    case "send":
      return <svg {...commonProps} viewBox="0 0 24 24"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>;
    case "copy":
      return <svg {...commonProps} viewBox="0 0 24 24"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>;
    case "check":
      return <svg {...commonProps} viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>;
    case "shield":
      return <svg {...commonProps} viewBox="0 0 24 24"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>;
    case "folder":
      return <svg {...commonProps} viewBox="0 0 24 24"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>;
    case "file":
      return <svg {...commonProps} viewBox="0 0 24 24"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><polyline points="13 2 13 9 20 9"/></svg>;
    case "user":
      return <svg {...commonProps} viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>;
    case "trash":
      return <svg {...commonProps} viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>;
    case "chevron-right":
      return <svg {...commonProps} viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6"/></svg>;
    case "chevron-down":
      return <svg {...commonProps} viewBox="0 0 24 24"><polyline points="6 9 12 15 18 9"/></svg>;
    default:
      return <svg {...commonProps} viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/></svg>;
  }
}

function Modal({ isOpen, onClose, title, children }: { isOpen: boolean; onClose: () => void; title: string; children: React.ReactNode }) {
  if (!isOpen) return null;
  return (
    <div style={modalStyles.overlay} onClick={onClose}>
      <div style={modalStyles.modal} onClick={(e) => e.stopPropagation()}>
        <div style={modalStyles.header}>
          <h3 style={modalStyles.title}>{title}</h3>
          <button style={modalStyles.closeBtn} onClick={onClose}>&times;</button>
        </div>
        <div style={modalStyles.body}>{children}</div>
      </div>
    </div>
  );
}

const modalStyles = {
  overlay: { position: "fixed" as const, top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, backdropFilter: "blur(4px)" },
  modal: { width: "90%", maxWidth: "550px", backgroundColor: "#161b22", border: "1px solid #30363d", borderRadius: "12px", boxShadow: "0 16px 32px rgba(0,0,0,0.5)", overflow: "hidden", color: "#e6edf3" },
  header: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", borderBottom: "1px solid #30363d" },
  title: { margin: 0, fontSize: "18px", fontWeight: 600 },
  closeBtn: { background: "none", border: "none", color: "#8b949e", fontSize: "24px", cursor: "pointer", padding: 0 },
  body: { padding: "20px", maxHeight: "75vh", overflowY: "auto" as const },
};

/* ============================================================================
   MAIN COMPONENT
   ============================================================================ */

export default function RobloxAIStudio() {
  // Theme & Layout State
  const [theme, setTheme] = useState<ThemeName>("dark");
  const t = THEMES[theme];
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeTab, setActiveTab] = useState<"chat" | "explorer" | "admin">("chat");

  // Chat Sessions State
  const [sessions, setSessions] = useState<ChatSession[]>([
    {
      id: "session-1",
      title: "Ninja Shop GUI & Script",
      createdAt: Date.now(),
      messages: [
        {
          id: "m1",
          role: "user",
          text: "Make a script if I click a GUI a shop will open and add fly script for my game",
          createdAt: Date.now() - 10000,
        },
        {
          id: "m2",
          role: "ai",
          text: "Here is your complete solution for the Ninja Shop GUI toggle and the local Fly Script.",
          createdAt: Date.now() - 5000,
          code: {
            language: "lua",
            filename: "ShopAndFlyController.client.lua",
            content: `-- Shop Toggle & Fly Script for Roblox Client
local Players = game:GetService("Players")
local RunService = game:GetService("RunService")
local UserInputService = game:GetService("UserInputService")

local player = Players.LocalPlayer
local playerGui = player:WaitForChild("PlayerGui")

-- Create Shop GUI dynamically if not exists
local screenGui = Instance.new("ScreenGui")
screenGui.Name = "NinjaShopHUD"
screenGui.Parent = playerGui

local openBtn = Instance.new("TextButton")
openBtn.Size = UDim2.new(0, 140, 0, 50)
openBtn.Position = UDim2.new(0, 20, 0, 100)
openBtn.BackgroundColor3 = Color3.fromRGB(35, 134, 54)
openBtn.Text = "Toggle Shop"
openBtn.TextColor3 = Color3.fromRGB(255, 255, 255)
openBtn.TextSize = 16
openBtn.Font = Enum.Font.GothamBold
openBtn.Parent = screenGui

local shopFrame = Instance.new("Frame")
shopFrame.Size = UDim2.new(0, 350, 0, 400)
shopFrame.Position = UDim2.new(0.5, -175, 0.5, -200)
shopFrame.BackgroundColor3 = Color3.fromRGB(22, 27, 34)
shopFrame.Visible = false
shopFrame.Parent = screenGui

openBtn.MouseButton1Click:Connect(function()
    shopFrame.Visible = not shopFrame.Visible
end)

-- Fly Controller Integration
local flying = false
local speed = 50
local torso = nil

UserInputService.InputBegan:Connect(function(input, gameProcessed)
    if gameProcessed then return end
    if input.KeyCode == Enum.KeyCode.F then
        flying = not flying
        print("Fly mode: " .. tostring(flying))
    end
end)`
          },
          images: [
            "https://picsum.photos/seed/ninjashop1/400/300",
            "https://picsum.photos/seed/ninjashop2/400/300"
          ]
        }
      ]
    }
  ]);
  const [activeSessionId, setActiveSessionId] = useState<string>("session-1");
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);

  // Model & Settings State
  const [modelId, setModelId] = useState<string>("rdm-2.2");
  const [systemInstructions, setSystemInstructions] = useState<string>(
    "You are an elite Roblox Luau developer and UI/UX expert. Write clean, highly performant Roblox scripts, modules, and GUI solutions."
  );
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Auth & Admin Modal State
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authEmail, setAuthEmail] = useState("");
  const [authCode, setAuthCode] = useState("");
  const [authStep, setAuthStep] = useState<1 | 2>(1);
  const [userEmail, setUserEmail] = useState<string | null>("hossiani961@gmail.com");
  const [adminList, setAdminList] = useState<AdminUser[]>(DEFAULT_ADMINS);

  // Explorer State
  const [explorerTree, setExplorerTree] = useState<ExplorerNode[]>(INITIAL_EXPLORER_TREE);
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({ ws: true, ss: true, sis: true, gui_main: true, sps: true });
  const [selectedNode, setSelectedNode] = useState<string | null>(null);

  // Copy Feedback State
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const activeSession = useMemo(() => {
    return sessions.find((s) => s.id === activeSessionId) || sessions[0];
  }, [sessions, activeSessionId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeSession?.messages, isTyping]);

  // Handlers
  const createNewChat = () => {
    const newSession: ChatSession = {
      id: uid(),
      title: "New Chat",
      messages: [],
      createdAt: Date.now(),
    };
    setSessions([newSession, ...sessions]);
    setActiveSessionId(newSession.id);
  };

  const deleteSession = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const updated = sessions.filter((s) => s.id !== id);
    if (updated.length === 0) {
      const fresh: ChatSession = { id: uid(), title: "New Chat", messages: [], createdAt: Date.now() };
      setSessions([fresh]);
      setActiveSessionId(fresh.id);
    } else {
      setSessions(updated);
      if (activeSessionId === id) {
        setActiveSessionId(updated[0].id);
      }
    }
  };

  const sendMessage = useCallback(async () => {
    const text = input.trim();
    if (!text || isTyping) return;

    const userMsg: ChatMessage = {
      id: uid(),
      role: "user",
      text,
      createdAt: Date.now(),
      code: null,
      images: null,
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
      const intent = detectIntent(text);
      let aiText = "";
      let images = null;
      let code = null;

      if (intent === "image") {
        aiText = `Here are some GUI concept assets generated for "${text.trim()}".`;
        images = generateImages(text);
      } else {
        aiText = await callAIApi(text, modelId, systemInstructions);
        if (aiText.includes("```")) {
          const match = aiText.match(/```(?:lua|luau)?([\s\S]*?)```/);
          if (match) {
            code = {
              language: "lua",
              filename: "GeneratedScript.lua",
              content: match[1].trim()
            };
          }
        }
      }

      const aiMsg: ChatMessage = {
        id: uid(),
        role: "ai",
        text: aiText,
        code,
        images,
        createdAt: Date.now()
      };

      setSessions((prev) =>
        prev.map((s) =>
          s.id === activeSessionId ? { ...s, messages: [...s.messages, aiMsg] } : s
        )
      );
    } catch (err: any) {
      const errorMsg: ChatMessage = {
        id: uid(),
        role: "ai",
        text: `Error: ${err.message || "Response not generated. Please check your Render configuration."}`,
        createdAt: Date.now()
      };
      setSessions((prev) =>
        prev.map((s) =>
          s.id === activeSessionId ? { ...s, messages: [...s.messages, errorMsg] } : s
        )
      );
    } finally {
      setIsTyping(false);
    }
  }, [input, isTyping, activeSessionId, modelId, systemInstructions]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const toggleFolder = (id: string) => {
    setExpandedFolders((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const renderExplorerNode = (node: ExplorerNode, depth = 0) => {
    const isFolder = node.type === "folder" || node.type === "gui";
    const isExpanded = expandedFolders[node.id];
    const isSelected = selectedNode === node.id;

    let iconName = "file";
    if (node.type === "folder") iconName = "folder";
    if (node.type === "script" || node.type === "localscript" || node.type === "module") iconName = "file";
    if (node.type === "gui") iconName = "shield";

    return (
      <div key={node.id} style={{ userSelect: "none" }}>
        <div
          style={{
            display: "flex",
            alignItem: "center",
            padding: `6px 8px 6px ${12 + depth * 16}px`,
            cursor: "pointer",
            backgroundColor: isSelected ? t.border : "transparent",
            borderRadius: "6px",
            color: t.text,
            fontSize: "13px",
            gap: "8px"
          }}
          onClick={() => {
            if (isFolder) toggleFolder(node.id);
            setSelectedNode(node.id);
          }}
        >
          {isFolder && (
            <span style={{ display: "flex", alignItems: "center" }}>
              <Icon name={isExpanded ? "chevron-down" : "chevron-right"} size={14} color={t.textMuted} />
            </span>
          )}
          {!isFolder && <span style={{ width: 14 }} />}
          <Icon name={iconName} size={15} color={node.type === "script" ? "#3fb950" : node.type === "localscript" ? "#58a6ff" : "#d29922"} />
          <span>{node.name}</span>
        </div>
        {isFolder && isExpanded && node.children && (
          <div>
            {node.children.map((child) => renderExplorerNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div style={{ ...styles.container, backgroundColor: t.bg, color: t.text }}>
      {/* HEADER */}
      <header style={{ ...styles.header, backgroundColor: t.surface, borderColor: t.border }}>
        <div style={styles.headerLeft}>
          <button style={{ ...styles.iconBtn, color: t.text }} onClick={() => setSidebarOpen(!sidebarOpen)}>
            <Icon name="menu" size={20} />
          </button>
          <div style={styles.logoArea}>
            <span style={styles.logoBadge}>RDM</span>
            <span style={styles.logoText}>Roblox AI Studio</span>
          </div>
        </div>

        <div style={styles.headerCenter}>
          <select
            value={modelId}
            onChange={(e) => setModelId(e.target.value)}
            style={{ ...styles.modelSelect, backgroundColor: t.bg, color: t.text, borderColor: t.border }}
          >
            {MODELS.map((m) => (
              <option key={m.id} value={m.id}>{m.name} ({m.provider})</option>
            ))}
          </select>
        </div>

        <div style={styles.headerRight}>
          <button
            style={{ ...styles.navTabBtn, backgroundColor: activeTab === "chat" ? t.border : "transparent", color: t.text }}
            onClick={() => setActiveTab("chat")}
          >
            Chat
          </button>
          <button
            style={{ ...styles.navTabBtn, backgroundColor: activeTab === "explorer" ? t.border : "transparent", color: t.text }}
            onClick={() => setActiveTab("explorer")}
          >
            Explorer
          </button>
          {userEmail === "hossiani961@gmail.com" && (
            <button
              style={{ ...styles.navTabBtn, backgroundColor: activeTab === "admin" ? t.border : "transparent", color: t.text }}
              onClick={() => setActiveTab("admin")}
            >
              Admin Panel
            </button>
          )}

          <button style={{ ...styles.iconBtn, color: t.text }} onClick={() => setSettingsOpen(true)}>
            <Icon name="settings" size={20} />
          </button>

          <button
            style={{ ...styles.authBtn, backgroundColor: t.primary }}
            onClick={() => {
              if (userEmail) {
                setUserEmail(null);
              } else {
                setAuthModalOpen(true);
              }
            }}
          >
            <Icon name="user" size={16} />
            <span>{userEmail ? "Sign Out" : "Sign In"}</span>
          </button>
        </div>
      </header>

      {/* BODY LAYOUT */}
      <div style={styles.mainBody}>
        {/* SIDEBAR (Chat History) */}
        {sidebarOpen && (
          <aside style={{ ...styles.sidebar, backgroundColor: t.surface, borderColor: t.border }}>
            <div style={styles.sidebarTop}>
              <button style={{ ...styles.newChatBtn, backgroundColor: t.primary, color: "#fff" }} onClick={createNewChat}>
                <Icon name="plus" size={16} />
                <span>New Chat</span>
              </button>
            </div>
            <div style={styles.sessionList}>
              {sessions.map((s) => (
                <div
                  key={s.id}
                  style={{
                    ...styles.sessionItem,
                    backgroundColor: s.id === activeSessionId ? t.border : "transparent",
                    color: t.text,
                  }}
                  onClick={() => setActiveSessionId(s.id)}
                >
                  <span style={styles.sessionTitle}>{s.title}</span>
                  <button
                    style={styles.deleteSessionBtn}
                    onClick={(e) => deleteSession(e, s.id)}
                    title="Delete Chat"
                  >
                    <Icon name="trash" size={14} color={t.textMuted} />
                  </button>
                </div>
              ))}
            </div>
            <div style={styles.sidebarFooter}>
              <div style={{ fontSize: "11px", color: t.textMuted }}>Connected Engine: OpenRouter</div>
              <div style={{ fontSize: "11px", color: t.textMuted, marginTop: "2px" }}>User: {userEmail || "Guest"}</div>
            </div>
          </aside>
        )}

        {/* CONTENT AREA */}
        <main style={{ ...styles.contentArea, backgroundColor: t.bg }}>
          {activeTab === "chat" && (
            <div style={styles.chatContainer}>
              <div style={styles.messageScroll}>
                {activeSession.messages.length === 0 ? (
                  <div style={styles.emptyState}>
                    <h2>Welcome to Roblox AI Studio</h2>
                    <p style={{ color: t.textMuted }}>Generate advanced Luau scripts, build complex GUIs, or test game automation.</p>
                  </div>
                ) : (
                  activeSession.messages.map((msg) => (
                    <div
                      key={msg.id}
                      style={{
                        ...styles.messageRow,
                        justifyContent: msg.role === "user" ? "flex-end" : "flex-start",
                      }}
                    >
                      <div
                        style={{
                          ...styles.messageBubble,
                          backgroundColor: msg.role === "user" ? t.primary : t.surface,
                          borderColor: t.border,
                          color: t.text,
                        }}
                      >
                        <div style={styles.messageText}>{msg.text}</div>

                        {/* Images Grid */}
                        {msg.images && msg.images.length > 0 && (
                          <div style={styles.imageGrid}>
                            {msg.images.map((imgUrl, idx) => (
                              <img key={idx} src={imgUrl} alt={`GUI Asset ${idx}`} style={styles.previewImage} />
                            ))}
                          </div>
                        )}

                        {/* Code Block */}
                        {msg.code && (
                          <div style={{ ...styles.codeContainer, backgroundColor: t.codeBg, borderColor: t.border }}>
                            <div style={{ ...styles.codeHeader, backgroundColor: t.surface, borderColor: t.border }}>
                              <span style={styles.codeFilename}>{msg.code.filename}</span>
                              <button
                                style={{ ...styles.copyBtn, color: t.text }}
                                onClick={() => copyToClipboard(msg.code!.content, msg.id)}
                              >
                                <Icon name={copiedId === msg.id ? "check" : "copy"} size={14} />
                                <span>{copiedId === msg.id ? "Copied!" : "Copy"}</span>
                              </button>
                            </div>
                            <pre style={styles.codePre}>
                              <code>{msg.code.content}</code>
                            </pre>
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}
                {isTyping && (
                  <div style={styles.messageRow}>
                    <div style={{ ...styles.messageBubble, backgroundColor: t.surface, borderColor: t.border, color: t.textMuted }}>
                      Generating response...
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Chat Input */}
              <div style={{ ...styles.inputArea, backgroundColor: t.surface, borderColor: t.border }}>
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask for a Roblox script, UI design, or gamepass layout..."
                  rows={2}
                  style={{ ...styles.textarea, backgroundColor: t.bg, color: t.text, borderColor: t.border }}
                />
                <button
                  style={{ ...styles.sendBtn, backgroundColor: t.primary }}
                  onClick={sendMessage}
                  disabled={isTyping || !input.trim()}
                >
                  <Icon name="send" size={18} color="#fff" />
                </button>
              </div>
            </div>
          )}

          {activeTab === "explorer" && (
            <div style={styles.tabContentPanel}>
              <h2 style={{ marginBottom: "16px" }}>Roblox Project Explorer</h2>
              <p style={{ color: t.textMuted, marginBottom: "20px" }}>Simulated hierarchical view of workspace, scripts, and GUIs.</p>
              <div style={{ ...styles.explorerBox, backgroundColor: t.surface, borderColor: t.border }}>
                {explorerTree.map((node) => renderExplorerNode(node))}
              </div>
            </div>
          )}

          {activeTab === "admin" && userEmail === "hossiani961@gmail.com" && (
            <div style={styles.tabContentPanel}>
              <h2 style={{ marginBottom: "8px" }}>Owner Admin Center</h2>
              <p style={{ color: t.textMuted, marginBottom: "20px" }}>Manage studio permissions, authorized admins, and platform status.</p>
              
              <div style={{ ...styles.adminTableWrapper, backgroundColor: t.surface, borderColor: t.border }}>
                <table style={styles.adminTable}>
                  <thead>
                    <tr style={{ borderBottom: `1px solid ${t.border}` }}>
                      <th style={styles.th}>Email</th>
                      <th style={styles.th}>Role</th>
                      <th style={styles.th}>Joined</th>
                      <th style={styles.th}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {adminList.map((admin, idx) => (
                      <tr key={idx} style={{ borderBottom: `1px solid ${t.border}` }}>
                        <td style={styles.td}>{admin.email}</td>
                        <td style={styles.td}><span style={{ ...styles.roleBadge, backgroundColor: admin.role === "Owner" ? "#238636" : "#30363d" }}>{admin.role}</span></td>
                        <td style={styles.td}>{admin.joinedDate}</td>
                        <td style={styles.td}><span style={{ color: admin.status === "Active" ? "#3fb950" : "#f85149" }}>{admin.status}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* SETTINGS MODAL */}
      <Modal isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} title="Studio Settings">
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div>
            <label style={styles.settingsLabel}>Theme Selection</label>
            <div style={{ display: "flex", gap: "10px", marginTop: "6px" }}>
              {(["dark", "midnight", "cyberpunk"] as ThemeName[]).map((thm) => (
                <button
                  key={thm}
                  style={{
                    ...styles.themeOptionBtn,
                    backgroundColor: theme === thm ? t.primary : t.bg,
                    borderColor: t.border,
                    color: t.text,
                    textTransform: "capitalize",
                  }}
                  onClick={() => setTheme(thm)}
                >
                  {thm}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label style={styles.settingsLabel}>System Instructions / Persona</label>
            <textarea
              value={systemInstructions}
              onChange={(e) => setSystemInstructions(e.target.value)}
              rows={4}
              style={{ ...styles.textarea, backgroundColor: t.bg, color: t.text, borderColor: t.border, width: "100%", marginTop: "6px" }}
            />
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "10px" }}>
            <button style={{ ...styles.authBtn, backgroundColor: t.primary }} onClick={() => setSettingsOpen(false)}>
              Save & Close
            </button>
          </div>
        </div>
      </Modal>

      {/* AUTH MODAL */}
      <Modal isOpen={authModalOpen} onClose={() => setAuthModalOpen(false)} title="Sign In to Roblox AI Studio">
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {authStep === 1 ? (
            <>
              <div>
                <label style={styles.settingsLabel}>Email Address</label>
                <input
                  type="email"
                  placeholder="name@example.com"
                  value={authEmail}
                  onChange={(e) => setAuthEmail(e.target.value)}
                  style={{ ...styles.input, backgroundColor: t.bg, color: t.text, borderColor: t.border, width: "100%", marginTop: "6px" }}
                />
              </div>
              <button
                style={{ ...styles.authBtn, backgroundColor: t.primary, width: "100%", justifyContent: "center", padding: "10px" }}
                onClick={() => {
                  if (authEmail.trim()) setAuthStep(2);
                }}
              >
                Send Verification Code
              </button>
            </>
          ) : (
            <>
              <p style={{ fontSize: "14px", color: t.textMuted, margin: 0 }}>
                We sent a verification code to <strong>{authEmail}</strong>. (For testing, enter any 6 digits).
              </p>
              <div>
                <label style={styles.settingsLabel}>Verification Code</label>
                <input
                  type="text"
                  placeholder="123456"
                  value={authCode}
                  onChange={(e) => setAuthCode(e.target.value)}
                  style={{ ...styles.input, backgroundColor: t.bg, color: t.text, borderColor: t.border, width: "100%", marginTop: "6px" }}
                />
              </div>
              <button
                style={{ ...styles.authBtn, backgroundColor: t.primary, width: "100%", justifyContent: "center", padding: "10px" }}
                onClick={() => {
                  setUserEmail(authEmail);
                  setAuthModalOpen(false);
                  setAuthStep(1);
                  setAuthCode("");
                }}
              >
                Verify & Sign In
              </button>
            </>
          )}
        </div>
      </Modal>
    </div>
  );
}

/* ============================================================================
   STYLESHEET
   ============================================================================ */

const styles = {
  container: { display: "flex", flexDirection: "column" as const, height: "100vh", width: "100vw", overflow: "hidden", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" },
  header: { display: "flex", alignItems: "center", justifyContent: "space-between", height: "60px", padding: "0 16px", borderBottomWidth: "1px", borderBottomStyle: "solid", zIndex: 10 },
  headerLeft: { display: "flex", alignItems: "center", gap: "12px" },
  logoArea: { display: "flex", alignItems: "center", gap: "8px" },
  logoBadge: { backgroundColor: "#238636", color: "#fff", fontWeight: 700, fontSize: "12px", padding: "3px 6px", borderRadius: "4px" },
  logoText: { fontWeight: 600, fontSize: "16px" },
  headerCenter: { display: "flex", alignItems: "center" },
  modelSelect: { padding: "6px 12px", borderRadius: "6px", borderStyle: "solid", borderWidth: "1px", fontSize: "13px", outline: "none", cursor: "pointer" },
  headerRight: { display: "flex", alignItems: "center", gap: "10px" },
  navTabBtn: { background: "none", border: "none", padding: "6px 12px", borderRadius: "6px", cursor: "pointer", fontSize: "13px", fontWeight: 500 },
  iconBtn: { background: "none", border: "none", cursor: "pointer", padding: "6px", borderRadius: "6px", display: "flex", alignItems: "center", justifyContent: "center" },
  authBtn: { display: "flex", alignItems: "center", gap: "6px", border: "none", padding: "6px 14px", borderRadius: "6px", color: "#fff", fontWeight: 600, fontSize: "13px", cursor: "pointer" },
  mainBody: { display: "flex", flex: 1, overflow: "hidden" },
  sidebar: { width: "260px", borderRightWidth: "1px", borderRightStyle: "solid", display: "flex", flexDirection: "column" as const },
  sidebarTop: { padding: "12px" },
  newChatBtn: { display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", width: "100%", padding: "10px", borderRadius: "6px", border: "none", fontWeight: 600, cursor: "pointer", fontSize: "13px" },
  sessionList: { flex: 1, overflowY: "auto" as const, padding: "0 8px", display: "flex", flexDirection: "column" as const, gap: "4px" },
  sessionItem: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 12px", borderRadius: "6px", cursor: "pointer", fontSize: "13px" },
  sessionTitle: { whiteSpace: "nowrap" as const, overflow: "hidden", textOverflow: "ellipsis", flex: 1 },
  deleteSessionBtn: { background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", padding: "2px" },
  sidebarFooter: { padding: "12px", borderTop: "1px solid rgba(255,255,255,0.05)" },
  contentArea: { flex: 1, display: "flex", flexDirection: "column" as const, overflow: "hidden" },
  chatContainer: { display: "flex", flexDirection: "column" as const, flex: 1, overflow: "hidden" },
  messageScroll: { flex: 1, overflowY: "auto" as const, padding: "20px", display: "flex", flexDirection: "column" as const, gap: "16px" },
  emptyState: { display: "flex", flexDirection: "column" as const, alignItems: "center", justifyContent: "center", height: "100%", textAlign: "center" as const },
  messageRow: { display: "flex", width: "100%" },
  messageBubble: { maxWidth: "80%", padding: "12px 16px", borderRadius: "12px", borderStyle: "solid", borderWidth: "1px", display: "flex", flexDirection: "column" as const, gap: "10px", fontSize: "14px", lineHeight: 1.5 },
  messageText: { whiteSpace: "pre-wrap" as const },
  imageGrid: { display: "flex", gap: "10px", flexWrap: "wrap" as const, marginTop: "6px" },
  previewImage: { width: "160px", height: "120px", objectFit: "cover" as const, borderRadius: "6px", border: "1px solid rgba(255,255,255,0.1)" },
  codeContainer: { borderRadius: "8px", overflow: "hidden", borderStyle: "solid", borderWidth: "1px", marginTop: "6px" },
  codeHeader: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 12px", borderBottomStyle: "solid", borderBottomWidth: "1px", fontSize: "12px" },
  codeFilename: { fontWeight: 600 },
  copyBtn: { background: "none", border: "none", display: "flex", alignItems: "center", gap: "4px", cursor: "pointer", fontSize: "12px" },
  codePre: { padding: "12px", margin: 0, overflowX: "auto" as const, fontSize: "13px", fontFamily: "Courier New, monospace" },
  inputArea: { display: "flex", padding: "16px", borderTopStyle: "solid", borderTopWidth: "1px", gap: "12px", alignItems: "center" },
  textarea: { flex: 1, padding: "10px 12px", borderRadius: "8px", borderStyle: "solid", borderWidth: "1px", fontSize: "14px", outline: "none", resize: "none" as const },
  sendBtn: { border: "none", borderRadius: "8px", width: "42px", height: "42px", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" },
  tabContentPanel: { flex: 1, padding: "24px", overflowY: "auto" as const },
  explorerBox: { borderStyle: "solid", borderWidth: "1px", borderRadius: "8px", padding: "12px", maxWidth: "400px" },
  adminTableWrapper: { borderStyle: "solid", borderWidth: "1px", borderRadius: "8px", overflow: "hidden", maxWidth: "800px" },
  adminTable: { width: "100%", borderCollapse: "collapse" as const, textAlign: "left" as const, fontSize: "13px" },
  th: { padding: "12px 16px", fontWeight: 600 },
  td: { padding: "12px 16px" },
  roleBadge: { padding: "2px 8px", borderRadius: "4px", color: "#fff", fontSize: "11px", fontWeight: 600 },
  settingsLabel: { fontSize: "13px", fontWeight: 600, display: "block" },
  themeOptionBtn: { padding: "8px 16px", borderRadius: "6px", borderStyle: "solid", borderWidth: "1px", cursor: "pointer", fontWeight: 500, fontSize: "13px" },
  input: { padding: "8px 12px", borderRadius: "6px", borderStyle: "solid", borderWidth: "1px", fontSize: "13px", outline: "none" },
};

export default RobloxAIStudio;
