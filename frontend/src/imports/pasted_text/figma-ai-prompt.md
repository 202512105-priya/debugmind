Here’s a prompt you can give to Figma AI (or any AI UI generator) to upgrade your existing design instead of redesigning it from scratch.

⸻

Improve Existing DebugMind Dashboard (Do NOT Redesign From Scratch)

I already have a working design for DebugMind.

Do NOT create a new dashboard.

Instead, improve the existing UI by making it feel like a real production engineering platform similar to GitHub + Sourcegraph + Datadog + Sentry + LangSmith.

Keep the current visual style, spacing, colors, typography, sidebar, cards, tables and components.

Only improve the product architecture and navigation.

⸻

Biggest Problem

Currently the application feels Project-centric.

Instead it should feel

Workspace
    ↓
Projects
    ↓
Project
    ↓
Repositories
    ↓
Repository Workspace

Every project contains multiple repositories.

Example

payments-api
    backend-api
    frontend
    shared-lib
    infrastructure

Each repository has its own

* source code
* files
* chunks
* embeddings
* git history
* reports
* indexing
* analysis

Currently those are incorrectly shared for the entire project.

⸻

Improve Repository Management

The Repository page should NOT just be a table.

Clicking

backend-api

should open

Repository Workspace

similar to GitHub.

Inside Repository Workspace create

Overview
Files
Source Explorer
Symbol Explorer
Chunk Explorer
Embeddings
Git History
Reports
Settings

⸻

Add Repository Overview

Repository Overview should contain

Top metric cards

Files
Functions
Classes
Chunks
Embeddings
Reports
Failures
Coverage
Last Sync

Below

Recent activity

Chunking completed
Embeddings updated
Git synced
Analysis finished
New report generated

Repository Health

Indexed
Embedding Status
Coverage
Pending Files
Errors
Last Commit

⸻

Add File Explorer

Instead of directly opening source code

Show GitHub-like explorer

backend-api
src
app
auth
middleware.py
handlers.py
tests
config
README.md

Clicking any file opens

Source Viewer

⸻

Improve Source Explorer

Current source explorer only shows code.

Add

Top information bar

Repository
Branch
Commit
Language
Lines
Tokens
Chunks
Embedding Status
Last Modified

Right side inspector

Functions
Classes
Imports
Exports
References
Related Reports
Related Chunks
Git History

Bottom

Chunk visualization

Colored markers showing exactly where every chunk starts and ends.

⸻

Add Symbol Explorer

Create a completely new page.

Purpose

Browse symbols.

Tabs

Functions
Classes
Interfaces
Enums
Imports
Exports

Clicking any function opens

Code Preview
Definition
References
Related Reports
Related Chunks

⸻

Improve Chunk Explorer

Current Chunk Explorer is too simple.

Each chunk should have

Chunk ID
Repository
File
Start Line
End Line
Token Count
Embedding Status
Embedding Version
Similarity Score
Retrieved Count
Referenced Reports
Incoming References
Outgoing References
Created Date
Last Retrieved

Right panel

Chunk Preview
Metadata
Embedding
Related Chunks
Used In Reports
Semantic Neighbors

⸻

Improve Embeddings

Current page only shows a table.

Add

Overview cards

Embedding Model
Dimensions
Coverage
Pending
Total Size
Storage
Average Chunk Size
Version

Table

Vector ID
Chunk
Similarity
Created
Retrieved Count
Status
Provider

Add embedding coverage progress visualization.

⸻

Improve Reports

Reports should be interconnected.

Evidence cards should allow navigation

Evidence
↓
Source Code
↓
Chunk
↓
Repository
↓
Git Commit

Everything clickable.

Do not isolate reports.

⸻

Improve Git Diff

Current git diff is too basic.

Add

Recent commits panel

Commit
Author
Time
Changed Files
Files Added
Files Modified
Files Deleted

Selecting a commit opens

Split diff

At bottom show

AI Impacted Chunks
Referenced Reports
Likely Root Cause
Confidence

⸻

Add Analysis Runs Page

Create new page

Analysis Runs

Table

Run ID
Repository
Started
Duration
Status
Chunks Retrieved
Tokens
Cost
Confidence
Report

Clicking a run opens

Timeline
Search Queries
Retrieved Chunks
Evidence
Cost
Latency
Agent Trace

⸻

Improve Agent Trace

Current trace is good.

Improve it further.

Show

Planner
Retriever
Reranker
Analyzer
Verifier
Reporter

Timeline visualization.

Each step should include

Latency
Cost
Prompt Version
Input
Output
Retries
Tokens
Started
Finished
Expandable JSON

Keep the warning

Structured trace only.
Private model reasoning is never displayed.

⸻

Add Retrieval Visualization

Create a visual pipeline.

Search Query
↓
52 Chunks Retrieved
↓
Ranked
↓
Top 8
↓
Context Window
↓
Top 3 Evidence
↓
Root Cause
↓
Report

Use cards connected with arrows.

⸻

Add Global Search

Press

⌘K

Search

Projects
Repositories
Files
Functions
Classes
Chunks
Reports
Logs
Analysis Runs

Like Linear.

⸻

Improve Navigation

Everything should be linked.

Example

Report
↓
Evidence
↓
Chunk
↓
Source Code
↓
Repository
↓
Git Commit

Nothing should feel isolated.

⸻

Repository Architecture

Each Project

payments-api
Repositories
backend-api
frontend
shared-lib
infrastructure

Each Repository

Overview
Files
Source Explorer
Symbol Explorer
Chunk Explorer
Embeddings
Git History
Reports
Analysis Runs
Settings

⸻

Keep Existing Style

Do NOT redesign the visual theme.

Keep

* white content area
* dark sidebar
* compact spacing
* GitHub-like typography
* subtle borders
* 8px radius
* blue accent
* dense engineering UI

Only improve the information architecture, navigation, and developer workflow.

⸻

Goal

The final product should feel like a production-grade internal engineering platform that combines:

* GitHub for repository navigation
* Sourcegraph for code exploration
* Datadog/Sentry for debugging and observability
* LangSmith for AI execution traces
* Linear for clean information density

The UI should support a natural developer workflow: Workspace → Project → Repository → File → Chunk → Evidence → Report → Agent Trace, with every entity cross-linked and inspectable.