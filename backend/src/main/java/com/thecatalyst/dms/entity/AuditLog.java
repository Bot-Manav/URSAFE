package com.thecatalyst.dms.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "audit_log")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AuditLog {

    @Id
    @GeneratedValue
    private UUID id;

    private UUID documentId;

    private UUID caseId;

    @Column(nullable = false)
    private UUID userId;

    @Column(nullable = false)
    private String action; // UPLOAD, VIEW, DOWNLOAD, VERIFY_FAIL, LOGIN, LOGIN_FAIL, GRANT_ACCESS

    private String detail;

    @Column(nullable = false)
    private String ipAddress;

    @Column(nullable = false, updatable = false)
    @Builder.Default
    private Instant timestamp = Instant.now();
}
