package com.thecatalyst.dms.service;

import com.thecatalyst.dms.dto.DocumentCommentRequest;
import com.thecatalyst.dms.dto.DocumentCommentResponse;
import com.thecatalyst.dms.entity.DocumentCommentEntity;
import com.thecatalyst.dms.entity.DocumentEntity;
import com.thecatalyst.dms.entity.User;
import com.thecatalyst.dms.exception.ApiException;
import com.thecatalyst.dms.repository.DocumentCommentRepository;
import com.thecatalyst.dms.repository.DocumentRepository;
import com.thecatalyst.dms.repository.UserRepository;
import com.thecatalyst.dms.security.AuthenticatedUser;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class DocumentCommentService {

    private final DocumentCommentRepository documentCommentRepository;
    private final DocumentRepository documentRepository;
    private final CaseService caseService;
    private final UserRepository userRepository;
    private final NotificationService notificationService;

    public DocumentCommentService(DocumentCommentRepository documentCommentRepository,
                                  DocumentRepository documentRepository,
                                  CaseService caseService,
                                  UserRepository userRepository,
                                  NotificationService notificationService) {
        this.documentCommentRepository = documentCommentRepository;
        this.documentRepository = documentRepository;
        this.caseService = caseService;
        this.userRepository = userRepository;
        this.notificationService = notificationService;
    }

    @Transactional(readOnly = true)
    public List<DocumentCommentResponse> getComments(UUID documentId, AuthenticatedUser actor) {
        DocumentEntity doc = documentRepository.findById(documentId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Document not found"));
        
        caseService.assertAccess(doc.getCaseId(), actor);
        
        List<DocumentCommentEntity> comments = documentCommentRepository.findByDocumentIdOrderByCreatedAtAsc(documentId);
        
        List<UUID> authorIds = comments.stream().map(DocumentCommentEntity::getAuthorId).collect(Collectors.toList());
        Map<UUID, String> authors = userRepository.findAllById(authorIds).stream()
                .collect(Collectors.toMap(User::getId, User::getFullName));
                
        return comments.stream()
                .map(c -> new DocumentCommentResponse(c.getId(), c.getDocumentId(), c.getAuthorId(), 
                        authors.getOrDefault(c.getAuthorId(), "Unknown User"), c.getBody(), c.getCreatedAt()))
                .collect(Collectors.toList());
    }

    @Transactional
    public DocumentCommentResponse addComment(UUID documentId, DocumentCommentRequest request, AuthenticatedUser actor) {
        DocumentEntity doc = documentRepository.findById(documentId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Document not found"));
                
        caseService.assertAccess(doc.getCaseId(), actor);
        
        DocumentCommentEntity comment = DocumentCommentEntity.builder()
                .documentId(documentId)
                .authorId(actor.id())
                .body(request.body())
                .build();
                
        comment = documentCommentRepository.save(comment);
        
        if (!doc.getUploadedBy().equals(actor.id())) {
            User author = userRepository.findById(actor.id()).orElse(null);
            String authorName = author != null ? author.getFullName() : "Someone";
            notificationService.notifyUser(doc.getUploadedBy(), authorName + " commented on your document " + doc.getOriginalFileName());
        }
        
        User user = userRepository.findById(actor.id()).orElseThrow();
        
        return new DocumentCommentResponse(comment.getId(), comment.getDocumentId(), comment.getAuthorId(), 
                user.getFullName(), comment.getBody(), comment.getCreatedAt());
    }
}
