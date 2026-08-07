"""create debug reports and llm calls tables

Revision ID: 0006
Revises: 0005
Create Date: 2026-08-03 19:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '0006'
down_revision: Union[str, None] = '0005'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Create debug_reports table
    op.create_table(
        'debug_reports',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('project_id', sa.Integer(), nullable=False),
        sa.Column('uploaded_log_id', sa.Integer(), nullable=True),
        sa.Column('query', sa.Text(), nullable=False),
        sa.Column('failure_type', sa.String(length=50), nullable=False),
        sa.Column('summary', sa.Text(), nullable=False),
        sa.Column('likely_root_cause', sa.Text(), nullable=True),
        sa.Column('suggested_fix', sa.Text(), nullable=True),
        sa.Column('confidence', sa.Float(), nullable=False),
        sa.Column('status', sa.String(length=50), nullable=False, server_default='success'),
        sa.Column('model_name', sa.String(length=100), nullable=False),
        sa.Column('missing_information', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(['project_id'], ['projects.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['uploaded_log_id'], ['uploaded_logs.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_debug_reports_id'), 'debug_reports', ['id'], unique=False)
    op.create_index(op.f('ix_debug_reports_project_id'), 'debug_reports', ['project_id'], unique=False)

    # 2. Create debug_report_evidence table
    op.create_table(
        'debug_report_evidence',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('debug_report_id', sa.Integer(), nullable=False),
        sa.Column('chunk_id', sa.Integer(), nullable=False),
        sa.Column('file_path', sa.String(length=512), nullable=True),
        sa.Column('start_line', sa.Integer(), nullable=True),
        sa.Column('end_line', sa.Integer(), nullable=True),
        sa.Column('reason', sa.Text(), nullable=False),
        sa.ForeignKeyConstraint(['debug_report_id'], ['debug_reports.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['chunk_id'], ['chunks.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_debug_report_evidence_chunk_id'), 'debug_report_evidence', ['chunk_id'], unique=False)
    op.create_index(op.f('ix_debug_report_evidence_debug_report_id'), 'debug_report_evidence', ['debug_report_id'], unique=False)
    op.create_index(op.f('ix_debug_report_evidence_id'), 'debug_report_evidence', ['id'], unique=False)

    # 3. Create llm_calls table
    op.create_table(
        'llm_calls',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('project_id', sa.Integer(), nullable=False),
        sa.Column('purpose', sa.String(length=100), nullable=False),
        sa.Column('model_name', sa.String(length=100), nullable=False),
        sa.Column('input_tokens', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('output_tokens', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('latency_ms', sa.Float(), nullable=False, server_default='0.0'),
        sa.Column('estimated_cost', sa.Float(), nullable=False, server_default='0.0'),
        sa.Column('status', sa.String(length=50), nullable=False, server_default='success'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(['project_id'], ['projects.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_llm_calls_id'), 'llm_calls', ['id'], unique=False)
    op.create_index(op.f('ix_llm_calls_project_id'), 'llm_calls', ['project_id'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_llm_calls_project_id'), table_name='llm_calls')
    op.drop_index(op.f('ix_llm_calls_id'), table_name='llm_calls')
    op.drop_table('llm_calls')

    op.drop_index(op.f('ix_debug_report_evidence_id'), table_name='debug_report_evidence')
    op.drop_index(op.f('ix_debug_report_evidence_debug_report_id'), table_name='debug_report_evidence')
    op.drop_index(op.f('ix_debug_report_evidence_chunk_id'), table_name='debug_report_evidence')
    op.drop_table('debug_report_evidence')

    op.drop_index(op.f('ix_debug_reports_project_id'), table_name='debug_reports')
    op.drop_index(op.f('ix_debug_reports_id'), table_name='debug_reports')
    op.drop_table('debug_reports')
