package com.thecatalyst.dms.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.List;
import java.util.Map;

@Service
public class EmailService {

    private final String brevoApiKey;
    private final String brevoSenderEmail;
    private final String brevoSenderName;
    private final RestTemplate restTemplate;

    public EmailService(@Value("${brevo.api.key:}") String brevoApiKey,
                        @Value("${brevo.sender.email:}") String brevoSenderEmail,
                        @Value("${brevo.sender.name:URSAFE DMS}") String brevoSenderName) {
        this.brevoApiKey = brevoApiKey;
        this.brevoSenderEmail = brevoSenderEmail;
        this.brevoSenderName = brevoSenderName;
        this.restTemplate = new RestTemplate();
    }

    public void sendPasswordResetEmail(String toEmail, String resetLink) {
        if (brevoApiKey == null || brevoApiKey.isBlank()) {
            System.out.println("==========================================================");
            System.out.println("BREVO API KEY NOT CONFIGURED. LOGGING EMAIL INSTEAD.");
            System.out.println("TO: " + toEmail);
            System.out.println("PASSWORD RESET LINK: " + resetLink);
            System.out.println("==========================================================");
            return;
        }

        String url = "https://api.brevo.com/v3/smtp/email";

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.set("api-key", brevoApiKey);
        headers.setAccept(List.of(MediaType.APPLICATION_JSON));

        String senderEmail = (brevoSenderEmail != null && !brevoSenderEmail.isBlank()) ? brevoSenderEmail : "no-reply@ursafe-dms.local";
        Map<String, Object> sender = Map.of("name", brevoSenderName, "email", senderEmail);
        List<Map<String, String>> to = List.of(Map.of("email", toEmail));
        
        String htmlContent = String.format(
                "<h2>Password Reset Request</h2>" +
                "<p>We received a request to reset your password for the URSAFE Document Management System.</p>" +
                "<p>Click the link below to securely reset your password. This link will expire in 15 minutes.</p>" +
                "<p><a href=\"%s\">Reset Password</a></p>" +
                "<p>If you did not request this, please ignore this email.</p>", resetLink);

        Map<String, Object> body = Map.of(
                "sender", sender,
                "to", to,
                "subject", "URSAFE DMS - Password Reset",
                "htmlContent", htmlContent
        );

        HttpEntity<Map<String, Object>> request = new HttpEntity<>(body, headers);

        try {
            restTemplate.postForEntity(url, request, String.class);
            System.out.println("Sent password reset email via Brevo to " + toEmail);
        } catch (Exception e) {
            System.err.println("Failed to send email via Brevo API: " + e.getMessage());
        }
    }
}
