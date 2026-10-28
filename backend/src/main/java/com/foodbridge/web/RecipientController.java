package com.foodbridge.web;

import com.foodbridge.dto.CommonDtos;
import com.foodbridge.dto.RecipientDtos;
import com.foodbridge.security.UserPrincipal;
import com.foodbridge.service.DonationService;
import com.foodbridge.service.RecipientService;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/recipients")
public class RecipientController {

    private final RecipientService recipientService;
    private final DonationService donationService;

    public RecipientController(RecipientService recipientService, DonationService donationService) {
        this.recipientService = recipientService;
        this.donationService = donationService;
    }

    @GetMapping
    public List<RecipientDtos.RecipientView> directory() {
        return recipientService.listAll();
    }

    @GetMapping("/me")
    @PreAuthorize("hasRole('RECIPIENT')")
    public RecipientDtos.RecipientView me(@AuthenticationPrincipal UserPrincipal principal) {
        return recipientService.me(principal.userId());
    }

    @PatchMapping("/me/demand")
    @PreAuthorize("hasRole('RECIPIENT')")
    public RecipientDtos.RecipientView updateDemand(@AuthenticationPrincipal UserPrincipal principal,
                                                    @RequestBody RecipientDtos.DemandUpdateRequest request) {
        RecipientDtos.RecipientView updated = recipientService.updateDemand(principal.userId(), request);
        // New storage space or demand can make a waiting donation placeable, so retry the queue.
        donationService.matchWaitingDonations();
        return updated;
    }

    @GetMapping("/me/preferences")
    @PreAuthorize("hasRole('RECIPIENT')")
    public List<Long> preferences(@AuthenticationPrincipal UserPrincipal principal) {
        return recipientService.preferences(principal.userId());
    }

    @PutMapping("/me/preferences")
    @PreAuthorize("hasRole('RECIPIENT')")
    public Map<String, Object> updatePreferences(@AuthenticationPrincipal UserPrincipal principal,
                                                 @RequestBody RecipientDtos.PreferenceUpdateRequest request) {
        List<Long> ids = recipientService.updatePreferences(principal.userId(), request.categoryIds());
        return Map.of("updated", ids.size(), "categoryIds", ids);
    }

    @GetMapping("/me/allocations")
    @PreAuthorize("hasRole('RECIPIENT')")
    public List<RecipientDtos.AllocationView> myAllocations(@AuthenticationPrincipal UserPrincipal principal,
                                                            @RequestParam(required = false) String status) {
        return recipientService.allocationsForUser(principal.userId(), status);
    }
}
