package com.thecatalyst.dms.service;

import com.thecatalyst.dms.dto.DocumentResponse;
import com.thecatalyst.dms.entity.DocumentEntity;
import com.thecatalyst.dms.entity.DocumentTag;
import com.thecatalyst.dms.entity.Role;
import com.thecatalyst.dms.exception.ApiException;
import com.thecatalyst.dms.repository.DocumentRepository;
import com.thecatalyst.dms.security.AuthenticatedUser;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Base64;
import java.util.List;
import java.util.Set;
import java.util.UUID;

/**
 * SECURITY NOTE (upload path):
 * - Files are validated by extension AND declared content-type against an
 *   allow-list (OWASP A03/A04 - unrestricted file upload is a common
 *   vector for RCE/XSS-via-upload). This is a basic check; production
 *   should add magic-byte/content sniffing too (see README "Hardening").
 * - Every document is stored under a server-generated UUID filename -
 *   the user-supplied original filename is NEVER used to build a
 *   filesystem path, which eliminates path traversal
 *   (../../etc/passwd-style attacks).
 * - The case's storage subdirectory is derived from a UUID (caseId), not
 *   user input, for the same reason.
 * - Plaintext is only ever held in memory transiently during
 *   upload/download; only ciphertext is written to disk.
 */
@Service
public class DocumentService {

    private static final Set<String> ALLOWED_EXTENSIONS = Set.of(
            "pdf", "png", "jpg", "jpeg", "docx", "txt");
    private static final Set<String> ALLOWED_CONTENT_TYPES = Set.of(
            "application/pdf", "image/png", "image/jpeg",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            "text/plain");
    private static final long MAX_FILE_SIZE_BYTES = 25L * 1024 * 1024; // 25MB, matches application.yml

    private final DocumentRepository documentRepository;
    private final HashingService hashingService;
    private final EncryptionService encryptionService;
    private final CaseService caseService;
    private final AuditService auditService;
    private final Path storageBasePath;

    public DocumentService(DocumentRepository documentRepository,
                            HashingService hashingService,
                            EncryptionService encryptionService,
                            CaseService caseService,
                            AuditService auditService,
                            @Value("${app.storage.base-path}") String basePath) {
        this.documentRepository = documentRepository;
        this.hashingService = hashingService;
        this.encryptionService = encryptionService;
        this.caseService = caseService;
        this.auditService = auditService;
        this.storageBasePath = Path.of(basePath).normalize();
        try {
            Files.createDirectories(storageBasePath);
        } catch (IOException e) {
            throw new IllegalStateException("Cannot create storage directory: " + storageBasePath, e);
        }
    }

    @Transactional
    public DocumentResponse upload(UUID caseId, MultipartFile file, UUID documentGroupId, DocumentTag tag, AuthenticatedUser actor, String ip) {
        caseService.assertAccess(caseId, actor);
        validateFile(file);

        try {
            byte[] plaintext = file.getBytes();
            String hash = hashingService.sha256(plaintext);

            EncryptionService.EncryptedPayload encrypted = encryptionService.encrypt(plaintext);

            UUID documentId = UUID.randomUUID();
            String storedFileName = documentId + ".enc";
            Path caseDir = caseStorageDir(caseId);
            Files.createDirectories(caseDir);
            Path target = caseDir.resolve(storedFileName).normalize();

            // Defence in depth: confirm the resolved path is still inside
            // the case directory before writing (guards against any future
            // regression that lets attacker input reach the path).
            if (!target.startsWith(caseDir)) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "Invalid file path");
            }

            Files.write(target, encrypted.ciphertext(), java.nio.file.StandardOpenOption.CREATE_NEW);

            int version = 1;
            if (documentGroupId != null) {
                Integer maxVersion = documentRepository.findMaxVersionByGroupId(documentGroupId);
                if (maxVersion != null) {
                    version = maxVersion + 1;
                }
            } else {
                documentGroupId = UUID.randomUUID();
            }

            if (tag == null) {
                tag = DocumentTag.OTHER;
            }

            DocumentEntity doc = DocumentEntity.builder()
                    .id(documentId)
                    .caseId(caseId)
                    .originalFileName(sanitizeDisplayName(file.getOriginalFilename()))
                    .storedFileName(storedFileName)
                    .contentType(file.getContentType())
                    .fileSizeBytes(plaintext.length)
                    .sha256Hash(hash)
                    .ivBase64(Base64.getEncoder().encodeToString(encrypted.iv()))
                    .uploadedBy(actor.id())
                    .version(version)
                    .documentGroupId(documentGroupId)
                    .tag(tag)
                    .build();
            doc = documentRepository.save(doc);

            auditService.log(actor.id(), "UPLOAD", caseId, doc.getId(), doc.getOriginalFileName(), ip);
            return toResponse(doc);
        } catch (IOException e) {
            throw new ApiException(HttpStatus.INTERNAL_SERVER_ERROR, "Failed to store document");
        }
    }

    public record DownloadResult(byte[] content, String contentType, String fileName) {}

    @Transactional
    public DownloadResult download(UUID documentId, AuthenticatedUser actor, String ip) {
        DocumentEntity doc = documentRepository.findById(documentId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Document not found"));

        // BOLA check: access is scoped through the parent case, re-verified
        // on every single retrieval - not cached, not assumed from a prior request.
        caseService.assertAccess(doc.getCaseId(), actor);

        try {
            Path caseDir = caseStorageDir(doc.getCaseId());
            Path source = caseDir.resolve(doc.getStoredFileName()).normalize();
            if (!source.startsWith(caseDir)) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "Invalid file path");
            }

            byte[] ciphertext = Files.readAllBytes(source);
            byte[] iv = Base64.getDecoder().decode(doc.getIvBase64());
            byte[] plaintext = encryptionService.decrypt(ciphertext, iv);

            String recomputedHash = hashingService.sha256(plaintext);
            if (!hashingService.matches(recomputedHash, doc.getSha256Hash())) {
                auditService.log(actor.id(), "VERIFY_FAIL", doc.getCaseId(), doc.getId(),
                        "hash mismatch on retrieval", ip);
                throw new ApiException(HttpStatus.CONFLICT,
                        "Integrity check failed - this document may have been tampered with");
            }

            auditService.log(actor.id(), "DOWNLOAD", doc.getCaseId(), doc.getId(), doc.getOriginalFileName(), ip);
            return new DownloadResult(plaintext, doc.getContentType(), doc.getOriginalFileName());
        } catch (IOException e) {
            throw new ApiException(HttpStatus.INTERNAL_SERVER_ERROR, "Failed to retrieve document");
        }
    }

    public List<DocumentResponse> listForCase(UUID caseId, AuthenticatedUser actor) {
        caseService.assertAccess(caseId, actor);
        return documentRepository.findByCaseIdAndIsDeletedFalse(caseId).stream().map(this::toResponse).toList();
    }

    @Transactional
    public void delete(UUID documentId, AuthenticatedUser actor, String ip) {
        DocumentEntity doc = documentRepository.findById(documentId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Document not found"));
        
        caseService.assertAccess(doc.getCaseId(), actor);
        
        com.thecatalyst.dms.entity.CaseEntity caseEntity = caseService.getCase(doc.getCaseId(), actor);
        if (!Role.ADMIN.name().equals(actor.role()) && !caseEntity.getCreatedBy().equals(actor.id())) {
            throw new ApiException(HttpStatus.FORBIDDEN, "Only admins or the case creator can delete documents");
        }
        
        doc.setDeleted(true);
        documentRepository.save(doc);
        
        auditService.log(actor.id(), "DOCUMENT_DELETE", doc.getCaseId(), doc.getId(), doc.getOriginalFileName(), ip);
    }

    private Path caseStorageDir(UUID caseId) {
        return storageBasePath.resolve(caseId.toString()).normalize();
    }

    private void validateFile(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "No file provided");
        }
        if (file.getSize() > MAX_FILE_SIZE_BYTES) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "File exceeds maximum allowed size");
        }
        String contentType = file.getContentType();
        if (contentType == null || !ALLOWED_CONTENT_TYPES.contains(contentType)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "File type not permitted");
        }
        String ext = extensionOf(file.getOriginalFilename());
        if (ext == null || !ALLOWED_EXTENSIONS.contains(ext.toLowerCase())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "File extension not permitted");
        }
    }

    private String extensionOf(String fileName) {
        if (fileName == null) return null;
        int dot = fileName.lastIndexOf('.');
        return dot >= 0 && dot < fileName.length() - 1 ? fileName.substring(dot + 1) : null;
    }

    // Display-only sanitization: strips path separators and control chars so
    // the original name can never be used to inject a path or terminal
    // escape sequence when shown in the frontend / logs.
    private String sanitizeDisplayName(String fileName) {
        if (fileName == null) return "unnamed";
        String stripped = fileName.replaceAll("[\\\\/]", "_");
        stripped = stripped.replaceAll("[\\p{Cntrl}]", "");
        return stripped.length() > 255 ? stripped.substring(0, 255) : stripped;
    }

    private DocumentResponse toResponse(DocumentEntity doc) {
        return new DocumentResponse(doc.getId(), doc.getCaseId(), doc.getOriginalFileName(),
                doc.getContentType(), doc.getFileSizeBytes(), doc.getSha256Hash(),
                doc.getUploadedBy(), doc.getUploadedAt(), doc.getVersion(), doc.getDocumentGroupId(), doc.getTag());
    }
}
