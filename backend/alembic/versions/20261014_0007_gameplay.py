"""Add guides, varied tasks and persisted hints."""

import sqlalchemy as sa

from alembic import op

revision = "20261014_0007"
down_revision = "20261014_0006"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("quests", sa.Column("guide", sa.JSON(), nullable=True))
    op.add_column(
        "checkpoints", sa.Column("correct_order", sa.JSON(), nullable=False, server_default="[]")
    )
    op.add_column("checkpoints", sa.Column("task_image_url", sa.String(1000), nullable=True))
    op.add_column(
        "checkpoints",
        sa.Column("task_image_caption", sa.String(500), nullable=False, server_default=""),
    )
    op.add_column("checkpoints", sa.Column("hints", sa.JSON(), nullable=False, server_default="[]"))
    op.add_column(
        "game_sessions", sa.Column("opened_hints", sa.JSON(), nullable=False, server_default="{}")
    )


def downgrade() -> None:
    op.drop_column("game_sessions", "opened_hints")
    for column in ("hints", "task_image_caption", "task_image_url", "correct_order"):
        op.drop_column("checkpoints", column)
    op.drop_column("quests", "guide")
