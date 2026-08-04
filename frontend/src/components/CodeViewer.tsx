import React from 'react';

interface CodeViewerProps {
  code: string;
  language?: string;
  startLine?: number;
  highlightStart?: number;
  highlightEnd?: number;
  className?: string;
}

export const CodeViewer: React.FC<CodeViewerProps> = ({
  code,
  language = 'python',
  startLine = 1,
  highlightStart,
  highlightEnd,
  className = '',
}) => {
  const lines = code ? code.split('\n') : [''];

  return (
    <div
      className={`bg-slate-900 text-slate-100 rounded-lg overflow-hidden border border-slate-800 font-mono text-[12px] ${className}`}
    >
      <div className="bg-slate-950 px-4 py-2 flex items-center justify-between border-b border-slate-800 text-[11px] text-slate-400">
        <span>{language}</span>
        <span>{lines.length} lines</span>
      </div>
      <div className="overflow-x-auto p-3">
        <pre className="leading-relaxed">
          {lines.map((line, idx) => {
            const currentLineNum = (startLine || 1) + idx;
            const isHighlighted =
              highlightStart != null &&
              highlightEnd != null &&
              currentLineNum >= highlightStart &&
              currentLineNum <= highlightEnd;

            return (
              <div
                key={idx}
                className={`flex gap-4 px-2 py-0.5 rounded ${
                  isHighlighted ? 'bg-amber-950/70 border-l-2 border-amber-400 text-amber-100' : ''
                }`}
              >
                <span className="select-none text-slate-600 text-right w-8 shrink-0 text-[11px]">
                  {currentLineNum}
                </span>
                <span className="whitespace-pre">{line || ' '}</span>
              </div>
            );
          })}
        </pre>
      </div>
    </div>
  );
};
