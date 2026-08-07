"""add phase 1 tables and columns

Revision ID: 0002
Revises: 0001
Create Date: 2026-07-19 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '0002'
down_revision: Union[str, None] = '0001'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Modify repositories table: add source_type, root_path
    op.add_column('repositories', sa.Column('source_type', sa.String(length=50), nullable=False, server_default='local'))
    op.add_column('repositories', sa.Column('root_path', sa.String(length=512), nullable=True))

    # 2. Modify uploaded_logs table: rename content to raw_content, add source_type
    op.alter_column('uploaded_logs', 'content', new_column_name='raw_content', existing_type=sa.Text())
    op.add_column('uploaded_logs', sa.Column('source_type', sa.String(length=50), nullable=False, server_default='pytest'))

    # 3. Create code_files table
    op.create_table(
        'code_files',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('repository_id', sa.Integer(), nullable=False),
        sa.Column('file_path', sa.String(length=512), nullable=False),
        sa.Column('language', sa.String(length=50), nullable=False),
        sa.Column('content', sa.Text(), nullable=False),
        sa.Column('size_bytes', sa.Integer(), nullable=False),
        sa.Column('line_count', sa.Integer(), nullable=False),
        sa.Column('content_hash', sa.String(length=64), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(['repository_id'], ['repositories.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_code_files_id'), 'code_files', ['id'], unique=False)

    # 4. Create parsed_log_events table
    op.create_table(
        'parsed_log_events',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('uploaded_log_id', sa.Integer(), nullable=False),
        sa.Column('event_type', sa.String(length=50), nullable=False),
        sa.Column('test_name', sa.String(length=255), nullable=True),
        sa.Column('error_type', sa.String(length=255), nullable=True),
        sa.Column('error_message', sa.Text(), nullable=True),
        sa.Column('raw_block', sa.Text(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(['uploaded_log_id'], ['uploaded_logs.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_parsed_log_events_id'), 'parsed_log_events', ['id'], unique=False)

    # 5. Create file_references table
    op.create_table(
        'file_references',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('parsed_log_event_id', sa.Integer(), nullable=False),
        sa.Column('file_path', sa.String(length=512), nullable=False),
        sa.Column('line_number', sa.Integer(), nullable=False),
        sa.Column('function_name', sa.String(length=255), nullable=True),
        sa.ForeignKeyConstraint(['parsed_log_event_id'], ['parsed_log_events.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_file_references_id'), 'file_references', ['id'], unique=False)


def downgrade() -> None:
    # 1. Drop indexes and tables
    op.drop_index(op.f('ix_file_references_id'), table_name='file_references')
    op.drop_table('file_references')
    op.drop_index(op.f('ix_parsed_log_events_id'), table_name='parsed_log_events')
    op.drop_table('parsed_log_events')
    op.drop_index(op.f('ix_code_files_id'), table_name='code_files')
    op.drop_table('code_files')

    # 2. Modify uploaded_logs table: rename raw_content back to content, drop source_type
    op.alter_column('uploaded_logs', 'raw_content', new_column_name='content', existing_type=sa.Text())
    op.drop_column('uploaded_logs', 'source_type')

    # 3. Modify repositories table: drop source_type, root_path
    op.drop_column('repositories', 'root_path')
    op.drop_column('repositories', 'source_type')
