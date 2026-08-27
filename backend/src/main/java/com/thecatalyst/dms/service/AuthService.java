package com.thecatalyst.dms.service;

import com.thecatalyst.dms.dto.AuthResponse;
import com.thecatalyst.dms.dto.LoginRequest;
import com.thecatalyst.dms.dto.RegisterRequest;
import com.thecatalyst.dms.entity.Role;
import com.thecatalyst.dms.entity.User;
import com.thecatalyst.dms.exception.ApiException;
import com.thecatalyst.dms.repository.UserRepository;
import com.thecatalyst.dms.security.JwtUtil;
import com.thecatalyst.dms.security.LoginAttemptService;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * SECURITY NOTE (OWASP A07 / A01):
 * - Public self-registration can NEVER create an ADMIN account, regardless
 *   of what the client sends in the "role" field - this blocks
 *   privilege-escalation-by-registration. Admin accounts must be created
 *   by an existing admin (see AdminController) or seeded directly.
 * - Login failure messages are identical whether the email doesn't exist,
 *   the password is wrong, or the account is disabled - this prevents
 *   user enumeration (an attacker probing which emails are registered).
 * - Failed attempts are tracked per-account and the account is
 *   temporarily locked after too many failures (LoginAttemptService).
 */
@Service
public class AuthService {

    private static final String GENERIC_LOGIN_ERROR = "Invalid email or password";

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;
    private final LoginAttemptService loginAttemptService;
    private final AuditService auditService;

    public AuthService(UserRepository userRepository,
                        PasswordEncoder passwordEncoder,
                        JwtUtil jwtUtil,
                        LoginAttemptService loginAttemptService,
                        AuditService auditService) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtUtil = jwtUtil;
        this.loginAttemptService = loginAttemptService;
        this.auditService = auditService;
    }

    @Transactional
    public AuthResponse register(RegisterRequest req) {
        if (userRepository.existsByEmail(req.email())) {
            // Generic message - do not reveal that this email is already taken.
            throw new ApiException(HttpStatus.BAD_REQUEST, "Unable to register with the provided details");
        }

        Role requestedRole = req.role();
        if (requestedRole == Role.ADMIN) {
            throw new ApiException(HttpStatus.FORBIDDEN, "Cannot self-register as ADMIN");
        }

        User user = User.builder()
                .email(req.email().toLowerCase().trim())
                .fullName(req.fullName().trim())
                .passwordHash(passwordEncoder.encode(req.password()))
                .role(requestedRole)
                .enabled(true)
                .build();

        user = userRepository.save(user);

        String token = jwtUtil.generateToken(user.getId(), user.getEmail(), user.getRole().name());
        return new AuthResponse(token, user.getId(), user.getEmail(), user.getFullName(),
                user.getRole(), jwtUtil.getExpirationMs());
    }

    @Transactional
    public AuthResponse login(LoginRequest req, String ipAddress) {
        User user = userRepository.findByEmail(req.email().toLowerCase().trim())
                .orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, GENERIC_LOGIN_ERROR));

        if (loginAttemptService.isLocked(user)) {
            auditService.log(user.getId(), "LOGIN_FAIL_LOCKED", null, null, "account locked", ipAddress);
            throw new ApiException(HttpStatus.UNAUTHORIZED, GENERIC_LOGIN_ERROR);
        }

        if (!user.isEnabled() || !passwordEncoder.matches(req.password(), user.getPasswordHash())) {
            loginAttemptService.recordFailure(user);
            auditService.log(user.getId(), "LOGIN_FAIL", null, null, null, ipAddress);
            throw new ApiException(HttpStatus.UNAUTHORIZED, GENERIC_LOGIN_ERROR);
        }

        loginAttemptService.recordSuccess(user);
        auditService.log(user.getId(), "LOGIN_SUCCESS", null, null, null, ipAddress);

        String token = jwtUtil.generateToken(user.getId(), user.getEmail(), user.getRole().name());
        return new AuthResponse(token, user.getId(), user.getEmail(), user.getFullName(),
                user.getRole(), jwtUtil.getExpirationMs());
    }
}
