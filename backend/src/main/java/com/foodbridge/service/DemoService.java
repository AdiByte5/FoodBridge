package com.foodbridge.service;

import com.foodbridge.common.ApiException;
import com.foodbridge.domain.*;
import com.foodbridge.dto.AdminDtos;
import com.foodbridge.dto.AnalyticsDtos;
import com.foodbridge.dto.DonationDtos;
import com.foodbridge.dto.EngineDtos;
import com.foodbridge.dto.RecipientDtos;
import com.foodbridge.dto.VolunteerDtos;
import com.foodbridge.repo.*;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * One-click demo: resets the dataset and runs a complete food rescue
 * (donation -> engine decision -> acceptance -> volunteer -> delivery ->
 * confirmation -> analytics) while recording every step for the UI.
 */
@Service
public class DemoService {

    private static final Logger log = LoggerFactory.getLogger(DemoService.class);

    private final UserRepository userRepository;
    private final DonorRepository donorRepository;
    private final RecipientOrganizationRepository recipientRepository;
    private final VolunteerRepository volunteerRepository;
    private final FoodCategoryRepository categoryRepository;
    private final FoodDonationRepository donationRepository;
    private final AllocationRepository allocationRepository;
    private final VolunteerAssignmentRepository assignmentRepository;
    private final DeliveryRepository deliveryRepository;
    private final NotificationRepository notificationRepository;
    private final AuditLogRepository auditLogRepository;
    private final RecipientPreferenceRepository preferenceRepository;
    private final DataSeeder dataSeeder;
    private final DonationService donationService;
    private final AllocationEngineService engineService;
    private final RecipientService recipientService;
    private final VolunteerService volunteerService;
    private final AnalyticsService analyticsService;
    private final AuditService auditService;

    @PersistenceContext
    private EntityManager entityManager;

    public DemoService(UserRepository userRepository,
                       DonorRepository donorRepository,
                       RecipientOrganizationRepository recipientRepository,
                       VolunteerRepository volunteerRepository,
                       FoodCategoryRepository categoryRepository,
                       FoodDonationRepository donationRepository,
                       AllocationRepository allocationRepository,
                       VolunteerAssignmentRepository assignmentRepository,
                       DeliveryRepository deliveryRepository,
                       NotificationRepository notificationRepository,
                       AuditLogRepository auditLogRepository,
                       RecipientPreferenceRepository preferenceRepository,
                       DataSeeder dataSeeder,
                       DonationService donationService,
                       AllocationEngineService engineService,
                       RecipientService recipientService,
                       VolunteerService volunteerService,
                       AnalyticsService analyticsService,
                       AuditService auditService) {
        this.userRepository = userRepository;
        this.donorRepository = donorRepository;
        this.recipientRepository = recipientRepository;
        this.volunteerRepository = volunteerRepository;
        this.categoryRepository = categoryRepository;
        this.donationRepository = donationRepository;
        this.allocationRepository = allocationRepository;
        this.assignmentRepository = assignmentRepository;
        this.deliveryRepository = deliveryRepository;
        this.notificationRepository = notificationRepository;
        this.auditLogRepository = auditLogRepository;
        this.preferenceRepository = preferenceRepository;
        this.dataSeeder = dataSeeder;
        this.donationService = donationService;
        this.engineService = engineService;
        this.recipientService = recipientService;
        this.volunteerService = volunteerService;
        this.analyticsService = analyticsService;
        this.auditService = auditService;
    }

    @Transactional
    public Map<String, Object> resetDemo() {
        wipe();
        dataSeeder.seedAll();
        log.info("Demo dataset reset and re-seeded");
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("message", "Sample dataset restored");
        result.put("donations", donationRepository.count());
        result.put("recipients", recipientRepository.count());
        result.put("volunteers", volunteerRepository.count());
        result.put("users", userRepository.count());
        return result;
    }

    public void wipe() {
        // deleteAllInBatch executes immediately in FK-safe order, so freshly
        // seeded rows cannot collide with rows from the previous dataset.
        // Accounts are intentionally kept: user ids stay stable, so signed-in
        // sessions (JWTs) remain valid across a dataset reset.
        notificationRepository.deleteAllInBatch();
        auditLogRepository.deleteAllInBatch();
        deliveryRepository.deleteAllInBatch();
        assignmentRepository.deleteAllInBatch();
        allocationRepository.deleteAllInBatch();
        donationRepository.deleteAllInBatch();
        preferenceRepository.deleteAllInBatch();
        categoryRepository.deleteAllInBatch();
        entityManager.flush();
        entityManager.clear();
    }

    @Transactional
    public AdminDtos.DemoScenarioResponse runScenario(Long actorUserId) {
        List<AdminDtos.DemoStep> steps = new ArrayList<>();
        User actor = userRepository.findById(actorUserId)
                .orElseThrow(() -> ApiException.notFound("Actor not found"));

        ensureVolunteerCapacity();

        User donorUser = userRepository.findByEmailIgnoreCase("donor@foodbridge.org")
                .orElseThrow(() -> ApiException.notFound("Demo donor missing - reset the demo dataset first"));
        Donor donor = donorRepository.findByUser_UserId(donorUser.getUserId())
                .orElseThrow(() -> ApiException.notFound("Demo donor profile missing"));
        FoodCategory cooked = categoryRepository.findByCategoryNameIgnoreCase("Cooked Meals").orElseThrow();

        DonationDtos.DonationView donation = donationService.create(donorUser.getUserId(),
                new DonationDtos.CreateDonationRequest(
                        "Veg Biryani & Raita (live demo)",
                        cooked.getCategoryId(),
                        18.0,
                        "kg",
                        LocalDateTime.now().plusHours(3).plusMinutes(30),
                        donor.getAddress(),
                        LocalDateTime.now().plusMinutes(15),
                        LocalDateTime.now().plusMinutes(75),
                        StorageRequirement.HOT_HOLDING,
                        "Freshly prepared surplus from the lunch service - sealed and ready for pickup."));

        Map<String, Object> donationData = new LinkedHashMap<>();
        donationData.put("donationId", donation.donationId());
        donationData.put("food", donation.foodName());
        donationData.put("quantity", donation.quantity() + " " + donation.unit());
        donationData.put("expiresIn", donation.hoursToExpiry() + " hours");
        donationData.put("pickup", donation.pickupAddress());
        steps.add(new AdminDtos.DemoStep(1, "Donation registered",
                donor.getOrganizationName() + " registers " + donation.quantity() + " kg of freshly cooked surplus with a "
                        + donation.hoursToExpiry() + "-hour safe window.", "COMPLETED", donationData));

        EngineDtos.RecommendationResponse preview = engineService.recommend(donation.donationId());
        List<Map<String, Object>> ranked = preview.ranked().stream().limit(4).map(c -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("name", c.organizationName());
            m.put("score", c.totalScore());
            m.put("distanceKm", c.distanceKm());
            m.put("excluded", c.excluded());
            m.put("reason", c.excluded() ? c.exclusionReason() : c.explanation());
            return m;
        }).toList();
        Map<String, Object> engineData = new LinkedHashMap<>();
        engineData.put("eligible", preview.eligibleCount());
        engineData.put("excluded", preview.excludedCount());
        engineData.put("ranked", ranked);
        engineData.put("summary", preview.summary());
        steps.add(new AdminDtos.DemoStep(2, "Allocation engine evaluates 6 factors",
                preview.summary(), "COMPLETED", engineData));

        EngineDtos.RecommendationResponse allocationResult = engineService.allocate(donation.donationId(), actor);
        Allocation allocation = allocationRepository.findByDonation_DonationId(donation.donationId())
                .orElseThrow(() -> ApiException.notFound("Allocation was not created"));
        Map<String, Object> allocationData = new LinkedHashMap<>();
        allocationData.put("allocationId", allocation.getAllocationId());
        allocationData.put("recipient", allocation.getRecipient().getOrganizationName());
        allocationData.put("priorityScore", allocation.getPriorityScore());
        allocationData.put("explanation", allocation.getDecisionExplanation());
        allocationData.put("factorBreakdown", allocationResult.recommended() == null ? List.of()
                : allocationResult.recommended().factors());
        steps.add(new AdminDtos.DemoStep(3, "Allocation proposed",
                "Engine recommends " + allocation.getRecipient().getOrganizationName() + " with a priority score of "
                        + allocation.getPriorityScore() + "/100. Full factor breakdown and reasoning stored for transparency.",
                "COMPLETED", allocationData));

        Long recipientUserId = allocation.getRecipient().getUser().getUserId();

        RecipientDtos.AllocationView accepted = recipientService.accept(allocation.getAllocationId(), recipientUserId);
        Map<String, Object> acceptData = new LinkedHashMap<>();
        acceptData.put("allocationStatus", accepted.allocationStatus());
        acceptData.put("recipient", accepted.recipientName());
        acceptData.put("volunteer", accepted.volunteerName());
        steps.add(new AdminDtos.DemoStep(4, "Recipient accepts",
                allocation.getRecipient().getOrganizationName()
                        + " accepts the allocation; the system immediately runs smart volunteer matching.",
                "COMPLETED", acceptData));

        VolunteerAssignment assignment = assignmentRepository
                .findByAllocation_AllocationId(allocation.getAllocationId())
                .orElse(null);
        if (assignment == null) {
            assignment = engineService.assignVolunteer(allocation.getAllocationId(), null, actor);
        }
        Long volunteerUserId = assignment.getVolunteer().getUser().getUserId();
        VolunteerDtos.AssignmentView assignmentView = volunteerService.acceptAssignment(assignment.getAssignmentId(), volunteerUserId);
        Map<String, Object> assignmentData = new LinkedHashMap<>();
        assignmentData.put("volunteer", assignment.getVolunteer().getUser().getFullName());
        assignmentData.put("vehicle", assignment.getVolunteer().getVehicleType());
        assignmentData.put("matchScore", assignment.getMatchScore());
        assignmentData.put("explanation", assignment.getMatchExplanation());
        assignmentData.put("distanceKm", assignmentView.distanceKm());
        steps.add(new AdminDtos.DemoStep(5, "Volunteer matched & accepted",
                assignment.getVolunteer().getUser().getFullName() + " (" + assignment.getVolunteer().getVehicleType()
                        + ") accepts the pickup - match score " + assignment.getMatchScore() + "/100.",
                "COMPLETED", assignmentData));

        VolunteerDtos.AssignmentView picked = volunteerService.startDelivery(assignment.getAssignmentId(), volunteerUserId);
        steps.add(new AdminDtos.DemoStep(6, "Pickup started",
                "Food collected from " + picked.donorName() + ". The donor, recipient and admin are notified instantly.",
                "COMPLETED", Map.of("deliveryStatus", picked.deliveryStatus(),
                "pickupTime", String.valueOf(picked.pickupTime()))));

        VolunteerDtos.AssignmentView transit = volunteerService.markInTransit(assignment.getAssignmentId(), volunteerUserId);
        steps.add(new AdminDtos.DemoStep(7, "On the way",
                "Delivery is in transit to " + transit.recipientName() + " (" + transit.distanceKm() + " km route).",
                "COMPLETED", Map.of("deliveryStatus", transit.deliveryStatus())));

        VolunteerDtos.AssignmentView delivered = volunteerService.markDelivered(assignment.getAssignmentId(), volunteerUserId);
        steps.add(new AdminDtos.DemoStep(8, "Delivered",
                "Food handed over to " + delivered.recipientName() + " within the safe consumption window.",
                "COMPLETED", Map.of("deliveryStatus", delivered.deliveryStatus())));

        RecipientDtos.AllocationView confirmed = recipientService.confirmDelivery(allocation.getAllocationId(), recipientUserId);
        steps.add(new AdminDtos.DemoStep(9, "Receipt confirmed - donation completed",
                allocation.getRecipient().getOrganizationName() + " confirms receipt. Volunteer record, storage load and fairness "
                        + "history are updated automatically.", "COMPLETED",
                Map.of("allocationStatus", confirmed.allocationStatus(),
                        "deliveryStatus", confirmed.deliveryStatus())));

        AnalyticsDtos.AnalyticsResponse analytics = analyticsService.overview();
        Map<String, Object> analyticsData = new LinkedHashMap<>();
        analyticsData.put("totalDonations", analytics.overview().totalDonations());
        analyticsData.put("kgRescued", analytics.overview().totalKgRescued());
        analyticsData.put("estimatedMeals", analytics.overview().estimatedMeals());
        analyticsData.put("avgPriorityScore", analytics.overview().avgPriorityScore());
        steps.add(new AdminDtos.DemoStep(10, "Analytics updated in real time",
                "Dashboards now show " + analytics.overview().totalKgRescued() + " kg rescued (~"
                        + analytics.overview().estimatedMeals() + " meals) with an average allocation score of "
                        + analytics.overview().avgPriorityScore() + "/100.", "COMPLETED", analyticsData));

        auditService.record(actor, "SYSTEM", "SCENARIO_EXECUTED",
                "End-to-end rescue scenario executed for donation #" + donation.donationId());

        String narrative = "In one run: " + donor.getOrganizationName() + "'s 18 kg surplus was matched to "
                + allocation.getRecipient().getOrganizationName() + " (score " + allocation.getPriorityScore()
                + "/100), picked up by " + assignment.getVolunteer().getUser().getFullName()
                + " and confirmed - with 10 steps, 6 notifications and a complete audit trail.";

        return new AdminDtos.DemoScenarioResponse(
                "SCENARIO-" + donation.donationId(),
                narrative,
                steps,
                donation.donationId(),
                allocation.getAllocationId(),
                allocation.getRecipient().getOrganizationName(),
                allocation.getPriorityScore(),
                allocationResult.ranked(),
                allocation.getDecisionExplanation());
    }

    /**
     * A volunteer marked BUSY with zero active deliveries is stale state left
     * behind by earlier runs. Repair it so the scenario runner always has at
     * least one available volunteer, exactly like an operator would.
     */
    private void ensureVolunteerCapacity() {
        if (!volunteerRepository.findAllByAvailabilityStatus(AvailabilityStatus.AVAILABLE).isEmpty()) {
            return;
        }
        List<Volunteer> idle = volunteerRepository.findAll().stream()
                .filter(v -> (v.getActiveDeliveries() == null ? 0 : v.getActiveDeliveries()) == 0)
                .toList();
        for (Volunteer volunteer : idle) {
            volunteer.setAvailabilityStatus(AvailabilityStatus.AVAILABLE);
            volunteerRepository.save(volunteer);
        }
        if (!idle.isEmpty()) {
            log.info("Released {} idle volunteer(s) back to AVAILABLE", idle.size());
        }
    }
}
