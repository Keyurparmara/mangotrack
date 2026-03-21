import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse
from database import engine
import models
from routes import auth, purchases, sales, stock, payments, reminders, categories, purchase_payments, truck_payments, parties

# Create all tables on startup
models.Base.metadata.create_all(bind=engine)

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
