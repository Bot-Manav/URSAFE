package com.thecatalyst.dms.controller;

import com.thecatalyst.dms.entity.Session;
import com.thecatalyst.dms.security.AuthenticatedUser;
import com.thecatalyst.dms.service.SessionService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/sessions")
public class SessionController {

    private final SessionService sessionService;

    public SessionController(SessionService sessionService) {
        this.sessionService = sessionService;
    }

    @GetMapping
    public ResponseEntity<List<Session>> getActiveSessions(Authentication auth) {
        UUID userId = ((AuthenticatedUser) auth.getPrincipal()).id();
        return ResponseEntity.ok(sessionService.getActiveSessions(userId));
    }

    @DeleteMapping("/{jti}")
    public ResponseEntity<Void> revokeSession(@PathVariable String jti,
                                              Authentication auth,
                                              HttpServletRequest request) {
        UUID userId = ((AuthenticatedUser) auth.getPrincipal()).id();
        sessionService.revokeSession(userId, jti, RequestUtils.clientIp(request));
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping
    public ResponseEntity<Void> revokeAllOtherSessions(Authentication auth,
                                                       HttpServletRequest request) {
        UUID userId = ((AuthenticatedUser) auth.getPrincipal()).id();
        String currentJti = ((AuthenticatedUser) auth.getPrincipal()).jti();
        sessionService.revokeAllOtherSessions(userId, currentJti, RequestUtils.clientIp(request));
        return ResponseEntity.noContent().build();
    }
}
