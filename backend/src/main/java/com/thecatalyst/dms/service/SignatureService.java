package com.thecatalyst.dms.service;

import com.thecatalyst.dms.entity.DocumentSignatureEntity;
import com.thecatalyst.dms.entity.User;
import com.thecatalyst.dms.repository.DocumentSignatureRepository;
import com.thecatalyst.dms.repository.UserRepository;
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
    private final UserRepository userRepository;
    private final EncryptionService encryptionService;

    public SignatureService(DocumentSignatureRepository signatureRepository,
                            UserRepository userRepository,
                            EncryptionService encryptionService) {
        this.signatureRepository = signatureRepository;
        this.userRepository = userRepository;
        this.encryptionService = encryptionService;
    }

    private void generateAndStoreUserKeyPair(User user) throws Exception {
        KeyPairGenerator keyGen = KeyPairGenerator.getInstance("EC");
        keyGen.initialize(256, new SecureRandom());
        KeyPair keyPair = keyGen.generateKeyPair();
        
        String pubKeyBase64 = Base64.getEncoder().encodeToString(keyPair.getPublic().getEncoded());
        byte[] privKeyBytes = keyPair.getPrivate().getEncoded();
        
        // Encrypt the private key
        EncryptionService.EncryptedPayload payload = encryptionService.encrypt(privKeyBytes);
        
        user.setSignaturePublicKey(pubKeyBase64);
        user.setEncryptedSignaturePrivateKey(Base64.getEncoder().encodeToString(payload.ciphertext()));
        user.setSignaturePrivateKeyIv(Base64.getEncoder().encodeToString(payload.iv()));
        userRepository.save(user);
    }

    private PrivateKey getPrivateKey(User user) throws Exception {
        byte[] encryptedPrivKey = Base64.getDecoder().decode(user.getEncryptedSignaturePrivateKey());
        byte[] iv = Base64.getDecoder().decode(user.getSignaturePrivateKeyIv());
        
        byte[] privKeyBytes = encryptionService.decrypt(encryptedPrivKey, iv);
        
        KeyFactory keyFactory = KeyFactory.getInstance("EC");
        return keyFactory.generatePrivate(new PKCS8EncodedKeySpec(privKeyBytes));
    }

    private PublicKey getPublicKey(User user) throws Exception {
        byte[] pubKeyBytes = Base64.getDecoder().decode(user.getSignaturePublicKey());
        KeyFactory keyFactory = KeyFactory.getInstance("EC");
        return keyFactory.generatePublic(new X509EncodedKeySpec(pubKeyBytes));
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
            User user = userRepository.findById(userId)
                    .orElseThrow(() -> new RuntimeException("User not found"));
                    
            if (user.getSignaturePublicKey() == null || user.getEncryptedSignaturePrivateKey() == null) {
                generateAndStoreUserKeyPair(user);
            }
            
            PrivateKey privateKey = getPrivateKey(user);
            
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
            User signer = userRepository.findById(signature.getSignedByUserId())
                    .orElse(null);
                    
            if (signer == null || signer.getSignaturePublicKey() == null) {
                return false; // Cannot verify without the public key
            }
            
            PublicKey publicKey = getPublicKey(signer);
            
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
