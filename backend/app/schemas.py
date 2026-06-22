from pydantic import BaseModel
from typing import List, Optional

# /api/health
class HealthResponse(BaseModel):
    status: str

# /api/kpis
class KPIResponse(BaseModel):
    total_revenue: float
    total_units_sold: int
    revenue_change_pct: float
    units_change_pct: float

# /api/sales/trend
class TrendPoint(BaseModel):
    date: str
    revenue: float
    units: float
    forecast_revenue: Optional[float]
    forecast_units: Optional[float]

class TrendResponse(BaseModel):
    data: List[TrendPoint]

# /api/treemap
class TreemapCategory(BaseModel):
    category: str
    revenue: float
    revenue_growth_pct: float

class TreemapResponse(BaseModel):
    categories: List[TreemapCategory]

# /api/top-products
class TopProduct(BaseModel):
    item_id: str
    revenue: float
    units: int
    rank: int

class TopProductsResponse(BaseModel):
    data: List[TopProduct]

# /api/forecast
class ForecastPoint(BaseModel):
    date: str
    actual_revenue: Optional[float]
    forecast_revenue: float
    lower_bound: float
    upper_bound: float

class ForecastResponse(BaseModel):
    data: List[ForecastPoint]

# /api/promotions
class PromotionImpact(BaseModel):
    item_id: str
    category: str
    state: str
    week_start_date: str
    week_end_date: str
    units_sold: int
    prev_units_sold: int

class PromotionsResponse(BaseModel):
    promotions: List[PromotionImpact]

# /api/root-cause
class RootCauseResponse(BaseModel):
    driver: str
    description: str

# /api/scenario
class ScenarioPoint(BaseModel):
    date: str
    baseline_revenue: float
    adjusted_revenue: float

class ScenarioResponse(BaseModel):
    scenario: List[ScenarioPoint]

# /api/geo
class GeoPoint(BaseModel):
    state: str
    revenue: float
    units: int
    growth: float

class GeoResponse(BaseModel):
    geo: List[GeoPoint]
