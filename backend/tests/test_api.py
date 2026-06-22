import pytest
from fastapi.testclient import TestClient
import sys
import os

# Ensure backend directory is in path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.main import app

@pytest.fixture(scope="module")
def client():
    with TestClient(app) as c:
        yield c

def test_health(client):
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json() == {"status": "healthy"}

def test_kpis(client):
    response = client.get("/api/kpis?date_from=2015-01-01&date_to=2015-01-10&category=ALL&state=ALL")
    assert response.status_code == 200
    data = response.json()
    assert "total_revenue" in data
    assert "total_units_sold" in data
    assert "revenue_change_pct" in data
    assert "units_change_pct" in data
    
    assert isinstance(data["total_revenue"], float)
    assert isinstance(data["total_units_sold"], int)
    assert isinstance(data["revenue_change_pct"], float)
    assert isinstance(data["units_change_pct"], float)

def test_sales_trend(client):
    response = client.get("/api/sales/trend?date_from=2015-01-01&date_to=2015-01-10&category=ALL&state=ALL&granularity=daily")
    assert response.status_code == 200
    data = response.json()
    assert "data" in data
    assert isinstance(data["data"], list)
    if data["data"]:
        first = data["data"][0]
        assert "date" in first
        assert "revenue" in first
        assert "units" in first
        assert "forecast_revenue" in first
        assert "forecast_units" in first

def test_treemap(client):
    response = client.get("/api/treemap?date_from=2015-01-01&date_to=2015-01-10&state=ALL")
    assert response.status_code == 200
    data = response.json()
    assert "categories" in data
    assert isinstance(data["categories"], list)
    for cat in data["categories"]:
        assert "category" in cat
        assert "revenue" in cat
        assert "revenue_growth_pct" in cat
        assert isinstance(cat["revenue_growth_pct"], float)

def test_top_products(client):
    response = client.get("/api/top-products?date_from=2015-01-01&date_to=2015-01-10&category=ALL&state=ALL&metric=revenue&limit=5")
    assert response.status_code == 200
    data = response.json()
    assert "data" in data
    assert isinstance(data["data"], list)
    assert len(data["data"]) <= 5
    for prod in data["data"]:
        assert "item_id" in prod
        assert "revenue" in prod
        assert "units" in prod
        assert "rank" in prod

def test_forecast(client):
    response = client.get("/api/forecast?category=ALL&state=ALL&horizon=14")
    assert response.status_code == 200
    data = response.json()
    assert "data" in data
    assert isinstance(data["data"], list)
    for point in data["data"]:
        assert "date" in point
        assert "actual_revenue" in point
        assert "forecast_revenue" in point
        assert "lower_bound" in point
        assert "upper_bound" in point

def test_promotions(client):
    response = client.get("/api/promotions?category=ALL&state=ALL")
    assert response.status_code == 200
    data = response.json()
    assert "promotions" in data
    assert isinstance(data["promotions"], list)
    assert len(data["promotions"]) <= 20
    for promo in data["promotions"]:
        assert "item_id" in promo
        assert "category" in promo
        assert "state" in promo
        assert "week_start_date" in promo
        assert "week_end_date" in promo
        assert "units_sold" in promo
        assert "prev_units_sold" in promo

def test_root_cause(client):
    response = client.get("/api/root-cause?date=2015-11-26&category=ALL&state=ALL")
    assert response.status_code == 200
    data = response.json()
    assert "driver" in data
    assert "description" in data

def test_scenario(client):
    response = client.get("/api/scenario?category=ALL&state=ALL&price_delta_pct=-10&promo_uplift_pct=5")
    assert response.status_code == 200
    data = response.json()
    assert "scenario" in data
    assert isinstance(data["scenario"], list)
    if data["scenario"]:
        first = data["scenario"][0]
        base = first["baseline_revenue"]
        adj = first["adjusted_revenue"]
        if base > 0:
            assert abs((adj / base) - 1.0395) < 1e-5

def test_geo(client):
    response = client.get("/api/geo?date_from=2015-01-01&date_to=2015-01-10&category=ALL")
    assert response.status_code == 200
    data = response.json()
    assert "geo" in data
    assert isinstance(data["geo"], list)
    for state in data["geo"]:
        assert "state" in state
        assert "revenue" in state
        assert "units" in state
        assert "growth" in state

def test_upload_dataset(client):
    import io
    csv_file = io.BytesIO(b"item_id,store_id,wm_yr_wk\nFOODS_1_001,CA_1,11101\n")
    csv_file.name = "test_upload.csv"
    response = client.post("/api/upload-dataset", files={"file": ("test_upload.csv", csv_file, "text/csv")})
    assert response.status_code == 200
    assert "Successfully ingested" in response.json()["message"]

def test_dataset_preview(client):
    response = client.get("/api/dataset-preview?filename=test_upload.csv")
    assert response.status_code == 200
    data = response.json()
    assert "filename" in data
    assert "row_count" in data
    assert "columns_summary" in data
    assert "preview_rows" in data


