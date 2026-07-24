'use client';

import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

// --- THEMES ---
const themes = {
  dark: {
    bg: '#0f172a',
    surface: '#1e293b',
    surfaceHover: '#334155',
    border: '#334155',
    text: '#f8fafc',
    textDim: '#94a3b8',
    accent: '#3b82f6',
    accentGlow: 'rgba(59, 130, 246, 0.4)',
    userBubble: '#2563eb',
    aiBubble: '#1e293b',
    codeBg: '#090d16',
  },
  midnight: {
    bg: '#030712',
    surface: '#111827',
    surfaceHover: '#1f2937',
    border: '#1f2937',
    text: '#f9fafb',
    textDim: '#6b7280',
    accent: '#8b5cf6',
    accentGlow: 'rgba(139, 92, 246, 0.4)',
    userBubble: '#7c3aed',
    aiBubble: '#111827',
    codeBg: '#02040a',
  },
  cyberpunk: {
    bg: '#05050a',
    surface: '#0f0f1a',
    surfaceHover: '#1a1a2e',
    border: '#27274a',
    text: '#00ffcc',
    textDim: '#7070a0',
    accent: '#ff007f',
    accentGlow: 'rgba(255, 0, 127, 0.5)',
    userBubble: '#ff007f',
    aiBubble: '#0f0f1a',
    codeBg: '#020205',
  }
};

export default function RobloxAIStudio() {
  // --- STATE ---
  const [theme, setTheme] = useState<'dark' | 'midnight' | 'cyberpunk'>('dark');
  const currentTheme = themes[theme];

  const [deviceMode, setDeviceMode] = useState<'pc' | 'mobile'>('pc');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedModel, setSelectedModel] = useState('rdm-2.1-pro');
  const [systemInstructions, setSystemInstructions] = useState('You are an expert Roblox Luau developer and system architect.');
  
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'ai'; text: string }>>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  // Auth & Admin state
  const [user, setUser] = useState<{ name: string; email: string; isAdmin: boolean } | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authName, setAuthName] = useState('');
  const [authEmail, setAuthEmail] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [sendingCode, setSendingCode] = useState(false);
  const [enteredCode, setEnteredCode] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [showAdminModal, setShowAdminModal] = useState(false);

  const [monitoredUsers, setMonitoredUsers] = useState([
    { email: 'hossiani961@gmail.com', role: 'Owner', status: 'Active' },
    { email: 'developer.roblox@gmail.com', role: 'Builder', status: 'Active' }
  ]);

  // Explorer Tree State (Mock Roblox Hierarchy)
  const [explorerTree, setExplorerTree] = useState([
    { id: '1', name: 'Workspace', type: 'folder', isOpen: true, children: [
      { id: '1-1', name: 'Baseplate', type: 'part' },
      { id: '1-2', name: 'SpawnLocation', type: 'spawn' }
    ]},
    { id: '2', name: 'ReplicatedStorage', type: 'folder', isOpen: false, children: [
      { id: '2-1', name: 'NetworkModule', type: 'module' }
    ]},
    { id: '3', name: 'ServerScriptService', type: 'folder', isOpen: true, children: [
      { id: '3-1', name: 'MainServer', type: 'script' }
    ]}
  ]);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  // --- HANDLERS ---
  const handleSendCode = (e: React.FormEvent) => {
    e.preventDefault();
    if (!authEmail) return;
    setSendingCode(true);
    setTimeout(() => {
      setSendingCode(false);
      setCodeSent(true);
    }, 1000);
  };

  const handleVerifyCode = (e: React.FormEvent) => {
    e.preventDefault();
    const isAdminEmail = authEmail.trim().toLowerCase() === 'hossiani961@gmail.com';
    setUser({
      name: authName || authEmail.split('@')[0],
      email: authEmail,
      isAdmin: isAdminEmail
    });
    setShowAuthModal(false);
    setCodeSent(false);
    setEnteredCode('');
  };

  const handleLogout = () => {
    setUser(null);
  };

  const handleBanUser = (email: string) => {
    setMonitoredUsers(monitoredUsers.filter(u => u.email !== email));
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const sendMessage = async () => {
    if (!input.trim() || loading) return;
    const userMsg = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setLoading(true);

    setTimeout(() => {
      setLoading(false);
      setMessages(prev => [
        ...prev,
        {
          role: 'ai',
          text: `Here is the requested Luau architecture and implementation for your request:\n\n\`\`\`lua\n-- Roblox Studio AI Studio Script\n-- Model: ${selectedModel}\nlocal Players = game:GetService("Players")\nlocal ReplicatedStorage = game:GetService("ReplicatedStorage")\n\nlocal function initializeFeature()\n    print("Initialized successfully for system query: ${userMsg}")\nend\n\ninitializeFeature()\n\`\`\`\n\nYou can integrate this script directly into your ServerScriptService or StarterPlayerScripts folder.`
        }
      ]);
    }, 1200);
  };

  const toggleFolder = (id: string) => {
    const toggleNode = (nodes: any[]): any[] => {
      return nodes.map(node => {
        if (node.id === id) {
          return { ...node, isOpen: !node.isOpen };
        }
        if (node.children) {
          return { ...node, children: toggleNode(node.children) };
        }
        return node;
      });
    };
    setExplorerTree(toggleNode(explorerTree));
  };

  const renderExplorerNodeUI = (node: any) => {
    return (
      <div key={node.id} style={{ marginLeft: '10px', fontSize: '11px', marginTop: '2px', marginBottom: '2px' }}>
        <div 
          onClick={() => node.children && toggleFolder(node.id)} 
          style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: node.children ? 'pointer' : 'default', padding: '3px 6px', borderRadius: '4px', color: currentTheme.text }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = currentTheme.surfaceHover)}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
        >
          <span>{node.children ? (node.isOpen ? '📂' : '📁') : '📄'}</span>
          <span style={{ fontWeight: node.children ? '600' : '400', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{node.name}</span>
        </div>
        {node.children && node.isOpen && (
          <div style={{ borderLeft: `1px solid ${currentTheme.border}`, marginLeft: '8px', paddingLeft: '4px' }}>
            {node.children.map((child: any) => renderExplorerNodeUI(child))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100vw', overflow: 'hidden', backgroundColor: currentTheme.bg, color: currentTheme.text, fontFamily: 'system-ui, -apple-system, sans-serif', transition: 'background 0.4s ease, color 0.4s ease' }}>
      
      <style jsx global>{`
        * { box-sizing: border-box; }
        body, html { margin: 0; padding: 0; overflow: hidden; width: 100%; height: 100%; }
        @keyframes messageSlideIn {
          from { opacity: 0; transform: translateY(12px) scale(0.98); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes typingBounce {
          0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
          30% { transform: translateY(-6px); opacity: 1; }
        }
        @keyframes auraGlow {
          0% { filter: brightness(1); }
          50% { filter: brightness(1.2); }
          100% { filter: brightness(1); }
        }
      `}</style>

      {/* Accent Header Border */}
      <div style={{ height: '3px', width: '100%', background: `linear-gradient(90deg, #3b82f6, ${currentTheme.accent}, #ec4899, #8b5cf6)`, boxShadow: `0 0 15px ${currentTheme.accentGlow}`, animation: 'auraGlow 4s infinite', flexShrink: 0 }} />

      {/* Navigation Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px', backgroundColor: currentTheme.surface, borderBottom: `1px solid ${currentTheme.border}`, flexShrink: 0, minHeight: '56px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', overflow: 'hidden' }}>
          <div style={{ width: '32px', height: '32px', borderRadius: '8px', backgroundColor: currentTheme.accent, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', color: '#fff', fontSize: '14px', boxShadow: `0 0 10px ${currentTheme.accentGlow}`, flexShrink: 0 }}>AI</div>
          <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            <span style={{ fontSize: '14px', fontWeight: '800', color: currentTheme.text, display: 'block', letterSpacing: '0.5px' }}>Roblox AI Studio</span>
            <span style={{ fontSize: '10px', color: currentTheme.textDim }}>Luau Architecture</span>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexShrink: 0 }}>
          {user?.isAdmin && (
            <button onClick={() => setShowAdminModal(true)} style={{ backgroundColor: '#b45309', color: '#fff', border: '1px solid #f59e0b', borderRadius: '6px', padding: '6px 10px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' }}>
              Admin Panel
            </button>
          )}

          {user ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: currentTheme.surfaceHover, padding: '4px 8px', borderRadius: '6px', border: `1px solid ${currentTheme.border}` }}>
              <span style={{ fontSize: '11px', color: currentTheme.accent, fontWeight: '600', maxWidth: '100px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.name}</span>
              <button onClick={handleLogout} style={{ backgroundColor: 'transparent', color: currentTheme.textDim, border: 'none', fontSize: '10px', cursor: 'pointer', padding: 0 }}>Logout</button>
            </div>
          ) : (
            <button onClick={() => setShowAuthModal(true)} style={{ backgroundColor: currentTheme.accent, color: '#fff', border: 'none', borderRadius: '6px', padding: '6px 12px', fontSize: '11px', fontWeight: '700', cursor: 'pointer', boxShadow: `0 0 8px ${currentTheme.accentGlow}` }}>
              Login / Sign Up
            </button>
          )}

          <button onClick={() => setShowSettings(!showSettings)} style={{ backgroundColor: currentTheme.surfaceHover, color: currentTheme.text, border: `1px solid ${currentTheme.border}`, borderRadius: '6px', padding: '6px 10px', fontSize: '11px', cursor: 'pointer', fontWeight: '600' }}>
            Settings
          </button>
        </div>
      </div>

      {/* Main App Layout */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden', position: 'relative', width: '100%' }}>
        
        {/* Desktop Sidebar */}
        {deviceMode === 'pc' && (
          <div style={{ width: '280px', backgroundColor: currentTheme.surface, padding: '14px', display: 'flex', flexDirection: 'column', gap: '14px', borderRight: `1px solid ${currentTheme.border}`, flexShrink: 0, height: '100%', overflowY: 'auto' }}>
            <div>
              <label style={{ fontSize: '10px', fontWeight: '800', color: currentTheme.textDim, display: 'block', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Model Engine</label>
              <select value={selectedModel} onChange={(e) => setSelectedModel(e.target.value)} style={{ width: '100%', padding: '8px', backgroundColor: currentTheme.surfaceHover, color: currentTheme.text, border: `1px solid ${currentTheme.border}`, borderRadius: '6px', fontSize: '11px', outline: 'none', fontWeight: '600' }}>
                <option value="rdm-2.2">RDM v2.2 [Fast Answers]</option>
                <option value="rdm-2.1-pro">RDM v2.1 Pro [Clean Scripting]</option>
                <option value="rdm-1.1-mythical">RDM v1.1 Mythical [Advanced UI & Code]</option>
              </select>
            </div>

            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: '200px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                <label style={{ fontSize: '10px', fontWeight: '800', color: currentTheme.textDim, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Explorer Tree</label>
                <span style={{ fontSize: '9px', color: currentTheme.accent }}>Click [+] to add</span>
              </div>
              <div style={{ flex: 1, width: '100%', backgroundColor: currentTheme.bg, border: `1px solid ${currentTheme.border}`, borderRadius: '6px', padding: '8px', overflowY: 'auto' }}>
                {explorerTree.map(node => renderExplorerNodeUI(node))}
              </div>
            </div>
          </div>
        )}

        {/* Mobile Drawer Overlay Sidebar */}
        {deviceMode === 'mobile' && sidebarOpen && (
          <div style={{ position: 'absolute', top: 0, left: 0, width: '280px', maxWidth: '80%', height: '100%', backgroundColor: currentTheme.surface, padding: '14px', display: 'flex', flexDirection: 'column', gap: '14px', borderRight: `1px solid ${currentTheme.border}`, zIndex: 50, boxShadow: '5px 0 25px rgba(0,0,0,0.5)', animation: 'messageSlideIn 0.25s ease-out', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '14px', color: currentTheme.text }}>Studio Setup</h3>
              <button onClick={() => setSidebarOpen(false)} style={{ background: 'transparent', color: currentTheme.textDim, border: 'none', fontSize: '14px', cursor: 'pointer' }}>X</button>
            </div>
            <div>
              <label style={{ fontSize: '10px', fontWeight: '700', color: currentTheme.textDim, display: 'block', marginBottom: '4px', textTransform: 'uppercase' }}>Model Engine</label>
              <select value={selectedModel} onChange={(e) => setSelectedModel(e.target.value)} style={{ width: '100%', padding: '8px', backgroundColor: currentTheme.surfaceHover, color: currentTheme.text, border: `1px solid ${currentTheme.border}`, borderRadius: '6px', fontSize: '11px' }}>
                <option value="rdm-2.2">RDM v2.2 [Fast Answers]</option>
                <option value="rdm-2.1-pro">RDM v2.1 Pro [Clean Scripting]</option>
                <option value="rdm-1.1-mythical">RDM v1.1 Mythical [Advanced UI & Code]</option>
              </select>
            </div>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: '180px' }}>
              <label style={{ fontSize: '10px', fontWeight: '700', color: currentTheme.textDim, marginBottom: '4px', textTransform: 'uppercase' }}>Explorer Tree</label>
              <div style={{ flex: 1, width: '100%', backgroundColor: currentTheme.bg, border: `1px solid ${currentTheme.border}`, borderRadius: '6px', padding: '6px', overflowY: 'auto' }}>
                {explorerTree.map(node => renderExplorerNodeUI(node))}
              </div>
            </div>
            <button onClick={() => setSidebarOpen(false)} style={{ width: '100%', padding: '8px', backgroundColor: currentTheme.accent, color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', fontSize: '12px' }}>Close Menu</button>
          </div>
        )}

        {/* Chat Feed Panel */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', width: '100%', position: 'relative' }}>
          
          {deviceMode === 'mobile' && (
            <div style={{ padding: '6px 12px', backgroundColor: currentTheme.surface, borderBottom: `1px solid ${currentTheme.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0, minHeight: '40px' }}>
              <button onClick={() => setSidebarOpen(true)} style={{ backgroundColor: currentTheme.surfaceHover, color: currentTheme.text, border: `1px solid ${currentTheme.border}`, borderRadius: '4px', padding: '4px 8px', fontSize: '11px', fontWeight: '600' }}>Explorer and Context</button>
              <span style={{ fontSize: '10px', color: currentTheme.accent, fontWeight: 'bold' }}>MOBILE MODE</span>
            </div>
          )}

          {/* Messages Feed Container */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px', width: '100%', maxWidth: '100%', paddingBottom: '30px' }}>
            
            {messages.length === 0 && (
              <div style={{ textAlign: 'center', margin: 'auto', padding: '24px', backgroundColor: currentTheme.surface, border: `1px solid ${currentTheme.border}`, borderRadius: '12px', maxWidth: '500px', width: '90%', boxShadow: '0 6px 20px rgba(0,0,0,0.2)', animation: 'messageSlideIn 0.4s ease-out' }}>
                <h1 style={{ fontSize: '18px', color: currentTheme.text, fontWeight: '700', marginBottom: '6px' }}>Roblox AI Studio Workspace</h1>
                <p style={{ fontSize: '12px', color: currentTheme.textDim, lineHeight: '1.4', margin: 0 }}>
                  Build advanced Luau scripts, structure game passes, or manage server architecture with custom AI assistance.
                </p>
              </div>
            )}

            {messages.map((m, i) => (
              <div key={i} style={{ alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start', width: '100%', maxWidth: deviceMode === 'mobile' ? '98%' : '88%', display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start', animation: 'messageSlideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)' }}>
                <div style={{ backgroundColor: m.role === 'user' ? currentTheme.userBubble : currentTheme.aiBubble, padding: '12px 14px', borderRadius: '10px', fontSize: '13px', border: m.role === 'user' ? 'none' : `1px solid ${currentTheme.border}`, boxShadow: '0 3px 10px rgba(0,0,0,0.15)', width: '100%', wordBreak: 'break-word', overflowWrap: 'break-word' }}>
                  {m.role === 'user' ? (
                    <div style={{ color: '#fff', wordBreak: 'break-word' }}>{m.text}</div>
                  ) : (
                    <div style={{ width: '100%', overflowX: 'auto' }}>
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={{
                          code({ className, children, ...props }) {
                            const codeString = String(children).replace(/\n$/, '');
                            return (
                              <div style={{ margin: '8px 0', borderRadius: '6px', overflow: 'hidden', border: `1px solid ${currentTheme.border}`, maxWidth: '100%' }}>
                                <div style={{ backgroundColor: currentTheme.surface, padding: '4px 10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                  <span style={{ fontSize: '10px', color: currentTheme.textDim, fontFamily: 'monospace', fontWeight: 'bold' }}>Luau Code</span>
                                  <button onClick={() => copyToClipboard(codeString)} style={{ backgroundColor: currentTheme.surfaceHover, color: currentTheme.accent, border: `1px solid ${currentTheme.border}`, borderRadius: '3px', padding: '2px 6px', fontSize: '10px', cursor: 'pointer', fontWeight: '600' }}>Copy</button>
                                </div>
                                <pre style={{ backgroundColor: currentTheme.codeBg, color: '#38bdf8', padding: '10px', margin: 0, overflowX: 'auto', fontFamily: 'monospace', fontSize: '11px', lineHeight: '1.3', maxWidth: '100%' }}>
                                  <code>{codeString}</code>
                                </pre>
                                                     </div>
                            );
                          },
                          p({ children }) {
                            return <p style={{ margin: '0 0 6px 0', lineHeight: '1.4', color: currentTheme.text, wordBreak: 'break-word', overflowWrap: 'break-word' }}>{children}</p>;
                          },
                          ul({ children }) {
                            return <ul style={{ margin: '0 0 6px 0', paddingLeft: '16px', color: currentTheme.text }}>{children}</ul>;
                          },
                          li({ children }) {
                            return <li style={{ marginBottom: '3px', wordBreak: 'break-word', overflowWrap: 'break-word' }}>{children}</li>;
                          }
                        }}
                      >
                        {m.text}
                      </ReactMarkdown>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {loading && (
              <div style={{ alignSelf: 'flex-start', backgroundColor: currentTheme.aiBubble, padding: '10px 14px', borderRadius: '10px', border: `1px solid ${currentTheme.border}`, display: 'flex', gap: '6px', alignItems: 'center' }}>
                <span style={{ width: '6px', height: '6px', backgroundColor: currentTheme.accent, borderRadius: '50%', animation: 'typingBounce 1.2s infinite ease-in-out' }}></span>
                <span style={{ width: '6px', height: '6px', backgroundColor: currentTheme.accent, borderRadius: '50%', animation: 'typingBounce 1.2s infinite ease-in-out 0.2s' }}></span>
                <span style={{ width: '6px', height: '6px', backgroundColor: currentTheme.accent, borderRadius: '50%', animation: 'typingBounce 1.2s infinite ease-in-out 0.4s' }}></span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Chat Input Container */}
          <div style={{ padding: '12px 16px', backgroundColor: currentTheme.surface, borderTop: `1px solid ${currentTheme.border}`, display: 'flex', flexDirection: 'column', gap: '8px', flexShrink: 0 }}>
            <div style={{ display: 'flex', gap: '8px', width: '100%', alignItems: 'center' }}>
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                placeholder="Ask for Luau scripts, data stores, or remote functions..."
                style={{ flex: 1, padding: '10px 14px', backgroundColor: currentTheme.bg, color: currentTheme.text, border: `1px solid ${currentTheme.border}`, borderRadius: '8px', fontSize: '13px', outline: 'none' }}
              />
              <button
                onClick={sendMessage}
                disabled={loading || !input.trim()}
                style={{ backgroundColor: currentTheme.accent, color: '#fff', border: 'none', borderRadius: '8px', padding: '10px 16px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer', boxShadow: `0 0 10px ${currentTheme.accentGlow}`, opacity: loading || !input.trim() ? 0.6 : 1, transition: 'opacity 0.2s' }}
              >
                Send
              </button>
            </div>
          </div>
        </div>

      </div>

      {/* --- SETTINGS MODAL --- */}
      {showSettings && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vw', backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, backdropFilter: 'blur(3px)' }}>
          <div style={{ backgroundColor: currentTheme.surface, border: `1px solid ${currentTheme.border}`, borderRadius: '12px', padding: '20px', width: '90%', maxWidth: '380px', boxShadow: '0 10px 30px rgba(0,0,0,0.5)', animation: 'messageSlideIn 0.3s ease-out' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '15px', color: currentTheme.text }}>Studio Preferences</h3>
              <button onClick={() => setShowSettings(false)} style={{ background: 'transparent', color: currentTheme.textDim, border: 'none', fontSize: '14px', cursor: 'pointer', fontWeight: 'bold' }}>X</button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '10px', fontWeight: '700', color: currentTheme.textDim, display: 'block', marginBottom: '6px', textTransform: 'uppercase' }}>Visual Theme</label>
                <div style={{ display: 'flex', gap: '6px' }}>
                  {(['dark', 'midnight', 'cyberpunk'] as const).map(t => (
                    <button key={t} onClick={() => setTheme(t)} style={{ flex: 1, padding: '8px', backgroundColor: theme === t ? currentTheme.accent : currentTheme.surfaceHover, color: theme === t ? '#fff' : currentTheme.text, border: `1px solid ${currentTheme.border}`, borderRadius: '6px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer', textTransform: 'capitalize' }}>
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label style={{ fontSize: '10px', fontWeight: '700', color: currentTheme.textDim, display: 'block', marginBottom: '6px', textTransform: 'uppercase' }}>Device Layout Mode</label>
                <div style={{ display: 'flex', gap: '6px' }}>
                  {(['pc', 'mobile'] as const).map(m => (
                    <button key={m} onClick={() => setDeviceMode(m)} style={{ flex: 1, padding: '8px', backgroundColor: deviceMode === m ? currentTheme.accent : currentTheme.surfaceHover, color: deviceMode === m ? '#fff' : currentTheme.text, border: `1px solid ${currentTheme.border}`, borderRadius: '6px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer', textTransform: 'uppercase' }}>
                      {m}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label style={{ fontSize: '10px', fontWeight: '700', color: currentTheme.textDim, display: 'block', marginBottom: '4px', textTransform: 'uppercase' }}>System Instructions</label>
                <textarea
                  value={systemInstructions}
                  onChange={(e) => setSystemInstructions(e.target.value)}
                  rows={3}
                  style={{ width: '100%', padding: '8px', backgroundColor: currentTheme.bg, color: currentTheme.text, border: `1px solid ${currentTheme.border}`, borderRadius: '6px', fontSize: '11px', outline: 'none', resize: 'none' }}
                />
              </div>

              <button onClick={() => setShowSettings(false)} style={{ width: '100%', padding: '10px', backgroundColor: currentTheme.accent, color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', fontSize: '12px', cursor: 'pointer', marginTop: '6px' }}>
                Save Preferences
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- AUTH MODAL --- */}
      {showAuthModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vw', backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, backdropFilter: 'blur(3px)' }}>
          <div style={{ backgroundColor: currentTheme.surface, border: `1px solid ${currentTheme.border}`, borderRadius: '12px', padding: '20px', width: '90%', maxWidth: '380px', boxShadow: '0 10px 30px rgba(0,0,0,0.5)', animation: 'messageSlideIn 0.3s ease-out' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '15px', color: currentTheme.text }}>Studio Sign In / Sign Up</h3>
              <button onClick={() => { setShowAuthModal(false); setCodeSent(false); }} style={{ background: 'transparent', color: currentTheme.textDim, border: 'none', fontSize: '14px', cursor: 'pointer', fontWeight: 'bold' }}>X</button>
            </div>

            {!codeSent ? (
              <form onSubmit={handleSendCode} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '10px', fontWeight: '700', color: currentTheme.textDim, display: 'block', marginBottom: '4px', textTransform: 'uppercase' }}>Display Name</label>
                  <input type="text" value={authName} onChange={(e) => setAuthName(e.target.value)} placeholder="Roblox Developer" required style={{ width: '100%', padding: '8px', backgroundColor: currentTheme.bg, color: currentTheme.text, border: `1px solid ${currentTheme.border}`, borderRadius: '6px', fontSize: '12px', outline: 'none' }} />
                </div>
                <div>
                  <label style={{ fontSize: '10px', fontWeight: '700', color: currentTheme.textDim, display: 'block', marginBottom: '4px', textTransform: 'uppercase' }}>Email Address</label>
                  <input type="email" value={authEmail} onChange={(e) => setAuthEmail(e.target.value)} placeholder="developer@roblox.com" required style={{ width: '100%', padding: '8px', backgroundColor: currentTheme.bg, color: currentTheme.text, border: `1px solid ${currentTheme.border}`, borderRadius: '6px', fontSize: '12px', outline: 'none' }} />
                </div>
                <button type="submit" disabled={sendingCode} style={{ width: '100%', padding: '10px', backgroundColor: currentTheme.accent, color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', fontSize: '12px', cursor: 'pointer', marginTop: '6px' }}>
                  {sendingCode ? 'Sending Code...' : 'Continue with Email'}
                </button>
              </form>
            ) : (
              <form onSubmit={handleVerifyCode} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <p style={{ fontSize: '11px', color: currentTheme.textDim, margin: 0 }}>Verification code sent to <strong style={{ color: currentTheme.text }}>{authEmail}</strong>. (Hint: Enter any 4 digits)</p>
                <div>
                  <label style={{ fontSize: '10px', fontWeight: '700', color: currentTheme.textDim, display: 'block', marginBottom: '4px', textTransform: 'uppercase' }}>Enter 4-Digit Code</label>
                  <input type="text" maxLength={4} value={enteredCode} onChange={(e) => setEnteredCode(e.target.value)} placeholder="1234" required style={{ width: '100%', padding: '10px', backgroundColor: currentTheme.bg, color: currentTheme.text, border: `1px solid ${currentTheme.border}`, borderRadius: '6px', fontSize: '14px', textAlign: 'center', letterSpacing: '4px', outline: 'none' }} />
                </div>
                <button type="submit" style={{ width: '100%', padding: '10px', backgroundColor: currentTheme.accent, color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', fontSize: '12px', cursor: 'pointer', marginTop: '6px' }}>
                  Verify & Sign In
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* --- ADMIN MODAL --- */}
      {showAdminModal && user?.isAdmin && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vw', backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, backdropFilter: 'blur(3px)' }}>
          <div style={{ backgroundColor: currentTheme.surface, border: `1px solid ${currentTheme.border}`, borderRadius: '12px', padding: '20px', width: '90%', maxWidth: '440px', boxShadow: '0 10px 30px rgba(0,0,0,0.5)', animation: 'messageSlideIn 0.3s ease-out' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <h3 style={{ margin: 0, fontSize: '15px', color: currentTheme.text }}>Studio Admin Control Center</h3>
              <button onClick={() => setShowAdminModal(false)} style={{ background: 'transparent', color: currentTheme.textDim, border: 'none', fontSize: '14px', cursor: 'pointer', fontWeight: 'bold' }}>X</button>
            </div>

            <p style={{ fontSize: '11px', color: currentTheme.textDim, marginBottom: '12px' }}>Managing active studio members and developer access permissions.</p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '220px', overflowY: 'auto', marginBottom: '14px' }}>
              {monitoredUsers.map(u => (
                <div key={u.email} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 10px', backgroundColor: currentTheme.bg, border: `1px solid ${currentTheme.border}`, borderRadius: '6px' }}>
                  <div>
                    <span style={{ fontSize: '12px', fontWeight: '600', color: currentTheme.text, display: 'block' }}>{u.email}</span>
                    <span style={{ fontSize: '10px', color: currentTheme.accent }}>Role: {u.role}</span>
                  </div>
                  <button onClick={() => handleBanUser(u.email)} style={{ backgroundColor: '#dc2626', color: '#fff', border: 'none', borderRadius: '4px', padding: '4px 8px', fontSize: '10px', fontWeight: 'bold', cursor: 'pointer' }}>
                    Revoke Access
                  </button>
                </div>
              ))}
            </div>

            <button onClick={() => setShowAdminModal(false)} style={{ width: '100%', padding: '9px', backgroundColor: currentTheme.surfaceHover, color: currentTheme.text, border: `1px solid ${currentTheme.border}`, borderRadius: '6px', fontWeight: 'bold', fontSize: '12px', cursor: 'pointer' }}>
              Close Admin Console
            </button>
          </div>
        </div>
      )}

    </div>
  );
                  }
                           
