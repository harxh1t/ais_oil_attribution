import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  Send,
  AlertTriangle,
  RefreshCw,
  GitBranch,
  ShieldAlert,
  ChevronRight,
} from 'lucide-react';
import { useCase } from '../../../context/CaseContext';
import {
  askCopilot,
  SUGGESTED_QUESTIONS,
  CopilotResponse,
  EvidenceChip,
  ScenarioDiff,
} from '../../../utils/copilotEngine';

interface Message {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  chips?: EvidenceChip[];
  timestamp: string;
  isStreaming?: boolean;
}

interface CopilotTabProps {
  scenarioDiff: ScenarioDiff | null;
  onOpenScenarioTab?: () => void;
}

export const CopilotTab: React.FC<CopilotTabProps> = ({
  scenarioDiff,
  onOpenScenarioTab,
}) => {
  const { caseData } = useCase();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'init-1',
      sender: 'assistant',
      text:
        'Forensic Case Assistant active for Malibu SAR incident. Ask about attribution rationale, transponder gaps, hydrodynamic sensitivity, or candidate kinematics.',
      chips: [
        { type: 'derived', label: 'Borda 18/20' },
        { type: 'inferred', label: 'OpenDrift Hindcast' },
        { type: 'observed', label: 'Sentinel-1 SAR' },
      ],
      timestamp: '01:50:00 UTC',
    },
  ]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const handleSendMessage = (textToSend: string) => {
    if (!textToSend.trim() || isTyping) return;

    const userMsg: Message = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: textToSend.trim(),
      timestamp: new Date().toISOString().substring(11, 19) + ' UTC',
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputText('');
    setIsTyping(true);

    // Compute copilot answer
    const response: CopilotResponse = askCopilot(textToSend, caseData, scenarioDiff);

    // Typing effect simulation
    const fullText = response.answer;
    let charIndex = 0;
    const assistantMsgId = response.id;

    const partialMsg: Message = {
      id: assistantMsgId,
      sender: 'assistant',
      text: '',
      chips: response.chips,
      timestamp: response.timestamp,
      isStreaming: true,
    };

    setMessages((prev) => [...prev, partialMsg]);

    const interval = setInterval(() => {
      charIndex += 4;
      if (charIndex >= fullText.length) {
        clearInterval(interval);
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantMsgId
              ? { ...m, text: fullText, isStreaming: false }
              : m
          )
        );
        setIsTyping(false);
      } else {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantMsgId
              ? { ...m, text: fullText.substring(0, charIndex) }
              : m
          )
        );
      }
    }, 18);
  };

  const getChipStyle = (type: EvidenceChip['type']) => {
    switch (type) {
      case 'observed':
        return 'bg-teal-500/10 text-teal-300 border-teal-500/30';
      case 'derived':
        return 'bg-amber-500/10 text-amber-300 border-amber-500/30';
      case 'inferred':
        return 'bg-pink-500/10 text-pink-300 border-pink-500/30';
      case 'attribution':
        return 'bg-violet-500/10 text-violet-300 border-violet-500/30';
      default:
        return 'bg-neutral-800 text-neutral-300 border-neutral-700';
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#0b101b] text-neutral-200">
      {/* Scrollable conversation pane */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-4 py-4 space-y-4 font-sans text-[13px] leading-relaxed select-text"
      >
        {/* Contradiction Detection Card */}
        <div className="rounded-lg border border-red-500/40 bg-red-950/20 p-3.5 shadow-sm">
          <div className="flex items-center gap-2 text-red-400 font-medium text-[13px] mb-1.5">
            <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
            <span>Contradiction Detected · MV Pacific Lantern</span>
          </div>
          <p className="text-neutral-300 text-xs leading-normal">
            It has the best TCPA (9 min) but a 38-minute AIS gap covering the inferred release
            window (16:25–17:03 UTC). Proximity evidence is strong while observational continuity
            is weak. This may be a dropout or a coverage gap.
          </p>
          <div className="mt-2.5 pt-2 border-t border-red-500/20 flex items-center justify-between text-xs">
            <span className="font-mono text-neutral-400">TCPA 9m · Continuity 62%</span>
            <span className="text-red-400 font-mono flex items-center gap-1">
              <ShieldAlert className="w-3.5 h-3.5" /> High Divergence
            </span>
          </div>
        </div>

        {/* What Changed? Diff Card (Scenario Lab updates) */}
        {scenarioDiff && (
          <div className="rounded-lg border border-violet-500/40 bg-violet-950/20 p-3.5 animate-fadeIn">
            <div className="flex items-center justify-between text-violet-300 font-medium text-[13px] mb-1">
              <span className="flex items-center gap-1.5">
                <GitBranch className="w-4 h-4 text-violet-400" />
                <span>What Changed? (Scenario Perturbation)</span>
              </span>
              <span className="font-mono text-xs px-2 py-0.5 rounded bg-violet-500/20 text-violet-300 border border-violet-500/30">
                {scenarioDiff.parameter}
              </span>
            </div>
            <div className="text-xs text-neutral-300 space-y-1 mt-2">
              <div className="flex justify-between items-center">
                <span>Top Candidate:</span>
                <span className="font-semibold text-neutral-100 font-mono">
                  {scenarioDiff.leadVessel} ({scenarioDiff.leadScore} pts)
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span>Runner-up:</span>
                <span className="text-neutral-400 font-mono">
                  {scenarioDiff.runnerUp} ({scenarioDiff.runnerUpScore} pts)
                </span>
              </div>
              <div className="flex justify-between items-center text-xs pt-1 border-t border-violet-500/20">
                <span>Standing Delta:</span>
                <span
                  className={`font-mono font-medium ${
                    scenarioDiff.isRankSwap ? 'text-amber-400 font-bold' : 'text-neutral-300'
                  }`}
                >
                  {scenarioDiff.isRankSwap ? '⚠️ RANK FLIP: ' : ''}
                  {scenarioDiff.deltaText}
                </span>
              </div>
            </div>
            {onOpenScenarioTab && (
              <button
                type="button"
                onClick={onOpenScenarioTab}
                className="mt-2.5 w-full flex items-center justify-center gap-1 py-1 px-2 rounded bg-violet-500/20 hover:bg-violet-500/30 text-violet-200 text-xs font-mono transition-colors"
              >
                Inspect in Scenario Lab <ChevronRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}

        {/* Message stream */}
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex flex-col ${
              msg.sender === 'user' ? 'items-end' : 'items-start'
            }`}
          >
            <div className="text-[12px] font-mono text-neutral-500 mb-1 px-1 flex items-center gap-1.5">
              {msg.sender === 'assistant' ? (
                <>
                  <Sparkles className="w-3 h-3 text-violet-400" />
                  <span>WAKE Copilot</span>
                </>
              ) : (
                <span>Investigator</span>
              )}
              <span>·</span>
              <span>{msg.timestamp}</span>
            </div>

            <div
              className={`max-w-[94%] rounded-xl px-3.5 py-2.5 text-[13px] leading-relaxed ${
                msg.sender === 'user'
                  ? 'bg-violet-600 text-white shadow-md'
                  : 'bg-[#151c2e] text-neutral-200 border border-neutral-800'
              }`}
            >
              <p className="whitespace-pre-wrap">
                {msg.text}
                {msg.isStreaming && (
                  <span className="inline-block w-1.5 h-4 ml-1 bg-violet-400 animate-pulse align-middle" />
                )}
              </p>

              {msg.chips && msg.chips.length > 0 && !msg.isStreaming && (
                <div className="mt-2.5 pt-2 border-t border-neutral-700/50 flex flex-wrap gap-1.5">
                  {msg.chips.map((chip, idx) => (
                    <span
                      key={idx}
                      className={`text-xs font-mono px-2 py-0.5 rounded border ${getChipStyle(
                        chip.type
                      )}`}
                    >
                      {chip.type.toUpperCase()}: {chip.label}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Suggested Chips */}
      <div className="px-3.5 py-2 border-t border-neutral-800/80 bg-[#0d1322]">
        <div className="text-[12px] font-mono text-neutral-400 mb-1.5 flex items-center gap-1">
          <span>SUGGESTED FORENSIC QUERIES:</span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {SUGGESTED_QUESTIONS.map((q, idx) => (
            <button
              key={idx}
              type="button"
              disabled={isTyping}
              onClick={() => handleSendMessage(q)}
              className="text-xs text-neutral-300 hover:text-white bg-[#1a233a] hover:bg-violet-900/40 border border-neutral-700/60 hover:border-violet-500/50 rounded-md px-2.5 py-1 transition-colors text-left disabled:opacity-50"
            >
              {q}
            </button>
          ))}
        </div>
      </div>

      {/* Free text prompt input */}
      <div className="p-3 border-t border-neutral-800 bg-[#090e18]">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage(inputText);
          }}
          className="flex items-center gap-2"
        >
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Ask Copilot about evidence, ranking, or AIS continuity..."
            disabled={isTyping}
            className="flex-1 bg-[#131b2e] border border-neutral-700 rounded-lg px-3 py-2 text-[13px] text-neutral-200 placeholder-neutral-500 focus:outline-none focus:border-violet-500 transition-colors disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!inputText.trim() || isTyping}
            className="p-2 rounded-lg bg-violet-600 hover:bg-violet-500 disabled:bg-neutral-800 text-white disabled:text-neutral-500 transition-colors shrink-0"
            title="Send prompt"
          >
            {isTyping ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
