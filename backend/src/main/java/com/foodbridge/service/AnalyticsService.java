package com.foodbridge.service;

import com.foodbridge.domain.Delivery;
import com.foodbridge.domain.DonationStatus;
import com.foodbridge.domain.FoodDonation;
import com.foodbridge.domain.UserRole;
import com.foodbridge.dto.AnalyticsDtos;
import com.foodbridge.repo.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;

@Service
public class AnalyticsService {

    private static final DateTimeFormatter DAY_LABEL = DateTimeFormatter.ofPattern("dd MMM");

    private final FoodDonationRepository donationRepository;
    private final AllocationRepository allocationRepository;
    private final DeliveryRepository deliveryRepository;
    private final VolunteerRepository volunteerRepository;
    private final RecipientOrganizationRepository recipientRepository;
    private final DonorRepository donorRepository;
    private final UserRepository userRepository;
    private final AuditService auditService;
    private final AllocationEngineService engineService;

    public AnalyticsService(FoodDonationRepository donationRepository,
                            AllocationRepository allocationRepository,
                            DeliveryRepository deliveryRepository,
                            VolunteerRepository volunteerRepository,
                            RecipientOrganizationRepository recipientRepository,
                            DonorRepository donorRepository,
                            UserRepository userRepository,
                            AuditService auditService,
                            AllocationEngineService engineService) {
        this.donationRepository = donationRepository;
        this.allocationRepository = allocationRepository;
        this.deliveryRepository = deliveryRepository;
        this.volunteerRepository = volunteerRepository;
        this.recipientRepository = recipientRepository;
        this.donorRepository = donorRepository;
        this.userRepository = userRepository;
        this.auditService = auditService;
        this.engineService = engineService;
    }

    @Transactional(readOnly = true)
    public AnalyticsDtos.AnalyticsResponse overview() {
        List<FoodDonation> donations = donationRepository.findAll();
        LocalDateTime now = LocalDateTime.now();

        long total = donations.size();
        long completed = donations.stream().filter(d -> d.getStatus() == DonationStatus.COMPLETED).count();
        long cancelled = donations.stream().filter(d -> d.getStatus() == DonationStatus.CANCELLED).count();
        long active = total - completed - cancelled
                - donations.stream().filter(d -> d.getStatus() == DonationStatus.EXPIRED).count();
        double kgRescued = donations.stream()
                .filter(d -> d.getStatus() == DonationStatus.COMPLETED || d.getStatus() == DonationStatus.DELIVERED)
                .mapToDouble(FoodDonation::getQuantity)
                .sum();

        long totalVolunteers = volunteerRepository.count();
        long activeVolunteers = volunteerRepository.findAll().stream()
                .filter(v -> v.getAvailabilityStatus() != null && !v.getAvailabilityStatus().name().equals("OFFLINE"))
                .count();

        long allocationsTotal = allocationRepository.count();
        long allocationsAccepted = allocationRepository.countByAllocationStatus(com.foodbridge.domain.AllocationStatus.ACCEPTED)
                + allocationRepository.countByAllocationStatus(com.foodbridge.domain.AllocationStatus.COMPLETED);

        List<Delivery> deliveries = deliveryRepository.findAll();
        double avgDeliveryHours = deliveries.stream()
                .filter(d -> d.getPickupTime() != null && d.getDeliveryTime() != null)
                .mapToDouble(d -> java.time.Duration.between(d.getPickupTime(), d.getDeliveryTime()).toMinutes() / 60.0)
                .average().orElse(0);

        double avgPriority = allocationRepository.findAll().stream()
                .filter(a -> a.getPriorityScore() != null)
                .mapToDouble(a -> a.getPriorityScore())
                .average().orElse(0);

        long expiringSoon = donations.stream()
                .filter(d -> (d.getStatus() == DonationStatus.PENDING || d.getStatus() == DonationStatus.ALLOCATED))
                .filter(d -> d.getExpiryTime() != null && d.getExpiryTime().isBefore(now.plusHours(6)))
                .count();

        long pendingVerifications = donorRepository.findAllByOrderByOrganizationNameAsc().stream()
                .filter(d -> !Boolean.TRUE.equals(d.getVerified())).count()
                + recipientRepository.findAllByOrderByOrganizationNameAsc().stream()
                .filter(r -> !Boolean.TRUE.equals(r.getVerified())).count();

        Map<String, Long> usersByRole = new LinkedHashMap<>();
        for (UserRole role : UserRole.values()) {
            usersByRole.put(role.name(), userRepository.countByRole(role));
        }

        AnalyticsDtos.AnalyticsOverview overview = new AnalyticsDtos.AnalyticsOverview(
                total, active, completed, cancelled,
                GeoUtils.round(kgRescued, 1),
                Math.round(kgRescued * 2.5),
                activeVolunteers, totalVolunteers,
                recipientRepository.countByVerifiedTrue(),
                recipientRepository.count(),
                allocationsTotal, allocationsAccepted,
                allocationsTotal == 0 ? 0 : GeoUtils.round(allocationsAccepted * 100.0 / allocationsTotal, 1),
                GeoUtils.round(avgDeliveryHours, 2),
                expiringSoon,
                GeoUtils.round(avgPriority, 1),
                pendingVerifications,
                usersByRole);

        return new AnalyticsDtos.AnalyticsResponse(
                overview,
                donationTrend(donations, deliveries),
                categoryDistribution(),
                statusFunnel(donations),
                fairness(),
                volunteerLeaderboard(),
                auditService.recent(6).stream()
                        .map(log -> new AnalyticsDtos.ActivityItem(
                                log.timestamp() == null ? "" : log.timestamp().toString(),
                                log.module(), log.action(), log.description(), log.actor()))
                        .toList(),
                engineService.weights());
    }

    private List<AnalyticsDtos.TrendPoint> donationTrend(List<FoodDonation> donations, List<Delivery> deliveries) {
        List<AnalyticsDtos.TrendPoint> points = new ArrayList<>();
        LocalDate today = LocalDate.now();
        for (int i = 13; i >= 0; i--) {
            LocalDate day = today.minusDays(i);
            long created = donations.stream()
                    .filter(d -> d.getCreatedAt() != null && d.getCreatedAt().toLocalDate().equals(day))
                    .count();
            double kg = donations.stream()
                    .filter(d -> d.getCreatedAt() != null && d.getCreatedAt().toLocalDate().equals(day))
                    .mapToDouble(FoodDonation::getQuantity).sum();
            long completedThatDay = deliveries.stream()
                    .filter(d -> d.getDeliveryTime() != null && d.getDeliveryTime().toLocalDate().equals(day))
                    .count();
            points.add(new AnalyticsDtos.TrendPoint(
                    day.toString(),
                    DAY_LABEL.format(day),
                    created,
                    GeoUtils.round(kg, 1),
                    completedThatDay));
        }
        return points;
    }

    private List<AnalyticsDtos.Slice> categoryDistribution() {
        return donationRepository.categoryDistribution().stream()
                .map(row -> new AnalyticsDtos.Slice(
                        row[0] == null ? "Uncategorised" : row[0].toString(),
                        ((Number) row[1]).doubleValue(),
                        GeoUtils.round(((Number) row[2]).doubleValue(), 1)))
                .toList();
    }

    private List<AnalyticsDtos.Slice> statusFunnel(List<FoodDonation> donations) {
        List<AnalyticsDtos.Slice> slices = new ArrayList<>();
        for (DonationStatus status : DonationStatus.values()) {
            long count = donations.stream().filter(d -> d.getStatus() == status).count();
            double kg = donations.stream().filter(d -> d.getStatus() == status)
                    .mapToDouble(FoodDonation::getQuantity).sum();
            slices.add(new AnalyticsDtos.Slice(status.name(), count, GeoUtils.round(kg, 1)));
        }
        return slices;
    }

    private List<AnalyticsDtos.FairnessPoint> fairness() {
        return allocationRepository.distributionByRecipient().stream()
                .map(row -> new AnalyticsDtos.FairnessPoint(
                        row[1].toString(),
                        GeoUtils.round(((Number) row[2]).doubleValue(), 1),
                        0))
                .toList();
    }

    private List<AnalyticsDtos.LeaderboardRow> volunteerLeaderboard() {
        return volunteerRepository.findAllByOrderByCompletedDeliveriesDesc().stream()
                .limit(5)
                .map(v -> new AnalyticsDtos.LeaderboardRow(
                        v.getUser().getFullName(),
                        v.getCompletedDeliveries() == null ? 0 : v.getCompletedDeliveries(),
                        v.getActiveDeliveries() == null ? 0 : v.getActiveDeliveries(),
                        v.getVehicleType()))
                .toList();
    }

    @Transactional(readOnly = true)
    public String exportDonationsCsv() {
        StringBuilder sb = new StringBuilder();
        sb.append("donation_id,food_name,category,quantity,unit,donor,expiry_time,status,created_at\n");
        for (FoodDonation d : donationRepository.findAllByOrderByCreatedAtDesc()) {
            sb.append(d.getDonationId()).append(',')
                    .append(csv(d.getFoodName())).append(',')
                    .append(csv(d.getCategory() == null ? "" : d.getCategory().getCategoryName())).append(',')
                    .append(d.getQuantity()).append(',')
                    .append(csv(d.getUnit())).append(',')
                    .append(csv(d.getDonor().getOrganizationName())).append(',')
                    .append(d.getExpiryTime()).append(',')
                    .append(d.getStatus()).append(',')
                    .append(d.getCreatedAt()).append('\n');
        }
        return sb.toString();
    }

    private String csv(String value) {
        if (value == null) {
            return "";
        }
        return value.contains(",") ? "\"" + value.replace("\"", "\"\"") + "\"" : value;
    }
}
