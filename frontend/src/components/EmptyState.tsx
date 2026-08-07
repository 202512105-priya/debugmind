import React from 'react';

interface EmptyStateProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
  icon?: React.ReactNode;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  action,
  icon,
  className = '',
}) => {
  return (
    <div
      className={`border-2 border-dashed border-slate-200 dark:border-slate-700/80 rounded-lg p-10 text-center flex flex-col items-center justify-center gap-3 bg-white/40 dark:bg-slate-800/40 ${className}`}
    >
      {icon && <div className="text-slate-400 dark:text-slate-500 mb-1">{icon}</div>}
      <h3 className="text-[14px] font-semibold text-slate-800 dark:text-slate-200">{title}</h3>
      {description && (
        <p className="text-[12px] text-slate-500 dark:text-slate-400 max-w-sm leading-relaxed">
          {description}
        </p>
      )}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
};
