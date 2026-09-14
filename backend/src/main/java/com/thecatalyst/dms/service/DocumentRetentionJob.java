package com.thecatalyst.dms.service;

import com.thecatalyst.dms.entity.DocumentEntity;
import com.thecatalyst.dms.repository.DocumentRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Service
public class DocumentRetentionJob {

    private static final Logger logger = LoggerFactory.getLogger(DocumentRetentionJob.class);

    private final DocumentRepository documentRepository;
    private final AuditService auditService;
    
    // We'll use a system UUID for automated actions
    private static final UUID SYSTEM_ACTOR_ID = UUID.fromString("00000000-0000-0000-0000-000000000000");

    public DocumentRetentionJob(DocumentRepository documentRepository, AuditService auditService) {
        this.documentRepository = documentRepository;
        this.auditService = auditService;
    }

    // Runs every minute for testing. In prod, use "0 0 0 * * ?" for daily at midnight.
    @Scheduled(cron = "0 * * * * *")
    @Transactional
    public void processExpiredDocuments() {
        Instant now = Instant.now();
        logger.info("Running Document Retention Job at {}", now);

        List<DocumentEntity> expiredDocs = documentRepository.findExpiredDocuments(now);
        
        if (expiredDocs.isEmpty()) {
            logger.info("No expired documents found.");
            return;
        }

        for (DocumentEntity doc : expiredDocs) {
            logger.info("Archiving expired document: ID={}, RetentionDate={}", doc.getId(), doc.getRetentionDate());
            
            // Mark as archived
            doc.setArchived(true);
            documentRepository.save(doc);

            // Log securely
            auditService.log(
                SYSTEM_ACTOR_ID, 
                "DOCUMENT_ARCHIVED", 
                doc.getCaseId(), 
                doc.getId(), 
                doc.getOriginalFileName(), 
                "SYSTEM"
            );
        }
        
        logger.info("Archived {} expired documents.", expiredDocs.size());
    }
}
