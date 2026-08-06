import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { AppShell } from '../../components/AppShell';
import { MetricCard } from '../../components/MetricCard';
import { StatusBadge } from '../../components/StatusBadge';
import { LoadingState } from '../../components/LoadingState';
import { ErrorState } from '../../components/ErrorState';
import { formatDate } from '../../lib/formatters';
import {
  FolderGit2,
  FileText,
  Layers,
  Cpu,
  Activity,
  ArrowRight,
  Sparkles,
  Database,
  ShieldCheck,
  Play
} from 'lucide-react';

export const ProjectWorkspacePage: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const id = Number(projectId);
  const navigate = useNavigate();

  const { data: project, isLoading: loadingProject, isError, error, refetch } = useQuery({
    queryKey: ['project', id],
    queryFn: () => api.getProject(id),
    enabled: Boolean(id),
  });

  const { data: repos } = useQuery({
    queryKey: ['repositories', id],
    queryFn: () => api.getRepositories(id),
    enabled: Boolean(id),
  });

  const { data: logs } = useQuery({
    queryKey: ['logs', id],
    queryFn: () => api.getProjectLogs(id),
    enabled: Boolean(id),
  });

  const { data: chunks } = useQuery({
    queryKey: ['chunks', id],
    queryFn: () => api.getProjectChunks(id),
    enabled: Boolean(id),
  });

  const { data: reports } = useQuery({
    queryKey: ['reports', id],
    queryFn: () => api.getProjectDebugReports(id),
    enabled: Boolean(id),
  });

  if (loadingProject) {
    return (
      <AppShell breadcrumb={<span>Loading...</span>}>
        <LoadingState label="Loading project workspace..." />
      </AppShell>
    );
  }

  if (isError || !project) {
    return (
      <AppShell breadcrumb={<span>Error</span>}>
        <ErrorState
          title="Failed to load project workspace"
          message={error ? (error as any).message || String(error) : 'Project not found'}
          onRetry={refetch}
        />
      </AppShell>
    );
  }

  const latestReport = reports && reports.length > 0 ? reports[reports.length - 1] : null;

  return (
    <AppShell
      projectName={project.name}
      breadcrumb={
        <>
          <span
            onClick={() => navigate('/projects')}
            className="hover:underline cursor-pointer text-slate-500 dark:text-slate-400"
          >
            Projects
          </span>
          <span>/</span>
          <span className="font-semibold text-slate-900 dark:text-slate-100">{project.name}</span>
        </>
      }
      actions={
        <button
          onClick={() => navigate(`/projects/${id}/analysis`)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-[12px] font-medium shadow-sm transition-all"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Run Debug Agent</span>
        </button>
      }
    >
      <div className="space-y-6 max-w-6xl mx-auto">
        {/* Banner Alert for Latest Status */}
        {latestReport && (
          <div className="bg-slate-900 text-white rounded-xl p-4 flex items-center justify-between shadow-md">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center shrink-0">
                <Activity className="w-4 h-4 text-white" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[13px] font-semibold">Latest Debug Report #{latestReport.id}</span>
                  <StatusBadge label={latestReport.failure_type} variant="red" dot />
                </div>
                <p className="text-[12px] text-slate-300 truncate mt-0.5">{latestReport.summary}</p>
              </div>
            </div>
            <button
              onClick={() => navigate(`/projects/${id}/reports`)}
              className="inline-flex items-center gap-1 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-md text-[12px] font-medium shrink-0 transition-colors"
            >
              <span>View Report</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Overview Metrics Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <MetricCard
            label="Repositories"
            value={repos ? repos.length : 0}
            subtext="Registered code repos"
            icon={<FolderGit2 className="w-4 h-4" />}
            onClick={() => navigate(`/projects/${id}/repository`)}
          />
          <MetricCard
            label="Logs Uploaded"
            value={logs ? logs.length : 0}
            subtext="CI & test failure logs"
            icon={<FileText className="w-4 h-4" />}
            onClick={() => navigate(`/projects/${id}/logs`)}
          />
          <MetricCard
            label="Code Chunks"
            value={chunks ? chunks.length : 0}
            subtext="AST & trace blocks"
            icon={<Layers className="w-4 h-4" />}
          />
          <MetricCard
            label="Embeddings"
            value={chunks ? chunks.filter(c => c.content).length : 0}
            subtext="Vector store indexed"
            icon={<Database className="w-4 h-4" />}
          />
          <MetricCard
            label="Debug Reports"
            value={reports ? reports.length : 0}
            subtext="AI RAG reports"
            icon={<Activity className="w-4 h-4" />}
            onClick={() => navigate(`/projects/${id}/reports`)}
          />
          <MetricCard
            label="System Health"
            value="100%"
            subtext="PostgreSQL & pgvector"
            icon={<ShieldCheck className="w-4 h-4 text-emerald-500" />}
          />
        </div>

        {/* Quick Action Navigation Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div
            onClick={() => navigate(`/projects/${id}/repository`)}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 cursor-pointer hover:border-blue-400 dark:hover:border-blue-600 transition-all group"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/60 flex items-center justify-center text-blue-600 dark:text-blue-400">
                <FolderGit2 className="w-4 h-4" />
              </div>
              <ArrowRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 transition-transform" />
            </div>
            <h3 className="text-[14px] font-semibold text-slate-900 dark:text-slate-100">
              Repositories & Chunking
            </h3>
            <p className="text-[12px] text-slate-500 dark:text-slate-400 mt-1">
              Ingest repositories, extract AST code chunks, and build vector embeddings.
            </p>
          </div>

          <div
            onClick={() => navigate(`/projects/${id}/logs`)}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 cursor-pointer hover:border-blue-400 dark:hover:border-blue-600 transition-all group"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                <FileText className="w-4 h-4" />
              </div>
              <ArrowRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 transition-transform" />
            </div>
            <h3 className="text-[14px] font-semibold text-slate-900 dark:text-slate-100">
              CI Logs & Parsing
            </h3>
            <p className="text-[12px] text-slate-500 dark:text-slate-400 mt-1">
              Upload CI failure logs, parse pytest tracebacks, and view error highlights.
            </p>
          </div>

          <div
            onClick={() => navigate(`/projects/${id}/analysis`)}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 cursor-pointer hover:border-blue-400 dark:hover:border-blue-600 transition-all group"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="w-8 h-8 rounded-lg bg-purple-50 dark:bg-purple-950/60 flex items-center justify-center text-purple-600 dark:text-purple-400">
                <Cpu className="w-4 h-4" />
              </div>
              <ArrowRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 transition-transform" />
            </div>
            <h3 className="text-[14px] font-semibold text-slate-900 dark:text-slate-100">
              LangGraph Agent Analysis
            </h3>
            <p className="text-[12px] text-slate-500 dark:text-slate-400 mt-1">
              Run multi-step debugging workflows with failure classification and verifiers.
            </p>
          </div>
        </div>
      </div>
    </AppShell>
  );
};
