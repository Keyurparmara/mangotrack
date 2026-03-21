"""
Run once to create owner 'owner1', manager 'keyurm' and sample data.
Idempotent — safe to run multiple times.
Usage: python seed_manager.py
"""
import sys
from database import SessionLocal, engine
import models
from auth_utils import hash_password
from datetime import datetime, timedelta

models.Base.metadata.create_all(bind=engine)
db = SessionLocal()

try:
    # 1. Create owner 'owner1' if not exists
    owner = db.query(models.User).filter(models.User.username == 'owner1').first()
    if not owner:
        owner = models.User(
            username='owner1',
            password_hash=hash_password('owner123'),
            role=models.UserRole.owner
        )
        db.add(owner)
        db.commit()
        db.refresh(owner)
        print(f"✅ Owner 'owner1' created (ID: {owner.id})")
    else:
        print(f"ℹ️  Owner 'owner1' already exists (ID: {owner.id})")

    # 2. Create manager 'keyurm' if not exists
    manager = db.query(models.User).filter(models.User.username == 'keyurm').first()
    if not manager:
        manager = models.User(
            username='keyurm',
            password_hash=hash_password('keyur1234'),
            role=models.UserRole.manager,
            parent_id=owner.id
        )
        db.add(manager)
        db.commit()
        db.refresh(manager)
        print(f"✅ Manager 'keyurm' created (ID: {manager.id})")
    else:
        print(f"ℹ️  Manager 'keyurm' already exists (ID: {manager.id})")

    # 3. Create mango category if not exists
    cat = db.query(models.MangoCategory).filter(models.MangoCategory.name == 'Kesar').first()
    if not cat:
        cat = models.MangoCategory(name='Kesar', category_number=1, description='Premium Kesar')
        db.add(cat)
        db.commit()
        db.refresh(cat)
        print(f"✅ Category 'Kesar' created (ID: {cat.id})")
    else:
        print(f"ℹ️  Category 'Kesar' already exists (ID: {cat.id})")

    # 4. Create box type if not exists
    bt = db.query(models.BoxType).filter(models.BoxType.brand_name == 'Standard').first()
    if not bt:
        bt = models.BoxType(brand_name='Standard', size=models.MangoSize.kg10, box_weight=models.BoxWeight.g400)
        db.add(bt)
        db.commit()
        db.refresh(bt)
        print(f"✅ Box type 'Standard' created (ID: {bt.id})")
    else:
        print(f"ℹ️  Box type 'Standard' already exists (ID: {bt.id})")

    # 5. Create sample purchase ONLY if no purchases exist yet
    existing_purchase = db.query(models.Purchase).filter(models.Purchase.created_by == manager.id).first()
    if not existing_purchase:
        purchase = models.Purchase(
            city_name='Surat',
            company_name='Patel Farms',
            vehicle_number='GJ05AB1234',
            unload_employee='Ramesh',
            purchase_datetime=datetime.utcnow() - timedelta(days=3),
            created_by=manager.id
        )
        db.add(purchase)
        db.flush()

        item = models.PurchaseItem(
            purchase_id=purchase.id,
            item_type=models.ItemType.mango,
            mango_category_id=cat.id,
            size=models.MangoSize.kg10,
            quantity=200,
            price_per_unit=850.0
        )
        db.add(item)
        db.commit()
        print(f"✅ Sample purchase created (ID: {purchase.id}) — 200 boxes Kesar 10kg")

        # 6. Create 2 sample sales
        for i, (customer, qty, price) in enumerate([('Mahesh Bhai', 50, 1100), ('Suresh Traders', 30, 1050)]):
            sale = models.Sale(
                employee_id=manager.id,
                mango_category_id=cat.id,
                size=models.MangoSize.kg10,
                quantity=qty,
                price_per_box=price,
                customer_name=customer,
                customer_village='Navsari',
                vehicle_number=f'GJ06XY{100+i}',
                city='Navsari',
                dispatch_time=datetime.utcnow() - timedelta(days=2-i),
                expected_delivery_time=datetime.utcnow() - timedelta(days=1-i),
                total_amount=qty * price
            )
            db.add(sale)
            db.commit()
            print(f"✅ Sale {i+1} created — {qty} boxes to {customer} @ ₹{price}")
    else:
        print(f"ℹ️  Sample data already exists — skipping purchase/sales creation")

    print("\n🎉 Done!")
    print("   Login as: owner1 / owner123  (owner)")
    print("   Login as: keyurm / keyur1234  (manager with sample data)")

except Exception as e:
    db.rollback()
    print(f"❌ Error: {e}")
    sys.exit(1)
finally:
    db.close()
