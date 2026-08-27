import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { UploadedLog, ParsedLogEvent } from '../../types';
import { AppShell } from '../../components/AppShell';
import { LogViewer } from '../../components/LogViewer';
import { StatusBadge, getStatusBadgeVariant } from '../../components/StatusBadge';
import { LoadingState } from '../../components/LoadingState';
import { ErrorState } from '../../components/ErrorState';
import { EmptyState } from '../../components/EmptyState';
import { formatDate } from '../../lib/formatters';
import {
  FileText,
  Upload,
  Play,
  Layers,
  AlertTriangle,
  CheckCircle2,
  FileCode
} from 'lucide-react';

export const LogsPage: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const id = Number(projectId);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<'upload' | 'paste'>('upload');
  const [filename, setFilename] = useState('failed_ci_run.log');
  const [rawContent, setRawContent] = useState(
    `FAILED tests/test_auth.py::test_login_success\nE   AssertionError: assert 401 == 200\nE    +  where 401 = <Response [401]>.status_code\nERROR app.auth.middleware:middleware.py:48 tenant_id required`
  );
  const [selectedLogId, setSelectedLogId] = useState<number | null>(null);
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

  const {
    data: logs,
    isLoading: loadingLogs,
    isError: errorLogs,
    refetch: refetchLogs,
  } = useQuery({
    queryKey: ['logs', id],
    queryFn: () => api.getProjectLogs(id),
    enabled: Boolean(id),
  });

  const activeLogId = selectedLogId || (logs && logs.length > 0 ? logs[0].id : null);

  const { data: activeLog } = useQuery({
    queryKey: ['log', activeLogId],
    queryFn: () => (activeLogId ? api.getLog(activeLogId) : Promise.resolve(null)),
    enabled: Boolean(activeLogId),
  });

  const { data: events } = useQuery({
    queryKey: ['log-events', activeLogId],
    queryFn: () => (activeLogId ? api.getLogEvents(activeLogId) : Promise.resolve([])),
    enabled: Boolean(activeLogId),
  });

  // Mutations
  const uploadMutation = useMutation({
    mutationFn: (data: { filename: string; raw_content: string }) =>
      api.uploadLog(id, data),
    onSuccess: (newLog) => {
      queryClient.invalidateQueries({ queryKey: ['logs', id] });
      setSelectedLogId(newLog.id);
      showToast('Log uploaded successfully!');
    },
  });

  const parseMutation = useMutation({
    mutationFn: (logId: number) => api.parseLog(logId),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['log-events', activeLogId] });
      showToast(`Parsed ${res.events_parsed} failure events!`);
    },
  });

  const chunkLogMutation = useMutation({
    mutationFn: (logId: number) => api.chunkLog(logId),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['chunks', id] });
      showToast(`Created ${res.chunks_created} log failure chunks!`);
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
          <span className="font-semibold text-slate-900 dark:text-slate-100">CI Failure Logs</span>
        </>
      }
      actions={
        activeLogId ? (
          <div className="flex items-center gap-2">
            <button
              onClick={() => parseMutation.mutate(activeLogId)}
              disabled={parseMutation.isPending}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-md text-[12px] font-medium transition-all disabled:opacity-50"
            >
              <Play className="w-3.5 h-3.5" />
              <span>{parseMutation.isPending ? 'Parsing...' : 'Parse Log Events'}</span>
            </button>

            <button
              onClick={() => chunkLogMutation.mutate(activeLogId)}
              disabled={chunkLogMutation.isPending}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-[12px] font-medium transition-all disabled:opacity-50"
            >
              <Layers className="w-3.5 h-3.5" />
              <span>{chunkLogMutation.isPending ? 'Chunking...' : 'Chunk Log'}</span>
            </button>
          </div>
        ) : undefined
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
            <h1 className="text-[18px] font-bold text-slate-900 dark:text-slate-100">
              CI Failure Logs & Parsing
            </h1>
            <p className="text-[12px] text-slate-500 dark:text-slate-400 mt-0.5">
              Upload raw build or test logs, parse failure tracebacks, and prepare log chunks.
            </p>
          </div>
        </div>

        {/* Upload & Paste Form Box */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setActiveTab('upload')}
                className={`px-3 py-1 rounded-md text-[12px] font-medium transition-colors ${
                  activeTab === 'upload'
                    ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                Upload File
              </button>
              <button
                onClick={() => setActiveTab('paste')}
                className={`px-3 py-1 rounded-md text-[12px] font-medium transition-colors ${
                  activeTab === 'paste'
                    ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                Paste Raw Log
              </button>
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-[11px] font-medium text-slate-500 mb-1">
                Log Filename
              </label>
              <input
                type="text"
                value={filename}
                onChange={(e) => setFilename(e.target.value)}
                className="w-full border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-md px-3 py-1.5 text-[12px] text-slate-900 dark:text-slate-100 outline-none focus:border-blue-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-500 mb-1">
                Raw Log Contents
              </label>
              <textarea
                value={rawContent}
                onChange={(e) => setRawContent(e.target.value)}
                rows={4}
                className="w-full border border-slate-300 dark:border-slate-700 bg-slate-950 text-slate-100 font-mono rounded-md px-3 py-2 text-[11.5px] outline-none focus:border-blue-500 leading-relaxed resize-y"
              />
            </div>

            <div className="flex justify-end">
              <button
                onClick={() =>
                  uploadMutation.mutate({
                    filename,
                    raw_content: rawContent,
                  })
                }
                disabled={!rawContent.trim() || uploadMutation.isPending}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-[12px] font-medium transition-all shadow-sm disabled:opacity-50"
              >
                <Upload className="w-4 h-4" />
                <span>{uploadMutation.isPending ? 'Uploading...' : 'Upload CI Log'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Logs List & Viewer Section */}
        {loadingLogs ? (
          <LoadingState label="Loading project logs..." />
        ) : errorLogs ? (
          <ErrorState message="Failed to load project logs" onRetry={refetchLogs} />
        ) : !logs || logs.length === 0 ? (
          <EmptyState
            title="No logs uploaded yet"
            description="Upload or paste a pytest failure log to analyze tracebacks and run AI debugging."
            icon={<FileText className="w-8 h-8 text-slate-400" />}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Left list of uploaded logs */}
            <div className="md:col-span-1 space-y-2">
              <h3 className="text-[13px] font-semibold text-slate-800 dark:text-slate-200">
                Uploaded Logs ({logs.length})
              </h3>
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg divide-y divide-slate-100 dark:divide-slate-800 max-h-[500px] overflow-y-auto">
                {logs.map((log) => (
                  <div
                    key={log.id}
                    onClick={() => setSelectedLogId(log.id)}
                    className={`p-3 cursor-pointer text-[12px] transition-colors ${
                      (selectedLogId || logs[0].id) === log.id
                        ? 'bg-blue-50 dark:bg-blue-950/60 border-l-4 border-blue-600'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <span className="font-semibold font-mono text-slate-900 dark:text-slate-100 truncate">
                        {log.filename}
                      </span>
                      <StatusBadge label={`#${log.id}`} variant="slate" dot={false} />
                    </div>
                    <div className="text-[10px] text-slate-500">
                      Uploaded {formatDate(log.created_at)}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right log viewer & parsed failure cards */}
            <div className="md:col-span-2 space-y-4">
              {activeLog && (
                <div className="space-y-4">
                  <div>
                    <h3 className="text-[13px] font-semibold text-slate-800 dark:text-slate-200 mb-2">
                      Raw Log Viewer — {activeLog.filename}
                    </h3>
                    <LogViewer rawContent={activeLog.raw_content} />
                  </div>

                  {/* Parsed Events Cards */}
                  {events && events.length > 0 && (
                    <div className="space-y-3">
                      <h3 className="text-[13px] font-semibold text-slate-800 dark:text-slate-200">
                        Parsed Failure Events ({events.length})
                      </h3>
                      {events.map((ev) => (
                        <div
                          key={ev.id}
                          className="bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-900/60 rounded-xl p-4 shadow-sm space-y-2"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 font-mono text-[13px] font-bold text-rose-600 dark:text-rose-400">
                              <AlertTriangle className="w-4 h-4 shrink-0" />
                              <span>{ev.test_name || ev.event_type}</span>
                            </div>
                            <StatusBadge
                              label={ev.error_type || 'Error'}
                              variant="red"
                            />
                          </div>

                          {ev.message && (
                            <p className="text-[12px] text-slate-700 dark:text-slate-300 font-mono bg-rose-50 dark:bg-rose-950/40 p-2.5 rounded border border-rose-100 dark:border-rose-900/40">
                              {ev.message}
                            </p>
                          )}

                          {ev.file_path && (
                            <div className="flex items-center gap-1.5 text-[11px] font-mono text-blue-600 dark:text-blue-400">
                              <FileCode className="w-3.5 h-3.5" />
                              <span>
                                {ev.file_path}
                                {ev.line_number ? `:${ev.line_number}` : ''}
                              </span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
};
