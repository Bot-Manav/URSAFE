package com.thecatalyst.dms.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.UUID;

/**
 * SECURITY NOTE (BOLA / Broken Object Level Authorization, OWASP API1):
 * A valid JWT alone must never be sufficient to read a case's documents.
 * This table is the explicit allow-list of which users may access which
 * cases. Every document/case read in DocumentService and CaseService checks
 * this table (or ADMIN role) before returning anything - ownership is
 * re-verified on every request, not just at login.
 */
@Entity
@Table(name = "case_access", uniqueConstraints = @UniqueConstraint(columnNames = {"case_id", "user_id"}))
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CaseAccess {

    @Id
    @GeneratedValue
    private UUID id;

    @Column(name = "case_id", nullable = false)
    private UUID caseId;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(nullable = false)
    private UUID grantedBy;

    @Column(nullable = false, updatable = false)
    @Builder.Default
    private Instant grantedAt = Instant.now();
}
