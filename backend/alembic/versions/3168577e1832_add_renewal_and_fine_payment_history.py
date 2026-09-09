"""add renewal and fine payment history

Revision ID: 3168577e1832
Revises: 103e289ddd4f
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "3168577e1832"
down_revision: Union[str, None] = "103e289ddd4f"
branch_labels: Union[
    str, Sequence[str], None
] = None
depends_on: Union[
    str, Sequence[str], None
] = None


def upgrade() -> None:
    op.create_table(
        "renewal_history",
        sa.Column(
            "id",
            sa.Integer(),
            primary_key=True,
        ),
        sa.Column(
            "issue_id",
            sa.Integer(),
            nullable=False,
        ),
        sa.Column(
            "user_id",
            sa.Integer(),
            nullable=False,
        ),
        sa.Column(
            "book_id",
            sa.Integer(),
            nullable=False,
        ),
        sa.Column(
            "previous_due_date",
            sa.DateTime(),
            nullable=False,
        ),
        sa.Column(
            "new_due_date",
            sa.DateTime(),
            nullable=False,
        ),
        sa.Column(
            "renewal_number",
            sa.Integer(),
            nullable=False,
        ),
        sa.Column(
            "renewed_by",
            sa.Integer(),
            nullable=False,
        ),
        sa.Column(
            "renewed_at",
            sa.DateTime(),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["issue_id"],
            ["issues.id"],
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["user_id"],
            ["users.id"],
        ),
        sa.ForeignKeyConstraint(
            ["book_id"],
            ["books.id"],
        ),
        sa.ForeignKeyConstraint(
            ["renewed_by"],
            ["users.id"],
        ),
    )

    op.create_index(
        "ix_renewal_history_issue_id",
        "renewal_history",
        ["issue_id"],
    )
    op.create_index(
        "ix_renewal_history_user_id",
        "renewal_history",
        ["user_id"],
    )
    op.create_index(
        "ix_renewal_history_book_id",
        "renewal_history",
        ["book_id"],
    )

    op.create_table(
        "fine_payments",
        sa.Column(
            "id",
            sa.Integer(),
            primary_key=True,
        ),
        sa.Column(
            "issue_id",
            sa.Integer(),
            nullable=False,
        ),
        sa.Column(
            "user_id",
            sa.Integer(),
            nullable=False,
        ),
        sa.Column(
            "book_id",
            sa.Integer(),
            nullable=False,
        ),
        sa.Column(
            "amount",
            sa.Numeric(10, 2),
            nullable=False,
        ),
        sa.Column(
            "payment_method",
            sa.String(length=30),
            nullable=False,
            server_default="MANUAL",
        ),
        sa.Column(
            "received_by",
            sa.Integer(),
            nullable=False,
        ),
        sa.Column(
            "paid_at",
            sa.DateTime(),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["issue_id"],
            ["issues.id"],
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["user_id"],
            ["users.id"],
        ),
        sa.ForeignKeyConstraint(
            ["book_id"],
            ["books.id"],
        ),
        sa.ForeignKeyConstraint(
            ["received_by"],
            ["users.id"],
        ),
    )

    op.create_index(
        "ix_fine_payments_issue_id",
        "fine_payments",
        ["issue_id"],
    )
    op.create_index(
        "ix_fine_payments_user_id",
        "fine_payments",
        ["user_id"],
    )
    op.create_index(
        "ix_fine_payments_book_id",
        "fine_payments",
        ["book_id"],
    )


def downgrade() -> None:
    op.drop_index(
        "ix_fine_payments_book_id",
        table_name="fine_payments",
    )
    op.drop_index(
        "ix_fine_payments_user_id",
        table_name="fine_payments",
    )
    op.drop_index(
        "ix_fine_payments_issue_id",
        table_name="fine_payments",
    )
    op.drop_table("fine_payments")

    op.drop_index(
        "ix_renewal_history_book_id",
        table_name="renewal_history",
    )
    op.drop_index(
        "ix_renewal_history_user_id",
        table_name="renewal_history",
    )
    op.drop_index(
        "ix_renewal_history_issue_id",
        table_name="renewal_history",
    )
    op.drop_table("renewal_history")