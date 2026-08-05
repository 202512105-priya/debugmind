import React from 'react';
import { AgentStep } from '../types';
import { StatusBadge, getStatusBadgeVariant } from './StatusBadge';
import { formatLatency } from '../lib/formatters';
import { CheckCircle2, Clock, AlertCircle } from 'lucide-react';

interface AgentTimelineProps {
  steps: AgentStep[];
  selectedStepId?: number;
  onSelectStep?: (step: AgentStep) => void;
  className?: string;
}

export const AgentTimeline: React.FC<AgentTimelineProps> = ({
  steps,
  selectedStepId,
  onSelectStep,
  className = '',
}) => {
  if (!steps || steps.length === 0) {
    return (
      <div className="p-4 text-[12px] text-slate-500 text-center bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg">
        No agent steps recorded yet.
      </div>
    );
  }

  return (
    <div className={`space-y-3 ${className}`}>
      {steps.map((step, idx) => {
        const isSelected = selectedStepId === step.id;
        const isLast = idx === steps.length - 1;

        return (
          <div key={step.id} className="relative flex items-start gap-3">
            {!isLast && (
              <div className="absolute left-3.5 top-8 bottom-0 w-0.5 bg-slate-200 dark:bg-slate-700" />
            )}
            <div className="z-10 mt-0.5">
              {step.status === 'success' ? (
                <CheckCircle2 className="w-7 h-7 text-emerald-500 bg-white dark:bg-slate-800 rounded-full" />
              ) : step.status === 'retry' ? (
                <Clock className="w-7 h-7 text-amber-500 bg-white dark:bg-slate-800 rounded-full" />
              ) : (
                <AlertCircle className="w-7 h-7 text-rose-500 bg-white dark:bg-slate-800 rounded-full" />
              )}
            </div>

            <div
              onClick={() => onSelectStep && onSelectStep(step)}
              className={`flex-1 bg-white dark:bg-slate-800 border rounded-lg p-3.5 transition-all ${
                isSelected
                  ? 'border-blue-500 shadow-sm ring-1 ring-blue-500/20'
                  : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
              } ${onSelectStep ? 'cursor-pointer' : ''}`}
            >
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <span className="text-[13px] font-semibold capitalize text-slate-900 dark:text-slate-100">
                  {step.step_name.replace(/_/g, ' ')}
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-mono text-slate-400">
                    {formatLatency(step.latency_ms)}
                  </span>
                  <StatusBadge
                    label={step.status}
                    variant={getStatusBadgeVariant(step.status)}
                    dot={false}
                  />
                </div>
              </div>

              {step.output_json && (
                <div className="text-[11px] font-mono text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-900/60 p-2 rounded border border-slate-100 dark:border-slate-800/80 truncate">
                  {step.output_json}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
