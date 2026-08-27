export interface Project {
  id: number;
  name: string;
  description?: string | null;
  owner_id?: number | null;
  created_at?: string;
}

export interface ProjectCreate {
  name: string;
  description?: string;
  owner_id?: number;
}

export interface Repository {
  id: number;
  project_id: number;
  name: string;
  source_type: string;
  root_path: string;
  status: string;
  created_at: string;
  files_count?: number;
  chunks_count?: number;
  embeddings_count?: number;
}

export interface RepositoryCreate {
  name: string;
  source_type: string;
  root_path: string;
}

export interface CodeFile {
  id: number;
  repository_id: number;
  project_id?: number;
  file_path: string;
  language?: string | null;
  content: string;
  size_bytes?: number | null;
  line_count?: number | null;
  created_at: string;
}

export interface UploadedLog {
  id: number;
  project_id: number;
  filename: string;
  raw_content: string;
  created_at: string;
}

export interface UploadedLogCreate {
  filename: string;
  raw_content: string;
}

export interface ParsedLogEvent {
  id: number;
  uploaded_log_id: number;
  event_type: string;
  test_name?: string | null;
  error_type?: string | null;
  message?: string | null;
  file_path?: string | null;
  line_number?: number | null;
  stack_trace?: string | null;
}

export interface Chunk {
  id: number;
  project_id: number;
  repository_id?: number | null;
  uploaded_log_id?: number | null;
  code_file_id?: number | null;
  source_type: string;
  chunk_type: string;
  file_path?: string | null;
  symbol_name?: string | null;
  test_name?: string | null;
  error_type?: string | null;
  start_line?: number | null;
  end_line?: number | null;
  token_count?: number | null;
  content: string;
}

export interface EvidenceItem {
  chunk_id: number;
  file_path?: string | null;
  start_line?: number | null;
  end_line?: number | null;
  reason: string;
}

export interface DebugReport {
  id: number;
  project_id: number;
  uploaded_log_id?: number | null;
  query: string;
  failure_type: string;
  summary: string;
  likely_root_cause?: string | null;
  suggested_fix?: string | null;
  confidence: number;
  status: string;
  model_name: string;
  missing_information: string[];
  created_at: string;
  evidence: EvidenceItem[];
}

export interface DebugReportCreate {
  project_id: number;
  uploaded_log_id?: number | null;
  query?: string | null;
  top_k?: number;
}

export interface AgentStep {
  id: number;
  agent_run_id: number;
  step_name: string;
  input_json: string;
  output_json: string;
  latency_ms: number;
  status: string;
  created_at: string;
}

export interface AgentRun {
  id: number;
  project_id: number;
  uploaded_log_id?: number | null;
  query: string;
  status: string;
  failure_type?: string | null;
  final_report_id?: number | null;
  error_message?: string | null;
  started_at: string;
  completed_at?: string | null;
  steps: AgentStep[];
}

export interface AgentRunCreate {
  project_id: number;
  uploaded_log_id?: number | null;
  query?: string | null;
}

export interface HybridSearchResult {
  chunk_id: number;
  file_path?: string | null;
  symbol_name?: string | null;
  chunk_type: string;
  vector_score: number;
  keyword_score: number;
  hybrid_score: number;
  content_preview: string;
}

export interface RerankSearchResult extends HybridSearchResult {
  rerank_score: number;
  reason: string;
  rank: number;
}

export interface RerankSearchResponse {
  query: string;
  results: RerankSearchResult[];
}
