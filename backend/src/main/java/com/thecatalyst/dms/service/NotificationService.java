package com.thecatalyst.dms.service;

import com.thecatalyst.dms.dto.NotificationResponse;
import com.thecatalyst.dms.entity.NotificationEntity;
import com.thecatalyst.dms.repository.NotificationRepository;
import com.thecatalyst.dms.security.AuthenticatedUser;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class NotificationService {
    
    private final NotificationRepository notificationRepository;

    public NotificationService(NotificationRepository notificationRepository) {
        this.notificationRepository = notificationRepository;
    }

    @Transactional
    public void notifyUser(UUID userId, String message) {
        NotificationEntity notification = NotificationEntity.builder()
                .userId(userId)
                .message(message)
                .build();
        notificationRepository.save(notification);
    }

    @Transactional(readOnly = true)
    public List<NotificationResponse> getMyNotifications(AuthenticatedUser actor) {
        return notificationRepository.findByUserIdOrderByCreatedAtDesc(actor.id()).stream()
                .map(n -> new NotificationResponse(n.getId(), n.getMessage(), n.isRead(), n.getCreatedAt()))
                .collect(Collectors.toList());
    }
    
    @Transactional
    public void markAsRead(UUID notificationId, AuthenticatedUser actor) {
        notificationRepository.findById(notificationId).ifPresent(n -> {
            if (n.getUserId().equals(actor.id())) {
                n.setRead(true);
                notificationRepository.save(n);
            }
        });
    }
}
