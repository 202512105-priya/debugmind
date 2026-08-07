from pydantic import BaseModel, ConfigDict
import datetime
from typing import List, Optional

class FileReferenceRead(BaseModel):
    id: int
    parsed_log_event_id: int
    file_path: str
    line_number: int
    function_name: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)

class ParsedLogEventRead(BaseModel):
    id: int
    uploaded_log_id: int
    event_type: str
    test_name: Optional[str] = None
    error_type: Optional[str] = None
    error_message: Optional[str] = None
    raw_block: str
    created_at: datetime.datetime
    file_references: List[FileReferenceRead] = []

    model_config = ConfigDict(from_attributes=True)
