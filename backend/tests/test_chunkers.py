from app.services.token_estimator import estimate_token_count
from app.services.chunkers import PythonChunker, MarkdownChunker, JSTSChunker, LogChunker

def test_token_count_estimator():
    text = "def validate_token(token): pass"
    # def, validate_token, (, token, ), :, pass
    # expect 7 tokens
    count = estimate_token_count(text)
    assert count == 7

def test_python_ast_chunker():
    code = """
class AuthService:
    def validate_token(self, token):
        pass

def login_user(email, password):
    pass

def test_auth():
    assert True
"""
    chunks = PythonChunker.chunk(code, "auth.py")
    
    # Expect Class, Method, Function, and Test function. Total: 4 chunks
    assert len(chunks) == 4
    
    # Check Class chunk
    class_chunk = next(c for c in chunks if c["chunk_type"] == "class")
    assert class_chunk["symbol_name"] == "AuthService"
    assert class_chunk["start_line"] == 2
    
    # Check Method chunk
    method_chunk = next(c for c in chunks if c["chunk_type"] == "method")
    assert method_chunk["symbol_name"] == "AuthService.validate_token"
    assert method_chunk["metadata"]["parent_class"] == "AuthService"
    
    # Check Function chunk
    func_chunk = next(c for c in chunks if c["chunk_type"] == "function")
    assert func_chunk["symbol_name"] == "login_user"
    
    # Check Test function chunk
    test_chunk = next(c for c in chunks if c["chunk_type"] == "test_function")
    assert test_chunk["symbol_name"] == "test_auth"


def test_markdown_chunker():
    md = """# Setup
Install packages.
## Usage
Run uvicorn.
"""
    chunks = MarkdownChunker.chunk(md, "README.md")
    assert len(chunks) == 2
    
    c1 = chunks[0]
    assert c1["symbol_name"] == "Setup"
    assert "Install packages." in c1["content"]
    
    c2 = chunks[1]
    assert c2["symbol_name"] == "Usage"
    assert "Run uvicorn." in c2["content"]


def test_js_ts_chunker():
    js = """
class UserService {
    get() {}
}
export function fetchUsers() {
    return [];
}
const deleteUser = (id) => {
    return true;
};
"""
    chunks = JSTSChunker.chunk(js, "user.js")
    
    assert len(chunks) == 3
    
    c_class = chunks[0]
    assert c_class["chunk_type"] == "class"
    assert c_class["symbol_name"] == "UserService"
    
    c_func = chunks[1]
    assert c_func["chunk_type"] == "function"
    assert c_func["symbol_name"] == "fetchUsers"
    
    c_arrow = chunks[2]
    assert c_arrow["chunk_type"] == "function"
    assert c_arrow["symbol_name"] == "deleteUser"


def test_log_chunker():
    pytest_log = """
FAILED tests/test_auth.py::test_login_success
E   AssertionError: assert 401 == 200
app/auth/middleware.py:42: in validate_token
"""
    chunks = LogChunker.chunk(pytest_log, 1)
    
    assert len(chunks) == 1
    chunk = chunks[0]
    assert chunk["chunk_type"] == "pytest_failure"
    assert chunk["test_name"] == "tests/test_auth.py::test_login_success"
    assert chunk["error_type"] == "AssertionError"
    assert chunk["metadata"]["error_message"] == "assert 401 == 200"
    assert len(chunk["metadata"]["file_references"]) == 1
    assert chunk["metadata"]["file_references"][0]["file_path"] == "app/auth/middleware.py"
