package com.thecatalyst.dms.dto;

import com.thecatalyst.dms.entity.CaseStatus;
import jakarta.validation.constraints.NotNull;

public record CaseStatusUpdateRequest(
        @NotNull(message = "Status is required")
        CaseStatus status
) {}
