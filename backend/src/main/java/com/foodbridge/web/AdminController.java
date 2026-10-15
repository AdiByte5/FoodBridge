package com.foodbridge.web;

import com.foodbridge.domain.AccountStatus;
import com.foodbridge.dto.AdminDtos;
import com.foodbridge.repo.UserRepository;
import com.foodbridge.security.UserPrincipal;
import com.foodbridge.service.AdminService;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin")
public class AdminController {

    private final AdminService adminService;
    private final UserRepository userRepository;

    public AdminController(AdminService adminService, UserRepository userRepository) {
        this.adminService = adminService;
        this.userRepository = userRepository;
    }

    @GetMapping("/users")
    public List<AdminDtos.UserAdminView> users() {
        return adminService.users();
    }

    @PostMapping("/users/{userId}/verify")
    public AdminDtos.UserAdminView verify(@PathVariable Long userId,
                                          @AuthenticationPrincipal UserPrincipal principal) {
        return adminService.verify(userId, actor(principal));
    }

    @PatchMapping("/users/{userId}/status")
    public AdminDtos.UserAdminView updateStatus(@PathVariable Long userId,
                                                @RequestBody Map<String, String> body,
                                                @AuthenticationPrincipal UserPrincipal principal) {
        AccountStatus status = AccountStatus.valueOf(body.getOrDefault("status", "ACTIVE").toUpperCase());
        return adminService.updateStatus(userId, status, actor(principal));
    }

    @GetMapping("/audit-logs")
    public List<AdminDtos.AuditLogView> auditLogs(@RequestParam(defaultValue = "100") int limit) {
        return adminService.auditLogs(limit);
    }

    @GetMapping("/system-health")
    public AdminDtos.SystemHealth systemHealth() {
        return adminService.health();
    }

    private com.foodbridge.domain.User actor(UserPrincipal principal) {
        return userRepository.findById(principal.userId()).orElse(null);
    }
}
