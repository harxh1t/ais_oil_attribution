import React, { useEffect } from 'react';
import { X, Keyboard, Command } from 'lucide-react';

interface ShortcutsOverlayProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ShortcutsOverlay: React.FC<ShortcutsOverlayProps> = ({ isOpen, onClose }) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const shortcutGroups = [
    {
      title: 'Global Navigation & Tools',
      shortcuts: [
        { keys: ['⌘', 'K'], desc: 'Open Command Palette' },
        { keys: ['?'], desc: 'Toggle Keyboard Shortcuts Overlay' },
        { keys: ['Esc'], desc: 'Close dialogs, palettes, and popovers' },
      ],
    },
    {
      title: '3D Spatial Reconstruction & Timeline',
      shortcuts: [
        { keys: ['Space'], desc: 'Play / Pause chronological simulation' },
        { keys: ['←', '→'], desc: 'Step timeline cursor -1m / +1m' },
        { keys: ['Shift', '←', '→'], desc: 'Step timeline cursor -10m / +10m' },
        { keys: ['1', '–', '4'], desc: 'Switch camera preset (Iso, Nadir, Release, Follow)' },
        { keys: ['R'], desc: 'Reset simulation playhead to 16:40Z Release Epoch' },
      ],
    },
    {
      title: 'Candidate Vessels & Layers',
      shortcuts: [
        { keys: ['V', '1', '–', '6'], desc: 'Select candidate vessel 1 through 6' },
        { keys: ['L'], desc: 'Toggle Left Layers Rail / Drawer' },
        { keys: ['W'], desc: 'Toggle Right Workbench Panel' },
      ],
    },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-[#0b101b] border border-neutral-700 rounded-xl shadow-2xl overflow-hidden font-sans"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-800 bg-[#0d1322]">
          <div className="flex items-center gap-2">
            <Keyboard className="w-4 h-4 text-violet-400" />
            <h3 className="text-sm font-semibold text-neutral-100 font-mono tracking-wide uppercase">
              Keyboard Shortcuts
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Shortcuts List */}
        <div className="p-4 space-y-4 max-h-[70vh] overflow-y-auto">
          {shortcutGroups.map((group, gIdx) => (
            <div key={gIdx} className="space-y-2">
              <div className="text-xs font-mono font-semibold text-neutral-400 uppercase tracking-wider">
                {group.title}
              </div>
              <div className="space-y-1.5">
                {group.shortcuts.map((s, sIdx) => (
                  <div
                    key={sIdx}
                    className="flex items-center justify-between p-2 rounded bg-[#121829] border border-neutral-800/80 text-xs"
                  >
                    <span className="text-neutral-300">{s.desc}</span>
                    <div className="flex items-center gap-1">
                      {s.keys.map((k, kIdx) => (
                        <kbd
                          key={kIdx}
                          className="px-1.5 py-0.5 rounded bg-neutral-800 border border-neutral-700 text-neutral-200 font-mono text-xs shadow-xs"
                        >
                          {k}
                        </kbd>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-4 py-2.5 bg-[#090e18] border-t border-neutral-800 text-xs font-mono text-neutral-400 text-right">
          Press <kbd className="px-1 py-0.5 rounded bg-neutral-800 text-neutral-300">Esc</kbd> to exit
        </div>
      </div>
    </div>
  );
};
