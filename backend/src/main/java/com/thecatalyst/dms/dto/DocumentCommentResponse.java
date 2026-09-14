package com.thecatalyst.dms.dto;

import java.util.UUID;
import java.time.Instant;

public record DocumentCommentResponse(
    UUID id,
    UUID documentId,
    UUID authorId,
    String authorName,
    String body,
    Instant createdAt
) {}
