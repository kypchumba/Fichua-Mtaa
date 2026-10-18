CREATE TABLE app_user (
  id BIGSERIAL PRIMARY KEY,
  full_name VARCHAR(120) NOT NULL,
  email VARCHAR(254) NOT NULL UNIQUE,
  password_hash VARCHAR(100) NOT NULL,
  role VARCHAR(20) NOT NULL CHECK (role IN ('CITIZEN','ADMIN')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX idx_user_email_lower ON app_user (lower(email));
CREATE TABLE service_request (
  id BIGSERIAL PRIMARY KEY,
  reference_number VARCHAR(24) NOT NULL UNIQUE,
  citizen_id BIGINT NOT NULL REFERENCES app_user(id),
  title VARCHAR(120) NOT NULL,
  description VARCHAR(3000) NOT NULL,
  category VARCHAR(40) NOT NULL CHECK (category IN ('Roads and Drainage','Water Supply','Waste Collection','Street Lighting','Other')),
  location VARCHAR(180) NOT NULL,
  attachment_url VARCHAR(1000),
  status VARCHAR(20) NOT NULL CHECK (status IN ('PENDING','IN_PROGRESS','RESOLVED')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ
);
CREATE INDEX idx_request_citizen_created ON service_request(citizen_id, created_at DESC);
CREATE INDEX idx_request_status_created ON service_request(status, created_at DESC);
CREATE INDEX idx_request_category_created ON service_request(category, created_at DESC);
CREATE TABLE request_history (
  id BIGSERIAL PRIMARY KEY,
  request_id BIGINT NOT NULL REFERENCES service_request(id) ON DELETE CASCADE,
  previous_status VARCHAR(20),
  new_status VARCHAR(20) NOT NULL,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  changed_by BIGINT REFERENCES app_user(id),
  note VARCHAR(1000)
);
CREATE INDEX idx_history_request_changed ON request_history(request_id, changed_at);
CREATE TABLE admin_note (
  id BIGSERIAL PRIMARY KEY,
  request_id BIGINT NOT NULL REFERENCES service_request(id) ON DELETE CASCADE,
  admin_id BIGINT NOT NULL REFERENCES app_user(id),
  body VARCHAR(2000) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
