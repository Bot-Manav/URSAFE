package com.thecatalyst.dms.repository;

import com.thecatalyst.dms.entity.NotificationEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface NotificationRepository extends JpaRepository<NotificationEntity, UUID> {
    List<NotificationEntity> findByUserIdOrderByCreatedAtDesc(UUID userId);
    List<NotificationEntity> findByUserIdAndIsReadFalseOrderByCreatedAtDesc(UUID userId);
}
