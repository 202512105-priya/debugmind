import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { api } from '../../lib/api';
import { Project } from '../../types';
import { AppShell } from '../../components/AppShell';
import { Plus, FolderGit2, Calendar, FileText, ArrowRight } from 'lucide-react';
import { StatusBadge, getStatusBadgeVariant } from '../../components/StatusBadge';
import { formatDate } from '../../lib/formatters';
import { CreateProjectModal } from './CreateProjectModal';
import { LoadingState } from '../../components/LoadingState';
import { ErrorState } from '../../components/ErrorState';
import { EmptyState } from '../../components/EmptyState';

export const ProjectsPage: React.FC = () => {
  const navigate = useNavigate();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [filter, setFilter] = useState<'All' | 'Recent'>('All');

  const {
    data: projects,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['projects'],
    queryFn: () => api.getProjects(),
  });

  return (
    <AppShell
      breadcrumb={<span className="font-semibold text-slate-900 dark:text-slate-100">Projects</span>}
      actions={
        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-[12px] font-medium shadow-sm transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>New Project</span>
        </button>
      }
    >
      <CreateProjectModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={(id) => navigate(`/projects/${id}`)}
      />

      <div className="space-y-6 max-w-6xl mx-auto">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-[18px] font-bold text-slate-900 dark:text-slate-100">
              Workspace Projects
            </h1>
            <p className="text-[12px] text-slate-500 dark:text-slate-400 mt-0.5">
              Manage reliability analysis and failure debugging across services.
            </p>
          </div>

          <div className="flex items-center gap-1.5">
            {['All', 'Recent'].map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f as any)}
                className={`px-3 py-1 rounded-full text-[12px] font-medium border transition-colors ${
                  filter === f
                    ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 border-slate-900 dark:border-slate-100'
                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-300 dark:border-slate-700 hover:border-slate-400'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {isLoading ? (
          <LoadingState label="Loading workspace projects..." />
        ) : isError ? (
          <ErrorState
            title="Failed to load projects"
            message={error ? (error as any).message || String(error) : 'Backend connection error'}
            onRetry={refetch}
          />
        ) : !projects || projects.length === 0 ? (
          <EmptyState
            title="No projects created yet"
            description="Create your first project to ingest code repositories and debug CI failures."
            icon={<FolderGit2 className="w-10 h-10 text-slate-400" />}
            action={
              <button
                onClick={() => setIsModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-[12px] font-medium shadow-sm transition-all"
              >
                <Plus className="w-4 h-4" />
                <span>Create Project</span>
              </button>
            }
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {projects.map((project) => (
              <div
                key={project.id}
                onClick={() => navigate(`/projects/${project.id}`)}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 cursor-pointer hover:border-blue-400 dark:hover:border-blue-600 hover:shadow-md transition-all group"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-blue-50 dark:bg-blue-950/60 border border-blue-100 dark:border-blue-800 flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold shrink-0">
                      <FolderGit2 className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-[15px] font-semibold text-slate-900 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                        {project.name}
                      </h3>
                      <p className="text-[12px] text-slate-500 dark:text-slate-400 line-clamp-1 mt-0.5">
                        {project.description || 'No description provided'}
                      </p>
                    </div>
                  </div>
                  <StatusBadge label="Active" variant="green" />
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 pt-3 border-t border-slate-100 dark:border-slate-800/80">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>Created {formatDate(project.created_at)}</span>
                  </div>
                  <div className="flex items-center gap-1 text-blue-600 dark:text-blue-400 font-medium group-hover:translate-x-0.5 transition-transform">
                    <span>Open Workspace</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
};
