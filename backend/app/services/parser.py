import re
from typing import List, Dict, Any, Optional

class LogParserService:
    # Regex patterns
    PYTEST_HEADER_RE = re.compile(r"_{3,}\s+(.+?)\s+_{3,}")
    PYTEST_FAILED_LINE_RE = re.compile(r"FAILED\s+([^\s]+)")
    
    # Matches: E   AssertionError: assert 401 == 200
    # Matches: E   AttributeError: 'NoneType' object has no attribute 'get'
    PYTEST_ERROR_RE = re.compile(r"^E\s+([A-Za-z_][A-Za-z0-9_]*Error|AssertionError|Exception):\s*(.*)", re.MULTILINE)
    # Fallback error line matching any E <msg>
    PYTEST_ERROR_FALLBACK_RE = re.compile(r"^E\s+(.*)", re.MULTILINE)

    # File reference patterns
    # 1. app/auth/middleware.py:42: in validate_token
    FILE_REF_IN_RE = re.compile(r"(?:\b|/)([\w\-\./]+\.\w+):(\d+):\s+in\s+([\w<>_]+)")
    # 2. File "app/auth/middleware.py", line 42, in validate_token
    FILE_REF_PYTHON_RE = re.compile(r"File\s+\"([^\"]+)\",\s+line\s+(\d+)(?:,\s+in\s+([\w<>_]+))?")
    # 3. app/auth/middleware.py:42
    FILE_REF_SIMPLE_RE = re.compile(r"(?:\b|/)([\w\-\./]+\.\w+):(\d+)\b")

    @classmethod
    def parse_file_references(cls, text: str) -> List[Dict[str, Any]]:
        references = []
        seen = set()

        # Match Pattern 1: path:line: in func
        for match in cls.FILE_REF_IN_RE.finditer(text):
            path, line, func = match.groups()
            key = (path, int(line), func)
            if key not in seen:
                seen.add(key)
                references.append({
                    "file_path": path,
                    "line_number": int(line),
                    "function_name": func
                })

        # Match Pattern 2: File "path", line line, in func
        for match in cls.FILE_REF_PYTHON_RE.finditer(text):
            path, line, func = match.groups()
            key = (path, int(line), func)
            if key not in seen:
                seen.add(key)
                references.append({
                    "file_path": path,
                    "line_number": int(line),
                    "function_name": func
                })

        # Match Pattern 3: path:line (avoid duplicate overlap with pattern 1)
        for match in cls.FILE_REF_SIMPLE_RE.finditer(text):
            path, line = match.groups()
            # If this path and line is already tracked under any function, skip it
            already_tracked = any(r["file_path"] == path and r["line_number"] == int(line) for r in references)
            if not already_tracked:
                key = (path, int(line), None)
                if key not in seen:
                    seen.add(key)
                    references.append({
                        "file_path": path,
                        "line_number": int(line),
                        "function_name": None
                    })

        return references

    @classmethod
    def parse_log(cls, raw_content: str) -> List[Dict[str, Any]]:
        # Check if the log contains detailed pytest failures (e.g. ____ test_name ____)
        headers = list(cls.PYTEST_HEADER_RE.finditer(raw_content))
        
        events = []

        if headers:
            # Split log into sections by headers
            for i, match in enumerate(headers):
                start_idx = match.start()
                end_idx = headers[i + 1].start() if i + 1 < len(headers) else len(raw_content)
                block_text = raw_content[start_idx:end_idx]
                
                test_name = match.group(1)
                
                # Extract error info
                error_type = None
                error_msg = None
                
                err_match = cls.PYTEST_ERROR_RE.search(block_text)
                if err_match:
                    error_type, error_msg = err_match.groups()
                else:
                    err_fallback = cls.PYTEST_ERROR_FALLBACK_RE.search(block_text)
                    if err_fallback:
                        error_msg = err_fallback.group(1).strip()
                        # Deduce error type if there is a colon
                        if ":" in error_msg:
                            parts = error_msg.split(":", 1)
                            error_type = parts[0].strip()
                            error_msg = parts[1].strip()

                # Extract file references from the block
                refs = cls.parse_file_references(block_text)

                events.append({
                    "event_type": "pytest_failure",
                    "test_name": test_name,
                    "error_type": error_type,
                    "error_message": error_msg,
                    "raw_block": block_text,
                    "file_references": refs
                })
        else:
            # No pytest header blocks found; treat the entire log as a single log run
            # or try to extract lines starting with FAILED
            failed_tests = list(cls.PYTEST_FAILED_LINE_RE.finditer(raw_content))
            
            if failed_tests:
                # Try to search for error info in the entire text
                error_type = "Failure"
                error_msg = None
                err_match = cls.PYTEST_ERROR_RE.search(raw_content)
                if err_match:
                    error_type, error_msg = err_match.groups()
                else:
                    err_fallback = cls.PYTEST_ERROR_FALLBACK_RE.search(raw_content)
                    if err_fallback:
                        error_msg = err_fallback.group(1).strip()
                        if ":" in error_msg:
                            parts = error_msg.split(":", 1)
                            error_type = parts[0].strip()
                            error_msg = parts[1].strip()
                if not error_msg:
                    error_msg = "Test failed"

                for match in failed_tests:
                    test_name = match.group(1)
                    events.append({
                        "event_type": "pytest_failure",
                        "test_name": test_name,
                        "error_type": error_type,
                        "error_message": error_msg,
                        "raw_block": raw_content,
                        "file_references": cls.parse_file_references(raw_content)
                    })
            else:
                # Completely generic traceback / log
                # Search for typical Python exception message at the end of stack traces
                error_type = None
                error_msg = None
                
                # Try to search for Python exception style at the end of the text
                lines = raw_content.splitlines()
                for line in reversed(lines):
                    m = re.match(r"^([A-Za-z_][A-Za-z0-9_]*Error|Exception):\s*(.*)", line)
                    if m:
                        error_type, error_msg = m.groups()
                        break
                
                refs = cls.parse_file_references(raw_content)
                if refs or error_type:
                    events.append({
                        "event_type": "generic_stack_trace",
                        "test_name": None,
                        "error_type": error_type,
                        "error_message": error_msg,
                        "raw_block": raw_content,
                        "file_references": refs
                    })

        return events
