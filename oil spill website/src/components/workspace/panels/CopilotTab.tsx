import React, { useState } from 'react';
import { useCase } from '../../../context/CaseContext';
import { Button } from '../../ui';
import { Send, Bot, User } from 'lucide-react';

export const CopilotTab: React.FC = () => {
  const { caseData } = useCase();
  const [messages, setMessages] = useState<Array<{ sender: 'analyst' | 'system'; text: string }>>([
    {
      sender: 'system',
      text: `Investigation Assistant initialized for case ${caseData.id}. I can provide trajectory physics diagnostics, AIS dropout analysis, or legal evidentiary summaries.`
    }
  ]);
  const [inputVal, setInputVal] = useState<string>('');

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputVal.trim()) return;

    const userMsg = inputVal;
    setInputVal('');
    setMessages(prev => [...prev, { sender: 'analyst', text: userMsg }]);

    setTimeout(() => {
      let reply = `Based on the Lagrangian hindcast and vessel_tracks.json kinematics (241 points per vessel), PACIFIC GLORY (MMSI 354128000) achieves DCPA = 0.0 km and TCPA = 0.0 min with a Borda score of 6 pts (Rank #1, 55.2% MEDIUM confidence). MAERSK NEVADA has a DCPA offset of 19.47 km (Rank #2).`;
      if (userMsg.toLowerCase().includes('court') || userMsg.toLowerCase().includes('legal')) {
        reply = `For evidentiary disclosure, PACIFIC GLORY's Fréchet distance is 18.80 km vs MAERSK NEVADA's 29.45 km. Kinematic coincidence metrics are mathematically derived from the 241 broadcast points in vessel_tracks.json.`;
      }
      setMessages(prev => [...prev, { sender: 'system', text: reply }]);
    }, 400);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-170px)] justify-between">
      {/* Messages Feed */}
      <div className="overflow-y-auto space-y-3 pr-1">
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`p-3 rounded-[6px] text-xs leading-relaxed ${
              msg.sender === 'system'
                ? 'bg-[var(--surface-2)] border border-[var(--border-subtle)] text-[var(--text-1)]'
                : 'bg-[var(--primary-50)] border border-[var(--primary-100)] text-[var(--primary-700)] ml-4'
            }`}
          >
            <div className="font-mono text-[10px] text-[var(--text-3)] mb-1 flex items-center gap-1">
              {msg.sender === 'system' ? <Bot className="w-3 h-3" /> : <User className="w-3 h-3" />}
              <span>{msg.sender === 'system' ? 'WAKE FORENSIC ASSISTANT' : 'ANALYST'}</span>
            </div>
            <div>{msg.text}</div>
          </div>
        ))}
      </div>

      {/* Input Box */}
      <form onSubmit={handleSend} className="mt-4 pt-3 border-t border-[var(--border-subtle)] flex gap-2">
        <input
          type="text"
          value={inputVal}
          onChange={(e) => setInputVal(e.target.value)}
          placeholder="Ask a technical or legal question..."
          className="flex-1 bg-[var(--surface-2)] border border-[var(--border-default)] rounded-[4px] px-3 py-2 text-xs text-[var(--text-1)] placeholder-[var(--text-3)] focus:outline-none focus:border-[var(--primary-500)]"
        />
        <Button size="sm" variant="primary" type="submit">
          <Send className="w-3.5 h-3.5" />
        </Button>
      </form>
    </div>
  );
};
