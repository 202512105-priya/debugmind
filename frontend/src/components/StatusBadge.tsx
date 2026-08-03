import React from 'react';

export type BadgeVariant =
  | 'default'
  | 'blue'
  | 'green'
  | 'amber'
  | 'red'
  | 'purple'
  | 'slate'
  | 'orange';

interface StatusBadgeProps {
  label: string;
  variant?: BadgeVariant;
  dot?: boolean;
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  label,
  variant = 'default',
  dot = true,
  className = '',
}) => {
  const styles: Record<BadgeVariant, string> = {
    default: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700',
    blue: 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800',
    green: 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
    amber: 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800',
    red: 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800',
    purple: 'bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800',
    slate: 'bg-slate-800 text-slate-200 border-slate-700',
    orange: 'bg-orange-50 dark:bg-orange-950/60 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-800',
  };

  const dots: Record<BadgeVariant, string> = {
    default: 'bg-slate-400',
    blue: 'bg-blue-500',
    green: 'bg-emerald-500',
    amber: 'bg-amber-500',
    red: 'bg-rose-500',
    purple: 'bg-purple-500',
    slate: 'bg-slate-400',
    orange: 'bg-orange-500',
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md border text-[11px] font-medium whitespace-nowrap ${styles[variant]} ${className}`}
    >
      {dot && <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dots[variant]}`} />}
      {label}
    </span>
  );
};

export function getStatusBadgeVariant(statusString?: string | null): BadgeVariant {
  if (!statusString) return 'default';
  const lower = statusString.toLowerCase();
  if (['success', 'passed', 'completed', 'indexed', 'grounded'].includes(lower)) return 'green';
  if (['failed', 'failure', 'error', 'test_failure', 'runtime_error', 'build_failure'].includes(lower)) return 'red';
  if (['running', 'pending', 'chunked', 'ingested'].includes(lower)) return 'blue';
  if (['insufficient_evidence', 'retry', 'warning'].includes(lower)) return 'amber';
  return 'default';
}
