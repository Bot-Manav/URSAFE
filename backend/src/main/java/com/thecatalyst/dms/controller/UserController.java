package com.thecatalyst.dms.controller;

import com.thecatalyst.dms.dto.UserSummary;
import com.thecatalyst.dms.repository.UserRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/users")
public class UserController {

    private final UserRepository userRepository;

    public UserController(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @GetMapping("/search")
    public ResponseEntity<List<UserSummary>> searchUsers(@RequestParam String q) {
        if (q == null || q.trim().isEmpty()) {
            return ResponseEntity.ok(List.of());
        }
        
        String query = q.trim();
        List<UserSummary> results = userRepository.findTop10ByEmailContainingIgnoreCaseOrFullNameContainingIgnoreCase(query, query)
                .stream()
                .map(u -> new UserSummary(u.getId(), u.getFullName(), u.getEmail(), u.getRole()))
                .toList();

        return ResponseEntity.ok(results);
    }
}
