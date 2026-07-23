'use client';

import React, { useState } from 'react';
import { 
  FolderTree, MessageSquarePlus, Send, 
  Crown, Sparkles, User, Code 
} from 'lucide-react';

export default function RobloxAiDashboard() {
  const [messages, setMessages] = useState<Array<{ role: string; content: string }>>([
    { role: 'ai', content: 'Hello Dev! 👋 What are we building in Roblox Studio today?' }
  ]);
  const [input, setInput] = useState('');
  const [explorerTree, setExplorerTree] = useState(
`Workspace
 ├── SpawnLocation
 └── Model
ServerScriptService
 └── Script
StarterGui
 └── ScreenGui
     └── TextButton`
  );
  const [isPro, setIsPro] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSendMessage = async () => {
    if (!input.trim()) return;

    const userMsg = input;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMsg,
          explorerData: explorerTree,
        }),
      });

      const data = await res.json();

      if (data.success) {
        setMessages(prev => [...prev, { role: 'ai', content: data.reply }]);
      } else {
        setMessages(prev => [...prev, { role: 'ai', content: '❌ Error: ' + data.error }]);
      }
    } catch (err) {
      setMessages(prev => [...prev, { role: 'ai', content: '❌ Failed to reach the server.' }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-screen bg-slate-950 text-slate-100 font-sans">
      {/* SIDEBAR */}
      <aside className="w-80 border-r border-slate-800 bg-slate-900/50 flex flex-col p-4 gap-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-rose-500 font-bold text-lg">
            <Code className="w-6 h-6" />
            <span>RobloxAI Studio</span>
          </div>
          {isPro ? (
            <span className="flex items-center gap-1 text-xs bg-amber-500/20 text-amber-400 px-2 py-1 rounded-full border border-amber-500/30">
              <Crown className="w-3 h-3" /> PRO
            </span>
          ) : (
            <button 
              onClick={() => setIsPro(true)}
              className="text-xs bg-gradient-to-r from-amber-500 to-rose-500 text-black font-semibold px-2 py-1 rounded hover:opacity-90 transition"
            >
              Upgrade
            </button>
          )}
        </div>

        <button 
          onClick={() => setMessages([{ role: 'ai', content: 'Started a new session! What script or GUI are we making?' }])}
          className="flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 py-2 rounded-lg border border-slate-700 transition text-sm font-medium"
        >
          <MessageSquarePlus className="w-4 h-4" /> New Chat
        </button>

        <div className="flex-1 flex flex-col gap-2">
          <label className="text-xs font-semibold text-slate-400 flex items-center gap-1">
            <FolderTree className="w-4 h-4 text-rose-400" /> Roblox Explorer Structure
          </label>
          <textarea
            value={explorerTree}
            onChange={(e) => setExplorerTree(e.target.value)}
            className="flex-1 w-full bg-slate-950 border border-slate-800 rounded-md p-2 text-xs font-mono text-slate-300 focus:outline-none focus:border-rose-500 resize-none"
            placeholder="Paste your studio layout here..."
          />
        </div>
      </aside>

      {/* MAIN CHAT AREA */}
      <main className="flex-1 flex flex-col">
        <header className="h-16 border-b border-slate-800 flex items-center justify-between px-6 bg-slate-900/20">
          <span className="text-xs text-slate-400 font-mono">Powered by Claude 3.5 Sonnet</span>
          <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center border border-slate-700">
            <User className="w-4 h-4 text-slate-300" />
          </div>
        </header>

        {/* MESSAGES FEED */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.map((msg, i) => (
            <div 
              key={i} 
              className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div 
                className={`max-w-2xl rounded-xl p-4 text-sm leading-relaxed ${
                  msg.role === 'user' 
                    ? 'bg-rose-600 text-white rounded-br-none' 
                    : 'bg-slate-900 border border-slate-800 text-slate-200 rounded-bl-none font-mono whitespace-pre-wrap'
                }`}
              >
                {msg.content}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex items-center gap-2 text-slate-400 text-xs italic">
              <Sparkles className="w-4 h-4 animate-spin text-rose-500" /> Roblox AI is generating Luau script...
            </div>
          )}
        </div>

        {/* INPUT */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/30">
          <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-lg px-4 py-2 focus-within:border-rose-500">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
              placeholder="Ask for a Luau script, shop GUI layout, or bug fix..."
              className="flex-1 bg-transparent text-sm text-slate-100 placeholder-slate-500 focus:outline-none"
            />
            <button 
              onClick={handleSendMessage}
              className="bg-rose-600 hover:bg-rose-500 text-white p-2 rounded-md transition"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </main>
    </div>
  );
     }
    
