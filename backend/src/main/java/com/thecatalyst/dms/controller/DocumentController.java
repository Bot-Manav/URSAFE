package com.thecatalyst.dms.controller;

import com.thecatalyst.dms.dto.DocumentResponse;
import com.thecatalyst.dms.entity.DocumentTag;
import com.thecatalyst.dms.security.AuthenticatedUser;
import com.thecatalyst.dms.service.DocumentService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api")
public class DocumentController {

    private final DocumentService documentService;

    public DocumentController(DocumentService documentService) {
        this.documentService = documentService;
    }

    @PostMapping(value = "/cases/{caseId}/documents", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<DocumentResponse> upload(@PathVariable UUID caseId,
                                                     @RequestParam("file") MultipartFile file,
                                                     @RequestParam(value = "documentGroupId", required = false) UUID documentGroupId,
                                                     @RequestParam(value = "tag", required = false) DocumentTag tag,
                                                     @AuthenticationPrincipal AuthenticatedUser actor,
                                                     HttpServletRequest httpRequest) {
        DocumentResponse response = documentService.upload(
                caseId, file, documentGroupId, tag, actor, RequestUtils.clientIp(httpRequest));
        return ResponseEntity.ok(response);
    }

    @GetMapping("/cases/{caseId}/documents")
    public ResponseEntity<List<DocumentResponse>> list(@PathVariable UUID caseId,
                                                         @AuthenticationPrincipal AuthenticatedUser actor) {
        return ResponseEntity.ok(documentService.listForCase(caseId, actor));
    }

    @GetMapping("/documents/{documentId}/download")
    public ResponseEntity<ByteArrayResource> download(@PathVariable UUID documentId,
                                                        @AuthenticationPrincipal AuthenticatedUser actor,
                                                        HttpServletRequest httpRequest) {
        var result = documentService.download(documentId, actor, RequestUtils.clientIp(httpRequest));

        // Content-Disposition filename is percent-encoded and quoted -
        // avoids header injection via a crafted original filename.
        ContentDisposition disposition = ContentDisposition.attachment()
                .filename(result.fileName(), StandardCharsets.UTF_8)
                .build();

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, disposition.toString())
                .contentType(MediaType.parseMediaType(
                        result.contentType() != null ? result.contentType() : "application/octet-stream"))
                .body(new ByteArrayResource(result.content()));
    }

    @DeleteMapping("/documents/{documentId}")
    public ResponseEntity<Void> delete(@PathVariable UUID documentId,
                                         @AuthenticationPrincipal AuthenticatedUser actor,
                                         HttpServletRequest httpRequest) {
        documentService.delete(documentId, actor, RequestUtils.clientIp(httpRequest));
        return ResponseEntity.noContent().build();
    }
}
