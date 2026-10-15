package com.foodbridge.web;

import com.foodbridge.dto.CommonDtos;
import com.foodbridge.dto.EngineDtos;
import com.foodbridge.repo.FoodCategoryRepository;
import com.foodbridge.repo.FoodDonationRepository;
import com.foodbridge.repo.RecipientOrganizationRepository;
import com.foodbridge.repo.VolunteerRepository;
import com.foodbridge.service.AllocationEngineService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/public")
public class PublicController {

    private final FoodCategoryRepository categoryRepository;
    private final AllocationEngineService engineService;
    private final FoodDonationRepository donationRepository;
    private final RecipientOrganizationRepository recipientRepository;
    private final VolunteerRepository volunteerRepository;

    public PublicController(FoodCategoryRepository categoryRepository,
                            AllocationEngineService engineService,
                            FoodDonationRepository donationRepository,
                            RecipientOrganizationRepository recipientRepository,
                            VolunteerRepository volunteerRepository) {
        this.categoryRepository = categoryRepository;
        this.engineService = engineService;
        this.donationRepository = donationRepository;
        this.recipientRepository = recipientRepository;
        this.volunteerRepository = volunteerRepository;
    }

    @GetMapping("/categories")
    public List<CommonDtos.CategoryView> categories() {
        return categoryRepository.findAll().stream()
                .map(c -> new CommonDtos.CategoryView(c.getCategoryId(), c.getCategoryName(),
                        c.getRecommendedStorage() == null ? null : c.getRecommendedStorage().name(),
                        c.getShelfLifeHours()))
                .toList();
    }

    @GetMapping("/engine-weights")
    public List<EngineDtos.EngineWeight> engineWeights() {
        return engineService.weights();
    }

    @GetMapping("/platform-stats")
    public Map<String, Object> platformStats() {
        Map<String, Object> stats = new LinkedHashMap<>();
        stats.put("donations", donationRepository.count());
        stats.put("recipientOrganizations", recipientRepository.count());
        stats.put("verifiedOrganizations", recipientRepository.countByVerifiedTrue());
        stats.put("volunteers", volunteerRepository.count());
        stats.put("kgRescued", donationRepository.sumQuantityByStatuses(
                List.of(com.foodbridge.domain.DonationStatus.COMPLETED,
                        com.foodbridge.domain.DonationStatus.DELIVERED)));
        return stats;
    }
}
