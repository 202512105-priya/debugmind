import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { AgentRun, AgentStep } from '../../types';
import { AppShell } from '../../components/AppShell';
import { StatusBadge, getStatusBadgeVariant } from '../../components/StatusBadge';
import { AgentTimeline } from '../../components/AgentTimeline';
import { JsonViewer } from '../../components/JsonViewer';
import { LoadingState } from '../../components/LoadingState';
import { ErrorState } from '../../components/ErrorState';
import { Sparkles, ArrowLeft, ArrowRight } from 'lucide-react';

export const AgentTracePage: React.FC = () => {
  const { projectId, agentRunId } = useParams<{ projectId: string; agentRunId: string }>();
  const id = Number(projectId);
  const runId = Number(agentRunId);
  const navigate = useNavigate();

  const [selectedStep, setSelectedStep] = useState<AgentStep | null>(null);

  const {
    data: agentRun,
    isLoading: loadingRun,
    isError: errorRun,
    refetch: refetchRun,
  } = useQuery({
    queryKey: ['agent-run', runId],
    queryFn: () => api.getAgentRun(runId),
    enabled: Boolean(runId),
    refetchInterval: (query) => {
      const run = query.state.data as AgentRun | null;
      return run && run.status === 'running' ? 2000 : false;
    },
  });

  const { data: runSteps } = useQuery({
    queryKey: ['agent-run-steps', runId],
    queryFn: () => api.getAgentRunSteps(runId),
    enabled: Boolean(runId),
    refetchInterval: () => (agentRun && agentRun.status === 'running' ? 2000 : false),
  });

  if (loadingRun) {
    return (
      <AppShell breadcrumb={<span>Loading Agent Trace...</span>}>
        <LoadingState label="Loading agent trace steps..." />
      </AppShell>
    );
  }

  if (errorRun || !agentRun) {
    return (
      <AppShell breadcrumb={<span>Agent Run Error</span>}>
        <ErrorState
          title="Failed to load agent run"
          message={errorRun ? (errorRun as any).message || String(errorRun) : 'Agent run not found'}
          onRetry={refetchRun}
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
            onClick={() => navigate(`/projects/${id}/analysis`)}
            className="hover:underline cursor-pointer text-slate-500"
          >
            Analysis
          </span>
          <span>/</span>
          <span className="font-semibold text-slate-900 dark:text-slate-100">
            Agent Run #{agentRun.id}
          </span>
        </>
      }
    >
      <div className="space-y-6 max-w-6xl mx-auto">
        <button
          onClick={() => navigate(`/projects/${id}/analysis`)}
          className="flex items-center gap-1.5 text-[12px] font-medium text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Analysis</span>
        </button>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 flex items-center justify-center text-blue-600 dark:text-blue-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-[16px] font-bold text-slate-900 dark:text-slate-100">
                  Agent Execution Trace #{agentRun.id}
                </h1>
                <StatusBadge
                  label={agentRun.status}
                  variant={getStatusBadgeVariant(agentRun.status)}
                />
              </div>
              <p className="text-[12px] text-slate-500 font-mono mt-0.5">
                Query: "{agentRun.query}"
              </p>
            </div>
          </div>

          {agentRun.final_report_id && (
            <button
              onClick={() => navigate(`/reports/${agentRun.final_report_id}`)}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md text-[12px] font-semibold shadow-sm transition-all"
            >
              <span>View Generated Report</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="space-y-3">
            <h3 className="text-[13px] font-semibold text-slate-800 dark:text-slate-200">
              LangGraph Agent Steps ({runSteps?.length || 0})
            </h3>
            <AgentTimeline
              steps={runSteps || []}
              selectedStepId={selectedStep?.id}
              onSelectStep={(step) => setSelectedStep(step)}
            />
          </div>

          <div className="space-y-3">
            <h3 className="text-[13px] font-semibold text-slate-800 dark:text-slate-200">
              Step Telemetry & Payload Inspector
            </h3>
            {selectedStep ? (
              <div className="space-y-3">
                <JsonViewer
                  title={`Step Output Payload (${selectedStep.step_name})`}
                  data={selectedStep.output_json}
                />
                <JsonViewer
                  title={`Step Input Payload (${selectedStep.step_name})`}
                  data={selectedStep.input_json}
                />
              </div>
            ) : (
              <div className="p-8 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-lg text-[12px] text-slate-500">
                Click any step on the left timeline to inspect input/output telemetry.
              </div>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
};
