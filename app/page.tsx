'use client';

import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';

export default function Home() {
  const [messages, setMessages] = useState<{ role: 'user' | 'ai'; text: string }[]>([]);
  const [input, setInput] = useState('');
  const [explorerData, setExplorerData] = useState('');
  const [selectedModel, setSelectedModel] = useState('rdm-2.2');
  const [loading, setLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

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

  const clearChat = () => {
    setMessages([]);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('Script copied to clipboard!');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', backgroundColor: '#171717', color: '#ececec', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      
      {/* Header Navigation */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', backgroundColor: '#1e1e1e', borderBottom: '1px solid #2e2e2e' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '32px', height: '32px', borderRadius: '8px', backgroundColor: '#d97706', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', color: '#fff', fontSize: '18px' }}>⚡</div>
          <div>
            <span style={{ fontSize: '15px', fontWeight: '700', color: '#f5f5f5', display: 'block' }}>Roblox Studio AI</span>
            <span style={{ fontSize: '11px', color: '#a3a3a3' }}>Powered by RDM Engine</span>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          {messages.length > 0 && (
            <button 
              onClick={clearChat}
              style={{ backgroundColor: '#262626', color: '#ef4444', border: '1px solid #404040', borderRadius: '6px', padding: '6px 10px', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}
            >
              Clear
            </button>
          )}
          <button 
            onClick={() => setSidebarOpen(!sidebarOpen)}
            style={{ backgroundColor: '#262626', color: '#f5f5f5', border: '1px solid #404040', borderRadius: '6px', padding: '6px 12px', fontSize: '12px', cursor: 'pointer' }}
          >
            {sidebarOpen ? 'Close ✕' : '⚙️ Options'}
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden', position: 'relative' }}>
        
        {/* Mobile Slide-Out Sidebar / Drawer */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: sidebarOpen ? 0 : '-100%',
          width: '85%',
          maxWidth: '320px',
          height: '100%',
          backgroundColor: '#1e1e1e',
          padding: '18px',
          display: 'flex',
          flexDirection: 'column',
          gap: '18px',
          borderRight: '1px solid #2e2e2e',
          transition: 'left 0.25s ease',
          zIndex: 50,
          boxShadow: sidebarOpen ? '6px 0 16px rgba(0,0,0,0.6)' : 'none'
        }}>
          <div>
            <label style={{ fontSize: '11px', fontWeight: '700', color: '#a3a3a3', display: 'block', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Model Engine
            </label>
            <select 
              value={selectedModel} 
              onChange={(e) => setSelectedModel(e.target.value)}
              style={{ width: '100%', padding: '10px', backgroundColor: '#262626', color: '#f5f5f5', border: '1px solid #404040', borderRadius: '8px', fontSize: '13px', outline: 'none' }}
            >
              <option value="rdm-2.2">RDM v2.2 [Fastest Answers]</option>
              <option value="rdm-2.1-pro">RDM v2.1 Pro [Clean UI & Scripting]</option>
              <option value="rdm-1.1-mythical">RDM v1.1 Mythical [Pro - Best UI & Code]</option>
            </select>
          </div>

          <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            <label style={{ fontSize: '11px', fontWeight: '700', color: '#a3a3a3', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Roblox Explorer Context
            </label>
            <textarea
              placeholder="Paste Workspace / ReplicatedStorage tree structure here..."
              value={explorerData}
              onChange={(e) => setExplorerData(e.target.value)}
              style={{ flex: 1, width: '100%', backgroundColor: '#262626', color: '#fbbf24', padding: '10px', border: '1px solid #404040', borderRadius: '8px', fontFamily: 'monospace', fontSize: '12px', resize: 'none', outline: 'none' }}
            />
          </div>

          <button 
            onClick={() => setSidebarOpen(false)}
            style={{ width: '100%', padding: '12px', backgroundColor: '#d97706', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', fontSize: '13px' }}
          >
            Apply & Back to Chat
          </button>
        </div>

        {/* Backdrop for Sidebar */}
        {sidebarOpen && (
          <div 
            onClick={() => setSidebarOpen(false)}
            style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.65)', zIndex: 40 }}
          />
        )}

        {/* Main Chat Body */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%', position: 'relative' }}>
          
          <div style={{ flex: 1, overflowY: 'auto', padding: '16px 12px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {messages.length === 0 && (
              <div style={{ textAlign: 'center', marginTop: '60px', padding: '0 20px', color: '#a3a3a3' }}>
                <h1 style={{ fontSize: '22px', color: '#f5f5f5', fontWeight: '600', marginBottom: '8px' }}>Roblox AI Studio Assistant</h1>
                <p style={{ fontSize: '13px', color: '#737373', maxWidth: '360px', margin: '0 auto 20px auto' }}>Ask for Luau scripts, Leaderstats, Shop GUIs, or RemoteEvent workflows.</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', justifyContent: 'center' }}>
                  <button onClick={() => setInput('Create a leaderstats script with Cash and Gems')} style={{ backgroundColor: '#262626', border: '1px solid #404040', color: '#d1d5db', padding: '8px 12px', borderRadius: '20px', fontSize: '12px', cursor: 'pointer' }}>💰 Leaderstats Script</button>
                  <button onClick={() => setInput('How do I setup RemoteEvents for a shop?')} style={{ backgroundColor: '#262626', border: '1px solid #404040', color: '#d1d5db', padding: '8px 12px', borderRadius: '20px', fontSize: '12px', cursor: 'pointer' }}>🛍️ Shop RemoteEvents</button>
                </div>
              </div>
            )}

            {messages.map((m, i) => (
              <div key={i} style={{ alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start', maxWidth: '92%' }}>
                <div style={{
                  backgroundColor: m.role === 'user' ? '#2563eb' : '#262626',
                  color: '#f5f5f5',
                  padding: '12px 14px',
                  borderRadius: '12px',
                  fontSize: '14px',
                  lineHeight: '1.6',
                  border: m.role === 'user' ? 'none' : '1px solid #333333',
                  wordBreak: 'break-word',
                  position: 'relative'
                }}>
                  {/* Render Markdown formatted text */}
                  {m.role === 'user' ? (
                    <div>{m.text}</div>
                  ) : (
                    <ReactMarkdown>{m.text}</ReactMarkdown>
                  )}

                  {m.role === 'ai' && (
                    <div style={{ marginTop: '10px', paddingTop: '8px', borderTop: '1px solid #333', display: 'flex', justifyContent: 'flex-end' }}>
                      <button 
                        onClick={() => copyToClipboard(m.text)}
                        style={{ backgroundColor: '#171717', color: '#fbbf24', border: '1px solid #404040', borderRadius: '4px', padding: '4px 8px', fontSize: '11px', cursor: 'pointer' }}
                      >
                        📋 Copy Output
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {loading && (
              <div style={{ color: '#d97706', fontSize: '13px', fontStyle: 'italic', display: 'flex', alignItems: 'center', gap: '8px', paddingLeft: '8px' }}>
                ⚡ RDM Engine generating Luau code...
              </div>
            )}
          </div>

          {/* Floating Message Input Bar */}
          <div style={{ padding: '12px' }}>
            <div style={{ display: 'flex', backgroundColor: '#262626', border: '1px solid #404040', borderRadius: '10px', padding: '6px 8px', gap: '6px', alignItems: 'center' }}>
              <input
                type="text"
                placeholder="Ask RDM for a script or setup..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                style={{ flex: 1, backgroundColor: 'transparent', border: 'none', color: '#fff', fontSize: '14px', outline: 'none', padding: '6px' }}
              />
              <button 
                onClick={sendMessage}
                style={{ backgroundColor: '#d97706', color: '#fff', border: 'none', borderRadius: '6px', padding: '8px 14px', fontWeight: '600', cursor: 'pointer', fontSize: '13px' }}
              >
                Send
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
        }
        
