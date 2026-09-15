'use client';

import { useEffect, useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/auth-context';
import {
  fetchUserOrganizations,
  fetchOrganizationInvitations,
  createInvitation,
  revokeInvitation,
  OrganizationItem,
  InvitationItem,
  ApiError,
} from '@/lib/api-client';
import {
  Users,
  UserPlus,
  ArrowLeft,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Clock,
  XCircle,
  Mail,
  Shield,
  X,
  UserCheck,
  Ban,
} from 'lucide-react';

export default function EmployeesPage() {
  const { user, accessToken, loading: authLoading } = useAuth();
  const router = useRouter();

  const [organizations, setOrganizations] = useState<OrganizationItem[]>([]);
  const [selectedOrg, setSelectedOrg] = useState<OrganizationItem | null>(null);
  const [invitations, setInvitations] = useState<InvitationItem[]>([]);
  
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Invite Modal State
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [inviteEmail, setInviteEmail] = useState<string>('');
  const [inviteFirstName, setInviteFirstName] = useState<string>('');
  const [inviteLastName, setInviteLastName] = useState<string>('');
  const [inviteRole, setInviteRole] = useState<'AGENT' | 'MANAGER'>('AGENT');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [modalError, setModalError] = useState<string | null>(null);

  // Revoking State
  const [revokingId, setRevokingId] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth/login');
    }
  }, [authLoading, user, router]);

  const loadData = async (token: string) => {
    setLoading(true);
    setError(null);
    try {
      const orgs = await fetchUserOrganizations(token);
      setOrganizations(orgs);
      if (orgs.length > 0) {
        const primaryOrg = orgs[0];
        setSelectedOrg(primaryOrg);
        const invs = await fetchOrganizationInvitations(token, primaryOrg.id);
        setInvitations(invs);
      }
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setError(`Failed to load data (${err.statusCode}): ${err.message}`);
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Failed to load employee invitations data');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (accessToken) {
      loadData(accessToken);
    }
  }, [accessToken]);

  const handleOrgChange = async (orgId: string) => {
    if (!accessToken) return;
    const found = organizations.find((o) => o.id === orgId);
    if (found) {
      setSelectedOrg(found);
      setLoading(true);
      try {
        const invs = await fetchOrganizationInvitations(accessToken, found.id);
        setInvitations(invs);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Error fetching invitations';
        setError(msg);
      } finally {
        setLoading(false);
      }
    }
  };

  const handleCreateInvitation = async (e: FormEvent) => {
    e.preventDefault();
    if (!accessToken || !selectedOrg) return;

    if (!inviteEmail.trim()) {
      setModalError('Work email is required');
      return;
    }

    setSubmitting(true);
    setModalError(null);
    setActionSuccess(null);

    try {
      const created = await createInvitation(accessToken, {
        organizationId: selectedOrg.id,
        email: inviteEmail.trim().toLowerCase(),
        firstName: inviteFirstName.trim() || undefined,
        lastName: inviteLastName.trim() || undefined,
        role: inviteRole,
      });

      // Update state
      setInvitations((prev) => [created, ...prev]);
      setActionSuccess(`Invitation sent successfully to ${created.email}!`);
      setIsModalOpen(false);
      // Reset form
      setInviteEmail('');
      setInviteFirstName('');
      setInviteLastName('');
      setInviteRole('AGENT');
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setModalError(err.message);
      } else if (err instanceof Error) {
        setModalError(err.message);
      } else {
        setModalError('Failed to send invitation');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleRevokeInvitation = async (invitationId: string) => {
    if (!accessToken) return;
    if (!window.confirm('Are you sure you want to revoke this pending invitation?')) return;

    setRevokingId(invitationId);
    setActionSuccess(null);
    setError(null);

    try {
      const revoked = await revokeInvitation(accessToken, invitationId);
      setInvitations((prev) =>
        prev.map((item) => (item.id === invitationId ? revoked : item)),
      );
      setActionSuccess(`Invitation for ${revoked.email} has been revoked.`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to revoke invitation';
      setError(msg);
    } finally {
      setRevokingId(null);
    }
  };

  if (authLoading || (!user && loading)) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-3 text-slate-400">
          <RefreshCw className="w-8 h-8 animate-spin text-sky-400" />
          <p className="text-sm">Loading Employee & Invitation System...</p>
        </div>
      </div>
    );
  }

  const pendingCount = invitations.filter((i) => i.status === 'PENDING').length;
  const acceptedCount = invitations.filter((i) => i.status === 'ACCEPTED').length;
  const revokedCount = invitations.filter(
    (i) => i.status === 'REVOKED' || i.status === 'EXPIRED',
  ).length;

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 font-sans">
      {/* Header Bar */}
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link
              href="/dashboard"
              className="inline-flex items-center text-sm font-medium text-slate-400 hover:text-slate-200 transition-colors"
            >
              <ArrowLeft className="w-4 h-4 mr-1" />
              Back to Dashboard
            </Link>
            <div className="h-4 w-px bg-slate-800" />
            <div className="flex items-center gap-2">
              <Users className="w-6 h-6 text-sky-400" />
              <h1 className="text-xl font-bold tracking-tight text-white">
                Team & Employee Management
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {organizations.length > 1 && (
              <select
                value={selectedOrg?.id || ''}
                onChange={(e) => handleOrgChange(e.target.value)}
                className="bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-200 px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-sky-500"
              >
                {organizations.map((org) => (
                  <option key={org.id} value={org.id}>
                    {org.name}
                  </option>
                ))}
              </select>
            )}

            <button
              onClick={() => {
                setModalError(null);
                setIsModalOpen(true);
              }}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white text-sm font-semibold rounded-lg shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-sky-400"
            >
              <UserPlus className="w-4 h-4" />
              Invite Employee
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Banner Alert */}
        {actionSuccess && (
          <div className="p-4 bg-emerald-950/60 border border-emerald-800/80 rounded-xl text-emerald-200 flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 mt-0.5 shrink-0" />
            <div className="text-sm font-medium">{actionSuccess}</div>
          </div>
        )}

        {error && (
          <div className="p-4 bg-rose-950/60 border border-rose-800/80 rounded-xl text-rose-200 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-rose-400 mt-0.5 shrink-0" />
            <div className="text-sm font-medium">{error}</div>
          </div>
        )}

        {/* Metrics Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="bg-slate-800/50 border border-slate-800 rounded-xl p-5">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-xs font-semibold uppercase tracking-wider">
                Total Invitations
              </span>
              <Mail className="w-5 h-5 text-sky-400" />
            </div>
            <div className="mt-3 text-3xl font-bold text-white">
              {invitations.length}
            </div>
          </div>

          <div className="bg-slate-800/50 border border-slate-800 rounded-xl p-5">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-xs font-semibold uppercase tracking-wider">
                Pending Acceptance
              </span>
              <Clock className="w-5 h-5 text-amber-400" />
            </div>
            <div className="mt-3 text-3xl font-bold text-amber-300">
              {pendingCount}
            </div>
          </div>

          <div className="bg-slate-800/50 border border-slate-800 rounded-xl p-5">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-xs font-semibold uppercase tracking-wider">
                Active / Accepted
              </span>
              <UserCheck className="w-5 h-5 text-emerald-400" />
            </div>
            <div className="mt-3 text-3xl font-bold text-emerald-300">
              {acceptedCount}
            </div>
          </div>

          <div className="bg-slate-800/50 border border-slate-800 rounded-xl p-5">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-xs font-semibold uppercase tracking-wider">
                Revoked / Expired
              </span>
              <XCircle className="w-5 h-5 text-slate-400" />
            </div>
            <div className="mt-3 text-3xl font-bold text-slate-400">
              {revokedCount}
            </div>
          </div>
        </div>

        {/* Invitations Table */}
        <div className="bg-slate-800/40 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
          <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">
              Organization Employee Invitations ({selectedOrg?.name || 'Organization'})
            </h2>
            <button
              onClick={() => accessToken && loadData(accessToken)}
              className="text-slate-400 hover:text-slate-200 transition-colors p-1.5 rounded-lg hover:bg-slate-800"
              title="Refresh list"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {loading ? (
            <div className="py-12 flex justify-center items-center text-slate-400 gap-2">
              <RefreshCw className="w-5 h-5 animate-spin text-sky-400" />
              <span className="text-sm">Loading invitations...</span>
            </div>
          ) : invitations.length === 0 ? (
            <div className="py-16 text-center px-4">
              <Mail className="w-12 h-12 text-slate-600 mx-auto mb-3" />
              <h3 className="text-base font-semibold text-slate-300">No invitations found</h3>
              <p className="text-sm text-slate-500 max-w-md mx-auto mt-1">
                You haven't sent any employee invitations for this organization yet. Click
                "Invite Employee" above to send your first invitation.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-300">
                <thead className="bg-slate-900/60 text-xs uppercase tracking-wider text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="px-6 py-3.5">Invited Employee</th>
                    <th className="px-6 py-3.5">Assigned Role</th>
                    <th className="px-6 py-3.5">Status</th>
                    <th className="px-6 py-3.5">Invited Date</th>
                    <th className="px-6 py-3.5">Expires At</th>
                    <th className="px-6 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {invitations.map((item) => {
                    const fullName = [item.firstName, item.lastName]
                      .filter(Boolean)
                      .join(' ');
                    const isPending = item.status === 'PENDING';
                    const isAccepted = item.status === 'ACCEPTED';
                    const isRevoked = item.status === 'REVOKED';
                    const isExpired = item.status === 'EXPIRED';

                    return (
                      <tr key={item.id} className="hover:bg-slate-800/30 transition-colors">
                        <td className="px-6 py-4">
                          <div className="font-medium text-white">{item.email}</div>
                          {fullName && (
                            <div className="text-xs text-slate-400 mt-0.5">{fullName}</div>
                          )}
                        </td>

                        <td className="px-6 py-4">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-slate-800 border border-slate-700 text-sky-300">
                            <Shield className="w-3 h-3 text-sky-400" />
                            {item.role}
                          </span>
                        </td>

                        <td className="px-6 py-4">
                          {isPending && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-950/80 border border-amber-800/80 text-amber-300">
                              <Clock className="w-3 h-3 text-amber-400" />
                              PENDING
                            </span>
                          )}
                          {isAccepted && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-950/80 border border-emerald-800/80 text-emerald-300">
                              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                              ACCEPTED
                            </span>
                          )}
                          {isRevoked && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-950/80 border border-rose-800/80 text-rose-400">
                              <Ban className="w-3 h-3" />
                              REVOKED
                            </span>
                          )}
                          {isExpired && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-800 text-slate-400 border border-slate-700">
                              <XCircle className="w-3 h-3" />
                              EXPIRED
                            </span>
                          )}
                        </td>

                        <td className="px-6 py-4 text-xs text-slate-400">
                          {new Date(item.createdAt).toLocaleDateString()}
                        </td>

                        <td className="px-6 py-4 text-xs text-slate-400">
                          {new Date(item.expiresAt).toLocaleDateString()}
                        </td>

                        <td className="px-6 py-4 text-right">
                          {isPending ? (
                            <button
                              onClick={() => handleRevokeInvitation(item.id)}
                              disabled={revokingId === item.id}
                              className="inline-flex items-center text-xs font-semibold text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 px-2.5 py-1 rounded-md transition-colors border border-rose-900/60 disabled:opacity-50"
                            >
                              {revokingId === item.id ? (
                                <RefreshCw className="w-3 h-3 animate-spin mr-1" />
                              ) : (
                                <Ban className="w-3 h-3 mr-1" />
                              )}
                              Revoke
                            </button>
                          ) : (
                            <span className="text-xs text-slate-600">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {/* Invite Employee Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-lg rounded-2xl p-6 shadow-2xl space-y-6 relative">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-200 transition-colors p-1 rounded-lg hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3">
              <div className="p-3 bg-sky-950/60 border border-sky-800/80 rounded-xl text-sky-400">
                <UserPlus className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Invite New Employee</h3>
                <p className="text-xs text-slate-400">
                  Send a single-use invitation email to join {selectedOrg?.name}.
                </p>
              </div>
            </div>

            {modalError && (
              <div className="p-3 bg-rose-950/60 border border-rose-800/80 rounded-xl text-rose-200 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-400 mt-0.5 shrink-0" />
                <span>{modalError}</span>
              </div>
            )}

            <form onSubmit={handleCreateInvitation} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
                  Work Email <span className="text-sky-400">*</span>
                </label>
                <input
                  type="email"
                  required
                  placeholder="employee@company.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="w-full bg-slate-800/60 border border-slate-700 rounded-lg px-3.5 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
                    First Name
                  </label>
                  <input
                    type="text"
                    placeholder="John"
                    value={inviteFirstName}
                    onChange={(e) => setInviteFirstName(e.target.value)}
                    className="w-full bg-slate-800/60 border border-slate-700 rounded-lg px-3.5 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
                    Last Name
                  </label>
                  <input
                    type="text"
                    placeholder="Doe"
                    value={inviteLastName}
                    onChange={(e) => setInviteLastName(e.target.value)}
                    className="w-full bg-slate-800/60 border border-slate-700 rounded-lg px-3.5 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
                  Assigned Employee Role <span className="text-sky-400">*</span>
                </label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as 'AGENT' | 'MANAGER')}
                  className="w-full bg-slate-800/60 border border-slate-700 rounded-lg px-3.5 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                >
                  <option value="AGENT">AGENT — Standard Telecalling & Lead Execution</option>
                  <option value="MANAGER">MANAGER — Sales Team & Operations Manager</option>
                </select>
                <p className="text-[11px] text-slate-500 mt-1">
                  Security Note: Only AGENT and MANAGER roles are permitted for employee invitations.
                </p>
              </div>

              <div className="pt-3 flex justify-end gap-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-semibold rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center justify-center gap-2 px-5 py-2 bg-sky-600 hover:bg-sky-500 text-white text-sm font-semibold rounded-lg shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-sky-400 disabled:opacity-50"
                >
                  {submitting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Sending Invitation...
                    </>
                  ) : (
                    <>
                      <Mail className="w-4 h-4" />
                      Send Invitation
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
