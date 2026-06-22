from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from .routes import router
from .forecast import precompute_forecasts

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Precompute and cache Prophet forecasts at startup
    precompute_forecasts()
    yield

app = FastAPI(
    title="Retail Demand & Sales Analytics API",
    lifespan=lifespan
)

# CORS setup matching exactly localhost:5173
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount all routers
app.include_router(router, prefix="/api")
