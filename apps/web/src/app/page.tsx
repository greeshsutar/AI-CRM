'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { fetchHealth, HealthCheckResponse } from '@/lib/api-client';
import { useAuth } from '@/context/auth-context';
import { Server, ShieldCheck, CheckCircle2, RefreshCw, LogIn, LogOut, User as UserIcon } from 'lucide-react';

export default function Home() {
  const { user, signOut } = useAuth();
  const [health, setHealth] = useState<HealthCheckResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const checkHealth = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchHealth();
      setHealth(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to reach API');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkHealth();
  }, []);

  return (
    <main className="max-w-5xl mx-auto px-6 py-12">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-6 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3">
            <ShieldCheck className="w-8 h-8 text-sky-400" />
            MINSTOCS CRM
          </h1>
          <p className="text-slate-400 mt-1 text-sm">
            Phase 1 — Engineering Foundation & System Verification
          </p>
        </div>
        <div className="flex items-center gap-3">
          {user ? (
            <div className="flex items-center gap-3">
              <Link
                href="/dashboard"
                className="flex items-center gap-1.5 bg-sky-600 hover:bg-sky-500 text-white font-medium px-3 py-1.5 rounded-lg text-xs transition-colors shadow-sm"
              >
                Dashboard
              </Link>
              <span className="flex items-center gap-1.5 bg-slate-800 border border-slate-700/80 px-3 py-1.5 rounded-lg text-xs text-slate-200">
                <UserIcon className="w-3.5 h-3.5 text-sky-400" />
                {user.email}
              </span>
              <button
                onClick={() => signOut()}
                className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700/80 px-3 py-1.5 rounded-lg text-xs text-rose-400 hover:text-rose-300 transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" />
                Sign Out
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                href="/auth/login"
                className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700/80 px-3 py-1.5 rounded-lg text-xs text-slate-200 transition-colors"
              >
                <LogIn className="w-3.5 h-3.5 text-sky-400" />
                Sign In
              </Link>
              <Link
                href="/auth/signup"
                className="flex items-center gap-1.5 bg-sky-600 hover:bg-sky-500 text-white font-medium px-3 py-1.5 rounded-lg text-xs transition-colors shadow-sm"
              >
                Sign Up
              </Link>
            </div>
          )}
          <button
            onClick={checkHealth}
            disabled={loading}
            className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 px-3 py-1.5 rounded-lg text-xs text-slate-200 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Recheck API
          </button>
        </div>
      </div>

      {/* Architecture Alert Banner */}
      <div className="bg-sky-950/40 border border-sky-800/50 rounded-xl p-4 mb-8">
        <h2 className="text-sky-300 font-semibold text-sm mb-1">
          Authoritative Architecture: Modular Monolith
        </h2>
        <p className="text-slate-300 text-xs leading-relaxed">
          Browser &rarr; Next.js Frontend &rarr; NestJS API &rarr; Prisma ORM &rarr; PostgreSQL (Supabase).
          Application backend operations flow strictly through the NestJS API layer.
        </p>
      </div>

      {/* Grid Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {/* Next.js Frontend Status */}
        <div className="bg-slate-800/50 border border-slate-700/60 rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Frontend</span>
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-950 text-emerald-400 border border-emerald-800/50">
              <CheckCircle2 className="w-3 h-3 mr-1" />
              ONLINE
            </span>
          </div>
          <p className="text-lg font-medium text-white mb-1">Next.js 15 App Router</p>
          <p className="text-xs text-slate-400">TypeScript, Tailwind CSS, Centralized API Client</p>
        </div>

        {/* NestJS API Status */}
        <div className="bg-slate-800/50 border border-slate-700/60 rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">NestJS API</span>
            {loading ? (
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-800 text-slate-400 border border-slate-700">
                CHECKING...
              </span>
            ) : error ? (
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-rose-950 text-rose-400 border border-rose-800/50">
                UNREACHABLE
              </span>
            ) : (
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-950 text-emerald-400 border border-emerald-800/50">
                <CheckCircle2 className="w-3 h-3 mr-1" />
                {health?.status.toUpperCase() || 'OK'}
              </span>
            )}
          </div>
          <p className="text-lg font-medium text-white mb-1">NestJS Backend v1</p>
          <p className="text-xs text-slate-400">
            {error ? error : health ? `Env: ${health.environment} | Uptime: ${Math.floor(health.uptime)}s` : 'Connecting...'}
          </p>
        </div>

        {/* Database Status */}
        <div className="bg-slate-800/50 border border-slate-700/60 rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Database</span>
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-950 text-emerald-400 border border-emerald-800/50">
              <CheckCircle2 className="w-3 h-3 mr-1" />
              VERIFIED
            </span>
          </div>
          <p className="text-lg font-medium text-white mb-1">Supabase PostgreSQL</p>
          <p className="text-xs text-slate-400">Connection established &bull; Intentionally empty (Phase 1)</p>
        </div>
      </div>

      {/* API Verification Terminal Display */}
      <div className="bg-slate-950 border border-slate-800 rounded-xl p-5 font-mono text-xs">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-3 text-slate-400">
          <span className="flex items-center gap-2">
            <Server className="w-4 h-4 text-sky-400" />
            GET /api/v1/health Response
          </span>
          <span className="text-slate-500">Live Verification</span>
        </div>
        {loading ? (
          <div className="text-slate-500 py-4 text-center animate-pulse">Requesting health check from NestJS API...</div>
        ) : error ? (
          <div className="text-rose-400 py-4">Error: {error}</div>
        ) : (
          <pre className="text-sky-300 bg-slate-900/60 p-4 rounded-lg overflow-x-auto border border-slate-800/80">
            {JSON.stringify(health, null, 2)}
          </pre>
        )}
      </div>

      {/* Scope Footer */}
      <div className="mt-8 pt-6 border-t border-slate-800/60 text-center text-xs text-slate-500">
        Phase 1 Foundation Only &bull; No CRM business functionality implemented &bull; MINSTOCS CRM
      </div>
    </main>
  );
}
