import React from 'react';

interface LogViewerProps {
  rawContent: string;
  errorKeywords?: string[];
  className?: string;
}

export const LogViewer: React.FC<LogViewerProps> = ({
  rawContent,
  errorKeywords = ['FAILED', 'AssertionError', 'ERROR', 'Exception', 'Traceback', '401', '500'],
  className = '',
}) => {
  const lines = rawContent ? rawContent.split('\n') : ['No log content available'];

  const isErrorLine = (line: string): boolean => {
    return errorKeywords.some(kw => line.includes(kw));
  };

  return (
    <div className={`bg-slate-950 text-slate-200 border border-slate-800 rounded-lg overflow-hidden font-mono text-[11.5px] ${className}`}>
      <div className="bg-slate-900 px-4 py-2 flex items-center justify-between border-b border-slate-800 text-[11px] text-slate-400">
        <span>Log Console Output</span>
        <span>{lines.length} lines</span>
      </div>
      <div className="p-3 overflow-auto max-h-[500px]">
        <pre className="leading-relaxed">
          {lines.map((line, idx) => {
            const hasErr = isErrorLine(line);
            return (
              <div
                key={idx}
                className={`flex gap-3 px-2 py-0.5 rounded ${
                  hasErr ? 'bg-rose-950/50 text-rose-300 font-semibold' : 'text-slate-300'
                }`}
              >
                <span className="select-none text-slate-600 text-right w-7 shrink-0 text-[10px]">
                  {idx + 1}
                </span>
                <span className="whitespace-pre-wrap break-all">{line || ' '}</span>
              </div>
            );
          })}
        </pre>
      </div>
    </div>
  );
};
