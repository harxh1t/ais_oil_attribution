import React, { useState, useRef, useEffect } from 'react';
import { ATTRIBUTION_IMAGES, AttributionImage } from '../../data/attributionImages';
import { Search, X } from 'lucide-react';
import { Button } from '../ui';

interface AttributionImageDropdownProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectAndRun: (image: AttributionImage) => void;
  selectedImageId?: number;
  isRunning?: boolean;
}

export const AttributionImageDropdown: React.FC<AttributionImageDropdownProps> = ({
  isOpen,
  onClose,
  onSelectAndRun,
  selectedImageId = 1,
  isRunning = false,
}) => {
  const [search, setSearch] = useState<string>('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const filteredImages = ATTRIBUTION_IMAGES.filter((img) => {
    return (
      img.name.toLowerCase().includes(search.toLowerCase()) ||
      img.sensor.toLowerCase().includes(search.toLowerCase()) ||
      img.satellite.toLowerCase().includes(search.toLowerCase()) ||
      img.code.toLowerCase().includes(search.toLowerCase())
    );
  });

  return (
    <div
      ref={dropdownRef}
      className="absolute right-0 top-full mt-2.5 w-[360px] sm:w-[440px] max-w-[calc(100vw-2rem)] bg-[var(--surface-1)] border border-[var(--border-default)] rounded-[10px] shadow-[0_12px_32px_rgba(0,40,60,0.22)] z-50 overflow-hidden flex flex-col animate-in fade-in slide-in-from-top-2 duration-150"
    >
      {/* Header */}
      <div className="p-3.5 sm:p-4 bg-[var(--surface-1)] border-b border-[var(--border-subtle)]">
        <div className="flex items-center justify-between gap-2 mb-2.5">
          <h3 className="text-xs sm:text-sm font-bold text-[var(--text-1)]">
            Select Attribution Target Image
          </h3>
          <div className="flex items-center gap-1.5">
            <span className="px-2 py-0.5 rounded-[4px] bg-[var(--surface-2)] border border-[var(--border-subtle)] text-[10px] font-mono font-bold text-[var(--ocean-1)]">
              22 IMAGES
            </span>
            <button
              onClick={onClose}
              className="p-1 rounded text-[var(--text-3)] hover:text-[var(--text-1)] hover:bg-[var(--surface-2)] transition-colors cursor-pointer"
              aria-label="Close"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Search Input */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--text-3)]" />
          <input
            type="text"
            placeholder="Search .tif images (e.g. 00060.tif, 00120.tif)..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 bg-[var(--surface-2)] border border-[var(--border-subtle)] focus:border-[var(--ocean-2)] focus:ring-1 focus:ring-[var(--ocean-2)] rounded-[6px] text-xs text-[var(--text-1)] placeholder-[var(--text-3)] font-mono outline-none"
            autoFocus
          />
        </div>
      </div>

      {/* List of Images (Scrollable) */}
      <div className="max-h-[360px] overflow-y-auto divide-y divide-[var(--border-subtle)] bg-white/40">
        {filteredImages.length === 0 ? (
          <div className="p-6 text-center text-xs text-[var(--text-3)] font-mono">
            No satellite frames matching &quot;{search}&quot;
          </div>
        ) : (
          filteredImages.map((img) => {
            const isSelected = img.id === selectedImageId;
            return (
              <div
                key={img.id}
                onClick={() => onSelectAndRun(img)}
                className={`p-2.5 sm:p-3 flex items-center gap-3 transition-colors cursor-pointer group hover:bg-[var(--surface-2)]/80 ${
                  isSelected ? 'bg-[var(--surface-2)]' : ''
                }`}
              >
                {/* Frame Index / Number badge */}
                <div className="shrink-0 w-8 h-8 rounded-[6px] bg-[var(--surface-2)] border border-[var(--border-subtle)] flex items-center justify-center font-mono text-[11px] font-bold text-[var(--ocean-1)] group-hover:border-[var(--ocean-2)] transition-colors">
                  #{img.id}
                </div>

                {/* Details (No Image) */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-xs font-bold text-[var(--text-1)] truncate block group-hover:text-[var(--ocean-1)] transition-colors">
                      {img.name}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-[10px] text-[var(--text-3)] font-mono truncate">
                    <span>{img.timestamp}</span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer */}
      <div className="p-2.5 sm:p-3 bg-[var(--surface-1)] border-t border-[var(--border-subtle)] flex items-center justify-between gap-2">
        <span className="text-[10px] font-mono text-[var(--text-3)] truncate">
          Click any frame to initiate attribution
        </span>
        <Button
          size="sm"
          variant="primary"
          disabled={isRunning}
          onClick={() => {
            const current = ATTRIBUTION_IMAGES.find((i) => i.id === selectedImageId) || ATTRIBUTION_IMAGES[0];
            onSelectAndRun(current);
          }}
          className="text-xs py-1 h-auto"
        >
          {isRunning ? 'Simulating...' : 'Run Selected'}
        </Button>
      </div>
    </div>
  );
};
