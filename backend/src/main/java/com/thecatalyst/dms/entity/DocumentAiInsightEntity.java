package com.thecatalyst.dms.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "document_ai_insights")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DocumentAiInsightEntity {

    @Id
    @Builder.Default
    private UUID id = UUID.randomUUID();

    @Column(nullable = false, unique = true)
    private UUID documentId;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String encryptedSummaryBase64;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String encryptedEntitiesJsonBase64;

    @Column(nullable = false)
    private String ivBase64;

    @Column(nullable = false)
    @Builder.Default
    private Instant createdAt = Instant.now();
}
