"""add notification delivery history

Revision ID: 8650e933730b
Revises: 3168577e1832
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "8650e933730b"
down_revision: Union[str, None] = "3168577e1832"
branch_labels: Union[
    str, Sequence[str], None
] = None
depends_on: Union[
    str, Sequence[str], None
] = None


def upgrade() -> None:
    op.create_table(
        "notification_delivery_history",
        sa.Column(
            "id",
            sa.Integer(),
            primary_key=True,
        ),
        sa.Column(
            "user_id",
            sa.Integer(),
            nullable=False,
        ),
        sa.Column(
            "channel",
            sa.String(length=20),
            nullable=False,
            server_default="EMAIL",
        ),
        sa.Column(
            "recipient",
            sa.String(length=255),
            nullable=False,
        ),
        sa.Column(
            "subject",
            sa.String(length=255),
            nullable=False,
        ),
        sa.Column(
            "reference_type",
            sa.String(length=30),
            nullable=False,
        ),
        sa.Column(
            "reference_id",
            sa.Integer(),
            nullable=False,
        ),
        sa.Column(
            "delivery_status",
            sa.String(length=20),
            nullable=False,
        ),
        sa.Column(
            "error_message",
            sa.String(length=500),
            nullable=True,
        ),
        sa.Column(
            "attempted_at",
            sa.DateTime(),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["user_id"],
            ["users.id"],
        ),
    )

    op.create_index(
        "ix_notification_delivery_history_user_id",
        "notification_delivery_history",
        ["user_id"],
    )

    op.create_index(
        "ix_notification_delivery_history_reference_id",
        "notification_delivery_history",
        ["reference_id"],
    )


def downgrade() -> None:
    op.drop_index(
        "ix_notification_delivery_history_reference_id",
        table_name="notification_delivery_history",
    )

    op.drop_index(
        "ix_notification_delivery_history_user_id",
        table_name="notification_delivery_history",
    )

    op.drop_table(
        "notification_delivery_history"
    )