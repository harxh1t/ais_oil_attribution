import React, { useState, useEffect } from 'react';
import { Button } from '../ui';
import { Database, X, Lock, User, Eye, EyeOff, CheckCircle2, ShieldCheck } from 'lucide-react';

interface CdsLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess?: (account: string) => void;
}

export const CdsLoginModal: React.FC<CdsLoginModalProps> = ({
  isOpen,
  onClose,
  onLoginSuccess
}) => {
  const [account, setAccount] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [rememberMe, setRememberMe] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [connectedUser, setConnectedUser] = useState<string | null>(null);

  // Load existing session if present
  useEffect(() => {
    const saved = localStorage.getItem('cds_auth_session');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.account) {
          setConnectedUser(parsed.account);
          setAccount(parsed.account);
        }
      } catch {
        // ignore parse error
      }
    }
  }, []);

  if (!isOpen) return null;

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!account.trim()) {
      setError('Please enter your CDS account username or email.');
      return;
    }

    if (!password.trim()) {
      setError('Please enter your CDS password or API key.');
      return;
    }

    setIsLoading(true);

    // Simulate authentication with ECMWF / Copernicus CDS endpoint
    setTimeout(() => {
      setIsLoading(false);
      setConnectedUser(account);

      if (rememberMe) {
        localStorage.setItem(
          'cds_auth_session',
          JSON.stringify({ account: account.trim(), timestamp: new Date().toISOString() })
        );
      }

      if (onLoginSuccess) {
        onLoginSuccess(account);
      }

      onClose();
    }, 900);
  };

  const handleDisconnect = () => {
    localStorage.removeItem('cds_auth_session');
    setConnectedUser(null);
    setPassword('');
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-md bg-[var(--surface-1)] border border-[var(--border-default)] rounded-[10px] p-6 shadow-2xl relative">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[var(--border-subtle)]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-[6px] bg-[var(--ocean-1)] flex items-center justify-center text-white shadow-xs">
              <Database className="w-4 h-4 text-[var(--ocean-4)]" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[var(--text-1)]">
                Copernicus CDS Login
              </h3>
              <p className="text-[11px] text-[var(--text-3)] font-mono">
                Climate Data Store API Gateway
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-[var(--text-3)] hover:text-[var(--text-1)] hover:bg-[var(--surface-2)] transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {connectedUser ? (
          /* Logged In State */
          <div className="py-6 space-y-4">
            <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-[8px] flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 mt-0.5 shrink-0" />
              <div>
                <h4 className="text-sm font-bold text-emerald-800">
                  Authenticated with CDS
                </h4>
                <p className="text-xs text-emerald-700 mt-0.5">
                  Logged in as <span className="font-mono font-semibold">{connectedUser}</span>
                </p>
                <div className="mt-2 text-[11px] text-emerald-700/80 font-mono flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  ERA5 &amp; CMEMS reanalysis streams authorized
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <Button variant="secondary" size="sm" onClick={handleDisconnect}>
                Disconnect Account
              </Button>
              <Button variant="primary" size="sm" onClick={onClose}>
                Done
              </Button>
            </div>
          </div>
        ) : (
          /* Login Form */
          <form onSubmit={handleLogin} className="mt-4 space-y-4">
            <p className="text-xs text-[var(--text-2)] leading-relaxed">
              Authenticate with your Copernicus Climate Data Store (CDS) account to pull high-resolution ERA5 hydrodynamic winds and ocean current forcing.
            </p>

            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-[6px] text-xs text-red-600 font-medium">
                {error}
              </div>
            )}

            {/* Account / Username field */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[var(--text-1)] flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-[var(--text-3)]" />
                CDS Account (Email or Username)
              </label>
              <input
                type="text"
                value={account}
                onChange={(e) => setAccount(e.target.value)}
                placeholder="e.g. analyst@maritime-forensics.org"
                className="w-full px-3 py-2 bg-[var(--surface-2)] border border-[var(--border-subtle)] focus:border-[var(--ocean-2)] focus:ring-1 focus:ring-[var(--ocean-2)] rounded-[6px] text-xs text-[var(--text-1)] placeholder-[var(--text-3)] font-mono outline-none transition-all"
                autoFocus
              />
            </div>

            {/* Password field */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-[var(--text-1)] flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-[var(--text-3)]" />
                  Password / API Key
                </label>
                <a
                  href="https://cds.climate.copernicus.eu/how-to-api"
                  target="_blank"
                  rel="noreferrer"
                  className="text-[11px] text-[var(--ocean-2)] hover:underline"
                >
                  Get CDS API Key
                </a>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••••••"
                  className="w-full px-3 py-2 pr-9 bg-[var(--surface-2)] border border-[var(--border-subtle)] focus:border-[var(--ocean-2)] focus:ring-1 focus:ring-[var(--ocean-2)] rounded-[6px] text-xs text-[var(--text-1)] placeholder-[var(--text-3)] font-mono outline-none transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--text-3)] hover:text-[var(--text-1)] cursor-pointer"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            {/* Remember Me Checkbox */}
            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="rounded border-[var(--border-default)] text-[var(--ocean-2)] focus:ring-[var(--ocean-2)]"
                />
                <span className="text-xs text-[var(--text-2)]">Remember credentials</span>
              </label>
            </div>

            {/* Actions */}
            <div className="mt-6 pt-4 border-t border-[var(--border-subtle)] flex items-center justify-end gap-3">
              <Button type="button" variant="secondary" size="sm" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" size="sm" disabled={isLoading}>
                {isLoading ? 'Authenticating...' : 'Login to CDS'}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
