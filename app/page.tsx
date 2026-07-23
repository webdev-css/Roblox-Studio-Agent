'use client';

import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export default function Home() {
  // Chat state
  const [messages, setMessages] = useState<{ role: 'user' | 'ai'; text: string }[]>([]);
  const [input, setInput] = useState('');
  const [explorerData, setExplorerData] = useState('');
  const [selectedModel, setSelectedModel] = useState('rdm-2.2');
  const [loading, setLoading] = useState(false);

  // Layout & Settings State
  const [deviceMode, setDeviceMode] = useState<'mobile' | 'pc'>('pc');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  // Auth & OTP State
  const [user, setUser] = useState<{ email: string; name: string } | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authEmail, setAuthEmail] = useState('');
  const [authName, setAuthName] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [sentCode, setSentCode] = useState('');
  const [enteredCode, setEnteredCode] = useState('');
  const [sendingCode, setSendingCode] = useState(false);

  // Send message to AI
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
          explorerData,
          model: selectedModel,
          userSession: user,
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

  // Step 1: Send real code via Resend API
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

  // Step 2: Verify the code typed by user
  const handleVerifyCode = (e: React.FormEvent) => {
    e.preventDefault();
    if (enteredCode.trim() === sentCode) {
      setUser({
        email: authEmail,
        name: authName || authEmail.split('@')[0],
      });
      setShowAuthModal(false);
      setCodeSent(false);
      setEnteredCode('');
      setAuthEmail('');
      alert('🎉 Verification successful! Welcome back.');
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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', backgroundColor: '#171717', color: '#ececec', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      
      {/* Navigation Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', backgroundColor: '#1e1e1e', borderBottom: '1px solid #2e2e2e' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '32px', height: '32px', borderRadius: '8px', backgroundColor: '#d97706', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', color: '#fff', fontSize: '18px' }}>⚡</div>
          <div>
            <span style={{ fontSize: '15px', fontWeight: '700', color: '#f5f5f5', display: 'block' }}>Roblox AI Studio</span>
            <span style={{ fontSize: '11px', color: '#a3a3a3' }}>Mode: {deviceMode.toUpperCase()}</span>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {user ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '12px', color: '#fbbf24' }}>👤 {user.name}</span>
              <button onClick={handleLogout} style={{ backgroundColor: '#262626', color: '#a3a3a3', border: '1px solid #404040', borderRadius: '6px', padding: '4px 8px', fontSize: '11px', cursor: 'pointer' }}>Logout</button>
            </div>
          ) : (
            <button onClick={() => setShowAuthModal(true)} style={{ backgroundColor: '#d97706', color: '#fff', border: 'none', borderRadius: '6px', padding: '6px 12px', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}>
              Login / Sign Up
            </button>
          )}

          <button onClick={() => setShowSettings(!showSettings)} style={{ backgroundColor: '#262626', color: '#f5f5f5', border: '1px solid #404040', borderRadius: '6px', padding: '6px 10px', fontSize: '12px', cursor: 'pointer' }}>
            ⚙️ Settings
          </button>
        </div>
      </div>

      {/* Main App Layout */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden', position: 'relative' }}>
        
        {/* PC Sidebar */}
        {deviceMode === 'pc' && (
          <div style={{ width: '300px', backgroundColor: '#1e1e1e', padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px', borderRight: '1px solid #2e2e2e' }}>
            <div>
              <label style={{ fontSize: '11px', fontWeight: '700', color: '#a3a3a3', display: 'block', marginBottom: '6px', textTransform: 'uppercase' }}>Model Engine</label>
              <select value={selectedModel} onChange={(e) => setSelectedModel(e.target.value)} style={{ width: '100%', padding: '8px', backgroundColor: '#262626', color: '#f5f5f5', border: '1px solid #404040', borderRadius: '6px', fontSize: '12px', outline: 'none' }}>
                <option value="rdm-2.2">RDM v2.2 [Fast Answers]</option>
                <option value="rdm-2.1-pro">RDM v2.1 Pro [Clean Scripting]</option>
                <option value="rdm-1.1-mythical">RDM v1.1 Mythical [Advanced UI & Code]</option>
              </select>
            </div>

            <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
              <label style={{ fontSize: '11px', fontWeight: '700', color: '#a3a3a3', marginBottom: '6px', textTransform: 'uppercase' }}>Roblox Explorer Context</label>
              <textarea placeholder="Paste Workspace / ReplicatedStorage tree..." value={explorerData} onChange={(e) => setExplorerData(e.target.value)} style={{ flex: 1, width: '100%', backgroundColor: '#262626', color: '#fbbf24', padding: '8px', border: '1px solid #404040', borderRadius: '6px', fontFamily: 'monospace', fontSize: '12px', resize: 'none', outline: 'none' }} />
            </div>
          </div>
        )}

        {/* Mobile Slide Drawer */}
        {deviceMode === 'mobile' && sidebarOpen && (
          <div style={{ position: 'absolute', top: 0, left: 0, width: '85%', maxWidth: '300px', height: '100%', backgroundColor: '#1e1e1e', padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px', borderRight: '1px solid #2e2e2e', zIndex: 50 }}>
            <div>
              <label style={{ fontSize: '11px', fontWeight: '700', color: '#a3a3a3', display: 'block', marginBottom: '6px', textTransform: 'uppercase' }}>Model Engine</label>
              <select value={selectedModel} onChange={(e) => setSelectedModel(e.target.value)} style={{ width: '100%', padding: '8px', backgroundColor: '#262626', color: '#f5f5f5', border: '1px solid #404040', borderRadius: '6px', fontSize: '12px' }}>
                <option value="rdm-2.2">RDM v2.2 [Fast Answers]</option>
                <option value="rdm-2.1-pro">RDM v2.1 Pro [Clean Scripting]</option>
                <option value="rdm-1.1-mythical">RDM v1.1 Mythical [Advanced UI & Code]</option>
              </select>
            </div>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
              <label style={{ fontSize: '11px', fontWeight: '700', color: '#a3a3a3', marginBottom: '6px', textTransform: 'uppercase' }}>Roblox Explorer Context</label>
              <textarea placeholder="Paste Workspace structure..." value={explorerData} onChange={(e) => setExplorerData(e.target.value)} style={{ flex: 1, width: '100%', backgroundColor: '#262626', color: '#fbbf24', padding: '8px', border: '1px solid #404040', borderRadius: '6px', fontFamily: 'monospace', fontSize: '12px' }} />
            </div>
            <button onClick={() => setSidebarOpen(false)} style={{ width: '100%', padding: '10px', backgroundColor: '#d97706', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold' }}>Close Drawer</button>
          </div>
        )}

        {/* Chat Feed */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%' }}>
          {deviceMode === 'mobile' && (
            <div style={{ padding: '8px 12px', backgroundColor: '#18181b', borderBottom: '1px solid #27272a' }}>
              <button onClick={() => setSidebarOpen(true)} style={{ backgroundColor: '#27272a', color: '#f4f4f5', border: 'none', borderRadius: '4px', padding: '6px 12px', fontSize: '12px' }}>📋 Open Context & Options</button>
            </div>
          )}

          <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {messages.length === 0 && (
              <div style={{ textAlign: 'center', marginTop: '60px', color: '#a3a3a3' }}>
                <h1 style={{ fontSize: '20px', color: '#f5f5f5', fontWeight: '600', marginBottom: '8px' }}>Roblox AI Studio Assistant</h1>
                <p style={{ fontSize: '13px', color: '#737373' }}>Enter a request to generate Luau scripts, leaderstats, or UI components.</p>
              </div>
            )}

            {messages.map((m, i) => (
              <div key={i} style={{ alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start', maxWidth: '92%' }}>
                <div style={{ backgroundColor: m.role === 'user' ? '#2563eb' : '#262626', padding: '12px 14px', borderRadius: '10px', fontSize: '14px', border: m.role === 'user' ? 'none' : '1px solid #333' }}>
                  {m.role === 'user' ? (
                    <div>{m.text}</div>
                  ) : (
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      components={{
                        code({ className, children, ...props }) {
                          const codeString = String(children).replace(/\n$/, '');
                          return (
                            <div style={{ margin: '8px 0', borderRadius: '6px', overflow: 'hidden', border: '1px solid #404040' }}>
                              <div style={{ backgroundColor: '#171717', padding: '4px 10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontSize: '11px', color: '#a3a3a3', fontFamily: 'monospace' }}>Luau Script</span>
                                <button onClick={() => copyToClipboard(codeString)} style={{ backgroundColor: '#262626', color: '#fbbf24', border: 'none', borderRadius: '4px', padding: '2px 6px', fontSize: '11px', cursor: 'pointer' }}>📋 Copy</button>
                              </div>
                              <pre style={{ backgroundColor: '#0f172a', color: '#38bdf8', padding: '10px', margin: 0, overflowX: 'auto', fontFamily: 'monospace', fontSize: '12px' }}>
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

            {loading && <div style={{ color: '#d97706', fontSize: '13px', fontStyle: 'italic' }}>⚡ RDM Engine generating response...</div>}
          </div>

          {/* Floating Message Input */}
          <div style={{ padding: '12px' }}>
            <div style={{ display: 'flex', backgroundColor: '#262626', border: '1px solid #404040', borderRadius: '8px', padding: '6px', gap: '6px' }}>
              <input type="text" placeholder="Ask for Luau scripts..." value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && sendMessage()} style={{ flex: 1, backgroundColor: 'transparent', border: 'none', color: '#fff', fontSize: '14px', outline: 'none', padding: '4px 8px' }} />
              <button onClick={sendMessage} style={{ backgroundColor: '#d97706', color: '#fff', border: 'none', borderRadius: '6px', padding: '6px 14px', fontWeight: '600', cursor: 'pointer' }}>Send</button>
            </div>
          </div>
        </div>
      </div>

      {/* Settings Modal */}
      {showSettings && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ backgroundColor: '#1e1e1e', border: '1px solid #404040', borderRadius: '12px', padding: '20px', width: '320px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h3 style={{ margin: 0, fontSize: '16px', color: '#f5f5f5' }}>Display & Device Settings</h3>
            <div>
              <label style={{ fontSize: '12px', color: '#a3a3a3', display: 'block', marginBottom: '8px' }}>Layout Mode</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={() => setDeviceMode('pc')} style={{ flex: 1, padding: '8px', backgroundColor: deviceMode === 'pc' ? '#d97706' : '#262626', color: '#fff', border: '1px solid #404040', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' }}>💻 PC View</button>
                <button onClick={() => setDeviceMode('mobile')} style={{ flex: 1, padding: '8px', backgroundColor: deviceMode === 'mobile' ? '#d97706' : '#262626', color: '#fff', border: '1px solid #404040', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' }}>📱 Mobile View</button>
              </div>
            </div>
            <button onClick={() => setShowSettings(false)} style={{ width: '100%', padding: '8px', backgroundColor: '#262626', color: '#fff', border: '1px solid #404040', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' }}>Save & Close</button>
          </div>
        </div>
      )}

      {/* Auth Modal with Real Verification Code Flow */}
      {showAuthModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ backgroundColor: '#1e1e1e', border: '1px solid #404040', borderRadius: '12px', padding: '24px', width: '320px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h3 style={{ margin: 0, fontSize: '18px', color: '#f5f5f5' }}>
              {codeSent ? '🔑 Enter Verification Code' : 'Sign In / Sign Up'}
            </h3>
            
            {!codeSent ? (
              <form onSubmit={handleSendCode} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <input
                  type="text"
                  placeholder="Developer Name (Optional)"
                  value={authName}
                  onChange={(e) => setAuthName(e.target.value)}
                  style={{ padding: '8px 12px', backgroundColor: '#262626', border: '1px solid #404040', borderRadius: '6px', color: '#fff', outline: 'none', fontSize: '13px' }}
                />
                <input
                  type="email"
                  placeholder="Email Address"
                  value={authEmail}
                  onChange={(e) => setAuthEmail(e.target.value)}
                  required
                  style={{ padding: '8px 12px', backgroundColor: '#262626', border: '1px solid #404040', borderRadius: '6px', color: '#fff', outline: 'none', fontSize: '13px' }}
                />
                <button
                  type="submit"
                  disabled={sendingCode}
                  style={{ padding: '10px', backgroundColor: '#d97706', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', marginTop: '4px' }}
                >
                  {sendingCode ? 'Sending Code...' : 'Send Verification Code 📧'}
                </button>
              </form>
            ) : (
              <form onSubmit={handleVerifyCode} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <p style={{ fontSize: '12px', color: '#a3a3a3', margin: 0 }}>
                  We sent a 6-digit code to <strong style={{ color: '#fbbf24' }}>{authEmail}</strong>
                </p>
                <input
                  type="text"
                  placeholder="6-Digit Code (e.g. 123456)"
                  value={enteredCode}
                  onChange={(e) => setEnteredCode(e.target.value)}
                  maxLength={6}
                  required
                  style={{ padding: '10px 12px', backgroundColor: '#262626', border: '1px solid #404040', borderRadius: '6px', color: '#fbbf24', fontSize: '18px', fontWeight: 'bold', textAlign: 'center', letterSpacing: '4px', outline: 'none' }}
                />
                <button
                  type="submit"
                  style={{ padding: '10px', backgroundColor: '#16a34a', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}
                >
                  Verify & Complete Login 🎉
                </button>
                <button
                  type="button"
                  onClick={() => setCodeSent(false)}
                  style={{ backgroundColor: 'transparent', color: '#a3a3a3', border: 'none', fontSize: '11px', cursor: 'pointer', textDecoration: 'underline' }}
                >
                  ← Back to change email
                </button>
              </form>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', fontSize: '12px', color: '#a3a3a3' }}>
              <span onClick={() => { setShowAuthModal(false); setCodeSent(false); }} style={{ cursor: 'pointer' }}>Close</span>
            </div>
          </div>
        </div>
      )}

    </div>
  );
                             }
                             
