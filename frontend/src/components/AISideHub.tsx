import React, { useState } from 'react';
import { Send, Bot, Sparkles, AlertCircle, ChevronRight, Brain, Cpu, MessageSquare, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { AgentInsight } from '../hooks/useCluster';

interface AISideHubProps {
  agents: AgentInsight[];
  onQuery: (q: string) => Promise<any>;
}

export const AISideHub: React.FC<AISideHubProps> = ({ agents, onQuery }) => {
  const [query, setQuery] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [chat, setChat] = useState<{ type: 'user' | 'ai', text: string }[]>([]);

  const handleSend = async () => {
    if (!query.trim() || isProcessing) return;
    
    const userQuery = query;
    setQuery('');
    setChat(prev => [...prev, { type: 'user', text: userQuery }]);
    setIsProcessing(true);

    try {
      const result = await onQuery(userQuery);
      setChat(prev => [...prev, { type: 'ai', text: result.answer }]);
    } catch {
      setChat(prev => [...prev, { type: 'ai', text: "Error: Cognitive link failed." }]);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <aside className="ai-side-hub">
      <div className="hub-header">
        <div className="hub-title">
          <Brain size={14} style={{ marginRight: 8, color: 'var(--km-accent)' }} />
          <span>COGNITIVE HUB</span>
        </div>
        <div className="hub-status">ONLINE</div>
      </div>

      <div className="hub-content">
        <div className="reasoning-feed">
          <div className="section-label">ACTIVE ENSEMBLE REASONING</div>
          {agents.filter(a => a.status !== 'INFO').map(a => (
            <div key={a.agent} className={`feed-item ${a.status.toLowerCase() === 'critical' ? 'alert' : ''}`}>
              <div className="feed-item-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span>{a.icon}</span>
                  <span>{a.agent.toUpperCase()}</span>
                </div>
                <span>{(a.confidence * 100).toFixed(0)}%</span>
              </div>
              <div className="feed-item-body">{a.finding}</div>
              <div style={{ height: 1, background: 'var(--km-border)', margin: '4px 0' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                 <span style={{ fontFamily: 'var(--km-mono)', fontSize: 8, color: 'var(--km-dim)' }}>DOMAIN: {a.domain}</span>
                 <Info size={10} color="var(--km-dim)" />
              </div>
            </div>
          ))}
          {agents.filter(a => a.status !== 'INFO').length === 0 && (
            <div style={{ textAlign: 'center', padding: 20, border: '1px solid var(--km-border)', borderRadius: 8, background: 'var(--km-surface-alt)' }}>
              <div style={{ fontFamily: 'var(--km-mono)', fontSize: 9, color: 'var(--km-dim)' }}>ALL AGENTS NOMINAL</div>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
           <div className="section-label">TRUST CALIBRATION</div>
           <div style={{ background: 'var(--km-surface-alt)', border: '1px solid var(--km-border)', borderRadius: 8, padding: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                 <span style={{ fontSize: 10, color: 'var(--km-muted)' }}>ENSEMBLE TRUST</span>
                 <span style={{ fontSize: 10, fontFamily: 'var(--km-mono)', color: 'var(--km-healthy)' }}>98.4%</span>
              </div>
              <div style={{ height: 2, background: 'var(--km-border)', borderRadius: 1 }}>
                 <div style={{ height: '100%', width: '98.4%', background: 'var(--km-healthy)' }} />
              </div>
           </div>
        </div>
      </div>

      <div className="hub-chat">
        <div className="chat-window">
          {chat.length === 0 && (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, opacity: 0.4 }}>
               <MessageSquare size={32} />
               <div style={{ fontFamily: 'var(--km-mono)', fontSize: 9 }}>READY FOR INQUIRY</div>
            </div>
          )}
          <AnimatePresence>
            {chat.map((msg, i) => (
              <motion.div 
                key={i}
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                className={`chat-bubble ${msg.type}`}
              >
                {msg.text}
              </motion.div>
            ))}
          </AnimatePresence>
          {isProcessing && (
            <div className="chat-bubble ai">
              <Sparkles size={12} className="rotating" style={{ marginRight: 8 }} />
              Reasoning...
            </div>
          )}
        </div>
        
        <div className="chat-input-box">
          <input 
            className="chat-input"
            type="text" 
            placeholder="Ask infrastructure..." 
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSend()}
          />
          <button className="chat-send" onClick={handleSend} disabled={isProcessing}>
            <Send size={14} />
          </button>
        </div>
      </div>
    </aside>
  );
};
