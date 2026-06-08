from pydantic import BaseModel, ConfigDict
import datetime
from typing import Optional

class ChunkRead(BaseModel):
    id: int
    project_id: int
    repository_id: Optional[int] = None
    code_file_id: Optional[int] = None
    uploaded_log_id: Optional[int] = None
    
    source_type: str
    chunk_type: str
    language: Optional[str] = None
    file_path: Optional[str] = None
    symbol_name: Optional[str] = None
    test_name: Optional[str] = None
    error_type: Optional[str] = None
    
    start_line: Optional[int] = None
    end_line: Optional[int] = None
    content: str
    content_hash: str
    token_count: int
    metadata_json: Optional[str] = None
    
    created_at: datetime.datetime
    updated_at: datetime.datetime

    model_config = ConfigDict(from_attributes=True)
