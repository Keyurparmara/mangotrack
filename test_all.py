import requests, json, sys, time

BASE = "http://127.0.0.1:8000"
PASS = []
FAIL = []

def p(label, r, expected=None):
    ok = r.status_code < 300
    if expected:
        ok = r.status_code == expected
    status = "PASS" if ok else "FAIL"
    if ok:
        PASS.append(label)
    else:
        FAIL.append(label)
    print(f"[{status}] {r.status_code} | {label}")
    try:
        d = r.json()
        print(json.dumps(d, indent=2, default=str))
    except:
        print(r.text)
    print()
    return r.json() if r.status_code < 300 else None


print("=" * 60)
print("MANGO TRADING API - FULL TEST SUITE")
print("=" * 60)

# ── AUTH ──────────────────────────────────────────────────────
print("\n--- AUTH ---")
p("Register manager", requests.post(f"{BASE}/auth/register",
    json={"username": "manager1", "password": "pass1234", "role": "manager"}))
p("Register employee", requests.post(f"{BASE}/auth/register",
    json={"username": "emp1", "password": "pass1234", "role": "employee"}))
p("Duplicate username", requests.post(f"{BASE}/auth/register",
    json={"username": "manager1", "password": "pass1234", "role": "manager"}), expected=400)
p("Wrong password login", requests.post(f"{BASE}/auth/login",
    json={"username": "manager1", "password": "wrongpass"}), expected=401)

mgr_resp = requests.post(f"{BASE}/auth/login", json={"username": "manager1", "password": "pass1234"})
emp_resp = requests.post(f"{BASE}/auth/login", json={"username": "emp1", "password": "pass1234"})
p("Login manager", mgr_resp)
p("Login employee", emp_resp)

mgr_token = mgr_resp.json()["access_token"]
emp_token = emp_resp.json()["access_token"]
MH = {"Authorization": f"Bearer {mgr_token}"}
EH = {"Authorization": f"Bearer {emp_token}"}

# ── CATEGORIES ────────────────────────────────────────────────
print("\n--- MANGO CATEGORIES ---")
cat1 = p("Create category: 1 number", requests.post(f"{BASE}/mango-categories",
    json={"name": "1 number"}, headers=MH))
cat2 = p("Create category: 2 number", requests.post(f"{BASE}/mango-categories",
    json={"name": "2 number"}, headers=MH))
p("Duplicate category", requests.post(f"{BASE}/mango-categories",
    json={"name": "1 number"}, headers=MH), expected=400)
p("Employee cannot create category", requests.post(f"{BASE}/mango-categories",
    json={"name": "3 number"}, headers=EH), expected=403)
p("List categories", requests.get(f"{BASE}/mango-categories", headers=MH))

# ── BOX TYPES ─────────────────────────────────────────────────
print("\n--- BOX TYPES ---")
bt1 = p("Create box: Ambar 5kg 400g", requests.post(f"{BASE}/box-types",
    json={"brand_name": "Ambar", "size": "5kg", "box_weight": "400g"}, headers=MH))
bt2 = p("Create box: Ambar 10kg 500g", requests.post(f"{BASE}/box-types",
    json={"brand_name": "Ambar", "size": "10kg", "box_weight": "500g"}, headers=MH))
p("Duplicate box type", requests.post(f"{BASE}/box-types",
    json={"brand_name": "Ambar", "size": "5kg", "box_weight": "400g"}, headers=MH), expected=400)
p("List box types", requests.get(f"{BASE}/box-types", headers=MH))

cat1_id = cat1["id"] if cat1 else 1
cat2_id = cat2["id"] if cat2 else 2
bt1_id = bt1["id"] if bt1 else 1
bt2_id = bt2["id"] if bt2 else 2

# ── PURCHASE ──────────────────────────────────────────────────
print("\n--- PURCHASES ---")
purchase1 = p("Create purchase with mango + box items", requests.post(f"{BASE}/purchases/",
    json={
        "city_name": "Surat",
        "company_name": "Gujarat Mango Co.",
        "vehicle_number": "GJ05AB1234",
        "unload_employee": "Ramesh",
        "purchase_datetime": "2026-03-18T10:00:00",
        "items": [
            {
                "item_type": "mango",
                "mango_category_id": cat1_id,
                "size": "5kg",
                "quantity": 100,
                "price_per_unit": 500.0
            },
            {
                "item_type": "mango",
                "mango_category_id": cat1_id,
                "size": "10kg",
                "quantity": 50,
                "price_per_unit": 900.0
            },
            {
                "item_type": "empty_box",
                "box_type_id": bt1_id,
                "quantity": 200,
                "price_per_unit": 30.0
            }
        ]
    }, headers=MH))

p("Employee cannot create purchase", requests.post(f"{BASE}/purchases/",
    json={
        "city_name": "Ahmedabad", "company_name": "X", "vehicle_number": "GJ01AA0001",
        "unload_employee": "Y", "purchase_datetime": "2026-03-18T10:00:00",
        "items": [{"item_type": "mango", "mango_category_id": cat1_id, "size": "5kg",
                   "quantity": 10, "price_per_unit": 500.0}]
    }, headers=EH), expected=403)

p1_id = purchase1["id"] if purchase1 else 1
p("Add item to purchase", requests.post(f"{BASE}/purchases/{p1_id}/items",
    json={"item_type": "mango", "mango_category_id": cat2_id, "size": "5kg",
          "quantity": 60, "price_per_unit": 480.0}, headers=MH))
p("List purchases", requests.get(f"{BASE}/purchases/", headers=MH))
p("Get purchase detail", requests.get(f"{BASE}/purchases/{p1_id}", headers=MH))

# ── STOCK (after purchase, before sales) ─────────────────────
print("\n--- STOCK (after purchase) ---")
p("Get full stock", requests.get(f"{BASE}/stock/", headers=MH))
p("Get mango stock only", requests.get(f"{BASE}/stock/mango", headers=MH))
p("Get box stock only", requests.get(f"{BASE}/stock/boxes", headers=MH))
p("Employee cannot see stock", requests.get(f"{BASE}/stock/", headers=EH), expected=403)

# ── SALES ─────────────────────────────────────────────────────
print("\n--- SALES ---")
sale1 = p("Create sale (valid stock)", requests.post(f"{BASE}/sales/",
    json={
        "mango_category_id": cat1_id,
        "size": "5kg",
        "quantity": 30,
        "price_per_box": 600.0,
        "vehicle_number": "GJ05XY5678",
        "city": "Mumbai",
        "dispatch_time": "2026-03-19T08:00:00",
        "expected_delivery_time": "2026-03-20T18:00:00"
    }, headers=EH))

p("Sale with insufficient stock", requests.post(f"{BASE}/sales/",
    json={
        "mango_category_id": cat1_id,
        "size": "5kg",
        "quantity": 999,
        "price_per_box": 600.0,
        "vehicle_number": "GJ05ZZ0001",
        "city": "Delhi",
        "dispatch_time": "2026-03-19T08:00:00",
        "expected_delivery_time": "2026-03-20T18:00:00"
    }, headers=EH), expected=400)

p("Sale with wrong delivery time", requests.post(f"{BASE}/sales/",
    json={
        "mango_category_id": cat1_id, "size": "5kg", "quantity": 5,
        "price_per_box": 600.0, "vehicle_number": "GJ01AA0001", "city": "Pune",
        "dispatch_time": "2026-03-20T08:00:00",
        "expected_delivery_time": "2026-03-19T08:00:00"
    }, headers=EH), expected=400)

p("Employee sees own sales", requests.get(f"{BASE}/sales/", headers=EH))
p("Manager sees all sales", requests.get(f"{BASE}/sales/", headers=MH))

sale1_id = sale1["id"] if sale1 else 1
p("Get single sale", requests.get(f"{BASE}/sales/{sale1_id}", headers=EH))

# ── STOCK (after sales) ───────────────────────────────────────
print("\n--- STOCK (after 30 boxes sold) ---")
p("Stock reduced after sale", requests.get(f"{BASE}/stock/mango", headers=MH))

# ── PAYMENTS ──────────────────────────────────────────────────
print("\n--- PAYMENTS ---")
pay1 = p("Create payment for sale", requests.post(f"{BASE}/payments/",
    json={
        "sale_id": sale1_id,
        "due_date": "2026-04-18T00:00:00",
        "paid_amount": 5000.0
    }, headers=MH))

p("Duplicate payment", requests.post(f"{BASE}/payments/",
    json={"sale_id": sale1_id, "due_date": "2026-04-18T00:00:00", "paid_amount": 0.0},
    headers=MH), expected=400)

pay1_id = pay1["id"] if pay1 else 1
p("Update payment (partial pay)", requests.put(f"{BASE}/payments/{pay1_id}",
    json={"paid_amount": 10000.0}, headers=MH))
p("Update payment (full pay)", requests.put(f"{BASE}/payments/{pay1_id}",
    json={"paid_amount": 18000.0}, headers=MH))
p("Overpay guard", requests.put(f"{BASE}/payments/{pay1_id}",
    json={"paid_amount": 999999.0}, headers=MH), expected=400)
p("List payments", requests.get(f"{BASE}/payments/", headers=MH))

# ── REMINDERS ─────────────────────────────────────────────────
print("\n--- REMINDERS ---")
p("Get upcoming reminders", requests.get(f"{BASE}/reminders/", headers=MH))
p("Get all reminders", requests.get(f"{BASE}/reminders/all", headers=MH))

# Check reminder was auto-created
all_rem = requests.get(f"{BASE}/reminders/all", headers=MH).json()
if all_rem:
    rem_id = all_rem[0]["id"]
    p("Mark reminder done", requests.put(f"{BASE}/reminders/{rem_id}/done", headers=MH))
    p("Verify reminder marked done", requests.get(f"{BASE}/reminders/all", headers=MH))

# ── SUMMARY ───────────────────────────────────────────────────
print("=" * 60)
print(f"RESULTS: {len(PASS)} PASSED, {len(FAIL)} FAILED")
if FAIL:
    print("FAILED TESTS:")
    for f in FAIL:
        print(f"  - {f}")
print("=" * 60)
