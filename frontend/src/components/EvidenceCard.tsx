import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { EvidenceItem } from '../types';
import { api } from '../lib/api';
import { FileCode, ExternalLink } from 'lucide-react';

interface EvidenceCardProps {
  evidence: EvidenceItem;
  codePreview?: string;
  onNavigate?: () => void;
  className?: string;
}

export const EvidenceCard: React.FC<EvidenceCardProps> = ({
  evidence,
  codePreview,
  onNavigate,
  className = '',
}) => {
  // Dynamically fetch chunk content if not passed directly
  const { data: chunk } = useQuery({
    queryKey: ['chunk', evidence.chunk_id],
    queryFn: () => api.getChunk(evidence.chunk_id),
    enabled: Boolean(evidence.chunk_id) && !codePreview,
  });

  const previewText = codePreview || chunk?.content;

  return (
    <div
      className={`bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-4 transition-all hover:border-slate-300 dark:hover:border-slate-600 ${className}`}
    >
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 min-w-0">
          <FileCode className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
          <span className="text-[12px] font-semibold font-mono text-slate-900 dark:text-slate-100 truncate">
            {evidence.file_path || chunk?.file_path || `Chunk #${evidence.chunk_id}`}
          </span>
          {(evidence.start_line != null || evidence.end_line != null) && (
            <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400 shrink-0">
              L{evidence.start_line || 1}
              {evidence.end_line ? `-L${evidence.end_line}` : ''}
            </span>
          )}
        </div>
        {onNavigate && (
          <button
            onClick={onNavigate}
            className="flex items-center gap-1 text-[11px] font-medium text-blue-600 dark:text-blue-400 hover:underline shrink-0"
          >
            <span>View Chunk #{evidence.chunk_id}</span>
            <ExternalLink className="w-3 h-3" />
          </button>
        )}
      </div>

      <p className="text-[12px] text-slate-600 dark:text-slate-300 mb-2.5 leading-relaxed">
        {evidence.reason}
      </p>

      {previewText && (
        <div className="bg-slate-950 text-slate-200 rounded p-3 text-[11px] font-mono overflow-x-auto border border-slate-800">
          <pre className="whitespace-pre-wrap leading-relaxed max-h-[200px] overflow-y-auto">
            {previewText}
          </pre>
        </div>
      )}
    </div>
  );
};
