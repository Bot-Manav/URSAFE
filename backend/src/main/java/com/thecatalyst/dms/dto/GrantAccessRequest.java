package com.thecatalyst.dms.dto;

import jakarta.validation.constraints.NotNull;

import java.util.UUID;

public record GrantAccessRequest(
        @NotNull UUID userId
) {}
