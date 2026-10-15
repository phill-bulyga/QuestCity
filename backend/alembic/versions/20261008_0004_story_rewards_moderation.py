"""Add route narrative, moderation, and quest rewards.

Revision ID: 20261008_0004
Revises: 20260924_0003
"""

import sqlalchemy as sa

from alembic import op

revision = "20261008_0004"
down_revision = "20260924_0003"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "quests", sa.Column("rejection_reason", sa.Text(), nullable=False, server_default="")
    )
    op.add_column(
        "checkpoints", sa.Column("route_clue", sa.Text(), nullable=False, server_default="")
    )
    op.add_column(
        "checkpoints", sa.Column("travel_facts", sa.JSON(), nullable=False, server_default="[]")
    )
    op.add_column(
        "game_sessions",
        sa.Column("travel_fact_index", sa.Integer(), nullable=False, server_default="0"),
    )
    op.create_table(
        "quest_rewards",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column(
            "quest_id",
            sa.Uuid(),
            sa.ForeignKey("quests.id", ondelete="CASCADE"),
            unique=True,
            nullable=False,
        ),
        sa.Column("partner_name", sa.String(160), nullable=False),
        sa.Column("venue_address", sa.String(300), nullable=False, server_default=""),
        sa.Column("offer", sa.String(300), nullable=False),
        sa.Column("promo_code", sa.String(100), nullable=False),
        sa.Column("redemption_instructions", sa.Text(), nullable=False, server_default=""),
        sa.Column("min_score", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("is_demo", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
    )


def downgrade() -> None:
    op.drop_table("quest_rewards")
    op.drop_column("game_sessions", "travel_fact_index")
    op.drop_column("checkpoints", "travel_facts")
    op.drop_column("checkpoints", "route_clue")
    op.drop_column("quests", "rejection_reason")
