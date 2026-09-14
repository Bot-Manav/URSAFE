package com.thecatalyst.dms.dto;

import java.util.List;
import java.util.Map;
import java.util.UUID;

public record AiInsightResponse(
    UUID documentId,
    String summary,
    Map<String, List<String>> extractedEntities
) {}
