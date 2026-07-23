'use client';

import React, { useState } from 'react';

export default function Home() {
  const [messages, setMessages] = useState<{ role: 'user' | 'ai'; text: string }[]>([]);
  const [input, setInput] = useState('');
  const [explorerData, setExplorerData] = useState('');
  const [selectedModel, setSelectedModel] = useState('gemini-2.0-flash');
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
    <div style={{ display: 'flex', height: '100vh', backgroundColor: '#0f172a', color: '#f8fafc', fontFamily: 'sans-serif' }}>
      {/* Sidebar */}
      <div style={{ width: '300px', backgroundColor: '#1e293b', padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px', borderRight: '1px solid #334155' }}>
        <h2 style={{ fontSize: '18px', fontWeight: 'bold', margin: 0, color: '#38bdf8' }}>🛠️ Roblox Studio AI</h2>
        
        {/* Model Selector */}
        <div>
          <label style={{ fontSize: '12px', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>AI Model:</label>
          <select 
            value={selectedModel} 
            onChange={(e) => setSelectedModel(e.target.value)}
            style={{ width: '100%', padding: '8px', backgroundColor: '#0f172a', color: '#fff', border: '1px solid #475569', borderRadius: '6px' }}
          >
            <option value="gemini-2.0-flash">Gemini 2.0 Flash (Fast & Free)</option>
            <option value="gemini-2.5-pro">Gemini 2.5 Pro (Advanced Logic)</option>
          </select>
        </div>

        {/* Explorer Hierarchy Input */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <label style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>Roblox Explorer Context:</label>
          <textarea
            placeholder="Paste Explorer tree here..."
            value={explorerData}
            onChange={(e) => setExplorerData(e.target.value)}
            style={{ flex: 1, width: '100%', backgroundColor: '#0f172a', color: '#38bdf8', padding: '8px', border: '1px solid #475569', borderRadius: '6px', fontFamily: 'monospace', fontSize: '12px', resize: 'none' }}
          />
        </div>
      </div>

      {/* Main Chat Interface */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '16px' }}>
        <div style={{ flex: 1, overflowY: 'auto', marginBottom: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {messages.length === 0 && (
            <div style={{ textAlign: 'center', marginTop: '40px', color: '#64748b' }}>
              <h3>Welcome Dev! 👋</h3>
              <p>Ask for Luau scripts, RemoteEvents, or shop setups!</p>
            </div>
          )}
          {messages.map((m, i) => (
            <div key={i} style={{
              alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
              backgroundColor: m.role === 'user' ? '#0284c7' : '#1e293b',
              color: '#fff',
              padding: '12px 16px',
              borderRadius: '8px',
              maxWidth: '80%',
              whiteSpace: 'pre-wrap'
            }}>
              {m.text}
            </div>
          ))}
          {loading && <div style={{ color: '#38bdf8' }}>Thinking...</div>}
        </div>

        {/* Input Bar */}
        <div style={{ display: 'flex', gap: '8px' }}>
          <input
            type="text"
            placeholder="Ask for a Luau script..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
            style={{ flex: 1, padding: '12px', backgroundColor: '#1e293b', border: '1px solid #475569', color: '#fff', borderRadius: '6px' }}
          />
          <button 
            onClick={sendMessage}
            style={{ padding: '12px 24px', backgroundColor: '#0284c7', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
        }
          
