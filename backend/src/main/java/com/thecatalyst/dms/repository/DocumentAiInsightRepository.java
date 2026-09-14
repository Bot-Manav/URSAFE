package com.thecatalyst.dms.repository;

import com.thecatalyst.dms.entity.DocumentAiInsightEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface DocumentAiInsightRepository extends JpaRepository<DocumentAiInsightEntity, UUID> {
    Optional<DocumentAiInsightEntity> findByDocumentId(UUID documentId);
}
