package com.foodbridge.service;

import com.foodbridge.domain.*;
import com.foodbridge.dto.DonationDtos;
import com.foodbridge.dto.RecipientDtos;
import com.foodbridge.dto.VolunteerDtos;
import com.foodbridge.repo.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;

@Service
public class ViewMapper {

    private static final DateTimeFormatter TIME = DateTimeFormatter.ofPattern("dd MMM, HH:mm");

    private final AllocationRepository allocationRepository;
    private final VolunteerAssignmentRepository assignmentRepository;
    private final DeliveryRepository deliveryRepository;
    private final RecipientPreferenceRepository preferenceRepository;

    public ViewMapper(AllocationRepository allocationRepository,
                      VolunteerAssignmentRepository assignmentRepository,
                      DeliveryRepository deliveryRepository,
                      RecipientPreferenceRepository preferenceRepository) {
        this.allocationRepository = allocationRepository;
        this.assignmentRepository = assignmentRepository;
        this.deliveryRepository = deliveryRepository;
        this.preferenceRepository = preferenceRepository;
    }

    @Transactional(readOnly = true)
    public DonationDtos.DonationView donationView(FoodDonation donation) {
        Allocation allocation = allocationRepository
                .findTopByDonation_DonationIdOrderByAllocationIdDesc(donation.getDonationId()).orElse(null);
        VolunteerAssignment assignment = allocation == null ? null
                : assignmentRepository.findByAllocation_AllocationId(allocation.getAllocationId()).orElse(null);
        Delivery delivery = assignment == null ? null
                : deliveryRepository.findByAssignment_AssignmentId(assignment.getAssignmentId()).orElse(null);

        return new DonationDtos.DonationView(
                donation.getDonationId(),
                donation.getFoodName(),
                donation.getCategory() == null ? null : donation.getCategory().getCategoryId(),
                donation.getCategory() == null ? "Uncategorised" : donation.getCategory().getCategoryName(),
                donation.getQuantity(),
                donation.getUnit(),
                donation.getExpiryTime(),
                hoursUntil(donation.getExpiryTime()),
                donation.getPickupAddress(),
                donation.getPickupStart(),
                donation.getPickupEnd(),
                donation.getStorageRequirement(),
                donation.getStatus(),
                donation.getCreatedAt(),
                donation.getNotes(),
                donation.getDonor().getDonorId(),
                donation.getDonor().getOrganizationName(),
                donation.getDonor().getOrganizationType() == null ? null : donation.getDonor().getOrganizationType().name(),
                allocation == null ? null : allocation.getAllocationId(),
                allocation == null ? null : allocation.getAllocationStatus().name(),
                allocation == null ? null : allocation.getPriorityScore(),
                allocation == null ? null : allocation.getRecipient().getRecipientId(),
                allocation == null ? null : allocation.getRecipient().getOrganizationName(),
                allocation == null ? null : allocation.getDecisionExplanation(),
                assignment == null ? null : assignment.getVolunteer().getUser().getFullName(),
                assignment == null ? null : assignment.getAssignmentStatus().name(),
                delivery == null ? null : delivery.getDeliveryStatus().name());
    }

    @Transactional(readOnly = true)
    public RecipientDtos.AllocationView allocationView(Allocation allocation) {
        FoodDonation donation = allocation.getDonation();
        RecipientOrganization recipient = allocation.getRecipient();
        VolunteerAssignment assignment = assignmentRepository.findByAllocation_AllocationId(allocation.getAllocationId()).orElse(null);
        Delivery delivery = assignment == null ? null
                : deliveryRepository.findByAssignment_AssignmentId(assignment.getAssignmentId()).orElse(null);
        Donor donor = donation.getDonor();

        Double distance = GeoUtils.distanceKm(donor.getLatitude(), donor.getLongitude(),
                recipient.getLatitude(), recipient.getLongitude());

        return new RecipientDtos.AllocationView(
                allocation.getAllocationId(),
                donation.getDonationId(),
                donation.getFoodName(),
                donation.getCategory() == null ? "Uncategorised" : donation.getCategory().getCategoryName(),
                donation.getQuantity(),
                donation.getUnit(),
                donation.getStorageRequirement() == null ? null : donation.getStorageRequirement().name(),
                donor.getOrganizationName(),
                donation.getPickupAddress() == null ? donor.getAddress() : donation.getPickupAddress(),
                window(donation.getPickupStart(), donation.getPickupEnd()),
                distance == null || distance.isNaN() ? null : GeoUtils.round(distance, 2),
                hoursUntil(donation.getExpiryTime()),
                allocation.getPriorityScore(),
                allocation.getDecisionExplanation(),
                FactorCodec.decode(allocation.getFactorBreakdown()),
                allocation.getAllocationTime(),
                allocation.getAllocationStatus().name(),
                recipient.getRecipientId(),
                recipient.getOrganizationName(),
                recipient.getAddress(),
                assignment == null ? null : assignment.getAssignmentId(),
                assignment == null ? null : assignment.getAssignmentStatus().name(),
                assignment == null ? null : assignment.getVolunteer().getUser().getFullName(),
                assignment == null ? null : assignment.getVolunteer().getUser().getPhoneNumber(),
                delivery == null ? null : delivery.getDeliveryId(),
                delivery == null ? null : delivery.getDeliveryStatus().name(),
                delivery == null ? null : delivery.getPickupTime(),
                delivery == null ? null : delivery.getDeliveryTime());
    }

    @Transactional(readOnly = true)
    public VolunteerDtos.AssignmentView assignmentView(VolunteerAssignment assignment) {
        Allocation allocation = assignment.getAllocation();
        FoodDonation donation = allocation.getDonation();
        RecipientOrganization recipient = allocation.getRecipient();
        Donor donor = donation.getDonor();
        Delivery delivery = deliveryRepository.findByAssignment_AssignmentId(assignment.getAssignmentId()).orElse(null);

        Double distance = GeoUtils.distanceKm(donor.getLatitude(), donor.getLongitude(),
                recipient.getLatitude(), recipient.getLongitude());

        return new VolunteerDtos.AssignmentView(
                assignment.getAssignmentId(),
                allocation.getAllocationId(),
                donation.getDonationId(),
                donation.getFoodName(),
                donation.getCategory() == null ? "Uncategorised" : donation.getCategory().getCategoryName(),
                donation.getQuantity(),
                donation.getUnit(),
                donation.getStorageRequirement() == null ? null : donation.getStorageRequirement().name(),
                donor.getOrganizationName(),
                donation.getPickupAddress() == null ? donor.getAddress() : donation.getPickupAddress(),
                donor.getLatitude(),
                donor.getLongitude(),
                window(donation.getPickupStart(), donation.getPickupEnd()),
                recipient.getOrganizationName(),
                recipient.getAddress(),
                recipient.getLatitude(),
                recipient.getLongitude(),
                donation.getExpiryTime(),
                hoursUntil(donation.getExpiryTime()),
                assignment.getMatchScore(),
                assignment.getMatchExplanation(),
                assignment.getAssignedTime(),
                assignment.getAssignmentStatus().name(),
                delivery == null ? null : delivery.getDeliveryId(),
                delivery == null ? null : delivery.getDeliveryStatus().name(),
                delivery == null ? null : delivery.getPickupTime(),
                delivery == null ? null : delivery.getDeliveryTime(),
                delivery == null ? (distance == null || distance.isNaN() ? null : GeoUtils.round(distance, 2))
                        : delivery.getDistanceKm(),
                delivery == null ? null : delivery.getRoute());
    }

    @Transactional(readOnly = true)
    public RecipientDtos.RecipientView recipientView(RecipientOrganization r) {
        List<String> preferences = preferenceRepository.findByRecipient_RecipientId(r.getRecipientId()).stream()
                .map(p -> p.getCategory().getCategoryName())
                .toList();
        double free = (r.getStorageCapacityKg() == null ? 0 : r.getStorageCapacityKg())
                - (r.getCurrentLoadKg() == null ? 0 : r.getCurrentLoadKg());
        return new RecipientDtos.RecipientView(
                r.getRecipientId(),
                r.getOrganizationName(),
                r.getOrganizationType(),
                r.getAddress(),
                r.getUser().getEmail(),
                r.getUser().getPhoneNumber(),
                r.getStorageCapacityKg(),
                r.getCurrentLoadKg(),
                GeoUtils.round(Math.max(free, 0), 1),
                r.getDemandKg(),
                r.getBeneficiaries(),
                r.getLatitude(),
                r.getLongitude(),
                r.getVerified(),
                preferences,
                null,
                null);
    }

    @Transactional(readOnly = true)
    public VolunteerDtos.VolunteerView volunteerView(Volunteer v) {
        return new VolunteerDtos.VolunteerView(
                v.getVolunteerId(),
                v.getUser().getFullName(),
                v.getUser().getEmail(),
                v.getUser().getPhoneNumber(),
                v.getVehicleType(),
                v.getAvailabilityStatus(),
                v.getCurrentLocation(),
                v.getLatitude(),
                v.getLongitude(),
                v.getCompletedDeliveries(),
                v.getActiveDeliveries());
    }

    public static Double hoursUntil(LocalDateTime time) {
        if (time == null) {
            return null;
        }
        double hours = Duration.between(LocalDateTime.now(), time).toMinutes() / 60.0;
        return GeoUtils.round(hours, 1);
    }

    public static String window(LocalDateTime start, LocalDateTime end) {
        if (start == null && end == null) {
            return "Flexible";
        }
        if (start != null && end != null) {
            return TIME.format(start) + " - " + TIME.format(end);
        }
        return TIME.format(start != null ? start : end);
    }
}
