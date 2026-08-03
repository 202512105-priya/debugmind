import React, { useState } from 'react';
import { Search, Bell, Sun, Moon, Sparkles } from 'lucide-react';

interface TopbarProps {
  breadcrumb: React.ReactNode;
  actions?: React.ReactNode;
}

export const Topbar: React.FC<TopbarProps> = ({ breadcrumb, actions }) => {
  const [dark, setDark] = useState(false);

  const toggleTheme = () => {
    setDark(!dark);
    document.documentElement.classList.toggle('dark');
  };

  return (
    <header className="h-12 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-5 flex items-center justify-between shrink-0">
      <div className="flex items-center gap-2 text-[13px] text-slate-500 dark:text-slate-400 font-medium min-w-0">
        {breadcrumb}
      </div>

      <div className="flex items-center gap-3 shrink-0">
        {actions}
        <div className="relative w-48 hidden md:block">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search symbols..."
            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md pl-8 pr-2.5 py-1 text-[12px] text-slate-900 dark:text-slate-100 placeholder:text-slate-400 outline-none focus:border-blue-500 transition-all"
          />
        </div>

        <button
          onClick={toggleTheme}
          title={dark ? 'Light mode' : 'Dark mode'}
          className="p-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 transition-colors"
        >
          {dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>

        <button
          title="Notifications"
          className="p-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 relative transition-colors"
        >
          <Bell className="w-4 h-4" />
          <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-blue-600" />
        </button>
      </div>
    </header>
  );
};
