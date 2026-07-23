'use client';

import React, { useState } from 'react';

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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', backgroundColor: '#171717', color: '#ececec', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      
      {/* Top Header Bar for Mobile */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', backgroundColor: '#1e1e1e', borderBottom: '1px solid #2e2e2e' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '28px', height: '28px', borderRadius: '6px', backgroundColor: '#d97706', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', color: '#fff' }}>🤖</div>
          <span style={{ fontSize: '16px', fontWeight: '600', color: '#f5f5f5' }}>Roblox Studio AI</span>
        </div>
        <button 
          onClick={() => setSidebarOpen(!sidebarOpen)}
          style={{ backgroundColor: '#262626', color: '#f5f5f5', border: '1px solid #404040', borderRadius: '6px', padding: '6px 12px', fontSize: '13px' }}
        >
          {sidebarOpen ? 'Close Menu ✕' : '⚙️ Menu'}
        </button>
      </div>

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden', position: 'relative' }}>
        
        {/* Sidebar (Responsive Overlay/Drawer) */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: sidebarOpen ? 0 : '-100%',
          width: '85%',
          maxWidth: '300px',
          height: '100%',
          backgroundColor: '#1e1e1e',
          padding: '16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          borderRight: '1px solid #2e2e2e',
          transition: 'left 0.3s ease',
          zIndex: 50,
          boxShadow: sidebarOpen ? '4px 0 12px rgba(0,0,0,0.5)' : 'none'
        }}>
          {/* Custom Models Dropdown */}
          <div>
            <label style={{ fontSize: '11px', fontWeight: '600', color: '#a3a3a3', display: 'block', marginBottom: '6px', textTransform: 'uppercase' }}>
              Model Selection
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

          {/* Roblox Explorer Hierarchy Input */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            <label style={{ fontSize: '11px', fontWeight: '600', color: '#a3a3a3', marginBottom: '6px', textTransform: 'uppercase' }}>
              Roblox Explorer Context
            </label>
            <textarea
              placeholder="Paste your Explorer tree here..."
              value={explorerData}
              onChange={(e) => setExplorerData(e.target.value)}
              style={{ flex: 1, width: '100%', backgroundColor: '#262626', color: '#fbbf24', padding: '10px', border: '1px solid #404040', borderRadius: '8px', fontFamily: 'monospace', fontSize: '12px', resize: 'none', outline: 'none' }}
            />
          </div>

          <button 
            onClick={() => setSidebarOpen(false)}
            style={{ width: '100%', padding: '10px', backgroundColor: '#d97706', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold' }}
          >
            Done
          </button>
        </div>

        {/* Backdrop overlay when menu is open */}
        {sidebarOpen && (
          <div 
            onClick={() => setSidebarOpen(false)}
            style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 40 }}
          />
        )}

        {/* Main Chat Area */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%', position: 'relative' }}>
          
          {/* Messages Scroll Area */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '16px 12px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {messages.length === 0 && (
              <div style={{ textAlign: 'center', marginTop: '60px', color: '#a3a3a3' }}>
                <h1 style={{ fontSize: '22px', color: '#f5f5f5', fontWeight: '500', marginBottom: '8px' }}>What are we building today?</h1>
                <p style={{ fontSize: '13px', color: '#737373' }}>Ask RDM for Luau scripts, shop GUIs, or game logic.</p>
              </div>
            )}

            {messages.map((m, i) => (
              <div key={i} style={{ alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start', maxWidth: '90%' }}>
                <div style={{
                  backgroundColor: m.role === 'user' ? '#2563eb' : '#262626',
                  color: '#f5f5f5',
                  padding: '12px 14px',
                  borderRadius: '12px',
                  fontSize: '14px',
                  lineHeight: '1.5',
                  whiteSpace: 'pre-wrap',
                  border: m.role === 'user' ? 'none' : '1px solid #333333',
                  wordBreak: 'break-word'
                }}>
                  {m.text}
                </div>
              </div>
            ))}

            {loading && (
              <div style={{ color: '#d97706', fontSize: '13px', fontStyle: 'italic', display: 'flex', alignItems: 'center', gap: '8px' }}>
                ⚡ RDM is generating your code...
              </div>
            )}
          </div>

          {/* Bottom Floating Input Bar */}
          <div style={{ padding: '12px' }}>
            <div style={{ display: 'flex', backgroundColor: '#262626', border: '1px solid #404040', borderRadius: '10px', padding: '6px 8px', gap: '6px', alignItems: 'center' }}>
              <input
                type="text"
                placeholder="Ask for a script..."
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
    
