"""add hybrid search text and retrieval logs

Revision ID: 0005
Revises: 0004
Create Date: 2026-07-29 11:30:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '0005'
down_revision: Union[str, None] = '0004'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Add search_text column to chunks table
    op.add_column('chunks', sa.Column('search_text', sa.Text(), nullable=True))

    # 2. Create retrieval_logs table
    op.create_table(
        'retrieval_logs',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('project_id', sa.Integer(), nullable=False),
        sa.Column('query', sa.Text(), nullable=False),
        sa.Column('search_type', sa.String(length=50), nullable=False),
        sa.Column('top_k', sa.Integer(), nullable=False),
        sa.Column('results_count', sa.Integer(), nullable=False),
        sa.Column('results_json', sa.Text(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(['project_id'], ['projects.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_retrieval_logs_id'), 'retrieval_logs', ['id'], unique=False)
    op.create_index(op.f('ix_retrieval_logs_project_id'), 'retrieval_logs', ['project_id'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_retrieval_logs_project_id'), table_name='retrieval_logs')
    op.drop_index(op.f('ix_retrieval_logs_id'), table_name='retrieval_logs')
    op.drop_table('retrieval_logs')
    op.drop_column('chunks', 'search_text')
