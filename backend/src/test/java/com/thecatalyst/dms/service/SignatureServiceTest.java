package com.thecatalyst.dms.service;

import com.thecatalyst.dms.entity.DocumentSignatureEntity;
import com.thecatalyst.dms.entity.Role;
import com.thecatalyst.dms.entity.User;
import com.thecatalyst.dms.repository.DocumentSignatureRepository;
import com.thecatalyst.dms.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;
import java.util.Base64;
import java.security.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class SignatureServiceTest {

    @Mock
    private DocumentSignatureRepository signatureRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private EncryptionService encryptionService;

    @InjectMocks
    private SignatureService signatureService;

    private User userA;
    private User userB;
    private UUID documentId;
    private String documentHash;

    @BeforeEach
    void setUp() throws Exception {
        documentId = UUID.randomUUID();
        documentHash = "some-sha256-hash";

        userA = User.builder()
                .id(UUID.randomUUID())
                .email("usera@example.com")
                .role(Role.LAW_ENFORCEMENT)
                .build();
                
        userB = User.builder()
                .id(UUID.randomUUID())
                .email("userb@example.com")
                .role(Role.LAW_ENFORCEMENT)
                .build();
                
        // Mock encryption service to just pass through for testing
        lenient().when(encryptionService.encrypt(any(byte[].class))).thenAnswer(invocation -> 
            new EncryptionService.EncryptedPayload((byte[]) invocation.getArgument(0), new byte[16]));
        lenient().when(encryptionService.decrypt(any(byte[].class), any(byte[].class))).thenAnswer(invocation -> invocation.getArgument(0));
    }

    @Test
    void testSignAndVerify_Success() throws Exception {
        when(userRepository.findById(userA.getId())).thenReturn(Optional.of(userA));
        when(signatureRepository.save(any(DocumentSignatureEntity.class))).thenAnswer(i -> i.getArgument(0));

        DocumentSignatureEntity signature = signatureService.signDocument(documentId, documentHash, userA.getId());

        assertNotNull(signature);
        assertNotNull(userA.getSignaturePublicKey());
        assertNotNull(userA.getEncryptedSignaturePrivateKey());

        assertTrue(signatureService.verifySignature(signature, documentHash));
    }

    @Test
    void testVerify_FailsWithDifferentUser() throws Exception {
        when(userRepository.findById(userA.getId())).thenReturn(Optional.of(userA));
        when(signatureRepository.save(any(DocumentSignatureEntity.class))).thenAnswer(i -> i.getArgument(0));

        // User A signs the document
        DocumentSignatureEntity signature = signatureService.signDocument(documentId, documentHash, userA.getId());

        // Now simulate generating a keypair for User B
        when(userRepository.findById(userB.getId())).thenReturn(Optional.of(userB));
        signatureService.signDocument(UUID.randomUUID(), "other-hash", userB.getId());

        // Attempt to verify User A's signature but we hack the entity to claim User B signed it
        signature.setSignedByUserId(userB.getId());
        
        assertFalse(signatureService.verifySignature(signature, documentHash));
    }
    
    @Test
    void testVerify_FailsWithTamperedHash() throws Exception {
        when(userRepository.findById(userA.getId())).thenReturn(Optional.of(userA));
        when(signatureRepository.save(any(DocumentSignatureEntity.class))).thenAnswer(i -> i.getArgument(0));

        DocumentSignatureEntity signature = signatureService.signDocument(documentId, documentHash, userA.getId());

        // Verifying with a different hash should fail
        assertFalse(signatureService.verifySignature(signature, "tampered-hash"));
    }
}
