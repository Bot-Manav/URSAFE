package com.thecatalyst.dms.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.UUID;

/**
 * SECURITY NOTE:
 * - storedFileName is a server-generated UUID, never the user-supplied
 *   original filename. This prevents path traversal (../../etc/passwd)
 *   and filename-based injection. The original name is kept separately
 *   purely for display.
 * - sha256Hash is computed on the PLAINTEXT bytes before encryption, and
 *   is re-verified on every retrieval after decryption. A mismatch means
 *   tampering (of the ciphertext, key, or a bug) and the file is never
 *   served.
 * - ivBase64 is the AES-GCM initialization vector. It is not secret but
 *   must be unique per encryption (generated fresh in EncryptionService).
 */
@Entity
@Table(name = "document")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DocumentEntity {

    @Id
    @GeneratedValue
    private UUID id;

    @Column(nullable = false)
    private UUID caseId;

    @Column(nullable = false)
    private String originalFileName;

    @Column(nullable = false)
    private String storedFileName;

    @Column(nullable = false)
    private String contentType;

    @Column(nullable = false)
    private long fileSizeBytes;

    @Column(nullable = false)
    private String sha256Hash;

    @Column(nullable = false)
    private String ivBase64;

    @Column(nullable = false)
    private UUID uploadedBy;

    @Column(nullable = false, updatable = false)
    @Builder.Default
    private Instant uploadedAt = Instant.now();

    @Column(nullable = false)
    @Builder.Default
    private int version = 1;
}
