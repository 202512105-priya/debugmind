import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { Repository, CodeFile } from '../../types';
import { AppShell } from '../../components/AppShell';
import { DataTable, Column } from '../../components/DataTable';
import { StatusBadge, getStatusBadgeVariant } from '../../components/StatusBadge';
import { CodeViewer } from '../../components/CodeViewer';
import { LoadingState } from '../../components/LoadingState';
import { ErrorState } from '../../components/ErrorState';
import { EmptyState } from '../../components/EmptyState';
import { formatDate } from '../../lib/formatters';
import {
  FolderGit2,
  Plus,
  Play,
  Layers,
  Database,
  FileCode,
  CheckCircle2,
  Code,
  Github,
  Folder
} from 'lucide-react';

export const RepositoriesPage: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const id = Number(projectId);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [selectedRepoId, setSelectedRepoId] = useState<number | null>(null);
  const [selectedFile, setSelectedFile] = useState<CodeFile | null>(null);

  // Registration Mode
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [repoSourceType, setRepoSourceType] = useState<'github' | 'local'>('github');
  const [repoName, setRepoName] = useState('');
  const [repoPath, setRepoPath] = useState('');

  // Source File Mode
  const [isAddFileOpen, setIsAddFileOpen] = useState(false);
  const [newFilePath, setNewFilePath] = useState('app/auth/middleware.py');
  const [newFileLanguage, setNewFileLanguage] = useState('python');
  const [newFileContent, setNewFileContent] = useState(
    `def authenticate_request(headers):\n    token = headers.get("Authorization")\n    if not token:\n        raise ValueError("401 Missing token")\n    return {"user_id": 42}`
  );

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Queries
  const { data: project } = useQuery({
    queryKey: ['project', id],
    queryFn: () => api.getProject(id),
    enabled: Boolean(id),
  });

  const {
    data: repos,
    isLoading: loadingRepos,
    isError: errorRepos,
    refetch: refetchRepos,
  } = useQuery({
    queryKey: ['repositories', id],
    queryFn: () => api.getRepositories(id),
    enabled: Boolean(id),
  });

  const activeRepoId = selectedRepoId || (repos && repos.length > 0 ? repos[0].id : null);

  const { data: files } = useQuery({
    queryKey: ['repo-files', activeRepoId],
    queryFn: () => (activeRepoId ? api.getRepositoryFiles(activeRepoId) : Promise.resolve([])),
    enabled: Boolean(activeRepoId),
  });

  // Mutations
  const registerMutation = useMutation({
    mutationFn: (data: { name: string; source_type: string; root_path: string }) =>
      api.createRepository(id, data),
    onSuccess: (newRepo) => {
      queryClient.invalidateQueries({ queryKey: ['repositories', id] });
      queryClient.invalidateQueries({ queryKey: ['repo-files', newRepo.id] });
      queryClient.invalidateQueries({ queryKey: ['chunks', id] });
      setSelectedRepoId(newRepo.id);
      setIsRegisterOpen(false);
      setRepoName('');
      setRepoPath('');
      showToast(`Repository ${newRepo.name} connected & indexed!`);
    },
  });

  const addFileMutation = useMutation({
    mutationFn: (data: { repository_id: number; file_path: string; content: string; language: string }) =>
      api.createSourceFile(data.repository_id, {
        file_path: data.file_path,
        content: data.content,
        language: data.language,
      }),
    onSuccess: (newFile) => {
      queryClient.invalidateQueries({ queryKey: ['repositories', id] });
      queryClient.invalidateQueries({ queryKey: ['repo-files', activeRepoId] });
      queryClient.invalidateQueries({ queryKey: ['chunks', id] });
      setSelectedFile(newFile);
      setIsAddFileOpen(false);
      showToast(`Source file ${newFile.file_path} added & chunked successfully!`);
    },
  });

  const ingestMutation = useMutation({
    mutationFn: (repoId: number) => api.ingestRepository(repoId),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['repositories', id] });
      queryClient.invalidateQueries({ queryKey: ['repo-files', activeRepoId] });
      showToast(`Ingested ${res.files_ingested} files successfully!`);
    },
  });

  const chunkMutation = useMutation({
    mutationFn: (repoId: number) => api.chunkRepository(repoId),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['repositories', id] });
      queryClient.invalidateQueries({ queryKey: ['chunks', id] });
      showToast(`Created ${res.chunks_created} AST code chunks!`);
    },
  });

  const embeddingsMutation = useMutation({
    mutationFn: () => api.indexEmbeddings(id),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['repositories', id] });
      showToast(`Indexed ${res.embeddings_created} vector embeddings!`);
    },
  });

  const handleCreateDefaultRepoAndAddFile = async () => {
    let repoTargetId = activeRepoId;
    if (!repoTargetId) {
      const defaultRepo = await registerMutation.mutateAsync({
        name: 'default-repo',
        source_type: 'local',
        root_path: '/src',
      });
      repoTargetId = defaultRepo.id;
    }
    addFileMutation.mutate({
      repository_id: repoTargetId,
      file_path: newFilePath,
      content: newFileContent,
      language: newFileLanguage,
    });
  };

  const repoColumns: Column<Repository>[] = [
    {
      header: 'Repository',
      cell: (row) => (
        <div className="flex items-center gap-2 font-medium text-slate-900 dark:text-slate-100">
          {row.source_type === 'github' ? (
            <Github className="w-4 h-4 text-purple-500 shrink-0" />
          ) : (
            <FolderGit2 className="w-4 h-4 text-blue-500 shrink-0" />
          )}
          <span>{row.name}</span>
        </div>
      ),
    },
    {
      header: 'Type',
      cell: (row) => (
        <span className="capitalize text-[11px] font-medium px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
          {row.source_type}
        </span>
      ),
    },
    {
      header: 'Source Path / URL',
      cell: (row) => <span className="font-mono text-slate-500 text-[11.5px] truncate max-w-[240px] block">{row.root_path}</span>,
    },
    {
      header: 'Status',
      cell: (row) => (
        <StatusBadge label={row.status} variant={getStatusBadgeVariant(row.status)} />
      ),
    },
    {
      header: 'Created',
      cell: (row) => <span className="text-slate-500">{formatDate(row.created_at)}</span>,
    },
  ];

  return (
    <AppShell
      projectName={project?.name}
      breadcrumb={
        <>
          <span
            onClick={() => navigate('/projects')}
            className="hover:underline cursor-pointer text-slate-500"
          >
            Projects
          </span>
          <span>/</span>
          <span
            onClick={() => navigate(`/projects/${id}`)}
            className="hover:underline cursor-pointer text-slate-500"
          >
            {project?.name || `Project #${id}`}
          </span>
          <span>/</span>
          <span className="font-semibold text-slate-900 dark:text-slate-100">Repositories & Files</span>
        </>
      }
      actions={
        <div className="flex items-center gap-2">
          {activeRepoId && (
            <>
              <button
                onClick={() => ingestMutation.mutate(activeRepoId)}
                disabled={ingestMutation.isPending}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-md text-[12px] font-medium transition-all disabled:opacity-50"
              >
                <Play className="w-3.5 h-3.5" />
                <span>{ingestMutation.isPending ? 'Ingesting...' : 'Run Ingestion'}</span>
              </button>

              <button
                onClick={() => chunkMutation.mutate(activeRepoId)}
                disabled={chunkMutation.isPending}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-md text-[12px] font-medium transition-all disabled:opacity-50"
              >
                <Layers className="w-3.5 h-3.5 text-purple-400" />
                <span>{chunkMutation.isPending ? 'Chunking...' : 'Run Chunking'}</span>
              </button>
            </>
          )}

          <button
            onClick={() => embeddingsMutation.mutate()}
            disabled={embeddingsMutation.isPending}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-[12px] font-medium transition-all disabled:opacity-50"
          >
            <Database className="w-3.5 h-3.5" />
            <span>{embeddingsMutation.isPending ? 'Indexing...' : 'Build Embeddings'}</span>
          </button>
        </div>
      }
    >
      <div className="space-y-6 max-w-6xl mx-auto">
        {toastMessage && (
          <div className="fixed bottom-5 right-5 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-lg shadow-lg text-[13px] flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>{toastMessage}</span>
          </div>
        )}

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-[18px] font-bold text-slate-900 dark:text-slate-100">
              Repositories & Source Files
            </h1>
            <p className="text-[12px] text-slate-500 dark:text-slate-400 mt-0.5">
              Connect GitHub repos, local folders, or add individual source files to create vector embeddings.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setIsRegisterOpen(true);
                setIsAddFileOpen(false);
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-[12px] font-medium shadow-sm transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Connect Repo / Folder</span>
            </button>

            <button
              onClick={() => {
                setIsAddFileOpen(true);
                setIsRegisterOpen(false);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 rounded-md text-[12px] font-medium shadow-sm transition-all"
            >
              <Code className="w-4 h-4" />
              <span>Add Source File</span>
            </button>
          </div>
        </div>

        {/* Connect GitHub Repo / Local Folder Modal/Box */}
        {isRegisterOpen && (
          <div className="bg-white dark:bg-slate-900 border border-blue-200 dark:border-blue-800 rounded-xl p-5 shadow-md space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setRepoSourceType('github')}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[12px] font-medium transition-all ${
                    repoSourceType === 'github'
                      ? 'bg-purple-600 text-white shadow-sm'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  <Github className="w-4 h-4" />
                  <span>GitHub Repository</span>
                </button>

                <button
                  type="button"
                  onClick={() => setRepoSourceType('local')}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[12px] font-medium transition-all ${
                    repoSourceType === 'local'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  <Folder className="w-4 h-4" />
                  <span>Local Folder Path</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-slate-500 mb-1">
                  Repository Name
                </label>
                <input
                  type="text"
                  value={repoName}
                  onChange={(e) => setRepoName(e.target.value)}
                  placeholder={repoSourceType === 'github' ? 'e.g. fastapi-service' : 'e.g. backend-app'}
                  className="w-full border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-md px-3 py-1.5 text-[12px] text-slate-900 dark:text-slate-100 outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-500 mb-1">
                  {repoSourceType === 'github' ? 'GitHub Repo URL or owner/repo' : 'Absolute Local Folder Path'}
                </label>
                <input
                  type="text"
                  value={repoPath}
                  onChange={(e) => setRepoPath(e.target.value)}
                  placeholder={
                    repoSourceType === 'github'
                      ? 'https://github.com/fastapi/fastapi or owner/repo'
                      : '/Users/dev/projects/backend-app'
                  }
                  className="w-full border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-md px-3 py-1.5 text-[12px] text-slate-900 dark:text-slate-100 outline-none focus:border-blue-500 font-mono"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={() => setIsRegisterOpen(false)}
                className="px-3 py-1.5 text-[12px] text-slate-500 hover:text-slate-700"
              >
                Cancel
              </button>
              <button
                onClick={() =>
                  registerMutation.mutate({
                    name: repoName,
                    source_type: repoSourceType,
                    root_path: repoPath,
                  })
                }
                disabled={!repoName.trim() || !repoPath.trim() || registerMutation.isPending}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-[12px] font-medium transition-all shadow-sm disabled:opacity-50"
              >
                <Play className="w-3.5 h-3.5" />
                <span>
                  {registerMutation.isPending
                    ? repoSourceType === 'github'
                      ? 'Cloning & Indexing...'
                      : 'Scanning & Indexing...'
                    : repoSourceType === 'github'
                    ? 'Clone & Index GitHub Repo'
                    : 'Connect Local Folder'}
                </span>
              </button>
            </div>
          </div>
        )}

        {/* Add Source File Form Box */}
        {isAddFileOpen && (
          <div className="bg-white dark:bg-slate-900 border border-blue-200 dark:border-blue-800 rounded-xl p-5 shadow-md space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
              <h3 className="text-[14px] font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Code className="w-4 h-4 text-blue-600" />
                <span>Add Source Code File to Chunk & Debug</span>
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-slate-500 mb-1">
                  File Path
                </label>
                <input
                  type="text"
                  value={newFilePath}
                  onChange={(e) => setNewFilePath(e.target.value)}
                  placeholder="e.g. app/auth/middleware.py"
                  className="w-full border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-md px-3 py-1.5 text-[12px] text-slate-900 dark:text-slate-100 font-mono outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-500 mb-1">
                  Language
                </label>
                <select
                  value={newFileLanguage}
                  onChange={(e) => setNewFileLanguage(e.target.value)}
                  className="w-full border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-md px-3 py-1.5 text-[12px] text-slate-900 dark:text-slate-100 outline-none focus:border-blue-500"
                >
                  <option value="python">Python</option>
                  <option value="typescript">TypeScript</option>
                  <option value="javascript">JavaScript</option>
                  <option value="markdown">Markdown</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-500 mb-1">
                  Target Repository
                </label>
                <select
                  value={selectedRepoId || (repos && repos.length > 0 ? repos[0].id : '')}
                  onChange={(e) => setSelectedRepoId(Number(e.target.value))}
                  className="w-full border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-md px-3 py-1.5 text-[12px] text-slate-900 dark:text-slate-100 outline-none focus:border-blue-500"
                >
                  {repos?.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
                  {(!repos || repos.length === 0) && (
                    <option value="">Auto-create Default Repo</option>
                  )}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-500 mb-1">
                Source Code Content
              </label>
              <textarea
                value={newFileContent}
                onChange={(e) => setNewFileContent(e.target.value)}
                rows={6}
                className="w-full border border-slate-300 dark:border-slate-700 bg-slate-950 text-slate-100 font-mono rounded-md px-3 py-2 text-[11.5px] leading-relaxed outline-none focus:border-blue-500 resize-y"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setIsAddFileOpen(false)}
                className="px-3 py-1.5 text-[12px] text-slate-500 hover:text-slate-700"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateDefaultRepoAndAddFile}
                disabled={!newFilePath.trim() || !newFileContent.trim() || addFileMutation.isPending}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-[12px] font-medium transition-all shadow-sm disabled:opacity-50"
              >
                <Code className="w-4 h-4" />
                <span>{addFileMutation.isPending ? 'Processing...' : 'Add & Chunk Source File'}</span>
              </button>
            </div>
          </div>
        )}

        {/* Repositories Table */}
        {loadingRepos ? (
          <LoadingState label="Loading repositories..." />
        ) : errorRepos ? (
          <ErrorState message="Failed to load repositories" onRetry={refetchRepos} />
        ) : !repos || repos.length === 0 ? (
          <EmptyState
            title="No repositories connected"
            description="Connect a GitHub repository, scan a local folder, or add source files to begin."
            icon={<FolderGit2 className="w-8 h-8 text-slate-400" />}
            action={
              <button
                onClick={() => setIsRegisterOpen(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-[12px] font-medium shadow-sm transition-all"
              >
                <Plus className="w-4 h-4" />
                <span>Connect Repository</span>
              </button>
            }
          />
        ) : (
          <div className="space-y-4">
            <h2 className="text-[14px] font-semibold text-slate-800 dark:text-slate-200">
              Connected Repositories
            </h2>
            <DataTable
              columns={repoColumns}
              data={repos}
              onRowClick={(row) => setSelectedRepoId(row.id)}
            />
          </div>
        )}

        {/* Files & Source Code Preview */}
        {activeRepoId && files && files.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-slate-200 dark:border-slate-800">
            <div className="md:col-span-1 space-y-2">
              <h3 className="text-[13px] font-semibold text-slate-800 dark:text-slate-200 flex items-center justify-between">
                <span>Ingested Source Files</span>
                <span className="text-[11px] font-mono text-slate-500">
                  {files.length} files
                </span>
              </h3>
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg max-h-[400px] overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
                {files.map((file) => (
                  <div
                    key={file.id}
                    onClick={() => setSelectedFile(file)}
                    className={`px-3 py-2.5 cursor-pointer text-[12px] flex items-center justify-between transition-colors ${
                      (selectedFile?.id || files[0]?.id) === file.id
                        ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-medium'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <FileCode className="w-4 h-4 text-slate-400 shrink-0" />
                      <span className="truncate font-mono">{file.file_path}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="md:col-span-2 space-y-2">
              <h3 className="text-[13px] font-semibold text-slate-800 dark:text-slate-200">
                Source File Content
              </h3>
              {selectedFile || (files && files[0]) ? (
                <CodeViewer
                  code={(selectedFile || files[0]).content}
                  language={(selectedFile || files[0]).language || 'python'}
                />
              ) : (
                <div className="p-8 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-lg text-[12px] text-slate-500">
                  Select a file from the list to preview content
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
};
