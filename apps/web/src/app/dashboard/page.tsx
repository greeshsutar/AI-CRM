'use client';

import { useEffect, useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/auth-context';
import {
  fetchUserProfile,
  updateUserProfile,
  UserProfile,
  ApiError,
} from '@/lib/api-client';
import {
  ShieldCheck,
  User as UserIcon,
  LogOut,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  Save,
  Key,
} from 'lucide-react';

export default function DashboardPage() {
  const { user, accessToken, loading: authLoading, signOut } = useAuth();
  const router = useRouter();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState<boolean>(true);
  const [profileError, setProfileError] = useState<string | null>(null);

  // Profile Edit Form State
  const [firstName, setFirstName] = useState<string>('');
  const [lastName, setLastName] = useState<string>('');
  const [avatarUrl, setAvatarUrl] = useState<string>('');
  const [saving, setSaving] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth/login');
    }
  }, [authLoading, user, router]);

  const loadProfile = async (token: string) => {
    setProfileLoading(true);
    setProfileError(null);
    try {
      const data = await fetchUserProfile(token);
      setProfile(data);
      setFirstName(data.firstName || '');
      setLastName(data.lastName || '');
      setAvatarUrl(data.avatarUrl || '');
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setProfileError(`API Error (${err.statusCode}): ${err.message}`);
      } else if (err instanceof Error) {
        setProfileError(err.message);
      } else {
        setProfileError('Failed to fetch user profile from NestJS API');
      }
    } finally {
      setProfileLoading(false);
    }
  };

  useEffect(() => {
    if (accessToken) {
      loadProfile(accessToken);
    }
  }, [accessToken]);

  const handleUpdateProfile = async (e: FormEvent) => {
    e.preventDefault();
    if (!accessToken) return;

    setSaving(true);
    setSaveSuccess(null);
    setSaveError(null);

    try {
      const updated = await updateUserProfile(accessToken, {
        firstName: firstName.trim() || undefined,
        lastName: lastName.trim() || undefined,
        avatarUrl: avatarUrl.trim() || undefined,
      });
      setProfile(updated);
      setFirstName(updated.firstName || '');
      setLastName(updated.lastName || '');
      setAvatarUrl(updated.avatarUrl || '');
      setSaveSuccess('Profile updated successfully!');
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setSaveError(`Update failed (${err.statusCode}): ${err.message}`);
      } else if (err instanceof Error) {
        setSaveError(err.message);
      } else {
        setSaveError('Failed to update user profile');
      }
    } finally {
      setSaving(false);
    }
  };

  if (authLoading || (!user && profileLoading)) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-3 text-slate-400">
          <RefreshCw className="w-8 h-8 animate-spin text-sky-400" />
          <p className="text-sm">Verifying authentication & loading profile...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Navigation & Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-6">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors border border-slate-700"
              title="Return Home"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                <ShieldCheck className="w-7 h-7 text-sky-400" />
                Protected Dashboard
              </h1>
              <p className="text-xs text-slate-400 mt-0.5">
                NestJS API Authenticated User Session & Profile (`GET /api/v1/users/me`)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => accessToken && loadProfile(accessToken)}
              disabled={profileLoading}
              className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 px-3 py-1.5 rounded-lg text-xs text-slate-200 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${profileLoading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <button
              onClick={() => signOut()}
              className="flex items-center gap-1.5 bg-rose-950/60 hover:bg-rose-900/60 border border-rose-800/60 px-3 py-1.5 rounded-lg text-xs text-rose-300 transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              Sign Out
            </button>
          </div>
        </div>

        {/* Auth Verification Banner */}
        <div className="bg-sky-950/40 border border-sky-800/50 rounded-xl p-4 flex items-start gap-3">
          <Key className="w-5 h-5 text-sky-400 mt-0.5 shrink-0" />
          <div className="text-xs space-y-1">
            <div className="font-semibold text-sky-300">
              Authenticated Supabase JWT Bearer Session
            </div>
            <p className="text-slate-300 leading-relaxed">
              Your request header contains a verified Supabase JWT Bearer access token.
              NestJS <code className="text-sky-300 font-mono bg-slate-950 px-1 py-0.5 rounded">JwtAuthGuard</code> validates the signature and resolves your canonical identity from PostgreSQL <code className="text-sky-300 font-mono bg-slate-950 px-1 py-0.5 rounded">public.users</code>.
            </p>
          </div>
        </div>

        {/* Profile Card & Info */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Main User Profile Info */}
          <div className="md:col-span-2 space-y-6">
            {/* Identity Details Card */}
            <div className="bg-slate-800/60 border border-slate-700/80 rounded-xl p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-700/60 pb-3">
                <h2 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                  <UserIcon className="w-4 h-4 text-sky-400" />
                  Application Identity Profile
                </h2>
                {profileLoading ? (
                  <span className="text-xs text-slate-400 animate-pulse">Fetching API...</span>
                ) : profileError ? (
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-rose-950 text-rose-400 border border-rose-800">
                    API ERROR
                  </span>
                ) : (
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-950 text-emerald-400 border border-emerald-800">
                    <CheckCircle2 className="w-3 h-3 mr-1" />
                    SYNCED
                  </span>
                )}
              </div>

              {profileError && (
                <div className="p-3 bg-rose-950/50 border border-rose-800/50 rounded-lg text-xs text-rose-300 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <div>{profileError}</div>
                </div>
              )}

              {profileLoading && !profile ? (
                <div className="py-8 text-center text-slate-500 text-xs animate-pulse">
                  Loading profile from NestJS API...
                </div>
              ) : profile ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div className="bg-slate-900/60 p-3 rounded-lg border border-slate-800">
                    <span className="text-slate-500 block mb-1 font-mono uppercase tracking-wider text-[10px]">
                      Canonical User ID (UUID)
                    </span>
                    <span className="font-mono text-sky-300 break-all select-all font-semibold">
                      {profile.id}
                    </span>
                  </div>

                  <div className="bg-slate-900/60 p-3 rounded-lg border border-slate-800">
                    <span className="text-slate-500 block mb-1 font-mono uppercase tracking-wider text-[10px]">
                      Email Address
                    </span>
                    <span className="text-slate-200 font-medium break-all">
                      {profile.email}
                    </span>
                  </div>

                  <div className="bg-slate-900/60 p-3 rounded-lg border border-slate-800">
                    <span className="text-slate-500 block mb-1 font-mono uppercase tracking-wider text-[10px]">
                      First Name
                    </span>
                    <span className="text-slate-200">
                      {profile.firstName || <em className="text-slate-500">Not set</em>}
                    </span>
                  </div>

                  <div className="bg-slate-900/60 p-3 rounded-lg border border-slate-800">
                    <span className="text-slate-500 block mb-1 font-mono uppercase tracking-wider text-[10px]">
                      Last Name
                    </span>
                    <span className="text-slate-200">
                      {profile.lastName || <em className="text-slate-500">Not set</em>}
                    </span>
                  </div>

                  <div className="bg-slate-900/60 p-3 rounded-lg border border-slate-800">
                    <span className="text-slate-500 block mb-1 font-mono uppercase tracking-wider text-[10px]">
                      Account Status
                    </span>
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-950 text-emerald-400 border border-emerald-800/80">
                      {profile.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>

                  <div className="bg-slate-900/60 p-3 rounded-lg border border-slate-800">
                    <span className="text-slate-500 block mb-1 font-mono uppercase tracking-wider text-[10px]">
                      Created At
                    </span>
                    <span className="text-slate-400 font-mono">
                      {new Date(profile.createdAt).toLocaleString()}
                    </span>
                  </div>
                </div>
              ) : null}
            </div>

            {/* Profile Edit Form (`PATCH /api/v1/users/me`) */}
            <div className="bg-slate-800/60 border border-slate-700/80 rounded-xl p-6 space-y-4">
              <h2 className="text-sm font-semibold text-slate-200 border-b border-slate-700/60 pb-3">
                Update Profile Info (`PATCH /api/v1/users/me`)
              </h2>

              {saveSuccess && (
                <div className="p-3 bg-emerald-950/50 border border-emerald-800/50 rounded-lg text-xs text-emerald-300 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>{saveSuccess}</span>
                </div>
              )}

              {saveError && (
                <div className="p-3 bg-rose-950/50 border border-rose-800/50 rounded-lg text-xs text-rose-300 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>{saveError}</span>
                </div>
              )}

              <form onSubmit={handleUpdateProfile} className="space-y-4 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-slate-400 mb-1 font-medium">First Name</label>
                    <input
                      type="text"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      placeholder="Jane"
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 mb-1 font-medium">Last Name</label>
                    <input
                      type="text"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      placeholder="Doe"
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Avatar URL</label>
                  <input
                    type="url"
                    value={avatarUrl}
                    onChange={(e) => setAvatarUrl(e.target.value)}
                    placeholder="https://example.com/avatar.png"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 transition-colors"
                  />
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    type="submit"
                    disabled={saving || profileLoading}
                    className="flex items-center gap-2 bg-sky-600 hover:bg-sky-500 text-white font-medium px-4 py-2 rounded-lg text-xs transition-colors disabled:opacity-50 shadow-sm"
                  >
                    {saving ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Save className="w-3.5 h-3.5" />
                    )}
                    {saving ? 'Saving...' : 'Save Profile Changes'}
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* Sidebar Technical Session Summary */}
          <div className="space-y-6">
            <div className="bg-slate-800/60 border border-slate-700/80 rounded-xl p-5 space-y-3 text-xs">
              <h3 className="font-semibold text-slate-200 uppercase tracking-wider text-[11px] border-b border-slate-700/60 pb-2">
                Session Verification
              </h3>

              <div className="space-y-2">
                <div className="text-slate-400">
                  <span className="block text-slate-500 text-[10px] uppercase">Supabase Auth Email</span>
                  <span className="text-slate-200 font-mono break-all">{user.email}</span>
                </div>

                <div className="text-slate-400">
                  <span className="block text-slate-500 text-[10px] uppercase">Supabase Auth ID</span>
                  <span className="text-slate-300 font-mono text-[11px] break-all">{user.id}</span>
                </div>

                <div className="text-slate-400">
                  <span className="block text-slate-500 text-[10px] uppercase">Token Type</span>
                  <span className="text-emerald-400 font-mono font-semibold">Bearer (JWT)</span>
                </div>
              </div>
            </div>

            <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 font-mono text-[11px] text-slate-400 space-y-2">
              <div className="text-slate-500 text-[10px] uppercase border-b border-slate-800 pb-1">
                API Endpoint Contract
              </div>
              <div className="text-sky-300">GET /api/v1/users/me</div>
              <div className="text-sky-300">PATCH /api/v1/users/me</div>
              <p className="text-[10px] text-slate-500 pt-1 leading-normal">
                Protected by JwtAuthGuard. Returns application User profile matching Supabase auth UUID.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
