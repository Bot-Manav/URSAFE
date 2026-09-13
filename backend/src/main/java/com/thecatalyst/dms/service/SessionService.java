package com.thecatalyst.dms.service;

import com.thecatalyst.dms.entity.Session;
import com.thecatalyst.dms.exception.ApiException;
import com.thecatalyst.dms.repository.SessionRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
public class SessionService {

    private final SessionRepository sessionRepository;
    private final AuditService auditService;

    public SessionService(SessionRepository sessionRepository, AuditService auditService) {
        this.sessionRepository = sessionRepository;
        this.auditService = auditService;
    }

    @Transactional
    public void createSession(UUID userId, String jti, String deviceInfo, String ipAddress) {
        Session session = Session.builder()
                .userId(userId)
                .jti(jti)
                .deviceInfo(deviceInfo != null ? deviceInfo : "Unknown Device")
                .createdAt(Instant.now())
                .lastSeenAt(Instant.now())
                .revoked(false)
                .build();
        sessionRepository.save(session);
        auditService.log(userId, "SESSION_CREATED", null, null, "Device: " + session.getDeviceInfo(), ipAddress);
    }

    @Transactional(readOnly = true)
    public boolean isSessionRevoked(String jti) {
        return sessionRepository.findByJti(jti)
                .map(Session::isRevoked)
                .orElse(true); // If not found, treat as revoked for safety
    }

    @Transactional
    public void updateLastSeen(String jti) {
        sessionRepository.findByJti(jti).ifPresent(session -> {
            // Optimization: Only update lastSeenAt if it's been more than 5 minutes
            if (session.getLastSeenAt().isBefore(Instant.now().minusSeconds(300))) {
                session.setLastSeenAt(Instant.now());
                sessionRepository.save(session);
            }
        });
    }

    @Transactional(readOnly = true)
    public List<Session> getActiveSessions(UUID userId) {
        return sessionRepository.findByUserIdAndRevokedFalseOrderByLastSeenAtDesc(userId);
    }

    @Transactional
    public void revokeSession(UUID userId, String jti, String ipAddress) {
        Session session = sessionRepository.findByJti(jti)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Session not found"));
        
        if (!session.getUserId().equals(userId)) {
            throw new ApiException(HttpStatus.FORBIDDEN, "Not authorized to revoke this session");
        }

        session.setRevoked(true);
        sessionRepository.save(session);
        auditService.log(userId, "SESSION_REVOKED", null, null, "JTI: " + jti, ipAddress);
    }

    @Transactional
    public void revokeAllOtherSessions(UUID userId, String currentJti, String ipAddress) {
        List<Session> otherSessions = sessionRepository.findByUserIdAndRevokedFalseAndJtiNot(userId, currentJti);
        for (Session s : otherSessions) {
            s.setRevoked(true);
        }
        sessionRepository.saveAll(otherSessions);
        auditService.log(userId, "ALL_OTHER_SESSIONS_REVOKED", null, null, "Remaining JTI: " + currentJti, ipAddress);
    }
}
