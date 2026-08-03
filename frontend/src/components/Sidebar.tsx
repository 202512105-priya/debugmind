import React from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import {
  FolderGit2,
  FileText,
  Activity,
  Layers,
  Cpu,
  Settings,
  ChevronLeft,
  Search,
  LayoutGrid,
  Bot,
  FileCode,
  Box,
  GitBranch,
  ShieldCheck,
  LogOut,
  Sparkles
} from 'lucide-react';
import { StatusBadge } from './StatusBadge';

interface SidebarProps {
  projectName?: string;
}

export const Sidebar: React.FC<SidebarProps> = ({ projectName }) => {
  const navigate = useNavigate();
  const { projectId } = useParams<{ projectId: string }>();
  const location = useLocation();

  const isProjectWorkspace = Boolean(projectId);

  const handleLogout = () => {
    localStorage.removeItem('debugmind_token');
    navigate('/login');
  };

  const projectNavItems = [
    { label: 'Overview', path: `/projects/${projectId}`, icon: LayoutGrid },
    { label: 'Repositories', path: `/projects/${projectId}/repository`, icon: FolderGit2 },
    { label: 'Logs', path: `/projects/${projectId}/logs`, icon: FileText },
    { label: 'Analysis & Agent', path: `/projects/${projectId}/analysis`, icon: Cpu },
    { label: 'Debug Reports', path: `/projects/${projectId}/reports`, icon: Activity },
  ];

  const globalNavItems = [
    { label: 'Projects', path: '/projects', icon: FolderGit2 },
  ];

  return (
    <aside className="w-[220px] shrink-0 min-h-screen bg-slate-900 text-slate-300 flex flex-col border-r border-slate-800">
      {/* Brand Header */}
      <div className="p-4 border-b border-slate-800/80">
        <div className="flex items-center gap-2.5 mb-3">
          <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-xs shadow-md shadow-blue-500/20">
            <Sparkles className="w-4 h-4" />
          </div>
          <span className="font-semibold text-[14px] text-white tracking-tight">
            DebugMind
          </span>
          <StatusBadge label="v1.0" variant="blue" dot={false} className="py-0 text-[10px]" />
        </div>

        {isProjectWorkspace ? (
          <div>
            <button
              onClick={() => navigate('/projects')}
              className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-slate-200 transition-colors mb-2"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>All Projects</span>
            </button>
            <div className="flex items-center gap-2 px-2.5 py-1.5 bg-slate-800/90 border border-slate-700/80 rounded-md">
              <FolderGit2 className="w-4 h-4 text-blue-400 shrink-0" />
              <span className="text-[12px] font-medium text-slate-100 truncate">
                {projectName || `Project #${projectId}`}
              </span>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-800/60 border border-slate-700/50 rounded-md text-[12px] text-slate-400">
            <Search className="w-3.5 h-3.5" />
            <span>Search ⌘K</span>
          </div>
        )}
      </div>

      {/* Nav List */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto text-[12px]">
        {isProjectWorkspace ? (
          <>
            <div className="px-2 pt-1 pb-1.5 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
              Project Navigation
            </div>
            {projectNavItems.map((item) => {
              const Icon = item.icon;
              const isActive =
                item.path === `/projects/${projectId}`
                  ? location.pathname === `/projects/${projectId}`
                  : location.pathname.startsWith(item.path);

              return (
                <button
                  key={item.path}
                  onClick={() => navigate(item.path)}
                  className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-md font-medium transition-all ${
                    isActive
                      ? 'bg-slate-800 text-white shadow-sm'
                      : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-blue-400' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </>
        ) : (
          <>
            <div className="px-2 pt-1 pb-1.5 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
              Workspace
            </div>
            {globalNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname.startsWith(item.path);

              return (
                <button
                  key={item.path}
                  onClick={() => navigate(item.path)}
                  className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-md font-medium transition-all ${
                    isActive
                      ? 'bg-slate-800 text-white shadow-sm'
                      : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-blue-400' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </>
        )}
      </nav>

      {/* User Footer */}
      <div className="p-3 border-t border-slate-800/80">
        <div className="flex items-center justify-between p-2 rounded-md bg-slate-800/40">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center text-white text-[10px] font-bold shrink-0">
              DM
            </div>
            <div className="min-w-0">
              <div className="text-[12px] font-medium text-slate-200 truncate">Developer</div>
              <div className="text-[10px] text-slate-500 truncate">dev@debugmind.ai</div>
            </div>
          </div>
          <button
            onClick={handleLogout}
            title="Log out"
            className="p-1 text-slate-400 hover:text-rose-400 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </aside>
  );
};
