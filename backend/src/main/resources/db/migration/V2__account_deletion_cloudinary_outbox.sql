CREATE TABLE cloudinary_cleanup_task (
  id BIGSERIAL PRIMARY KEY,
  public_id VARCHAR(255) NOT NULL UNIQUE,
  attempt_count INTEGER NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
  next_attempt_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_cloudinary_cleanup_due
  ON cloudinary_cleanup_task (next_attempt_at, id);
