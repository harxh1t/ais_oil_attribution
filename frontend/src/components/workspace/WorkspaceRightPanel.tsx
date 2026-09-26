import React, { useState } from 'react';
import {
  MessageSquare,
  Network,
  FlaskConical,
  FileText,
  ChevronRight,
  X,
} from 'lucide-react';
import { cn } from '../../utils/cn';
import { CopilotTab } from './panels/CopilotTab';
import { EvidenceGraphTab } from './panels/EvidenceGraphTab';
import { ScenarioLabTab } from './panels/ScenarioLabTab';
import { DetailsTab } from './panels/DetailsTab';
import { ScenarioDiff } from '../../utils/copilotEngine';

export interface WorkspaceRightPanelProps {
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  onCloseDrawer?: () => void;
  onFlyTo?: (target: 'slick' | 'release' | string) => void;
}

export type WorkbenchTabType = 'copilot' | 'evidence' | 'scenario' | 'details';

export const WorkspaceRightPanel: React.FC<WorkspaceRightPanelProps> = ({
  isCollapsed,
  onToggleCollapse,
  onCloseDrawer,
  onFlyTo,
}) => {
  const [activeTab, setActiveTab] = useState<WorkbenchTabType>('copilot');
  const [scenarioDiff, setScenarioDiff] = useState<ScenarioDiff | null>(null);

  const tabs: { id: WorkbenchTabType; label: string; icon: React.ReactNode }[] = [
    { id: 'copilot', label: 'Copilot', icon: <MessageSquare className="w-3.5 h-3.5" /> },
    { id: 'evidence', label: 'Evidence Graph', icon: <Network className="w-3.5 h-3.5" /> },
    { id: 'scenario', label: 'Scenario Lab', icon: <FlaskConical className="w-3.5 h-3.5" /> },
    { id: 'details', label: 'Details', icon: <FileText className="w-3.5 h-3.5" /> },
  ];

  return (
    <aside className="w-full h-full flex flex-col justify-between bg-[#0b101b] border-l border-neutral-800 select-none overflow-hidden text-xs">
      {/* Top Header with Tab Strip & Collapse / Close Controls */}
      <div className="border-b border-neutral-800 bg-[#0d1322] shrink-0">
        <div className="flex items-center justify-between px-3 py-2">
          <div className="flex items-center gap-1.5">
            {onToggleCollapse && (
              <button
                type="button"
                onClick={onToggleCollapse}
                className="p-1 rounded text-neutral-400 hover:text-white hover:bg-neutral-800 cursor-pointer transition-colors"
                title="Collapse Panel"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            )}
            <span className="font-semibold text-xs text-neutral-200 tracking-wider uppercase font-mono">
              Forensic Workbench
            </span>
          </div>

          {onCloseDrawer && (
            <button
              type="button"
              onClick={onCloseDrawer}
              className="p-1 rounded text-neutral-400 hover:text-white hover:bg-neutral-800 cursor-pointer transition-colors"
              aria-label="Close workbench drawer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Tab Strip */}
        <div className="flex items-center gap-1 px-2.5 pb-2 overflow-x-auto">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-mono transition-colors whitespace-nowrap cursor-pointer',
                  isActive
                    ? 'bg-neutral-800 text-violet-300 font-semibold border border-neutral-700 shadow-sm'
                    : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/60'
                )}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Panels Content (Internally Scrollable) */}
      <div className="flex-1 min-h-0 relative overflow-hidden">
        {activeTab === 'copilot' && (
          <CopilotTab
            scenarioDiff={scenarioDiff}
            onOpenScenarioTab={() => setActiveTab('scenario')}
          />
        )}

        {activeTab === 'evidence' && <EvidenceGraphTab onFlyTo={onFlyTo} />}

        {activeTab === 'scenario' && (
          <ScenarioLabTab onScenarioChange={(diff) => setScenarioDiff(diff)} />
        )}

        {activeTab === 'details' && <DetailsTab />}
      </div>

      {/* Slim Panel Footer */}
      <div className="px-3 py-2 border-t border-neutral-800 bg-[#090e18] flex items-center justify-between text-neutral-500 text-[12px] font-mono shrink-0">
        <span>Attribution Decision Support</span>
        <span className="text-violet-400/80">v1.4.0 · Malibu</span>
      </div>
    </aside>
  );
};
