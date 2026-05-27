from pydantic import BaseModel, ConfigDict
import datetime

class UploadedLogBase(BaseModel):
    filename: str
    raw_content: str
    source_type: str = "pytest"

class UploadedLogCreate(UploadedLogBase):
    project_id: int

class UploadedLogRead(UploadedLogBase):
    id: int
    project_id: int
    created_at: datetime.datetime

    model_config = ConfigDict(from_attributes=True)
