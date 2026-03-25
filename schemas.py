from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from models import UserRole, PaymentStatus, ItemType, MangoSize, BoxWeight


# ─── Auth ────────────────────────────────────────────────────────────────────

class UserCreate(BaseModel):
    username: str = Field(..., min_length=3, max_length=100)
    password: str = Field(..., min_length=6)
    role: UserRole


class UserOut(BaseModel):
    id: int
    username: str
    role: UserRole
    parent_id: Optional[int] = None
    created_at: datetime

    class Config:
        from_attributes = True


class TeamMemberOut(BaseModel):
    id: int
    username: str
    role: UserRole
    parent_id: Optional[int] = None
    created_at: datetime
    children: List["TeamMemberOut"] = []

    class Config:
        from_attributes = True


TeamMemberOut.model_rebuild()


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class LoginRequest(BaseModel):
    username: str
    password: str


# ─── Mango Category ──────────────────────────────────────────────────────────

class MangoCategoryCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100, description="Category name e.g. Alphanso, Kesar")
    category_number: int = Field(..., ge=1, description="Quality grade number e.g. 1, 2, 3")
    description: Optional[str] = Field(None, max_length=255, description="Optional quality note")


class MangoCategoryOut(BaseModel):
    id: int
    name: str
    category_number: int
    description: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


# ─── Box Type ────────────────────────────────────────────────────────────────

class BoxTypeCreate(BaseModel):
    brand_name: str = Field(..., min_length=1, max_length=100)
    size: MangoSize
    box_weight: BoxWeight


class BoxTypeOut(BaseModel):
    id: int
    brand_name: str
    size: MangoSize
    box_weight: BoxWeight
    created_at: datetime

    class Config:
        from_attributes = True


# ─── Purchase ────────────────────────────────────────────────────────────────

class PurchaseItemCreate(BaseModel):
    item_type: ItemType
    # Mango
    mango_category_id: Optional[int] = None
    size: Optional[MangoSize] = None
    # Empty box
    box_type_id: Optional[int] = None
    quantity: int = Field(..., gt=0)
    price_per_unit: float = Field(..., gt=0)


class PurchaseItemOut(BaseModel):
    id: int
    purchase_id: int
    item_type: ItemType
    mango_category_id: Optional[int]
    size: Optional[MangoSize]
    box_type_id: Optional[int]
    quantity: int
    price_per_unit: float
    created_at: datetime

    class Config:
        from_attributes = True


class PurchaseCreate(BaseModel):
    city_name: str
    company_name: str
    vehicle_number: str
    unload_employee: str
    purchase_datetime: datetime
    items: List[PurchaseItemCreate] = Field(..., min_length=1)


class PurchaseOut(BaseModel):
    id: int
    city_name: str
    company_name: str
    vehicle_number: str
    unload_employee: str
    purchase_datetime: datetime
    created_by: int
    created_at: datetime
    items: List[PurchaseItemOut] = []

    class Config:
        from_attributes = True


# ─── Sales ───────────────────────────────────────────────────────────────────

class SaleCreate(BaseModel):
    # Mango (optional — box-only sale allowed)
    mango_category_id: Optional[int] = None
    size: Optional[MangoSize] = None
    quantity: Optional[int] = Field(None, gt=0)
    price_per_box: Optional[float] = Field(None, gt=0)
    # Box (optional — mango-only sale allowed)
    box_type_id: Optional[int] = None
    box_quantity: Optional[int] = Field(None, gt=0)
    box_price_per_unit: Optional[float] = Field(None, gt=0)
    customer_name: Optional[str] = None
    customer_village: Optional[str] = None
    customer_phone: Optional[str] = None
    transport_type: Optional[str] = None
    vehicle_number: str
    city: str
    dispatch_time: datetime
    expected_delivery_time: datetime
    due_date: Optional[datetime] = None


class SaleOut(BaseModel):
    id: int
    employee_id: int
    employee_username: Optional[str] = None
    mango_category_id: Optional[int] = None
    size: Optional[MangoSize] = None
    quantity: Optional[int] = None
    price_per_box: Optional[float] = None
    box_type_id: Optional[int] = None
    box_quantity: Optional[int] = None
    box_price_per_unit: Optional[float] = None
    customer_name: Optional[str] = None
    customer_village: Optional[str] = None
    customer_phone: Optional[str] = None
    transport_type: Optional[str] = None
    vehicle_number: str
    city: str
    dispatch_time: datetime
    expected_delivery_time: datetime
    total_amount: float
    created_at: datetime

    class Config:
        from_attributes = True


# ─── Payment ─────────────────────────────────────────────────────────────────

class PaymentCreate(BaseModel):
    sale_id: int
    due_date: datetime
    paid_amount: float = Field(default=0.0, ge=0)


class PaymentUpdate(BaseModel):
    add_amount: float = Field(..., gt=0, description="Amount being paid now (added to existing)")
    due_date: Optional[datetime] = None


class PaymentOut(BaseModel):
    id: int
    sale_id: int
    total_amount: float
    paid_amount: float
    remaining_amount: float
    due_date: datetime
    status: PaymentStatus
    created_at: datetime

    class Config:
        from_attributes = True


# ─── Reminder ────────────────────────────────────────────────────────────────

class ReminderOut(BaseModel):
    id: int
    payment_id: int
    reminder_date: datetime
    is_done: bool
    created_at: datetime

    class Config:
        from_attributes = True


# ─── Purchase Payment ────────────────────────────────────────────────────────

class PurchasePaymentCreate(BaseModel):
    purchase_id: int
    total_amount: float = Field(..., gt=0)
    paid_amount: float = Field(default=0.0, ge=0)
    notes: Optional[str] = None


class PurchasePaymentTransactionCreate(BaseModel):
    amount: float = Field(..., gt=0)
    notes: Optional[str] = None
    paid_at: datetime


class PurchasePaymentTransactionOut(BaseModel):
    id: int
    purchase_payment_id: int
    amount: float
    notes: Optional[str]
    paid_at: datetime
    created_at: datetime

    class Config:
        from_attributes = True


class PurchasePaymentOut(BaseModel):
    id: int
    purchase_id: int
    total_amount: float
    paid_amount: float
    remaining_amount: float
    status: PaymentStatus
    notes: Optional[str]
    created_at: datetime
    transactions: List[PurchasePaymentTransactionOut] = []

    class Config:
        from_attributes = True


# ─── Truck Payment ────────────────────────────────────────────────────────────

class TruckPaymentCreate(BaseModel):
    vehicle_number: str
    driver_name: Optional[str] = None
    driver_phone: Optional[str] = None
    destination: str
    boxes_count: Optional[int] = None
    total_freight: float = Field(..., gt=0)
    paid_amount: float = Field(default=0.0, ge=0)
    departure_time: Optional[datetime] = None
    arrival_time: Optional[datetime] = None
    notes: Optional[str] = None


class TruckPaymentTransactionCreate(BaseModel):
    amount: float = Field(..., gt=0)
    notes: Optional[str] = None
    paid_at: datetime


class TruckPaymentTransactionOut(BaseModel):
    id: int
    truck_payment_id: int
    amount: float
    notes: Optional[str]
    paid_at: datetime
    created_at: datetime

    class Config:
        from_attributes = True


class TruckPaymentOut(BaseModel):
    id: int
    vehicle_number: str
    driver_name: Optional[str]
    driver_phone: Optional[str] = None
    destination: str
    boxes_count: Optional[int]
    total_freight: float
    paid_amount: float
    remaining_amount: float
    departure_time: Optional[datetime]
    arrival_time: Optional[datetime]
    status: PaymentStatus
    notes: Optional[str]
    created_by: int
    created_at: datetime
    transactions: List[TruckPaymentTransactionOut] = []

    class Config:
        from_attributes = True


# ─── Party Summary ────────────────────────────────────────────────────────────

class PartySummary(BaseModel):
    company_name: str
    city_name: str
    total_purchases: int
    total_items_bought: int
    total_amount_owed: float
    total_paid: float
    total_remaining: float


# ─── Stock ───────────────────────────────────────────────────────────────────

class MangoStockItem(BaseModel):
    mango_category_id: int
    mango_category_name: str
    category_number: int
    size: MangoSize
    purchased: int
    sold: int
    available: int


class BoxStockItem(BaseModel):
    box_type_id: int
    brand_name: str
    size: MangoSize
    box_weight: BoxWeight
    purchased: int
    sold: int = 0
    available: int


class StockResponse(BaseModel):
    mango: List[MangoStockItem]
    empty_boxes: List[BoxStockItem]
