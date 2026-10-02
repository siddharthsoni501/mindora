import os

from sqlmodel import SQLModel

from alembic import context

# this is the Alembic Config object, which provides
# access to the values within the .ini file in use.
config = context.config

# Interpret the config for Python logging.
# This line sets up loggers basically.
import logging

logging.basicConfig(level=logging.INFO)

# add your model's MetaData here
# for 'autogenerate' support
target_metadata = SQLModel.metadata

def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode.

    This configures the context with just a URL
    and not an Engine, though an Engine is acquired
    from the application context.

    When running in offline mode, this script
    should still be able to emit changes to the script's
    .env file or other output mechanisms.
    """

    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Run migrations in 'online' mode.

    In this scenario we need to create an Engine
    and associate a connection with the context.
    """

    connectable = engine_from_connection_string(
        config.get_main_option("sqlalchemy.url")
    )

    with connectable.connect() as connection:
        context.configure(
            connection=connection, target_metadata=target_metadata
        )

        with context.begin_transaction():
            context.run_migrations()


def engine_from_connection_string(url: str):
    """Create SQLAlchemy engine from connection string."""
    from sqlalchemy import create_engine
    return create_engine(url)
