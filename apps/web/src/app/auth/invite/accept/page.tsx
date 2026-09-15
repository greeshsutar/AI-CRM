'use client';

import { Suspense, useEffect, useState, FormEvent } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  validateInvitationToken,
  acceptInvitation,
  InvitationValidationResponse,
  ApiError,
} from '@/lib/api-client';
import {
  ShieldCheck,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Lock,
  User,
  Building,
  ArrowRight,
  Shield,
} from 'lucide-react';

function InvitationAcceptContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token');

  const [loadingToken, setLoadingToken] = useState<boolean>(true);
  const [invitationDetails, setInvitationDetails] =
    useState<InvitationValidationResponse | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Form State
  const [password, setPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [firstName, setFirstName] = useState<string>('');
  const [lastName, setLastName] = useState<string>('');

  const [submitting, setSubmitting] = useState<boolean>(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setValidationError('No invitation token provided in the link.');
      setLoadingToken(false);
      return;
    }

    const validateToken = async () => {
      setLoadingToken(true);
      setValidationError(null);
      try {
        const details = await validateInvitationToken(token);
        setInvitationDetails(details);
        setFirstName(details.firstName || '');
        setLastName(details.lastName || '');
      } catch (err: unknown) {
        if (err instanceof ApiError) {
          setValidationError(err.message);
        } else if (err instanceof Error) {
          setValidationError(err.message);
        } else {
          setValidationError('Failed to validate invitation token.');
        }
      } finally {
        setLoadingToken(false);
      }
    };

    validateToken();
  }, [token]);

  const handleAccept = async (e: FormEvent) => {
    e.preventDefault();
    if (!token) return;

    if (password.length < 8) {
      setFormError('Password must be at least 8 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setFormError('Passwords do not match.');
      return;
    }

    setSubmitting(true);
    setFormError(null);

    try {
      await acceptInvitation({
        token,
        password,
        firstName: firstName.trim() || undefined,
        lastName: lastName.trim() || undefined,
      });

      setSuccessMessage(
        'Account setup complete and invitation accepted! Redirecting to sign in...',
      );

      setTimeout(() => {
        router.push('/auth/login?invited=true');
      }, 2000);
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setFormError(err.message);
      } else if (err instanceof Error) {
        setFormError(err.message);
      } else {
        setFormError('Failed to accept invitation.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingToken) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-3 text-slate-400">
          <RefreshCw className="w-8 h-8 animate-spin text-sky-400" />
          <p className="text-sm font-medium">Validating invitation link...</p>
        </div>
      </div>
    );
  }

  if (validationError || !invitationDetails) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="bg-slate-800/80 border border-slate-700/80 max-w-md w-full rounded-2xl p-6 shadow-2xl space-y-6 text-center">
          <div className="w-12 h-12 bg-rose-950/80 border border-rose-800 text-rose-400 rounded-full flex items-center justify-center mx-auto">
            <AlertCircle className="w-6 h-6" />
          </div>

          <div className="space-y-2">
            <h2 className="text-xl font-bold text-white">Invalid or Expired Invitation</h2>
            <p className="text-sm text-slate-400 leading-relaxed">
              {validationError || 'The invitation link you followed is invalid, has expired, or has already been used.'}
            </p>
          </div>

          <div className="pt-2">
            <Link
              href="/auth/login"
              className="inline-flex items-center justify-center gap-2 w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-semibold rounded-xl border border-slate-700 transition-colors"
            >
              Return to Sign In
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 sm:p-6 font-sans">
      <div className="max-w-lg w-full bg-slate-800/60 border border-slate-700/80 rounded-2xl p-6 sm:p-8 shadow-2xl space-y-6">
        {/* Branding Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 text-sky-400 font-extrabold text-xl tracking-wider uppercase">
            <ShieldCheck className="w-7 h-7" />
            MINSTOCS CRM
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Accept Employee Invitation
          </h1>
          <p className="text-xs text-slate-400">
            Complete your account setup to join your organization team.
          </p>
        </div>

        {/* Invitation Summary Card */}
        <div className="bg-slate-900/80 border border-slate-700/60 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-300">
              <Building className="w-4 h-4 text-sky-400" />
              <span>{invitationDetails.organizationName}</span>
            </div>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-semibold bg-sky-950 border border-sky-800 text-sky-300">
              <Shield className="w-3 h-3" />
              {invitationDetails.role}
            </span>
          </div>

          <div className="space-y-1 text-xs text-slate-400">
            <div>
              <span className="font-medium text-slate-500">Work Email: </span>
              <span className="text-slate-200 font-semibold">{invitationDetails.email}</span>
            </div>
            {invitationDetails.inviterName && (
              <div>
                <span className="font-medium text-slate-500">Invited By: </span>
                <span className="text-slate-300">{invitationDetails.inviterName}</span>
              </div>
            )}
            <div>
              <span className="font-medium text-slate-500">Expires On: </span>
              <span className="text-slate-400">
                {new Date(invitationDetails.expiresAt).toLocaleDateString()}
              </span>
            </div>
          </div>
        </div>

        {/* Feedback Banners */}
        {successMessage && (
          <div className="p-4 bg-emerald-950/80 border border-emerald-800 text-emerald-200 text-xs rounded-xl flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            <div className="font-medium">{successMessage}</div>
          </div>
        )}

        {formError && (
          <div className="p-4 bg-rose-950/80 border border-rose-800 text-rose-200 text-xs rounded-xl flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            <div className="font-medium">{formError}</div>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleAccept} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                First Name
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Jane"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                Last Name
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Doe"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
              Create Password <span className="text-sky-400">*</span>
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
              <input
                type="password"
                required
                minLength={8}
                placeholder="At least 8 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
              Confirm Password <span className="text-sky-400">*</span>
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
              <input
                type="password"
                required
                minLength={8}
                placeholder="Re-enter your password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting || !!successMessage}
            className="inline-flex items-center justify-center gap-2 w-full py-3 bg-sky-600 hover:bg-sky-500 text-white text-sm font-bold rounded-xl shadow-lg shadow-sky-900/30 transition-all focus:outline-none focus:ring-2 focus:ring-sky-400 disabled:opacity-50 mt-2"
          >
            {submitting ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Creating Account...
              </>
            ) : (
              <>
                <span>Accept Invitation & Join Team</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function InvitationAcceptPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
          <div className="flex flex-col items-center gap-3 text-slate-400">
            <RefreshCw className="w-8 h-8 animate-spin text-sky-400" />
            <p className="text-sm font-medium">Loading invitation context...</p>
          </div>
        </div>
      }
    >
      <InvitationAcceptContent />
    </Suspense>
  );
}
