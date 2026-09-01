package com.thecatalyst.dms.repository;

import com.thecatalyst.dms.entity.AuditLog;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface AuditLogRepository extends JpaRepository<AuditLog, UUID> {
    List<AuditLog> findByCaseIdOrderByTimestampDesc(UUID caseId);
    List<AuditLog> findByDocumentIdOrderByTimestampDesc(UUID documentId);
    List<AuditLog> findAllByOrderByTimestampDesc();
}
