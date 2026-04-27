from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "113f34123f0c"
down_revision: Union[str, Sequence[str], None] = "61ef91cd8c99"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column("object", sa.Enum(name="objectsenum"), nullable=True)
    )


def downgrade() -> None:
    op.drop_column("users", "object")