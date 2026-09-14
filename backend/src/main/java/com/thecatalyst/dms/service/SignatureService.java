package com.thecatalyst.dms.service;

import com.thecatalyst.dms.entity.DocumentSignatureEntity;
import com.thecatalyst.dms.repository.DocumentSignatureRepository;
import jakarta.annotation.PostConstruct;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.security.*;
import java.security.spec.PKCS8EncodedKeySpec;
import java.security.spec.X509EncodedKeySpec;
import java.time.Instant;
import java.util.Base64;
import java.util.UUID;
import java.util.List;

@Service
public class SignatureService {

    private static final String ALGORITHM = "SHA256withECDSA";
    
    private final DocumentSignatureRepository signatureRepository;
    
    private PrivateKey privateKey;
    private PublicKey publicKey;
    
    @Value("${app.signature.private-key:}")
    private String privateKeyBase64;
    
    @Value("${app.signature.public-key:}")
    private String publicKeyBase64;

    public SignatureService(DocumentSignatureRepository signatureRepository) {
        this.signatureRepository = signatureRepository;
    }

    @PostConstruct
    public void init() throws Exception {
        if (privateKeyBase64 != null && !privateKeyBase64.isBlank() && publicKeyBase64 != null && !publicKeyBase64.isBlank()) {
            KeyFactory keyFactory = KeyFactory.getInstance("EC");
            privateKey = keyFactory.generatePrivate(new PKCS8EncodedKeySpec(Base64.getDecoder().decode(privateKeyBase64)));
            publicKey = keyFactory.generatePublic(new X509EncodedKeySpec(Base64.getDecoder().decode(publicKeyBase64)));
        } else {
            // Generate ephemeral keypair for development/testing if not provided
            KeyPairGenerator keyGen = KeyPairGenerator.getInstance("EC");
            keyGen.initialize(256, new SecureRandom());
            KeyPair keyPair = keyGen.generateKeyPair();
            this.privateKey = keyPair.getPrivate();
            this.publicKey = keyPair.getPublic();
        }
    }

    /**
     * Constructs the payload to be signed: "documentId:documentHash:userId:timestamp"
     */
    private byte[] constructPayload(UUID documentId, String documentHash, UUID userId, Instant timestamp) {
        String payloadString = String.format("%s:%s:%s:%s",
                documentId.toString(),
                documentHash,
                userId.toString(),
                timestamp.toString());
        return payloadString.getBytes(java.nio.charset.StandardCharsets.UTF_8);
    }

    /**
     * Signs a document cryptographically.
     */
    public DocumentSignatureEntity signDocument(UUID documentId, String documentHash, UUID userId) {
        try {
            Instant now = Instant.now();
            byte[] payload = constructPayload(documentId, documentHash, userId, now);
            
            Signature ecdsaSign = Signature.getInstance(ALGORITHM);
            ecdsaSign.initSign(privateKey);
            ecdsaSign.update(payload);
            byte[] signatureBytes = ecdsaSign.sign();
            
            DocumentSignatureEntity entity = DocumentSignatureEntity.builder()
                    .documentId(documentId)
                    .signedByUserId(userId)
                    .signedAt(now)
                    .signatureBase64(Base64.getEncoder().encodeToString(signatureBytes))
                    .algorithm(ALGORITHM)
                    .build();
                    
            return signatureRepository.save(entity);
        } catch (Exception e) {
            throw new RuntimeException("Failed to generate digital signature", e);
        }
    }

    /**
     * Mathematically verifies a stored signature against the current document hash.
     * If the document hash has changed, this will return false.
     */
    public boolean verifySignature(DocumentSignatureEntity signature, String currentDocumentHash) {
        try {
            byte[] payload = constructPayload(
                    signature.getDocumentId(), 
                    currentDocumentHash, 
                    signature.getSignedByUserId(), 
                    signature.getSignedAt());
                    
            byte[] signatureBytes = Base64.getDecoder().decode(signature.getSignatureBase64());
            
            Signature ecdsaVerify = Signature.getInstance(signature.getAlgorithm());
            ecdsaVerify.initVerify(publicKey);
            ecdsaVerify.update(payload);
            
            return ecdsaVerify.verify(signatureBytes);
        } catch (Exception e) {
            return false;
        }
    }
    
    public List<DocumentSignatureEntity> getSignaturesForDocument(UUID documentId) {
        return signatureRepository.findByDocumentIdOrderBySignedAtDesc(documentId);
    }
}
