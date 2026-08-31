package com.thecatalyst.dms.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record MfaVerifyRequest(
        @NotBlank(message = "MFA code is required")
        @Size(min = 6, max = 6, message = "MFA code must be exactly 6 digits")
        String code
) {}
