import React from 'react';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';

interface AppShellProps {
  breadcrumb: React.ReactNode;
  projectName?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}

export const AppShell: React.FC<AppShellProps> = ({
  breadcrumb,
  projectName,
  actions,
  children,
}) => {
  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans">
      <Sidebar projectName={projectName} />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Topbar breadcrumb={breadcrumb} actions={actions} />
        <main className="flex-1 p-6 overflow-y-auto min-w-0">{children}</main>
      </div>
    </div>
  );
};
