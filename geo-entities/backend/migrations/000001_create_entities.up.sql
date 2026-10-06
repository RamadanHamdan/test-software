-- gen_random_uuid() bawaan PostgreSQL 13+, tidak perlu extension.
CREATE TABLE entities (
    id          UUID             PRIMARY KEY DEFAULT gen_random_uuid(),
    name        VARCHAR(100)     NOT NULL CHECK (char_length(btrim(name)) > 0),
    type        TEXT             NOT NULL CHECK (type   IN ('vehicle', 'iot_device', 'facility', 'other')),
    status      TEXT             NOT NULL DEFAULT 'active'
                                 CHECK (status IN ('active', 'inactive', 'maintenance')),
    description TEXT             NOT NULL DEFAULT '' CHECK (char_length(description) <= 500),
    latitude    DOUBLE PRECISION NOT NULL CHECK (latitude  BETWEEN  -90 AND  90),
    longitude   DOUBLE PRECISION NOT NULL CHECK (longitude BETWEEN -180 AND 180),
    created_at  TIMESTAMPTZ      NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ      NOT NULL DEFAULT now()
);

CREATE INDEX idx_entities_type       ON entities (type);
CREATE INDEX idx_entities_status     ON entities (status);
CREATE INDEX idx_entities_created_at ON entities (created_at DESC);
-- Berguna jika nanti ada query bounding-box (viewport map).
CREATE INDEX idx_entities_lat_lng    ON entities (latitude, longitude);
