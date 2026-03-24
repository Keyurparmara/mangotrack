import enum
from datetime import datetime
from sqlalchemy import (
    Column, Integer, String, Float, DateTime,
    ForeignKey, Enum, Boolean, UniqueConstraint
)
from sqlalchemy.orm import relationship
from database import Base


class UserRole(str, enum.Enum):
    owner = "owner"
    manager = "manager"
    employee = "employee"


class PaymentStatus(str, enum.Enum):
    pending = "pending"
    partial = "partial"
    paid = "paid"


class ItemType(str, enum.Enum):
    mango = "mango"
    empty_box = "empty_box"


class MangoSize(str, enum.Enum):
    kg5 = "5kg"
    kg10 = "10kg"


class BoxWeight(str, enum.Enum):
    g400 = "400g"
    g500 = "500g"


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(100), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    role = Column(Enum(UserRole), nullable=False)
    parent_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    parent = relationship("User", remote_side="User.id", back_populates="children", foreign_keys="User.parent_id")
    children = relationship("User", back_populates="parent", foreign_keys="User.parent_id")
    sales = relationship("Sale", back_populates="employee")
    purchases_created = relationship("Purchase", back_populates="created_by_user")


class MangoCategory(Base):
    __tablename__ = "mango_category"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, nullable=False)
    category_number = Column(Integer, nullable=False)        # quality grade: 1, 2, 3...
    description = Column(String(255), nullable=True)        # optional quality note
    created_at = Column(DateTime, default=datetime.utcnow)

    purchase_items = relationship("PurchaseItem", back_populates="mango_category")
    sales = relationship("Sale", back_populates="mango_category")


class BoxType(Base):
    __tablename__ = "box_types"

    id = Column(Integer, primary_key=True, index=True)
    brand_name = Column(String(100), nullable=False)
    size = Column(Enum(MangoSize), nullable=False)
    box_weight = Column(Enum(BoxWeight), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    __table_args__ = (
        UniqueConstraint("brand_name", "size", "box_weight", name="uq_box_type"),
    )

    purchase_items = relationship("PurchaseItem", back_populates="box_type")


class Purchase(Base):
    __tablename__ = "purchase"

    id = Column(Integer, primary_key=True, index=True)
    city_name = Column(String(150), nullable=False)
    company_name = Column(String(150), nullable=False)
    vehicle_number = Column(String(50), nullable=False)
    unload_employee = Column(String(150), nullable=False)
    purchase_datetime = Column(DateTime, nullable=False)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    created_by_user = relationship("User", back_populates="purchases_created")
    items = relationship("PurchaseItem", back_populates="purchase", cascade="all, delete-orphan")
    payment = relationship("PurchasePayment", back_populates="purchase", uselist=False)


class PurchaseItem(Base):
    __tablename__ = "purchase_items"

    id = Column(Integer, primary_key=True, index=True)
    purchase_id = Column(Integer, ForeignKey("purchase.id"), nullable=False)
    item_type = Column(Enum(ItemType), nullable=False)

    # Mango fields
    mango_category_id = Column(Integer, ForeignKey("mango_category.id"), nullable=True)
    size = Column(Enum(MangoSize), nullable=True)

    # Empty box fields
    box_type_id = Column(Integer, ForeignKey("box_types.id"), nullable=True)

    quantity = Column(Integer, nullable=False)
    price_per_unit = Column(Float, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    purchase = relationship("Purchase", back_populates="items")
    mango_category = relationship("MangoCategory", back_populates="purchase_items")
    box_type = relationship("BoxType", back_populates="purchase_items")


class Sale(Base):
    __tablename__ = "sales"

    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    # Mango fields (optional — sale can be box-only)
    mango_category_id = Column(Integer, ForeignKey("mango_category.id"), nullable=True)
    size = Column(Enum(MangoSize), nullable=True)
    quantity = Column(Integer, nullable=True)
    price_per_box = Column(Float, nullable=True)
    # Box sale fields (optional — can be alongside mango or standalone)
    box_type_id = Column(Integer, ForeignKey("box_types.id"), nullable=True)
    box_quantity = Column(Integer, nullable=True)
    box_price_per_unit = Column(Float, nullable=True)
    # Customer details
    customer_name = Column(String(150), nullable=True)
    customer_village = Column(String(150), nullable=True)
    customer_phone = Column(String(20), nullable=True)
    transport_type = Column(String(100), nullable=True)
    # Delivery details
    vehicle_number = Column(String(50), nullable=False)
    city = Column(String(150), nullable=False)
    dispatch_time = Column(DateTime, nullable=False)
    expected_delivery_time = Column(DateTime, nullable=False)
    total_amount = Column(Float, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    employee = relationship("User", back_populates="sales")
    mango_category = relationship("MangoCategory", back_populates="sales")
    payment = relationship("Payment", back_populates="sale", uselist=False)


class Payment(Base):
    __tablename__ = "payments"

    id = Column(Integer, primary_key=True, index=True)
    sale_id = Column(Integer, ForeignKey("sales.id"), nullable=False, unique=True)
    total_amount = Column(Float, nullable=False)
    paid_amount = Column(Float, default=0.0, nullable=False)
    remaining_amount = Column(Float, nullable=False)
    due_date = Column(DateTime, nullable=False)
    status = Column(Enum(PaymentStatus), default=PaymentStatus.pending, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    sale = relationship("Sale", back_populates="payment")
    reminders = relationship("Reminder", back_populates="payment", cascade="all, delete-orphan")


class Reminder(Base):
    __tablename__ = "reminders"

    id = Column(Integer, primary_key=True, index=True)
    payment_id = Column(Integer, ForeignKey("payments.id"), nullable=False)
    reminder_date = Column(DateTime, nullable=False)
    is_done = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    payment = relationship("Payment", back_populates="reminders")


class PurchasePayment(Base):
    """Tracks money we owe to suppliers for purchases."""
    __tablename__ = "purchase_payments"

    id = Column(Integer, primary_key=True, index=True)
    purchase_id = Column(Integer, ForeignKey("purchase.id"), unique=True, nullable=False)
    total_amount = Column(Float, nullable=False)
    paid_amount = Column(Float, default=0.0, nullable=False)
    remaining_amount = Column(Float, nullable=False)
    status = Column(Enum(PaymentStatus), default=PaymentStatus.pending, nullable=False)
    notes = Column(String(500), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    purchase = relationship("Purchase", back_populates="payment")
    transactions = relationship("PurchasePaymentTransaction", back_populates="purchase_payment", cascade="all, delete-orphan")


class PurchasePaymentTransaction(Base):
    """Individual payment installments made to a supplier."""
    __tablename__ = "purchase_payment_transactions"

    id = Column(Integer, primary_key=True, index=True)
    purchase_payment_id = Column(Integer, ForeignKey("purchase_payments.id"), nullable=False)
    amount = Column(Float, nullable=False)
    notes = Column(String(500), nullable=True)
    paid_at = Column(DateTime, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    purchase_payment = relationship("PurchasePayment", back_populates="transactions")


class TruckPayment(Base):
    """Tracks freight payments to truck drivers."""
    __tablename__ = "truck_payments"

    id = Column(Integer, primary_key=True, index=True)
    vehicle_number = Column(String(50), nullable=False)
    driver_name = Column(String(150), nullable=True)
    driver_phone = Column(String(20), nullable=True)
    destination = Column(String(150), nullable=False)
    boxes_count = Column(Integer, nullable=True)
    total_freight = Column(Float, nullable=False)
    paid_amount = Column(Float, default=0.0, nullable=False)
    remaining_amount = Column(Float, nullable=False)
    departure_time = Column(DateTime, nullable=True)
    arrival_time = Column(DateTime, nullable=True)
    status = Column(Enum(PaymentStatus), default=PaymentStatus.pending, nullable=False)
    notes = Column(String(500), nullable=True)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    created_by_user = relationship("User")
    transactions = relationship("TruckPaymentTransaction", back_populates="truck_payment", cascade="all, delete-orphan")


class TruckPaymentTransaction(Base):
    """Individual payment installments made to a truck driver."""
    __tablename__ = "truck_payment_transactions"

    id = Column(Integer, primary_key=True, index=True)
    truck_payment_id = Column(Integer, ForeignKey("truck_payments.id"), nullable=False)
    amount = Column(Float, nullable=False)
    notes = Column(String(500), nullable=True)
    paid_at = Column(DateTime, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    truck_payment = relationship("TruckPayment", back_populates="transactions")
