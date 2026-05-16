import React, { useState, useRef, useEffect } from 'react';
import { Send, MessageSquare } from 'lucide-react';

interface Message { role: 'user' | 'ai'; text: string; }

const QUICK = [
  "How are pods connected in production?",
  "Generate incident report",
  "Optimize payment-service",
  "Why is the cluster slow?",
  "Which pod will fail next?",
];

export function NLPChat({ nlpQuery }: { nlpQuery: (q: string) => Promise<any> }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const ask = async (q: string) => {
    if (!q.trim() || loading) return;
    setMessages(m => [...m, { role: 'user', text: q }]);
    setInput('');
    setLoading(true);
    try {
      const res = await nlpQuery(q);
      const md = (res.answer || '')
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        .replace(/\n/g, '<br/>');
      setMessages(m => [...m, { role: 'ai', text: md }]);
    } catch {
      setMessages(m => [...m, { role: 'ai', text: '⚠ Could not reach backend. Ensure the FastAPI server is running on port 8000.' }]);
    }
    setLoading(false);
  };

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 120px)', gap: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontFamily: 'var(--km-mono)', fontSize: 9, color: 'var(--km-muted)' }}>
        <MessageSquare size={14} />
        <span>Natural Language Query Interface · Ask any operational question about your cluster</span>
      </div>

      <div className="card" style={{ flex: 1, overflow: 'auto', padding: 16 }}>
        <div className="chat-area">
          {messages.length === 0 && !loading && (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--km-dim)' }}>
              <div style={{ fontSize: 11, fontFamily: 'var(--km-mono)' }}>Ask a question to begin analysis</div>
            </div>
          )}
          {messages.map((m, i) => (
            <div key={i} className={`chat-msg ${m.role}`}
              dangerouslySetInnerHTML={{ __html: m.text }}
            />
          ))}
          {loading && (
            <div style={{ fontSize: 12, color: 'var(--km-dim)', display: 'flex', gap: 4, alignItems: 'center' }}>
              <span className="pulse-dot blue pulse" style={{ width: 5, height: 5 }}/>
              <span className="pulse-dot blue pulse" style={{ width: 5, height: 5, animationDelay: '0.2s' }}/>
              <span className="pulse-dot blue pulse" style={{ width: 5, height: 5, animationDelay: '0.4s' }}/>
              AI agents analyzing...
            </div>
          )}
          <div ref={bottomRef}/>
        </div>
      </div>

      <div className="chat-input-area">
        <input className="chat-input" value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && ask(input)}
          placeholder="e.g. What's causing high memory usage? · Which pods can I scale down?"
          disabled={loading}
        />
        <button className="chat-send" onClick={() => ask(input)} disabled={loading || !input.trim()}>
          Ask <Send size={12}/>
        </button>
      </div>

      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {QUICK.map(q => (
          <button key={q} className="quick-ask" onClick={() => ask(q)}>
            {q}
          </button>
        ))}
      </div>
    </div>
  );
}
