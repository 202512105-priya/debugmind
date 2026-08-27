from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from app.core.config import settings

db_url = settings.DATABASE_URL
if db_url.startswith("postgres://"):
    db_url = db_url.replace("postgres://", "postgresql://", 1)

engine = create_engine(
    db_url,
    pool_pre_ping=True,  # checks connection liveness before executing queries
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

from sqlalchemy import text

def init_db():
    import app.models
    try:
        with engine.connect() as conn:
            conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector;"))
            conn.execute(text("ALTER TABLE repositories ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'pending';"))
            conn.commit()
    except Exception as err:
        print(f"pgvector/schema extension check note: {err}")
    Base.metadata.create_all(bind=engine)
