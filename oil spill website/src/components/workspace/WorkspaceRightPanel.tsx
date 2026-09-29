import React, { useState } from 'react';
import { EvidenceGraphTab } from './panels/EvidenceGraphTab';
import { CopilotTab } from './panels/CopilotTab';
import { DetailsTab } from './panels/DetailsTab';
import { ChevronRight, ChevronLeft } from 'lucide-react';

export const WorkspaceRightPanel: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'evidence' | 'copilot' | 'details'>('evidence');
  const [isCollapsed, setIsCollapsed] = useState<boolean>(false);

  const toggleCollapse = (collapsed: boolean) => {
    setIsCollapsed(collapsed);
    requestAnimationFrame(() => {
      window.dispatchEvent(new Event('resize'));
    });
  };

  if (isCollapsed) {
    return (
      <div className="w-10 bg-[var(--surface-1)] border-l border-[var(--border-default)] flex flex-col items-center py-4 shrink-0 z-10">
        <button
          onClick={() => toggleCollapse(false)}
          className="p-1.5 rounded-[4px] hover:bg-[var(--surface-2)] text-[var(--text-2)]"
          title="Expand Panel"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
      </div>
    );
  }

  return (
    <div className="w-96 bg-[var(--surface-1)] border-l border-[var(--border-default)] flex flex-col justify-between shrink-0 z-10 overflow-hidden">
      {/* Tab Navigation Header */}
      <div className="h-12 border-b border-[var(--border-default)] flex items-center justify-between px-2 bg-[var(--surface-2)] shrink-0">
        <div className="flex items-center space-x-1">
          <button
            onClick={() => setActiveTab('evidence')}
            className={`px-3 py-1.5 rounded-[4px] text-xs font-medium transition-colors cursor-pointer ${
              activeTab === 'evidence'
                ? 'bg-[var(--ocean-1)] text-white shadow-xs font-semibold'
                : 'text-[var(--text-1)] hover:bg-[var(--surface-3)]'
            }`}
          >
            Evidence
          </button>
          <button
            onClick={() => setActiveTab('copilot')}
            className={`px-3 py-1.5 rounded-[4px] text-xs font-medium transition-colors cursor-pointer ${
              activeTab === 'copilot'
                ? 'bg-[var(--ocean-1)] text-white shadow-xs font-semibold'
                : 'text-[var(--text-1)] hover:bg-[var(--surface-3)]'
            }`}
          >
            Copilot
          </button>
          <button
            onClick={() => setActiveTab('details')}
            className={`px-3 py-1.5 rounded-[4px] text-xs font-medium transition-colors cursor-pointer ${
              activeTab === 'details'
                ? 'bg-[var(--ocean-1)] text-white shadow-xs font-semibold'
                : 'text-[var(--text-1)] hover:bg-[var(--surface-3)]'
            }`}
          >
            Vessel
          </button>
        </div>

        <button
          onClick={() => toggleCollapse(true)}
          className="p-1 rounded-[4px] hover:bg-[var(--surface-3)] text-[var(--text-3)] cursor-pointer"
          title="Collapse Panel"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Tab Body */}
      <div className="flex-1 overflow-y-auto p-4">
        {activeTab === 'evidence' && <EvidenceGraphTab />}
        {activeTab === 'copilot' && <CopilotTab />}
        {activeTab === 'details' && <DetailsTab />}
      </div>
    </div>
  );
};
