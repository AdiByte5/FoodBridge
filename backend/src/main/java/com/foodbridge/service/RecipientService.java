package com.foodbridge.service;

import com.foodbridge.common.ApiException;
import com.foodbridge.domain.*;
import com.foodbridge.dto.RecipientDtos;
import com.foodbridge.repo.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class RecipientService {

    private final RecipientOrganizationRepository recipientRepository;
    private final RecipientPreferenceRepository preferenceRepository;
    private final FoodCategoryRepository categoryRepository;
    private final AllocationRepository allocationRepository;
    private final NotificationService notificationService;
    private final AuditService auditService;
    private final ViewMapper viewMapper;
    private final AllocationEngineService engineService;
    private final DeliveryService deliveryService;

    public RecipientService(RecipientOrganizationRepository recipientRepository,
                            RecipientPreferenceRepository preferenceRepository,
                            FoodCategoryRepository categoryRepository,
                            AllocationRepository allocationRepository,
                            NotificationService notificationService,
                            AuditService auditService,
                            ViewMapper viewMapper,
                            AllocationEngineService engineService,
                            DeliveryService deliveryService) {
        this.recipientRepository = recipientRepository;
        this.preferenceRepository = preferenceRepository;
        this.categoryRepository = categoryRepository;
        this.allocationRepository = allocationRepository;
        this.notificationService = notificationService;
        this.auditService = auditService;
        this.viewMapper = viewMapper;
        this.engineService = engineService;
        this.deliveryService = deliveryService;
    }

    @Transactional(readOnly = true)
    public RecipientDtos.RecipientView me(Long userId) {
        RecipientOrganization recipient = recipientRepository.findByUser_UserId(userId)
                .orElseThrow(() -> ApiException.forbidden("Only recipient organizations have this profile"));
        return viewMapper.recipientView(recipient);
    }

    @Transactional
    public RecipientDtos.RecipientView updateDemand(Long userId, RecipientDtos.DemandUpdateRequest request) {
        RecipientOrganization recipient = recipientRepository.findByUser_UserId(userId)
                .orElseThrow(() -> ApiException.forbidden("Only recipient organizations can update demand"));
        if (request.storageCapacityKg() != null) recipient.setStorageCapacityKg(request.storageCapacityKg());
        if (request.currentLoadKg() != null) recipient.setCurrentLoadKg(request.currentLoadKg());
        if (request.demandKg() != null) recipient.setDemandKg(request.demandKg());
        if (request.beneficiaries() != null) recipient.setBeneficiaries(request.beneficiaries());
        recipientRepository.save(recipient);
        auditService.record(recipient.getUser(), "RECIPIENT", "DEMAND_UPDATED",
                recipient.getOrganizationName() + " updated demand to " + recipient.getDemandKg()
                        + " kg and capacity to " + recipient.getStorageCapacityKg() + " kg");
        return viewMapper.recipientView(recipient);
    }

    @Transactional(readOnly = true)
    public List<Long> preferences(Long userId) {
        RecipientOrganization recipient = recipientRepository.findByUser_UserId(userId)
                .orElseThrow(() -> ApiException.forbidden("Only recipient organizations have preferences"));
        return preferenceRepository.findByRecipient_RecipientId(recipient.getRecipientId()).stream()
                .map(p -> p.getCategory().getCategoryId())
                .toList();
    }

    @Transactional
    public List<Long> updatePreferences(Long userId, List<Long> categoryIds) {
        RecipientOrganization recipient = recipientRepository.findByUser_UserId(userId)
                .orElseThrow(() -> ApiException.forbidden("Only recipient organizations have preferences"));
        preferenceRepository.deleteByRecipient_RecipientId(recipient.getRecipientId());
        List<Long> ids = categoryIds == null ? List.of() : categoryIds.stream().distinct().toList();
        for (Long categoryId : ids) {
            FoodCategory category = categoryRepository.findById(categoryId)
                    .orElseThrow(() -> ApiException.notFound("Food category not found: " + categoryId));
            preferenceRepository.save(RecipientPreference.builder()
                    .id(new RecipientPreferenceId(recipient.getRecipientId(), category.getCategoryId()))
                    .recipient(recipient)
                    .category(category)
                    .build());
        }
        auditService.record(recipient.getUser(), "RECIPIENT", "PREFERENCES_UPDATED",
                recipient.getOrganizationName() + " now accepts " + ids.size() + " categories");
        return ids;
    }

    @Transactional(readOnly = true)
    public List<RecipientDtos.RecipientView> listAll() {
        return recipientRepository.findAllByOrderByOrganizationNameAsc().stream()
                .map(viewMapper::recipientView)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<RecipientDtos.AllocationView> allocationsForUser(Long userId, String status) {
        RecipientOrganization recipient = recipientRepository.findByUser_UserId(userId)
                .orElseThrow(() -> ApiException.forbidden("Only recipient organizations have allocations"));
        List<Allocation> allocations = allocationRepository.findByRecipient_RecipientIdOrderByAllocationTimeDesc(recipient.getRecipientId());
        if (status != null && !status.isBlank()) {
            allocations = allocations.stream()
                    .filter(a -> a.getAllocationStatus().name().equalsIgnoreCase(status))
                    .toList();
        }
        return allocations.stream().map(viewMapper::allocationView).toList();
    }

    @Transactional(readOnly = true)
    public List<RecipientDtos.AllocationView> allAllocations() {
        return allocationRepository.findAllByOrderByAllocationTimeDesc().stream()
                .map(viewMapper::allocationView)
                .toList();
    }

    @Transactional
    public RecipientDtos.AllocationView accept(Long allocationId, Long userId) {
        Allocation allocation = ownedAllocation(allocationId, userId);
        if (allocation.getAllocationStatus() != AllocationStatus.PROPOSED) {
            throw ApiException.badRequest("Only proposed allocations can be accepted");
        }
        allocation.setAllocationStatus(AllocationStatus.ACCEPTED);
        allocationRepository.save(allocation);

        FoodDonation donation = allocation.getDonation();
        notificationService.notify(donation.getDonor().getUser(), "Allocation accepted",
                allocation.getRecipient().getOrganizationName() + " accepted your donation \"" + donation.getFoodName()
                        + "\". A volunteer will be coordinated next.", NotificationType.ALLOCATION);
        notificationService.notifyAdmins("Allocation accepted",
                allocation.getRecipient().getOrganizationName() + " accepted allocation #" + allocationId,
                NotificationType.ALLOCATION);
        auditService.record(allocation.getRecipient().getUser(), "ALLOCATION", "ALLOCATION_ACCEPTED",
                "Allocation #" + allocationId + " accepted by " + allocation.getRecipient().getOrganizationName());

        try {
            engineService.assignVolunteer(allocationId, null, allocation.getRecipient().getUser());
        } catch (ApiException ex) {
            notificationService.notifyAdmins("Volunteer needed",
                    "Allocation #" + allocationId + " was accepted but no volunteer is currently available.",
                    NotificationType.ASSIGNMENT);
        }
        return viewMapper.allocationView(allocation);
    }

    @Transactional
    public RecipientDtos.AllocationView reject(Long allocationId, Long userId, String reason) {
        Allocation allocation = ownedAllocation(allocationId, userId);
        if (allocation.getAllocationStatus() != AllocationStatus.PROPOSED) {
            throw ApiException.badRequest("Only proposed allocations can be rejected");
        }
        allocation.setAllocationStatus(AllocationStatus.REJECTED);
        allocation.setDecisionExplanation(allocation.getDecisionExplanation()
                + " | Rejected by recipient: " + (reason == null || reason.isBlank() ? "no reason provided" : reason));
        allocationRepository.save(allocation);

        FoodDonation donation = allocation.getDonation();
        donation.setStatus(DonationStatus.PENDING);
        notificationService.notify(donation.getDonor().getUser(), "Allocation declined",
                allocation.getRecipient().getOrganizationName() + " could not accept \"" + donation.getFoodName()
                        + "\". The engine can now recommend another recipient.", NotificationType.ALLOCATION);
        notificationService.notifyAdmins("Allocation rejected",
                allocation.getRecipient().getOrganizationName() + " rejected allocation #" + allocationId
                        + (reason == null || reason.isBlank() ? "" : " (" + reason + ")"),
                NotificationType.ALLOCATION);
        auditService.record(allocation.getRecipient().getUser(), "ALLOCATION", "ALLOCATION_REJECTED",
                "Allocation #" + allocationId + " rejected by " + allocation.getRecipient().getOrganizationName()
                        + (reason == null || reason.isBlank() ? "" : ": " + reason));
        return viewMapper.allocationView(allocation);
    }

    @Transactional
    public RecipientDtos.AllocationView confirmDelivery(Long allocationId, Long userId) {
        Allocation allocation = ownedAllocation(allocationId, userId);
        deliveryService.confirmReceipt(allocation, allocation.getRecipient().getUser());
        return viewMapper.allocationView(allocation);
    }

    private Allocation ownedAllocation(Long allocationId, Long userId) {
        Allocation allocation = allocationRepository.findById(allocationId)
                .orElseThrow(() -> ApiException.notFound("Allocation not found"));
        if (!allocation.getRecipient().getUser().getUserId().equals(userId)) {
            throw ApiException.forbidden("This allocation belongs to another organization");
        }
        return allocation;
    }
}
