package com.thecatalyst.dms.service;

import org.springframework.stereotype.Service;

import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;

@Service
public class HashingService {

    private final byte[] hmacKey;

    public HashingService(@org.springframework.beans.factory.annotation.Value("${app.encryption.aes-key}") String aesKeyBase64) {
        this.hmacKey = java.util.Base64.getDecoder().decode(aesKeyBase64);
    }

    /** SHA-256 digest of the given bytes, as lowercase hex. */
    public String sha256(byte[] data) {
        try {
            MessageDigest md = MessageDigest.getInstance("SHA-256");
            byte[] digest = md.digest(data);
            return HexFormat.of().formatHex(digest);
        } catch (NoSuchAlgorithmException e) {
            // SHA-256 is guaranteed available on every JVM; this is unreachable.
            throw new IllegalStateException("SHA-256 algorithm unavailable", e);
        }
    }

    /** Constant-time comparison to avoid timing side-channels on hash checks. */
    public boolean matches(String hashA, String hashB) {
        return MessageDigest.isEqual(
                hashA.getBytes(java.nio.charset.StandardCharsets.UTF_8),
                hashB.getBytes(java.nio.charset.StandardCharsets.UTF_8)
        );
    }

    /** Deterministic HMAC-SHA256 for Blind Indexing, using the system AES key. */
    public String hmacSha256(String data) {
        try {
            javax.crypto.Mac mac = javax.crypto.Mac.getInstance("HmacSHA256");
            javax.crypto.spec.SecretKeySpec secretKeySpec = new javax.crypto.spec.SecretKeySpec(hmacKey, "HmacSHA256");
            mac.init(secretKeySpec);
            byte[] hash = mac.doFinal(data.getBytes(java.nio.charset.StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hash);
        } catch (Exception e) {
            throw new IllegalStateException("HMAC-SHA256 algorithm unavailable", e);
        }
    }
}
