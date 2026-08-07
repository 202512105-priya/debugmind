"""create embeddings table

Revision ID: 0004
Revises: 0003
Create Date: 2026-07-20 13:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from pgvector.sqlalchemy import Vector


# revision identifiers, used by Alembic.
revision: str = '0004'
down_revision: Union[str, None] = '0003'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Enable pgvector extension
    op.execute("CREATE EXTENSION IF NOT EXISTS vector;")

    # 2. Create chunk_embeddings table
    op.create_table(
        'chunk_embeddings',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('chunk_id', sa.Integer(), nullable=False),
        sa.Column('project_id', sa.Integer(), nullable=False),
        sa.Column('embedding_model', sa.String(length=100), nullable=False),
        sa.Column('embedding_dimension', sa.Integer(), nullable=False),
        sa.Column('embedding', Vector(dim=384), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(['chunk_id'], ['chunks.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['project_id'], ['projects.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_chunk_embeddings_chunk_id'), 'chunk_embeddings', ['chunk_id'], unique=True)
    op.create_index(op.f('ix_chunk_embeddings_id'), 'chunk_embeddings', ['id'], unique=False)
    op.create_index(op.f('ix_chunk_embeddings_project_id'), 'chunk_embeddings', ['project_id'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_chunk_embeddings_project_id'), table_name='chunk_embeddings')
    op.drop_index(op.f('ix_chunk_embeddings_id'), table_name='chunk_embeddings')
    op.drop_index(op.f('ix_chunk_embeddings_chunk_id'), table_name='chunk_embeddings')
    op.drop_table('chunk_embeddings')
