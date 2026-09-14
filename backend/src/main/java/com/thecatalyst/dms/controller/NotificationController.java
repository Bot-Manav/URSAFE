package com.thecatalyst.dms.controller;

import com.thecatalyst.dms.dto.NotificationResponse;
import com.thecatalyst.dms.security.AuthenticatedUser;
import com.thecatalyst.dms.service.NotificationService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/notifications")
public class NotificationController {
    
    private final NotificationService notificationService;

    public NotificationController(NotificationService notificationService) {
        this.notificationService = notificationService;
    }

    @GetMapping
    public ResponseEntity<List<NotificationResponse>> getNotifications(@AuthenticationPrincipal AuthenticatedUser actor) {
        return ResponseEntity.ok(notificationService.getMyNotifications(actor));
    }

    @PatchMapping("/{notificationId}/read")
    public ResponseEntity<Void> markAsRead(@PathVariable UUID notificationId, @AuthenticationPrincipal AuthenticatedUser actor) {
        notificationService.markAsRead(notificationId, actor);
        return ResponseEntity.noContent().build();
    }
}
