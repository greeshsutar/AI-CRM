'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { ShieldCheck, AlertCircle, Loader2, KeyRound, CheckCircle2 } from 'lucide-react';

export default function MfaVerifyPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [factorId, setFactorId] = useState<string | null>(null);
  const [totpCode, setTotpCode] = useState('');

  useEffect(() => {
    async function loadFactors() {
      try {
        const supabase = createClient();
        const { data: sessionData } = await supabase.auth.getSession();

        if (!sessionData.session) {
          setError('You must be signed in to perform Super Admin MFA verification.');
          setLoading(false);
          return;
        }

        const { data: factorsData, error: factorsError } = await supabase.auth.mfa.listFactors();

        if (factorsError) {
          setError(factorsError.message);
          setLoading(false);
          return;
        }

        const totpFactor = factorsData.totp.find((f) => f.status === 'verified');
        if (!totpFactor) {
          // No verified TOTP factor found; redirect to setup
          router.push('/auth/mfa/setup');
          return;
        }

        setFactorId(totpFactor.id);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch MFA factors.');
      } finally {
        setLoading(false);
      }
    }

    loadFactors();
  }, [router]);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!factorId) {
      setError('Missing TOTP authentication factor.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const supabase = createClient();

      // 1. Create challenge
      const challengeRes = await supabase.auth.mfa.challenge({ factorId });
      if (challengeRes.error) {
        setError(challengeRes.error.message);
        setSubmitting(false);
        return;
      }

      // 2. Verify challenge
      const verifyRes = await supabase.auth.mfa.verify({
        factorId,
        challengeId: challengeRes.data.id,
        code: totpCode.trim(),
      });

      if (verifyRes.error) {
        setError(verifyRes.error.message);
        setSubmitting(false);
        return;
      }

      // 3. Refresh session to update session JWT claim to aal2
      await supabase.auth.refreshSession();

      setSuccess(true);
      setTimeout(() => {
        router.push('/auth/mfa/test');
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred during verification.');
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 px-4 py-12">
      <div className="max-w-md w-full bg-slate-800/60 border border-slate-700/80 rounded-2xl p-8 shadow-2xl backdrop-blur-sm">
        {/* Header */}
        <div className="flex flex-col items-center mb-6 text-center">
          <div className="bg-sky-950/80 p-3 rounded-2xl border border-sky-800/50 mb-3">
            <ShieldCheck className="w-10 h-10 text-sky-400" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Super Admin 2FA Challenge</h1>
          <p className="text-slate-400 text-sm mt-1">
            Enter the 6-digit code from your Authenticator app to proceed.
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="bg-rose-950/60 border border-rose-800/60 rounded-xl p-4 mb-6 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            <p className="text-xs text-rose-200 leading-relaxed">{error}</p>
          </div>
        )}

        {/* Success Alert */}
        {success && (
          <div className="bg-emerald-950/60 border border-emerald-800/60 rounded-xl p-4 mb-6 flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            <p className="text-xs text-emerald-200 leading-relaxed">
              MFA Challenge verified successfully! Session updated to AAL2.
            </p>
          </div>
        )}

        {loading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="w-8 h-8 text-sky-400 animate-spin mb-3" />
            <p className="text-sm text-slate-400">Loading MFA factors...</p>
          </div>
        ) : (
          !success && (
            <form onSubmit={handleVerify} className="space-y-5">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-2 uppercase tracking-wider">
                  Verification Code (6 digits)
                </label>
                <input
                  type="text"
                  required
                  maxLength={6}
                  value={totpCode}
                  onChange={(e) => setTotpCode(e.target.value)}
                  placeholder="123456"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-center text-lg tracking-widest font-mono text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition-colors"
                />
              </div>

              <button
                type="submit"
                disabled={submitting || totpCode.length < 6}
                className="w-full flex items-center justify-center gap-2 bg-sky-600 hover:bg-sky-500 text-white font-medium px-4 py-3 rounded-xl transition-colors disabled:opacity-50 text-sm shadow-lg shadow-sky-950/50 mt-2"
              >
                {submitting ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <KeyRound className="w-4 h-4" />
                    Verify Code
                  </>
                )}
              </button>
            </form>
          )
        )}
      </div>
    </div>
  );
}
