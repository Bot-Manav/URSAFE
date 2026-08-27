package com.thecatalyst.dms.service;

import com.thecatalyst.dms.entity.AuditLog;
import com.thecatalyst.dms.repository.AuditLogRepository;
import org.springframework.stereotype.Service;

import java.util.UUID;

@Service
public class AuditService {

    private final AuditLogRepository auditLogRepository;

    public AuditService(AuditLogRepository auditLogRepository) {
        this.auditLogRepository = auditLogRepository;
    }

    public void log(UUID userId, String action, UUID caseId, UUID documentId, String detail, String ipAddress) {
        AuditLog entry = AuditLog.builder()
                .userId(userId)
                .action(action)
                .caseId(caseId)
                .documentId(documentId)
                .detail(detail)
                .ipAddress(ipAddress == null ? "unknown" : ipAddress)
                .build();
        auditLogRepository.save(entry);
    }
}
