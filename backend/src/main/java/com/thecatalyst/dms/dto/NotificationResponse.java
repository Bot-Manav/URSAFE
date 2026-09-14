package com.thecatalyst.dms.dto;

import java.util.UUID;
import java.time.Instant;

public record NotificationResponse(
    UUID id,
    String message,
    boolean isRead,
    Instant createdAt
) {}
