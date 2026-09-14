package com.thecatalyst.dms.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.thecatalyst.dms.entity.DocumentAiInsightEntity;
import com.thecatalyst.dms.entity.DocumentEntity;
import com.thecatalyst.dms.repository.DocumentAiInsightRepository;
import com.thecatalyst.dms.repository.DocumentRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
public class AiProcessingService {

    private final DocumentAiInsightRepository documentAiInsightRepository;
    private final DocumentRepository documentRepository;
    private final EncryptionService encryptionService;
    private final ObjectMapper objectMapper;

    // Basic Regex Patterns for Mock Extraction
    private static final Pattern DATE_PATTERN = Pattern.compile("\\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]* \\d{1,2}, \\d{4}\\b|\\b\\d{1,2}[/-]\\d{1,2}[/-]\\d{2,4}\\b");
    private static final Pattern MONEY_PATTERN = Pattern.compile("\\$[0-9]{1,3}(?:,[0-9]{3})*(?:\\.[0-9]{2})?|\\b(?:USD|EUR|GBP) [0-9]{1,3}(?:,[0-9]{3})*(?:\\.[0-9]{2})?\\b");
    private static final Pattern EMAIL_PATTERN = Pattern.compile("[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,6}");
    private static final Pattern PHONE_PATTERN = Pattern.compile("\\b(?:\\+?\\d{1,3}[-.\\s]?)?\\(?\\d{3}\\)?[-.\\s]?\\d{3}[-.\\s]?\\d{4}\\b");

    public AiProcessingService(DocumentAiInsightRepository documentAiInsightRepository,
                               DocumentRepository documentRepository,
                               EncryptionService encryptionService,
                               ObjectMapper objectMapper) {
        this.documentAiInsightRepository = documentAiInsightRepository;
        this.documentRepository = documentRepository;
        this.encryptionService = encryptionService;
        this.objectMapper = objectMapper;
    }

    @Transactional
    public void processAndStore(UUID documentId, String extractedText) {
        if (extractedText == null || extractedText.trim().isEmpty()) return;

        // 1. Classification
        String tag = classify(extractedText);
        
        // Update document tag if it was OTHER (default)
        documentRepository.findById(documentId).ifPresent(doc -> {
            if (doc.getTag() == com.thecatalyst.dms.entity.DocumentTag.OTHER) {
                try {
                    doc.setTag(com.thecatalyst.dms.entity.DocumentTag.valueOf(tag));
                    documentRepository.save(doc);
                } catch (IllegalArgumentException e) {
                    // Ignore if tag doesn't match enum perfectly
                }
            }
        });

        // 2. Summarization
        String summary = summarize(extractedText);

        // 3. Entity Extraction
        Map<String, List<String>> entities = extractEntities(extractedText);

        try {
            // Encrypt and store
            EncryptionService.EncryptedPayload encryptedSummary = encryptionService.encrypt(summary.getBytes(StandardCharsets.UTF_8));
            String entitiesJson = objectMapper.writeValueAsString(entities);
            EncryptionService.EncryptedPayload encryptedEntities = encryptionService.encrypt(entitiesJson.getBytes(StandardCharsets.UTF_8));

            DocumentAiInsightEntity insight = DocumentAiInsightEntity.builder()
                    .documentId(documentId)
                    .encryptedSummaryBase64(Base64.getEncoder().encodeToString(encryptedSummary.ciphertext()))
                    .encryptedEntitiesJsonBase64(Base64.getEncoder().encodeToString(encryptedEntities.ciphertext()))
                    .ivBase64(Base64.getEncoder().encodeToString(encryptedSummary.iv())) // Shared IV for simplicity, but in prod could be separate
                    .build();

            documentAiInsightRepository.save(insight);
        } catch (Exception e) {
            e.printStackTrace();
            System.err.println("Failed to process AI Insights for document " + documentId);
        }
    }

    private String classify(String text) {
        String lowerText = text.toLowerCase();
        if (lowerText.contains("warrant") || lowerText.contains("arrest") || lowerText.contains("subpoena")) return "WARRANT";
        if (lowerText.contains("invoice") || lowerText.contains("receipt") || lowerText.contains("payment")) return "FINANCIAL_RECORD";
        if (lowerText.contains("statement") || lowerText.contains("testimony") || lowerText.contains("witness")) return "WITNESS_STATEMENT";
        if (lowerText.contains("forensic") || lowerText.contains("dna") || lowerText.contains("ballistics")) return "FORENSIC_REPORT";
        if (lowerText.contains("court") || lowerText.contains("docket") || lowerText.contains("judge")) return "COURT_ORDER";
        return "EVIDENCE_LOG";
    }

    private String summarize(String text) {
        // Simple heuristic: Take first 2-3 sentences.
        String[] sentences = text.split("(?<=[.!?])\\s+");
        StringBuilder summary = new StringBuilder();
        int count = Math.min(3, sentences.length);
        for (int i = 0; i < count; i++) {
            summary.append(sentences[i].trim()).append(" ");
        }
        String result = summary.toString().trim();
        if (result.isEmpty()) return "No clear summary could be extracted.";
        return result;
    }

    private Map<String, List<String>> extractEntities(String text) {
        Map<String, List<String>> entities = new HashMap<>();
        entities.put("Dates", extractRegex(DATE_PATTERN, text));
        entities.put("Amounts", extractRegex(MONEY_PATTERN, text));
        entities.put("Emails", extractRegex(EMAIL_PATTERN, text));
        entities.put("Phones", extractRegex(PHONE_PATTERN, text));
        return entities;
    }

    private List<String> extractRegex(Pattern pattern, String text) {
        Set<String> matches = new HashSet<>();
        Matcher matcher = pattern.matcher(text);
        while (matcher.find()) {
            matches.add(matcher.group());
        }
        return new ArrayList<>(matches);
    }
}
