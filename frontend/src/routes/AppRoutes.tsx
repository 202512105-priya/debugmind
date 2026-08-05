import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { LoginPage } from '../features/auth/LoginPage';
import { ProjectsPage } from '../features/projects/ProjectsPage';
import { ProjectWorkspacePage } from '../features/projects/ProjectWorkspacePage';
import { RepositoriesPage } from '../features/repositories/RepositoriesPage';
import { LogsPage } from '../features/logs/LogsPage';
import { AnalysisPage } from '../features/analysis/AnalysisPage';
import { ReportsPage } from '../features/reports/ReportsPage';
import { ReportDetailPage } from '../features/reports/ReportDetailPage';
import { AgentTracePage } from '../features/agent-runs/AgentTracePage';

export const AppRoutes: React.FC = () => {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/projects" element={<ProjectsPage />} />
      <Route path="/projects/new" element={<ProjectsPage />} />
      <Route path="/projects/:projectId" element={<ProjectWorkspacePage />} />
      <Route path="/projects/:projectId/repository" element={<RepositoriesPage />} />
      <Route path="/projects/:projectId/logs" element={<LogsPage />} />
      <Route path="/projects/:projectId/analysis" element={<AnalysisPage />} />
      <Route path="/projects/:projectId/reports" element={<ReportsPage />} />
      <Route
        path="/projects/:projectId/agent-runs/:agentRunId"
        element={<AgentTracePage />}
      />
      <Route path="/reports/:reportId" element={<ReportDetailPage />} />
      <Route path="*" element={<Navigate to="/projects" replace />} />
    </Routes>
  );
};
