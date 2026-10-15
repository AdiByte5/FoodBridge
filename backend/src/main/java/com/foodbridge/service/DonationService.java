package com.foodbridge.service;

import com.foodbridge.common.ApiException;
import com.foodbridge.domain.*;
import com.foodbridge.dto.DonationDtos;
import com.foodbridge.repo.AllocationRepository;
import com.foodbridge.repo.DonorRepository;
import com.foodbridge.repo.FoodCategoryRepository;
import com.foodbridge.repo.FoodDonationRepository;
import com.foodbridge.repo.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
public class DonationService {

    private final FoodDonationRepository donationRepository;
    private final DonorRepository donorRepository;
    private final FoodCategoryRepository categoryRepository;
    private final AllocationRepository allocationRepository;
    private final UserRepository userRepository;
    private final ViewMapper viewMapper;
    private final NotificationService notificationService;
    private final AuditService auditService;

    public DonationService(FoodDonationRepository donationRepository,
                           DonorRepository donorRepository,
                           FoodCategoryRepository categoryRepository,
                           AllocationRepository allocationRepository,
                           UserRepository userRepository,
                           ViewMapper viewMapper,
                           NotificationService notificationService,
                           AuditService auditService) {
        this.donationRepository = donationRepository;
        this.donorRepository = donorRepository;
        this.categoryRepository = categoryRepository;
        this.allocationRepository = allocationRepository;
        this.userRepository = userRepository;
        this.viewMapper = viewMapper;
        this.notificationService = notificationService;
        this.auditService = auditService;
    }

    @Transactional
    public DonationDtos.DonationView create(Long userId, DonationDtos.CreateDonationRequest request) {
        Donor donor = donorRepository.findByUser_UserId(userId)
                .orElseThrow(() -> ApiException.forbidden("Only donor accounts can register donations"));
        if (request.expiryTime().isBefore(LocalDateTime.now())) {
            throw ApiException.badRequest("Expiry time must be in the future");
        }
        FoodCategory category = request.categoryId() == null ? null
                : categoryRepository.findById(request.categoryId())
                .orElseThrow(() -> ApiException.notFound("Food category not found"));

        FoodDonation donation = donationRepository.save(FoodDonation.builder()
                .donor(donor)
                .category(category)
                .foodName(request.foodName())
                .quantity(request.quantity())
                .unit(request.unit() == null ? "kg" : request.unit())
                .expiryTime(request.expiryTime())
                .pickupAddress(request.pickupAddress() == null || request.pickupAddress().isBlank()
                        ? donor.getAddress() : request.pickupAddress())
                .pickupStart(request.pickupStart())
                .pickupEnd(request.pickupEnd())
                .storageRequirement(request.storageRequirement() == null
                        ? (category == null ? StorageRequirement.AMBIENT : category.getRecommendedStorage())
                        : request.storageRequirement())
                .status(DonationStatus.PENDING)
                .createdAt(LocalDateTime.now())
                .notes(request.notes())
                .build());

        notificationService.notifyAdmins("New donation registered",
                donor.getOrganizationName() + " added \"" + donation.getFoodName() + "\" ("
                        + donation.getQuantity() + " " + donation.getUnit() + "), expiring "
                        + donation.getExpiryTime() + ".", NotificationType.DONATION);
        notificationService.notify(donor.getUser(), "Donation registered",
                "\"" + donation.getFoodName() + "\" is now pending allocation. The engine will match it with the best recipient.",
                NotificationType.DONATION);
        auditService.record(donor.getUser(), "DONATION", "DONATION_CREATED",
                "Donation #" + donation.getDonationId() + " \"" + donation.getFoodName() + "\" registered by "
                        + donor.getOrganizationName());

        return viewMapper.donationView(donation);
    }

    @Transactional(readOnly = true)
    public List<DonationDtos.DonationView> listForUser(Long userId, UserRole role) {
        List<FoodDonation> donations = switch (role) {
            case DONOR -> donorRepository.findByUser_UserId(userId)
                    .map(d -> donationRepository.findByDonor_DonorIdOrderByCreatedAtDesc(d.getDonorId()))
                    .orElse(List.of());
            default -> donationRepository.findAllByOrderByCreatedAtDesc();
        };
        return donations.stream().map(viewMapper::donationView).toList();
    }

    @Transactional(readOnly = true)
    public DonationDtos.DonationView get(Long donationId) {
        FoodDonation donation = donationRepository.findById(donationId)
                .orElseThrow(() -> ApiException.notFound("Donation not found"));
        return viewMapper.donationView(donation);
    }

    @Transactional
    public DonationDtos.DonationView cancel(Long donationId, Long userId) {
        FoodDonation donation = donationRepository.findById(donationId)
                .orElseThrow(() -> ApiException.notFound("Donation not found"));
        if (!donation.getDonor().getUser().getUserId().equals(userId)) {
            throw ApiException.forbidden("Only the donor can cancel this donation");
        }
        if (donation.getStatus() == DonationStatus.COMPLETED || donation.getStatus() == DonationStatus.DELIVERED) {
            throw ApiException.badRequest("Completed donations cannot be cancelled");
        }
        allocationRepository.findByDonation_DonationIdOrderByAllocationTimeDesc(donationId).stream()
                .filter(a -> a.getAllocationStatus() == AllocationStatus.PROPOSED)
                .forEach(a -> {
                    a.setAllocationStatus(AllocationStatus.SUPERSEDED);
                    allocationRepository.save(a);
                });
        donation.setStatus(DonationStatus.CANCELLED);
        donationRepository.save(donation);
        notificationService.notifyAdmins("Donation cancelled",
                "Donation #" + donationId + " \"" + donation.getFoodName() + "\" was cancelled by the donor.",
                NotificationType.DONATION);
        auditService.record(donation.getDonor().getUser(), "DONATION", "DONATION_CANCELLED",
                "Donation #" + donationId + " cancelled");
        return viewMapper.donationView(donation);
    }

    @Transactional
    public DonationDtos.DonationView update(Long donationId, Long userId, DonationDtos.UpdateDonationRequest request) {
        FoodDonation donation = donationRepository.findById(donationId)
                .orElseThrow(() -> ApiException.notFound("Donation not found"));
        if (!donation.getDonor().getUser().getUserId().equals(userId)) {
            throw ApiException.forbidden("Only the donor can modify this donation");
        }
        if (donation.getStatus() != DonationStatus.PENDING) {
            throw ApiException.badRequest("Only donations that are still pending can be modified");
        }
        if (request.foodName() != null && !request.foodName().isBlank()) {
            donation.setFoodName(request.foodName().trim());
        }
        if (request.categoryId() != null) {
            donation.setCategory(categoryRepository.findById(request.categoryId())
                    .orElseThrow(() -> ApiException.notFound("Food category not found")));
        }
        if (request.quantity() != null) {
            if (request.quantity() <= 0) {
                throw ApiException.badRequest("Quantity must be greater than zero");
            }
            donation.setQuantity(request.quantity());
        }
        if (request.unit() != null && !request.unit().isBlank()) {
            donation.setUnit(request.unit());
        }
        if (request.expiryTime() != null) {
            if (request.expiryTime().isBefore(LocalDateTime.now())) {
                throw ApiException.badRequest("Expiry time must be in the future");
            }
            donation.setExpiryTime(request.expiryTime());
        }
        if (request.pickupAddress() != null && !request.pickupAddress().isBlank()) {
            donation.setPickupAddress(request.pickupAddress());
        }
        if (request.pickupStart() != null) {
            donation.setPickupStart(request.pickupStart());
        }
        if (request.pickupEnd() != null) {
            donation.setPickupEnd(request.pickupEnd());
        }
        if (request.storageRequirement() != null) {
            donation.setStorageRequirement(request.storageRequirement());
        }
        if (request.notes() != null) {
            donation.setNotes(request.notes());
        }
        donationRepository.save(donation);
        auditService.record(donation.getDonor().getUser(), "DONATION", "DONATION_UPDATED",
                "Donation #" + donationId + " \"" + donation.getFoodName() + "\" was modified by the donor");
        return viewMapper.donationView(donation);
    }

    @Transactional(readOnly = true)
    public List<DonationDtos.DonationView> expiringSoon(int withinHours) {
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime threshold = now.plusHours(withinHours);
        return donationRepository.findByStatusIn(List.of(DonationStatus.PENDING, DonationStatus.ALLOCATED)).stream()
                .filter(d -> d.getExpiryTime() != null && d.getExpiryTime().isBefore(threshold))
                .map(viewMapper::donationView)
                .toList();
    }
}
