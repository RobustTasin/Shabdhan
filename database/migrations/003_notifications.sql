-- ============================================================
-- NOTIFICATIONS
-- ============================================================

CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    user_id UUID NOT NULL
        REFERENCES users(id)
        ON DELETE CASCADE,

    type VARCHAR(100) NOT NULL,

    title VARCHAR(255) NOT NULL,

    message TEXT NOT NULL,

    entity_type VARCHAR(100),
    entity_id UUID,

    is_read BOOLEAN NOT NULL DEFAULT FALSE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    read_at TIMESTAMPTZ
);

CREATE INDEX idx_notifications_user_id
    ON notifications(user_id);

CREATE INDEX idx_notifications_user_unread
    ON notifications(user_id, is_read);

CREATE INDEX idx_notifications_created_at
    ON notifications(created_at);

CREATE INDEX idx_notifications_entity
    ON notifications(entity_type, entity_id);
