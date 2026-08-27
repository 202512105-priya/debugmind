import {
  Project,
  ProjectCreate,
  Repository,
  RepositoryCreate,
  CodeFile,
  UploadedLog,
  UploadedLogCreate,
  ParsedLogEvent,
  Chunk,
  DebugReport,
  DebugReportCreate,
  AgentRun,
  AgentRunCreate,
  AgentStep,
  RerankSearchResult
} from '../types';

let rawBaseUrl = import.meta.env.VITE_API_BASE_URL;

if (!rawBaseUrl || rawBaseUrl.includes('localhost')) {
  if (typeof window !== 'undefined' && window.location.hostname.includes('onrender.com')) {
    rawBaseUrl = 'https://debugmind-api-9c95.onrender.com';
  } else {
    rawBaseUrl = 'http://localhost:8000';
  }
}

if (rawBaseUrl && !rawBaseUrl.startsWith('http://') && !rawBaseUrl.startsWith('https://')) {
  rawBaseUrl = `https://${rawBaseUrl}`;
}
const API_BASE_URL = rawBaseUrl.replace(/\/+$/, '');

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  const response = await fetch(url, { ...options, headers });

  if (!response.ok) {
    let errorMessage = `HTTP error ${response.status}: ${response.statusText}`;
    try {
      const errorData = await response.json();
      if (errorData.detail) {
        errorMessage = typeof errorData.detail === 'string' 
          ? errorData.detail 
          : JSON.stringify(errorData.detail);
      }
    } catch {
      // Use default error string if json parse fails
    }
    throw new Error(errorMessage);
  }

  return response.json();
}

export const api = {
  // Health
  getHealth: () => request<{ status: string; app: string }>('/health'),

  // Projects
  getProjects: () => request<Project[]>('/projects'),
  getProject: (projectId: number) => request<Project>(`/projects/${projectId}`),
  createProject: (data: ProjectCreate) =>
    request<Project>('/projects', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // Repositories
  getRepositories: (projectId: number) =>
    request<Repository[]>(`/projects/${projectId}/repositories`),
  createRepository: (projectId: number, data: RepositoryCreate) =>
    request<Repository>(`/projects/${projectId}/repositories`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  ingestRepository: (repositoryId: number) =>
    request<{ repository_id: number; files_ingested: number; message: string }>(
      `/repositories/${repositoryId}/ingest`,
      { method: 'POST' }
    ),
  getRepositoryFiles: (repositoryId: number) =>
    request<CodeFile[]>(`/repositories/${repositoryId}/files`),
  createSourceFile: (repositoryId: number, data: { file_path: string; content: string; language?: string }) =>
    request<CodeFile>(`/repositories/${repositoryId}/files`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  chunkRepository: (repositoryId: number) =>
    request<{ repository_id: number; chunks_created: number; message: string }>(
      `/repositories/${repositoryId}/chunk`,
      { method: 'POST' }
    ),
  getRepositoryChunks: (repositoryId: number) =>
    request<Chunk[]>(`/repositories/${repositoryId}/chunks`),

  // Embeddings
  indexEmbeddings: (projectId: number) =>
    request<{ project_id: number; embeddings_created: number; message: string }>(
      `/projects/${projectId}/embeddings/index`,
      { method: 'POST' }
    ),

  // Logs
  uploadLog: (projectId: number, data: UploadedLogCreate) =>
    request<UploadedLog>(`/projects/${projectId}/logs`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  getProjectLogs: (projectId: number) =>
    request<UploadedLog[]>(`/projects/${projectId}/logs`),
  getLog: (logId: number) => request<UploadedLog>(`/logs/${logId}`),
  parseLog: (logId: number) =>
    request<{ log_id: number; events_parsed: number; message: string }>(
      `/logs/${logId}/parse`,
      { method: 'POST' }
    ),
  getLogEvents: (logId: number) => request<ParsedLogEvent[]>(`/logs/${logId}/events`),
  chunkLog: (logId: number) =>
    request<{ log_id: number; chunks_created: number; message: string }>(
      `/logs/${logId}/chunk`,
      { method: 'POST' }
    ),
  getLogChunks: (logId: number) => request<Chunk[]>(`/logs/${logId}/chunks`),

  // Chunks & Search
  getProjectChunks: (projectId: number) =>
    request<Chunk[]>(`/projects/${projectId}/chunks`),
  getChunk: (chunkId: number) => request<Chunk>(`/chunks/${chunkId}`),
  searchRerank: (data: { project_id: number; query: string; top_k?: number }) =>
    request<RerankSearchResult[]>('/search/rerank', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // Debug Reports
  createDebugReport: (data: DebugReportCreate) =>
    request<DebugReport>('/debug-reports', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  getDebugReport: (reportId: number) =>
    request<DebugReport>(`/debug-reports/${reportId}`),
  getProjectDebugReports: (projectId: number) =>
    request<DebugReport[]>(`/projects/${projectId}/debug-reports`),

  // Agent Runs
  createAgentRun: (data: AgentRunCreate) =>
    request<AgentRun>('/agent-runs', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  getAgentRun: (agentRunId: number) =>
    request<AgentRun>(`/agent-runs/${agentRunId}`),
  getAgentRunSteps: (agentRunId: number) =>
    request<AgentStep[]>(`/agent-runs/${agentRunId}/steps`),
};
