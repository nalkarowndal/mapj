"""
동북미식 (DONGBUK TABLE) 정규화 데이터베이스 ORM 모델 (SQLAlchemy 2.0)
- PostgreSQL 1순위 호환 (UUID/String PK, JSON, Timezone-aware DateTime, 복합 UNIQUE/INDEX)
- 로컬 개발 시 SQLite 투명 호환
- 총 20개 테이블: 핵심 도메인 19개 테이블 + 서버 세션 관리(admin_sessions)
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, List, Optional

from sqlalchemy import (
    Boolean,
    DateTime,
    Float,
    ForeignKey,
    Index,
    Integer,
    JSON,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from db.database import Base


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


# 1. regions
class Region(Base):
    __tablename__ = "regions"

    id: Mapped[str] = mapped_column(String(40), primary_key=True)
    slug: Mapped[str] = mapped_column(String(40), unique=True, nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(40), nullable=False)
    english_name: Mapped[str] = mapped_column(String(60), nullable=False)
    tagline: Mapped[str] = mapped_column(String(200), nullable=False, default="")
    summary: Mapped[str] = mapped_column(Text, nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    editorial_story: Mapped[str] = mapped_column(Text, nullable=False, default="")
    hero_image_url: Mapped[str] = mapped_column(String(500), nullable=False)
    hero_image_credit: Mapped[Optional[str]] = mapped_column(String(300), nullable=True)
    center_lat: Mapped[float] = mapped_column(Float, nullable=False)
    center_lng: Mapped[float] = mapped_column(Float, nullable=False)
    display_order: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    neighborhoods: Mapped[List["Neighborhood"]] = relationship(
        back_populates="region", cascade="all, delete-orphan"
    )
    restaurants: Mapped[List["Restaurant"]] = relationship(back_populates="region")


# 2. neighborhoods
class Neighborhood(Base):
    __tablename__ = "neighborhoods"

    id: Mapped[str] = mapped_column(String(60), primary_key=True)
    region_id: Mapped[str] = mapped_column(
        String(40), ForeignKey("regions.id", ondelete="CASCADE"), nullable=False, index=True
    )
    slug: Mapped[str] = mapped_column(String(80), unique=True, nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(80), nullable=False)
    summary: Mapped[str] = mapped_column(Text, nullable=False, default="")
    keywords_json: Mapped[Optional[List[str]]] = mapped_column(JSON, nullable=True)
    hero_image_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    display_order: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    region: Mapped["Region"] = relationship(back_populates="neighborhoods")
    restaurants: Mapped[List["Restaurant"]] = relationship(back_populates="neighborhood_obj")


# 3. data_sources
class DataSource(Base):
    __tablename__ = "data_sources"

    id: Mapped[str] = mapped_column(String(60), primary_key=True)
    name: Mapped[str] = mapped_column(String(120), unique=True, nullable=False)
    source_type: Mapped[str] = mapped_column(String(40), nullable=False, default="api")
    url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    license_note: Mapped[Optional[str]] = mapped_column(String(300), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)


# 4. restaurants
class Restaurant(Base):
    __tablename__ = "restaurants"
    __table_args__ = (
        UniqueConstraint("name", "road_address", name="uq_restaurant_name_road_address"),
        Index("ix_restaurant_region_publish_status", "region_id", "publish_status", "business_status"),
    )

    id: Mapped[str] = mapped_column(String(60), primary_key=True)
    slug: Mapped[str] = mapped_column(String(160), unique=True, nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(150), nullable=False, index=True)
    region_id: Mapped[str] = mapped_column(
        String(40), ForeignKey("regions.id", ondelete="RESTRICT"), nullable=False, index=True
    )
    neighborhood_id: Mapped[Optional[str]] = mapped_column(
        String(60), ForeignKey("neighborhoods.id", ondelete="SET NULL"), nullable=True
    )
    neighborhood_label: Mapped[str] = mapped_column(String(100), nullable=False, default="")
    road_address: Mapped[str] = mapped_column(String(300), nullable=False)
    jibun_address: Mapped[Optional[str]] = mapped_column(String(300), nullable=True)
    lat: Mapped[float] = mapped_column(Float, nullable=False)
    lng: Mapped[float] = mapped_column(Float, nullable=False)
    phone: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    one_line_intro: Mapped[str] = mapped_column(String(300), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False, default="")
    editor_note: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    highlights_json: Mapped[Optional[List[str]]] = mapped_column(JSON, nullable=True)
    price_min: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    price_max: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    price_range_label: Mapped[Optional[str]] = mapped_column(String(80), nullable=True)
    parking_info: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    opening_hours_note: Mapped[Optional[str]] = mapped_column(String(300), nullable=True)

    # Status & trust fields
    business_status: Mapped[str] = mapped_column(
        String(30), nullable=False, default="open"
    )  # open | temporarily_closed | closed | needs_check
    verification_status: Mapped[str] = mapped_column(
        String(30), nullable=False, default="needs_verification"
    )  # verified | needs_verification | reference
    publish_status: Mapped[str] = mapped_column(
        String(20), nullable=False, default="published"
    )  # published | draft | hidden
    is_editor_pick: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    verified_at: Mapped[Optional[str]] = mapped_column(String(30), nullable=True)
    source_id: Mapped[Optional[str]] = mapped_column(
        String(60), ForeignKey("data_sources.id", ondelete="SET NULL"), nullable=True
    )
    data_source_label: Mapped[str] = mapped_column(
        String(150), nullable=False, default="카카오 로컬 공식 정보 교차 검증"
    )
    kakao_place_id: Mapped[Optional[str]] = mapped_column(String(80), nullable=True, index=True)
    kakao_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now, onupdate=utc_now
    )

    region: Mapped["Region"] = relationship(back_populates="restaurants")
    neighborhood_obj: Mapped[Optional["Neighborhood"]] = relationship(back_populates="restaurants")
    source: Mapped[Optional["DataSource"]] = relationship()
    category_links: Mapped[List["RestaurantCategory"]] = relationship(
        back_populates="restaurant", cascade="all, delete-orphan"
    )
    menus: Mapped[List["Menu"]] = relationship(
        back_populates="restaurant", cascade="all, delete-orphan", order_by="Menu.display_order"
    )
    images: Mapped[List["RestaurantImage"]] = relationship(
        back_populates="restaurant", cascade="all, delete-orphan"
    )
    opening_hours: Mapped[List["OpeningHour"]] = relationship(
        back_populates="restaurant", cascade="all, delete-orphan"
    )
    feature_links: Mapped[List["RestaurantFeature"]] = relationship(
        back_populates="restaurant", cascade="all, delete-orphan"
    )
    verification_logs: Mapped[List["VerificationLog"]] = relationship(
        back_populates="restaurant", cascade="all, delete-orphan"
    )


# 5. categories
class Category(Base):
    __tablename__ = "categories"

    id: Mapped[str] = mapped_column(String(40), primary_key=True)
    slug: Mapped[str] = mapped_column(String(40), unique=True, nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(60), nullable=False)
    display_order: Mapped[int] = mapped_column(Integer, nullable=False, default=0)


# 6. restaurant_categories
class RestaurantCategory(Base):
    __tablename__ = "restaurant_categories"

    restaurant_id: Mapped[str] = mapped_column(
        String(60), ForeignKey("restaurants.id", ondelete="CASCADE"), primary_key=True
    )
    category_id: Mapped[str] = mapped_column(
        String(40), ForeignKey("categories.id", ondelete="CASCADE"), primary_key=True
    )
    is_primary: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)

    restaurant: Mapped["Restaurant"] = relationship(back_populates="category_links")
    category: Mapped["Category"] = relationship()


# 7. menus
class Menu(Base):
    __tablename__ = "menus"

    id: Mapped[str] = mapped_column(String(60), primary_key=True)
    restaurant_id: Mapped[str] = mapped_column(
        String(60), ForeignKey("restaurants.id", ondelete="CASCADE"), nullable=False, index=True
    )
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    price: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    price_label: Mapped[str] = mapped_column(String(80), nullable=False, default="매장 가격 확인 필요")
    is_signature: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    image_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    display_order: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    restaurant: Mapped["Restaurant"] = relationship(back_populates="menus")


# 8. restaurant_images
class RestaurantImage(Base):
    __tablename__ = "restaurant_images"

    id: Mapped[str] = mapped_column(String(60), primary_key=True)
    restaurant_id: Mapped[str] = mapped_column(
        String(60), ForeignKey("restaurants.id", ondelete="CASCADE"), nullable=False, index=True
    )
    url: Mapped[str] = mapped_column(String(500), nullable=False)
    image_type: Mapped[str] = mapped_column(
        String(30), nullable=False, default="food"
    )  # food | interior | exterior | menu | placeholder
    alt_text: Mapped[str] = mapped_column(String(200), nullable=False)
    is_primary: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    source_name: Mapped[str] = mapped_column(String(150), nullable=False)
    author: Mapped[Optional[str]] = mapped_column(String(120), nullable=True)
    license_type: Mapped[str] = mapped_column(String(120), nullable=False, default="직접 촬영 / 허가 사용")
    verified_at: Mapped[Optional[str]] = mapped_column(String(30), nullable=True)
    is_ai_generated: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    display_order: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)

    restaurant: Mapped["Restaurant"] = relationship(back_populates="images")


# 9. opening_hours
class OpeningHour(Base):
    __tablename__ = "opening_hours"

    id: Mapped[str] = mapped_column(String(60), primary_key=True)
    restaurant_id: Mapped[str] = mapped_column(
        String(60), ForeignKey("restaurants.id", ondelete="CASCADE"), nullable=False, index=True
    )
    day_of_week: Mapped[int] = mapped_column(Integer, nullable=False)  # 0=Mon..6=Sun
    open_time: Mapped[Optional[str]] = mapped_column(String(10), nullable=True)
    close_time: Mapped[Optional[str]] = mapped_column(String(10), nullable=True)
    break_start: Mapped[Optional[str]] = mapped_column(String(10), nullable=True)
    break_end: Mapped[Optional[str]] = mapped_column(String(10), nullable=True)
    last_order: Mapped[Optional[str]] = mapped_column(String(10), nullable=True)
    is_closed: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    raw_note: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)

    restaurant: Mapped["Restaurant"] = relationship(back_populates="opening_hours")


# 10. features
class Feature(Base):
    __tablename__ = "features"

    id: Mapped[str] = mapped_column(String(40), primary_key=True)
    slug: Mapped[str] = mapped_column(String(40), unique=True, nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(60), nullable=False)
    feature_group: Mapped[str] = mapped_column(String(30), nullable=False, default="purpose")


# 11. restaurant_features
class RestaurantFeature(Base):
    __tablename__ = "restaurant_features"

    restaurant_id: Mapped[str] = mapped_column(
        String(60), ForeignKey("restaurants.id", ondelete="CASCADE"), primary_key=True
    )
    feature_id: Mapped[str] = mapped_column(
        String(40), ForeignKey("features.id", ondelete="CASCADE"), primary_key=True
    )
    status: Mapped[str] = mapped_column(
        String(20), nullable=False, default="confirmed"
    )  # confirmed | unavailable | unknown

    restaurant: Mapped["Restaurant"] = relationship(back_populates="feature_links")
    feature: Mapped["Feature"] = relationship()


# 12. collections
class Collection(Base):
    __tablename__ = "collections"

    id: Mapped[str] = mapped_column(String(60), primary_key=True)
    slug: Mapped[str] = mapped_column(String(80), unique=True, nullable=False, index=True)
    title: Mapped[str] = mapped_column(String(150), nullable=False)
    subtitle: Mapped[str] = mapped_column(String(250), nullable=False, default="")
    description: Mapped[str] = mapped_column(Text, nullable=False, default="")
    hero_image_url: Mapped[str] = mapped_column(String(500), nullable=False)
    is_featured: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    display_order: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    items: Mapped[List["CollectionRestaurant"]] = relationship(
        back_populates="collection", cascade="all, delete-orphan", order_by="CollectionRestaurant.display_order"
    )


# 13. collection_restaurants
class CollectionRestaurant(Base):
    __tablename__ = "collection_restaurants"

    collection_id: Mapped[str] = mapped_column(
        String(60), ForeignKey("collections.id", ondelete="CASCADE"), primary_key=True
    )
    restaurant_id: Mapped[str] = mapped_column(
        String(60), ForeignKey("restaurants.id", ondelete="CASCADE"), primary_key=True
    )
    display_order: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    collection: Mapped["Collection"] = relationship(back_populates="items")
    restaurant: Mapped["Restaurant"] = relationship()


# 14. admins
class Admin(Base):
    __tablename__ = "admins"

    id: Mapped[str] = mapped_column(String(60), primary_key=True)
    email: Mapped[str] = mapped_column(String(150), unique=True, nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(80), nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[str] = mapped_column(String(30), nullable=False, default="superadmin")
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    last_login_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)


# 15. admin_sessions (서버 측 세션 무효화 및 감사 추적용)
class AdminSession(Base):
    __tablename__ = "admin_sessions"

    token_hash: Mapped[str] = mapped_column(String(128), primary_key=True)
    admin_id: Mapped[str] = mapped_column(
        String(60), ForeignKey("admins.id", ondelete="CASCADE"), nullable=False, index=True
    )
    ip_address: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    user_agent: Mapped[Optional[str]] = mapped_column(String(300), nullable=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    revoked_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)

    admin: Mapped["Admin"] = relationship()


# 16. verification_logs
class VerificationLog(Base):
    __tablename__ = "verification_logs"

    id: Mapped[str] = mapped_column(String(60), primary_key=True)
    restaurant_id: Mapped[str] = mapped_column(
        String(60), ForeignKey("restaurants.id", ondelete="CASCADE"), nullable=False, index=True
    )
    admin_id: Mapped[Optional[str]] = mapped_column(
        String(60), ForeignKey("admins.id", ondelete="SET NULL"), nullable=True
    )
    method: Mapped[str] = mapped_column(String(60), nullable=False)  # kakao_local_api | manual_review | user_feedback
    previous_status: Mapped[Optional[str]] = mapped_column(String(30), nullable=True)
    new_status: Mapped[str] = mapped_column(String(30), nullable=False)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    evidence_json: Mapped[Optional[dict[str, Any]]] = mapped_column(JSON, nullable=True)
    verified_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)

    restaurant: Mapped["Restaurant"] = relationship(back_populates="verification_logs")


# 17. feedback_reports
class FeedbackReport(Base):
    __tablename__ = "feedback_reports"

    id: Mapped[str] = mapped_column(String(60), primary_key=True)
    restaurant_id: Mapped[Optional[str]] = mapped_column(
        String(60), ForeignKey("restaurants.id", ondelete="SET NULL"), nullable=True, index=True
    )
    restaurant_name: Mapped[Optional[str]] = mapped_column(String(150), nullable=True)
    report_type: Mapped[str] = mapped_column(String(40), nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    reporter_contact: Mapped[Optional[str]] = mapped_column(String(150), nullable=True)
    status: Mapped[str] = mapped_column(String(30), nullable=False, default="pending")  # pending | resolved | rejected
    admin_note: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    handled_by_admin_id: Mapped[Optional[str]] = mapped_column(
        String(60), ForeignKey("admins.id", ondelete="SET NULL"), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now, onupdate=utc_now
    )


# 18. users (향후 회원 북마크 확장 대비)
class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(60), primary_key=True)
    email: Mapped[str] = mapped_column(String(150), unique=True, nullable=False, index=True)
    display_name: Mapped[str] = mapped_column(String(80), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)


# 19. bookmarks
class Bookmark(Base):
    __tablename__ = "bookmarks"
    __table_args__ = (UniqueConstraint("user_id", "restaurant_id", name="uq_user_restaurant_bookmark"),)

    id: Mapped[str] = mapped_column(String(60), primary_key=True)
    user_id: Mapped[str] = mapped_column(
        String(60), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    restaurant_id: Mapped[str] = mapped_column(
        String(60), ForeignKey("restaurants.id", ondelete="CASCADE"), nullable=False, index=True
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)


# 20. audit_logs
class AuditLog(Base):
    __tablename__ = "audit_logs"

    id: Mapped[str] = mapped_column(String(60), primary_key=True)
    admin_id: Mapped[Optional[str]] = mapped_column(
        String(60), ForeignKey("admins.id", ondelete="SET NULL"), nullable=True, index=True
    )
    admin_email: Mapped[Optional[str]] = mapped_column(String(150), nullable=True)
    action: Mapped[str] = mapped_column(String(80), nullable=False, index=True)
    target_type: Mapped[str] = mapped_column(String(60), nullable=False)
    target_id: Mapped[Optional[str]] = mapped_column(String(80), nullable=True)
    detail_json: Mapped[Optional[dict[str, Any]]] = mapped_column(JSON, nullable=True)
    ip_address: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)

