import React from 'react';

interface MetricCardProps {
  label: string;
  value: string | number;
  subtext?: string;
  highlight?: boolean;
  icon?: React.ReactNode;
  onClick?: () => void;
  className?: string;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  label,
  value,
  subtext,
  highlight = false,
  icon,
  onClick,
  className = '',
}) => {
  return (
    <div
      onClick={onClick}
      className={`bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 rounded-lg px-3.5 py-3 ${
        onClick ? 'cursor-pointer hover:border-slate-300 dark:hover:border-slate-600 hover:shadow-sm transition-all' : ''
      } ${className}`}
    >
      <div className="flex items-center justify-between gap-1 mb-1">
        <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-400 uppercase tracking-wider">
          {label}
        </span>
        {icon && <span className="text-slate-400 dark:text-slate-500">{icon}</span>}
      </div>
      <div
        className={`text-[17px] font-semibold font-mono tracking-tight ${
          highlight ? 'text-rose-600 dark:text-rose-400' : 'text-slate-900 dark:text-slate-100'
        }`}
      >
        {value}
      </div>
      {subtext && <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{subtext}</div>}
    </div>
  );
};
