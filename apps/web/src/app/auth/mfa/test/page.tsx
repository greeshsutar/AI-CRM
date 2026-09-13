'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { ShieldCheck, AlertCircle, CheckCircle2, Loader2, RefreshCw, Send } from 'lucide-react';

export default function MfaTestPage() {
  const [loading, setLoading] = useState(true);
  const [testing, setTesting] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [currentAal, setCurrentAal] = useState<string | null>(null);
  const [nextAal, setNextAal] = useState<string | null>(null);
  const [apiResponse, setApiResponse] = useState<{
    status: number;
    data: unknown;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchSessionInfo = async () => {
    setLoading(true);
    setError(null);
    try {
      const supabase = createClient();
      const { data: sessionData } = await supabase.auth.getSession();

      if (!sessionData.session) {
        setError('No active session found.');
        setUserEmail(null);
        setCurrentAal(null);
        return;
      }

      setUserEmail(sessionData.session.user.email ?? null);

      const { data: aalData, error: aalError } =
        await supabase.auth.mfa.getAuthenticatorAssuranceLevel();

      if (aalError) {
        setError(aalError.message);
      } else if (aalData) {
        setCurrentAal(aalData.currentLevel);
        setNextAal(aalData.nextLevel);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch session information.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSessionInfo();
  }, []);

  const callMfaTestEndpoint = async () => {
    setTesting(true);
    setApiResponse(null);
    setError(null);

    try {
      const supabase = createClient();
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;

      if (!token) {
        setError('No access token available.');
        setTesting(false);
        return;
      }

      const res = await fetch('http://localhost:3001/api/v1/super-admin/mfa-test', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const body = await res.json().catch(() => null);
      setApiResponse({
        status: res.status,
        data: body,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reach API endpoint.');
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 px-4 py-12">
      <div className="max-w-xl w-full bg-slate-800/60 border border-slate-700/80 rounded-2xl p-8 shadow-2xl backdrop-blur-sm">
        {/* Header */}
        <div className="flex flex-col items-center mb-6 text-center">
          <div className="bg-sky-950/80 p-3 rounded-2xl border border-sky-800/50 mb-3">
            <ShieldCheck className="w-10 h-10 text-sky-400" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Super Admin MFA End-to-End Test</h1>
          <p className="text-slate-400 text-sm mt-1">
            Test NestJS backend enforcement of Supabase AAL2 JWT claims
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="bg-rose-950/60 border border-rose-800/60 rounded-xl p-4 mb-6 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            <p className="text-xs text-rose-200 leading-relaxed">{error}</p>
          </div>
        )}

        {/* Status Card */}
        <div className="bg-slate-900 border border-slate-700 rounded-xl p-5 mb-6 space-y-3">
          <div className="flex items-center justify-between text-xs border-b border-slate-800 pb-2">
            <span className="text-slate-400 uppercase tracking-wider font-semibold">User Email:</span>
            <span className="font-mono text-white">{userEmail || 'Not signed in'}</span>
          </div>
          <div className="flex items-center justify-between text-xs border-b border-slate-800 pb-2">
            <span className="text-slate-400 uppercase tracking-wider font-semibold">Current AAL Level:</span>
            <span
              className={`font-mono font-bold px-2 py-0.5 rounded ${
                currentAal === 'aal2'
                  ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                  : 'bg-amber-950 text-amber-400 border border-amber-800'
              }`}
            >
              {currentAal || 'aal1'}
            </span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400 uppercase tracking-wider font-semibold">Next Required AAL:</span>
            <span className="font-mono text-slate-300">{nextAal || 'aal1'}</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <button
            onClick={fetchSessionInfo}
            disabled={loading}
            className="flex items-center justify-center gap-2 bg-slate-700 hover:bg-slate-600 text-white font-medium px-4 py-3 rounded-xl text-xs transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh Session Info
          </button>

          <button
            onClick={callMfaTestEndpoint}
            disabled={testing || !userEmail}
            className="flex items-center justify-center gap-2 bg-sky-600 hover:bg-sky-500 text-white font-medium px-4 py-3 rounded-xl text-xs transition-colors shadow-lg shadow-sky-950/50 disabled:opacity-50"
          >
            {testing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <Send className="w-4 h-4" />
                Call Protected API
              </>
            )}
          </button>
        </div>

        {/* API Response Display */}
        {apiResponse && (
          <div
            className={`border rounded-xl p-5 ${
              apiResponse.status === 200
                ? 'bg-emerald-950/40 border-emerald-800/60'
                : 'bg-rose-950/40 border-rose-800/60'
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs uppercase tracking-wider font-bold text-white flex items-center gap-2">
                {apiResponse.status === 200 ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-400" />
                )}
                Response HTTP Status
              </span>
              <span
                className={`font-mono text-xs font-bold px-2 py-0.5 rounded ${
                  apiResponse.status === 200 ? 'bg-emerald-900 text-emerald-300' : 'bg-rose-900 text-rose-300'
                }`}
              >
                {apiResponse.status}
              </span>
            </div>
            <pre className="bg-slate-900 p-3 rounded-lg text-xs font-mono text-slate-300 overflow-x-auto">
              {JSON.stringify(apiResponse.data, null, 2)}
            </pre>
          </div>
        )}

        {/* Navigation Links */}
        <div className="mt-8 flex justify-center gap-4 text-xs text-slate-400 border-t border-slate-700/60 pt-6">
          <Link href="/auth/mfa/setup" className="text-sky-400 hover:text-sky-300 font-semibold">
            MFA Setup Page
          </Link>
          <span>•</span>
          <Link href="/auth/mfa/verify" className="text-sky-400 hover:text-sky-300 font-semibold">
            MFA Verify Page
          </Link>
          <span>•</span>
          <Link href="/auth/login" className="text-sky-400 hover:text-sky-300 font-semibold">
            Login Page
          </Link>
        </div>
      </div>
    </div>
  );
}
