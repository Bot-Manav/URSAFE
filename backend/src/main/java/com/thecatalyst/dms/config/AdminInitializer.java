package com.thecatalyst.dms.config;

import com.thecatalyst.dms.entity.Role;
import com.thecatalyst.dms.entity.User;
import com.thecatalyst.dms.repository.UserRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * Initializes the default admin user from environment variables
 * to ensure at least one admin exists in production without relying
 * on a hardcoded seeder.
 */
@Component
public class AdminInitializer implements CommandLineRunner {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Value("${app.admin.email}")
    private String adminEmail;

    @Value("${app.admin.password}")
    private String adminPassword;

    @Value("${app.admin.fullname}")
    private String adminFullname;

    public AdminInitializer(UserRepository userRepository, PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    @Transactional
    public void run(String... args) {
        if (adminEmail == null || adminEmail.isBlank() || adminPassword == null || adminPassword.isBlank()) {
            System.out.println("Admin initialization skipped: ADMIN_EMAIL or ADMIN_PASSWORD not provided.");
            return;
        }

        String email = adminEmail.toLowerCase().trim();

        if (userRepository.existsByEmail(email)) {
            System.out.println("Admin initialization skipped: User with email " + email + " already exists.");
            return;
        }

        User admin = User.builder()
                .email(email)
                .fullName(adminFullname.trim())
                .passwordHash(passwordEncoder.encode(adminPassword))
                .role(Role.ADMIN)
                .enabled(true)
                .build();

        userRepository.save(admin);
        System.out.println("==========================================================");
        System.out.println("ADMIN ACCOUNT CREATED");
        System.out.println("Email: " + email);
        System.out.println("==========================================================");
    }
}
