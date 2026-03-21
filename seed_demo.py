"""
Run this ONCE to seed demo data:
  python seed_demo.py
"""
import requests, sys, json
from datetime import datetime, timedelta

BASE = "http://127.0.0.1:8000"

def p(label, r):
    color = "\033[92m" if r.status_code < 300 else "\033[91m"
    print(f"{color}[{r.status_code}]\033[0m {label}: {r.json()}")

# ── 1. Register users ─────────────────────────────────────────────────────────
print("\n=== USERS ===")
r = requests.post(f"{BASE}/auth/register",
    json={"username": "manager1", "password": "pass123", "role": "manager"})
p("Register manager1", r)

r = requests.post(f"{BASE}/auth/register",
    json={"username": "emp1", "password": "pass123", "role": "employee"})
p("Register emp1", r)

r = requests.post(f"{BASE}/auth/register",
    json={"username": "testing", "password": "testing@123", "role": "manager"})
p("Register testing (manager)", r)

# ── 2. Login as manager ───────────────────────────────────────────────────────
r = requests.post(f"{BASE}/auth/login",
    data={"username": "manager1", "password": "pass123"})
token = r.json().get("access_token")
if not token:
    print("Login failed — is backend running? Start it first.")
    sys.exit(1)

H = {"Authorization": f"Bearer {token}"}
print(f"\n✅ Manager logged in")

# ── 3. Mango Categories ───────────────────────────────────────────────────────
print("\n=== MANGO CATEGORIES ===")
cats = [
    {"name": "Alphonso",  "category_number": 1, "description": "Premium A-grade Alphonso"},
    {"name": "Kesar",     "category_number": 2, "description": "Sweet Kesar mango"},
    {"name": "Dasheri",   "category_number": 3, "description": "Standard Dasheri"},
]
cat_ids = {}
for c in cats:
    r = requests.post(f"{BASE}/mango-categories", json=c, headers=H)
    if r.status_code in (200, 201):
        cat_ids[c["name"]] = r.json()["id"]
    p(f"Category {c['name']}", r)

# ── 4. Box Types ──────────────────────────────────────────────────────────────
print("\n=== BOX TYPES ===")
boxes = [
    {"brand_name": "Ambar",  "size": "5kg",  "box_weight": "400g"},
    {"brand_name": "Ambar",  "size": "10kg", "box_weight": "500g"},
    {"brand_name": "Golden", "size": "5kg",  "box_weight": "400g"},
]
box_ids = {}
for b in boxes:
    r = requests.post(f"{BASE}/box-types", json=b, headers=H)
    if r.status_code in (200, 201):
        key = f"{b['brand_name']}-{b['size']}"
        box_ids[key] = r.json()["id"]
    p(f"BoxType {b['brand_name']} {b['size']}", r)

# ── 5. Purchase (Alphonso 100 boxes @ ₹300, + empty boxes) ───────────────────
print("\n=== PURCHASE ===")
alphonso_id = cat_ids.get("Alphonso", 1)
ambar5_id   = box_ids.get("Ambar-5kg", 1)
kesar_id    = cat_ids.get("Kesar", 2)

purchase_payload = {
    "city_name":         "Surat",
    "company_name":      "Patel Mango Traders",
    "vehicle_number":    "GJ05AB1234",
    "unload_employee":   "Ramesh",
    "purchase_datetime": datetime.now().isoformat(),
    "items": [
        {   # Alphonso 5kg — 100 boxes @ ₹300
            "item_type":         "mango",
            "mango_category_id": alphonso_id,
            "size":              "5kg",
            "quantity":          100,
            "price_per_unit":    300.0,
        },
        {   # Kesar 10kg — 50 boxes @ ₹250
            "item_type":         "mango",
            "mango_category_id": kesar_id,
            "size":              "10kg",
            "quantity":          50,
            "price_per_unit":    250.0,
        },
        {   # Empty boxes Ambar 5kg — 120 boxes @ ₹45
            "item_type":    "empty_box",
            "box_type_id":  ambar5_id,
            "quantity":     120,
            "price_per_unit": 45.0,
        },
    ]
}
r = requests.post(f"{BASE}/purchases", json=purchase_payload, headers=H)
p("Purchase created", r)

# ── 6. Sale by employee ───────────────────────────────────────────────────────
print("\n=== SALE (by employee) ===")
r2 = requests.post(f"{BASE}/auth/login",
    data={"username": "emp1", "password": "pass123"})
emp_token = r2.json().get("access_token")
EH = {"Authorization": f"Bearer {emp_token}"}

sale_payload = {
    "mango_category_id":    alphonso_id,
    "size":                 "5kg",
    "quantity":             10,
    "price_per_box":        380.0,
    "vehicle_number":       "GJ01CD5678",
    "city":                 "Mumbai",
    "dispatch_time":        datetime.now().isoformat(),
    "expected_delivery_time": (datetime.now() + timedelta(hours=8)).isoformat(),
}
r = requests.post(f"{BASE}/sales", json=sale_payload, headers=EH)
p("Sale created", r)
sale_id = r.json().get("id") if r.status_code == 201 else None

# ── 7. Payment for the sale ───────────────────────────────────────────────────
if sale_id:
    print("\n=== PAYMENT ===")
    payment_payload = {
        "sale_id":    sale_id,
        "due_date":   (datetime.now() + timedelta(days=7)).isoformat(),
        "paid_amount": 1000.0,
    }
    r = requests.post(f"{BASE}/payments", json=payment_payload, headers=H)
    p("Payment created", r)

# ── 8. Summary ────────────────────────────────────────────────────────────────
print("\n=== STOCK CHECK ===")
r = requests.get(f"{BASE}/stock/", headers=H)
stock = r.json()
for m in stock.get("mango", []):
    print(f"  🥭 {m['mango_category_name']} {m['size']} — "
          f"Purchased:{m['purchased']} Sold:{m['sold']} Available:{m['available']}")
for b in stock.get("empty_boxes", []):
    print(f"  📦 {b['brand_name']} {b['size']} {b['box_weight']} — Available:{b['available']}")

print("\n✅ Demo data seeded!\n")
print("Login credentials:")
print("  Manager  → username: manager1   password: pass123")
print("  Manager  → username: testing    password: testing@123")
print("  Employee → username: emp1       password: pass123")
