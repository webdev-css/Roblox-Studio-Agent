// RobloxAIStudio.tsx
// A self-contained, production-ready Roblox AI Studio interface.
// No external dependencies beyond React. All styling is inline + a small injected stylesheet.

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
  images?: { id: string; title: string; gradient: string; icon: string }[];
  createdAt: number;
}

interface ChatSession {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: number;
}

interface ModelOption {
  id: string;
  label: string;
  tagline: string;
  emoji: string;
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
 * CONSTANTS
 * ==========================================================================*/

const ADMIN_EMAIL = "hossiani961@gmail.com";

const MODELS: ModelOption[] = [
  { id: "rdm-2.2", label: "rdm-2.2", tagline: "Fast Answers", emoji: "⚡" },
  { id: "rdm-2.1-pro", label: "rdm-2.1-pro", tagline: "Clean Scripting", emoji: "🧠" },
  {
    id: "rdm-1.1-mythical",
    label: "rdm-1.1-mythical",
    tagline: "Advanced UI & Images",
    emoji: "🎨",
  },
];

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
    fontFamily:
      "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
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
    fontFamily:
      "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
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
      {
        id: "ws-shop",
        label: "ShopModel",
        type: "folder",
        children: [
          { id: "ws-shop-door", label: "Door", type: "part" },
          { id: "ws-shop-sign", label: "Sign", type: "part" },
        ],
      },
    ],
  },
  {
    id: "replicated",
    label: "ReplicatedStorage",
    type: "folder",
    children: [
      { id: "rs-remotes", label: "Remotes", type: "folder", children: [
        { id: "rs-buy", label: "BuyItem", type: "script" },
      ] },
      { id: "rs-modules", label: "SharedModules", type: "folder", children: [
        { id: "rs-config", label: "ShopConfig", type: "script" },
      ] },
    ],
  },
  {
    id: "server",
    label: "ServerScriptService",
    type: "folder",
    children: [
      { id: "sss-main", label: "MainHandler", type: "script" },
      { id: "sss-shop", label: "ShopService", type: "script" },
      { id: "sss-data", label: "DataStoreManager", type: "script" },
    ],
  },
];

const INITIAL_ADMIN_USERS: AdminUser[] = [
  { id: "u1", email: ADMIN_EMAIL, role: "owner", status: "online", lastActive: "now" },
  { id: "u2", email: "dev.aria@studio.io", role: "admin", status: "online", lastActive: "2m ago" },
  { id: "u3", email: "builder_max@roblox.dev", role: "member", status: "idle", lastActive: "14m ago" },
  { id: "u4", email: "scripter.jules@gmail.com", role: "member", status: "offline", lastActive: "3h ago" },
  { id: "u5", email: "ui.designer@studio.io", role: "member", status: "online", lastActive: "1m ago" },
];

/* ============================================================================
 * UTILITIES
 * ==========================================================================*/

const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);

const IMAGE_GRADIENTS = [
  "linear-gradient(135deg,#ff2e97,#7a1fff,#00e5ff)",
  "linear-gradient(135deg,#00ffb3,#0088ff,#7a1fff)",
  "linear-gradient(135deg,#ffb800,#ff2e97,#7a1fff)",
  "linear-gradient(135deg,#ff512f,#dd2476,#7a1fff)",
  "linear-gradient(135deg,#12c2e9,#c471ed,#f64f59)",
  "linear-gradient(135deg,#0f0c29,#302b63,#24c6dc)",
];

const IMAGE_ICONS = ["🛒", "💎", "⚔️", "🎁", "🏆", "🔮", "🪙", "🧿", "🎮", "✨"];

/* ---- Prompt intent detection --------------------------------------------- */

function detectIntent(prompt: string): "image" | "code" | "text" {
  const p = prompt.toLowerCase();
  const imageWords = [
    "image", "images", "icon", "icons", "concept", "ui design", "gui design",
    "mockup", "art", "visual", "render", "thumbnail", "logo", "wallpaper",
    "picture", "generate ui", "ui concept", "crazy gui",
  ];
  const codeWords = [
    "script", "code", "luau", "lua", "shop", "gui", "leaderboard", "remote",
    "datastore", "function", "teleport", "gamepass", "button", "frame",
    "system", "handler", "module",
  ];
  const hasImage = imageWords.some((w) => p.includes(w));
  const hasCode = codeWords.some((w) => p.includes(w));
  // Image intent wins only if it's clearly visual (not "gui script")
  if (hasImage && !p.includes("script") && !p.includes("code")) return "image";
  if (hasImage && !hasCode) return "image";
  if (hasCode) return "code";
  return "text";
}

/* ---- Fake AI generators --------------------------------------------------- */

function generateLuauCode(prompt: string): { content: string; filename: string } {
  const p = prompt.toLowerCase();
  const isShop = p.includes("shop") || p.includes("buy") || p.includes("store");
  const isGui = p.includes("gui") || p.includes("ui") || p.includes("frame") || p.includes("button");

  if (isShop) {
    return {
      filename: "ShopHandler.lua",
      content: `--!strict
-- ShopHandler.lua  |  Generated by Roblox AI Studio
-- A functional shop GUI + purchase system.

local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local TweenService = game:GetService("TweenService")

local buyRemote = ReplicatedStorage:WaitForChild("Remotes"):WaitForChild("BuyItem")

local ITEMS = {
	{ Name = "Speed Coil", Price = 150, Icon = "rbxassetid://1234567" },
	{ Name = "Gravity Coil", Price = 250, Icon = "rbxassetid://2345678" },
	{ Name = "Rocket Launcher", Price = 500, Icon = "rbxassetid://3456789" },
}

local player = Players.LocalPlayer
local playerGui = player:WaitForChild("PlayerGui")

-- Build the ScreenGui
local screenGui = Instance.new("ScreenGui")
screenGui.Name = "ShopGui"
screenGui.ResetOnSpawn = false
screenGui.Parent = playerGui

local frame = Instance.new("Frame")
frame.Size = UDim2.fromScale(0.5, 0.6)
frame.Position = UDim2.fromScale(0.25, 0.2)
frame.BackgroundColor3 = Color3.fromRGB(22, 24, 32)
frame.BorderSizePixel = 0
frame.Parent = screenGui

local corner = Instance.new("UICorner")
corner.CornerRadius = UDim.new(0, 14)
corner.Parent = frame

local layout = Instance.new("UIListLayout")
layout.Padding = UDim.new(0, 8)
layout.SortOrder = Enum.SortOrder.LayoutOrder
layout.Parent = frame

for _, item in ipairs(ITEMS) do
	local btn = Instance.new("TextButton")
	btn.Size = UDim2.new(1, -20, 0, 50)
	btn.BackgroundColor3 = Color3.fromRGB(76, 139, 245)
	btn.Text = string.format("%s  -  %d ¢", item.Name, item.Price)
	btn.TextColor3 = Color3.new(1, 1, 1)
	btn.Font = Enum.Font.GothamBold
	btn.TextSize = 16
	btn.Parent = frame

	local btnCorner = Instance.new("UICorner")
	btnCorner.CornerRadius = UDim.new(0, 8)
	btnCorner.Parent = btn

	btn.MouseButton1Click:Connect(function()
		buyRemote:FireServer(item.Name)
		TweenService:Create(btn, TweenInfo.new(0.15), {
			BackgroundColor3 = Color3.fromRGB(34, 197, 94),
		}):Play()
	end)
end

print("[ShopHandler] Shop GUI loaded with", #ITEMS, "items.")
`,
    };
  }

  if (isGui) {
    return {
      filename: "CustomGui.lua",
      content: `--!strict
-- CustomGui.lua  |  Generated by Roblox AI Studio
-- A clean animated GUI panel with a toggle button.

local Players = game:GetService("Players")
local TweenService = game:GetService("TweenService")

local player = Players.LocalPlayer
local playerGui = player:WaitForChild("PlayerGui")

local screenGui = Instance.new("ScreenGui")
screenGui.Name = "CustomPanel"
screenGui.ResetOnSpawn = false
screenGui.Parent = playerGui

local panel = Instance.new("Frame")
panel.Size = UDim2.fromScale(0.35, 0.45)
panel.Position = UDim2.fromScale(0.325, 0.275)
panel.BackgroundColor3 = Color3.fromRGB(28, 32, 41)
panel.BackgroundTransparency = 0.05
panel.Parent = screenGui

local corner = Instance.new("UICorner")
corner.CornerRadius = UDim.new(0, 16)
corner.Parent = panel

local stroke = Instance.new("UIStroke")
stroke.Color = Color3.fromRGB(76, 139, 245)
stroke.Thickness = 2
stroke.Parent = panel

local title = Instance.new("TextLabel")
title.Size = UDim2.new(1, 0, 0, 44)
title.BackgroundTransparency = 1
title.Text = "Menu"
title.TextColor3 = Color3.new(1, 1, 1)
title.Font = Enum.Font.GothamBold
title.TextSize = 22
title.Parent = panel

local function togglePanel(open: boolean)
	local goal = open and UDim2.fromScale(0.325, 0.275) or UDim2.fromScale(0.325, 1.2)
	TweenService:Create(panel, TweenInfo.new(0.35, Enum.EasingStyle.Quart), {
		Position = goal,
	}):Play()
end

togglePanel(true)
print("[CustomGui] Panel initialised.")
`,
    };
  }

  return {
    filename: "GameScript.lua",
    content: `--!strict
-- GameScript.lua  |  Generated by Roblox AI Studio

local Players = game:GetService("Players")

Players.PlayerAdded:Connect(function(player: Player)
	print(player.Name .. " joined the experience!")

	local leaderstats = Instance.new("Folder")
	leaderstats.Name = "leaderstats"
	leaderstats.Parent = player

	local coins = Instance.new("IntValue")
	coins.Name = "Coins"
	coins.Value = 0
	coins.Parent = leaderstats
end)
`,
  };
}

function generateImages(prompt: string) {
  const count = 3;
  const imgs = [];
  for (let i = 0; i < count; i++) {
    imgs.push({
      id: uid(),
      title: `Concept ${i + 1}`,
      gradient: IMAGE_GRADIENTS[(prompt.length + i) % IMAGE_GRADIENTS.length],
      icon: IMAGE_ICONS[(prompt.length * (i + 1)) % IMAGE_ICONS.length],
    });
  }
  return imgs;
}

function buildAIResponse(prompt: string, modelId: string): Omit<ChatMessage, "id" | "createdAt"> {
  const intent = detectIntent(prompt);
  const model = MODELS.find((m) => m.id === modelId)!;

  if (intent === "image") {
    return {
      role: "ai",
      text: `Here are some high-end GUI concept assets I generated for "${prompt.trim()}" using ${model.label}. Each concept uses a bold gradient palette optimized for modern Roblox experiences. Click any concept to preview it larger, and iterate by describing the style you'd like next.`,
      images: generateImages(prompt),
      code: null,
    };
  }

  if (intent === "code") {
    const code = generateLuauCode(prompt);
    return {
      role: "ai",
      text: `Here's a functional Luau implementation for "${prompt.trim()}" (${model.label} · ${model.tagline}). The script is ready to drop into Roblox Studio — copy it or download the \`.lua\` file below. It follows clean, strictly-typed conventions and includes inline comments.`,
      code: { language: "lua", ...code },
      images: null,
    };
  }

  return {
    role: "ai",
    text: `Using ${model.label} (${model.tagline}): ${answerText(prompt)}`,
    code: null,
    images: null,
  };
}

function answerText(prompt: string): string {
  return `Great question about "${prompt.trim()}". In Roblox development, the key is to separate client and server responsibilities: keep GUI logic in LocalScripts under StarterPlayerScripts or StarterGui, put authoritative logic (economy, data, validation) in ServerScriptService, and communicate through RemoteEvents/RemoteFunctions stored in ReplicatedStorage. If you'd like, ask me to generate a specific script or a GUI concept image and I'll build it for you.`;
}

/* ============================================================================
 * SMALL PRESENTATIONAL COMPONENTS
 * ==========================================================================*/

const Icon: React.FC<{ path: string; size?: number; color?: string }> = ({
  path,
  size = 20,
  color = "currentColor",
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d={path} />
  </svg>
);

const ICONS = {
  menu: "M4 6h16M4 12h16M4 18h16",
  close: "M18 6 6 18M6 6l12 12",
  settings:
    "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z",
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
  /* ---- Theme --------------------------------------------------------------*/
  const [themeName, setThemeName] = useState<ThemeName>("midnight");
  const t = THEMES[themeName];

  /* ---- Layout -------------------------------------------------------------*/
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

  /* ---- Modals -------------------------------------------------------------*/
  const [showSettings, setShowSettings] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const [previewImage, setPreviewImage] =
    useState<{ title: string; gradient: string; icon: string } | null>(null);

  /* ---- Auth ---------------------------------------------------------------*/
  const [authStep, setAuthStep] = useState<"email" | "code" | "done">("email");
  const [authEmail, setAuthEmail] = useState("");
  const [authCode, setAuthCode] = useState("");
  const [sentCode, setSentCode] = useState("");
  const [authError, setAuthError] = useState("");
  const [currentUser, setCurrentUser] = useState<string | null>(null);

  const isOwner = currentUser === ADMIN_EMAIL;

  /* ---- Settings -----------------------------------------------------------*/
  const [systemInstructions, setSystemInstructions] = useState(
    "You are Roblox AI Studio, an expert Luau engineer and UI/UX designer. Produce clean, strictly-typed code and stunning GUI concepts."
  );

  /* ---- Model --------------------------------------------------------------*/
  const [modelId, setModelId] = useState<string>(MODELS[1].id);
  const [modelDropdownOpen, setModelDropdownOpen] = useState(false);

  /* ---- Explorer -----------------------------------------------------------*/
  const [expanded, setExpanded] = useState<Record<string, boolean>>({
    workspace: true,
    replicated: false,
    server: true,
  });

  /* ---- Chat sessions ------------------------------------------------------*/
  const [sessions, setSessions] = useState<ChatSession[]>(() => {
    const first: ChatSession = {
      id: uid(),
      title: "New Chat",
      messages: [
        {
          id: uid(),
          role: "ai",
          text:
            "👋 Welcome to Roblox AI Studio! Ask me to write Luau scripts (try \"make a shop GUI script\") or to generate crazy GUI concept images (try \"generate crazy GUI icons\"). Pick a model in the sidebar and let's build.",
          createdAt: Date.now(),
          code: null,
          images: null,
        },
      ],
      createdAt: Date.now(),
    };
    return [first];
  });
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

  /* ---- Admin users --------------------------------------------------------*/
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>(INITIAL_ADMIN_USERS);

  /* ============================================================================
   * HANDLERS
   * ==========================================================================*/

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

  const sendMessage = useCallback(() => {
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

    const delay = 700 + Math.random() * 700;
    window.setTimeout(() => {
      const aiPayload = buildAIResponse(text, modelId);
      const aiMsg: ChatMessage = { id: uid(), createdAt: Date.now(), ...aiPayload };
      setSessions((prev) =>
        prev.map((s) =>
          s.id === activeSessionId ? { ...s, messages: [...s.messages, aiMsg] } : s
        )
      );
      setIsTyping(false);
    }, delay);
  }, [input, isTyping, activeSessionId, modelId]);

  const copyCode = useCallback((msgId: string, content: string) => {
    const done = () => {
      setCopiedId(msgId);
      window.setTimeout(() => setCopiedId(null), 1500);
    };
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(content).then(done).catch(done);
    } else {
      const ta = document.createElement("textarea");
      ta.value = content;
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand("copy"); } catch {}
      document.body.removeChild(ta);
      done();
    }
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

  /* ---- Auth handlers ------------------------------------------------------*/
  const submitEmail = useCallback(() => {
    setAuthError("");
    const email = authEmail.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setAuthError("Please enter a valid email address.");
      return;
    }
    const code = String(Math.floor(100000 + Math.random() * 900000));
    setSentCode(code);
    setAuthStep("code");
  }, [authEmail]);

  const submitCode = useCallback(() => {
    setAuthError("");
    if (authCode.trim() !== sentCode) {
      setAuthError("Invalid verification code. Please try again.");
      return;
    }
    setCurrentUser(authEmail.trim().toLowerCase());
    setAuthStep("done");
    setAdminUsers((prev) => {
      const email = authEmail.trim().toLowerCase();
      if (prev.some((u) => u.email === email)) return prev;
      return [
        ...prev,
        { id: uid(), email, role: "member", status: "online", lastActive: "now" },
      ];
    });
    window.setTimeout(() => setShowAuth(false), 900);
  }, [authCode, sentCode, authEmail]);

  const resetAuth = useCallback(() => {
    setAuthStep("email");
    setAuthEmail("");
    setAuthCode("");
    setSentCode("");
    setAuthError("");
  }, []);

  const openAdmin = useCallback(() => {
    if (!currentUser) {
      setShowAuth(true);
      resetAuth();
      return;
    }
    setShowAdmin(true);
  }, [currentUser, resetAuth]);

  const changeUserRole = useCallback((id: string, role: AdminUser["role"]) => {
    setAdminUsers((prev) => prev.map((u) => (u.id === id ? { ...u, role } : u)));
  }, []);

  const removeUser = useCallback((id: string) => {
    setAdminUsers((prev) => prev.filter((u) => u.id === id || u.role === "owner"));
  }, []);

  /* ============================================================================
   * STYLES
   * ==========================================================================*/

  const styles = useMemo(() => makeStyles(t, isMobile), [t, isMobile]);

  /* ============================================================================
   * RENDER HELPERS
   * ==========================================================================*/

  const renderExplorerNode = (node: ExplorerNode, depth = 0): React.ReactNode => {
    const isFolder = node.type === "folder";
    const isOpen = expanded[node.id];
    const iconPath =
      node.type === "folder" ? ICONS.folder : node.type === "part" ? ICONS.box : ICONS.file;
    const iconColor =
      node.type === "folder" ? t.accent : node.type === "part" ? t.success : t.textDim;

    return (
      <div key={node.id}>
        <button
          type="button"
          onClick={() => isFolder && toggleExpand(node.id)}
          style={{
            ...styles.treeRow,
            paddingLeft: 8 + depth * 16,
            cursor: isFolder ? "pointer" : "default",
          }}
        >
          {isFolder ? (
            <span
              style={{
                display: "inline-flex",
                transform: isOpen ? "rotate(90deg)" : "rotate(0deg)",
                transition: "transform .15s ease",
                color: t.textDim,
              }}
            >
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

  const activeModel = MODELS.find((m) => m.id === modelId)!;

  /* ============================================================================
   * JSX
   * ==========================================================================*/

  return (
    <div style={styles.root}>
      <StyleInjector accent={t.accent} bgInput={t.bgInput} />

      {/* ============================ HEADER ============================ */}
      <header style={styles.header}>
        <div style={styles.headerLeft}>
          <button
            type="button"
            aria-label="Toggle sidebar"
            onClick={() => setSidebarOpen((o) => !o)}
            style={styles.iconBtn}
          >
            <Icon path={sidebarOpen && !isMobile ? ICONS.close : ICONS.menu} />
          </button>
          <div style={styles.brand}>
            <div style={styles.logoMark}>R</div>
            <div style={styles.brandTextWrap}>
              <span style={styles.brandTitle}>Roblox AI Studio</span>
              <span style={styles.brandSub}>{activeModel.label} · {activeModel.tagline}</span>
            </div>
          </div>
        </div>

        <div style={styles.headerRight}>
          {currentUser && (
            <div style={styles.userChip} title={currentUser}>
              <Icon path={ICONS.user} size={14} />
              <span style={styles.userChipText}>
                {currentUser.split("@")[0]}
              </span>
            </div>
          )}
          <button
            type="button"
            onClick={() => setShowSettings(true)}
            style={styles.headerBtn}
          >
            <Icon path={ICONS.settings} size={16} />
            <span style={styles.hideOnMobile}>Settings</span>
          </button>
          <button
            type="button"
            onClick={openAdmin}
            style={{ ...styles.headerBtn, ...styles.adminBtn }}
          >
            <Icon path={ICONS.shield} size={16} />
            <span style={styles.hideOnMobile}>Admin</span>
          </button>
        </div>
      </header>

      {/* ============================ BODY ============================ */}
      <div style={styles.body}>
        {/* Overlay for mobile */}
        {sidebarOpen && isMobile && (
          <div style={styles.overlay} onClick={() => setSidebarOpen(false)} />
        )}

        {/* ============================ SIDEBAR ============================ */}
        <aside
          style={{
            ...styles.sidebar,
            transform: sidebarOpen ? "translateX(0)" : "translateX(-110%)",
            position: isMobile ? "fixed" : "relative",
          }}
        >
          {/* Model selector */}
          <div style={styles.sidebarSection}>
            <div style={styles.sectionLabel}>AI Model</div>
            <div style={{ position: "relative" }}>
              <button
                type="button"
                onClick={() => setModelDropdownOpen((o) => !o)}
                style={styles.modelBtn}
              >
                <span style={styles.modelEmoji}>{activeModel.emoji}</span>
                <span style={{ flex: 1, textAlign: "left" }}>
                  <span style={styles.modelName}>{activeModel.label}</span>
                  <span style={styles.modelTag}>{activeModel.tagline}</span>
                </span>
                <span
                  style={{
                    transform: modelDropdownOpen ? "rotate(90deg)" : "rotate(0)",
                    transition: "transform .15s",
                    color: t.textDim,
                  }}
                >
                  <Icon path={ICONS.chevron} size={16} />
                </span>
              </button>
              {modelDropdownOpen && (
                <div style={styles.modelDropdown}>
                  {MODELS.map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => {
                        setModelId(m.id);
                        setModelDropdownOpen(false);
                      }}
                      style={{
                        ...styles.modelOption,
                        background:
                          m.id === modelId ? t.accentSoft : "transparent",
                      }}
                    >
                      <span style={styles.modelEmoji}>{m.emoji}</span>
                      <span style={{ flex: 1, textAlign: "left" }}>
                        <span style={styles.modelName}>{m.label}</span>
                        <span style={styles.modelTag}>{m.tagline}</span>
                      </span>
                      {m.id === modelId && (
                        <Icon path={ICONS.check} size={16} color={t.accent} />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Chat sessions */}
          <div style={styles.sidebarSection}>
            <div style={styles.sectionHeaderRow}>
              <span style={styles.sectionLabel}>Chats</span>
              <button
                type="button"
                onClick={newSession}
                style={styles.smallGhostBtn}
                title="New chat"
              >
                <Icon path={ICONS.plus} size={15} />
              </button>
            </div>
            <div style={styles.sessionList}>
              {sessions.map((s) => (
                <div
                  key={s.id}
                  style={{
                    ...styles.sessionItem,
                    background:
                      s.id === activeSessionId ? t.accentSoft : "transparent",
                    borderColor:
                      s.id === activeSessionId ? t.accent : "transparent",
                  }}
                  onClick={() => {
                    setActiveSessionId(s.id);
                    if (isMobile) setSidebarOpen(false);
                  }}
                >
                  <Icon path={ICONS.chat} size={15} color={t.textDim} />
                  <span style={styles.sessionTitle}>{s.title || "New Chat"}</span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteSession(s.id);
                    }}
                    style={styles.sessionDelete}
                    title="Delete chat"
                  >
                    <Icon path={ICONS.trash} size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Explorer */}
          <div style={{ ...styles.sidebarSection, flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
            <div style={styles.sectionLabel}>Explorer</div>
            <div style={styles.explorerTree}>
              {INITIAL_EXPLORER.map((n) => renderExplorerNode(n))}
            </div>
          </div>
        </aside>

        {/* ============================ MAIN CHAT ============================ */}
        <main style={styles.main}>
          <div style={styles.messages}>
            {activeSession.messages.length === 0 && !isTyping && (
              <div style={styles.emptyState}>
                <div style={styles.emptyLogo}>R</div>
                <h2 style={styles.emptyTitle}>How can I help you build?</h2>
                <p style={styles.emptySub}>
                  Ask for Luau scripts or crazy GUI concept images.
                </p>
                <div style={styles.suggestionGrid}>
                  {[
                    "Make a shop GUI script",
                    "Generate crazy GUI icons",
                    "Create a leaderboard system",
                    "Design a UI concept image",
                  ].map((s) => (
                    <button
                      key={s}
                      type="button"
                      style={styles.suggestion}
                      onClick={() => setInput(s)}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {activeSession.messages.map((m) => (
              <div
                key={m.id}
                style={{
                  ...styles.messageRow,
                  justifyContent: m.role === "user" ? "flex-end" : "flex-start",
                }}
              >
                <div
                  style={{
                    ...styles.bubble,
                    background: m.role === "user" ? t.bubbleUser : t.bubbleAI,
                    border: `1px solid ${t.border}`,
                    borderTopRightRadius: m.role === "user" ? 4 : 14,
                    borderTopLeftRadius: m.role === "user" ? 14 : 4,
                  }}
                >
                  {m.role === "ai" && (
                    <div style={styles.bubbleTag}>
                      <span style={styles.aiDot} /> AI · {activeModel.label}
                    </div>
                  )}
                  <div style={styles.bubbleText}>{m.text}</div>

                  {/* Code block */}
                  {m.code && (
                    <div style={styles.codeBlock}>
                      <div style={styles.codeHeader}>
                        <span style={styles.codeFilename}>
                          <Icon path={ICONS.file} size={13} color={t.textDim} />
                          {m.code.filename}
                        </span>
                        <div style={styles.codeActions}>
                          <button
                            type="button"
                            style={styles.codeBtn}
                            onClick={() => copyCode(m.id, m.code!.content)}
                          >
                            <Icon
                              path={copiedId === m.id ? ICONS.check : ICONS.copy}
                              size={13}
                            />
                            {copiedId === m.id ? "Copied" : "Copy"}
                          </button>
                          <button
                            type="button"
                            style={styles.codeBtn}
                            onClick={() =>
                              downloadCode(m.code!.filename, m.code!.content)
                            }
                          >
                            <Icon path={ICONS.download} size={13} />
                            .lua
                          </button>
                        </div>
                      </div>
                      <pre style={styles.codePre}>
                        <code>{m.code.content}</code>
                      </pre>
                    </div>
                  )}

                  {/* Generated images */}
                  {m.images && m.images.length > 0 && (
                    <div style={styles.imageGrid}>
                      {m.images.map((img) => (
                        <button
                          key={img.id}
                          type="button"
                          style={{ ...styles.imageCard, background: img.gradient }}
                          onClick={() => setPreviewImage(img)}
                          title="Click to preview"
                        >
                          <span style={styles.imageIcon}>{img.icon}</span>
                          <span style={styles.imageOverlay}>
                            <span style={styles.imageTitle}>{img.title}</span>
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {isTyping && (
              <div style={{ ...styles.messageRow, justifyContent: "flex-start" }}>
                <div
                  style={{
                    ...styles.bubble,
                    background: t.bubbleAI,
                    border: `1px solid ${t.border}`,
                    borderTopLeftRadius: 4,
                  }}
                >
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

          {/* Composer */}
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
                placeholder={`Message ${activeModel.label}…  (try "generate crazy GUI icons")`}
                rows={1}
                style={styles.textarea}
              />
              <button
                type="button"
                onClick={sendMessage}
                disabled={!input.trim() || isTyping}
                style={{
                  ...styles.sendBtn,
                  opacity: !input.trim() || isTyping ? 0.4 : 1,
                  cursor: !input.trim() || isTyping ? "not-allowed" : "pointer",
                }}
              >
                <Icon path={ICONS.send} size={18} color={t.accentText} />
              </button>
            </div>
            <div style={styles.composerHint}>
              Roblox AI Studio can generate Luau code & GUI concept images. Verify scripts before publishing.
            </div>
          </div>
        </main>
      </div>

      {/* ============================ SETTINGS MODAL ============================ */}
      {showSettings && (
        <Modal title="Settings" onClose={() => setShowSettings(false)} styles={styles} t={t}>
          <div style={styles.settingsGroup}>
            <div style={styles.settingsLabel}>Theme</div>
            <div style={styles.themeGrid}>
              {(Object.keys(THEMES) as ThemeName[]).map((key) => {
                const th = THEMES[key];
                const selected = key === themeName;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setThemeName(key)}
                    style={{
                      ...styles.themeCard,
                      borderColor: selected ? th.accent : t.border,
                      boxShadow: selected ? `0 0 0 2px ${th.accent}55` : "none",
                    }}
                  >
                    <div
                      style={{
                        ...styles.themeSwatch,
                        background: th.headerGradient,
                      }}
                    >
                      <span style={{ ...styles.themeSwatchDot, background: th.accent }} />
                      <span
                        style={{
                          ...styles.themeSwatchDot,
                          background: th.success,
                          left: 26,
                        }}
                      />
                    </div>
                    <span style={styles.themeName}>{th.name}</span>
                    {selected && (
                      <span style={styles.themeCheck}>
                        <Icon path={ICONS.check} size={14} color={th.accent} />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <div style={styles.settingsGroup}>
            <div style={styles.settingsLabel}>Custom System Instructions</div>
            <textarea
              value={systemInstructions}
              onChange={(e) => setSystemInstructions(e.target.value)}
              rows={5}
              style={styles.settingsTextarea}
              placeholder="Describe how the AI should behave…"
            />
            <div style={styles.settingsHint}>
              These instructions guide how the AI writes code and generates concepts.
            </div>
          </div>

          <div style={styles.settingsGroup}>
            <div style={styles.settingsLabel}>Account</div>
            {currentUser ? (
              <div style={styles.accountRow}>
                <div>
                  <div style={styles.accountEmail}>{currentUser}</div>
                  <div style={styles.accountRole}>
                    {isOwner ? "Owner" : "Signed in"}
                  </div>
                </div>
                <button
                  type="button"
                  style={styles.dangerBtn}
                  onClick={() => {
                    setCurrentUser(null);
                    resetAuth();
                  }}
                >
                  Sign out
                </button>
              </div>
            ) : (
              <button
                type="button"
                style={styles.primaryBtn}
                onClick={() => {
                  setShowSettings(false);
                  setShowAuth(true);
                  resetAuth();
                }}
              >
                <Icon path={ICONS.mail} size={16} /> Sign in with Email
              </button>
            )}
          </div>
        </Modal>
      )}

      {/* ============================ AUTH MODAL ============================ */}
      {showAuth && (
        <Modal
          title="Sign in to Roblox AI Studio"
          onClose={() => setShowAuth(false)}
          styles={styles}
          t={t}
        >
          {authStep === "email" && (
            <>
              <p style={styles.authIntro}>
                Enter your email and we'll send a 6-digit verification code.
              </p>
              <label style={styles.settingsLabel}>Email address</label>
              <input
                type="email"
                value={authEmail}
                onChange={(e) => setAuthEmail(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && submitEmail()}
                placeholder="you@example.com"
                style={styles.input}
                autoFocus
              />
              {authError && <div style={styles.errorText}>{authError}</div>}
              <button type="button" style={styles.primaryBtn} onClick={submitEmail}>
                <Icon path={ICONS.mail} size={16} /> Send Code
              </button>
              <div style={styles.settingsHint}>
                Tip: sign in as <b>{ADMIN_EMAIL}</b> for admin access.
              </div>
            </>
          )}

          {authStep === "code" && (
            <>
              <p style={styles.authIntro}>
                We sent a verification code to <b>{authEmail}</b>.
              </p>
              <div style={styles.demoCode}>
                Demo code: <b style={{ letterSpacing: 3 }}>{sentCode}</b>
              </div>
              <label style={styles.settingsLabel}>Verification code</label>
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={authCode}
                onChange={(e) => setAuthCode(e.target.value.replace(/\D/g, ""))}
                onKeyDown={(e) => e.key === "Enter" && submitCode()}
                placeholder="000000"
                style={{ ...styles.input, letterSpacing: 8, textAlign: "center", fontSize: 22 }}
                autoFocus
              />
              {authError && <div style={styles.errorText}>{authError}</div>}
              <button type="button" style={styles.primaryBtn} onClick={submitCode}>
                <Icon path={ICONS.check} size={16} /> Verify & Sign in
              </button>
              <button
                type="button"
                style={styles.ghostBtn}
                onClick={() => setAuthStep("email")}
              >
                ← Use a different email
              </button>
            </>
          )}

          {authStep === "done" && (
            <div style={styles.successState}>
              <div style={styles.successCheck}>
                <Icon path={ICONS.check} size={40} color={t.success} />
              </div>
              <h3 style={styles.successTitle}>Signed in!</h3>
              <p style={styles.emptySub}>Welcome, {authEmail}</p>
            </div>
          )}
        </Modal>
      )}

      {/* ============================ ADMIN MODAL ============================ */}
      {showAdmin && (
        <Modal
          title="Admin Control Center"
          onClose={() => setShowAdmin(false)}
          styles={styles}
          t={t}
          wide
        >
          {!isOwner ? (
            <div style={styles.emptyState}>
              <div style={{ ...styles.emptyLogo, background: t.danger }}>
                <Icon path={ICONS.shield} size={26} color="#fff" />
              </div>
              <h3 style={styles.successTitle}>Access Restricted</h3>
              <p style={styles.emptySub}>
                Only the owner ({ADMIN_EMAIL}) can access the admin dashboard.
              </p>
            </div>
          ) : (
            <>
              <div style={styles.statsRow}>
                <StatCard
                  label="Active Users"
                  value={String(adminUsers.filter((u) => u.status === "online").length)}
                  color={t.success}
                  styles={styles}
                />
                <StatCard
                  label="Total Users"
                  value={String(adminUsers.length)}
                  color={t.accent}
                  styles={styles}
                />
                <StatCard
                  label="Admins"
                  value={String(
                    adminUsers.filter((u) => u.role === "admin" || u.role === "owner").length
                  )}
                  color={t.textDim}
                  styles={styles}
                />
              </div>

              <div style={styles.settingsLabel}>Manage Users & Permissions</div>
              <div style={styles.userTable}>
                <div style={styles.userTableHead}>
                  <span style={{ flex: 2 }}>User</span>
                  <span style={{ flex: 1 }}>Status</span>
                  <span style={{ flex: 1 }}>Role</span>
                  <span style={{ width: 40 }} />
                </div>
                {adminUsers.map((u) => (
                  <div key={u.id} style={styles.userRow}>
                    <div style={{ flex: 2, display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                      <span
                        style={{
                          ...styles.avatar,
                          background: u.role === "owner" ? t.accent : t.bgInput,
                        }}
                      >
                        {u.email[0].toUpperCase()}
                      </span>
                      <span style={styles.userEmail}>{u.email}</span>
                    </div>
                    <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 6 }}>
                      <span
                        style={{
                          ...styles.statusDot,
                          background:
                            u.status === "online"
                              ? t.success
                              : u.status === "idle"
                              ? "#eab308"
                              : t.textFaint,
                        }}
                      />
                      <span style={styles.statusText}>{u.status}</span>
                    </div>
                    <div style={{ flex: 1 }}>
                      {u.role === "owner" ? (
                        <span style={styles.ownerBadge}>Owner</span>
                      ) : (
                        <select
                          value={u.role}
                          onChange={(e) =>
                            changeUserRole(u.id, e.target.value as AdminUser["role"])
                          }
                          style={styles.roleSelect}
                        >
                          <option value="member">Member</option>
                          <option value="admin">Admin</option>
                        </select>
                      )}
                    </div>
                    <div style={{ width: 40, textAlign: "right" }}>
                      {u.role !== "owner" && (
                        <button
                          type="button"
                          style={styles.iconBtnDanger}
                          onClick={() => removeUser(u.id)}
                          title="Remove user"
                        >
                          <Icon path={ICONS.trash} size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </Modal>
      )}

      {/* ============================ IMAGE PREVIEW ============================ */}
      {previewImage && (
        <div style={styles.modalOverlay} onClick={() => setPreviewImage(null)}>
          <div
            style={{
              ...styles.imagePreview,
              background: previewImage.gradient,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              style={styles.previewClose}
              onClick={() => setPreviewImage(null)}
            >
              <Icon path={ICONS.close} size={18} color="#fff" />
            </button>
            <span style={{ fontSize: 90 }}>{previewImage.icon}</span>
            <span style={styles.previewTitle}>{previewImage.title}</span>
          </div>
        </div>
      )}
    </div>
  );
};

/* ============================================================================
 * SUB-COMPONENTS
 * ==========================================================================*/

const Modal: React.FC<{
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  styles: ReturnType<typeof makeStyles>;
  t: ThemeTokens;
  wide?: boolean;
}> = ({ title, onClose, children, styles, wide }) => (
  <div style={styles.modalOverlay} onClick={onClose}>
    <div
      style={{ ...styles.modal, maxWidth: wide ? 640 : 460 }}
      onClick={(e) => e.stopPropagation()}
    >
      <div style={styles.modalHeader}>
        <h3 style={styles.modalTitle}>{title}</h3>
        <button type="button" style={styles.iconBtn} onClick={onClose} aria-label="Close">
          <Icon path={ICONS.close} size={18} />
        </button>
      </div>
      <div style={styles.modalBody}>{children}</div>
    </div>
  </div>
);

const StatCard: React.FC<{
  label: string;
  value: string;
  color: string;
  styles: ReturnType<typeof makeStyles>;
}> = ({ label, value, color, styles }) => (
  <div style={styles.statCard}>
    <div style={{ ...styles.statValue, color }}>{value}</div>
    <div style={styles.statLabel}>{label}</div>
  </div>
);

/* Injects keyframes & scrollbar / placeholder styling that inline styles can't. */
const StyleInjector: React.FC<{ accent: string; bgInput: string }> = ({ accent, bgInput }) => (
  <style
    dangerouslySetInnerHTML={{
      __html: `
      * { box-sizing: border-box; }
      @keyframes rai-blink { 0%,80%,100%{opacity:.25;transform:translateY(0)} 40%{opacity:1;transform:translateY(-3px)} }
      @keyframes rai-fade { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
      @keyframes rai-pop { from{opacity:0;transform:scale(.94)} to{opacity:1;transform:scale(1)} }
      textarea::placeholder, input::placeholder { color: rgba(150,160,180,.6); }
      .rai-scroll::-webkit-scrollbar { width: 8px; height: 8px; }
      .rai-scroll::-webkit-scrollbar-thumb { background: ${bgInput}; border-radius: 8px; }
      .rai-scroll::-webkit-scrollbar-thumb:hover { background: ${accent}; }
      .rai-scroll::-webkit-scrollbar-track { background: transparent; }
      button { font-family: inherit; }
      textarea { font-family: inherit; }
    `,
    }}
  />
);

/* ============================================================================
 * STYLE FACTORY
 * ==========================================================================*/

function makeStyles(t: ThemeTokens, isMobile: boolean) {
  const s: Record<string, CSSProperties> = {
    root: {
      position: "fixed",
      inset: 0,
      display: "flex",
      flexDirection: "column",
      background: t.bg,
      color: t.text,
      fontFamily: t.fontFamily,
      fontSize: 14,
      lineHeight: 1.5,
      overflow: "hidden",
      WebkitFontSmoothing: "antialiased",
    },

    /* Header ---------------------------------------------------------------*/
    header: {
      position: "sticky",
      top: 0,
      left: 0,
      right: 0,
      zIndex: 100,
      flex: "0 0 auto",
      height: 60,
      minHeight: 60,
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "0 12px",
      background: t.headerGradient,
      borderBottom: `1px solid ${t.border}`,
      boxShadow: `0 2px 12px rgba(0,0,0,0.35)`,
    },
    headerLeft: { display: "flex", alignItems: "center", gap: 10, minWidth: 0 },
    headerRight: { display: "flex", alignItems: "center", gap: 8, flexShrink: 0 },
    brand: { display: "flex", alignItems: "center", gap: 10, minWidth: 0 },
    logoMark: {
      width: 34,
      height: 34,
      borderRadius: 9,
      background: t.accent,
      color: t.accentText,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontWeight: 800,
      fontSize: 18,
      flexShrink: 0,
      boxShadow: t.glow,
    },
    brandTextWrap: { display: "flex", flexDirection: "column", minWidth: 0 },
    brandTitle: {
      fontWeight: 700,
      fontSize: isMobile ? 15 : 16,
      whiteSpace: "nowrap",
      overflow: "hidden",
      textOverflow: "ellipsis",
    },
    brandSub: {
      fontSize: 11,
      color: t.textDim,
      whiteSpace: "nowrap",
      overflow: "hidden",
      textOverflow: "ellipsis",
      display: isMobile ? "none" : "block",
    },

    iconBtn: {
      width: 38,
      height: 38,
      borderRadius: 9,
      border: `1px solid ${t.border}`,
      background: t.bgInput,
      color: t.text,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      cursor: "pointer",
      flexShrink: 0,
    },
    iconBtnDanger: {
      width: 30,
      height: 30,
      borderRadius: 7,
      border: `1px solid ${t.border}`,
      background: "transparent",
      color: t.danger,
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      cursor: "pointer",
    },
    headerBtn: {
      display: "flex",
      alignItems: "center",
      gap: 7,
      height: 38,
      padding: isMobile ? "0 10px" : "0 14px",
      borderRadius: 9,
      border: `1px solid ${t.border}`,
      background: t.bgInput,
      color: t.text,
      fontSize: 13,
      fontWeight: 600,
      cursor: "pointer",
    },
    adminBtn: {
      background: t.accent,
      color: t.accentText,
      border: `1px solid ${t.accent}`,
      boxShadow: t.glow,
    },
    hideOnMobile: { display: isMobile ? "none" : "inline" },
    userChip: {
      display: isMobile ? "none" : "flex",
      alignItems: "center",
      gap: 6,
      height: 34,
      padding: "0 12px",
      borderRadius: 20,
      background: t.accentSoft,
      color: t.accent,
      fontSize: 12,
      fontWeight: 600,
      maxWidth: 160,
    },
    userChipText: {
      whiteSpace: "nowrap",
      overflow: "hidden",
      textOverflow: "ellipsis",
    },

    /* Body -----------------------------------------------------------------*/
    body: {
      flex: 1,
      display: "flex",
      minHeight: 0,
      position: "relative",
    },
    overlay: {
      position: "fixed",
      inset: 0,
      top: 60,
      background: "rgba(0,0,0,0.55)",
      zIndex: 40,
    },

    /* Sidebar --------------------------------------------------------------*/
    sidebar: {
      top: 60,
      bottom: 0,
      left: 0,
      width: 280,
      minWidth: 280,
      height: isMobile ? "calc(100% - 60px)" : "auto",
      background: t.bgElevated,
      borderRight: `1px solid ${t.border}`,
      display: "flex",
      flexDirection: "column",
      gap: 4,
      padding: 12,
      zIndex: 50,
      transition: "transform .25s ease",
      overflowY: "auto",
    },
    sidebarSection: { padding: "8px 4px", flexShrink: 0 },
    sectionLabel: {
      fontSize: 11,
      fontWeight: 700,
      textTransform: "uppercase",
      letterSpacing: 1,
      color: t.textFaint,
      marginBottom: 8,
    },
    sectionHeaderRow: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
    },
    smallGhostBtn: {
      width: 26,
      height: 26,
      borderRadius: 7,
      border: `1px solid ${t.border}`,
      background: t.bgInput,
      color: t.text,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      cursor: "pointer",
      marginBottom: 8,
    },

    /* Model selector -------------------------------------------------------*/
    modelBtn: {
      width: "100%",
      display: "flex",
      alignItems: "center",
      gap: 10,
      padding: "10px 12px",
      borderRadius: 10,
      border: `1px solid ${t.borderStrong}`,
      background: t.bgInput,
      color: t.text,
      cursor: "pointer",
    },
    modelEmoji: { fontSize: 18, flexShrink: 0 },
    modelName: { display: "block", fontWeight: 700, fontSize: 13 },
    modelTag: { display: "block", fontSize: 11, color: t.textDim },
    modelDropdown: {
      position: "absolute",
      top: "calc(100% + 6px)",
      left: 0,
      right: 0,
      background: t.bgPanel,
      border: `1px solid ${t.borderStrong}`,
      borderRadius: 10,
      padding: 6,
      zIndex: 30,
      boxShadow: "0 10px 30px rgba(0,0,0,0.5)",
      animation: "rai-pop .12s ease",
    },
    modelOption: {
      width: "100%",
      display: "flex",
      alignItems: "center",
      gap: 10,
      padding: "9px 10px",
      borderRadius: 8,
      border: "none",
      color: t.text,
      cursor: "pointer",
    },

    /* Sessions -------------------------------------------------------------*/
    sessionList: { display: "flex", flexDirection: "column", gap: 4, maxHeight: 200, overflowY: "auto" },
    sessionItem: {
      display: "flex",
      alignItems: "center",
      gap: 8,
      padding: "9px 10px",
      borderRadius: 9,
      cursor: "pointer",
      border: "1px solid transparent",
    },
    sessionTitle: {
      flex: 1,
      fontSize: 13,
      whiteSpace: "nowrap",
      overflow: "hidden",
      textOverflow: "ellipsis",
      color: t.text,
    },
    sessionDelete: {
      width: 24,
      height: 24,
      borderRadius: 6,
      border: "none",
      background: "transparent",
      color: t.textFaint,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      cursor: "pointer",
      flexShrink: 0,
    },

    /* Explorer -------------------------------------------------------------*/
    explorerTree: {
      overflowY: "auto",
      flex: 1,
      borderRadius: 10,
      border: `1px solid ${t.border}`,
      background: t.bgPanel,
      padding: 6,
    },
    treeRow: {
      width: "100%",
      display: "flex",
      alignItems: "center",
      gap: 7,
      padding: "6px 6px",
      borderRadius: 7,
      border: "none",
      background: "transparent",
      color: t.text,
      textAlign: "left",
    },
    treeLabel: {
      fontSize: 13,
      whiteSpace: "nowrap",
      overflow: "hidden",
      textOverflow: "ellipsis",
    },

    /* Main / messages ------------------------------------------------------*/
    main: {
      flex: 1,
      display: "flex",
      flexDirection: "column",
      minWidth: 0,
      minHeight: 0,
      background: t.bg,
    },
    messages: {
      flex: 1,
      overflowY: "auto",
      padding: isMobile ? "16px 12px" : "24px 20px",
      display: "flex",
      flexDirection: "column",
      gap: 16,
    },
    messageRow: { display: "flex", width: "100%", animation: "rai-fade .25s ease" },
    bubble: {
      maxWidth: isMobile ? "90%" : "78%",
      padding: "12px 14px",
      borderRadius: 14,
      wordBreak: "break-word",
    },
    bubbleTag: {
      display: "flex",
      alignItems: "center",
      gap: 6,
      fontSize: 11,
      fontWeight: 700,
      color: t.accent,
      marginBottom: 6,
    },
    aiDot: {
      width: 7,
      height: 7,
      borderRadius: "50%",
      background: t.accent,
      display: "inline-block",
      boxShadow: t.glow,
    },
    bubbleText: { whiteSpace: "pre-wrap", fontSize: 14, color: t.text },

    /* Code block -----------------------------------------------------------*/
    codeBlock: {
      marginTop: 12,
      borderRadius: 10,
      border: `1px solid ${t.borderStrong}`,
      overflow: "hidden",
      background: "#0b0d12",
    },
    codeHeader: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 8,
      padding: "8px 10px",
      background: "rgba(255,255,255,0.03)",
      borderBottom: `1px solid ${t.border}`,
    },
    codeFilename: {
      display: "flex",
      alignItems: "center",
      gap: 6,
      fontSize: 12,
      fontWeight: 600,
      color: t.textDim,
      fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
    },
    codeActions: { display: "flex", gap: 6 },
    codeBtn: {
      display: "flex",
      alignItems: "center",
      gap: 5,
      padding: "5px 9px",
      borderRadius: 7,
      border: `1px solid ${t.borderStrong}`,
      background: t.bgInput,
      color: t.text,
      fontSize: 11,
      fontWeight: 600,
      cursor: "pointer",
    },
    codePre: {
      margin: 0,
      padding: "12px 14px",
      overflowX: "auto",
      fontSize: 12.5,
      lineHeight: 1.6,
      color: "#d6deeb",
      fontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
      maxHeight: 380,
    },

    /* Image grid -----------------------------------------------------------*/
    imageGrid: {
      marginTop: 12,
      display: "grid",
      gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))",
      gap: 10,
    },
    imageCard: {
      position: "relative",
      aspectRatio: "1 / 1",
      borderRadius: 12,
      border: "none",
      cursor: "pointer",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      overflow: "hidden",
      boxShadow: "0 6px 20px rgba(0,0,0,0.4)",
    },
    imageIcon: { fontSize: 40, filter: "drop-shadow(0 2px 6px rgba(0,0,0,.4))" },
    imageOverlay: {
      position: "absolute",
      left: 0,
      right: 0,
      bottom: 0,
      padding: "8px 10px",
      background: "linear-gradient(transparent, rgba(0,0,0,0.6))",
    },
    imageTitle: { color: "#fff", fontSize: 12, fontWeight: 700 },

    /* Typing ---------------------------------------------------------------*/
    typing: { display: "flex", gap: 5, padding: "4px 2px" },
    typingDot: {
      width: 8,
      height: 8,
      borderRadius: "50%",
      background: t.textDim,
      display: "inline-block",
      animation: "rai-blink 1.2s infinite ease-in-out",
    },

    /* Empty state ----------------------------------------------------------*/
    emptyState: {
      margin: "auto",
      textAlign: "center",
      maxWidth: 460,
      padding: 20,
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
    },
    emptyLogo: {
      width: 56,
      height: 56,
      borderRadius: 16,
      background: t.accent,
      color: t.accentText,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontWeight: 800,
      fontSize: 28,
      marginBottom: 16,
      boxShadow: t.glow,
    },
    emptyTitle: { fontSize: 22, fontWeight: 700, margin: "0 0 6px" },
    emptySub: { color: t.textDim, margin: "0 0 20px" },
    suggestionGrid: {
      display: "grid",
      gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
      gap: 10,
      width: "100%",
    },
    suggestion: {
      padding: "12px 14px",
      borderRadius: 12,
      border: `1px solid ${t.border}`,
      background: t.bgPanel,
      color: t.text,
      fontSize: 13,
      fontWeight: 500,
      cursor: "pointer",
      textAlign: "left",
    },

    /* Composer -------------------------------------------------------------*/
    composerWrap: {
      flex: "0 0 auto",
      padding: isMobile ? "10px 12px 14px" : "12px 20px 18px",
      borderTop: `1px solid ${t.border}`,
      background: t.bgElevated,
    },
    composer: {
      display: "flex",
      alignItems: "flex-end",
      gap: 10,
      background: t.bgInput,
      border: `1px solid ${t.borderStrong}`,
      borderRadius: 14,
      padding: 8,
    },
    textarea: {
      flex: 1,
      resize: "none",
      border: "none",
      outline: "none",
      background: "transparent",
      color: t.text,
      fontSize: 14,
      lineHeight: 1.5,
      maxHeight: 160,
      padding: "8px 8px",
    },
    sendBtn: {
      width: 42,
      height: 42,
      borderRadius: 10,
      border: "none",
      background: t.accent,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      flexShrink: 0,
      boxShadow: t.glow,
    },
    composerHint: {
      textAlign: "center",
      fontSize: 11,
      color: t.textFaint,
      marginTop: 8,
    },

    /* Modal ----------------------------------------------------------------*/
    modalOverlay: {
      position: "fixed",
      inset: 0,
      background: "rgba(0,0,0,0.6)",
      backdropFilter: "blur(3px)",
      WebkitBackdropFilter: "blur(3px)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: 16,
      zIndex: 200,
      animation: "rai-fade .15s ease",
    },
    modal: {
      width: "100%",
      maxHeight: "88vh",
      background: t.bgElevated,
      border: `1px solid ${t.borderStrong}`,
      borderRadius: 16,
      display: "flex",
      flexDirection: "column",
      overflow: "hidden",
      boxShadow: "0 20px 60px rgba(0,0,0,0.6)",
      animation: "rai-pop .16s ease",
    },
    modalHeader: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "16px 18px",
      borderBottom: `1px solid ${t.border}`,
      flexShrink: 0,
    },
    modalTitle: { margin: 0, fontSize: 17, fontWeight: 700 },
    modalBody: { padding: 18, overflowY: "auto" },

    /* Settings -------------------------------------------------------------*/
    settingsGroup: { marginBottom: 22 },
    settingsLabel: {
      fontSize: 12,
      fontWeight: 700,
      color: t.textDim,
      marginBottom: 10,
      display: "block",
    },
    themeGrid: { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 },
    themeCard: {
      position: "relative",
      padding: 8,
      borderRadius: 12,
      border: `2px solid ${t.border}`,
      background: t.bgPanel,
      cursor: "pointer",
      display: "flex",
      flexDirection: "column",
      gap: 8,
      alignItems: "center",
    },
    themeSwatch: {
      position: "relative",
      width: "100%",
      height: 44,
      borderRadius: 8,
      overflow: "hidden",
    },
    themeSwatchDot: {
      position: "absolute",
      bottom: 8,
      left: 8,
      width: 12,
      height: 12,
      borderRadius: "50%",
    },
    themeName: { fontSize: 12, fontWeight: 600, color: t.text },
    themeCheck: { position: "absolute", top: 6, right: 6 },
    settingsTextarea: {
      width: "100%",
      resize: "vertical",
      minHeight: 90,
      padding: 12,
      borderRadius: 10,
      border: `1px solid ${t.borderStrong}`,
      background: t.bgInput,
      color: t.text,
      fontSize: 13,
      lineHeight: 1.5,
      outline: "none",
    },
    settingsHint: { fontSize: 11, color: t.textFaint, marginTop: 8 },

    input: {
      width: "100%",
      padding: "12px 14px",
      borderRadius: 10,
      border: `1px solid ${t.borderStrong}`,
      background: t.bgInput,
      color: t.text,
      fontSize: 14,
      outline: "none",
      marginBottom: 12,
    },
    primaryBtn: {
      width: "100%",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      padding: "12px 16px",
      borderRadius: 10,
      border: "none",
      background: t.accent,
      color: t.accentText,
      fontSize: 14,
      fontWeight: 700,
      cursor: "pointer",
      boxShadow: t.glow,
    },
    ghostBtn: {
      width: "100%",
      padding: "10px 16px",
      borderRadius: 10,
      border: "none",
      background: "transparent",
      color: t.textDim,
      fontSize: 13,
      fontWeight: 600,
      cursor: "pointer",
      marginTop: 8,
    },
    dangerBtn: {
      padding: "9px 14px",
      borderRadius: 9,
      border: `1px solid ${t.danger}`,
      background: "transparent",
      color: t.danger,
      fontSize: 13,
      fontWeight: 600,
      cursor: "pointer",
    },
    authIntro: { color: t.textDim, marginTop: 0, marginBottom: 16, fontSize: 13 },
    errorText: { color: t.danger, fontSize: 12, marginBottom: 12, marginTop: -4 },
    demoCode: {
      padding: "10px 12px",
      borderRadius: 9,
      background: t.accentSoft,
      color: t.accent,
      fontSize: 13,
      marginBottom: 14,
      textAlign: "center",
    },
    successState: { textAlign: "center", padding: "20px 0" },
    successCheck: {
      width: 72,
      height: 72,
      borderRadius: "50%",
      background: `${t.success}22`,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      margin: "0 auto 16px",
    },
    successTitle: { fontSize: 18, fontWeight: 700, margin: "0 0 6px" },

    accountRow: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 12,
      padding: 12,
      borderRadius: 10,
      border: `1px solid ${t.border}`,
      background: t.bgPanel,
    },
    accountEmail: { fontWeight: 600, fontSize: 13, wordBreak: "break-all" },
    accountRole: { fontSize: 12, color: t.accent, marginTop: 2 },

    /* Admin ----------------------------------------------------------------*/
    statsRow: { display: "flex", gap: 10, marginBottom: 22 },
    statCard: {
      flex: 1,
      padding: 14,
      borderRadius: 12,
      border: `1px solid ${t.border}`,
      background: t.bgPanel,
      textAlign: "center",
    },
    statValue: { fontSize: 26, fontWeight: 800 },
    statLabel: { fontSize: 11, color: t.textDim, marginTop: 4 },
    userTable: {
      border: `1px solid ${t.border}`,
      borderRadius: 12,
      overflow: "hidden",
    },
    userTableHead: {
      display: "flex",
      alignItems: "center",
      gap: 8,
      padding: "10px 12px",
      background: t.bgPanel,
      borderBottom: `1px solid ${t.border}`,
      fontSize: 11,
      fontWeight: 700,
      textTransform: "uppercase",
      letterSpacing: 0.5,
      color: t.textFaint,
    },
    userRow: {
      display: "flex",
      alignItems: "center",
      gap: 8,
      padding: "10px 12px",
      borderBottom: `1px solid ${t.border}`,
    },
    avatar: {
      width: 30,
      height: 30,
      borderRadius: "50%",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontWeight: 700,
      fontSize: 13,
      color: t.accentText,
      flexShrink: 0,
    },
    userEmail: {
      fontSize: 13,
      whiteSpace: "nowrap",
      overflow: "hidden",
      textOverflow: "ellipsis",
    },
    statusDot: { width: 8, height: 8, borderRadius: "50%", flexShrink: 0 },
    statusText: { fontSize: 12, color: t.textDim, textTransform: "capitalize" },
    roleSelect: {
      padding: "5px 8px",
      borderRadius: 7,
      border: `1px solid ${t.borderStrong}`,
      background: t.bgInput,
      color: t.text,
      fontSize: 12,
      cursor: "pointer",
      outline: "none",
    },
    ownerBadge: {
      display: "inline-block",
      padding: "4px 10px",
      borderRadius: 20,
      background: t.accentSoft,
      color: t.accent,
      fontSize: 11,
      fontWeight: 700,
    },

    /* Image preview --------------------------------------------------------*/
    imagePreview: {
      position: "relative",
      width: "min(80vw, 420px)",
      aspectRatio: "1 / 1",
      borderRadius: 20,
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      gap: 12,
      boxShadow: "0 20px 60px rgba(0,0,0,0.7)",
      animation: "rai-pop .18s ease",
    },
    previewClose: {
      position: "absolute",
      top: 12,
      right: 12,
      width: 36,
      height: 36,
      borderRadius: 10,
      border: "none",
      background: "rgba(0,0,0,0.35)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      cursor: "pointer",
    },
    previewTitle: { color: "#fff", fontSize: 18, fontWeight: 800, textShadow: "0 2px 8px rgba(0,0,0,.5)" },
  };
  return s;
}

export default RobloxAIStudio;
