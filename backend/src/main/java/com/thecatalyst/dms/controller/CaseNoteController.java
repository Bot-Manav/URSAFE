package com.thecatalyst.dms.controller;

import com.thecatalyst.dms.dto.CaseNoteResponse;
import com.thecatalyst.dms.dto.CreateCaseNoteRequest;
import com.thecatalyst.dms.security.AuthenticatedUser;
import com.thecatalyst.dms.service.CaseService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/cases/{caseId}/notes")
public class CaseNoteController {

    private final CaseService caseService;

    public CaseNoteController(CaseService caseService) {
        this.caseService = caseService;
    }

    @PostMapping
    public ResponseEntity<CaseNoteResponse> addNote(@PathVariable UUID caseId,
                                                      @Valid @RequestBody CreateCaseNoteRequest request,
                                                      @AuthenticationPrincipal AuthenticatedUser actor,
                                                      HttpServletRequest httpRequest) {
        CaseNoteResponse response = caseService.addNote(caseId, request.body(), actor, RequestUtils.clientIp(httpRequest));
        return ResponseEntity.ok(response);
    }

    @GetMapping
    public ResponseEntity<List<CaseNoteResponse>> listNotes(@PathVariable UUID caseId,
                                                              @AuthenticationPrincipal AuthenticatedUser actor) {
        return ResponseEntity.ok(caseService.listNotes(caseId, actor));
    }
}
