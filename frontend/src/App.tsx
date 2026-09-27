/**
 * WAKE — Maritime Oil-Spill Vessel Attribution System
 * Application Entry & Route Registration
 */

import React, { useState, useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { CaseProvider } from './context/CaseContext';
import { Header } from './components/shared/Header';
import { Footer } from './components/shared/Footer';
import { CommandPalette } from './components/shared/CommandPalette';
import { ShortcutsOverlay } from './components/shared/ShortcutsOverlay';
import { Intro } from './pages/Intro';
import { Investigate } from './pages/Investigate';
import { Report } from './pages/Report';
import { Workspace } from './pages/Workspace';

// Scroll to top automatically on route changes
function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, [pathname]);

  return null;
}

function MainLayout() {
  const location = useLocation();
  const isWorkspace = location.pathname === '/workspace' || location.pathname === '/3d';
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);

  // Global Cmd/Ctrl+K keyboard listener and '?' shortcuts trigger
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing inside input, textarea, or select
      const activeTag = (document.activeElement?.tagName || '').toLowerCase();
      const isInput = activeTag === 'input' || activeTag === 'textarea' || activeTag === 'select';

      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen((prev) => !prev);
        return;
      }

      if (!isInput && e.key === '?') {
        e.preventDefault();
        setIsShortcutsOpen((prev) => !prev);
        return;
      }
    };

    const handleOpenPaletteEvent = () => setIsCommandPaletteOpen(true);
    const handleOpenShortcutsEvent = () => setIsShortcutsOpen(true);

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('wake:open-command-palette', handleOpenPaletteEvent);
    window.addEventListener('wake:open-shortcuts', handleOpenShortcutsEvent);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('wake:open-command-palette', handleOpenPaletteEvent);
      window.removeEventListener('wake:open-shortcuts', handleOpenShortcutsEvent);
    };
  }, []);

  return (
    <div
      className={`flex flex-col bg-[#05040F] text-[#C0BCDB] antialiased selection:bg-[#7C3AED]/40 selection:text-white ${
        isWorkspace ? 'h-screen max-h-screen overflow-hidden' : 'min-h-screen'
      }`}
    >
      <ScrollToTop />

      {/* Global Sticky Header (64px) */}
      <Header />

      {/* Core Page Content */}
      <main className={`flex-1 w-full ${isWorkspace ? 'overflow-hidden flex flex-col min-h-0' : 'pb-8'}`}>
        <Routes>
          <Route path="/" element={<Intro />} />
          <Route path="/investigate" element={<Investigate />} />
          <Route path="/report" element={<Report />} />
          <Route path="/workspace" element={<Workspace />} />
          <Route path="/3d" element={<Navigate to="/workspace" replace />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      {/* Global Forensic Disclaimer Footer (Hidden on /workspace) */}
      <Footer />

      {/* Quick-Jump Command Palette (Cmd/Ctrl+K keyboard-only or icon button) */}
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        onOpenShortcuts={() => setIsShortcutsOpen(true)}
      />

      {/* Global Keyboard Shortcuts Overlay ('?' key) */}
      <ShortcutsOverlay
        isOpen={isShortcutsOpen}
        onClose={() => setIsShortcutsOpen(false)}
      />
    </div>
  );
}

export default function App() {
  return (
    <CaseProvider>
      <HashRouter>
        <MainLayout />
      </HashRouter>
    </CaseProvider>
  );
}
