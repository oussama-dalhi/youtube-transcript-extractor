# AI assistance: Claude helped me understand and configure Psycopg's
# connection pool for managing database connections.

import os

from dotenv import load_dotenv
from psycopg.rows import dict_row
from psycopg_pool import ConnectionPool

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    raise RuntimeError("DATABASE_URL is missing")

pool = ConnectionPool(
    conninfo=DATABASE_URL,
    min_size=1,
    max_size=5,
    timeout=10,
    check=ConnectionPool.check_connection,
    kwargs={
        "row_factory": dict_row,
        "connect_timeout": 15
    },
    open=False,
)
