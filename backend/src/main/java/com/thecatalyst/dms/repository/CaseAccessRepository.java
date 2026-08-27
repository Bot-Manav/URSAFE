package com.thecatalyst.dms.repository;

import com.thecatalyst.dms.entity.CaseAccess;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface CaseAccessRepository extends JpaRepository<CaseAccess, UUID> {
    boolean existsByCaseIdAndUserId(UUID caseId, UUID userId);
    List<CaseAccess> findByUserId(UUID userId);
    List<CaseAccess> findByCaseId(UUID caseId);
}
