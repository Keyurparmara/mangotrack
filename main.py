import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from database import engine
import models
from routes import auth, purchases, sales, stock, payments, reminders, categories, purchase_payments, truck_payments, parties

# Create all tables on startup
models.Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Mango Trading Inventory Management",
    description="Production-ready inventory system for mango trading with role-based access control.",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
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

@app.get("/health")
def health():
    return {"status": "ok"}

# Serve React frontend (production build)
DIST_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "dist")
if os.path.exists(DIST_DIR):
    app.mount("/assets", StaticFiles(directory=os.path.join(DIST_DIR, "assets")), name="assets")

    @app.get("/")
    async def serve_root():
        return FileResponse(os.path.join(DIST_DIR, "index.html"))

    @app.get("/{full_path:path}", include_in_schema=False)
    async def serve_react(full_path: str):
        file_path = os.path.join(DIST_DIR, full_path)
        if os.path.isfile(file_path):
            return FileResponse(file_path)
        return FileResponse(os.path.join(DIST_DIR, "index.html"))
