package com.thecatalyst.dms.service;

import com.thecatalyst.dms.dto.CaseRequest;
import com.thecatalyst.dms.dto.CaseNoteResponse;
import com.thecatalyst.dms.entity.CaseAccess;
import com.thecatalyst.dms.entity.CaseEntity;
import com.thecatalyst.dms.entity.CaseNoteEntity;
import com.thecatalyst.dms.entity.Role;
import com.thecatalyst.dms.exception.ApiException;
import com.thecatalyst.dms.repository.CaseAccessRepository;
import com.thecatalyst.dms.repository.CaseRepository;
import com.thecatalyst.dms.repository.CaseNoteRepository;
import com.thecatalyst.dms.repository.UserRepository;
import com.thecatalyst.dms.security.AuthenticatedUser;
import com.thecatalyst.dms.dto.GrantAccessRequest;
import com.thecatalyst.dms.entity.User;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import com.thecatalyst.dms.entity.CaseStatus;

@Service
public class CaseService {

    private static final Map<CaseStatus, Set<CaseStatus>> ALLOWED_TRANSITIONS = Map.of(
            CaseStatus.OPEN, Set.of(CaseStatus.UNDER_INVESTIGATION, CaseStatus.CLOSED),
            CaseStatus.UNDER_INVESTIGATION, Set.of(CaseStatus.CLOSED),
            CaseStatus.CLOSED, Set.of(CaseStatus.ARCHIVED)
    );

    private final CaseRepository caseRepository;
    private final CaseAccessRepository caseAccessRepository;
    private final AuditService auditService;
    private final UserRepository userRepository;
    private final CaseNoteRepository caseNoteRepository;

    public CaseService(CaseRepository caseRepository,
                        CaseAccessRepository caseAccessRepository,
                        AuditService auditService,
                        UserRepository userRepository,
                        CaseNoteRepository caseNoteRepository) {
        this.caseRepository = caseRepository;
        this.caseAccessRepository = caseAccessRepository;
        this.auditService = auditService;
        this.userRepository = userRepository;
        this.caseNoteRepository = caseNoteRepository;
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
    public void grantAccess(UUID caseId, GrantAccessRequest request, AuthenticatedUser actor, String ip) {
        assertAccess(caseId, actor); // must already have access to grant to others
        
        if (request.userId() != null) {
            grantAccessToUser(caseId, request.userId(), actor.id(), ip);
        }
        
        if (request.role() != null) {
            List<User> users = userRepository.findByRole(request.role());
            for (User u : users) {
                grantAccessToUser(caseId, u.getId(), actor.id(), ip);
            }
        }
    }

    private void grantAccessToUser(UUID caseId, UUID targetUserId, UUID actorId, String ip) {
        if (caseAccessRepository.existsByCaseIdAndUserId(caseId, targetUserId)) {
            return; // idempotent
        }
        caseAccessRepository.save(CaseAccess.builder()
                .caseId(caseId)
                .userId(targetUserId)
                .grantedBy(actorId)
                .build());
        auditService.log(actorId, "GRANT_ACCESS", caseId, null, "grantee=" + targetUserId, ip);
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

    @Transactional
    public CaseEntity updateCaseStatus(UUID caseId, CaseStatus newStatus, AuthenticatedUser actor, String ip) {
        CaseEntity caseEntity = getCase(caseId, actor);
        CaseStatus currentStatus = caseEntity.getStatus();

        if (currentStatus == newStatus) {
            return caseEntity;
        }

        Set<CaseStatus> allowedNextStates = ALLOWED_TRANSITIONS.getOrDefault(currentStatus, Set.of());
        if (!allowedNextStates.contains(newStatus)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, 
                "Cannot transition case from " + currentStatus + " to " + newStatus);
        }

        // Role-based validation
        String role = actor.role();
        boolean roleAllowed = switch (newStatus) {
            case UNDER_INVESTIGATION -> role.equals(Role.ADMIN.name()) || role.equals(Role.LAW_ENFORCEMENT.name()) || role.equals(Role.INVESTIGATION_OFFICER.name());
            case CLOSED -> role.equals(Role.ADMIN.name()) || role.equals(Role.LAW_ENFORCEMENT.name());
            case ARCHIVED -> role.equals(Role.ADMIN.name()) || role.equals(Role.LEGAL_COURT.name());
            default -> false;
        };

        if (!roleAllowed) {
            throw new ApiException(HttpStatus.FORBIDDEN, 
                "Your role (" + role + ") is not authorized to transition cases to " + newStatus);
        }

        caseEntity.setStatus(newStatus);
        caseEntity = caseRepository.save(caseEntity);
        auditService.log(actor.id(), "CASE_STATUS_CHANGE", caseId, null, currentStatus + " -> " + newStatus, ip);
        return caseEntity;
    }

    @Transactional
    public CaseNoteResponse addNote(UUID caseId, String body, AuthenticatedUser actor, String ip) {
        assertAccess(caseId, actor);
        CaseNoteEntity note = CaseNoteEntity.builder()
                .caseId(caseId)
                .authorId(actor.id())
                .body(body)
                .build();
        note = caseNoteRepository.save(note);
        auditService.log(actor.id(), "ADD_NOTE", caseId, note.getId(), "Added case note", ip);
        
        User author = userRepository.findById(actor.id()).orElse(null);
        String authorName = author != null ? author.getFullName() : "Unknown";
        
        return new CaseNoteResponse(note.getId(), note.getCaseId(), note.getAuthorId(), authorName, note.getBody(), note.getCreatedAt());
    }

    public List<CaseNoteResponse> listNotes(UUID caseId, AuthenticatedUser actor) {
        assertAccess(caseId, actor);
        return caseNoteRepository.findByCaseIdOrderByCreatedAtDesc(caseId).stream().map(note -> {
            User author = userRepository.findById(note.getAuthorId()).orElse(null);
            String authorName = author != null ? author.getFullName() : "Unknown";
            return new CaseNoteResponse(note.getId(), note.getCaseId(), note.getAuthorId(), authorName, note.getBody(), note.getCreatedAt());
        }).toList();
    }
}
