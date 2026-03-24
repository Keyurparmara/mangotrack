import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse
from sqlalchemy import text
from database import engine, DATABASE_URL
import models
from routes import auth, purchases, sales, stock, payments, reminders, categories, purchase_payments, truck_payments, parties

# Create all tables on startup
models.Base.metadata.create_all(bind=engine)

# Safe column migrations (add new columns without breaking existing data)
_is_pg = not DATABASE_URL.startswith("sqlite")
_migrations = [
    ("ALTER TABLE sales ADD COLUMN{} customer_phone VARCHAR(20)", "sales", "customer_phone"),
    ("ALTER TABLE truck_payments ADD COLUMN{} driver_phone VARCHAR(20)", "truck_payments", "driver_phone"),
]
with engine.connect() as _conn:
    for _stmt_tpl, _tbl, _col in _migrations:
        try:
            if _is_pg:
                _conn.execute(text(_stmt_tpl.format(" IF NOT EXISTS")))
            else:
                # SQLite: check if column exists first
                cols = [r[1] for r in _conn.execute(text(f"PRAGMA table_info({_tbl})")).fetchall()]
                if _col not in cols:
                    _conn.execute(text(_stmt_tpl.format("")))
            _conn.commit()
        except Exception:
            pass

app = FastAPI(
    title="Mango Trading Inventory Management",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register API routers
app.include_router(auth.router)
app.include_router(categories.router)
app.include_router(purchases.router)
app.include_router(sales.router)
app.include_router(stock.router)
app.include_router(payments.router)
app.include_router(reminders.router)
app.include_router(purchase_payments.router)
app.include_router(truck_payments.router)
app.include_router(parties.router)

DIST_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "dist")

# Mount static assets if available
assets_dir = os.path.join(DIST_DIR, "assets")
if os.path.isdir(assets_dir):
    app.mount("/assets", StaticFiles(directory=assets_dir), name="assets")

# Health check (always works)
@app.get("/health")
def health():
    return {"status": "ok", "dist_exists": os.path.exists(DIST_DIR)}

# Serve React SPA for everything else
@app.get("/{full_path:path}", include_in_schema=False)
async def serve_spa(full_path: str = ""):
    # Serve specific public files (manifest, icon, etc)
    if full_path:
        pub = os.path.join(DIST_DIR, full_path)
        if os.path.isfile(pub):
            return FileResponse(pub)
    # Always serve index.html for React Router
    idx = os.path.join(DIST_DIR, "index.html")
    if os.path.isfile(idx):
        return FileResponse(idx)
    return JSONResponse({"error": "Build not found", "dist": DIST_DIR}, status_code=200)
