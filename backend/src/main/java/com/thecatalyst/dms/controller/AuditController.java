package com.thecatalyst.dms.controller;

import com.thecatalyst.dms.entity.AuditLog;
import com.thecatalyst.dms.repository.AuditLogRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/audit-logs")
public class AuditController {

    private final AuditLogRepository auditLogRepository;

    public AuditController(AuditLogRepository auditLogRepository) {
        this.auditLogRepository = auditLogRepository;
    }

    @GetMapping
    public ResponseEntity<List<AuditLog>> listAuditLogs(@RequestParam(required = false) UUID caseId,
                                                        @RequestParam(required = false) UUID documentId) {
        if (caseId != null) {
            return ResponseEntity.ok(auditLogRepository.findByCaseIdOrderByTimestampDesc(caseId));
        }
        if (documentId != null) {
            return ResponseEntity.ok(auditLogRepository.findByDocumentIdOrderByTimestampDesc(documentId));
        }
        return ResponseEntity.ok(auditLogRepository.findAllByOrderByTimestampDesc());
    }
}
