"""Add curated rest stops and partner places to quests."""

import sqlalchemy as sa
from alembic import op

revision = "20261014_0006"
down_revision = "20261014_0005"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "quests", sa.Column("partner_places", sa.JSON(), nullable=False, server_default="[]")
    )


def downgrade() -> None:
    op.drop_column("quests", "partner_places")
