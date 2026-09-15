'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/auth-context';
import {
  fetchAuditLogs,
  fetchUserOrganizations,
  AuditLogItem,
  OrganizationItem,
  ApiError,
} from '@/lib/api-client';
import {
  ShieldCheck,
  FileText,
  ArrowLeft,
  RefreshCw,
  AlertCircle,
  Building,
  UserCheck,
  ChevronLeft,
  ChevronRight,
  Lock,
} from 'lucide-react';

export default function AuditLogsPage() {
  const { user, accessToken, loading: authLoading } = useAuth();
  const router = useRouter();

  const [orgs, setOrgs] = useState<OrganizationItem[]>([]);
  const [selectedOrgId, setSelectedOrgId] = useState<string>('');
  const [orgsLoading, setOrgsLoading] = useState<boolean>(true);

  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [page, setPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalCount, setTotalCount] = useState<number>(0);

  const [logsLoading, setLogsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isForbidden, setIsForbidden] = useState<boolean>(false);

  // 1. Auth check
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth/login');
    }
  }, [authLoading, user, router]);

  // 2. Fetch Organizations
  useEffect(() => {
    if (!accessToken) return;

    async function loadOrgs() {
      setOrgsLoading(true);
      setError(null);
      try {
        const userOrgs = await fetchUserOrganizations(accessToken!);
        setOrgs(userOrgs);
        if (userOrgs.length > 0) {
          setSelectedOrgId(userOrgs[0].id);
        }
      } catch (err: unknown) {
        if (err instanceof ApiError) {
          setError(`Failed to load organizations (${err.statusCode}): ${err.message}`);
        } else if (err instanceof Error) {
          setError(err.message);
        }
      } finally {
        setOrgsLoading(false);
      }
    }

    loadOrgs();
  }, [accessToken]);

  // 3. Fetch Audit Logs when selectedOrgId or page changes
  useEffect(() => {
    if (!accessToken || !selectedOrgId) return;

    async function loadLogs() {
      setLogsLoading(true);
      setError(null);
      setIsForbidden(false);

      try {
        const response = await fetchAuditLogs(accessToken!, selectedOrgId, page, 20);
        setLogs(response.data);
        setTotalPages(response.meta.totalPages);
        setTotalCount(response.meta.total);
      } catch (err: unknown) {
        if (err instanceof ApiError) {
          if (err.statusCode === 403) {
            setIsForbidden(true);
            setError('Access Denied: You do not have permission (CUSTOMER_ADMIN or SUPER_ADMIN required) to view audit logs for this organization.');
          } else {
            setError(`API Error (${err.statusCode}): ${err.message}`);
          }
        } else if (err instanceof Error) {
          setError(err.message);
        } else {
          setError('An unexpected error occurred while fetching audit logs.');
        }
      } finally {
        setLogsLoading(false);
      }
    }

    loadLogs();
  }, [accessToken, selectedOrgId, page]);

  if (authLoading || (!user && orgsLoading)) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-3 text-slate-400">
          <RefreshCw className="w-8 h-8 animate-spin text-sky-400" />
          <p className="text-sm">Verifying session & loading organization context...</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header & Navigation */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-800 pb-6 gap-4">
          <div className="flex items-center gap-4">
            <Link
              href="/dashboard"
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors border border-slate-700"
              title="Return to Dashboard"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                <FileText className="w-7 h-7 text-sky-400" />
                Audit Logs
              </h1>
              <p className="text-xs text-slate-400 mt-0.5">
                Append-only, tenant-isolated system audit history (`GET /api/v1/audit-logs`)
              </p>
            </div>
          </div>

          {/* Organization Context Switcher */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-slate-800 border border-slate-700 px-3 py-1.5 rounded-lg">
              <Building className="w-4 h-4 text-sky-400 shrink-0" />
              <label className="text-xs text-slate-400 font-medium">Org:</label>
              {orgsLoading ? (
                <span className="text-xs text-slate-500 animate-pulse">Loading...</span>
              ) : orgs.length > 0 ? (
                <select
                  value={selectedOrgId}
                  onChange={(e) => {
                    setSelectedOrgId(e.target.value);
                    setPage(1);
                  }}
                  className="bg-transparent text-xs text-white focus:outline-none cursor-pointer font-medium"
                >
                  {orgs.map((org) => (
                    <option key={org.id} value={org.id} className="bg-slate-900 text-white">
                      {org.name} ({org.slug})
                    </option>
                  ))}
                </select>
              ) : (
                <span className="text-xs text-slate-400">No orgs available</span>
              )}
            </div>

            <button
              onClick={() => {
                if (accessToken && selectedOrgId) {
                  setPage(1);
                }
              }}
              disabled={logsLoading || !selectedOrgId}
              className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 px-3 py-1.5 rounded-lg text-xs text-slate-200 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${logsLoading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>

        {/* Security Banner */}
        <div className="bg-slate-800/40 border border-slate-700/60 rounded-xl p-4 flex items-start gap-3 text-xs">
          <ShieldCheck className="w-5 h-5 text-sky-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <div className="font-semibold text-slate-200">
              Tenant-Isolated Audit Traceability
            </div>
            <p className="text-slate-400 leading-relaxed">
              Historical audit records are immutable and append-only. Only authorized organization administrators (<code className="text-sky-300 font-mono">CUSTOMER_ADMIN</code> or <code className="text-sky-300 font-mono">SUPER_ADMIN</code>) may view this record. Cross-tenant access is strictly enforced server-side.
            </p>
          </div>
        </div>

        {/* Forbidden / Error Alert */}
        {error && (
          <div
            className={`p-4 rounded-xl border flex items-start gap-3 text-xs ${
              isForbidden
                ? 'bg-amber-950/40 border-amber-800/60 text-amber-200'
                : 'bg-rose-950/40 border-rose-800/60 text-rose-200'
            }`}
          >
            {isForbidden ? (
              <Lock className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            )}
            <div>
              <div className="font-semibold mb-1">
                {isForbidden ? 'Authorization Restrict' : 'Failed to Load Audit Logs'}
              </div>
              <p className="leading-relaxed">{error}</p>
            </div>
          </div>
        )}

        {/* Audit Log Table */}
        <div className="bg-slate-800/60 border border-slate-700/80 rounded-xl overflow-hidden shadow-xl">
          <div className="px-6 py-4 border-b border-slate-700/60 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-white flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-sky-400" />
              Event History Log
            </h2>
            <span className="text-xs text-slate-400 font-mono">
              Total Records: {totalCount}
            </span>
          </div>

          {logsLoading ? (
            <div className="py-16 text-center text-slate-400 text-xs flex flex-col items-center gap-3">
              <RefreshCw className="w-6 h-6 animate-spin text-sky-400" />
              <p>Fetching authorized audit records...</p>
            </div>
          ) : isForbidden ? (
            <div className="py-16 text-center text-slate-400 text-xs space-y-2">
              <Lock className="w-8 h-8 text-amber-400 mx-auto opacity-80" />
              <p className="text-slate-300 font-medium">Access Restricted to Administrators</p>
              <p className="text-slate-500 max-w-md mx-auto">
                Your current role in this organization does not permit viewing audit logs.
              </p>
            </div>
          ) : logs.length === 0 ? (
            <div className="py-16 text-center text-slate-400 text-xs space-y-2">
              <FileText className="w-8 h-8 text-slate-600 mx-auto" />
              <p className="text-slate-300 font-medium">No Audit Logs Found</p>
              <p className="text-slate-500">
                No recorded system events exist for this organization yet.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-900/80 text-slate-400 font-mono text-[11px] uppercase tracking-wider border-b border-slate-700/60">
                  <tr>
                    <th className="py-3.5 px-6">Timestamp</th>
                    <th className="py-3.5 px-6">Action</th>
                    <th className="py-3.5 px-6">Actor</th>
                    <th className="py-3.5 px-6">Target Resource</th>
                    <th className="py-3.5 px-6">Metadata</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/50">
                  {logs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3.5 px-6 font-mono text-slate-400 whitespace-nowrap">
                        {new Date(log.createdAt).toLocaleString()}
                      </td>
                      <td className="py-3.5 px-6 whitespace-nowrap">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono font-semibold bg-sky-950 text-sky-300 border border-sky-800/60">
                          {log.action}
                        </span>
                      </td>
                      <td className="py-3.5 px-6 font-mono text-slate-300 whitespace-nowrap">
                        {log.actor ? (
                          <div>
                            <div className="text-slate-200 font-sans font-medium">
                              {log.actor.firstName || log.actor.lastName
                                ? `${log.actor.firstName || ''} ${log.actor.lastName || ''}`.trim()
                                : log.actor.email}
                            </div>
                            <div className="text-[10px] text-slate-500 font-mono">
                              {log.actor.email}
                            </div>
                          </div>
                        ) : log.actorId ? (
                          <span className="text-slate-400 font-mono text-[10px] break-all">
                            {log.actorId}
                          </span>
                        ) : (
                          <span className="text-slate-500 italic">System / Server</span>
                        )}
                      </td>
                      <td className="py-3.5 px-6 font-mono text-slate-400 whitespace-nowrap">
                        {log.targetResource || <span className="text-slate-600">-</span>}
                      </td>
                      <td className="py-3.5 px-6 max-w-xs truncate">
                        {log.metadata ? (
                          <pre className="text-[10px] font-mono text-slate-300 bg-slate-900/80 p-1.5 rounded border border-slate-800 overflow-x-auto max-h-20">
                            {JSON.stringify(log.metadata, null, 2)}
                          </pre>
                        ) : (
                          <span className="text-slate-600">-</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination Footer */}
          {!logsLoading && !isForbidden && totalPages > 1 && (
            <div className="px-6 py-3 border-t border-slate-700/60 bg-slate-900/60 flex items-center justify-between text-xs">
              <span className="text-slate-400 font-mono">
                Page {page} of {totalPages}
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="flex items-center gap-1 bg-slate-800 hover:bg-slate-700 border border-slate-700 px-3 py-1.5 rounded-lg text-slate-300 transition-colors disabled:opacity-40"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Previous
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="flex items-center gap-1 bg-slate-800 hover:bg-slate-700 border border-slate-700 px-3 py-1.5 rounded-lg text-slate-300 transition-colors disabled:opacity-40"
                >
                  Next
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
