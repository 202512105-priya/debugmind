import os
from app.services.ingestion import RepositoryIngestionService
from app.models.repository import Repository
from app.models.code_file import CodeFile

def test_repository_scanner(db_session, tmp_path):
    # 1. Create a dummy repository structure
    repo_dir = tmp_path / "mock_repo"
    repo_dir.mkdir()
    
    # Standard source files
    (repo_dir / "README.md").write_text("# Mock Repo", encoding="utf-8")
    
    app_dir = repo_dir / "app"
    app_dir.mkdir()
    (app_dir / "main.py").write_text("print('hello')", encoding="utf-8")
    (app_dir / "utils.js").write_text("console.log('utils')", encoding="utf-8")
    
    # Ignored directory
    cache_dir = app_dir / "__pycache__"
    cache_dir.mkdir()
    (cache_dir / "main.cpython-39.pyc").write_bytes(b"binarystuff")
    
    # Ignored file
    (repo_dir / ".env").write_text("SECRET=123", encoding="utf-8")
    
    # Unmapped extension
    (repo_dir / "photo.png").write_bytes(b"binaryimage")
    
    # 2. Seed Repository record in database
    repo = Repository(
        name="Mock Repo",
        project_id=1,
        source_type="local",
        root_path=str(repo_dir)
    )
    db_session.add(repo)
    db_session.commit()
    
    # 3. Trigger Scanner
    count = RepositoryIngestionService.scan_and_ingest(db_session, repo.id, str(repo_dir))
    
    # Expecting 3 files: README.md (markdown), app/main.py (python), app/utils.js (javascript)
    assert count == 3
    
    # 4. Verify Database Records
    files = db_session.query(CodeFile).filter(CodeFile.repository_id == repo.id).all()
    assert len(files) == 3
    
    paths = [f.file_path for f in files]
    assert "README.md" in paths
    assert "app/main.py" in paths or "app/main.py" in [p.replace("\\", "/") for p in paths]
    assert "app/utils.js" in paths or "app/utils.js" in [p.replace("\\", "/") for p in paths]
    
    # Verify ignored items are not in DB
    assert ".env" not in paths
    assert "photo.png" not in paths
    
    main_py_file = next(f for f in files if "main.py" in f.file_path.replace("\\", "/"))
    assert main_py_file.language == "python"
    assert main_py_file.content == "print('hello')"
    assert main_py_file.line_count == 1
    assert len(main_py_file.content_hash) == 64
