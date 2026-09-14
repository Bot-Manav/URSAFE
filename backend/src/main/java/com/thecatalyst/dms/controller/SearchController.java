package com.thecatalyst.dms.controller;

import com.thecatalyst.dms.dto.DocumentSummary;
import com.thecatalyst.dms.security.AuthenticatedUser;
import com.thecatalyst.dms.service.SearchService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api")
public class SearchController {

    private final SearchService searchService;

    public SearchController(SearchService searchService) {
        this.searchService = searchService;
    }

    @GetMapping("/cases/{caseId}/search")
    public ResponseEntity<List<DocumentSummary>> searchCaseDocuments(
            @PathVariable UUID caseId,
            @RequestParam(required = false) String q,
            @RequestParam(required = false) String tag,
            @AuthenticationPrincipal AuthenticatedUser actor) {
        
        List<DocumentSummary> results = searchService.searchCaseDocuments(caseId, q, tag, actor);
        return ResponseEntity.ok(results);
    }

    @GetMapping("/admin/search")
    public ResponseEntity<List<DocumentSummary>> adminCrossCaseSearch(
            @RequestParam(required = false) String q,
            @RequestParam(required = false) String tag,
            @AuthenticationPrincipal AuthenticatedUser actor) {
        
        List<DocumentSummary> results = searchService.adminCrossCaseSearch(q, tag, actor);
        return ResponseEntity.ok(results);
    }
}
