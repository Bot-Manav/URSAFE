package com.thecatalyst.dms.controller;

import com.thecatalyst.dms.dto.CaseRequest;
import com.thecatalyst.dms.dto.GrantAccessRequest;
import com.thecatalyst.dms.entity.CaseEntity;
import com.thecatalyst.dms.security.AuthenticatedUser;
import com.thecatalyst.dms.service.CaseService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/cases")
public class CaseController {

    private final CaseService caseService;

    public CaseController(CaseService caseService) {
        this.caseService = caseService;
    }

    // Route-level RBAC (who may even attempt this action) - combined with
    // the object-level BOLA check inside CaseService for the specific case.
    @PreAuthorize("hasAnyRole('ADMIN','LAW_ENFORCEMENT','INVESTIGATION_OFFICER')")
    @PostMapping
    public ResponseEntity<CaseEntity> createCase(@Valid @RequestBody CaseRequest request,
                                                  @AuthenticationPrincipal AuthenticatedUser actor,
                                                  HttpServletRequest httpRequest) {
        return ResponseEntity.ok(caseService.createCase(request, actor, RequestUtils.clientIp(httpRequest)));
    }

    @GetMapping
    public ResponseEntity<java.util.List<CaseEntity>> listCases(@AuthenticationPrincipal AuthenticatedUser actor) {
        return ResponseEntity.ok(caseService.listVisibleCases(actor));
    }

    @GetMapping("/{caseId}")
    public ResponseEntity<CaseEntity> getCase(@PathVariable UUID caseId,
                                               @AuthenticationPrincipal AuthenticatedUser actor) {
        return ResponseEntity.ok(caseService.getCase(caseId, actor));
    }

    @PostMapping("/{caseId}/access")
    public ResponseEntity<Void> grantAccess(@PathVariable UUID caseId,
                                             @Valid @RequestBody GrantAccessRequest request,
                                             @AuthenticationPrincipal AuthenticatedUser actor,
                                             HttpServletRequest httpRequest) {
        caseService.grantAccess(caseId, request.userId(), actor, RequestUtils.clientIp(httpRequest));
        return ResponseEntity.noContent().build();
    }
}
