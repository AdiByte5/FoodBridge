package com.foodbridge.service;

import com.foodbridge.domain.AuditLog;
import com.foodbridge.domain.User;
import com.foodbridge.dto.AdminDtos;
import com.foodbridge.repo.AuditLogRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
public class AuditService {

    private final AuditLogRepository auditLogRepository;

    public AuditService(AuditLogRepository auditLogRepository) {
        this.auditLogRepository = auditLogRepository;
    }

    @Transactional
    public void record(User user, String module, String action, String description) {
        auditLogRepository.save(AuditLog.builder()
                .user(user)
                .module(module)
                .action(action)
                .timestamp(LocalDateTime.now())
                .description(description)
                .build());
    }

    @Transactional(readOnly = true)
    public List<AdminDtos.AuditLogView> recent(int limit) {
        List<AuditLog> logs = auditLogRepository.findTop100ByOrderByTimestampDesc();
        return logs.stream()
                .limit(limit)
                .map(log -> new AdminDtos.AuditLogView(
                        log.getLogId(),
                        log.getUser() == null ? "system" : log.getUser().getFullName(),
                        log.getModule(),
                        log.getAction(),
                        log.getTimestamp(),
                        log.getDescription()))
                .toList();
    }
}
