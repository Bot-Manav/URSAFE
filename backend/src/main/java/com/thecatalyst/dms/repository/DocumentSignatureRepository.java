package com.thecatalyst.dms.repository;

import com.thecatalyst.dms.entity.DocumentSignatureEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface DocumentSignatureRepository extends JpaRepository<DocumentSignatureEntity, UUID> {
    
    List<DocumentSignatureEntity> findByDocumentIdOrderBySignedAtDesc(UUID documentId);
    
}
