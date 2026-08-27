package com.thecatalyst.dms.dto;

import com.thecatalyst.dms.entity.Role;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/**
 * SECURITY NOTE: role is bound explicitly here (not a free-text field and
 * not inferred from client-controlled headers), and AuthService additionally
 * refuses to let a public /register call create an ADMIN account - see
 * AuthService.register(). This prevents privilege-escalation-by-registration
 * (OWASP A01: Broken Access Control / mass assignment).
 */
public record RegisterRequest(

        @NotBlank @Email @Size(max = 255)
        String email,

        @NotBlank @Size(min = 2, max = 100)
        @Pattern(regexp = "^[\\p{L} .'-]+$", message = "Full name contains invalid characters")
        String fullName,

        // Enforced strong-password policy: 12+ chars, upper, lower, digit, symbol.
        @NotBlank
        @Pattern(
            regexp = "^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[^A-Za-z0-9]).{12,128}$",
            message = "Password must be 12+ characters and include upper, lower, digit, and symbol"
        )
        String password,

        @NotNull
        Role role
) {}
