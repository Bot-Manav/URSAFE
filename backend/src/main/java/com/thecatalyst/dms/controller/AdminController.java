package com.thecatalyst.dms.controller;

import com.thecatalyst.dms.dto.AdminUserStatusRequest;
import com.thecatalyst.dms.dto.UserSummary;
import com.thecatalyst.dms.entity.User;
import com.thecatalyst.dms.exception.ApiException;
import com.thecatalyst.dms.repository.UserRepository;
import com.thecatalyst.dms.security.AuthenticatedUser;
import com.thecatalyst.dms.service.AuditService;
import com.thecatalyst.dms.service.AuthService;
import com.thecatalyst.dms.entity.Role;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/admin/users")
@PreAuthorize("hasRole('ADMIN')")
public class AdminController {

    private final UserRepository userRepository;
    private final AuditService auditService;
    private final AuthService authService;

    public AdminController(UserRepository userRepository, AuditService auditService, AuthService authService) {
        this.userRepository = userRepository;
        this.auditService = auditService;
        this.authService = authService;
    }

    @GetMapping
    public ResponseEntity<List<UserSummary>> listPendingUsers(@RequestParam(required = false) String status) {
        if ("pending".equalsIgnoreCase(status)) {
            List<UserSummary> pendingUsers = userRepository.findByEnabledFalse()
                    .stream()
                    .map(u -> new UserSummary(u.getId(), u.getFullName(), u.getEmail(), u.getRole()))
                    .toList();
            return ResponseEntity.ok(pendingUsers);
        }
        // If status is not pending, return empty or all? For now, we only need pending.
        return ResponseEntity.ok(List.of());
    }

    @PatchMapping("/{id}/status")
    @Transactional
    public ResponseEntity<Void> updateUserStatus(@PathVariable UUID id,
                                                 @RequestBody AdminUserStatusRequest request,
                                                 @AuthenticationPrincipal AuthenticatedUser actor) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "User not found"));

        if ("APPROVE".equalsIgnoreCase(request.action())) {
            user.setEnabled(true);
            userRepository.save(user);
            auditService.log(actor.id(), "ACCOUNT_ENABLED", null, null, "Approved user " + user.getEmail(), "internal");
        } else if ("REJECT".equalsIgnoreCase(request.action())) {
            // Hard-delete the user since they have no associated data yet
            userRepository.delete(user);
            auditService.log(actor.id(), "ACCOUNT_REJECTED", null, null, "Rejected and deleted user " + user.getEmail(), "internal");
        } else {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Invalid action");
        }

        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/{id}/role")
    @Transactional
    public ResponseEntity<Void> updateUserRole(@PathVariable UUID id,
                                               @RequestBody com.thecatalyst.dms.dto.UpdateRoleRequest request,
                                               @AuthenticationPrincipal AuthenticatedUser actor) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "User not found"));
        
        user.setRole(request.role());
        userRepository.save(user);
        
        auditService.log(actor.id(), "ROLE_UPDATE", null, null, "Updated role for user " + user.getEmail() + " to " + request.role(), "internal");
        
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/{id}/mfa-reset")
    public ResponseEntity<Void> resetUserMfa(@PathVariable UUID id,
                                             @AuthenticationPrincipal AuthenticatedUser actor) {
        authService.resetUserMfa(id, actor.id());
        return ResponseEntity.noContent().build();
    }
}
