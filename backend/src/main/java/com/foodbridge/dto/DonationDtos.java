package com.foodbridge.dto;

import com.foodbridge.domain.DonationStatus;
import com.foodbridge.domain.StorageRequirement;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

import java.time.LocalDateTime;

public final class DonationDtos {

    private DonationDtos() {
    }

    public record CreateDonationRequest(
            @NotBlank String foodName,
            Long categoryId,
            @NotNull @Positive Double quantity,
            String unit,
            @NotNull LocalDateTime expiryTime,
            String pickupAddress,
            LocalDateTime pickupStart,
            LocalDateTime pickupEnd,
            StorageRequirement storageRequirement,
            String notes) {
    }

    /** Only the fields that are present are changed; null values are ignored. */
    public record UpdateDonationRequest(
            String foodName,
            Long categoryId,
            Double quantity,
            String unit,
            LocalDateTime expiryTime,
            String pickupAddress,
            LocalDateTime pickupStart,
            LocalDateTime pickupEnd,
            StorageRequirement storageRequirement,
            String notes) {
    }

    public record DonationView(
            Long donationId,
            String foodName,
            Long categoryId,
            String categoryName,
            Double quantity,
            String unit,
            LocalDateTime expiryTime,
            Double hoursToExpiry,
            String pickupAddress,
            LocalDateTime pickupStart,
            LocalDateTime pickupEnd,
            StorageRequirement storageRequirement,
            DonationStatus status,
            LocalDateTime createdAt,
            String notes,
            Long donorId,
            String donorName,
            String donorType,
            Long allocationId,
            String allocationStatus,
            Double priorityScore,
            Long recipientId,
            String recipientName,
            String decisionExplanation,
            String volunteerName,
            String assignmentStatus,
            String deliveryStatus) {
    }
}
