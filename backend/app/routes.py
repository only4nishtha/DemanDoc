from fastapi import APIRouter, Query, HTTPException, UploadFile, File
from typing import Optional
import datetime
import os
import pandas as pd
from .database import get_db, BASE_DIR
from .schemas import (
    HealthResponse, KPIResponse, TrendResponse, TrendPoint,
    TreemapResponse, TreemapCategory, TopProductsResponse, TopProduct,
    ForecastResponse, ForecastPoint, PromotionsResponse, PromotionImpact,
    RootCauseResponse, ScenarioResponse, ScenarioPoint, GeoResponse, GeoPoint
)

router = APIRouter()

@router.get("/health", response_model=HealthResponse)
def get_health():
    return {"status": "healthy"}

@router.get("/kpis", response_model=KPIResponse)
def get_kpis(
    date_from: str = Query("2015-01-01"),
    date_to: str = Query("2016-01-01"),
    category: str = Query("ALL"),
    state: str = Query("ALL")
):
    con = get_db()
    cat = category.upper()
    st = state.upper()
    
    try:
        d_from = datetime.datetime.strptime(date_from, "%Y-%m-%d").date()
        d_to = datetime.datetime.strptime(date_to, "%Y-%m-%d").date()
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD")
        
    delta = d_to - d_from
    prior_d_to = d_from - datetime.timedelta(days=1)
    prior_d_from = prior_d_to - delta

    # Current period metrics
    curr_query = """
        SELECT 
            COALESCE(SUM(total_revenue), 0.0) as revenue, 
            COALESCE(SUM(total_units), 0) as units_sold
        FROM agg_daily
        WHERE (? = 'ALL' OR cat_id = ?)
          AND (? = 'ALL' OR state_id = ?)
          AND date BETWEEN CAST(? AS DATE) AND CAST(? AS DATE)
    """
    curr_res = con.execute(curr_query, [cat, cat, st, st, date_from, date_to]).fetchone()
    curr_rev, curr_units = float(curr_res[0]), int(curr_res[1])

    # Prior period metrics
    prior_res = con.execute(curr_query, [cat, cat, st, st, prior_d_from.strftime("%Y-%m-%d"), prior_d_to.strftime("%Y-%m-%d")]).fetchone()
    prior_rev, prior_units = float(prior_res[0]), int(prior_res[1])

    # Growth calculations
    rev_change = ((curr_rev - prior_rev) / prior_rev * 100) if prior_rev > 0 else 0.0
    units_change = ((curr_units - prior_units) / prior_units * 100) if prior_units > 0 else 0.0

    con.close()

    return {
        "total_revenue": curr_rev,
        "total_units_sold": curr_units,
        "revenue_change_pct": rev_change,
        "units_change_pct": units_change
    }

@router.get("/sales/trend", response_model=TrendResponse)
def get_trend(
    date_from: str = Query("2015-01-01"),
    date_to: str = Query("2016-01-01"),
    category: str = Query("ALL"),
    state: str = Query("ALL"),
    granularity: str = Query("monthly")
):
    con = get_db()
    cat = category.upper()
    st = state.upper()

    if granularity == "daily":
        table = "agg_daily"
        date_col = "date"
        forecast_trunc = "date"
    elif granularity == "weekly":
        table = "agg_weekly"
        date_col = "CAST(week_start AS DATE)"
        forecast_trunc = "date_trunc('week', date)"
    elif granularity == "annual":
        table = "agg_annual"
        date_col = "CAST(year_start AS DATE)"
        forecast_trunc = "date_trunc('year', date)"
    else:
        table = "agg_monthly"
        date_col = "CAST(month_start AS DATE)"
        forecast_trunc = "date_trunc('month', date)"

    # Query historical
    hist_query = f"""
        SELECT 
            {date_col} as date,
            COALESCE(SUM(total_revenue), 0.0) as revenue,
            COALESCE(SUM(total_units), 0.0) as units
        FROM {table}
        WHERE (? = 'ALL' OR cat_id = ?)
          AND (? = 'ALL' OR state_id = ?)
          AND {date_col} BETWEEN CAST(? AS DATE) AND CAST(? AS DATE)
        GROUP BY date
        ORDER BY date
    """
    hist_df = con.execute(hist_query, [cat, cat, st, st, date_from, date_to]).df()

    # Query precomputed forecasts
    fc_query = f"""
        SELECT 
            CAST({forecast_trunc} AS DATE) as date,
            SUM(forecast_revenue) as forecast_revenue
        FROM forecasts
        WHERE (? = 'ALL' OR cat_id = ?)
          AND (? = 'ALL' OR state_id = ?)
          AND date BETWEEN CAST(? AS DATE) AND CAST(? AS DATE)
        GROUP BY date
        ORDER BY date
    """
    fc_df = con.execute(fc_query, [cat, cat, st, st, date_from, date_to]).df()

    con.close()

    # Join historical and forecast
    if hist_df.empty and fc_df.empty:
        return {"data": []}

    if hist_df.empty:
        fc_df['date'] = fc_df['date'].astype(str)
        fc_df['revenue'] = 0.0
        fc_df['units'] = 0.0
        fc_df['forecast_units'] = None
        return {"data": fc_df.to_dict(orient="records")}

    hist_df['date'] = hist_df['date'].astype(str)
    if not fc_df.empty:
        fc_df['date'] = fc_df['date'].astype(str)
        merged = hist_df.merge(fc_df, on='date', how='outer').fillna(0.0)
    else:
        merged = hist_df.copy()
        merged['forecast_revenue'] = 0.0

    # Sort
    merged = merged.sort_values('date')
    merged['forecast_units'] = None
    # Replace zeros with None where appropriate
    result = []
    for _, row in merged.iterrows():
        result.append(TrendPoint(
            date=row['date'],
            revenue=float(row['revenue']),
            units=float(row['units']),
            forecast_revenue=float(row['forecast_revenue']) if row['forecast_revenue'] > 0 else None,
            forecast_units=None
        ))

    return {"data": result}

@router.get("/treemap", response_model=TreemapResponse)
def get_treemap(
    date_from: str = Query("2015-01-01"),
    date_to: str = Query("2016-01-01"),
    state: str = Query("ALL")
):
    con = get_db()
    st = state.upper()

    try:
        d_from = datetime.datetime.strptime(date_from, "%Y-%m-%d").date()
        d_to = datetime.datetime.strptime(date_to, "%Y-%m-%d").date()
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD")
        
    delta = d_to - d_from
    prior_d_from = d_from - delta - datetime.timedelta(days=1)
    prior_d_to = d_from - datetime.timedelta(days=1)

    # Current
    curr_query = """
        SELECT 
            cat_id as category,
            COALESCE(SUM(total_revenue), 0.0) as revenue
        FROM agg_daily
        WHERE (? = 'ALL' OR state_id = ?)
          AND date BETWEEN CAST(? AS DATE) AND CAST(? AS DATE)
        GROUP BY cat_id
    """
    curr_df = con.execute(curr_query, [st, st, date_from, date_to]).df()

    # Prior
    prior_df = con.execute(curr_query, [st, st, prior_d_from.strftime("%Y-%m-%d"), prior_d_to.strftime("%Y-%m-%d")]).df()

    con.close()

    if curr_df.empty:
        return {"categories": []}

    categories = []
    for _, row in curr_df.iterrows():
        cat = row['category']
        rev = float(row['revenue'])
        
        # Get prior
        prior_row = prior_df[prior_df['category'] == cat]
        prior_rev = float(prior_row['revenue'].values[0]) if not prior_row.empty else 0.0
        
        growth = ((rev - prior_rev) / prior_rev * 100) if prior_rev > 0 else 0.0
        
        categories.append(TreemapCategory(
            category=cat,
            revenue=rev,
            revenue_growth_pct=growth
        ))

    return {"categories": categories}

@router.get("/top-products", response_model=TopProductsResponse)
def get_top_products(
    date_from: str = Query("2015-01-01"),
    date_to: str = Query("2016-01-01"),
    category: str = Query("ALL"),
    state: str = Query("ALL"),
    metric: str = Query("revenue"), # revenue or units
    limit: int = Query(10)
):
    con = get_db()
    cat = category.upper()
    st = state.upper()
    metric_col = "revenue" if metric.lower() == "revenue" else "units_sold"

    query = f"""
        SELECT 
            item_id,
            COALESCE(SUM(revenue), 0.0) as revenue,
            COALESCE(SUM(units_sold), 0) as units,
            ROW_NUMBER() OVER (ORDER BY SUM({metric_col}) DESC) as rank
        FROM fact_sales
        WHERE (? = 'ALL' OR cat_id = ?)
          AND (? = 'ALL' OR state_id = ?)
          AND date BETWEEN CAST(? AS DATE) AND CAST(? AS DATE)
        GROUP BY item_id
        ORDER BY SUM({metric_col}) DESC
        LIMIT ?
    """
    res_df = con.execute(query, [cat, cat, st, st, date_from, date_to, limit]).df()
    con.close()

    data = []
    for _, row in res_df.iterrows():
        data.append(TopProduct(
            item_id=row['item_id'],
            revenue=float(row['revenue']),
            units=int(row['units']),
            rank=int(row['rank'])
        ))
    return {"data": data}

@router.get("/forecast", response_model=ForecastResponse)
def get_forecast(
    category: str = Query("ALL"),
    state: str = Query("ALL"),
    horizon: int = Query(28)
):
    con = get_db()
    cat = category.upper()
    st = state.upper()

    # Find max date of historical data to separate actuals
    max_hist_res = con.execute("SELECT MAX(date) FROM agg_daily").fetchone()
    max_hist_date = max_hist_res[0] if max_hist_res[0] else datetime.date(2016, 6, 19)

    target_date = max_hist_date + datetime.timedelta(days=horizon)

    query = """
        SELECT 
            f.date,
            SUM(f.forecast_revenue) as forecast_revenue,
            SUM(f.yhat_lower) as lower_bound,
            SUM(f.yhat_upper) as upper_bound,
            SUM(h.total_revenue) as actual_revenue
        FROM forecasts f
        LEFT JOIN agg_daily h 
            ON f.date = h.date 
            AND f.cat_id = h.cat_id 
            AND f.state_id = h.state_id
        WHERE (? = 'ALL' OR f.cat_id = ?)
          AND (? = 'ALL' OR f.state_id = ?)
          AND f.date <= CAST(? AS DATE)
        GROUP BY f.date
        ORDER BY f.date
    """
    
    res_df = con.execute(query, [cat, cat, st, st, target_date.strftime("%Y-%m-%d")]).df()
    con.close()

    data = []
    max_hist_str = max_hist_date.strftime("%Y-%m-%d")
    for _, row in res_df.iterrows():
        dt = row['date'].strftime("%Y-%m-%d")
        act_rev = float(row['actual_revenue']) if dt <= max_hist_str and pd.notna(row['actual_revenue']) else None
        
        data.append(ForecastPoint(
            date=dt,
            actual_revenue=act_rev,
            forecast_revenue=float(row['forecast_revenue']),
            lower_bound=float(row['lower_bound']),
            upper_bound=float(row['upper_bound'])
        ))

    return {"data": data}

@router.get("/promotions", response_model=PromotionsResponse)
def get_promotions_impact(
    category: str = Query("ALL"),
    state: str = Query("ALL")
):
    con = get_db()
    cat = category.upper()
    st = state.upper()

    query = """
        SELECT 
            item_id,
            cat_id as category,
            state_id as state,
            CAST(week_start_date AS VARCHAR) as week_start_date,
            CAST(week_start_date + INTERVAL 6 DAY AS VARCHAR) as week_end_date,
            CAST(weekly_units AS INTEGER) as units_sold,
            CAST(prev_units AS INTEGER) as prev_units_sold,
            (CAST(weekly_units AS FLOAT) / NULLIF(prev_units, 0) - 1) as lift
        FROM promotions
        WHERE is_promotion = 1
          AND (? = 'ALL' OR cat_id = ?)
          AND (? = 'ALL' OR state_id = ?)
        ORDER BY lift DESC
        LIMIT 20
    """
    
    res_df = con.execute(query, [cat, cat, st, st]).df()
    con.close()

    promotions = []
    for _, row in res_df.iterrows():
        promotions.append(PromotionImpact(
            item_id=row['item_id'],
            category=row['category'],
            state=row['state'],
            week_start_date=row['week_start_date'],
            week_end_date=row['week_end_date'],
            units_sold=int(row['units_sold']),
            prev_units_sold=int(row['prev_units_sold'])
        ))

    return {"promotions": promotions}

@router.get("/root-cause", response_model=RootCauseResponse)
def get_root_cause(
    date: str = Query(...),
    category: str = Query("ALL"),
    state: str = Query("ALL")
):
    con = get_db()
    cat = category.upper()
    st = state.upper()

    # 1. Check calendar events within 3 days
    cal_query = """
        SELECT DISTINCT event_name_1, snap_CA, snap_TX, snap_WI
        FROM calendar
        WHERE date BETWEEN CAST(? AS DATE) - 3 AND CAST(? AS DATE) + 3
          AND (event_name_1 IS NOT NULL OR snap_CA = 1 OR snap_TX = 1 OR snap_WI = 1)
    """
    cal_res = con.execute(cal_query, [date, date]).fetchall()
    
    events = [r[0] for r in cal_res if r[0]]
    snap_active = any(r[1] or r[2] or r[3] for r in cal_res)

    # 2. Check promotions in active week
    promo_query = """
        SELECT COUNT(*) 
        FROM promotions
        WHERE wm_yr_wk = (SELECT wm_yr_wk FROM calendar WHERE date = CAST(? AS DATE))
          AND is_promotion = 1
          AND (? = 'ALL' OR cat_id = ?)
          AND (? = 'ALL' OR state_id = ?)
    """
    promo_count = con.execute(promo_query, [date, cat, cat, st, st]).fetchone()[0]
    con.close()

    if events:
        driver = "Calendar Event"
        description = f"Significant holiday event '{', '.join(events)}' occurred within 3 days."
    elif snap_active:
        driver = "SNAP Day"
        description = "SNAP benefits activation day occurred within the 3-day window."
    elif promo_count > 0:
        driver = "Promotion"
        description = f"Detected {promo_count} items with >5% price drop and unit increase in this weekly cycle."
    else:
        driver = "Unexplained Variance"
        description = "No holiday event, SNAP flag, or promotional price drop was detected within the window."

    return {
        "driver": driver,
        "description": description
    }

@router.get("/scenario", response_model=ScenarioResponse)
def get_scenario(
    category: str = Query("ALL"),
    state: str = Query("ALL"),
    price_delta_pct: float = Query(0.0),
    promo_uplift_pct: float = Query(0.0)
):
    con = get_db()
    cat = category.upper()
    st = state.upper()

    query = """
        SELECT 
            CAST(date AS VARCHAR) as date, 
            COALESCE(SUM(total_revenue), 0.0) as baseline_revenue
        FROM agg_daily
        WHERE (? = 'ALL' OR cat_id = ?)
          AND (? = 'ALL' OR state_id = ?)
        GROUP BY date
        ORDER BY date
    """
    res_df = con.execute(query, [cat, cat, st, st]).df()
    con.close()

    # Exact specified formula
    quantity_multiplier = 1 + (-1.0 * price_delta_pct / 100)
    price_multiplier = 1 + (price_delta_pct / 100)
    promo_multiplier = 1 + (promo_uplift_pct / 100)

    scenario = []
    for _, row in res_df.iterrows():
        base_rev = float(row['baseline_revenue'])
        adj_rev = base_rev * quantity_multiplier * price_multiplier * promo_multiplier
        
        scenario.append(ScenarioPoint(
            date=row['date'],
            baseline_revenue=base_rev,
            adjusted_revenue=adj_rev
        ))

    return {"scenario": scenario}

@router.get("/geo", response_model=GeoResponse)
def get_geo(
    date_from: str = Query("2015-01-01"),
    date_to: str = Query("2016-01-01"),
    category: str = Query("ALL")
):
    con = get_db()
    cat = category.upper()

    try:
        d_from = datetime.datetime.strptime(date_from, "%Y-%m-%d").date()
        d_to = datetime.datetime.strptime(date_to, "%Y-%m-%d").date()
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD")
        
    delta = d_to - d_from
    prior_d_from = d_from - delta - datetime.timedelta(days=1)
    prior_d_to = d_from - datetime.timedelta(days=1)

    # Current
    curr_query = """
        SELECT 
            state_id as state,
            COALESCE(SUM(total_revenue), 0.0) as revenue,
            COALESCE(SUM(total_units), 0) as units
        FROM agg_daily
        WHERE (? = 'ALL' OR cat_id = ?)
          AND date BETWEEN CAST(? AS DATE) AND CAST(? AS DATE)
        GROUP BY state_id
    """
    curr_df = con.execute(curr_query, [cat, cat, date_from, date_to]).df()

    # Prior
    prior_df = con.execute(curr_query, [cat, cat, prior_d_from.strftime("%Y-%m-%d"), prior_d_to.strftime("%Y-%m-%d")]).df()
    
    con.close()

    geo = []
    for _, row in curr_df.iterrows():
        st = row['state']
        rev = float(row['revenue'])
        uts = int(row['units'])
        
        # Get prior
        prior_row = prior_df[prior_df['state'] == st]
        prior_rev = float(prior_row['revenue'].values[0]) if not prior_row.empty else 0.0
        
        growth = ((rev - prior_rev) / prior_rev * 100) if prior_rev > 0 else 0.0
        
        geo.append(GeoPoint(
            state=st,
            revenue=rev,
            units=uts,
            growth=growth
        ))

    return {"geo": geo}

@router.post("/upload-dataset")
async def upload_dataset(file: UploadFile = File(...)):
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="Only CSV files are supported.")
    
    # Save to data/raw
    raw_dir = os.path.join(BASE_DIR, "data", "raw")
    os.makedirs(raw_dir, exist_ok=True)
    dest_path = os.path.join(raw_dir, file.filename)
    
    try:
        with open(dest_path, "wb") as buffer:
            while chunk := await file.read(1024 * 1024): # 1MB chunk size
                buffer.write(chunk)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"File write failed: {str(e)}")
        
    return {"message": f"Successfully ingested {file.filename}", "path": dest_path}

