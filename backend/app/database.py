import os
import duckdb

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DB_PATH = os.path.join(BASE_DIR, "data", "warehouse.duckdb")

def get_db():
    if not os.path.exists(DB_PATH):
        raise RuntimeError(f"Warehouse database not found at {DB_PATH}. Run prepare_data.py first.")
    # Connect read-only
    return duckdb.connect(DB_PATH, read_only=True)

def get_db_writable():
    # Helper to connect in read-write mode for startup precomputations
    if not os.path.exists(DB_PATH):
        raise RuntimeError(f"Warehouse database not found at {DB_PATH}. Run prepare_data.py first.")
    return duckdb.connect(DB_PATH, read_only=False)
