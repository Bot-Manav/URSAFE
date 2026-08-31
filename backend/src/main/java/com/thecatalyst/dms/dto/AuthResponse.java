package com.thecatalyst.dms.dto;

import com.thecatalyst.dms.entity.Role;

import java.util.UUID;

// Never include passwordHash or any secret here - this is what leaves the server.
public record AuthResponse(
        String token,
        UUID userId,
        String email,
        String fullName,
        Role role,
        long expiresInMs,
        boolean mfaRequired
) {}
