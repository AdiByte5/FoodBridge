package com.foodbridge.dto;

import com.foodbridge.domain.AvailabilityStatus;

import java.time.LocalDateTime;

public final class VolunteerDtos {

    private VolunteerDtos() {
    }

    public record VolunteerView(
            Long volunteerId,
            String name,
            String email,
            String phoneNumber,
            String vehicleType,
            AvailabilityStatus availabilityStatus,
            String currentLocation,
            Double latitude,
            Double longitude,
            Integer completedDeliveries,
            Integer activeDeliveries) {
    }

    public record AvailabilityUpdateRequest(
            AvailabilityStatus availabilityStatus,
            String currentLocation,
            Double latitude,
            Double longitude,
            String vehicleType) {
    }

    public record AssignmentView(
            Long assignmentId,
            Long allocationId,
            Long donationId,
            String foodName,
            String categoryName,
            Double quantity,
            String unit,
            String storageRequirement,
            String donorName,
            String pickupAddress,
            Double pickupLatitude,
            Double pickupLongitude,
            String pickupWindow,
            String recipientName,
            String recipientAddress,
            Double recipientLatitude,
            Double recipientLongitude,
            LocalDateTime expiryTime,
            Double hoursToExpiry,
            Double matchScore,
            String matchExplanation,
            LocalDateTime assignedTime,
            String assignmentStatus,
            Long deliveryId,
            String deliveryStatus,
            LocalDateTime pickupTime,
            LocalDateTime deliveryTime,
            Double distanceKm,
            String route) {
    }
}
