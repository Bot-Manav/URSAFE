package com.thecatalyst.dms.repository;

import com.thecatalyst.dms.entity.DocumentEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;
import java.util.UUID;

public interface DocumentRepository extends JpaRepository<DocumentEntity, UUID> {
    List<DocumentEntity> findByCaseId(UUID caseId);
    List<DocumentEntity> findByCaseIdAndIsDeletedFalse(UUID caseId);

    @Query("SELECT MAX(d.version) FROM DocumentEntity d WHERE d.documentGroupId = :groupId")
    Integer findMaxVersionByGroupId(@Param("groupId") UUID groupId);
}
