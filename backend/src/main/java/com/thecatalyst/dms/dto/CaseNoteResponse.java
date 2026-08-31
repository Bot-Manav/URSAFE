package com.thecatalyst.dms.dto;

import java.time.Instant;
import java.util.UUID;

public record CaseNoteResponse(
    UUID id,
    UUID caseId,
    UUID authorId,
    String authorName,
    String body,
    Instant createdAt
) {}
