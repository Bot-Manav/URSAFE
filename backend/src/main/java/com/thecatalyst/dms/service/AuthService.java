package com.thecatalyst.dms.service;

import com.thecatalyst.dms.dto.AuthResponse;
import com.thecatalyst.dms.dto.ForgotPasswordRequest;
import com.thecatalyst.dms.dto.LoginRequest;
import com.thecatalyst.dms.dto.RegisterRequest;
import com.thecatalyst.dms.dto.RegisterResponse;
import com.thecatalyst.dms.dto.ResetPasswordRequest;
import com.thecatalyst.dms.entity.PasswordResetToken;
import com.thecatalyst.dms.entity.Role;
import com.thecatalyst.dms.entity.User;
import com.thecatalyst.dms.exception.ApiException;
import com.thecatalyst.dms.repository.PasswordResetTokenRepository;
import com.thecatalyst.dms.repository.UserRepository;
import com.thecatalyst.dms.security.JwtUtil;
import com.thecatalyst.dms.security.LoginAttemptService;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Optional;
import java.util.UUID;

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
    private final EncryptionService encryptionService;
    private final PasswordResetTokenRepository passwordResetTokenRepository;
    private final HashingService hashingService;
    private final EmailService emailService;
    private final SessionService sessionService;

    public AuthService(UserRepository userRepository,
                        PasswordEncoder passwordEncoder,
                        JwtUtil jwtUtil,
                        LoginAttemptService loginAttemptService,
                        AuditService auditService,
                        EncryptionService encryptionService,
                        PasswordResetTokenRepository passwordResetTokenRepository,
                        HashingService hashingService,
                        EmailService emailService,
                        SessionService sessionService) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtUtil = jwtUtil;
        this.loginAttemptService = loginAttemptService;
        this.auditService = auditService;
        this.encryptionService = encryptionService;
        this.passwordResetTokenRepository = passwordResetTokenRepository;
        this.hashingService = hashingService;
        this.emailService = emailService;
        this.sessionService = sessionService;
    }

    @Transactional
    public RegisterResponse register(RegisterRequest req) {
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
                .enabled(false)
                .build();

        user = userRepository.save(user);
        auditService.log(user.getId(), "USER_REGISTERED", null, null, "pending approval", "internal");

        return new RegisterResponse("Registration successful. Your account is pending administrator approval.");
    }

    @Transactional
    public AuthResponse login(LoginRequest req, String ipAddress, String userAgent) {
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

        if (user.isMfaEnabled()) {
            auditService.log(user.getId(), "LOGIN_MFA_PENDING", null, null, null, ipAddress);
            String mfaJti = UUID.randomUUID().toString();
            String mfaToken = jwtUtil.generateToken(user.getId(), user.getEmail(), Role.MFA_PENDING.name(), mfaJti);
            return new AuthResponse(mfaToken, user.getId(), user.getEmail(), user.getFullName(),
                    user.getRole(), jwtUtil.getExpirationMs(), true);
        }

        auditService.log(user.getId(), "LOGIN_SUCCESS", null, null, null, ipAddress);

        String jti = UUID.randomUUID().toString();
        String token = jwtUtil.generateToken(user.getId(), user.getEmail(), user.getRole().name(), jti);
        sessionService.createSession(user.getId(), jti, userAgent, ipAddress);
        return new AuthResponse(token, user.getId(), user.getEmail(), user.getFullName(),
                user.getRole(), jwtUtil.getExpirationMs(), false);
    }

    @Transactional
    public com.thecatalyst.dms.dto.MfaSetupResponse setupMfa(java.util.UUID userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "User not found"));

        dev.samstevens.totp.secret.SecretGenerator secretGenerator = new dev.samstevens.totp.secret.DefaultSecretGenerator();
        String secret = secretGenerator.generate();

        EncryptionService.EncryptedPayload encrypted = encryptionService.encrypt(secret.getBytes(java.nio.charset.StandardCharsets.UTF_8));
        user.setEncryptedTotpSecret(java.util.Base64.getEncoder().encodeToString(encrypted.ciphertext()));
        user.setTotpSecretIv(java.util.Base64.getEncoder().encodeToString(encrypted.iv()));
        user.setMfaEnabled(false);
        userRepository.save(user);

        auditService.log(user.getId(), "MFA_SETUP", null, null, null, "internal");

        String issuer = java.net.URLEncoder.encode("URSAFE", java.nio.charset.StandardCharsets.UTF_8);
        String accountName = java.net.URLEncoder.encode(user.getEmail(), java.nio.charset.StandardCharsets.UTF_8);
        String qrCodeUri = String.format("otpauth://totp/%s:%s?secret=%s&issuer=%s&algorithm=SHA1&digits=6&period=30",
                issuer, accountName, secret, issuer);

        return new com.thecatalyst.dms.dto.MfaSetupResponse(qrCodeUri, secret);
    }

    @Transactional
    public void confirmMfa(java.util.UUID userId, com.thecatalyst.dms.dto.MfaVerifyRequest req) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "User not found"));

        if (user.getEncryptedTotpSecret() == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "MFA setup not initiated");
        }

        byte[] ciphertext = java.util.Base64.getDecoder().decode(user.getEncryptedTotpSecret());
        byte[] iv = java.util.Base64.getDecoder().decode(user.getTotpSecretIv());
        String secret = new String(encryptionService.decrypt(ciphertext, iv), java.nio.charset.StandardCharsets.UTF_8);

        dev.samstevens.totp.time.TimeProvider timeProvider = new dev.samstevens.totp.time.SystemTimeProvider();
        dev.samstevens.totp.code.DefaultCodeVerifier verifier = new dev.samstevens.totp.code.DefaultCodeVerifier(
                new dev.samstevens.totp.code.DefaultCodeGenerator(dev.samstevens.totp.code.HashingAlgorithm.SHA1, 6), timeProvider);
        verifier.setAllowedTimePeriodDiscrepancy(2); // Allow 60 seconds drift

        try {
            String currentCode = new dev.samstevens.totp.code.DefaultCodeGenerator(dev.samstevens.totp.code.HashingAlgorithm.SHA1, 6).generate(secret, timeProvider.getTime() / 30);
            System.out.println("DEBUG MFA: Expected=" + currentCode + " Provided=" + req.code());
        } catch (Exception e) {}

        if (verifier.isValidCode(secret, req.code())) {
            user.setMfaEnabled(true);
            userRepository.save(user);
            auditService.log(user.getId(), "MFA_ENABLED", null, null, null, "internal");
        } else {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Invalid MFA code");
        }
    }

    @Transactional
    public AuthResponse verifyMfaLogin(java.util.UUID userId, com.thecatalyst.dms.dto.MfaVerifyRequest req, String ipAddress, String userAgent) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "User not found"));

        if (!user.isEnabled() || !user.isMfaEnabled() || user.getEncryptedTotpSecret() == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "MFA is not enabled for this user");
        }

        byte[] ciphertext = java.util.Base64.getDecoder().decode(user.getEncryptedTotpSecret());
        byte[] iv = java.util.Base64.getDecoder().decode(user.getTotpSecretIv());
        String secret = new String(encryptionService.decrypt(ciphertext, iv), java.nio.charset.StandardCharsets.UTF_8);

        dev.samstevens.totp.time.TimeProvider timeProvider = new dev.samstevens.totp.time.SystemTimeProvider();
        dev.samstevens.totp.code.DefaultCodeVerifier verifier = new dev.samstevens.totp.code.DefaultCodeVerifier(
                new dev.samstevens.totp.code.DefaultCodeGenerator(dev.samstevens.totp.code.HashingAlgorithm.SHA1, 6), timeProvider);
        verifier.setAllowedTimePeriodDiscrepancy(2); // Allow 60 seconds drift

        if (verifier.isValidCode(secret, req.code())) {
            auditService.log(user.getId(), "LOGIN_SUCCESS", null, null, null, ipAddress);
            String jti = UUID.randomUUID().toString();
            String token = jwtUtil.generateToken(user.getId(), user.getEmail(), user.getRole().name(), jti);
            sessionService.createSession(user.getId(), jti, userAgent, ipAddress);
            return new AuthResponse(token, user.getId(), user.getEmail(), user.getFullName(),
                    user.getRole(), jwtUtil.getExpirationMs(), false);
        } else {
            auditService.log(user.getId(), "LOGIN_MFA_FAIL", null, null, null, ipAddress);
            throw new ApiException(HttpStatus.UNAUTHORIZED, "Invalid MFA code");
        }
    }

    @Transactional
    public void requestPasswordReset(ForgotPasswordRequest req) {
        Optional<User> userOpt = userRepository.findByEmail(req.email().toLowerCase().trim());
        if (userOpt.isEmpty()) {
            return; // A07: Silent return to prevent user enumeration
        }
        User user = userOpt.get();

        String rawToken = UUID.randomUUID().toString();
        String tokenHash = hashingService.sha256(rawToken.getBytes(java.nio.charset.StandardCharsets.UTF_8));

        PasswordResetToken resetToken = PasswordResetToken.builder()
                .userId(user.getId())
                .tokenHash(tokenHash)
                .expiresAt(Instant.now().plus(15, ChronoUnit.MINUTES))
                .used(false)
                .build();
        
        passwordResetTokenRepository.save(resetToken);
        auditService.log(user.getId(), "PASSWORD_RESET_REQUESTED", null, null, null, "internal");

        String resetLink = "http://localhost:5173/reset-password?token=" + rawToken;
        emailService.sendPasswordResetEmail(user.getEmail(), resetLink);
    }

    @Transactional
    public void resetPassword(ResetPasswordRequest req) {
        String tokenHash = hashingService.sha256(req.token().getBytes(java.nio.charset.StandardCharsets.UTF_8));

        PasswordResetToken resetToken = passwordResetTokenRepository.findByTokenHash(tokenHash)
                .orElseThrow(() -> new ApiException(HttpStatus.BAD_REQUEST, "Invalid or expired token"));

        if (resetToken.isUsed() || Instant.now().isAfter(resetToken.getExpiresAt())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Invalid or expired token");
        }

        User user = userRepository.findById(resetToken.getUserId())
                .orElseThrow(() -> new ApiException(HttpStatus.BAD_REQUEST, "User not found"));

        user.setPasswordHash(passwordEncoder.encode(req.newPassword()));
        userRepository.save(user);

        resetToken.setUsed(true);
        passwordResetTokenRepository.save(resetToken);

        passwordResetTokenRepository.invalidateAllTokensForUser(user.getId());
        auditService.log(user.getId(), "PASSWORD_RESET_COMPLETED", null, null, null, "internal");
    }
}
