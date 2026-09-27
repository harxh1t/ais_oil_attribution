import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCase } from '../../context/CaseContext';
import { Search, MapPin, Compass, FileText, Settings, X, HelpCircle } from 'lucide-react';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenShortcuts?: () => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({ isOpen, onClose, onOpenShortcuts }) => {
  const navigate = useNavigate();
  const { startForensicRun } = useCase();
  const [query, setQuery] = useState('');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        if (isOpen) onClose();
      }
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const actions = [
    {
      id: 'briefing',
      title: 'Go to Technical Briefing',
      category: 'Navigation',
      icon: MapPin,
      perform: () => { navigate('/'); onClose(); }
    },
    {
      id: 'investigate',
      title: 'Open Investigation Desk',
      category: 'Navigation',
      icon: Compass,
      perform: () => { navigate('/investigate'); onClose(); }
    },
    {
      id: 'report',
      title: 'View Attribution Report',
      category: 'Navigation',
      icon: FileText,
      perform: () => { navigate('/report'); onClose(); }
    },
    {
      id: 'workspace',
      title: 'Open 3D Hydrodynamic Workspace',
      category: 'Navigation',
      icon: Settings,
      perform: () => { navigate('/workspace'); onClose(); }
    },
    {
      id: 'run',
      title: 'Execute Lagrangian Attribution Pipeline',
      category: 'Pipeline Action',
      icon: Compass,
      perform: () => { startForensicRun(); navigate('/investigate'); onClose(); }
    },
    {
      id: 'shortcuts',
      title: 'View Keyboard Shortcuts',
      category: 'Help',
      icon: HelpCircle,
      perform: () => { onClose(); onOpenShortcuts?.(); }
    }
  ];

  const filtered = actions.filter(a =>
    a.title.toLowerCase().includes(query.toLowerCase()) ||
    a.category.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-24 px-4 bg-black/30 backdrop-blur-xs">
      <div className="w-full max-w-xl bg-[var(--surface-1)] border border-[var(--border-default)] rounded-[8px] shadow-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center px-4 py-3 border-b border-[var(--border-subtle)]">
          <Search className="w-4 h-4 text-[var(--text-3)] mr-2 shrink-0" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type a command or jump to page... (ESC to close)"
            className="w-full bg-transparent text-sm text-[var(--text-1)] placeholder-[var(--text-3)] focus:outline-none"
            autoFocus
          />
          <button onClick={onClose} className="p-1 rounded text-[var(--text-3)] hover:text-[var(--text-1)]">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="max-h-72 overflow-y-auto p-2">
          {filtered.length === 0 ? (
            <div className="p-4 text-center text-xs text-[var(--text-3)]">
              No matching commands.
            </div>
          ) : (
            filtered.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={item.perform}
                  className="w-full px-3 py-2.5 rounded-[6px] text-left flex items-center justify-between hover:bg-[var(--surface-2)] transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <Icon className="w-4 h-4 text-[var(--text-3)] group-hover:text-[var(--primary-600)]" />
                    <div>
                      <div className="text-xs font-semibold text-[var(--text-1)]">
                        {item.title}
                      </div>
                      <div className="text-[10px] text-[var(--text-3)]">
                        {item.category}
                      </div>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-[4px] bg-[var(--ocean-1)] text-white shadow-xs">Jump</span>
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
