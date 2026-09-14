package com.thecatalyst.dms.service;

import com.thecatalyst.dms.dto.DocumentSummary;
import com.thecatalyst.dms.entity.DocumentEntity;
import com.thecatalyst.dms.repository.DocumentRepository;
import com.thecatalyst.dms.repository.DocumentSearchIndexRepository;
import com.thecatalyst.dms.security.AuthenticatedUser;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.stream.Collectors;

@Service
public class SearchService {
    
    private final DocumentRepository documentRepository;
    private final DocumentSearchIndexRepository searchIndexRepository;
    private final HashingService hashingService;
    private final CaseService caseService;
    private final DocumentService documentService;

    public SearchService(DocumentRepository documentRepository,
                         DocumentSearchIndexRepository searchIndexRepository,
                         HashingService hashingService,
                         CaseService caseService,
                         DocumentService documentService) {
        this.documentRepository = documentRepository;
        this.searchIndexRepository = searchIndexRepository;
        this.hashingService = hashingService;
        this.caseService = caseService;
        this.documentService = documentService;
    }

    @Transactional(readOnly = true)
    public List<DocumentSummary> searchCaseDocuments(UUID caseId, String keyword, String tag, AuthenticatedUser actor) {
        caseService.assertAccess(caseId, actor);
        
        List<DocumentEntity> docs = documentRepository.findByCaseIdAndIsDeletedFalse(caseId);
        
        if (tag != null && !tag.isEmpty()) {
            docs = docs.stream().filter(d -> d.getTag().name().equalsIgnoreCase(tag)).collect(Collectors.toList());
        }
        
        if (keyword != null && !keyword.trim().isEmpty()) {
            Set<UUID> matchedDocIds = getMatchedDocumentIdsFromIndex(keyword);
            docs = docs.stream()
                .filter(d -> {
                    if (d.getOriginalFileName() != null && d.getOriginalFileName().toLowerCase().contains(keyword.toLowerCase())) return true;
                    return matchedDocIds.contains(d.getId());
                })
                .collect(Collectors.toList());
        }
        
        return docs.stream().map(documentService::toResponse).collect(Collectors.toList());
    }
    
    @Transactional(readOnly = true)
    public List<DocumentSummary> adminCrossCaseSearch(String keyword, String tag, AuthenticatedUser actor) {
        if (!"ADMIN".equals(actor.role())) {
            throw new com.thecatalyst.dms.exception.ApiException(org.springframework.http.HttpStatus.FORBIDDEN, "Admin only");
        }
        
        List<DocumentEntity> docs;
        
        if (keyword != null && !keyword.trim().isEmpty()) {
            Set<UUID> matchedDocIds = getMatchedDocumentIdsFromIndex(keyword);
            
            // Fetch by blind index
            List<DocumentEntity> indexDocs = documentRepository.findAllById(matchedDocIds).stream()
                    .filter(d -> !d.isDeleted())
                    .collect(Collectors.toList());
                    
            // Fetch by filename
            List<DocumentEntity> fileDocs = documentRepository.findByOriginalFileNameContainingIgnoreCaseAndIsDeletedFalse(keyword);
            
            // Union
            Set<DocumentEntity> combined = new HashSet<>(indexDocs);
            combined.addAll(fileDocs);
            docs = new ArrayList<>(combined);
            
        } else {
            docs = documentRepository.findAll().stream()
                    .filter(d -> !d.isDeleted())
                    .collect(Collectors.toList());
        }
        
        if (tag != null && !tag.isEmpty()) {
            docs = docs.stream().filter(d -> d.getTag().name().equalsIgnoreCase(tag)).collect(Collectors.toList());
        }
        
        return docs.stream().map(documentService::toResponse).collect(Collectors.toList());
    }
    
    private Set<UUID> getMatchedDocumentIdsFromIndex(String keyword) {
        String[] words = keyword.toLowerCase().split("[^a-z0-9]+");
        List<String> queryHashes = Arrays.stream(words)
            .filter(w -> w.length() > 2)
            .map(hashingService::hmacSha256)
            .collect(Collectors.toList());
            
        if (queryHashes.isEmpty()) {
            return Collections.emptySet();
        }
        
        return new HashSet<>(searchIndexRepository.findDocumentIdsByWordHashes(queryHashes));
    }
}
