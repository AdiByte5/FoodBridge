package com.foodbridge.web;

import com.foodbridge.dto.DonationDtos;
import com.foodbridge.security.UserPrincipal;
import com.foodbridge.service.DonationService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/donations")
public class DonationController {

    private final DonationService donationService;

    public DonationController(DonationService donationService) {
        this.donationService = donationService;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasRole('DONOR')")
    public DonationDtos.DonationView create(@AuthenticationPrincipal UserPrincipal principal,
                                            @Valid @RequestBody DonationDtos.CreateDonationRequest request) {
        DonationDtos.DonationView created = donationService.create(principal.userId(), request);
        donationService.matchAutomatically(created.donationId());
        return donationService.get(created.donationId());
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('DONOR','ADMIN')")
    public List<DonationDtos.DonationView> list(@AuthenticationPrincipal UserPrincipal principal) {
        return donationService.listForUser(principal.userId(), principal.role());
    }

    @GetMapping("/expiring")
    public List<DonationDtos.DonationView> expiring(@RequestParam(defaultValue = "6") int hours) {
        return donationService.expiringSoon(hours);
    }

    @GetMapping("/{donationId}")
    public DonationDtos.DonationView get(@PathVariable Long donationId) {
        return donationService.get(donationId);
    }

    @PostMapping("/{donationId}/cancel")
    @PreAuthorize("hasRole('DONOR')")
    public DonationDtos.DonationView cancel(@PathVariable Long donationId,
                                            @AuthenticationPrincipal UserPrincipal principal) {
        return donationService.cancel(donationId, principal.userId());
    }

    @PatchMapping("/{donationId}")
    @PreAuthorize("hasRole('DONOR')")
    public DonationDtos.DonationView update(@PathVariable Long donationId,
                                            @AuthenticationPrincipal UserPrincipal principal,
                                            @RequestBody DonationDtos.UpdateDonationRequest request) {
        DonationDtos.DonationView updated = donationService.update(donationId, principal.userId(), request);
        donationService.matchAutomatically(updated.donationId());
        return donationService.get(updated.donationId());
    }
}
