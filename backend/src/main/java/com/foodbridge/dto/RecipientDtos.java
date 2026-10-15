package com.foodbridge.dto;

import com.foodbridge.domain.OrganizationType;

import java.util.List;

public final class RecipientDtos {

    private RecipientDtos() {
    }

    public record RecipientView(
            Long recipientId,
            String organizationName,
            OrganizationType organizationType,
            String address,
            String email,
            String phoneNumber,
            Double storageCapacityKg,
            Double currentLoadKg,
            Double freeCapacityKg,
            Double demandKg,
            Integer beneficiaries,
            Double latitude,
            Double longitude,
            Boolean verified,
            List<String> preferences,
            Long allocationsCount,
            Double receivedKg) {
    }

    public record DemandUpdateRequest(
            Double storageCapacityKg,
            Double currentLoadKg,
            Double demandKg,
            Integer beneficiaries) {
    }

    public record PreferenceUpdateRequest(List<Long> categoryIds) {
    }

    public record AllocationView(
            Long allocationId,
            Long donationId,
            String foodName,
            String categoryName,
            Double quantity,
            String unit,
            String storageRequirement,
            String donorName,
            String pickupAddress,
            String pickupWindow,
            Double distanceKm,
            Double hoursToExpiry,
            Double priorityScore,
            String decisionExplanation,
            List<EngineDtos.FactorScore> factorBreakdown,
            java.time.LocalDateTime allocationTime,
            String allocationStatus,
            Long recipientId,
            String recipientName,
            String recipientAddress,
            Long assignmentId,
            String assignmentStatus,
            String volunteerName,
            String volunteerPhone,
            Long deliveryId,
            String deliveryStatus,
            java.time.LocalDateTime pickupTime,
            java.time.LocalDateTime deliveryTime) {
    }
}
