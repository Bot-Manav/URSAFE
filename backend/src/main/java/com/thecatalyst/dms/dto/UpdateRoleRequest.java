package com.thecatalyst.dms.dto;

import com.thecatalyst.dms.entity.Role;
import jakarta.validation.constraints.NotNull;

public record UpdateRoleRequest(
        @NotNull(message = "Role is required")
        Role role
) {}
