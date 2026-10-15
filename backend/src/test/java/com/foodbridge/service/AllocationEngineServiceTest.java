package com.foodbridge.service;

import com.foodbridge.domain.*;
import com.foodbridge.dto.EngineDtos;
import com.foodbridge.repo.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.when;

/**
 * Checks the decision engine in isolation: eligibility filters, weighted scoring
 * and the explanation that is stored with every recommendation.
 */
@ExtendWith(MockitoExtension.class)
class AllocationEngineServiceTest {

    @Mock private FoodDonationRepository donationRepository;
    @Mock private RecipientOrganizationRepository recipientRepository;
    @Mock private AllocationRepository allocationRepository;
    @Mock private RecipientPreferenceRepository preferenceRepository;
    @Mock private VolunteerRepository volunteerRepository;
    @Mock private VolunteerAssignmentRepository assignmentRepository;
    @Mock private DeliveryRepository deliveryRepository;
    @Mock private NotificationService notificationService;
    @Mock private AuditService auditService;
    @Mock private ViewMapper viewMapper;

    private AllocationEngineService engine;
    private FoodCategory cookedMeals;
    private FoodCategory bakery;
    private FoodDonation donation;

    @BeforeEach
    void setUp() {
        engine = new AllocationEngineService(donationRepository, recipientRepository, allocationRepository,
                preferenceRepository, volunteerRepository, assignmentRepository, deliveryRepository,
                notificationService, auditService, viewMapper);

        cookedMeals = FoodCategory.builder().categoryId(1L).categoryName("Cooked Meals")
                .recommendedStorage(StorageRequirement.HOT_HOLDING).shelfLifeHours(4).build();
        bakery = FoodCategory.builder().categoryId(2L).categoryName("Bakery & Bread")
                .recommendedStorage(StorageRequirement.AMBIENT).shelfLifeHours(24).build();

        Donor donor = Donor.builder()
                .donorId(9L)
                .organizationName("Spice Route Restaurant")
                .address("Indiranagar, Bengaluru")
                .latitude(12.9784)
                .longitude(77.6408)
                .verified(true)
                .build();

        donation = FoodDonation.builder()
                .donationId(100L)
                .donor(donor)
                .category(cookedMeals)
                .foodName("Veg Biryani")
                .quantity(20.0)
                .unit("kg")
                .expiryTime(LocalDateTime.now().plusHours(4))
                .pickupAddress("Indiranagar, Bengaluru")
                .storageRequirement(StorageRequirement.HOT_HOLDING)
                .status(DonationStatus.PENDING)
                .createdAt(LocalDateTime.now())
                .build();

        when(donationRepository.findById(100L)).thenReturn(Optional.of(donation));
        when(allocationRepository.receivedSince(any())).thenReturn(List.of());
        when(allocationRepository.findByRecipient_RecipientIdAndAllocationTimeAfter(anyLong(), any()))
                .thenReturn(List.of());
    }

    private RecipientOrganization recipient(long id, String name, double capacity, double load, double demand,
                                            double lat, double lng, boolean verified) {
        return RecipientOrganization.builder()
                .recipientId(id)
                .organizationName(name)
                .organizationType(OrganizationType.NGO)
                .address(name + " address")
                .storageCapacityKg(capacity)
                .currentLoadKg(load)
                .demandKg(demand)
                .latitude(lat)
                .longitude(lng)
                .verified(verified)
                .build();
    }

    private void preferences(Map<Long, List<FoodCategory>> byRecipient) {
        when(preferenceRepository.findByRecipient_RecipientId(anyLong())).thenAnswer(invocation -> {
            Long recipientId = invocation.getArgument(0);
            return byRecipient.getOrDefault(recipientId, List.of()).stream()
                    .map(category -> RecipientPreference.builder()
                            .id(new RecipientPreferenceId(recipientId, category.getCategoryId()))
                            .category(category)
                            .build())
                    .toList();
        });
    }

    @Test
    @DisplayName("ineligible recipients are excluded with a reason and only eligible ones are ranked")
    void filtersIneligibleRecipients() {
        RecipientOrganization good = recipient(1, "Good NGO", 200, 50, 40, 12.97, 77.64, true);
        RecipientOrganization full = recipient(2, "Full Warehouse", 100, 90, 20, 12.97, 77.64, true);
        RecipientOrganization wrongCategory = recipient(3, "Bakery Only NGO", 300, 10, 60, 12.97, 77.64, true);
        RecipientOrganization unverified = recipient(4, "Unverified NGO", 300, 10, 60, 12.97, 77.64, false);

        when(recipientRepository.findAllByOrderByOrganizationNameAsc())
                .thenReturn(List.of(good, full, wrongCategory, unverified));
        Map<Long, List<FoodCategory>> prefs = new HashMap<>();
        prefs.put(1L, List.of(cookedMeals));
        prefs.put(2L, List.of(cookedMeals));
        prefs.put(3L, List.of(bakery));
        preferences(prefs);

        EngineDtos.RecommendationResponse result = engine.recommend(100L);

        assertThat(result.eligibleCount()).isEqualTo(1);
        assertThat(result.excludedCount()).isEqualTo(3);
        assertThat(result.recommended()).isNotNull();
        assertThat(result.recommended().organizationName()).isEqualTo("Good NGO");
        assertThat(result.ranked()).filteredOn(EngineDtos.RecipientCandidate::excluded)
                .extracting(EngineDtos.RecipientCandidate::exclusionReason)
                .anyMatch(reason -> reason.contains("storage"))
                .anyMatch(reason -> reason.contains("does not accept"))
                .anyMatch(reason -> reason.contains("not verified"));
        assertThat(result.summary()).contains("Good NGO");
    }

    @Test
    @DisplayName("the closer recipient with matching demand wins, and the factors add up to the score")
    void closerRecipientWins() {
        RecipientOrganization near = recipient(1, "Near NGO", 200, 50, 25, 12.98, 77.65, true);
        RecipientOrganization far = recipient(2, "Far NGO", 120, 20, 20, 12.85, 77.90, true);

        when(recipientRepository.findAllByOrderByOrganizationNameAsc()).thenReturn(List.of(far, near));
        preferences(Map.of(1L, List.of(cookedMeals), 2L, List.of(cookedMeals)));

        EngineDtos.RecommendationResponse result = engine.recommend(100L);

        assertThat(result.ranked()).extracting(EngineDtos.RecipientCandidate::organizationName)
                .containsExactly("Near NGO", "Far NGO");
        EngineDtos.RecipientCandidate winner = result.recommended();
        assertThat(winner).isNotNull();

        double factorSum = winner.factors().stream().mapToDouble(EngineDtos.FactorScore::contribution).sum();
        assertThat(winner.totalScore()).isCloseTo(Math.min(factorSum, 100.0), org.assertj.core.data.Offset.offset(0.05));
        assertThat(winner.factors()).hasSize(6);
        assertThat(winner.factors()).extracting(EngineDtos.FactorScore::key)
                .containsExactlyInAnyOrder("expiry", "demand", "storage", "proximity", "preference", "fairness");
        assertThat(winner.explanation()).contains("Near NGO").contains("/100");
    }

    @Test
    @DisplayName("fairness favours the organization that received less in the last 30 days")
    void fairnessPrefersUnderServedRecipient() {
        RecipientOrganization overServed = recipient(1, "Over-served NGO", 300, 40, 40, 12.975, 77.641, true);
        RecipientOrganization underServed = recipient(2, "Under-served NGO", 300, 40, 40, 12.975, 77.641, true);

        when(recipientRepository.findAllByOrderByOrganizationNameAsc())
                .thenReturn(List.of(overServed, underServed));
        when(allocationRepository.receivedSince(any()))
                .thenReturn(List.<Object[]>of(new Object[]{1L, 120.0}));
        preferences(Map.of(1L, List.of(cookedMeals), 2L, List.of(cookedMeals)));

        EngineDtos.RecommendationResponse result = engine.recommend(100L);

        assertThat(result.recommended()).isNotNull();
        assertThat(result.recommended().organizationName()).isEqualTo("Under-served NGO");
        assertThat(result.recommended().factors()).filteredOn(f -> f.key().equals("fairness"))
                .first()
                .satisfies(factor -> assertThat(factor.score()).isEqualTo(100.0));
    }
}
