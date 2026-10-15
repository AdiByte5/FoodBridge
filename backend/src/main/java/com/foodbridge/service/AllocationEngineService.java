package com.foodbridge.service;

import com.foodbridge.common.ApiException;
import com.foodbridge.domain.*;
import com.foodbridge.dto.EngineDtos;
import com.foodbridge.repo.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;

/**
 * Intelligent Allocation & Decision Engine.
 *
 * <p>Evaluates every verified recipient organization against six weighted
 * decision factors, filters out ineligible candidates, ranks the rest and
 * produces a human readable decision explanation for full transparency.</p>
 */
@Service
public class AllocationEngineService {

    public static final double W_EXPIRY = 25.0;
    public static final double W_DEMAND = 20.0;
    public static final double W_STORAGE = 15.0;
    public static final double W_PROXIMITY = 15.0;
    public static final double W_PREFERENCE = 15.0;
    public static final double W_FAIRNESS = 10.0;

    // ------------------------------------------------------------------
    // Food-safety arrival rule.
    // Food that cannot reach a recipient with enough time left to serve it is
    // never allocated there, however well it would otherwise score. The
    // assumptions below describe conservative Chennai city conditions.
    // ------------------------------------------------------------------
    public static final double URBAN_SPEED_KMH = 20.0;
    public static final int HANDLING_MINUTES = 10;
    public static final int SERVE_BUFFER_MINUTES = 60;

    private record Arrival(int travelMinutes, int arrivalMinutes, int availableMinutes, int spareMinutes) {
    }

    private final FoodDonationRepository donationRepository;
    private final RecipientOrganizationRepository recipientRepository;
    private final AllocationRepository allocationRepository;
    private final RecipientPreferenceRepository preferenceRepository;
    private final VolunteerRepository volunteerRepository;
    private final VolunteerAssignmentRepository assignmentRepository;
    private final DeliveryRepository deliveryRepository;
    private final NotificationService notificationService;
    private final AuditService auditService;
    private final ViewMapper viewMapper;

    public AllocationEngineService(FoodDonationRepository donationRepository,
                                   RecipientOrganizationRepository recipientRepository,
                                   AllocationRepository allocationRepository,
                                   RecipientPreferenceRepository preferenceRepository,
                                   VolunteerRepository volunteerRepository,
                                   VolunteerAssignmentRepository assignmentRepository,
                                   DeliveryRepository deliveryRepository,
                                   NotificationService notificationService,
                                   AuditService auditService,
                                   ViewMapper viewMapper) {
        this.donationRepository = donationRepository;
        this.recipientRepository = recipientRepository;
        this.allocationRepository = allocationRepository;
        this.preferenceRepository = preferenceRepository;
        this.volunteerRepository = volunteerRepository;
        this.assignmentRepository = assignmentRepository;
        this.deliveryRepository = deliveryRepository;
        this.notificationService = notificationService;
        this.auditService = auditService;
        this.viewMapper = viewMapper;
    }

    public List<EngineDtos.EngineWeight> weights() {
        return List.of(
                new EngineDtos.EngineWeight("expiry", "Expiry Urgency", W_EXPIRY,
                        "How soon the food expires, weighted by how quickly the recipient can realistically collect it."),
                new EngineDtos.EngineWeight("demand", "Demand Match", W_DEMAND,
                        "How well the donation quantity matches the recipient's registered demand."),
                new EngineDtos.EngineWeight("storage", "Storage Fit", W_STORAGE,
                        "Whether intake fits comfortably in remaining storage capacity without overloading."),
                new EngineDtos.EngineWeight("proximity", "Proximity", W_PROXIMITY,
                        "Great-circle distance between the donor pickup point and the recipient."),
                new EngineDtos.EngineWeight("preference", "Food Preference", W_PREFERENCE,
                        "Whether the recipient accepts this food category."),
                new EngineDtos.EngineWeight("fairness", "Fair Distribution", W_FAIRNESS,
                        "Balances recent allocation history so no single organization is over-served."));
    }

    public EngineDtos.SafetyRule safetyRule() {
        return new EngineDtos.SafetyRule(URBAN_SPEED_KMH, HANDLING_MINUTES, SERVE_BUFFER_MINUTES,
                "Before scoring, the engine checks whether the food can actually arrive in time: it assumes "
                        + (int) URBAN_SPEED_KMH + " km/h city travel plus " + HANDLING_MINUTES
                        + " minutes of handling, and requires at least " + SERVE_BUFFER_MINUTES
                        + " minutes left on the safe window so the recipient can still serve it.");
    }

    /** Travel and handover estimate for one recipient, or null when the location is unknown. */
    private Arrival arrival(Double distanceKm, double hoursToExpiry) {
        if (distanceKm == null || distanceKm.isNaN()) {
            return null;
        }
        int travelMinutes = (int) Math.round(distanceKm / URBAN_SPEED_KMH * 60);
        int arrivalMinutes = travelMinutes + HANDLING_MINUTES;
        int availableMinutes = (int) Math.round(hoursToExpiry * 60) - SERVE_BUFFER_MINUTES;
        return new Arrival(travelMinutes, arrivalMinutes, availableMinutes, availableMinutes - arrivalMinutes);
    }

    @Transactional(readOnly = true)
    public EngineDtos.RecommendationResponse recommend(Long donationId) {
        FoodDonation donation = donationRepository.findById(donationId)
                .orElseThrow(() -> ApiException.notFound("Donation not found"));
        return evaluate(donation);
    }

    /**
     * Runs the engine and persists the winning allocation as a PROPOSED decision.
     */
    @Transactional
    public EngineDtos.RecommendationResponse allocate(Long donationId, User actor) {
        FoodDonation donation = donationRepository.findById(donationId)
                .orElseThrow(() -> ApiException.notFound("Donation not found"));

        if (donation.getStatus() == DonationStatus.COMPLETED || donation.getStatus() == DonationStatus.CANCELLED
                || donation.getStatus() == DonationStatus.EXPIRED) {
            throw ApiException.badRequest("This donation is " + donation.getStatus() + " and can no longer be allocated");
        }

        allocationRepository.findByDonation_DonationIdOrderByAllocationTimeDesc(donationId).stream()
                .filter(a -> a.getAllocationStatus() == AllocationStatus.PROPOSED)
                .forEach(a -> {
                    a.setAllocationStatus(AllocationStatus.SUPERSEDED);
                    allocationRepository.save(a);
                });

        EngineDtos.RecommendationResponse response = evaluate(donation);
        EngineDtos.RecipientCandidate winner = response.recommended();
        if (winner == null) {
            throw ApiException.badRequest("No eligible recipient found. Verify recipient organizations and their storage capacity.");
        }

        RecipientOrganization recipient = recipientRepository.findById(winner.recipientId())
                .orElseThrow(() -> ApiException.notFound("Recipient not found"));

        Allocation allocation = allocationRepository.save(Allocation.builder()
                .donation(donation)
                .recipient(recipient)
                .priorityScore(winner.totalScore())
                .decisionExplanation(winner.explanation())
                .factorBreakdown(FactorCodec.encode(winner.factors()))
                .allocationTime(LocalDateTime.now())
                .allocationStatus(AllocationStatus.PROPOSED)
                .build());

        donation.setStatus(DonationStatus.ALLOCATED);
        donationRepository.save(donation);

        notificationService.notify(recipient.getUser(), "New allocation recommended",
                donation.getFoodName() + " (" + donation.getQuantity() + " " + safeUnit(donation) + ") from "
                        + donation.getDonor().getOrganizationName() + " has been allocated to you with priority score "
                        + winner.totalScore() + "/100. Review and accept it in your dashboard.",
                NotificationType.ALLOCATION);
        notificationService.notify(donation.getDonor().getUser(), "Donation matched to a recipient",
                "Your donation \"" + donation.getFoodName() + "\" was matched with "
                        + recipient.getOrganizationName() + " (score " + winner.totalScore() + "/100). "
                        + "You will be notified as the pickup progresses.",
                NotificationType.ALLOCATION);
        auditService.record(actor, "ALLOCATION", "ENGINE_ALLOCATED",
                "Engine allocated donation #" + donationId + " (" + donation.getFoodName() + ") to "
                        + recipient.getOrganizationName() + " with score " + winner.totalScore());

        return new EngineDtos.RecommendationResponse(
                response.donationId(), response.foodName(), response.quantity(), response.unit(),
                response.categoryName(), response.hoursToExpiry(), response.evaluatedAt(),
                response.eligibleCount(), response.excludedCount(), response.ranked(),
                winner, response.summary() + " Allocation #" + allocation.getAllocationId() + " created as PROPOSED.",
                response.appliedFilters(), response.weights(), response.safetyRule());
    }

    private EngineDtos.RecommendationResponse evaluate(FoodDonation donation) {
        LocalDateTime now = LocalDateTime.now();
        double hours = ViewMapper.hoursUntil(donation.getExpiryTime());
        Double donorLat = donation.getDonor().getLatitude();
        Double donorLng = donation.getDonor().getLongitude();
        List<RecipientOrganization> recipients = recipientRepository.findAllByOrderByOrganizationNameAsc();

        Map<Long, Double> received30 = new HashMap<>();
        for (Object[] row : allocationRepository.receivedSince(now.minusDays(30))) {
            received30.put(((Number) row[0]).longValue(), ((Number) row[1]).doubleValue());
        }
        double maxReceived = received30.values().stream().mapToDouble(Double::doubleValue).max().orElse(0.0);

        List<EngineDtos.RecipientCandidate> candidates = new ArrayList<>();
        List<String> filters = new ArrayList<>();
        filters.add("Only verified recipient organizations are evaluated");
        filters.add("Recipients without enough free storage capacity are excluded");
        filters.add("Recipients that do not accept the food category are excluded");
        filters.add("Recipients that cannot be reached safely before the food expires are excluded");

        int excluded = 0;
        for (RecipientOrganization recipient : recipients) {
            List<RecipientPreference> preferences = preferenceRepository.findByRecipient_RecipientId(recipient.getRecipientId());
            boolean hasPreferences = !preferences.isEmpty();
            boolean matchesPreference = !hasPreferences || (donation.getCategory() != null && preferences.stream()
                    .anyMatch(p -> Objects.equals(p.getCategory().getCategoryId(), donation.getCategory().getCategoryId())));

            double capacity = recipient.getStorageCapacityKg() == null ? 0 : recipient.getStorageCapacityKg();
            double load = recipient.getCurrentLoadKg() == null ? 0 : recipient.getCurrentLoadKg();
            double free = Math.max(capacity - load, 0);
            Double distance = GeoUtils.distanceKm(donorLat, donorLng, recipient.getLatitude(), recipient.getLongitude());

            if (!Boolean.TRUE.equals(recipient.getVerified())) {
                excluded++;
                candidates.add(excludedCandidate(recipient, distance, free, "Organization is not verified yet"));
                continue;
            }
            if (free < donation.getQuantity()) {
                excluded++;
                candidates.add(excludedCandidate(recipient, distance, free,
                        "Free storage " + GeoUtils.round(free, 1) + " kg is less than the donation size"));
                continue;
            }
            if (!matchesPreference) {
                excluded++;
                candidates.add(excludedCandidate(recipient, distance, free,
                        "Organization does not accept the " + categoryName(donation) + " category"));
                continue;
            }

            Arrival arrival = arrival(distance, hours);
            if (arrival != null && arrival.spareMinutes() < 0) {
                excluded++;
                candidates.add(excludedCandidate(recipient, distance, free,
                        "Cannot arrive safely - the trip needs about " + arrival.arrivalMinutes()
                                + " min (travel + handling) but only " + Math.max(arrival.availableMinutes(), 0)
                                + " min are available before the safe window closes"));
                continue;
            }

            double proximityScore = GeoUtils.proximityScore(distance);
            double receivedKg = received30.getOrDefault(recipient.getRecipientId(), 0.0);
            long allocationsLast30 = allocationRepository
                    .findByRecipient_RecipientIdAndAllocationTimeAfter(recipient.getRecipientId(), now.minusDays(30))
                    .size();

            List<EngineDtos.FactorScore> factors = List.of(
                    expiryFactor(hours, proximityScore),
                    demandFactor(recipient.getDemandKg(), donation.getQuantity()),
                    storageFactor(capacity, load, donation.getQuantity()),
                    proximityFactor(distance, proximityScore),
                    preferenceFactor(hasPreferences, matchesPreference),
                    fairnessFactor(receivedKg, maxReceived));

            double total = factors.stream().mapToDouble(EngineDtos.FactorScore::contribution).sum();
            total = GeoUtils.round(Math.min(total, 100.0), 1);

            candidates.add(new EngineDtos.RecipientCandidate(
                    recipient.getRecipientId(),
                    recipient.getOrganizationName(),
                    recipient.getOrganizationType() == null ? null : recipient.getOrganizationType().name(),
                    recipient.getAddress(),
                    distance == null || distance.isNaN() ? null : GeoUtils.round(distance, 2),
                    arrival == null ? null : arrival.arrivalMinutes(),
                    arrival == null ? null : arrival.spareMinutes(),
                    GeoUtils.round(free, 1),
                    recipient.getDemandKg(),
                    hasPreferences && matchesPreference,
                    allocationsLast30,
                    GeoUtils.round(receivedKg, 1),
                    total,
                    factors,
                    buildExplanation(recipient, factors, distance, donation, arrival == null ? null : arrival.spareMinutes()),
                    false,
                    null));
        }

        candidates.sort(Comparator.comparingDouble(EngineDtos.RecipientCandidate::totalScore).reversed());
        List<EngineDtos.RecipientCandidate> eligible = candidates.stream().filter(c -> !c.excluded()).toList();
        EngineDtos.RecipientCandidate recommended = eligible.isEmpty() ? null : eligible.get(0);

        String summary = buildSummary(eligible, excluded, donation);
        return new EngineDtos.RecommendationResponse(
                donation.getDonationId(), donation.getFoodName(), donation.getQuantity(), safeUnit(donation),
                categoryName(donation), hours, now, eligible.size(), excluded,
                candidates, recommended, summary, filters, weights(), safetyRule());
    }

    private EngineDtos.RecipientCandidate excludedCandidate(RecipientOrganization recipient, Double distance,
                                                            double free, String reason) {
        return new EngineDtos.RecipientCandidate(
                recipient.getRecipientId(), recipient.getOrganizationName(),
                recipient.getOrganizationType() == null ? null : recipient.getOrganizationType().name(),
                recipient.getAddress(),
                distance == null || distance.isNaN() ? null : GeoUtils.round(distance, 2),
                null, null,
                GeoUtils.round(free, 1), recipient.getDemandKg(), false, 0, 0, 0.0,
                List.of(), "Excluded: " + reason, true, reason);
    }

    private EngineDtos.FactorScore expiryFactor(double hours, double proximityScore) {
        double base;
        if (hours <= 2) base = 100;
        else if (hours <= 4) base = 92;
        else if (hours <= 8) base = 80;
        else if (hours <= 12) base = 70;
        else if (hours <= 24) base = 55;
        else if (hours <= 48) base = 35;
        else base = 15;
        double score = GeoUtils.round(base * (0.65 + 0.35 * proximityScore / 100.0), 1);
        String detail = hours <= 0
                ? "Already past the safe consumption window - treat as critical"
                : "Expires in about " + GeoUtils.round(hours, 1) + " h; quicker handover preferred";
        return new EngineDtos.FactorScore("expiry", "Expiry Urgency", score, W_EXPIRY,
                GeoUtils.round(score * W_EXPIRY / 100.0, 2), detail);
    }

    private EngineDtos.FactorScore demandFactor(Double demand, double quantity) {
        double d = demand == null ? 0 : demand;
        double score;
        String detail;
        if (d <= 0) {
            score = 25;
            detail = "No active food demand registered";
        } else {
            double coverage = quantity / d;
            if (coverage <= 1) {
                score = Math.min(100, 60 + 40 * coverage);
                detail = "This donation covers " + Math.round(coverage * 100) + "% of the registered demand ("
                        + GeoUtils.round(d, 1) + " kg)";
            } else {
                score = Math.max(45, 100 - (coverage - 1) * 35);
                detail = "Donation exceeds registered demand of " + GeoUtils.round(d, 1)
                        + " kg by " + Math.round((coverage - 1) * 100) + "%";
            }
        }
        return new EngineDtos.FactorScore("demand", "Demand Match", GeoUtils.round(score, 1), W_DEMAND,
                GeoUtils.round(score * W_DEMAND / 100.0, 2), detail);
    }

    private EngineDtos.FactorScore storageFactor(double capacity, double load, double quantity) {
        if (capacity <= 0) {
            return new EngineDtos.FactorScore("storage", "Storage Fit", 30, W_STORAGE,
                    GeoUtils.round(30 * W_STORAGE / 100.0, 2), "No storage capacity registered");
        }
        double utilisationAfter = (load + quantity) / capacity;
        double score = Math.max(5, Math.min(100, 100 - Math.abs(utilisationAfter - 0.65) * 140));
        String detail = "Storage utilisation after intake would be " + Math.round(utilisationAfter * 100)
                + "% of " + GeoUtils.round(capacity, 0) + " kg capacity";
        return new EngineDtos.FactorScore("storage", "Storage Fit", GeoUtils.round(score, 1), W_STORAGE,
                GeoUtils.round(score * W_STORAGE / 100.0, 2), detail);
    }

    private EngineDtos.FactorScore proximityFactor(Double distance, double proximityScore) {
        String detail = distance == null || distance.isNaN()
                ? "Location not on record; neutral score applied"
                : GeoUtils.round(distance, 2) + " km from the pickup point (~"
                + Math.max(1, Math.round(distance / 0.4)) + " min ride)";
        return new EngineDtos.FactorScore("proximity", "Proximity", GeoUtils.round(proximityScore, 1), W_PROXIMITY,
                GeoUtils.round(proximityScore * W_PROXIMITY / 100.0, 2), detail);
    }

    private EngineDtos.FactorScore preferenceFactor(boolean hasPreferences, boolean matches) {
        double score = !hasPreferences ? 70 : (matches ? 100 : 0);
        String detail = !hasPreferences
                ? "No category restrictions - open to all food types"
                : (matches ? "This category is on the organization's accepted list"
                : "Category not accepted by this organization");
        return new EngineDtos.FactorScore("preference", "Food Preference", score, W_PREFERENCE,
                GeoUtils.round(score * W_PREFERENCE / 100.0, 2), detail);
    }

    private EngineDtos.FactorScore fairnessFactor(double receivedKg, double maxReceivedKg) {
        double score = maxReceivedKg <= 0 ? 100 : Math.max(0, 100 * (1 - receivedKg / maxReceivedKg));
        String detail = maxReceivedKg <= 0
                ? "No allocations in the last 30 days - perfectly balanced starting point"
                : "Received " + GeoUtils.round(receivedKg, 1) + " kg in the last 30 days (highest peer received "
                + GeoUtils.round(maxReceivedKg, 1) + " kg)";
        return new EngineDtos.FactorScore("fairness", "Fair Distribution", GeoUtils.round(score, 1), W_FAIRNESS,
                GeoUtils.round(score * W_FAIRNESS / 100.0, 2), detail);
    }

    private String buildExplanation(RecipientOrganization recipient, List<EngineDtos.FactorScore> factors,
                                    Double distance, FoodDonation donation, Integer spareMinutes) {
        List<EngineDtos.FactorScore> top = factors.stream()
                .sorted(Comparator.comparingDouble(EngineDtos.FactorScore::contribution).reversed())
                .limit(3)
                .toList();

        StringBuilder sb = new StringBuilder();
        double total = factors.stream().mapToDouble(EngineDtos.FactorScore::contribution).sum();
        sb.append(recipient.getOrganizationName()).append(" scored ").append(GeoUtils.round(Math.min(total, 100), 1))
                .append("/100. ");
        sb.append("Recommended because ");
        for (int i = 0; i < top.size(); i++) {
            EngineDtos.FactorScore factor = top.get(i);
            if (i > 0) {
                sb.append(i == top.size() - 1 ? " and " : ", ");
            }
            sb.append(factor.label().toLowerCase()).append(" scores ").append(factor.score())
                    .append(" (").append(factor.detail().toLowerCase()).append(")");
        }
        sb.append(".");
        if (spareMinutes != null && spareMinutes > 0) {
            sb.append(" It can collect and deliver the food with about ").append(spareMinutes)
                    .append(" minutes to spare before the safe window closes.");
        }
        return sb.toString();
    }

    private String buildSummary(List<EngineDtos.RecipientCandidate> eligible, int excluded, FoodDonation donation) {
        if (eligible.isEmpty()) {
            return "Engine evaluated all recipient organizations but none are currently eligible for \""
                    + donation.getFoodName() + "\" (" + excluded + " excluded).";
        }
        EngineDtos.RecipientCandidate first = eligible.get(0);
        String runnerUp = eligible.size() > 1
                ? " Runner-up: " + eligible.get(1).organizationName() + " (" + eligible.get(1).totalScore() + ")."
                : "";
        return "Engine evaluated " + eligible.size() + " eligible recipient" + (eligible.size() == 1 ? "" : "s")
                + " and excluded " + excluded + ". Best match: " + first.organizationName() + " ("
                + first.totalScore() + "/100)." + runnerUp;
    }

    // ------------------------------------------------------------------
    // Smart Volunteer Coordination
    // ------------------------------------------------------------------

    @Transactional(readOnly = true)
    public EngineDtos.VolunteerMatchResponse matchVolunteers(Long allocationId) {
        Allocation allocation = allocationRepository.findById(allocationId)
                .orElseThrow(() -> ApiException.notFound("Allocation not found"));
        List<EngineDtos.VolunteerCandidate> candidates = rankVolunteers(allocation);
        return new EngineDtos.VolunteerMatchResponse(
                allocationId,
                allocation.getDonation().getFoodName(),
                allocation.getDonation().getPickupAddress(),
                allocation.getRecipient().getOrganizationName(),
                candidates,
                candidates.isEmpty() ? null : candidates.get(0),
                candidates.isEmpty()
                        ? "No volunteer is currently marked available. Ask a volunteer to go available and retry."
                        : candidates.size() + " available volunteer" + (candidates.size() == 1 ? "" : "s")
                        + " evaluated. Best match: " + candidates.get(0).name() + " ("
                        + candidates.get(0).matchScore() + "/100).");
    }

    @Transactional
    public VolunteerAssignment assignVolunteer(Long allocationId, Long volunteerId, User actor) {
        Allocation allocation = allocationRepository.findById(allocationId)
                .orElseThrow(() -> ApiException.notFound("Allocation not found"));
        if (assignmentRepository.findByAllocation_AllocationId(allocationId).isPresent()) {
            throw ApiException.conflict("A volunteer is already assigned to this allocation");
        }

        EngineDtos.VolunteerCandidate chosen;
        if (volunteerId == null) {
            List<EngineDtos.VolunteerCandidate> ranked = rankVolunteers(allocation);
            if (ranked.isEmpty()) {
                throw ApiException.badRequest("No available volunteer found");
            }
            chosen = ranked.get(0);
        } else {
            Volunteer volunteer = volunteerRepository.findById(volunteerId)
                    .orElseThrow(() -> ApiException.notFound("Volunteer not found"));
            chosen = scoreVolunteer(volunteer, allocation);
        }

        Volunteer volunteer = volunteerRepository.findById(chosen.volunteerId())
                .orElseThrow(() -> ApiException.notFound("Volunteer not found"));

        VolunteerAssignment assignment = assignmentRepository.save(VolunteerAssignment.builder()
                .allocation(allocation)
                .volunteer(volunteer)
                .assignedTime(LocalDateTime.now())
                .matchScore(chosen.matchScore())
                .matchExplanation(chosen.explanation())
                .assignmentStatus(AssignmentStatus.PENDING)
                .build());

        double distance = chosen.distanceKm() == null || chosen.distanceKm().isNaN() ? 3.5 : chosen.distanceKm();
        deliveryRepository.save(Delivery.builder()
                .assignment(assignment)
                .deliveryStatus(DeliveryStatus.PENDING)
                .route(allocation.getDonation().getPickupAddress() + " -> " + allocation.getRecipient().getAddress())
                .distanceKm(GeoUtils.round(distance, 2))
                .build());

        volunteer.setActiveDeliveries((volunteer.getActiveDeliveries() == null ? 0 : volunteer.getActiveDeliveries()) + 1);
        volunteer.setAvailabilityStatus(AvailabilityStatus.BUSY);
        volunteerRepository.save(volunteer);

        notificationService.notify(volunteer.getUser(), "New pickup task assigned",
                "You have been matched to deliver \"" + allocation.getDonation().getFoodName() + "\" ("
                        + allocation.getDonation().getQuantity() + " " + safeUnit(allocation.getDonation())
                        + ") from " + allocation.getDonation().getDonor().getOrganizationName()
                        + ". Match score " + chosen.matchScore() + "/100. Accept the assignment to begin.",
                NotificationType.ASSIGNMENT);
        notificationService.notify(allocation.getRecipient().getUser(), "Volunteer assigned",
                volunteer.getUser().getFullName() + " (" + volunteer.getVehicleType() + ") will handle the pickup and delivery.",
                NotificationType.ASSIGNMENT);
        notificationService.notify(allocation.getDonation().getDonor().getUser(), "Volunteer on the way",
                volunteer.getUser().getFullName() + " has been assigned to collect your donation.",
                NotificationType.ASSIGNMENT);
        auditService.record(actor, "VOLUNTEER", "VOLUNTEER_ASSIGNED",
                "Volunteer " + volunteer.getUser().getFullName() + " matched to allocation #" + allocationId
                        + " with score " + chosen.matchScore());

        return assignment;
    }

    @Transactional(readOnly = true)
    public List<EngineDtos.VolunteerCandidate> rankVolunteers(Allocation allocation) {
        return volunteerRepository.findAllByAvailabilityStatus(AvailabilityStatus.AVAILABLE).stream()
                .map(v -> scoreVolunteer(v, allocation))
                .sorted(Comparator.comparingDouble(EngineDtos.VolunteerCandidate::matchScore).reversed())
                .toList();
    }

    private EngineDtos.VolunteerCandidate scoreVolunteer(Volunteer volunteer, Allocation allocation) {
        Donor donor = allocation.getDonation().getDonor();
        Double distance = GeoUtils.distanceKm(donor.getLatitude(), donor.getLongitude(),
                volunteer.getLatitude(), volunteer.getLongitude());
        double proximity = GeoUtils.proximityScore(distance);

        int active = volunteer.getActiveDeliveries() == null ? 0 : volunteer.getActiveDeliveries();
        double loadScore = active == 0 ? 100 : active == 1 ? 70 : active == 2 ? 40 : 15;

        int completed = volunteer.getCompletedDeliveries() == null ? 0 : volunteer.getCompletedDeliveries();
        double experienceScore = Math.min(100, completed * 12.0);

        double total = GeoUtils.round(0.55 * proximity + 0.25 * loadScore + 0.20 * experienceScore, 1);

        StringBuilder sb = new StringBuilder();
        sb.append(volunteer.getUser().getFullName()).append(" scored ").append(total).append("/100. ");
        sb.append(distance == null || distance.isNaN()
                ? "Location not shared; "
                : GeoUtils.round(distance, 1) + " km from the pickup point; ");
        sb.append(active == 0 ? "currently free of active deliveries; " : active + " active deliver" + (active == 1 ? "y" : "ies") + "; ");
        sb.append(completed).append(" completed deliver").append(completed == 1 ? "y" : "ies").append(" so far.");

        return new EngineDtos.VolunteerCandidate(
                volunteer.getVolunteerId(),
                volunteer.getUser().getFullName(),
                volunteer.getVehicleType(),
                volunteer.getAvailabilityStatus().name(),
                distance == null || distance.isNaN() ? null : GeoUtils.round(distance, 2),
                active,
                completed,
                total,
                sb.toString());
    }

    private String categoryName(FoodDonation donation) {
        return donation.getCategory() == null ? "Uncategorised" : donation.getCategory().getCategoryName();
    }

    private String safeUnit(FoodDonation donation) {
        return donation.getUnit() == null ? "kg" : donation.getUnit();
    }
}
