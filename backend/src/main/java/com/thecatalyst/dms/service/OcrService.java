package com.thecatalyst.dms.service;

import com.thecatalyst.dms.entity.DocumentEntity;
import com.thecatalyst.dms.repository.DocumentRepository;
import net.sourceforge.tess4j.ITesseract;
import net.sourceforge.tess4j.Tesseract;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.UUID;

@Service
public class OcrService {

    private final DocumentRepository documentRepository;
    private final EncryptionService encryptionService;
    private final String tessdataPath;

    public OcrService(DocumentRepository documentRepository,
                      EncryptionService encryptionService,
                      @Value("${app.ocr.tessdata-path:./tessdata}") String tessdataPath) {
        this.documentRepository = documentRepository;
        this.encryptionService = encryptionService;
        this.tessdataPath = tessdataPath;
    }

    @Async
    @Transactional
    public void processAsync(UUID documentId, byte[] plaintextBytes, String extension) {
        DocumentEntity doc = documentRepository.findById(documentId).orElse(null);
        if (doc == null) return;

        if (extension == null || (!extension.equalsIgnoreCase("png") && !extension.equalsIgnoreCase("jpg") && !extension.equalsIgnoreCase("jpeg"))) {
            doc.setOcrStatus("NOT_APPLICABLE");
            documentRepository.save(doc);
            return;
        }

        try {
            ITesseract tesseract = new Tesseract();
            tesseract.setDatapath(tessdataPath);
            
            BufferedImage image = ImageIO.read(new ByteArrayInputStream(plaintextBytes));
            if (image == null) {
                doc.setOcrStatus("FAILED");
                documentRepository.save(doc);
                return;
            }

            String extractedText = tesseract.doOCR(image);
            
            if (extractedText == null || extractedText.trim().isEmpty()) {
                doc.setOcrStatus("COMPLETED");
                documentRepository.save(doc);
                return;
            }

            byte[] textBytes = extractedText.getBytes(StandardCharsets.UTF_8);
            EncryptionService.EncryptedPayload encrypted = encryptionService.encrypt(textBytes);
            
            doc.setEncryptedOcrTextBase64(Base64.getEncoder().encodeToString(encrypted.ciphertext()));
            doc.setOcrIvBase64(Base64.getEncoder().encodeToString(encrypted.iv()));
            doc.setOcrStatus("COMPLETED");
            
            documentRepository.save(doc);

        } catch (Exception e) {
            e.printStackTrace();
            doc.setOcrStatus("FAILED");
            documentRepository.save(doc);
        }
    }
}
