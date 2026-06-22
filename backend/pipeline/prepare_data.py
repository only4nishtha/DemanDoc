import duckdb
import os

def prepare_data():
    print("Starting data preparation...")
    
    # Ensure directory exists
    os.makedirs("backend/data", exist_ok=True)
    db_path = "backend/data/warehouse.duckdb"
    if os.path.exists(db_path):
        os.remove(db_path)
    
    con = duckdb.connect(db_path)
    
    # 1. Load Calendar Data, adding 'd' column
    print("Loading calendar...")
    con.execute("""
        CREATE TABLE calendar AS 
        SELECT 
            *,
            'd_' || row_number() over (order by date) as d
        FROM read_csv_auto('backend/data/raw/calendar.csv', types={'date': 'DATE'})
    """)
    
    # 2. Load Sell Prices
    print("Loading sell prices...")
    con.execute("""
        CREATE TABLE sell_prices AS 
        SELECT * FROM read_csv_auto('backend/data/raw/sell_prices.csv')
    """)
    
    # 3. Load and Melt Sales Train Evaluation
    print("Melting sales data... (this might take a minute)")
    con.execute("""
        CREATE TABLE sales_long AS 
        WITH raw_sales AS (
            SELECT * FROM read_csv_auto('backend/data/raw/sales_train_evaluation.csv')
        )
        UNPIVOT raw_sales 
        ON columns('^d_[0-9]+$')
        INTO
            NAME d
            VALUE units_sold
    """)
    
    # 4. Create Fact Table
    print("Creating fact table...")
    con.execute("""
        CREATE TABLE fact_sales AS 
        SELECT 
            s.item_id,
            s.dept_id,
            s.cat_id,
            s.store_id,
            s.state_id,
            s.d,
            CAST(s.units_sold AS INTEGER) as units_sold,
            c.date,
            c.wm_yr_wk,
            c.weekday,
            c.wday,
            c.month,
            c.year,
            c.event_name_1,
            c.event_type_1,
            c.event_name_2,
            c.event_type_2,
            c.snap_CA,
            c.snap_TX,
            c.snap_WI,
            p.sell_price,
            (s.units_sold * p.sell_price) as revenue
        FROM sales_long s
        JOIN calendar c ON s.d = c.d
        LEFT JOIN sell_prices p 
            ON s.store_id = p.store_id 
            AND s.item_id = p.item_id 
            AND c.wm_yr_wk = p.wm_yr_wk
    """)
    
    # Drop intermediate sales_long to save space
    con.execute("DROP TABLE sales_long")
    
    # 5. Compute Aggregates (Daily, Weekly, Monthly, Annual)
    print("Computing daily aggregates...")
    con.execute("""
        CREATE TABLE agg_daily AS
        SELECT 
            cat_id,
            state_id,
            date,
            SUM(units_sold) as total_units,
            SUM(revenue) as total_revenue
        FROM fact_sales
        GROUP BY 1, 2, 3
    """)
    
    print("Computing weekly aggregates...")
    con.execute("""
        CREATE TABLE agg_weekly AS
        SELECT 
            cat_id,
            state_id,
            date_trunc('week', date) as week_start,
            SUM(units_sold) as total_units,
            SUM(revenue) as total_revenue
        FROM fact_sales
        GROUP BY 1, 2, 3
    """)
    
    print("Computing monthly aggregates...")
    con.execute("""
        CREATE TABLE agg_monthly AS
        SELECT 
            cat_id,
            state_id,
            date_trunc('month', date) as month_start,
            SUM(units_sold) as total_units,
            SUM(revenue) as total_revenue
        FROM fact_sales
        GROUP BY 1, 2, 3
    """)
    
    print("Computing annual aggregates...")
    con.execute("""
        CREATE TABLE agg_annual AS
        SELECT 
            cat_id,
            state_id,
            date_trunc('year', date) as year_start,
            SUM(units_sold) as total_units,
            SUM(revenue) as total_revenue
        FROM fact_sales
        GROUP BY 1, 2, 3
    """)

    # 6. Compute Promotion-detection flag
    print("Computing promotions...")
    con.execute("""
        CREATE TABLE item_weekly_stats AS
        SELECT
            item_id,
            store_id,
            cat_id,
            state_id,
            wm_yr_wk,
            SUM(units_sold) as weekly_units,
            AVG(sell_price) as avg_price,
            MIN(date) as week_start_date
        FROM fact_sales
        GROUP BY 1, 2, 3, 4, 5
    """)
    
    con.execute("""
        CREATE TABLE promotions AS
        WITH weekly_lag AS (
            SELECT 
                *,
                LAG(avg_price) OVER (PARTITION BY item_id, store_id ORDER BY wm_yr_wk) as prev_price,
                LAG(weekly_units) OVER (PARTITION BY item_id, store_id ORDER BY wm_yr_wk) as prev_units
            FROM item_weekly_stats
        )
        SELECT 
            item_id,
            store_id,
            cat_id,
            state_id,
            wm_yr_wk,
            week_start_date,
            avg_price,
            prev_price,
            weekly_units,
            prev_units,
            CASE 
                WHEN prev_price IS NOT NULL 
                     AND avg_price < (prev_price * 0.95) 
                     AND weekly_units > prev_units THEN 1 
                ELSE 0 
            END as is_promotion
        FROM weekly_lag
    """)
    
    # Optional cleanup of intermediate
    con.execute("DROP TABLE item_weekly_stats")
    
    print("Sanity checks...")
    tables = [
        "fact_sales",
        "agg_daily",
        "agg_weekly",
        "agg_monthly",
        "agg_annual",
        "promotions"
    ]
    for tbl in tables:
        count = con.execute(f"SELECT count(*) FROM {tbl}").fetchone()[0]
        print(f"Table '{tbl}' row count: {count:,}")
        
    print("Data preparation complete.")
    con.close()

if __name__ == "__main__":
    prepare_data()
