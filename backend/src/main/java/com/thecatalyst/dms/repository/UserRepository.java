package com.thecatalyst.dms.repository;

import com.thecatalyst.dms.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

// All queries below are derived/parameterized by Spring Data JPA - no
// string-concatenated SQL anywhere in this codebase (OWASP A03: Injection).
public interface UserRepository extends JpaRepository<User, UUID> {
    Optional<User> findByEmail(String email);
    boolean existsByEmail(String email);
}
