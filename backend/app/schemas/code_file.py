from pydantic import BaseModel, ConfigDict
import datetime
from typing import Optional

class CodeFileCreate(BaseModel):
    file_path: str
    content: str
    language: Optional[str] = None

class CodeFileRead(BaseModel):
    id: int
    repository_id: int
    file_path: str
    language: str
    content: str
    size_bytes: int
    line_count: int
    content_hash: str
    created_at: datetime.datetime
    updated_at: datetime.datetime

    model_config = ConfigDict(from_attributes=True)
