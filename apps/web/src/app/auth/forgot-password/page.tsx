'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { ShieldCheck, KeyRound, AlertCircle, CheckCircle2, Loader2, ArrowLeft } from 'lucide-react';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const supabase = createClient();
      const origin = typeof window !== 'undefined' ? window.location.origin : '';
      const { error: authError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${origin}/auth/login`,
      });

      if (authError) {
        setError(authError.message);
      } else {
        setSuccess(true);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 px-4 py-12">
      <div className="max-w-md w-full bg-slate-800/60 border border-slate-700/80 rounded-2xl p-8 shadow-2xl backdrop-blur-sm">
        {/* Logo / Header */}
        <div className="flex flex-col items-center mb-8">
          <div className="bg-sky-950/80 p-3 rounded-2xl border border-sky-800/50 mb-3">
            <ShieldCheck className="w-10 h-10 text-sky-400" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Reset Password</h1>
          <p className="text-slate-400 text-sm mt-1">Enter your email to receive a password reset link</p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="bg-rose-950/60 border border-rose-800/60 rounded-xl p-4 mb-6 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            <p className="text-xs text-rose-200 leading-relaxed">{error}</p>
          </div>
        )}

        {/* Success Alert */}
        {success ? (
          <div className="bg-emerald-950/60 border border-emerald-800/60 rounded-xl p-6 text-center">
            <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
            <h2 className="text-lg font-semibold text-white mb-1">Reset Link Sent</h2>
            <p className="text-xs text-slate-300 mb-6 leading-relaxed">
              If an account exists for {email}, you will receive a password reset email shortly.
            </p>
            <Link
              href="/auth/login"
              className="inline-flex items-center justify-center gap-2 bg-sky-600 hover:bg-sky-500 text-white font-medium px-4 py-2.5 rounded-xl text-xs transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Return to Login
            </Link>
          </div>
        ) : (
          /* Form */
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-2 uppercase tracking-wider">
                Email Address
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="user@example.com"
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition-colors"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-sky-600 hover:bg-sky-500 text-white font-medium px-4 py-3 rounded-xl transition-colors disabled:opacity-50 text-sm shadow-lg shadow-sky-950/50 mt-2"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <KeyRound className="w-4 h-4" />
                  Send Reset Link
                </>
              )}
            </button>
          </form>
        )}

        {/* Footer Link */}
        <div className="mt-8 text-center text-xs text-slate-400 border-t border-slate-700/60 pt-6">
          Remember your password?{' '}
          <Link href="/auth/login" className="text-sky-400 font-semibold hover:text-sky-300 transition-colors">
            Back to Sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
