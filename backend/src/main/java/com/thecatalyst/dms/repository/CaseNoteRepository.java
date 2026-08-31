package com.thecatalyst.dms.repository;

import com.thecatalyst.dms.entity.CaseNoteEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.UUID;

public interface CaseNoteRepository extends JpaRepository<CaseNoteEntity, UUID> {
    List<CaseNoteEntity> findByCaseIdOrderByCreatedAtDesc(UUID caseId);
}
