package com.thecatalyst.dms.security;

import com.thecatalyst.dms.entity.User;
import com.thecatalyst.dms.repository.UserRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.time.temporal.ChronoUnit;

/**
 * SECURITY NOTE (OWASP A07: Identification & Authentication Failures):
 * Tracks failed logins per-account and locks the account for a fixed
 * window after too many failures. This is deliberately account-based
 * (not IP-based) so it works correctly behind NAT/shared IPs; combine
 * with a reverse-proxy rate limiter for IP-based throttling in production.
 */
@Service
public class LoginAttemptService {

    private final UserRepository userRepository;

    @Value("${app.security.max-login-attempts}")
    private int maxAttempts;

    @Value("${app.security.lockout-duration-minutes}")
    private int lockoutMinutes;

    public LoginAttemptService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    public boolean isLocked(User user) {
        return user.getLockedUntil() != null && Instant.now().isBefore(user.getLockedUntil());
    }

    public void recordFailure(User user) {
        user.setFailedLoginAttempts(user.getFailedLoginAttempts() + 1);
        if (user.getFailedLoginAttempts() >= maxAttempts) {
            user.setLockedUntil(Instant.now().plus(lockoutMinutes, ChronoUnit.MINUTES));
        }
        userRepository.save(user);
    }

    public void recordSuccess(User user) {
        user.setFailedLoginAttempts(0);
        user.setLockedUntil(null);
        userRepository.save(user);
    }
}
