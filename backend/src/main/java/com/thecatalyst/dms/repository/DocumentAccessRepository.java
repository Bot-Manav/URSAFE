package com.thecatalyst.dms.repository;

import com.thecatalyst.dms.entity.DocumentAccessEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface DocumentAccessRepository extends JpaRepository<DocumentAccessEntity, UUID> {
    Optional<DocumentAccessEntity> findByDocumentGroupIdAndUserId(UUID documentGroupId, UUID userId);
}
