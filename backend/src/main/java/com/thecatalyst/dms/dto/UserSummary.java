package com.thecatalyst.dms.dto;

import com.thecatalyst.dms.entity.Role;
import java.util.UUID;

public record UserSummary(
        UUID id,
        String fullName,
        String email,
        Role role
) {}
