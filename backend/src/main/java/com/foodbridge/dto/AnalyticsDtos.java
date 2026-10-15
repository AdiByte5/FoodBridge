package com.foodbridge.dto;

import java.util.List;
import java.util.Map;

public final class AnalyticsDtos {

    private AnalyticsDtos() {
    }

    public record TrendPoint(String date, String label, long donations, double kgRescued, long completed) {
    }

    public record Slice(String name, double value, double kg) {
    }

    public record FairnessPoint(String organizationName, double kgReceived, long allocations) {
    }

    public record LeaderboardRow(String name, int completedDeliveries, int activeDeliveries, String vehicleType) {
    }

    public record ActivityItem(String timestamp, String module, String action, String description, String actor) {
    }

    public record AnalyticsOverview(
            long totalDonations,
            long activeDonations,
            long completedDonations,
            long cancelledDonations,
            double totalKgRescued,
            long estimatedMeals,
            long activeVolunteers,
            long totalVolunteers,
            long verifiedOrganizations,
            long totalRecipients,
            long allocationsTotal,
            long allocationsAccepted,
            double allocationAcceptanceRate,
            double avgDeliveryHours,
            long expiringSoon,
            double avgPriorityScore,
            long pendingVerifications,
            Map<String, Long> usersByRole) {
    }

    public record AnalyticsResponse(
            AnalyticsOverview overview,
            List<TrendPoint> donationTrend,
            List<Slice> categoryDistribution,
            List<Slice> statusFunnel,
            List<FairnessPoint> fairness,
            List<LeaderboardRow> volunteerLeaderboard,
            List<ActivityItem> recentActivity,
            List<EngineDtos.EngineWeight> engineWeights) {
    }
}
