# DemandDoc — Premium Retail Demand & Sales Analytics Engine

DemandDoc is a high-performance, enterprise-grade analytical application designed to provide sub-second slicing of sales data, AI-driven demand forecasting, inventory safety-stock planning, anomaly detection, scenario simulator, and custom multi-file correlation analysis.

Built on a decoupled modern architecture combining a React SPA frontend and a FastAPI backend, the engine leverages DuckDB for in-memory OLAP analytics and Facebook Prophet for machine learning time-series forecasting.

---

## 🚀 Key Features

### 1. Unified Retail Dashboard
* **Dynamic KPIs**: Instant tracking of Total Revenue, Units Sold, Average Order Value (AOV), and Category Mix with comparative growth deltas.
* **Granular Time-Series Trend**: Interactive ECharts line chart supporting Daily, Weekly, and Monthly aggregations.
* **Geographic Breakdown**: Visualizes regional distribution and market concentration across states (CA, TX, WI).
* **Category Treemap**: Beautifully color-coded breakdown of category contributions (Foods, Hobbies, Household).

### 2. Machine Learning Demand Forecast
* **Prophet-Powered Projections**: 28-day future sales projections with lower and upper confidence bands.
* **Safety Stock & Replenishment**: Dynamic calculations for safety stock and Reorder Points (ROP) using lead-time configurations and target service levels (90%, 95%, 99%).

### 3. Promotion Lift & Anomaly Root Cause Analysis
* **Promotional Impact**: Tracks promotional performance and baseline vs. promotion sales lift.
* **Rule-Based Anomaly Detection**: Explains date-specific sales drops (e.g., stockouts, holiday closures) with quantitative impact and recommended actions.

### 4. What-If Scenario Pricing Simulator
* **Elasticity Modeling**: Adjust price changes to simulate baseline vs. adjusted revenue changes using custom elasticity sliders.

### 5. Print-Ready PDF Reporting
* **A4 Detailed Exports**: A dedicated, print-optimized white-background report featuring cover pages, executive summaries, annotated financial trends, and comprehensive SWOT-style (Strength, Weakness, Risk) narratives.

### 6. Custom Multi-File Correlation Analysis
* **Single File Analytics**: Upload any custom CSV file to inspect data profiles (types, null %, unique counts) and dynamically generate trend, category, and geo breakdown charts.
* **N-File Correlation Engine**: Upload multiple CSV files, select custom join keys (e.g., Date, Product ID, Store), and select metric columns to join tables in-memory via DuckDB. Computes Pearson correlation coefficients and plots comparative multi-line charts.

---

## 🛠 Tech Stack

* **Frontend**: React 18, Vite, TypeScript, TailwindCSS, Zustand (State), TanStack Query (Caching & Fetching), ECharts (Canvas Charting).
* **Backend**: Python 3.10+, FastAPI (Asynchronous API), Uvicorn.
* **Data & Machine Learning**: DuckDB (Columnar Database Engine), Prophet (Time-series Model), Pandas, Numpy.

---

## 💻 Local Development Setup

### Prerequisites
* Python 3.10 or higher
* Node.js 18 or higher

### 1. Backend & Data Pipeline
The backend requires the raw Kaggle M5 Forecasting datasets to be placed in `backend/data/raw/` (e.g., `sales_train_evaluation.csv`, `calendar.csv`, `sell_prices.csv`).

```bash
# Initialize and activate Python Virtual Environment
python3 -m venv venv
source venv/bin/activate

# Install dependencies
pip install fastapi uvicorn duckdb pyarrow prophet pydantic scikit-learn pandas pytest

# Run the data pipeline (transforms raw Kaggle data into warehouse.duckdb)
cd backend
python3 pipeline/prepare_data.py

# Launch the FastAPI Server (defaults to port 8000)
python3 -m uvicorn app.main:app --reload
```

### 2. Frontend Setup
Open a new terminal window:

```bash
cd frontend

# Install Node modules
npm install

# Run the development server (configured for port 3000)
npm run dev -- --port 3000
```
Open your browser and navigate to `http://localhost:3000`.

### 3. Automated Tests
```bash
# Backend unit tests
cd backend
pytest

# Verify frontend production build compiles cleanly
cd frontend
npm run build
```