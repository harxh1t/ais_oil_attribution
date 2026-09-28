import React from 'react';
import { X, Command } from 'lucide-react';

interface ShortcutsOverlayProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ShortcutsOverlay: React.FC<ShortcutsOverlayProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const shortcuts = [
    { key: '⌘ + K / Ctrl + K', desc: 'Open Command Palette' },
    { key: '1', desc: 'Jump to Technical Briefing' },
    { key: '2', desc: 'Jump to Investigation Desk' },
    { key: '3', desc: 'Jump to Attribution Report' },
    { key: '4', desc: 'Jump to 3D Hydrodynamic Workspace' },
    { key: '?', desc: 'Toggle Shortcuts Modal' },
    { key: 'ESC', desc: 'Close any active overlay' }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-xs">
      <div className="w-full max-w-md bg-[var(--surface-1)] border border-[var(--border-default)] rounded-[8px] p-6 shadow-lg">
        <div className="flex items-center justify-between pb-4 border-b border-[var(--border-subtle)]">
          <div className="flex items-center gap-2">
            <Command className="w-4 h-4 text-[var(--primary-600)]" />
            <h3 className="text-sm font-bold text-[var(--text-1)]">Keyboard Shortcuts</h3>
          </div>
          <button onClick={onClose} className="p-1 rounded text-[var(--text-3)] hover:text-[var(--text-1)]">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="mt-4 space-y-2.5">
          {shortcuts.map((s, idx) => (
            <div key={idx} className="flex items-center justify-between text-xs">
              <span className="text-[var(--text-2)]">{s.desc}</span>
              <kbd className="px-2 py-1 bg-[var(--ocean-1)] border border-[var(--ocean-2)] rounded-[4px] font-mono text-[11px] font-semibold text-white shadow-xs">
                {s.key}
              </kbd>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
