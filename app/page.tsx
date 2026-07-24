'use client';

import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface Message {
  role: 'user' | 'ai';
  text: string;
}

interface UserSession {
  email: string;
  name: string;
  isAdmin: boolean;
}

interface ExplorerNode {
  id: string;
  name: string;
  type: 'Folder' | 'Part' | 'Script' | 'LocalScript' | 'ScreenGui';
  children: ExplorerNode[];
}

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [selectedModel, setSelectedModel] = useState('rdm-2.2');
  const [loading, setLoading] = useState(false);

  // Theme & Layout States
  const [theme, setTheme] = useState<'dark' | 'midnight' | 'cyberpunk'>('dark');
  const [deviceMode, setDeviceMode] = useState<'mobile' | 'pc'>('pc');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [systemInstructions, setSystemInstructions] = useState('You are an expert Roblox Luau and system architect assistant.');

  // Auth States
  const [user, setUser] = useState<UserSession | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authEmail, setAuthEmail] = useState('');
  const [authName, setAuthName] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [sentCode, setSentCode] = useState('');
  const [enteredCode, setEnteredCode] = useState('');
  const [sendingCode, setSendingCode] = useState(false);

  // Admin Monitored Users
  const [monitoredUsers, setMonitoredUsers] = useState([
    { email: 'hossiani961@gmail.com', role: 'Owner / Admin', status: 'Active' },
    { email: 'robloxdev_test@gmail.com', role: 'User', status: 'Active' },
  ]);

  // Interactive Explorer Tree State
  const [explorerTree, setExplorerTree] = useState<ExplorerNode[]>([
    {
      id: 'workspace',
      name: 'Workspace',
      type: 'Folder',
      children: [
        { id: 'baseplate', name: 'Baseplate', type: 'Part', children: [] },
        { id: 'spawn', name: 'SpawnLocation', type: 'Part', children: [] }
      ]
    },
    {
      id: 'replicatedstorage',
      name: 'ReplicatedStorage',
      type: 'Folder',
      children: [
        { id: 'net', name: 'NetworkEvents', type: 'Folder', children: [] }
      ]
    },
    {
      id: 'startergui',
      name: 'StarterGui',
      type: 'Folder',
      children: [
        { id: 'mainhud', name: 'MainHUD', type: 'ScreenGui', children: [] }
      ]
    }
  ]);

  // Auto-detect mobile screen size on load/resize
  useEffect(() => {
    const checkScreenSize = () => {
      if (window.innerWidth < 768) {
        setDeviceMode('mobile');
      }
    };
    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  // Theme Color Configurations
  const themes = {
    dark: {
      bg: '#121212',
      surface: '#1e1e1e',
      surfaceHover: '#2a2a2a',
      border: '#2e2e2e',
      text: '#f5f5f5',
      textDim: '#a3a3a3',
      accent: '#d97706',
      accentGlow: 'rgba(217, 119, 6, 0.3)',
      userBubble: '#2563eb',
      aiBubble: '#1a1a1a',
      codeBg: '#090d16'
    },
    midnight: {
      bg: '#030712',
      surface: '#0f172a',
      surfaceHover: '#1e293b',
      border: '#334155',
      text: '#f8fafc',
      textDim: '#94a3b8',
      accent: '#38bdf8',
      accentGlow: 'rgba(56, 189, 248, 0.3)',
      userBubble: '#0284c7',
      aiBubble: '#0b1329',
      codeBg: '#020617'
    },
    cyberpunk: {
      bg: '#090514',
      surface: '#130b26',
      surfaceHover: '#1f133d',
      border: '#3b2163',
      text: '#fff1f2',
      textDim: '#cbd5e1',
      accent: '#f43f5e',
      accentGlow: 'rgba(244, 63, 94, 0.4)',
      userBubble: '#e11d48',
      aiBubble: '#160d2b',
      codeBg: '#05020a'
    }
  };

  const currentTheme = themes[theme];

  // Helper to serialize explorer tree into context for the AI
  const getSerializedExplorer = () => {
    const formatNode = (node: ExplorerNode, depth = 0): string => {
      const indent = '  '.repeat(depth);
      let res = `${indent}- ${node.name} (${node.type})\n`;
      node.children.forEach(child => {
        res += formatNode(child, depth + 1);
      });
      return res;
    };
    return explorerTree.map(n => formatNode(n)).join('');
  };

  const handleAddChildToNode = (nodeId: string) => {
    const childName = prompt('Enter name for the new Roblox item (e.g., ShopScript, LeaderStats):');
    if (!childName) return;
    const typeChoice = prompt('Enter type (Folder, Part, Script, LocalScript, ScreenGui):', 'Script') as any;

    const addItemRecursive = (nodes: ExplorerNode[]): ExplorerNode[] => {
      return nodes.map(node => {
        if (node.id === nodeId) {
          return {
            ...node,
            children: [...node.children, { id: Math.random().toString(36).substring(7), name: childName, type: typeChoice || 'Script', children: [] }]
          };
        }
        if (node.children.length > 0) {
          return { ...node, children: addItemRecursive(node.children) };
        }
        return node;
      });
    };

    setExplorerTree(addItemRecursive(explorerTree));
  };

  const handleBanUser = (targetEmail: string) => {
    if (targetEmail === 'hossiani961@gmail.com') {
      alert("❌ You cannot ban the site owner!");
      return;
    }
    setMonitoredUsers(prev => prev.filter(u => u.email !== targetEmail));
    alert(`🚫 User ${targetEmail} has been banned.`);
  };

  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    const userMessage = input;
    setInput('');
    setMessages((prev) => [...prev, { role: 'user', text: userMessage }]);
    setLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage,
          explorerData: getSerializedExplorer(),
          model: selectedModel,
          userEmail: user?.email || '',
          systemInstructions,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setMessages((prev) => [...prev, { role: 'ai', text: data.reply }]);
      } else {
        setMessages((prev) => [...prev, { role: 'ai', text: `❌ Error: ${data.error}` }]);
      }
    } catch (err: any) {
      setMessages((prev) => [...prev, { role: 'ai', text: `❌ Network Error: ${err.message}` }]);
    } finally {
      setLoading(false);
    }
  };

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authEmail) return alert('Please enter your email address!');
    setSendingCode(true);

    try {
      const res = await fetch('/api/auth/send-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: authEmail }),
      });

      const data = await res.json();
      if (data.success) {
        setSentCode(data.code);
        setCodeSent(true);
        alert(`⚡ Verification code sent to ${authEmail}! Check your inbox.`);
      } else {
        alert(`❌ Error: ${data.error}`);
      }
    } catch (err: any) {
      alert(`❌ Failed to send code: ${err.message}`);
    } finally {
      setSendingCode(false);
    }
  };

  const handleVerifyCode = (e: React.FormEvent) => {
    e.preventDefault();
    if (enteredCode.trim() === sentCode) {
      const isOwner = authEmail.toLowerCase() === 'hossiani961@gmail.com';
      setUser({
        email: authEmail,
        name: authName || authEmail.split('@')[0],
        isAdmin: isOwner,
      });
      setShowAuthModal(false);
      setCodeSent(false);
      setEnteredCode('');
      setAuthEmail('');
      alert(isOwner ? '👑 Welcome back, Owner! Admin rights unlocked.' : '🎉 Verification successful! Welcome back.');
    } else {
      alert('❌ Invalid verification code. Check your email inbox again.');
    }
  };

  const handleLogout = () => {
    setUser(null);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('Code copied to clipboard!');
  };

  // Recursive component to render Explorer tree with plus buttons
  const renderExplorerNodeUI = (node: ExplorerNode) => (
    <div key={node.id} style={{ marginLeft: '12px', marginTop: '4px', fontSize: '12px', fontFamily: 'monospace' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'between', gap: '6px', padding: '4px 6px', borderRadius: '4px', backgroundColor: currentTheme.surfaceHover }}>
        <span style={{ color: currentTheme.accent, fontWeight: 'bold' }}>📁 {node.name}</span>
        <span style={{ fontSize: '10px', color: currentTheme.textDim }}>[{node.type}]</span>
        <button 
          onClick={() => handleAddChildToNode(node.id)}
          title="Add child element"
          style={{ marginLeft: 'auto', background: currentTheme.accent, color: '#fff', border: 'none', borderRadius: '3px', width: '18px', height: '18px', cursor: 'pointer', fontSize: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}
        >
          +
        </button>
      </div>
      {node.children && node.children.length > 0 && (
        <div style={{ borderLeft: `1px dashed ${currentTheme.border}`, marginLeft: '8px', paddingLeft: '8px' }}>
          {node.children.map(child => renderExplorerNodeUI(child))}
        </div>
      )}
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', backgroundColor: currentTheme.bg, color: currentTheme.text, fontFamily: 'system-ui, -apple-system, sans-serif', transition: 'all 0.3s ease' }}>
      
      {/* Dynamic Gemini-style Aura Background Accent Header Border */}
      <div style={{ height: '3px', width: '100%', background: `linear-gradient(90deg, #3b82f6, ${currentTheme.accent}, #ec4899, #8b5cf6)`, boxShadow: `0 0 15px ${currentTheme.accentGlow}` }} />

      {/* Navigation Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px', backgroundColor: currentTheme.surface, borderBottom: `1px solid ${currentTheme.border}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '36px', height: '36px', borderRadius: '10px', backgroundColor: currentTheme.accent, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', color: '#fff', fontSize: '20px', boxShadow: `0 0 12px ${currentTheme.accentGlow}` }}>⚡</div>
          <div>
            <span style={{ fontSize: '16px', fontWeight: '800', color: currentTheme.text, display: 'block', letterSpacing: '0.5px' }}>Roblox AI Studio</span>
            <span style={{ fontSize: '11px', color: currentTheme.textDim }}>Next-Gen Luau & Architecture Generator</span>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          {user?.isAdmin && (
            <button onClick={() => setShowAdminModal(true)} style={{ backgroundColor: '#b45309', color: '#fff', border: '1px solid #f59e0b', borderRadius: '8px', padding: '6px 12px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer', transition: 'transform 0.2s' }}>
              👑 Admin Panel
            </button>
          )}

          {user ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: currentTheme.surfaceHover, padding: '4px 10px', borderRadius: '8px', border: `1px solid ${currentTheme.border}` }}>
              <span style={{ fontSize: '12px', color: currentTheme.accent, fontWeight: '600' }}>👤 {user.name}</span>
              <button onClick={handleLogout} style={{ backgroundColor: 'transparent', color: currentTheme.textDim, border: 'none', fontSize: '11px', cursor: 'pointer' }}>Logout</button>
            </div>
          ) : (
            <button onClick={() => setShowAuthModal(true)} style={{ backgroundColor: currentTheme.accent, color: '#fff', border: 'none', borderRadius: '8px', padding: '7px 14px', fontSize: '12px', fontWeight: '700', cursor: 'pointer', boxShadow: `0 0 10px ${currentTheme.accentGlow}` }}>
              Login / Sign Up
            </button>
          )}

          <button onClick={() => setShowSettings(!showSettings)} style={{ backgroundColor: currentTheme.surfaceHover, color: currentTheme.text, border: `1px solid ${currentTheme.border}`, borderRadius: '8px', padding: '7px 12px', fontSize: '12px', cursor: 'pointer', fontWeight: '600' }}>
            ⚙️ Settings & Theme
          </button>
        </div>
      </div>

      {/* Main App Layout */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden', position: 'relative' }}>
        
        {/* Desktop Sidebar / Explorer Tree */}
        {deviceMode === 'pc' && (
          <div style={{ width: '320px', backgroundColor: currentTheme.surface, padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px', borderRight: `1px solid ${currentTheme.border}` }}>
            <div>
              <label style={{ fontSize: '11px', fontWeight: '800', color: currentTheme.textDim, display: 'block', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Model Engine</label>
              <select value={selectedModel} onChange={(e) => setSelectedModel(e.target.value)} style={{ width: '100%', padding: '9px', backgroundColor: currentTheme.surfaceHover, color: currentTheme.text, border: `1px solid ${currentTheme.border}`, borderRadius: '8px', fontSize: '12px', outline: 'none', fontWeight: '600' }}>
                <option value="rdm-2.2">RDM v2.2 [Fast Answers]</option>
                <option value="rdm-2.1-pro">RDM v2.1 Pro [Clean Scripting]</option>
                <option value="rdm-1.1-mythical">RDM v1.1 Mythical [Advanced UI & Code]</option>
              </select>
            </div>

            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <label style={{ fontSize: '11px', fontWeight: '800', color: currentTheme.textDim, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Live Explorer Tree</label>
                <span style={{ fontSize: '10px', color: currentTheme.accent }}>Click [+] to add nodes</span>
              </div>
              <div style={{ flex: 1, width: '100%', backgroundColor: currentTheme.bg, border: `1px solid ${currentTheme.border}`, borderRadius: '8px', padding: '10px', overflowY: 'auto' }}>
                {explorerTree.map(node => renderExplorerNodeUI(node))}
              </div>
            </div>
          </div>
        )}

        {/* Mobile Drawer Sidebar */}
        {deviceMode === 'mobile' && sidebarOpen && (
          <div style={{ position: 'absolute', top: 0, left: 0, width: '85%', maxWidth: '320px', height: '100%', backgroundColor: currentTheme.surface, padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px', borderRight: `1px solid ${currentTheme.border}`, zIndex: 50, boxShadow: '5px 0 25px rgba(0,0,0,0.5)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '15px', color: currentTheme.text }}>Studio Setup & Explorer</h3>
              <button onClick={() => setSidebarOpen(false)} style={{ background: 'transparent', color: currentTheme.textDim, border: 'none', fontSize: '16px', cursor: 'pointer' }}>✕</button>
            </div>
            <div>
              <label style={{ fontSize: '11px', fontWeight: '700', color: currentTheme.textDim, display: 'block', marginBottom: '6px', textTransform: 'uppercase' }}>Model Engine</label>
              <select value={selectedModel} onChange={(e) => setSelectedModel(e.target.value)} style={{ width: '100%', padding: '8px', backgroundColor: currentTheme.surfaceHover, color: currentTheme.text, border: `1px solid ${currentTheme.border}`, borderRadius: '6px', fontSize: '12px' }}>
                <option value="rdm-2.2">RDM v2.2 [Fast Answers]</option>
                <option value="rdm-2.1-pro">RDM v2.1 Pro [Clean Scripting]</option>
                <option value="rdm-1.1-mythical">RDM v1.1 Mythical [Advanced UI & Code]</option>
              </select>
            </div>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              <label style={{ fontSize: '11px', fontWeight: '700', color: currentTheme.textDim, marginBottom: '6px', textTransform: 'uppercase' }}>Explorer Tree</label>
              <div style={{ flex: 1, width: '100%', backgroundColor: currentTheme.bg, border: `1px solid ${currentTheme.border}`, borderRadius: '6px', padding: '8px', overflowY: 'auto' }}>
                {explorerTree.map(node => renderExplorerNodeUI(node))}
              </div>
            </div>
            <button onClick={() => setSidebarOpen(false)} style={{ width: '100%', padding: '10px', backgroundColor: currentTheme.accent, color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold' }}>Close Drawer</button>
          </div>
        )}

        {/* Chat Feed Panel */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%', position: 'relative' }}>
          {deviceMode === 'mobile' && (
            <div style={{ padding: '8px 16px', backgroundColor: currentTheme.surface, borderBottom: `1px solid ${currentTheme.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <button onClick={() => setSidebarOpen(true)} style={{ backgroundColor: currentTheme.surfaceHover, color: currentTheme.text, border: `1px solid ${currentTheme.border}`, borderRadius: '6px', padding: '6px 12px', fontSize: '12px', fontWeight: '600' }}>📋 Open Explorer & Context</button>
              <span style={{ fontSize: '11px', color: currentTheme.accent, fontWeight: 'bold' }}>MOBILE MODE ACTIVE</span>
            </div>
          )}

          <div style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            
            {/* Welcome Greeting Banner */}
            {messages.length === 0 && (
              <div style={{ textAlign: 'center', marginTop: '40px', padding: '30px', backgroundColor: currentTheme.surface, border: `1px solid ${currentTheme.border}`, borderRadius: '16px', maxWidth: '600px', alignSelf: 'center', boxShadow: `0 8px 30px rgba(0,0,0,0.2)` }}>
                <div style={{ fontSize: '32px', marginBottom: '10px' }}>👋</div>
                <h1 style={{ fontSize: '22px', color: currentTheme.text, fontWeight: '700', marginBottom: '8px' }}>Welcome to Roblox AI Studio</h1>
                <p style={{ fontSize: '13px', color: currentTheme.textDim, lineHeight: '1.5' }}>
                  Your premier workspace companion. Build advanced Luau scripts, structure game passes, or manage server architecture with custom AI assistance.
                </p>
              </div>
            )}

            {messages.map((m, i) => (
              <div key={i} style={{ alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start', maxWidth: '92%', animation: 'fadeIn 0.3s ease-in-out' }}>
                <div style={{ backgroundColor: m.role === 'user' ? currentTheme.userBubble : currentTheme.aiBubble, padding: '14px 16px', borderRadius: '12px', fontSize: '14px', border: m.role === 'user' ? 'none' : `1px solid ${currentTheme.border}`, boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}>
                  {m.role === 'user' ? (
                    <div style={{ color: '#fff' }}>{m.text}</div>
                  ) : (
                     <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      components={{
                        code({ className, children, ...props }) {
                          const codeString = String(children).replace(/\n$/, '');
                          return (
                            <div style={{ margin: '10px 0', borderRadius: '8px', overflow: 'hidden', border: `1px solid ${currentTheme.border}` }}>
                              <div style={{ backgroundColor: currentTheme.surface, padding: '6px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontSize: '11px', color: currentTheme.textDim, fontFamily: 'monospace', fontWeight: 'bold' }}>Luau Code Block</span>
                                <button onClick={() => copyToClipboard(codeString)} style={{ backgroundColor: currentTheme.surfaceHover, color: currentTheme.accent, border: `1px solid ${currentTheme.border}`, borderRadius: '4px', padding: '3px 8px', fontSize: '11px', cursor: 'pointer', fontWeight: '600' }}>📋 Copy Code</button>
                              </div>
                              <pre style={{ backgroundColor: currentTheme.codeBg, color: '#38bdf8', padding: '12px', margin: 0, overflowX: 'auto', fontFamily: 'monospace', fontSize: '12px', lineHeight: '1.4' }}>
                                <code>{codeString}</code>
                              </pre>
                            </div>
                          );
                        }
                      }}
                    >
                      {m.text}
                    </ReactMarkdown>
                  )}
                </div>
              </div>
            ))}

            {loading && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: currentTheme.accent, fontSize: '13px', fontStyle: 'italic', alignSelf: 'flex-start', padding: '8px 12px', backgroundColor: currentTheme.surface, borderRadius: '8px', border: `1px solid ${currentTheme.border}` }}>
                <span style={{ animation: 'spin 1s linear infinite' }}>⚡</span> RDM Engine processing architecture & scripts...
              </div>
            )}
          </div>

          {/* Chat Input Bar */}
          <div style={{ padding: '16px', backgroundColor: currentTheme.surface, borderTop: `1px solid ${currentTheme.border}` }}>
            <div style={{ display: 'flex', backgroundColor: currentTheme.bg, border: `1px solid ${currentTheme.border}`, borderRadius: '12px', padding: '8px', gap: '8px', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.2)' }}>
              <input 
                type="text" 
                placeholder="Ask for custom Luau scripts, UI handlers, or server logic..." 
                value={input} 
                onChange={(e) => setInput(e.target.value)} 
                onKeyDown={(e) => e.key === 'Enter' && sendMessage()} 
                style={{ flex: 1, backgroundColor: 'transparent', border: 'none', color: currentTheme.text, fontSize: '14px', outline: 'none', padding: '6px 10px' }} 
              />
              <button onClick={sendMessage} style={{ backgroundColor: currentTheme.accent, color: '#fff', border: 'none', borderRadius: '8px', padding: '8px 18px', fontWeight: '700', cursor: 'pointer', boxShadow: `0 0 10px ${currentTheme.accentGlow}` }}>Send</button>
            </div>
          </div>
        </div>
      </div>

      {/* Admin Modal */}
      {showAdminModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(5px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 110 }}>
          <div style={{ backgroundColor: currentTheme.surface, border: '1px solid #f59e0b', borderRadius: '16px', padding: '24px', width: '460px', display: 'flex', flexDirection: 'column', gap: '16px', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }}>
            <h3 style={{ margin: 0, fontSize: '18px', color: '#fbbf24' }}>👑 Owner Admin Dashboard</h3>
            <p style={{ fontSize: '12px', color: currentTheme.textDim, margin: 0 }}>Monitor active website sessions, privileges, and ban unauthorized users.</p>
            
            <div style={{ maxHeight: '220px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px', backgroundColor: currentTheme.bg, padding: '10px', borderRadius: '8px', border: `1px solid ${currentTheme.border}` }}>
              {monitoredUsers.map((u, index) => (
                <div key={index} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px', backgroundColor: currentTheme.surfaceHover, borderRadius: '6px', fontSize: '12px' }}>
                  <div>
                    <div style={{ color: currentTheme.text, fontWeight: 'bold' }}>{u.email}</div>
                    <div style={{ color: currentTheme.textDim, fontSize: '10px' }}>Role: {u.role} | Status: {u.status}</div>
                  </div>
                  {u.email !== 'hossiani961@gmail.com' && (
                    <button onClick={() => handleBanUser(u.email)} style={{ backgroundColor: '#dc2626', color: '#fff', border: 'none', borderRadius: '4px', padding: '5px 10px', fontSize: '11px', cursor: 'pointer', fontWeight: 'bold' }}>Ban</button>
                  )}
                </div>
              ))}
            </div>

            <button onClick={() => setShowAdminModal(false)} style={{ width: '100%', padding: '10px', backgroundColor: currentTheme.surfaceHover, color: currentTheme.text, border: `1px solid ${currentTheme.border}`, borderRadius: '8px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}>Close Admin Panel</button>
          </div>
        </div>
      )}

      {/* Settings & Theme Modal */}
      {showSettings && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(5px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ backgroundColor: currentTheme.surface, border: `1px solid ${currentTheme.border}`, borderRadius: '16px', padding: '24px', width: '380px', display: 'flex', flexDirection: 'column', gap: '20px', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }}>
            <h3 style={{ margin: 0, fontSize: '18px', color: currentTheme.text }}>⚙️ Studio Settings & Themes</h3>
            
            <div>
              <label style={{ fontSize: '12px', color: currentTheme.textDim, display: 'block', marginBottom: '8px', fontWeight: '600' }}>Theme Selector</label>
              <div style={{ display: 'flex', gap: '6px' }}>
                <button onClick={() => setTheme('dark')} style={{ flex: 1, padding: '8px', backgroundColor: theme === 'dark' ? currentTheme.accent : currentTheme.surfaceHover, color: '#fff', border: `1px solid ${currentTheme.border}`, borderRadius: '6px', cursor: 'pointer', fontSize: '11px', fontWeight: 'bold' }}>Dark Amber</button>
                <button onClick={() => setTheme('midnight')} style={{ flex: 1, padding: '8px', backgroundColor: theme === 'midnight' ? currentTheme.accent : currentTheme.surfaceHover, color: '#fff', border: `1px solid ${currentTheme.border}`, borderRadius: '6px', cursor: 'pointer', fontSize: '11px', fontWeight: 'bold' }}>Midnight Blue</button>
                <button onClick={() => setTheme('cyberpunk')} style={{ flex: 1, padding: '8px', backgroundColor: theme === 'cyberpunk' ? currentTheme.accent : currentTheme.surfaceHover, color: '#fff', border: `1px solid ${currentTheme.border}`, borderRadius: '6px', cursor: 'pointer', fontSize: '11px', fontWeight: 'bold' }}>Cyberpunk</button>
              </div>
            </div>

            <div>
              <label style={{ fontSize: '12px', color: currentTheme.textDim, display: 'block', marginBottom: '8px', fontWeight: '600' }}>Device Layout Mode</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={() => setDeviceMode('pc')} style={{ flex: 1, padding: '8px', backgroundColor: deviceMode === 'pc' ? currentTheme.accent : currentTheme.surfaceHover, color: '#fff', border: `1px solid ${currentTheme.border}`, borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: '600' }}>💻 PC View</button>
                <button onClick={() => setDeviceMode('mobile')} style={{ flex: 1, padding: '8px', backgroundColor: deviceMode === 'mobile' ? currentTheme.accent : currentTheme.surfaceHover, color: '#fff', border: `1px solid ${currentTheme.border}`, borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: '600' }}>📱 Mobile View</button>
              </div>
            </div>

            <div>
              <label style={{ fontSize: '12px', color: currentTheme.textDim, display: 'block', marginBottom: '6px', fontWeight: '600' }}>Custom AI System Instructions (Prompt Behavior)</label>
              <textarea 
                value={systemInstructions} 
                onChange={(e) => setSystemInstructions(e.target.value)} 
                style={{ width: '100%', height: '70px', backgroundColor: currentTheme.bg, color: currentTheme.text, border: `1px solid ${currentTheme.border}`, borderRadius: '6px', padding: '8px', fontSize: '12px', outline: 'none', resize: 'none' }}
              />
            </div>

            <button onClick={() => setShowSettings(false)} style={{ width: '100%', padding: '10px', backgroundColor: currentTheme.accent, color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}>Save & Close</button>
          </div>
        </div>
      )}

      {/* Auth Modal */}
      {showAuthModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(5px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ backgroundColor: currentTheme.surface, border: `1px solid ${currentTheme.border}`, borderRadius: '16px', padding: '24px', width: '340px', display: 'flex', flexDirection: 'column', gap: '16px', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }}>
            <h3 style={{ margin: 0, fontSize: '18px', color: currentTheme.text }}>
              {codeSent ? '🔑 Enter Verification Code' : 'Sign In / Sign Up'}
            </h3>
            
            {!codeSent ? (
              <form onSubmit={handleSendCode} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <input
                  type="text"
                  placeholder="Developer Name (Optional)"
                  value={authName}
                  onChange={(e) => setAuthName(e.target.value)}
                  style={{ padding: '10px 12px', backgroundColor: currentTheme.bg, border: `1px solid ${currentTheme.border}`, borderRadius: '8px', color: currentTheme.text, outline: 'none', fontSize: '13px' }}
                />
                <input
                  type="email"
                  placeholder="Email Address"
                  value={authEmail}
                  onChange={(e) => setAuthEmail(e.target.value)}
                  required
                  style={{ padding: '10px 12px', backgroundColor: currentTheme.bg, border: `1px solid ${currentTheme.border}`, borderRadius: '8px', color: currentTheme.text, outline: 'none', fontSize: '13px' }}
                />
                <button
                  type="submit"
                  disabled={sendingCode}
                  style={{ padding: '11px', backgroundColor: currentTheme.accent, color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', marginTop: '4px', boxShadow: `0 0 10px ${currentTheme.accentGlow}` }}
                >
                  {sendingCode ? 'Sending Code...' : 'Send Verification Code 📧'}
                </button>
              </form>
            ) : (
              <form onSubmit={handleVerifyCode} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <p style={{ fontSize: '12px', color: currentTheme.textDim, margin: 0 }}>
                  We sent a 6-digit code to <strong style={{ color: currentTheme.accent }}>{authEmail}</strong>
                </p>
                <input
                  type="text"
                  placeholder="123456"
                  value={enteredCode}
                  onChange={(e) => setEnteredCode(e.target.value)}
                  maxLength={6}
                  required
                  style={{ padding: '10px 12px', backgroundColor: currentTheme.bg, border: `1px solid ${currentTheme.border}`, borderRadius: '8px', color: currentTheme.accent, fontSize: '20px', fontWeight: 'bold', textAlign: 'center', letterSpacing: '6px', outline: 'none' }}
                />
                <button
                  type="submit"
                  style={{ padding: '11px', backgroundColor: '#16a34a', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}
                >
                  Verify & Complete Login 🎉
                </button>
                <button
                  type="button"
                  onClick={() => setCodeSent(false)}
                  style={{ backgroundColor: 'transparent', color: currentTheme.textDim, border: 'none', fontSize: '11px', cursor: 'pointer', textDecoration: 'underline' }}
                >
                  ← Back to change email
                </button>
              </form>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', fontSize: '12px', color: currentTheme.textDim, marginTop: '4px' }}>
              <span onClick={() => { setShowAuthModal(false); setCodeSent(false); }} style={{ cursor: 'pointer' }}>Close</span>
            </div>
          </div>
        </div>
      )}

    </div>
  );
      }
        
        
