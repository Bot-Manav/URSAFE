package com.thecatalyst.dms.repository;

import com.thecatalyst.dms.entity.CaseEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface CaseRepository extends JpaRepository<CaseEntity, UUID> {
    boolean existsByCaseNumber(String caseNumber);
}
