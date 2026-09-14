package com.thecatalyst.dms.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "document_signatures")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DocumentSignatureEntity {

    @Id
    @GeneratedValue
    private UUID id;

    @Column(nullable = false)
    private UUID documentId;

    @Column(nullable = false)
    private UUID signedByUserId;

    @Column(nullable = false, updatable = false)
    @Builder.Default
    private Instant signedAt = Instant.now();

    /**
     * The actual cryptographic signature (e.g. ECDSA signature) over the payload
     * `documentId:documentHash:signedByUserId:signedAt` encoded as Base64.
     */
    @Column(nullable = false, length = 1000)
    private String signatureBase64;
    
    /**
     * Algorithm used for signing (e.g., "SHA256withECDSA" or "SHA256withRSA")
     */
    @Column(nullable = false)
    private String algorithm;

}
