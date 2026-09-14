package com.thecatalyst.dms.repository;

import com.thecatalyst.dms.entity.DocumentCommentEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface DocumentCommentRepository extends JpaRepository<DocumentCommentEntity, UUID> {
    List<DocumentCommentEntity> findByDocumentIdOrderByCreatedAtAsc(UUID documentId);
}
