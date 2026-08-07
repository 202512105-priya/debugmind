from app.services.parser import LogParserService

def test_parse_pytest_log():
    pytest_log = """
============================= test session starts ==============================
collected 3 items

tests/test_auth.py .F.                                                   [100%]

=================================== FAILURES ===================================
______________________________ test_login_success ______________________________

client = <fastapi.testclient.TestClient object at 0x1031b6430>

    def test_login_success(client):
        payload = {"email": "test@example.com", "password": "wrong"}
        response = client.post("/auth/login", json=payload)
>       assert response.status_code == 200
E       AssertionError: assert 401 == 200

tests/test_auth.py:28: AssertionError
----------------------------- Captured stderr call -----------------------------
app/auth/middleware.py:42: in validate_token
    raise HTTPException(status_code=401)
=========================== short test summary info ============================
FAILED tests/test_auth.py::test_login_success - AssertionError: assert 401 == 200
========================= 1 failed, 2 passed in 0.15s ==========================
"""
    
    events = LogParserService.parse_log(pytest_log)
    assert len(events) == 1
    
    event = events[0]
    assert event["event_type"] == "pytest_failure"
    assert event["test_name"] == "test_login_success"
    assert event["error_type"] == "AssertionError"
    assert event["error_message"] == "assert 401 == 200"
    
    refs = event["file_references"]
    # Should find references to test_auth.py:28 and middleware.py:42
    paths = [r["file_path"] for r in refs]
    assert "tests/test_auth.py" in paths
    assert "app/auth/middleware.py" in paths

    # Verify specific details
    ref_middleware = next(r for r in refs if r["file_path"] == "app/auth/middleware.py")
    assert ref_middleware["line_number"] == 42
    assert ref_middleware["function_name"] == "validate_token"


def test_parse_generic_traceback():
    traceback_log = """
Traceback (most recent call last):
  File "app/main.py", line 12, in <module>
    start_app()
  File "app/bootstrap.py", line 55, in start_app
    db.connect()
AttributeError: 'NoneType' object has no attribute 'connect'
"""
    events = LogParserService.parse_log(traceback_log)
    assert len(events) == 1
    
    event = events[0]
    assert event["event_type"] == "generic_stack_trace"
    assert event["error_type"] == "AttributeError"
    assert event["error_message"] == "'NoneType' object has no attribute 'connect'"
    
    refs = event["file_references"]
    assert len(refs) == 2
    assert refs[0]["file_path"] == "app/main.py"
    assert refs[0]["line_number"] == 12
    assert refs[0]["function_name"] == "<module>"
    
    assert refs[1]["file_path"] == "app/bootstrap.py"
    assert refs[1]["line_number"] == 55
    assert refs[1]["function_name"] == "start_app"
