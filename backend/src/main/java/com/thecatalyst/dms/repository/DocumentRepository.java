package com.thecatalyst.dms.repository;

import com.thecatalyst.dms.entity.DocumentEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface DocumentRepository extends JpaRepository<DocumentEntity, UUID> {
    List<DocumentEntity> findByCaseId(UUID caseId);
}
