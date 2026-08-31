package com.thecatalyst.dms.controller;

import com.thecatalyst.dms.dto.AuthResponse;
import com.thecatalyst.dms.dto.LoginRequest;
import com.thecatalyst.dms.dto.RegisterRequest;
import com.thecatalyst.dms.service.AuthService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/register")
    public ResponseEntity<AuthResponse> register(@Valid @RequestBody RegisterRequest request) {
        return ResponseEntity.ok(authService.register(request));
    }

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@Valid @RequestBody LoginRequest request,
                                               HttpServletRequest httpRequest) {
        return ResponseEntity.ok(authService.login(request, RequestUtils.clientIp(httpRequest)));
    }

    @PostMapping("/setup-mfa")
    public ResponseEntity<com.thecatalyst.dms.dto.MfaSetupResponse> setupMfa(org.springframework.security.core.Authentication auth) {
        java.util.UUID userId = ((com.thecatalyst.dms.security.AuthenticatedUser) auth.getPrincipal()).id();
        return ResponseEntity.ok(authService.setupMfa(userId));
    }

    @PostMapping("/confirm-mfa")
    public ResponseEntity<Void> confirmMfa(@Valid @RequestBody com.thecatalyst.dms.dto.MfaVerifyRequest request,
                                           org.springframework.security.core.Authentication auth) {
        java.util.UUID userId = ((com.thecatalyst.dms.security.AuthenticatedUser) auth.getPrincipal()).id();
        authService.confirmMfa(userId, request);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/verify-mfa")
    public ResponseEntity<AuthResponse> verifyMfa(@Valid @RequestBody com.thecatalyst.dms.dto.MfaVerifyRequest request,
                                                  org.springframework.security.core.Authentication auth,
                                                  HttpServletRequest httpRequest) {
        java.util.UUID userId = ((com.thecatalyst.dms.security.AuthenticatedUser) auth.getPrincipal()).id();
        return ResponseEntity.ok(authService.verifyMfaLogin(userId, request, RequestUtils.clientIp(httpRequest)));
    }
}
