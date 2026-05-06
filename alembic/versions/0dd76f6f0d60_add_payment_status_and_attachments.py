"""add payment status and attachments

Revision ID: 0dd76f6f0d60
Revises: 14e21d25d584
Create Date: 2026-05-06 12:40:02.161033

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = "0dd76f6f0d60"
down_revision: Union[str, Sequence[str], None] = "14e21d25d584"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


OBJECT_VALUES = (
    "AURIKA",
    "AURUM",
    "MAXIMUS",
    "ADC",
    "LERMONTOV",
    "KPZ",
    "POOL",
    "TOURIST",
    "HELICOPTER",
    "SHOR",
    "KULTUR",
    "UFADOBRAYA",
    "SVOBODA",
    "CENTER",
    "MIHAILOVKA",
    "PPT",
    "MOLOCHNOE",
    "EVPATORIA",
    "ATAEVKA",
    "BAZILEEVKA",
)


def upgrade() -> None:
    bind = op.get_bind()

    objects_enum = postgresql.ENUM(
        *OBJECT_VALUES,
        name="objectsenum",
        create_type=False,
    )
    objects_enum.create(bind, checkfirst=True)

    attachment_type_enum = postgresql.ENUM(
        "REQUEST_FILE",
        "INVOICE",
        name="attachmenttypeenum",
        create_type=False,
    )
    attachment_type_enum.create(bind, checkfirst=True)

    payment_status_enum = postgresql.ENUM(
        "PAID",
        "UNPAID",
        name="paymentstatusenum",
        create_type=False,
    )
    payment_status_enum.create(bind, checkfirst=True)

    request_type_enum = postgresql.ENUM(
        "DAVALCHESKIE",
        "SOBSTVENNYE",
        "HOZYAISTVENNYE",
        name="requesttypeenum",
        create_type=False,
    )
    request_type_enum.create(bind, checkfirst=True)

    op.create_table(
        "objects",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("name", objects_enum, nullable=False),
        sa.Column("customer_id", sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(["customer_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_index(op.f("ix_objects_customer_id"), "objects", ["customer_id"], unique=False)
    op.create_index(op.f("ix_objects_id"), "objects", ["id"], unique=False)

    op.add_column(
        "attachment",
        sa.Column(
            "attachment_type",
            attachment_type_enum,
            nullable=False,
            server_default="REQUEST_FILE",
        ),
    )
    op.create_index(
        op.f("ix_attachment_attachment_type"),
        "attachment",
        ["attachment_type"],
        unique=False,
    )

    op.add_column(
        "requests",
        sa.Column(
            "payment_status",
            payment_status_enum,
            nullable=False,
            server_default="UNPAID",
        ),
    )
    op.add_column(
        "requests",
        sa.Column(
            "request_type",
            request_type_enum,
            nullable=False,
            server_default="SOBSTVENNYE",
        ),
    )

    op.alter_column("attachment", "attachment_type", server_default=None)
    op.alter_column("requests", "payment_status", server_default=None)
    op.alter_column("requests", "request_type", server_default=None)

    op.drop_column("users", "object")


def downgrade() -> None:
    bind = op.get_bind()

    objects_enum = postgresql.ENUM(
        *OBJECT_VALUES,
        name="objectsenum",
        create_type=False,
    )

    op.add_column(
        "users",
        sa.Column(
            "object",
            objects_enum,
            nullable=True,
        ),
    )

    op.drop_column("requests", "request_type")
    op.drop_column("requests", "payment_status")

    op.drop_index(op.f("ix_attachment_attachment_type"), table_name="attachment")
    op.drop_column("attachment", "attachment_type")

    op.drop_index(op.f("ix_objects_id"), table_name="objects")
    op.drop_index(op.f("ix_objects_customer_id"), table_name="objects")
    op.drop_table("objects")

    postgresql.ENUM(name="requesttypeenum").drop(bind, checkfirst=True)
    postgresql.ENUM(name="paymentstatusenum").drop(bind, checkfirst=True)
    postgresql.ENUM(name="attachmenttypeenum").drop(bind, checkfirst=True)