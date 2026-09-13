package com.thecatalyst.dms.repository;

import com.thecatalyst.dms.entity.Session;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface SessionRepository extends JpaRepository<Session, UUID> {
    Optional<Session> findByJti(String jti);
    List<Session> findByUserIdAndRevokedFalseOrderByLastSeenAtDesc(UUID userId);
    List<Session> findByUserIdAndRevokedFalseAndJtiNot(UUID userId, String jti);
}
