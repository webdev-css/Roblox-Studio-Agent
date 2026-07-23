'use client';

import React, { useState } from 'react';

export default function Home() {
  const [messages, setMessages] = useState<{ role: 'user' | 'ai'; text: string }[]>([]);
  const [input, setInput] = useState('');
  const [explorerData, setExplorerData] = useState('');
  const [selectedModel, setSelectedModel] = useState('rdm-2.2');
  const [loading, setLoading] = useState(false);

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
    <div style={{ display: 'flex', height: '100vh', backgroundColor: '#171717', color: '#ececec', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      
      {/* Sidebar (Claude Style) */}
      <div style={{ width: '280px', backgroundColor: '#1e1e1e', padding: '16px', display: 'flex', flexDirection: 'column', gap: '20px', borderRight: '1px solid #2e2e2e' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '28px', height: '28px', borderRadius: '6px', backgroundColor: '#d97706', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', color: '#fff' }}>🤖</div>
          <h2 style={{ fontSize: '16px', fontWeight: '600', margin: 0, color: '#f5f5f5' }}>Roblox Studio AI</h2>
        </div>

        {/* Custom Models Dropdown */}
        <div>
          <label style={{ fontSize: '11px', fontWeight: '600', color: '#a3a3a3', display: 'block', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
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
          <label style={{ fontSize: '11px', fontWeight: '600', color: '#a3a3a3', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Roblox Explorer Context
          </label>
          <textarea
            placeholder="Paste your Explorer tree here..."
            value={explorerData}
            onChange={(e) => setExplorerData(e.target.value)}
            style={{ flex: 1, width: '100%', backgroundColor: '#262626', color: '#fbbf24', padding: '10px', border: '1px solid #404040', borderRadius: '8px', fontFamily: 'monospace', fontSize: '12px', resize: 'none', outline: 'none' }}
          />
        </div>
      </div>

      {/* Main Chat Area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100vh', position: 'relative' }}>
        
        {/* Messages Scroll Area */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '32px 20%', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {messages.length === 0 && (
            <div style={{ textAlign: 'center', marginTop: '100px', color: '#a3a3a3' }}>
              <h1 style={{ fontSize: '28px', color: '#f5f5f5', fontWeight: '500', marginBottom: '10px' }}>What can I help you script today?</h1>
              <p style={{ fontSize: '14px', color: '#737373' }}>Generate Luau code, design Shop GUIs, setup RemoteEvents, and more.</p>
            </div>
          )}

          {messages.map((m, i) => (
            <div key={i} style={{ display: 'flex', gap: '14px', alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start', maxWidth: '85%' }}>
              <div style={{
                backgroundColor: m.role === 'user' ? '#3b82f6' : '#262626',
                color: '#f5f5f5',
                padding: '14px 18px',
                borderRadius: '12px',
                fontSize: '14px',
                lineHeight: '1.6',
                whiteSpace: 'pre-wrap',
                border: m.role === 'user' ? 'none' : '1px solid #333333'
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

        {/* Input Bar (Claude Floating Style) */}
        <div style={{ padding: '0 20% 24px 20%' }}>
          <div style={{ display: 'flex', backgroundColor: '#262626', border: '1px solid #404040', borderRadius: '12px', padding: '8px 12px', gap: '8px' }}>
            <input
              type="text"
              placeholder="Ask RDM for a Luau script, shop UI, or ability..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
              style={{ flex: 1, backgroundColor: 'transparent', border: 'none', color: '#fff', fontSize: '14px', outline: 'none', padding: '8px' }}
            />
            <button 
              onClick={sendMessage}
              style={{ backgroundColor: '#d97706', color: '#fff', border: 'none', borderRadius: '8px', padding: '8px 16px', fontWeight: '600', cursor: 'pointer', fontSize: '13px' }}
            >
              Send
            </button>
          </div>
        </div>

      </div>
    </div>
  );
    }
    
