-- Migration 001: Initial schema

CREATE TABLE IF NOT EXISTS default_preferences (
    id SERIAL PRIMARY KEY,
    notification_type VARCHAR(50) NOT NULL,
    channel VARCHAR(20) NOT NULL,
    allowed BOOLEAN NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(notification_type, channel)
);

CREATE TABLE IF NOT EXISTS user_preferences (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    notification_type VARCHAR(50) NOT NULL,
    channel VARCHAR(20) NOT NULL,
    allowed BOOLEAN NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, notification_type, channel)
);

CREATE INDEX IF NOT EXISTS idx_user_prefs_user_id ON user_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_user_prefs_lookup ON user_preferences(user_id, notification_type, channel);

CREATE TABLE IF NOT EXISTS quiet_hours (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL UNIQUE,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    timezone VARCHAR(100) NOT NULL,
    enabled BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS global_policies (
    id SERIAL PRIMARY KEY,
    notification_type VARCHAR(50),
    channel VARCHAR(20),
    region VARCHAR(100),
    allowed BOOLEAN NOT NULL,
    reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_global_policies_match ON global_policies(notification_type, channel, region);

-- Seed default preferences: all combinations are allowed by default
INSERT INTO default_preferences (notification_type, channel, allowed) VALUES
    ('marketing', 'email', true),
    ('marketing', 'sms', true),
    ('marketing', 'push', true),
    ('transactional', 'email', true),
    ('transactional', 'sms', true),
    ('transactional', 'push', true),
    ('security', 'email', true),
    ('security', 'sms', true),
    ('security', 'push', true)
ON CONFLICT (notification_type, channel) DO NOTHING;
