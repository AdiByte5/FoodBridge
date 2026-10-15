package com.foodbridge.dto;

import com.foodbridge.domain.*;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.LocalDateTime;

public final class AuthDtos {

    private AuthDtos() {
    }

    public record RegisterRequest(
            @NotBlank String fullName,
            @NotBlank @Email String email,
            @NotBlank @Size(min = 6, message = "must be at least 6 characters") String password,
            String phoneNumber,
            @NotNull UserRole role,
            String organizationName,
            OrganizationType organizationType,
            String address,
            Double latitude,
            Double longitude,
            String vehicleType,
            Double storageCapacityKg,
            Double demandKg,
            Integer beneficiaries) {
    }

    public record LoginRequest(@NotBlank @Email String email, @NotBlank String password) {
    }

    public record AuthResponse(String token, long expiresInMinutes, UserProfile user) {
    }

    public record UserProfile(
            Long userId,
            String fullName,
            String email,
            String phoneNumber,
            UserRole role,
            AccountStatus accountStatus,
            LocalDateTime createdAt,
            LocalDateTime lastLogin,
            Long organizationId,
            String organizationName,
            OrganizationType organizationType,
            String address,
            Double latitude,
            Double longitude,
            Boolean verified,
            Double storageCapacityKg,
            Double currentLoadKg,
            Double demandKg,
            Integer beneficiaries,
            String vehicleType,
            AvailabilityStatus availabilityStatus,
            String currentLocation,
            Integer completedDeliveries,
            Integer activeDeliveries) {
    }

    public record UpdateProfileRequest(String fullName, String phoneNumber, String address,
                                       Double latitude, Double longitude, String vehicleType,
                                       Double storageCapacityKg, Double demandKg, Integer beneficiaries) {
    }
}
