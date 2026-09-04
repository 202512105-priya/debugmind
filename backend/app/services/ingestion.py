import os
import hashlib
import tempfile
import shutil
import subprocess
from typing import Optional, Dict
from sqlalchemy.orm import Session
from app.models.code_file import CodeFile

class RepositoryIngestionService:
    EXTENSION_MAP: Dict[str, str] = {
        ".py": "python",
        ".js": "javascript",
        ".ts": "typescript",
        ".tsx": "typescript-react",
        ".jsx": "javascript-react",
        ".cpp": "cpp",
        ".cc": "cpp",
        ".cxx": "cpp",
        ".c": "c",
        ".h": "cpp",
        ".hpp": "cpp",
        ".java": "java",
        ".go": "go",
        ".rs": "rust",
        ".rb": "ruby",
        ".php": "php",
        ".cs": "csharp",
        ".sh": "bash",
        ".bash": "bash",
        ".kt": "kotlin",
        ".swift": "swift",
        ".sql": "sql",
        ".md": "markdown",
        ".txt": "text",
        ".yaml": "yaml",
        ".yml": "yaml",
        ".toml": "toml",
        ".json": "json"
    }

    IGNORE_DIRS = {
        ".git", "node_modules", ".venv", "venv", "__pycache__", "dist", "build", "pasted_text", "imports"
    }

    IGNORE_FILES = {
        ".env", ".DS_Store"
    }

    IGNORE_EXTENSIONS = {
        ".png", ".jpg", ".jpeg", ".gif", ".ico", ".svg", ".webp",
        ".zip", ".tar", ".gz", ".7z", ".rar",
        ".pdf", ".exe", ".so", ".dylib", ".dll", ".bin", ".pyc", ".o", ".a", ".woff", ".woff2", ".ttf"
    }

    @classmethod
    def detect_language(cls, filename: str) -> Optional[str]:
        ext = os.path.splitext(filename)[1].lower()
        if ext in cls.IGNORE_EXTENSIONS:
            return None
        return cls.EXTENSION_MAP.get(ext, "text")

    @classmethod
    def should_ignore(cls, relative_path: str) -> bool:
        parts = relative_path.split(os.sep)
        for part in parts:
            if part in cls.IGNORE_DIRS:
                return True
            if part in cls.IGNORE_FILES:
                return True
            if part.endswith(".pyc"):
                return True
        return False

    @classmethod
    def is_github_url(cls, path_or_url: str) -> bool:
        p = path_or_url.strip().lower()
        return p.startswith("http://") or p.startswith("https://") or p.startswith("git@") or "github.com" in p or (len(p.split("/")) == 2 and not p.startswith("/") and not p.startswith("."))

    @classmethod
    def clone_github_repo(cls, github_url: str) -> str:
        clean_url = github_url.strip()
        if not clean_url.startswith("http") and not clean_url.startswith("git@"):
            clean_url = f"https://github.com/{clean_url}.git"
        if not clean_url.endswith(".git") and "github.com" in clean_url:
            clean_url = clean_url + ".git"

        temp_dir = tempfile.mkdtemp(prefix="debugmind_github_")

        # 1. Try git clone first
        try:
            subprocess.run(
                ["git", "clone", "--depth", "1", clean_url, temp_dir],
                check=True,
                capture_output=True,
                timeout=60
            )
            return temp_dir
        except Exception as git_err:
            shutil.rmtree(temp_dir, ignore_errors=True)

        # 2. ZIP archive fallback (works on cloud servers without git CLI)
        try:
            import urllib.request
            import zipfile
            import io

            clean_path = clean_url.replace("https://github.com/", "").replace("http://github.com/", "").replace(".git", "").strip("/")
            zip_dir = tempfile.mkdtemp(prefix="debugmind_zip_")
            zip_urls = [
                f"https://github.com/{clean_path}/archive/refs/heads/main.zip",
                f"https://github.com/{clean_path}/archive/refs/heads/master.zip"
            ]

            downloaded = False
            for z_url in zip_urls:
                try:
                    req = urllib.request.Request(z_url, headers={"User-Agent": "DebugMind/1.0"})
                    with urllib.request.urlopen(req, timeout=30) as resp:
                        zip_bytes = resp.read()
                        with zipfile.ZipFile(io.BytesIO(zip_bytes)) as zf:
                            zf.extractall(zip_dir)
                            downloaded = True
                            break
                except Exception:
                    continue

            if downloaded:
                subdirs = [os.path.join(zip_dir, d) for d in os.listdir(zip_dir) if os.path.isdir(os.path.join(zip_dir, d))]
                if subdirs:
                    return subdirs[0]
                return zip_dir

            raise ValueError(f"Could not download repository archive from {github_url}")
        except Exception as e:
            raise ValueError(f"Failed to ingest GitHub repository '{github_url}': {str(e)}")

    @classmethod
    def scan_and_ingest(cls, db: Session, repository_id: int, root_path: str) -> int:
        target_path = root_path
        is_temp_clone = False

        if cls.is_github_url(root_path):
            target_path = cls.clone_github_repo(root_path)
            is_temp_clone = True
        elif not os.path.exists(root_path):
            raise ValueError(f"Local directory path '{root_path}' does not exist.")

        try:
            files_ingested = 0
            for root, dirs, files in os.walk(target_path):
                dirs[:] = [d for d in dirs if d not in cls.IGNORE_DIRS]

                for file in files:
                    abs_path = os.path.join(root, file)
                    rel_path = os.path.relpath(abs_path, target_path)

                    if cls.should_ignore(rel_path):
                        continue

                    language = cls.detect_language(file)
                    if not language:
                        continue

                    content = None
                    for encoding in ("utf-8", "latin-1", "cp1252"):
                        try:
                            with open(abs_path, "r", encoding=encoding) as f:
                                content = f.read()
                            break
                        except (UnicodeDecodeError, IOError):
                            continue

                    if content is None:
                        continue

                    size_bytes = len(content.encode("utf-8"))
                    line_count = len(content.splitlines())
                    content_hash = hashlib.sha256(content.encode("utf-8")).hexdigest()

                    code_file = db.query(CodeFile).filter(
                        CodeFile.repository_id == repository_id,
                        CodeFile.file_path == rel_path
                    ).first()

                    if code_file:
                        if code_file.content_hash != content_hash:
                            code_file.content = content
                            code_file.size_bytes = size_bytes
                            code_file.line_count = line_count
                            code_file.content_hash = content_hash
                            code_file.language = language
                            db.add(code_file)
                    else:
                        code_file = CodeFile(
                            repository_id=repository_id,
                            file_path=rel_path,
                            language=language,
                            content=content,
                            size_bytes=size_bytes,
                            line_count=line_count,
                            content_hash=content_hash
                        )
                        db.add(code_file)
                    files_ingested += 1

            db.commit()
            return files_ingested
        finally:
            if is_temp_clone and os.path.exists(target_path):
                shutil.rmtree(target_path, ignore_errors=True)
