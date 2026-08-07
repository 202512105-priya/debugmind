from langgraph.graph import StateGraph, START, END
from langchain_core.runnables import RunnableConfig

from app.agents.state import DebugAgentState
from app.agents.nodes import (
    classifier_node,
    query_planner_node,
    retriever_node,
    root_cause_analyzer_node,
    verifier_node,
    report_writer_node
)

def should_retry_or_write(state: DebugAgentState) -> str:
    ver_res = state.get("verification_result", {})
    needs_retry = ver_res.get("needs_retry", False)
    iteration = state.get("iteration_count", 0)

    # Route back to query planner if verification failed and under max retries (2)
    if needs_retry and iteration < 2:
        return "query_planner"
    return "report_writer"


def build_debug_graph():
    builder = StateGraph(DebugAgentState)

    # 1. Add nodes
    builder.add_node("classifier", classifier_node)
    builder.add_node("query_planner", query_planner_node)
    builder.add_node("retriever", retriever_node)
    builder.add_node("root_cause_analyzer", root_cause_analyzer_node)
    builder.add_node("verifier", verifier_node)
    builder.add_node("report_writer", report_writer_node)

    # 2. Add edges
    builder.add_edge(START, "classifier")
    builder.add_edge("classifier", "query_planner")
    builder.add_edge("query_planner", "retriever")
    builder.add_edge("retriever", "root_cause_analyzer")
    builder.add_edge("root_cause_analyzer", "verifier")

    # 3. Add conditional edge from verifier
    builder.add_conditional_edges(
        "verifier",
        should_retry_or_write,
        {
            "query_planner": "query_planner",
            "report_writer": "report_writer"
        }
    )

    builder.add_edge("report_writer", END)

    return builder.compile()

# Pre-compiled agent graph
debug_agent_graph = build_debug_graph()
