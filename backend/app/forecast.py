import os
import logging
import pandas as pd
import numpy as np
from prophet import Prophet
import duckdb
from .database import get_db, get_db_writable

logger = logging.getLogger("uvicorn.error")

def precompute_forecasts():
    logger.info("Initializing precomputed forecasts...")
    
    con = get_db_writable()
    
    # 1. Create forecasts cache table if not exists
    con.execute("""
        CREATE TABLE IF NOT EXISTS forecasts (
            cat_id VARCHAR,
            state_id VARCHAR,
            date DATE,
            forecast_revenue DOUBLE,
            yhat_lower DOUBLE,
            yhat_upper DOUBLE
        )
    """)
    
    # Check if we already have forecasts precomputed
    count = con.execute("SELECT count(*) FROM forecasts").fetchone()[0]
    if count > 0:
        logger.info(f"Forecasts already precomputed ({count} rows). Skipping precomputation.")
        con.close()
        return

    logger.info("Cache is empty. Training models for 9 combinations...")

    # Load holidays
    holidays_df = con.execute("""
        SELECT DISTINCT CAST(date AS DATE) as ds, event_name_1 as holiday 
        FROM calendar 
        WHERE event_name_1 IS NOT NULL
    """).df()
    # Ensure columns match Prophet holiday expectations
    holidays_df['ds'] = pd.to_datetime(holidays_df['ds'])

    categories = ["FOODS", "HOBBIES", "HOUSEHOLD"]
    states = ["CA", "TX", "WI"]

    all_forecast_rows = []

    for cat in categories:
        for state in states:
            logger.info(f"Training forecasting model for Category: {cat}, State: {state}")
            
            df = con.execute("""
                SELECT 
                    CAST(date AS DATE) as ds, 
                    COALESCE(SUM(total_revenue), 0) as y
                FROM agg_daily
                WHERE cat_id = ? AND state_id = ?
                GROUP BY date
                ORDER BY date
            """, [cat, state]).df()
            
            if df.empty:
                logger.warning(f"No historical data for {cat} x {state}. Skipping.")
                continue

            df['ds'] = pd.to_datetime(df['ds'])
            df['y'] = df['y'].astype(float)
            
            method_used = "Prophet"
            try:
                # Train Prophet model
                m = Prophet(holidays=holidays_df, daily_seasonality=False, weekly_seasonality=True, yearly_seasonality=True)
                m.fit(df)
                
                # Make future dataframe for 28 days
                future = m.make_future_dataframe(periods=28, freq='D')
                forecast = m.predict(future)
                
                # Align outputs
                forecast_df = forecast[['ds', 'yhat', 'yhat_lower', 'yhat_upper']].copy()
                forecast_df.columns = ['date', 'forecast_revenue', 'yhat_lower', 'yhat_upper']
            except Exception as e:
                logger.error(f"Prophet failed for {cat} x {state}: {e}. Falling back to Holt-Winters.")
                method_used = "Holt-Winters"
                try:
                    from statsmodels.tsa.holtwinters import ExponentialSmoothing
                    
                    # Set frequency and fit
                    ts_df = df.set_index('ds').asfreq('D').fillna(method='ffill')
                    hw_model = ExponentialSmoothing(
                        ts_df['y'], 
                        seasonal_periods=7, 
                        trend='add', 
                        seasonal='add'
                    )
                    hw_fit = hw_model.fit()
                    
                    # Forecast historical + 28 future days
                    pred_all = hw_fit.predict(start=ts_df.index[0], end=ts_df.index[-1] + pd.Timedelta(days=28))
                    
                    # Generate dataframe
                    forecast_df = pd.DataFrame({
                        'date': pred_all.index,
                        'forecast_revenue': pred_all.values,
                        'yhat_lower': pred_all.values * 0.9, # simple baseline bound
                        'yhat_upper': pred_all.values * 1.1
                    })
                except Exception as ex:
                    logger.critical(f"Holt-Winters also failed for {cat} x {state}: {ex}.")
                    continue

            logger.info(f"Successfully generated forecasts for {cat} x {state} using {method_used}.")
            
            # Format and collect rows
            forecast_df['cat_id'] = cat
            forecast_df['state_id'] = state
            forecast_df['date'] = forecast_df['date'].dt.date
            
            all_forecast_rows.append(forecast_df)

    if all_forecast_rows:
        combined_df = pd.concat(all_forecast_rows, ignore_index=True)
        # Ensure exact column order matching forecasts schema
        combined_df = combined_df[['cat_id', 'state_id', 'date', 'forecast_revenue', 'yhat_lower', 'yhat_upper']]
        
        # Register and write to warehouse forecasts table
        con.register("temp_forecasts", combined_df)
        con.execute("INSERT INTO forecasts SELECT * FROM temp_forecasts")
        con.unregister("temp_forecasts")
        logger.info(f"Cached {len(combined_df)} precomputed forecast rows.")
        
    con.close()
