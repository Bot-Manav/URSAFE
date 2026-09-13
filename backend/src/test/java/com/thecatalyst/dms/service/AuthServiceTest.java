package com.thecatalyst.dms.service;

import com.thecatalyst.dms.dto.LoginRequest;
import com.thecatalyst.dms.entity.Role;
import com.thecatalyst.dms.entity.User;
import com.thecatalyst.dms.exception.ApiException;
import com.thecatalyst.dms.repository.PasswordResetTokenRepository;
import com.thecatalyst.dms.repository.UserRepository;
import com.thecatalyst.dms.security.JwtUtil;
import com.thecatalyst.dms.security.LoginAttemptService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class AuthServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private JwtUtil jwtUtil;

    @Mock
    private LoginAttemptService loginAttemptService;

    @Mock
    private AuditService auditService;

    @Mock
    private EncryptionService encryptionService;

    @Mock
    private PasswordResetTokenRepository passwordResetTokenRepository;

    @Mock
    private HashingService hashingService;

    @Mock
    private EmailService emailService;

    @Mock
    private SessionService sessionService;

    @InjectMocks
    private AuthService authService;

    private User disabledUser;

    @BeforeEach
    void setUp() {
        disabledUser = User.builder()
                .id(UUID.randomUUID())
                .email("test@example.com")
                .fullName("Test User")
                .passwordHash("hashedpassword")
                .role(Role.USER)
                .enabled(false)
                .build();
    }

    @Test
    void login_ThrowsException_WhenUserIsDisabled() {
        LoginRequest req = new LoginRequest("test@example.com", "password");

        when(userRepository.findByEmail(anyString())).thenReturn(Optional.of(disabledUser));
        when(loginAttemptService.isLocked(disabledUser)).thenReturn(false);

        assertThrows(ApiException.class, () -> authService.login(req, "127.0.0.1", "Test-Agent"));

        verify(loginAttemptService).recordFailure(disabledUser);
        verify(auditService).log(disabledUser.getId(), "LOGIN_FAIL", null, null, null, "127.0.0.1");
        verifyNoInteractions(jwtUtil, sessionService);
    }
}
