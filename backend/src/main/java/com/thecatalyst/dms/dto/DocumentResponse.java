package com.thecatalyst.dms.dto;

import java.time.Instant;
import com.thecatalyst.dms.entity.DocumentTag;
import java.util.UUID;

// storedFileName / ivBase64 are intentionally excluded from this response -
// they are internal implementation details and never need to leave the server.
public record DocumentResponse(
        UUID id,
        UUID caseId,
        String originalFileName,
        String contentType,
        long fileSizeBytes,
        String sha256Hash,
        UUID uploadedBy,
        Instant uploadedAt,
        int version,
        UUID documentGroupId,
        DocumentTag tag
) {}
