# DebugMind Placement Interview Cheat-Sheet

This cheat-sheet provides standard answers to common placement interview questions about DebugMind.

---

## 🎯 3 Placement Resume Bullets

```latex
\resumeProjectHeading
{\textbf{DebugMind AI} $|$ \emph{React, TypeScript, Python, FastAPI, LangGraph, PostgreSQL (pgvector), Tailwind CSS, OpenAI}}
{\href{https://github.com/202512105-priya/debugmind}{\faGithub}}
\resumeItemListStart
    \resumeItem{Engineered an AI reliability platform (\textbf{DebugMind}) utilizing Retrieval-Augmented Generation (RAG) and AST code chunking (Python/TS/JS) to analyze CI failure logs, isolate stack traces, and generate grounded debug reports with root-cause analysis and line-range evidence citations.}

    \resumeItem{Architected a multi-step \textbf{LangGraph} agent state machine backed by \textbf{PostgreSQL (pgvector)} hybrid search (dense vector similarity + BM25 keyword matching) and relevance reranking to automate failure classification, query planning, and evidence verification.}

    \resumeItem{Developed a production \textbf{FastAPI} backend and \textbf{React + TypeScript} dashboard featuring GitHub repository cloning, interactive AST code viewers, target scope filters, and real-time step telemetry for multi-step agent runs.}
\resumeItemListEnd
```

---

## 🎤 Interview Questions & Answers

### 1. How do you evaluate a RAG system?
> "We evaluate RAG in two distinct stages: **Retrieval Evaluation** and **Generation Evaluation**. For retrieval, we measure $\text{Recall}@k$ and $\text{Precision}@k$ against a golden dataset. For generation, we run LLM-as-a-Judge scoring for root cause correctness, evidence groundedness, and hallucination detection."

### 2. Why evaluate retrieval separately from generation?
> "Because if a generated report is bad, the error could be in retrieval (wrong chunks retrieved) or in generation (LLM hallucinated). Testing retrieval separately isolates whether the retriever found the required context."

### 3. What is Hybrid Search and why did you use it?
> "Vector search alone misses exact variable names or stack trace identifiers. BM25 keyword search misses semantic meaning. Hybrid search combines dense cosine similarity vectors with sparse keyword scores, producing significantly higher retrieval recall."

### 4. How does the LangGraph state machine work?
> "It is a bounded state machine with 6 single-responsibility nodes: Classifier, Planner, Retriever, Analyzer, Verifier, and Writer. If the Verifier detects weak or ungrounded evidence, a conditional retry edge routes back to the Query Planner for a second search pass."

### 5. How do you handle secrets in CI logs?
> "Raw uploaded logs pass through a regex secret redactor before database persistence. It replaces database connection strings, OpenAI API keys, AWS credentials, and Bearer tokens with `[REDACTED]`."
