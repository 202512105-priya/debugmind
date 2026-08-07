import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { DebugReport } from '../../types';
import { AppShell } from '../../components/AppShell';
import { StatusBadge, getStatusBadgeVariant } from '../../components/StatusBadge';
import { EvidenceCard } from '../../components/EvidenceCard';
import { LoadingState } from '../../components/LoadingState';
import { ErrorState } from '../../components/ErrorState';
import { EmptyState } from '../../components/EmptyState';
import { formatDate, formatConfidence } from '../../lib/formatters';
import {
  Activity,
  Sparkles,
  Plus,
  Play,
  CheckCircle2
} from 'lucide-react';

export const ReportsPage: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const id = Number(projectId);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [selectedReportId, setSelectedReportId] = useState<number | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [query, setQuery] = useState('auth token failure 401');
  const [selectedLogId, setSelectedLogId] = useState<number | undefined>(undefined);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Queries
  const { data: project } = useQuery({
    queryKey: ['project', id],
    queryFn: () => api.getProject(id),
    enabled: Boolean(id),
  });

  const { data: logs } = useQuery({
    queryKey: ['logs', id],
    queryFn: () => api.getProjectLogs(id),
    enabled: Boolean(id),
  });

  const {
    data: reports,
    isLoading: loadingReports,
    isError: errorReports,
    refetch: refetchReports,
  } = useQuery({
    queryKey: ['reports', id],
    queryFn: () => api.getProjectDebugReports(id),
    enabled: Boolean(id),
  });

  const activeReport =
    reports?.find((r) => r.id === selectedReportId) || (reports && reports.length > 0 ? reports[reports.length - 1] : null);

  // Mutation to generate report
  const createReportMutation = useMutation({
    mutationFn: (data: { project_id: number; query?: string; uploaded_log_id?: number }) =>
      api.createDebugReport(data),
    onSuccess: (newReport) => {
      queryClient.invalidateQueries({ queryKey: ['reports', id] });
      setSelectedReportId(newReport.id);
      setIsCreateOpen(false);
      showToast(`Dynamic debug report #${newReport.id} generated!`);
    },
  });

  return (
    <AppShell
      projectName={project?.name}
      breadcrumb={
        <>
          <span
            onClick={() => navigate('/projects')}
            className="hover:underline cursor-pointer text-slate-500"
          >
            Projects
          </span>
          <span>/</span>
          <span
            onClick={() => navigate(`/projects/${id}`)}
            className="hover:underline cursor-pointer text-slate-500"
          >
            {project?.name || `Project #${id}`}
          </span>
          <span>/</span>
          <span className="font-semibold text-slate-900 dark:text-slate-100">Debug Reports</span>
        </>
      }
      actions={
        <button
          onClick={() => setIsCreateOpen(!isCreateOpen)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-[12px] font-medium shadow-sm transition-all"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Generate RAG Report</span>
        </button>
      }
    >
      <div className="space-y-6 max-w-6xl mx-auto">
        {toastMessage && (
          <div className="fixed bottom-5 right-5 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-lg shadow-lg text-[13px] flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>{toastMessage}</span>
          </div>
        )}

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-[18px] font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Activity className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              <span>Grounded AI Debug Reports</span>
            </h1>
            <p className="text-[12px] text-slate-500 dark:text-slate-400 mt-0.5">
              Structured RAG debugging reports backed by code chunk citations and evidence verifiers.
            </p>
          </div>
        </div>

        {/* Generate Report Inline Form */}
        {isCreateOpen && (
          <div className="bg-white dark:bg-slate-900 border border-blue-200 dark:border-blue-800 rounded-xl p-5 shadow-md space-y-4">
            <h3 className="text-[14px] font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-blue-600" />
              <span>Generate Dynamic RAG Debugging Report</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="md:col-span-2">
                <label className="block text-[11px] font-medium text-slate-500 mb-1">
                  Debug Query / Issue Focus
                </label>
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="e.g. auth token failure 401"
                  className="w-full border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-md px-3 py-1.5 text-[12px] text-slate-900 dark:text-slate-100 outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-500 mb-1">
                  Associated CI Log
                </label>
                <select
                  value={selectedLogId === undefined ? 'none' : selectedLogId}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === 'none') setSelectedLogId(undefined);
                    else setSelectedLogId(Number(val));
                  }}
                  className="w-full border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-md px-3 py-1.5 text-[12px] text-slate-900 dark:text-slate-100 outline-none focus:border-blue-500"
                >
                  <option value="none">None (Search Source Code & Embeddings)</option>
                  {logs?.map((l) => (
                    <option key={l.id} value={l.id}>
                      Log #{l.id}: {l.filename}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={() => setIsCreateOpen(false)}
                className="px-3 py-1.5 text-[12px] text-slate-500 hover:text-slate-700"
              >
                Cancel
              </button>
              <button
                onClick={() =>
                  createReportMutation.mutate({
                    project_id: id,
                    query,
                    uploaded_log_id: selectedLogId || (logs && logs.length > 0 ? logs[0].id : undefined),
                  })
                }
                disabled={createReportMutation.isPending}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-[12px] font-medium transition-all shadow-sm disabled:opacity-50"
              >
                <Play className="w-3.5 h-3.5" />
                <span>{createReportMutation.isPending ? 'Generating Report...' : 'Generate RAG Report'}</span>
              </button>
            </div>
          </div>
        )}

        {loadingReports ? (
          <LoadingState label="Loading debug reports..." />
        ) : errorReports ? (
          <ErrorState message="Failed to load debug reports" onRetry={refetchReports} />
        ) : !reports || reports.length === 0 ? (
          <EmptyState
            title="No debug reports generated yet"
            description="Run the LangGraph debug agent or click 'Generate RAG Report' to produce evidence-grounded reports."
            icon={<Activity className="w-8 h-8 text-slate-400" />}
            action={
              <button
                onClick={() => setIsCreateOpen(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-[12px] font-medium shadow-sm transition-all"
              >
                <Sparkles className="w-4 h-4" />
                <span>Generate RAG Report</span>
              </button>
            }
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Left Reports List */}
            <div className="md:col-span-1 space-y-2">
              <h3 className="text-[13px] font-semibold text-slate-800 dark:text-slate-200">
                Generated Reports ({reports.length})
              </h3>
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg divide-y divide-slate-100 dark:divide-slate-800 max-h-[600px] overflow-y-auto">
                {reports.map((report) => (
                  <div
                    key={report.id}
                    onClick={() => setSelectedReportId(report.id)}
                    className={`p-3.5 cursor-pointer text-[12px] transition-colors ${
                      activeReport?.id === report.id
                        ? 'bg-blue-50 dark:bg-blue-950/60 border-l-4 border-blue-600'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1 mb-1.5">
                      <span className="font-bold text-slate-900 dark:text-slate-100">
                        Report #{report.id}
                      </span>
                      <StatusBadge
                        label={report.failure_type}
                        variant={getStatusBadgeVariant(report.failure_type)}
                      />
                    </div>
                    <p className="text-[11.5px] text-slate-600 dark:text-slate-300 line-clamp-2 mb-2 leading-relaxed">
                      {report.summary}
                    </p>
                    <div className="flex items-center justify-between text-[10px] text-slate-400">
                      <span>Confidence {formatConfidence(report.confidence)}</span>
                      <span>{formatDate(report.created_at)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right Active Report Detail View */}
            <div className="md:col-span-2 space-y-5">
              {activeReport && (
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm space-y-5">
                  <div className="flex items-start justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h2 className="text-[16px] font-bold text-slate-900 dark:text-slate-100">
                          Debug Report #{activeReport.id}
                        </h2>
                        <StatusBadge
                          label={activeReport.failure_type}
                          variant={getStatusBadgeVariant(activeReport.failure_type)}
                        />
                        <StatusBadge
                          label={activeReport.status}
                          variant={getStatusBadgeVariant(activeReport.status)}
                        />
                      </div>
                      <p className="text-[11px] font-mono text-slate-400">
                        Model: {activeReport.model_name} · Generated {formatDate(activeReport.created_at)}
                      </p>
                    </div>

                    <div className="bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 px-3 py-1.5 rounded-lg text-center">
                      <div className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-300 uppercase">
                        Confidence
                      </div>
                      <div className="text-[16px] font-bold font-mono text-emerald-800 dark:text-emerald-200">
                        {formatConfidence(activeReport.confidence)}
                      </div>
                    </div>
                  </div>

                  {/* Summary */}
                  <div>
                    <h4 className="text-[12px] font-semibold uppercase text-slate-400 tracking-wider mb-1.5">
                      Executive Summary
                    </h4>
                    <p className="text-[13px] text-slate-800 dark:text-slate-200 leading-relaxed bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-lg border border-slate-100 dark:border-slate-800">
                      {activeReport.summary}
                    </p>
                  </div>

                  {/* Likely Root Cause */}
                  <div>
                    <h4 className="text-[12px] font-semibold uppercase text-slate-400 tracking-wider mb-1.5">
                      Likely Root Cause
                    </h4>
                    {activeReport.likely_root_cause ? (
                      <p className="text-[13px] text-rose-900 dark:text-rose-200 leading-relaxed bg-rose-50 dark:bg-rose-950/40 p-3.5 rounded-lg border border-rose-200 dark:border-rose-900/60 font-medium">
                        {activeReport.likely_root_cause}
                      </p>
                    ) : (
                      <p className="text-[12px] text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 p-3 rounded-lg border border-amber-200 dark:border-amber-900/60">
                        Insufficient evidence to confirm root cause. Abstaining from hallucination.
                      </p>
                    )}
                  </div>

                  {/* Suggested Fix */}
                  {activeReport.suggested_fix && (
                    <div>
                      <h4 className="text-[12px] font-semibold uppercase text-slate-400 tracking-wider mb-1.5">
                        Suggested Fix
                      </h4>
                      <p className="text-[13px] text-emerald-900 dark:text-emerald-200 leading-relaxed bg-emerald-50 dark:bg-emerald-950/40 p-3.5 rounded-lg border border-emerald-200 dark:border-emerald-900/60">
                        {activeReport.suggested_fix}
                      </p>
                    </div>
                  )}

                  {/* Evidence Citations */}
                  <div>
                    <h4 className="text-[12px] font-semibold uppercase text-slate-400 tracking-wider mb-2">
                      Grounding Evidence Citations ({activeReport.evidence?.length || 0})
                    </h4>
                    {activeReport.evidence && activeReport.evidence.length > 0 ? (
                      <div className="space-y-3">
                        {activeReport.evidence.map((ev, idx) => (
                          <EvidenceCard key={idx} evidence={ev} />
                        ))}
                      </div>
                    ) : (
                      <p className="text-[12px] text-slate-400">No evidence citations attached.</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
};
