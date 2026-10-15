"""Add post-answer reveal content to checkpoints.

Revision ID: 20260924_0003
Revises: 20260924_0002
Create Date: 2026-09-24
"""

import sqlalchemy as sa

from alembic import op

revision = "20260924_0003"
down_revision = "20260924_0002"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "checkpoints",
        sa.Column("reveal_title", sa.String(length=160), nullable=False, server_default=""),
    )
    op.add_column(
        "checkpoints", sa.Column("reveal_text", sa.Text(), nullable=False, server_default="")
    )
    op.add_column(
        "checkpoints", sa.Column("reveal_image_url", sa.String(length=1000), nullable=True)
    )
    op.add_column(
        "checkpoints", sa.Column("reveal_audio_url", sa.String(length=1000), nullable=True)
    )
    op.add_column(
        "checkpoints",
        sa.Column("reveal_media_caption", sa.String(length=500), nullable=False, server_default=""),
    )
    op.add_column(
        "checkpoints", sa.Column("reveal_source_url", sa.String(length=1000), nullable=True)
    )


def downgrade() -> None:
    op.drop_column("checkpoints", "reveal_source_url")
    op.drop_column("checkpoints", "reveal_media_caption")
    op.drop_column("checkpoints", "reveal_audio_url")
    op.drop_column("checkpoints", "reveal_image_url")
    op.drop_column("checkpoints", "reveal_text")
    op.drop_column("checkpoints", "reveal_title")
