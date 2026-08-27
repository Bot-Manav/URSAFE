package com.thecatalyst.dms.service;

import com.thecatalyst.dms.dto.CaseRequest;
import com.thecatalyst.dms.entity.CaseAccess;
import com.thecatalyst.dms.entity.CaseEntity;
import com.thecatalyst.dms.entity.Role;
import com.thecatalyst.dms.exception.ApiException;
import com.thecatalyst.dms.repository.CaseAccessRepository;
import com.thecatalyst.dms.repository.CaseRepository;
import com.thecatalyst.dms.security.AuthenticatedUser;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
public class CaseService {

    private final CaseRepository caseRepository;
    private final CaseAccessRepository caseAccessRepository;
    private final AuditService auditService;

    public CaseService(CaseRepository caseRepository,
                        CaseAccessRepository caseAccessRepository,
                        AuditService auditService) {
        this.caseRepository = caseRepository;
        this.caseAccessRepository = caseAccessRepository;
        this.auditService = auditService;
    }

    @Transactional
    public CaseEntity createCase(CaseRequest req, AuthenticatedUser actor, String ip) {
        if (caseRepository.existsByCaseNumber(req.caseNumber())) {
            throw new ApiException(HttpStatus.CONFLICT, "A case with this number already exists");
        }
        CaseEntity entity = CaseEntity.builder()
                .caseNumber(req.caseNumber())
                .title(req.title())
                .description(req.description())
                .createdBy(actor.id())
                .build();
        entity = caseRepository.save(entity);

        // Creator automatically gets access to their own case.
        caseAccessRepository.save(CaseAccess.builder()
                .caseId(entity.getId())
                .userId(actor.id())
                .grantedBy(actor.id())
                .build());

        auditService.log(actor.id(), "CASE_CREATE", entity.getId(), null, entity.getCaseNumber(), ip);
        return entity;
    }

    /**
     * SECURITY NOTE (OWASP A01: Broken Access Control / BOLA):
     * The single source of truth for "can this user touch this case".
     * ADMIN bypasses (administrative oversight); everyone else must have
     * an explicit CaseAccess grant. This is called on EVERY case and
     * document operation - never trust a valid JWT alone.
     */
    public void assertAccess(UUID caseId, AuthenticatedUser actor) {
        if (Role.ADMIN.name().equals(actor.role())) {
            return;
        }
        boolean hasAccess = caseAccessRepository.existsByCaseIdAndUserId(caseId, actor.id());
        if (!hasAccess) {
            throw new ApiException(HttpStatus.FORBIDDEN, "You do not have access to this case");
        }
    }

    @Transactional
    public void grantAccess(UUID caseId, UUID targetUserId, AuthenticatedUser actor, String ip) {
        assertAccess(caseId, actor); // must already have access to grant to others
        if (caseAccessRepository.existsByCaseIdAndUserId(caseId, targetUserId)) {
            return; // idempotent
        }
        caseAccessRepository.save(CaseAccess.builder()
                .caseId(caseId)
                .userId(targetUserId)
                .grantedBy(actor.id())
                .build());
        auditService.log(actor.id(), "GRANT_ACCESS", caseId, null, "grantee=" + targetUserId, ip);
    }

    public CaseEntity getCase(UUID caseId, AuthenticatedUser actor) {
        assertAccess(caseId, actor);
        return caseRepository.findById(caseId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Case not found"));
    }

    public List<CaseAccess> listAccessibleCaseLinks(AuthenticatedUser actor) {
        return caseAccessRepository.findByUserId(actor.id());
    }

    /**
     * Cases visible to the caller: ADMIN sees all (administrative
     * oversight); everyone else sees only cases with an explicit
     * CaseAccess grant - same BOLA boundary as assertAccess().
     */
    public List<CaseEntity> listVisibleCases(AuthenticatedUser actor) {
        if (Role.ADMIN.name().equals(actor.role())) {
            return caseRepository.findAll();
        }
        List<UUID> caseIds = caseAccessRepository.findByUserId(actor.id())
                .stream().map(CaseAccess::getCaseId).toList();
        if (caseIds.isEmpty()) {
            return List.of();
        }
        return caseRepository.findAllById(caseIds);
    }
}
