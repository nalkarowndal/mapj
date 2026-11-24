-- ============================================================================
-- 동북미식 (DONGBUK TABLE) PostgreSQL 16 정규화 스키마 DDL
-- SQLAlchemy 2.0 Base.metadata -> postgresql.dialect() 자동 컴파일 산출물
-- 총 테이블 수: 20개
-- ============================================================================

CREATE TABLE admins (
	id VARCHAR(60) NOT NULL, 
	email VARCHAR(150) NOT NULL, 
	name VARCHAR(80) NOT NULL, 
	password_hash VARCHAR(255) NOT NULL, 
	role VARCHAR(30) NOT NULL, 
	is_active BOOLEAN NOT NULL, 
	last_login_at TIMESTAMP WITH TIME ZONE, 
	created_at TIMESTAMP WITH TIME ZONE NOT NULL, 
	PRIMARY KEY (id)
);
CREATE UNIQUE INDEX ix_admins_email ON admins (email);

CREATE TABLE categories (
	id VARCHAR(40) NOT NULL, 
	slug VARCHAR(40) NOT NULL, 
	name VARCHAR(60) NOT NULL, 
	display_order INTEGER NOT NULL, 
	PRIMARY KEY (id)
);
CREATE UNIQUE INDEX ix_categories_slug ON categories (slug);

CREATE TABLE collections (
	id VARCHAR(60) NOT NULL, 
	slug VARCHAR(80) NOT NULL, 
	title VARCHAR(150) NOT NULL, 
	subtitle VARCHAR(250) NOT NULL, 
	description TEXT NOT NULL, 
	hero_image_url VARCHAR(500) NOT NULL, 
	is_featured BOOLEAN NOT NULL, 
	display_order INTEGER NOT NULL, 
	PRIMARY KEY (id)
);
CREATE UNIQUE INDEX ix_collections_slug ON collections (slug);

CREATE TABLE data_sources (
	id VARCHAR(60) NOT NULL, 
	name VARCHAR(120) NOT NULL, 
	source_type VARCHAR(40) NOT NULL, 
	url VARCHAR(500), 
	license_note VARCHAR(300), 
	created_at TIMESTAMP WITH TIME ZONE NOT NULL, 
	PRIMARY KEY (id), 
	UNIQUE (name)
);

CREATE TABLE features (
	id VARCHAR(40) NOT NULL, 
	slug VARCHAR(40) NOT NULL, 
	name VARCHAR(60) NOT NULL, 
	feature_group VARCHAR(30) NOT NULL, 
	PRIMARY KEY (id)
);
CREATE UNIQUE INDEX ix_features_slug ON features (slug);

CREATE TABLE regions (
	id VARCHAR(40) NOT NULL, 
	slug VARCHAR(40) NOT NULL, 
	name VARCHAR(40) NOT NULL, 
	english_name VARCHAR(60) NOT NULL, 
	tagline VARCHAR(200) NOT NULL, 
	summary TEXT NOT NULL, 
	description TEXT NOT NULL, 
	editorial_story TEXT NOT NULL, 
	hero_image_url VARCHAR(500) NOT NULL, 
	hero_image_credit VARCHAR(300), 
	center_lat FLOAT NOT NULL, 
	center_lng FLOAT NOT NULL, 
	display_order INTEGER NOT NULL, 
	PRIMARY KEY (id)
);
CREATE UNIQUE INDEX ix_regions_slug ON regions (slug);

CREATE TABLE users (
	id VARCHAR(60) NOT NULL, 
	email VARCHAR(150) NOT NULL, 
	display_name VARCHAR(80) NOT NULL, 
	created_at TIMESTAMP WITH TIME ZONE NOT NULL, 
	PRIMARY KEY (id)
);
CREATE UNIQUE INDEX ix_users_email ON users (email);

CREATE TABLE admin_sessions (
	token_hash VARCHAR(128) NOT NULL, 
	admin_id VARCHAR(60) NOT NULL, 
	ip_address VARCHAR(64), 
	user_agent VARCHAR(300), 
	expires_at TIMESTAMP WITH TIME ZONE NOT NULL, 
	revoked_at TIMESTAMP WITH TIME ZONE, 
	created_at TIMESTAMP WITH TIME ZONE NOT NULL, 
	PRIMARY KEY (token_hash), 
	FOREIGN KEY(admin_id) REFERENCES admins (id) ON DELETE CASCADE
);
CREATE INDEX ix_admin_sessions_admin_id ON admin_sessions (admin_id);

CREATE TABLE audit_logs (
	id VARCHAR(60) NOT NULL, 
	admin_id VARCHAR(60), 
	admin_email VARCHAR(150), 
	action VARCHAR(80) NOT NULL, 
	target_type VARCHAR(60) NOT NULL, 
	target_id VARCHAR(80), 
	detail_json JSON, 
	ip_address VARCHAR(64), 
	created_at TIMESTAMP WITH TIME ZONE NOT NULL, 
	PRIMARY KEY (id), 
	FOREIGN KEY(admin_id) REFERENCES admins (id) ON DELETE SET NULL
);
CREATE INDEX ix_audit_logs_action ON audit_logs (action);
CREATE INDEX ix_audit_logs_admin_id ON audit_logs (admin_id);

CREATE TABLE neighborhoods (
	id VARCHAR(60) NOT NULL, 
	region_id VARCHAR(40) NOT NULL, 
	slug VARCHAR(80) NOT NULL, 
	name VARCHAR(80) NOT NULL, 
	summary TEXT NOT NULL, 
	keywords_json JSON, 
	hero_image_url VARCHAR(500), 
	display_order INTEGER NOT NULL, 
	PRIMARY KEY (id), 
	FOREIGN KEY(region_id) REFERENCES regions (id) ON DELETE CASCADE
);
CREATE INDEX ix_neighborhoods_region_id ON neighborhoods (region_id);
CREATE UNIQUE INDEX ix_neighborhoods_slug ON neighborhoods (slug);

CREATE TABLE restaurants (
	id VARCHAR(60) NOT NULL, 
	slug VARCHAR(160) NOT NULL, 
	name VARCHAR(150) NOT NULL, 
	region_id VARCHAR(40) NOT NULL, 
	neighborhood_id VARCHAR(60), 
	neighborhood_label VARCHAR(100) NOT NULL, 
	road_address VARCHAR(300) NOT NULL, 
	jibun_address VARCHAR(300), 
	lat FLOAT NOT NULL, 
	lng FLOAT NOT NULL, 
	phone VARCHAR(50), 
	one_line_intro VARCHAR(300) NOT NULL, 
	description TEXT NOT NULL, 
	editor_note TEXT, 
	highlights_json JSON, 
	price_min INTEGER, 
	price_max INTEGER, 
	price_range_label VARCHAR(80), 
	parking_info VARCHAR(200), 
	opening_hours_note VARCHAR(300), 
	business_status VARCHAR(30) NOT NULL, 
	verification_status VARCHAR(30) NOT NULL, 
	publish_status VARCHAR(20) NOT NULL, 
	is_editor_pick BOOLEAN NOT NULL, 
	verified_at VARCHAR(30), 
	source_id VARCHAR(60), 
	data_source_label VARCHAR(150) NOT NULL, 
	kakao_place_id VARCHAR(80), 
	kakao_url VARCHAR(500), 
	created_at TIMESTAMP WITH TIME ZONE NOT NULL, 
	updated_at TIMESTAMP WITH TIME ZONE NOT NULL, 
	PRIMARY KEY (id), 
	CONSTRAINT uq_restaurant_name_road_address UNIQUE (name, road_address), 
	FOREIGN KEY(region_id) REFERENCES regions (id) ON DELETE RESTRICT, 
	FOREIGN KEY(neighborhood_id) REFERENCES neighborhoods (id) ON DELETE SET NULL, 
	FOREIGN KEY(source_id) REFERENCES data_sources (id) ON DELETE SET NULL
);
CREATE INDEX ix_restaurant_region_publish_status ON restaurants (region_id, publish_status, business_status);
CREATE INDEX ix_restaurants_kakao_place_id ON restaurants (kakao_place_id);
CREATE INDEX ix_restaurants_name ON restaurants (name);
CREATE INDEX ix_restaurants_region_id ON restaurants (region_id);
CREATE UNIQUE INDEX ix_restaurants_slug ON restaurants (slug);

CREATE TABLE bookmarks (
	id VARCHAR(60) NOT NULL, 
	user_id VARCHAR(60) NOT NULL, 
	restaurant_id VARCHAR(60) NOT NULL, 
	created_at TIMESTAMP WITH TIME ZONE NOT NULL, 
	PRIMARY KEY (id), 
	CONSTRAINT uq_user_restaurant_bookmark UNIQUE (user_id, restaurant_id), 
	FOREIGN KEY(user_id) REFERENCES users (id) ON DELETE CASCADE, 
	FOREIGN KEY(restaurant_id) REFERENCES restaurants (id) ON DELETE CASCADE
);
CREATE INDEX ix_bookmarks_restaurant_id ON bookmarks (restaurant_id);
CREATE INDEX ix_bookmarks_user_id ON bookmarks (user_id);

CREATE TABLE collection_restaurants (
	collection_id VARCHAR(60) NOT NULL, 
	restaurant_id VARCHAR(60) NOT NULL, 
	display_order INTEGER NOT NULL, 
	PRIMARY KEY (collection_id, restaurant_id), 
	FOREIGN KEY(collection_id) REFERENCES collections (id) ON DELETE CASCADE, 
	FOREIGN KEY(restaurant_id) REFERENCES restaurants (id) ON DELETE CASCADE
);

CREATE TABLE feedback_reports (
	id VARCHAR(60) NOT NULL, 
	restaurant_id VARCHAR(60), 
	restaurant_name VARCHAR(150), 
	report_type VARCHAR(40) NOT NULL, 
	content TEXT NOT NULL, 
	reporter_contact VARCHAR(150), 
	status VARCHAR(30) NOT NULL, 
	admin_note TEXT, 
	handled_by_admin_id VARCHAR(60), 
	created_at TIMESTAMP WITH TIME ZONE NOT NULL, 
	updated_at TIMESTAMP WITH TIME ZONE NOT NULL, 
	PRIMARY KEY (id), 
	FOREIGN KEY(restaurant_id) REFERENCES restaurants (id) ON DELETE SET NULL, 
	FOREIGN KEY(handled_by_admin_id) REFERENCES admins (id) ON DELETE SET NULL
);
CREATE INDEX ix_feedback_reports_restaurant_id ON feedback_reports (restaurant_id);

CREATE TABLE menus (
	id VARCHAR(60) NOT NULL, 
	restaurant_id VARCHAR(60) NOT NULL, 
	name VARCHAR(120) NOT NULL, 
	price INTEGER, 
	price_label VARCHAR(80) NOT NULL, 
	is_signature BOOLEAN NOT NULL, 
	description TEXT, 
	image_url VARCHAR(500), 
	display_order INTEGER NOT NULL, 
	PRIMARY KEY (id), 
	FOREIGN KEY(restaurant_id) REFERENCES restaurants (id) ON DELETE CASCADE
);
CREATE INDEX ix_menus_restaurant_id ON menus (restaurant_id);

CREATE TABLE opening_hours (
	id VARCHAR(60) NOT NULL, 
	restaurant_id VARCHAR(60) NOT NULL, 
	day_of_week INTEGER NOT NULL, 
	open_time VARCHAR(10), 
	close_time VARCHAR(10), 
	break_start VARCHAR(10), 
	break_end VARCHAR(10), 
	last_order VARCHAR(10), 
	is_closed BOOLEAN NOT NULL, 
	raw_note VARCHAR(200), 
	PRIMARY KEY (id), 
	FOREIGN KEY(restaurant_id) REFERENCES restaurants (id) ON DELETE CASCADE
);
CREATE INDEX ix_opening_hours_restaurant_id ON opening_hours (restaurant_id);

CREATE TABLE restaurant_categories (
	restaurant_id VARCHAR(60) NOT NULL, 
	category_id VARCHAR(40) NOT NULL, 
	is_primary BOOLEAN NOT NULL, 
	PRIMARY KEY (restaurant_id, category_id), 
	FOREIGN KEY(restaurant_id) REFERENCES restaurants (id) ON DELETE CASCADE, 
	FOREIGN KEY(category_id) REFERENCES categories (id) ON DELETE CASCADE
);

CREATE TABLE restaurant_features (
	restaurant_id VARCHAR(60) NOT NULL, 
	feature_id VARCHAR(40) NOT NULL, 
	status VARCHAR(20) NOT NULL, 
	PRIMARY KEY (restaurant_id, feature_id), 
	FOREIGN KEY(restaurant_id) REFERENCES restaurants (id) ON DELETE CASCADE, 
	FOREIGN KEY(feature_id) REFERENCES features (id) ON DELETE CASCADE
);

CREATE TABLE restaurant_images (
	id VARCHAR(60) NOT NULL, 
	restaurant_id VARCHAR(60) NOT NULL, 
	url VARCHAR(500) NOT NULL, 
	image_type VARCHAR(30) NOT NULL, 
	alt_text VARCHAR(200) NOT NULL, 
	is_primary BOOLEAN NOT NULL, 
	source_name VARCHAR(150) NOT NULL, 
	author VARCHAR(120), 
	license_type VARCHAR(120) NOT NULL, 
	verified_at VARCHAR(30), 
	is_ai_generated BOOLEAN NOT NULL, 
	display_order INTEGER NOT NULL, 
	created_at TIMESTAMP WITH TIME ZONE NOT NULL, 
	PRIMARY KEY (id), 
	FOREIGN KEY(restaurant_id) REFERENCES restaurants (id) ON DELETE CASCADE
);
CREATE INDEX ix_restaurant_images_restaurant_id ON restaurant_images (restaurant_id);

CREATE TABLE verification_logs (
	id VARCHAR(60) NOT NULL, 
	restaurant_id VARCHAR(60) NOT NULL, 
	admin_id VARCHAR(60), 
	method VARCHAR(60) NOT NULL, 
	previous_status VARCHAR(30), 
	new_status VARCHAR(30) NOT NULL, 
	notes TEXT, 
	evidence_json JSON, 
	verified_at TIMESTAMP WITH TIME ZONE NOT NULL, 
	PRIMARY KEY (id), 
	FOREIGN KEY(restaurant_id) REFERENCES restaurants (id) ON DELETE CASCADE, 
	FOREIGN KEY(admin_id) REFERENCES admins (id) ON DELETE SET NULL
);
CREATE INDEX ix_verification_logs_restaurant_id ON verification_logs (restaurant_id);
