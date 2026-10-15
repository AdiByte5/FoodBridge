package com.foodbridge.web;

import com.foodbridge.dto.EngineDtos;
import com.foodbridge.dto.RecipientDtos;
import com.foodbridge.security.UserPrincipal;
import com.foodbridge.service.AllocationEngineService;
import com.foodbridge.service.RecipientService;
import com.foodbridge.service.ViewMapper;
import com.foodbridge.repo.AllocationRepository;
import com.foodbridge.repo.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/allocations")
public class AllocationController {

    private final AllocationEngineService engineService;
    private final RecipientService recipientService;
    private final AllocationRepository allocationRepository;
    private final ViewMapper viewMapper;
    private final UserRepository userRepository;

    public AllocationController(AllocationEngineService engineService,
                                RecipientService recipientService,
                                AllocationRepository allocationRepository,
                                ViewMapper viewMapper,
                                UserRepository userRepository) {
        this.engineService = engineService;
        this.recipientService = recipientService;
        this.allocationRepository = allocationRepository;
        this.viewMapper = viewMapper;
        this.userRepository = userRepository;
    }

    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    public List<RecipientDtos.AllocationView> all() {
        return recipientService.allAllocations();
    }

    @GetMapping("/{allocationId}")
    public RecipientDtos.AllocationView get(@PathVariable Long allocationId) {
        return viewMapper.allocationView(allocationRepository.findById(allocationId)
                .orElseThrow(() -> com.foodbridge.common.ApiException.notFound("Allocation not found")));
    }

    @PostMapping("/engine/{donationId}/preview")
    @PreAuthorize("hasAnyRole('ADMIN','DONOR')")
    public EngineDtos.RecommendationResponse preview(@PathVariable Long donationId) {
        return engineService.recommend(donationId);
    }

    @PostMapping("/engine/{donationId}/run")
    @PreAuthorize("hasAnyRole('ADMIN','DONOR')")
    public EngineDtos.RecommendationResponse run(@PathVariable Long donationId,
                                                 @AuthenticationPrincipal UserPrincipal principal) {
        return engineService.allocate(donationId, userRepository.findById(principal.userId()).orElse(null));
    }

    @PostMapping("/{allocationId}/accept")
    @PreAuthorize("hasRole('RECIPIENT')")
    public RecipientDtos.AllocationView accept(@PathVariable Long allocationId,
                                               @AuthenticationPrincipal UserPrincipal principal) {
        return recipientService.accept(allocationId, principal.userId());
    }

    @PostMapping("/{allocationId}/reject")
    @PreAuthorize("hasRole('RECIPIENT')")
    public RecipientDtos.AllocationView reject(@PathVariable Long allocationId,
                                               @AuthenticationPrincipal UserPrincipal principal,
                                               @RequestBody(required = false) Map<String, String> body) {
        String reason = body == null ? null : body.get("reason");
        return recipientService.reject(allocationId, principal.userId(), reason);
    }

    @PostMapping("/{allocationId}/confirm-delivery")
    @PreAuthorize("hasRole('RECIPIENT')")
    public RecipientDtos.AllocationView confirmDelivery(@PathVariable Long allocationId,
                                                        @AuthenticationPrincipal UserPrincipal principal) {
        return recipientService.confirmDelivery(allocationId, principal.userId());
    }

    @GetMapping("/{allocationId}/volunteer-matches")
    @PreAuthorize("hasAnyRole('ADMIN','RECIPIENT')")
    public EngineDtos.VolunteerMatchResponse volunteerMatches(@PathVariable Long allocationId) {
        return engineService.matchVolunteers(allocationId);
    }

    @PostMapping("/{allocationId}/assign-volunteer")
    @PreAuthorize("hasRole('ADMIN')")
    @ResponseStatus(HttpStatus.CREATED)
    public RecipientDtos.AllocationView assignVolunteer(@PathVariable Long allocationId,
                                                        @AuthenticationPrincipal UserPrincipal principal,
                                                        @RequestBody(required = false) Map<String, Long> body) {
        Long volunteerId = body == null ? null : body.get("volunteerId");
        engineService.assignVolunteer(allocationId, volunteerId, userRepository.findById(principal.userId()).orElse(null));
        return viewMapper.allocationView(allocationRepository.findById(allocationId).orElseThrow());
    }
}
