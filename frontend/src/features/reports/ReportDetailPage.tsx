import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { AppShell } from '../../components/AppShell';
import { StatusBadge, getStatusBadgeVariant } from '../../components/StatusBadge';
import { EvidenceCard } from '../../components/EvidenceCard';
import { LoadingState } from '../../components/LoadingState';
import { ErrorState } from '../../components/ErrorState';
import { formatDate, formatConfidence } from '../../lib/formatters';
import { Activity, ArrowLeft } from 'lucide-react';

export const ReportDetailPage: React.FC = () => {
  const { reportId } = useParams<{ reportId: string }>();
  const id = Number(reportId);
  const navigate = useNavigate();

  const {
    data: report,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['report', id],
    queryFn: () => api.getDebugReport(id),
    enabled: Boolean(id),
  });

  if (isLoading) {
    return (
      <AppShell breadcrumb={<span>Loading Report #{reportId}...</span>}>
        <LoadingState label="Loading debug report..." />
      </AppShell>
    );
  }

  if (isError || !report) {
    return (
      <AppShell breadcrumb={<span>Report Error</span>}>
        <ErrorState
          title="Failed to load debug report"
          message={error ? (error as any).message || String(error) : 'Report not found'}
          onRetry={refetch}
        />
      </AppShell>
    );
  }

  return (
    <AppShell
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
            onClick={() => navigate(`/projects/${report.project_id}/reports`)}
            className="hover:underline cursor-pointer text-slate-500"
          >
            Reports
          </span>
          <span>/</span>
          <span className="font-semibold text-slate-900 dark:text-slate-100">
            Report #{report.id}
          </span>
        </>
      }
    >
      <div className="space-y-6 max-w-4xl mx-auto">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 text-[12px] font-medium text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to workspace</span>
        </button>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm space-y-6">
          <div className="flex items-start justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h1 className="text-[18px] font-bold text-slate-900 dark:text-slate-100">
                  Debug Report #{report.id}
                </h1>
                <StatusBadge
                  label={report.failure_type}
                  variant={getStatusBadgeVariant(report.failure_type)}
                />
                <StatusBadge
                  label={report.status}
                  variant={getStatusBadgeVariant(report.status)}
                />
              </div>
              <p className="text-[12px] font-mono text-slate-400">
                Model: {report.model_name} · Generated {formatDate(report.created_at)}
              </p>
            </div>

            <div className="bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 px-4 py-2 rounded-lg text-center">
              <div className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-300 uppercase">
                Confidence
              </div>
              <div className="text-[18px] font-bold font-mono text-emerald-800 dark:text-emerald-200">
                {formatConfidence(report.confidence)}
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-[12px] font-semibold uppercase text-slate-400 tracking-wider mb-2">
              Executive Summary
            </h3>
            <p className="text-[13px] text-slate-800 dark:text-slate-200 leading-relaxed bg-slate-50 dark:bg-slate-800/60 p-4 rounded-lg border border-slate-100 dark:border-slate-800">
              {report.summary}
            </p>
          </div>

          <div>
            <h3 className="text-[12px] font-semibold uppercase text-slate-400 tracking-wider mb-2">
              Likely Root Cause
            </h3>
            {report.likely_root_cause ? (
              <p className="text-[13px] text-rose-900 dark:text-rose-200 leading-relaxed bg-rose-50 dark:bg-rose-950/40 p-4 rounded-lg border border-rose-200 dark:border-rose-900/60 font-medium">
                {report.likely_root_cause}
              </p>
            ) : (
              <p className="text-[12px] text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 p-3 rounded-lg border border-amber-200 dark:border-amber-900/60">
                Insufficient evidence to confirm root cause. Abstaining from hallucination.
              </p>
            )}
          </div>

          {report.suggested_fix && (
            <div>
              <h3 className="text-[12px] font-semibold uppercase text-slate-400 tracking-wider mb-2">
                Suggested Fix
              </h3>
              <p className="text-[13px] text-emerald-900 dark:text-emerald-200 leading-relaxed bg-emerald-50 dark:bg-emerald-950/40 p-4 rounded-lg border border-emerald-200 dark:border-emerald-900/60">
                {report.suggested_fix}
              </p>
            </div>
          )}

          <div>
            <h3 className="text-[12px] font-semibold uppercase text-slate-400 tracking-wider mb-3">
              Grounding Evidence Citations ({report.evidence?.length || 0})
            </h3>
            {report.evidence && report.evidence.length > 0 ? (
              <div className="space-y-3">
                {report.evidence.map((ev, idx) => (
                  <EvidenceCard key={idx} evidence={ev} />
                ))}
              </div>
            ) : (
              <p className="text-[12px] text-slate-400">No evidence citations attached.</p>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
};
