package com.foodbridge.dto;

import java.time.LocalDateTime;
import java.util.List;

public final class EngineDtos {

    private EngineDtos() {
    }

    public record FactorScore(
            String key,
            String label,
            double score,
            double weight,
            double contribution,
            String detail) {
    }

    public record RecipientCandidate(
            Long recipientId,
            String organizationName,
            String organizationType,
            String address,
            Double distanceKm,
            Integer arrivalMinutes,
            Integer spareMinutes,
            Double freeCapacityKg,
            Double demandKg,
            boolean preferenceMatch,
            long allocationsLast30Days,
            double receivedLast30DaysKg,
            double totalScore,
            List<FactorScore> factors,
            String explanation,
            boolean excluded,
            String exclusionReason) {
    }

    public record RecommendationResponse(
            Long donationId,
            String foodName,
            Double quantity,
            String unit,
            String categoryName,
            Double hoursToExpiry,
            LocalDateTime evaluatedAt,
            int eligibleCount,
            int excludedCount,
            List<RecipientCandidate> ranked,
            RecipientCandidate recommended,
            String summary,
            List<String> appliedFilters,
            List<EngineWeight> weights,
            SafetyRule safetyRule) {
    }

    public record EngineWeight(String key, String label, double weight, String description) {
    }

    /**
     * The food-safety rule that runs before scoring: food must be able to reach
     * the recipient with enough time left to serve it safely.
     */
    public record SafetyRule(
            double urbanSpeedKmh,
            int handlingMinutes,
            int serveBufferMinutes,
            String description) {
    }

    public record VolunteerCandidate(
            Long volunteerId,
            String name,
            String vehicleType,
            String availabilityStatus,
            Double distanceKm,
            int activeDeliveries,
            int completedDeliveries,
            double matchScore,
            String explanation) {
    }

    public record VolunteerMatchResponse(
            Long allocationId,
            String foodName,
            String pickupAddress,
            String recipientName,
            List<VolunteerCandidate> ranked,
            VolunteerCandidate recommended,
            String summary) {
    }
}
