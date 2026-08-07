# Import all the models, so that Base has them before being
# imported by Alembic
from app.db.session import Base  # noqa
from app.models.user import User  # noqa
from app.models.project import Project  # noqa
from app.models.repository import Repository  # noqa
from app.models.code_file import CodeFile  # noqa
from app.models.uploaded_log import UploadedLog  # noqa
from app.models.parsed_log_event import ParsedLogEvent  # noqa
from app.models.file_reference import FileReference  # noqa
from app.models.analysis_run import AnalysisRun  # noqa
from app.models.chunk import Chunk  # noqa
from app.models.chunk_embedding import ChunkEmbedding  # noqa
from app.models.retrieval_log import RetrievalLog  # noqa
from app.models.debug_report import DebugReport  # noqa
from app.models.debug_report_evidence import DebugReportEvidence  # noqa
from app.models.llm_call import LLMCall  # noqa
from app.models.agent_run import AgentRun  # noqa
from app.models.agent_step import AgentStep  # noqa
