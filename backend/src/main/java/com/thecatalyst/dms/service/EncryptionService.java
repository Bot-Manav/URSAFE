package com.thecatalyst.dms.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.Cipher;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import java.security.SecureRandom;
import java.util.Base64;

/**
 * AES-256-GCM authenticated encryption for document contents at rest.
 *
 * SECURITY NOTE:
 * - GCM provides both confidentiality AND integrity of the ciphertext
 *   itself (the auth tag will fail to verify if the ciphertext is
 *   modified), independent of the separate SHA-256 plaintext hash stored
 *   in DocumentEntity. Two layers: GCM catches ciphertext tampering,
 *   SHA-256 catches any tampering after decryption / confirms end-to-end
 *   integrity of the original file.
 * - A fresh random IV is generated for every encryption call and is never
 *   reused with the same key (GCM security depends on IV uniqueness).
 * - The key itself is loaded from env (AES_KEY, 32 raw bytes, base64) and
 *   the app refuses to start if it's missing or the wrong length. For a
 *   production deployment this key belongs in a KMS/HSM/Vault, not an env
 *   var - see README.
 */
@Service
public class EncryptionService {

    private static final String TRANSFORMATION = "AES/GCM/NoPadding";
    private static final int IV_LENGTH_BYTES = 12;
    private static final int TAG_LENGTH_BITS = 128;

    private final SecretKeySpec key;

    public EncryptionService(@Value("${app.encryption.key}") String base64Key) {
        if (base64Key == null || base64Key.isBlank()) {
            throw new IllegalStateException(
                "AES_KEY is not set. Generate one with: openssl rand -base64 32");
        }
        byte[] raw = Base64.getDecoder().decode(base64Key);
        if (raw.length != 32) {
            throw new IllegalStateException("AES_KEY must decode to exactly 32 bytes (AES-256).");
        }
        this.key = new SecretKeySpec(raw, "AES");
    }

    public record EncryptedPayload(byte[] ciphertext, byte[] iv) {}

    public EncryptedPayload encrypt(byte[] plaintext) {
        try {
            byte[] iv = new byte[IV_LENGTH_BYTES];
            new SecureRandom().nextBytes(iv);

            Cipher cipher = Cipher.getInstance(TRANSFORMATION);
            cipher.init(Cipher.ENCRYPT_MODE, key, new GCMParameterSpec(TAG_LENGTH_BITS, iv));
            byte[] ciphertext = cipher.doFinal(plaintext);

            return new EncryptedPayload(ciphertext, iv);
        } catch (Exception e) {
            throw new IllegalStateException("Encryption failed", e);
        }
    }

    public byte[] decrypt(byte[] ciphertext, byte[] iv) {
        try {
            Cipher cipher = Cipher.getInstance(TRANSFORMATION);
            cipher.init(Cipher.DECRYPT_MODE, key, new GCMParameterSpec(TAG_LENGTH_BITS, iv));
            return cipher.doFinal(ciphertext);
        } catch (Exception e) {
            // Covers auth-tag failure (tampered ciphertext) as well as generic errors.
            throw new IllegalStateException("Decryption failed - ciphertext may be corrupted or tampered", e);
        }
    }
}
