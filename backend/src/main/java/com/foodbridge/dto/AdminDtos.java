package com.foodbridge.dto;

import com.foodbridge.domain.AccountStatus;
import com.foodbridge.domain.UserRole;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

public final class AdminDtos {

    private AdminDtos() {
    }

    public record UserAdminView(
            Long userId,
            String fullName,
            String email,
            String phoneNumber,
            UserRole role,
            AccountStatus accountStatus,
            Boolean verified,
            String organizationName,
            String organizationType,
            LocalDateTime createdAt,
            LocalDateTime lastLogin) {
    }

    public record AuditLogView(
            Long logId,
            String actor,
            String module,
            String action,
            LocalDateTime timestamp,
            String description) {
    }

    public record SystemHealth(
            String status,
            String database,
            long uptimeSeconds,
            String applicationVersion,
            Map<String, Long> entityCounts,
            List<String> activeComponents) {
    }

    public record DemoStep(int order, String title, String description, String status, Map<String, Object> data) {
    }

    public record DemoScenarioResponse(
            String scenarioId,
            String narrative,
            List<DemoStep> steps,
            Long donationId,
            Long allocationId,
            String recommendedRecipient,
            Double priorityScore,
            List<EngineDtos.RecipientCandidate> ranked,
            String decisionExplanation) {
    }
}
