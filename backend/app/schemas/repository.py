from pydantic import BaseModel, ConfigDict
import datetime
from typing import Optional

class RepositoryBase(BaseModel):
    name: str
    source_type: str = "local"
    root_path: Optional[str] = None
    clone_url: Optional[str] = None

class RepositoryCreate(RepositoryBase):
    pass

class RepositoryRead(RepositoryBase):
    id: int
    project_id: int
    status: Optional[str] = "pending"
    created_at: datetime.datetime
    updated_at: datetime.datetime

    model_config = ConfigDict(from_attributes=True)
