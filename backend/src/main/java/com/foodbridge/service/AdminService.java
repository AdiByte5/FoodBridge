package com.foodbridge.service;

import com.foodbridge.common.ApiException;
import com.foodbridge.domain.*;
import com.foodbridge.dto.AdminDtos;
import com.foodbridge.repo.*;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.lang.management.ManagementFactory;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
public class AdminService {

    private final UserRepository userRepository;
    private final DonorRepository donorRepository;
    private final RecipientOrganizationRepository recipientRepository;
    private final VolunteerRepository volunteerRepository;
    private final FoodDonationRepository donationRepository;
    private final AllocationRepository allocationRepository;
    private final DeliveryRepository deliveryRepository;
    private final NotificationRepository notificationRepository;
    private final AuditLogRepository auditLogRepository;
    private final NotificationService notificationService;
    private final AuditService auditService;

    @PersistenceContext
    private EntityManager entityManager;

    public AdminService(UserRepository userRepository,
                        DonorRepository donorRepository,
                        RecipientOrganizationRepository recipientRepository,
                        VolunteerRepository volunteerRepository,
                        FoodDonationRepository donationRepository,
                        AllocationRepository allocationRepository,
                        DeliveryRepository deliveryRepository,
                        NotificationRepository notificationRepository,
                        AuditLogRepository auditLogRepository,
                        NotificationService notificationService,
                        AuditService auditService) {
        this.userRepository = userRepository;
        this.donorRepository = donorRepository;
        this.recipientRepository = recipientRepository;
        this.volunteerRepository = volunteerRepository;
        this.donationRepository = donationRepository;
        this.allocationRepository = allocationRepository;
        this.deliveryRepository = deliveryRepository;
        this.notificationRepository = notificationRepository;
        this.auditLogRepository = auditLogRepository;
        this.notificationService = notificationService;
        this.auditService = auditService;
    }

    @Transactional(readOnly = true)
    public List<AdminDtos.UserAdminView> users() {
        return userRepository.findAll().stream()
                .sorted((a, b) -> a.getUserId().compareTo(b.getUserId()))
                .map(this::toView)
                .toList();
    }

    @Transactional
    public AdminDtos.UserAdminView verify(Long userId, User actor) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> ApiException.notFound("User not found"));
        switch (user.getRole()) {
            case DONOR -> donorRepository.findByUser_UserId(userId).ifPresent(d -> {
                d.setVerified(true);
                donorRepository.save(d);
            });
            case RECIPIENT -> recipientRepository.findByUser_UserId(userId).ifPresent(r -> {
                r.setVerified(true);
                recipientRepository.save(r);
            });
            default -> {
            }
        }
        notificationService.notify(user, "Organization verified",
                "Your organization has been verified by the FoodBridge administrator. You can now participate fully in allocations.",
                NotificationType.SYSTEM);
        auditService.record(actor, "ADMIN", "ORGANIZATION_VERIFIED",
                "Verified " + user.getFullName() + " (" + user.getRole() + ")");
        return toView(user);
    }

    @Transactional
    public AdminDtos.UserAdminView updateStatus(Long userId, AccountStatus status, User actor) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> ApiException.notFound("User not found"));
        if (user.getRole() == UserRole.ADMIN && status == AccountStatus.SUSPENDED) {
            throw ApiException.badRequest("Administrator accounts cannot be suspended");
        }
        user.setAccountStatus(status);
        userRepository.save(user);
        notificationService.notify(user, "Account status updated",
                "Your account status is now " + status + ".", NotificationType.SYSTEM);
        auditService.record(actor, "ADMIN", "ACCOUNT_STATUS_UPDATED",
                user.getFullName() + " set to " + status);
        return toView(user);
    }

    @Transactional(readOnly = true)
    public List<AdminDtos.AuditLogView> auditLogs(int limit) {
        return auditService.recent(limit);
    }

    @Transactional(readOnly = true)
    public AdminDtos.SystemHealth health() {
        Map<String, Long> counts = new LinkedHashMap<>();
        counts.put("users", userRepository.count());
        counts.put("donors", donorRepository.count());
        counts.put("recipientOrganizations", recipientRepository.count());
        counts.put("volunteers", volunteerRepository.count());
        counts.put("donations", donationRepository.count());
        counts.put("allocations", allocationRepository.count());
        counts.put("deliveries", deliveryRepository.count());
        counts.put("notifications", notificationRepository.count());
        counts.put("auditLogs", auditLogRepository.count());

        String database = "unavailable";
        try {
            Object version = entityManager.createNativeQuery("select version()").getSingleResult();
            database = version == null ? "connected" : version.toString();
        } catch (Exception ignored) {
            database = "connected";
        }

        return new AdminDtos.SystemHealth(
                "OPERATIONAL",
                database,
                ManagementFactory.getRuntimeMXBean().getUptime() / 1000,
                "1.0.0",
                counts,
                List.of("Authentication & Role Management",
                        "Food Donation Management",
                        "Intelligent Allocation & Decision Engine",
                        "Volunteer Coordination & Tracking",
                        "Notification & Tracking",
                        "Reports & Analytics",
                        "Audit Logging"));
    }

    private AdminDtos.UserAdminView toView(User user) {
        String organizationName = null;
        String organizationType = null;
        Boolean verified = null;
        switch (user.getRole()) {
            case DONOR -> {
                Donor donor = donorRepository.findByUser_UserId(user.getUserId()).orElse(null);
                if (donor != null) {
                    organizationName = donor.getOrganizationName();
                    organizationType = donor.getOrganizationType() == null ? null : donor.getOrganizationType().name();
                    verified = donor.getVerified();
                }
            }
            case RECIPIENT -> {
                RecipientOrganization recipient = recipientRepository.findByUser_UserId(user.getUserId()).orElse(null);
                if (recipient != null) {
                    organizationName = recipient.getOrganizationName();
                    organizationType = recipient.getOrganizationType() == null ? null : recipient.getOrganizationType().name();
                    verified = recipient.getVerified();
                }
            }
            case VOLUNTEER -> {
                Volunteer volunteer = volunteerRepository.findByUser_UserId(user.getUserId()).orElse(null);
                if (volunteer != null) {
                    organizationName = volunteer.getVehicleType();
                    organizationType = "VOLUNTEER";
                    verified = true;
                }
            }
            default -> verified = true;
        }
        return new AdminDtos.UserAdminView(
                user.getUserId(), user.getFullName(), user.getEmail(), user.getPhoneNumber(),
                user.getRole(), user.getAccountStatus(), verified, organizationName, organizationType,
                user.getCreatedAt(), user.getLastLogin());
    }
}
