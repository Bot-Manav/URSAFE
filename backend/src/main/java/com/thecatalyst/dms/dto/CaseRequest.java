package com.thecatalyst.dms.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record CaseRequest(
        @NotBlank @Size(max = 50)
        @Pattern(regexp = "^[A-Za-z0-9/_-]+$", message = "Case number contains invalid characters")
        String caseNumber,

        @NotBlank @Size(max = 200)
        String title,

        @Size(max = 2000)
        String description
) {}
