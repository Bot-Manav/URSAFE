package com.thecatalyst.dms.controller;

import com.thecatalyst.dms.dto.SignatureResponse;
import com.thecatalyst.dms.entity.DocumentEntity;
import com.thecatalyst.dms.entity.DocumentSignatureEntity;
import com.thecatalyst.dms.entity.User;
import com.thecatalyst.dms.repository.DocumentRepository;
import com.thecatalyst.dms.repository.UserRepository;
import com.thecatalyst.dms.security.AuthenticatedUser;
import com.thecatalyst.dms.service.AuditService;
import com.thecatalyst.dms.service.CaseService;
import com.thecatalyst.dms.service.SignatureService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import jakarta.servlet.http.HttpServletRequest;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/documents")
public class SignatureController {

    private final SignatureService signatureService;
    private final DocumentRepository documentRepository;
    private final UserRepository userRepository;
    private final CaseService caseService;
    private final AuditService auditService;

    public SignatureController(SignatureService signatureService,
                               DocumentRepository documentRepository,
                               UserRepository userRepository,
                               CaseService caseService,
                               AuditService auditService) {
        this.signatureService = signatureService;
        this.documentRepository = documentRepository;
        this.userRepository = userRepository;
        this.caseService = caseService;
        this.auditService = auditService;
    }

    @org.springframework.security.access.prepost.PreAuthorize("hasAnyRole('ADMIN','LAW_ENFORCEMENT','INVESTIGATION_OFFICER','SUPERVISOR')")
    @PostMapping("/{documentId}/signatures")
    public ResponseEntity<SignatureResponse> signDocument(@PathVariable UUID documentId,
                                                          @AuthenticationPrincipal AuthenticatedUser actor,
                                                          HttpServletRequest request) {
        DocumentEntity doc = documentRepository.findById(documentId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Document not found"));
                
        // User must have access to the case to sign the document
        caseService.assertAccess(doc.getCaseId(), actor);
        
        DocumentSignatureEntity signature = signatureService.signDocument(doc.getId(), doc.getSha256Hash(), actor.id());
        
        auditService.log(actor.id(), "DOCUMENT_SIGN", doc.getCaseId(), doc.getId(), "Signed document", RequestUtils.clientIp(request));
        
        User user = userRepository.findById(actor.id()).orElse(null);
        
        return ResponseEntity.ok(new SignatureResponse(
                signature.getId(),
                signature.getDocumentId(),
                signature.getSignedByUserId(),
                user != null ? user.getEmail() : "Unknown",
                user != null ? user.getFullName() : "Unknown",
                user != null ? user.getRole().name() : "Unknown",
                signature.getSignedAt(),
                signature.getAlgorithm(),
                true // freshly signed is always true
        ));
    }

    @GetMapping("/{documentId}/signatures")
    public ResponseEntity<List<SignatureResponse>> getSignatures(@PathVariable UUID documentId,
                                                                 @AuthenticationPrincipal AuthenticatedUser actor) {
        DocumentEntity doc = documentRepository.findById(documentId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Document not found"));
                
        caseService.assertAccess(doc.getCaseId(), actor);
        
        List<DocumentSignatureEntity> signatures = signatureService.getSignaturesForDocument(documentId);
        
        List<SignatureResponse> responses = signatures.stream().map(sig -> {
            boolean isValid = signatureService.verifySignature(sig, doc.getSha256Hash());
            User user = userRepository.findById(sig.getSignedByUserId()).orElse(null);
            
            return new SignatureResponse(
                    sig.getId(),
                    sig.getDocumentId(),
                    sig.getSignedByUserId(),
                    user != null ? user.getEmail() : "Unknown",
                    user != null ? user.getFullName() : "Unknown",
                    user != null ? user.getRole().name() : "Unknown",
                    sig.getSignedAt(),
                    sig.getAlgorithm(),
                    isValid
            );
        }).collect(Collectors.toList());
        
        return ResponseEntity.ok(responses);
    }
}
