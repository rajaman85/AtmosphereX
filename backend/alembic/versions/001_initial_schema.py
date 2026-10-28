"""Initial database schema

Revision ID: 001_initial_schema
Revises: 
Create Date: 2026-10-28 00:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = '001_initial_schema'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    op.create_table(
        'saved_cities',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(length=100), nullable=False),
        sa.Column('country', sa.String(length=100), nullable=True),
        sa.Column('country_code', sa.String(length=10), nullable=True),
        sa.Column('latitude', sa.Float(), nullable=False),
        sa.Column('longitude', sa.Float(), nullable=False),
        sa.Column('timezone', sa.String(length=100), nullable=True),
        sa.Column('session_id', sa.String(length=100), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_saved_cities_id'), 'saved_cities', ['id'], unique=False)
    op.create_index(op.f('ix_saved_cities_session_id'), 'saved_cities', ['session_id'], unique=False)

    op.create_table(
        'alert_rules',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('city_name', sa.String(length=100), nullable=False),
        sa.Column('latitude', sa.Float(), nullable=False),
        sa.Column('longitude', sa.Float(), nullable=False),
        sa.Column('metric', sa.String(length=50), nullable=False),
        sa.Column('operator', sa.String(length=10), nullable=False),
        sa.Column('threshold', sa.Float(), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=True, default=True),
        sa.Column('description', sa.String(length=255), nullable=True),
        sa.Column('session_id', sa.String(length=100), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('last_triggered', sa.DateTime(timezone=True), nullable=True),
        sa.Column('trigger_count', sa.Integer(), nullable=True, default=0),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_alert_rules_id'), 'alert_rules', ['id'], unique=False)
    op.create_index(op.f('ix_alert_rules_session_id'), 'alert_rules', ['session_id'], unique=False)

    op.create_table(
        'alert_history',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('alert_rule_id', sa.Integer(), nullable=False),
        sa.Column('city_name', sa.String(length=100), nullable=False),
        sa.Column('metric', sa.String(length=50), nullable=False),
        sa.Column('threshold', sa.Float(), nullable=False),
        sa.Column('actual_value', sa.Float(), nullable=False),
        sa.Column('operator', sa.String(length=10), nullable=False),
        sa.Column('message', sa.Text(), nullable=False),
        sa.Column('triggered_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('is_read', sa.Boolean(), nullable=True, default=False),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_alert_history_id'), 'alert_history', ['id'], unique=False)
    op.create_index(op.f('ix_alert_history_alert_rule_id'), 'alert_history', ['alert_rule_id'], unique=False)

    op.create_table(
        'query_log',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('city_name', sa.String(length=100), nullable=False),
        sa.Column('query_type', sa.String(length=50), nullable=False),
        sa.Column('response_time_ms', sa.Float(), nullable=True),
        sa.Column('cache_hit', sa.Boolean(), nullable=True, default=False),
        sa.Column('error', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_query_log_id'), 'query_log', ['id'], unique=False)

def downgrade() -> None:
    op.drop_table('query_log')
    op.drop_table('alert_history')
    op.drop_table('alert_rules')
    op.drop_table('saved_cities')
