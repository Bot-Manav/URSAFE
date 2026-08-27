package com.thecatalyst.dms.service;

import org.springframework.stereotype.Service;

import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;

@Service
public class HashingService {

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
}
