import React from 'react';
import { Loader2 } from 'lucide-react';

interface LoadingStateProps {
  label?: string;
  className?: string;
}

export const LoadingState: React.FC<LoadingStateProps> = ({
  label = 'Loading data...',
  className = '',
}) => {
  return (
    <div className={`flex flex-col items-center justify-center p-12 gap-3 text-slate-500 dark:text-slate-400 ${className}`}>
      <Loader2 className="w-6 h-6 animate-spin text-blue-600 dark:text-blue-400" />
      <span className="text-[12px] font-medium">{label}</span>
    </div>
  );
};
