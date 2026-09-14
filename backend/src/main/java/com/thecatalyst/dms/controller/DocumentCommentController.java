package com.thecatalyst.dms.controller;

import com.thecatalyst.dms.dto.DocumentCommentRequest;
import com.thecatalyst.dms.dto.DocumentCommentResponse;
import com.thecatalyst.dms.security.AuthenticatedUser;
import com.thecatalyst.dms.service.DocumentCommentService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/documents")
public class DocumentCommentController {
    
    private final DocumentCommentService documentCommentService;

    public DocumentCommentController(DocumentCommentService documentCommentService) {
        this.documentCommentService = documentCommentService;
    }

    @GetMapping("/{documentId}/comments")
    public ResponseEntity<List<DocumentCommentResponse>> getComments(@PathVariable UUID documentId, 
                                                                     @AuthenticationPrincipal AuthenticatedUser actor) {
        return ResponseEntity.ok(documentCommentService.getComments(documentId, actor));
    }

    @PostMapping("/{documentId}/comments")
    public ResponseEntity<DocumentCommentResponse> addComment(@PathVariable UUID documentId, 
                                                              @RequestBody DocumentCommentRequest request, 
                                                              @AuthenticationPrincipal AuthenticatedUser actor) {
        return ResponseEntity.ok(documentCommentService.addComment(documentId, request, actor));
    }
}
