import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { AgentRun, AgentStep } from '../../types';
import { AppShell } from '../../components/AppShell';
import { StatusBadge, getStatusBadgeVariant } from '../../components/StatusBadge';
import { AgentTimeline } from '../../components/AgentTimeline';
import { JsonViewer } from '../../components/JsonViewer';
import { LoadingState } from '../../components/LoadingState';
import { ErrorState } from '../../components/ErrorState';
import {
  Sparkles,
  Play,
  ArrowRight,
  Code,
  FileText,
  Layers,
  Search,
  Filter
} from 'lucide-react';

export const AnalysisPage: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const id = Number(projectId);
  const navigate = useNavigate();

  const [query, setQuery] = useState('why is test_login_success returning 401 status?');
  const [searchTarget, setSearchTarget] = useState<'all' | 'code' | 'logs'>('all');
  const [selectedLogId, setSelectedLogId] = useState<number | undefined>(undefined);
  const [activeRunId, setActiveRunId] = useState<number | null>(null);
  const [selectedStep, setSelectedStep] = useState<AgentStep | null>(null);

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

  // Polling query for active agent run
  const { data: agentRun } = useQuery({
    queryKey: ['agent-run', activeRunId],
    queryFn: () => (activeRunId ? api.getAgentRun(activeRunId) : Promise.resolve(null)),
    enabled: Boolean(activeRunId),
    refetchInterval: (query) => {
      const run = query.state.data as AgentRun | null;
      return run && run.status === 'running' ? 2000 : false;
    },
  });

  const { data: runSteps } = useQuery({
    queryKey: ['agent-run-steps', activeRunId],
    queryFn: () => (activeRunId ? api.getAgentRunSteps(activeRunId) : Promise.resolve([])),
    enabled: Boolean(activeRunId),
    refetchInterval: () => (agentRun && agentRun.status === 'running' ? 2000 : false),
  });

  // Trigger agent run mutation
  const runMutation = useMutation({
    mutationFn: (data: { project_id: number; uploaded_log_id?: number; query?: string }) =>
      api.createAgentRun(data),
    onSuccess: (newRun) => {
      setActiveRunId(newRun.id);
    },
  });

  const handleStartRun = (e: React.FormEvent) => {
    e.preventDefault();

    // Construct augmented query based on target scope filter if specified
    let targetQuery = query.trim();
    if (searchTarget === 'code') {
      targetQuery = `[Target Scope: Source Code Files] ${targetQuery}`;
    } else if (searchTarget === 'logs') {
      targetQuery = `[Target Scope: CI Failure Logs] ${targetQuery}`;
    }

    runMutation.mutate({
      project_id: id,
      uploaded_log_id: selectedLogId,
      query: targetQuery,
    });
  };

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
          <span className="font-semibold text-slate-900 dark:text-slate-100">
            LangGraph Debug Agent
          </span>
        </>
      }
    >
      <div className="space-y-6 max-w-6xl mx-auto">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-[18px] font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              <span>LangGraph Debugging Agent Workflow</span>
            </h1>
            <p className="text-[12px] text-slate-500 dark:text-slate-400 mt-0.5">
              Execute bounded state machine debugging with target error options, query planning, and evidence verifiers.
            </p>
          </div>
        </div>

        {/* Input Query & Target Selection Form */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
          <form onSubmit={handleStartRun} className="space-y-4">
            <div>
              <label className="block text-[12px] font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Natural Language Debug Query / Error Description
              </label>
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="e.g. why is test_login_success returning 401 status?"
                className="w-full border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-md px-3.5 py-2 text-[13px] text-slate-900 dark:text-slate-100 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/50 transition-all"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Target Search Scope */}
              <div>
                <label className="block text-[12px] font-medium text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                  <Filter className="w-3.5 h-3.5 text-blue-500" />
                  <span>Debugging Focus / Search Target</span>
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setSearchTarget('all')}
                    className={`flex flex-col items-center justify-center p-2.5 rounded-lg border text-[11px] font-medium transition-all ${
                      searchTarget === 'all'
                        ? 'bg-blue-50 dark:bg-blue-950/60 border-blue-500 text-blue-700 dark:text-blue-300 shadow-sm'
                        : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                    }`}
                  >
                    <Layers className="w-4 h-4 mb-1 text-blue-500" />
                    <span>All Evidence</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSearchTarget('code')}
                    className={`flex flex-col items-center justify-center p-2.5 rounded-lg border text-[11px] font-medium transition-all ${
                      searchTarget === 'code'
                        ? 'bg-purple-50 dark:bg-purple-950/60 border-purple-500 text-purple-700 dark:text-purple-300 shadow-sm'
                        : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                    }`}
                  >
                    <Code className="w-4 h-4 mb-1 text-purple-500" />
                    <span>Source Code</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSearchTarget('logs')}
                    className={`flex flex-col items-center justify-center p-2.5 rounded-lg border text-[11px] font-medium transition-all ${
                      searchTarget === 'logs'
                        ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-500 text-emerald-700 dark:text-emerald-300 shadow-sm'
                        : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                    }`}
                  >
                    <FileText className="w-4 h-4 mb-1 text-emerald-500" />
                    <span>CI Logs</span>
                  </button>
                </div>
              </div>

              {/* Context Log Selection */}
              <div>
                <label className="block text-[12px] font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Context Log File <span className="text-slate-400 font-normal">(optional)</span>
                </label>
                <select
                  value={selectedLogId === undefined ? 'none' : selectedLogId}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === 'none') setSelectedLogId(undefined);
                    else setSelectedLogId(Number(val));
                  }}
                  className="w-full border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-md px-3 py-2 text-[13px] text-slate-900 dark:text-slate-100 outline-none focus:border-blue-500"
                >
                  <option value="none">None (Search Source Code & Embeddings)</option>
                  {logs?.map((log) => (
                    <option key={log.id} value={log.id}>
                      Log #{log.id}: {log.filename}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-slate-400 mt-1">
                  Select a specific CI log file or leave as "None" to search across source code files.
                </p>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={runMutation.isPending || (agentRun && agentRun.status === 'running')}
                className="inline-flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-[13px] font-medium shadow-md transition-all disabled:opacity-50"
              >
                <Play className="w-4 h-4" />
                <span>
                  {runMutation.isPending || (agentRun && agentRun.status === 'running')
                    ? 'Running Agent...'
                    : 'Run DebugMind Agent'}
                </span>
              </button>
            </div>
          </form>
        </div>

        {/* Workflow Execution Trace Output */}
        {agentRun && (
          <div className="space-y-5">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 flex items-center justify-center text-blue-600 dark:text-blue-400">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-[15px] font-bold text-slate-900 dark:text-slate-100">
                      Agent Run #{agentRun.id}
                    </h3>
                    <StatusBadge
                      label={agentRun.status}
                      variant={getStatusBadgeVariant(agentRun.status)}
                    />
                  </div>
                  <p className="text-[12px] text-slate-500 mt-0.5 font-mono">
                    Query: "{agentRun.query}"
                  </p>
                </div>
              </div>

              {agentRun.final_report_id && (
                <button
                  onClick={() => navigate(`/reports/${agentRun.final_report_id}`)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md text-[12px] font-semibold shadow-sm transition-all"
                >
                  <span>Open Debug Report #{agentRun.final_report_id}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Timeline & Step Inspector */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-3">
                <h3 className="text-[13px] font-semibold text-slate-800 dark:text-slate-200">
                  Execution State Machine Steps
                </h3>
                <AgentTimeline
                  steps={runSteps || []}
                  selectedStepId={selectedStep?.id}
                  onSelectStep={(step) => setSelectedStep(step)}
                />
              </div>

              <div className="space-y-3">
                <h3 className="text-[13px] font-semibold text-slate-800 dark:text-slate-200">
                  Step Input / Output Payload Inspector
                </h3>
                {selectedStep ? (
                  <div className="space-y-3">
                    <JsonViewer
                      title={`Step Output (${selectedStep.step_name})`}
                      data={selectedStep.output_json}
                    />
                    <JsonViewer
                      title={`Step Input (${selectedStep.step_name})`}
                      data={selectedStep.input_json}
                    />
                  </div>
                ) : (
                  <div className="p-8 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-lg text-[12px] text-slate-500">
                    Click any step in the timeline to inspect its structured JSON payload
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
};
