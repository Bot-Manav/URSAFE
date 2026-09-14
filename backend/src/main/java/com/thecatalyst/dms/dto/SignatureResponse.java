package com.thecatalyst.dms.dto;

import java.time.Instant;
import java.util.UUID;

public record SignatureResponse(
        UUID id,
        UUID documentId,
        UUID signedByUserId,
        String signedByUserEmail,
        String signedByUserFullName,
        Instant signedAt,
        String algorithm,
        boolean isValid
) {}
