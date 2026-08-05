import React, { useState } from 'react';
import { ChevronRight, ChevronDown, Copy, Check } from 'lucide-react';

interface JsonViewerProps {
  data: any;
  title?: string;
  className?: string;
}

export const JsonViewer: React.FC<JsonViewerProps> = ({
  data,
  title,
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(true);
  const [copied, setCopied] = useState(false);

  let formatted = '';
  try {
    if (typeof data === 'string') {
      formatted = JSON.stringify(JSON.parse(data), null, 2);
    } else {
      formatted = JSON.stringify(data, null, 2);
    }
  } catch {
    formatted = String(data);
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(formatted);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={`bg-slate-900 border border-slate-800 rounded-lg overflow-hidden ${className}`}>
      {title && (
        <div
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center justify-between px-3.5 py-2 bg-slate-950 text-slate-300 text-[12px] font-mono cursor-pointer select-none border-b border-slate-800 hover:bg-slate-900/80 transition-colors"
        >
          <div className="flex items-center gap-1.5 font-medium">
            {isOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
            <span>{title}</span>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleCopy();
            }}
            className="p-1 text-slate-400 hover:text-slate-200 rounded transition-colors"
            title="Copy JSON"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
        </div>
      )}

      {isOpen && (
        <div className="p-3.5 overflow-x-auto">
          <pre className="text-[11.5px] font-mono leading-relaxed text-slate-200 whitespace-pre">
            {formatted}
          </pre>
        </div>
      )}
    </div>
  );
};
