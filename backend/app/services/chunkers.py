import ast
import re
import hashlib
from typing import List, Dict, Any, Optional
from app.services.token_estimator import estimate_token_count

class Chunker:
    @staticmethod
    def get_hash(text: str) -> str:
        return hashlib.sha256(text.encode("utf-8")).hexdigest()


class PythonChunker(Chunker):
    @classmethod
    def chunk(cls, content: str, file_path: str) -> List[Dict[str, Any]]:
        try:
            tree = ast.parse(content)
        except Exception:
            # Fallback to entire file if syntax is invalid
            return [{
                "chunk_type": "file",
                "symbol_name": None,
                "start_line": 1,
                "end_line": len(content.splitlines()),
                "content": content,
                "content_hash": cls.get_hash(content),
                "token_count": estimate_token_count(content),
                "metadata": {}
            }]

        lines = content.splitlines()
        chunks = []

        def get_span_content(start_line: int, end_line: int) -> str:
            # Line numbers in AST are 1-based.
            return "\n".join(lines[start_line - 1 : end_line])

        # Traverse AST
        for node in ast.iter_child_nodes(tree):
            if isinstance(node, ast.ClassDef):
                class_start = node.lineno
                class_end = getattr(node, "end_lineno", len(lines))
                class_content = get_span_content(class_start, class_end)
                
                chunks.append({
                    "chunk_type": "class",
                    "symbol_name": node.name,
                    "start_line": class_start,
                    "end_line": class_end,
                    "content": class_content,
                    "content_hash": cls.get_hash(class_content),
                    "token_count": estimate_token_count(class_content),
                    "metadata": {}
                })

                # Methods inside the class
                for subnode in node.body:
                    if isinstance(subnode, (ast.FunctionDef, ast.AsyncFunctionDef)):
                        method_start = subnode.lineno
                        method_end = getattr(subnode, "end_lineno", len(lines))
                        method_content = get_span_content(method_start, method_end)
                        
                        chunk_type = "method"
                        if subnode.name.startswith("test_"):
                            chunk_type = "test_function"
                        
                        chunks.append({
                            "chunk_type": chunk_type,
                            "symbol_name": f"{node.name}.{subnode.name}",
                            "start_line": method_start,
                            "end_line": method_end,
                            "content": method_content,
                            "content_hash": cls.get_hash(method_content),
                            "token_count": estimate_token_count(method_content),
                            "metadata": {"parent_class": node.name}
                        })

            elif isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
                func_start = node.lineno
                func_end = getattr(node, "end_lineno", len(lines))
                func_content = get_span_content(func_start, func_end)
                
                chunk_type = "function"
                if node.name.startswith("test_"):
                    chunk_type = "test_function"
                
                chunks.append({
                    "chunk_type": chunk_type,
                    "symbol_name": node.name,
                    "start_line": func_start,
                    "end_line": func_end,
                    "content": func_content,
                    "content_hash": cls.get_hash(func_content),
                    "token_count": estimate_token_count(func_content),
                    "metadata": {}
                })

        # If no structure chunks were found, yield the whole file
        if not chunks:
            chunks.append({
                "chunk_type": "file",
                "symbol_name": None,
                "start_line": 1,
                "end_line": len(lines),
                "content": content,
                "content_hash": cls.get_hash(content),
                "token_count": estimate_token_count(content),
                "metadata": {}
            })

        return chunks


class MarkdownChunker(Chunker):
    HEADING_RE = re.compile(r"^(#{1,6})\s+(.+)$")

    @classmethod
    def chunk(cls, content: str, file_path: str) -> List[Dict[str, Any]]:
        lines = content.splitlines()
        chunks = []
        
        current_heading = "Introduction"
        current_lines = []
        start_line = 1

        for i, line in enumerate(lines):
            match = cls.HEADING_RE.match(line)
            if match:
                # Save previous section if it has content
                if current_lines:
                    sec_content = "\n".join(current_lines)
                    chunks.append({
                        "chunk_type": "markdown_section",
                        "symbol_name": current_heading,
                        "start_line": start_line,
                        "end_line": i,  # up to current index
                        "content": sec_content,
                        "content_hash": cls.get_hash(sec_content),
                        "token_count": estimate_token_count(sec_content),
                        "metadata": {}
                    })
                
                current_heading = match.group(2).strip()
                current_lines = [line]
                start_line = i + 1
            else:
                current_lines.append(line)

        # Save last section
        if current_lines:
            sec_content = "\n".join(current_lines)
            chunks.append({
                "chunk_type": "markdown_section",
                "symbol_name": current_heading,
                "start_line": start_line,
                "end_line": len(lines),
                "content": sec_content,
                "content_hash": cls.get_hash(sec_content),
                "token_count": estimate_token_count(sec_content),
                "metadata": {}
            })

        return chunks


class JSTSChunker(Chunker):
    # Regex to find: class Name, function name(...), const name = (...), export function name(...)
    DECLARATION_RE = re.compile(
        r"^(?:\s*export\s+)?(?:"
        r"class\s+(\w+)|"
        r"(?:async\s+)?function\s+(\w+)\s*\(|"
        r"(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s*)?\([^)]*\)\s*=>"
        r")"
    )

    @classmethod
    def chunk(cls, content: str, file_path: str) -> List[Dict[str, Any]]:
        lines = content.splitlines()
        matches = []

        for i, line in enumerate(lines):
            m = cls.DECLARATION_RE.match(line)
            if m:
                # Get the captured non-null group (symbol name)
                symbol_name = next(g for g in m.groups() if g is not None)
                chunk_type = "class" if "class" in line else "function"
                matches.append((i + 1, symbol_name, chunk_type))

        if not matches:
            # Yield entire file
            return [{
                "chunk_type": "file",
                "symbol_name": None,
                "start_line": 1,
                "end_line": len(lines),
                "content": content,
                "content_hash": cls.get_hash(content),
                "token_count": estimate_token_count(content),
                "metadata": {}
            }]

        chunks = []
        for i, (start_line, symbol_name, chunk_type) in enumerate(matches):
            end_line = matches[i + 1][0] - 1 if i + 1 < len(matches) else len(lines)
            chunk_content = "\n".join(lines[start_line - 1 : end_line])
            
            chunks.append({
                "chunk_type": chunk_type,
                "symbol_name": symbol_name,
                "start_line": start_line,
                "end_line": end_line,
                "content": chunk_content,
                "content_hash": cls.get_hash(chunk_content),
                "token_count": estimate_token_count(chunk_content),
                "metadata": {}
            })

        return chunks


class LogChunker(Chunker):
    @classmethod
    def chunk(cls, raw_content: str, log_id: int) -> List[Dict[str, Any]]:
        # Reuse LogParserService to segment the log into failure blocks
        from app.services.parser import LogParserService
        events = LogParserService.parse_log(raw_content)
        
        chunks = []
        lines = raw_content.splitlines()

        for event in events:
            block_text = event["raw_block"]
            # Try to locate start/end lines of block_text in raw_content
            start_line = 1
            end_line = len(lines)
            try:
                # Find start index in lines
                block_lines = block_text.splitlines()
                if block_lines:
                    first_line = block_lines[0]
                    for idx, line in enumerate(lines):
                        if first_line in line:
                            start_line = idx + 1
                            end_line = min(len(lines), start_line + len(block_lines) - 1)
                            break
            except Exception:
                pass

            # Chunk Type mapping
            chunk_type = "pytest_failure"
            if event["event_type"] == "generic_stack_trace":
                chunk_type = "stack_trace"

            chunks.append({
                "chunk_type": chunk_type,
                "symbol_name": event["test_name"] or event["error_type"] or "Log Error Block",
                "test_name": event["test_name"],
                "error_type": event["error_type"],
                "start_line": start_line,
                "end_line": end_line,
                "content": block_text,
                "content_hash": cls.get_hash(block_text),
                "token_count": estimate_token_count(block_text),
                "metadata": {
                    "error_message": event["error_message"],
                    "file_references": event["file_references"]
                }
            })

        return chunks
