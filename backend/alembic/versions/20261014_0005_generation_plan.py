"""Store generated scenarios pending author verification.

Revision ID: 20261014_0005
Revises: 20261008_0004
"""

import sqlalchemy as sa

from alembic import op

revision = "20261014_0005"
down_revision = "20261008_0004"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("quests", sa.Column("generation_plan", sa.JSON(), nullable=True))


def downgrade() -> None:
    op.drop_column("quests", "generation_plan")
