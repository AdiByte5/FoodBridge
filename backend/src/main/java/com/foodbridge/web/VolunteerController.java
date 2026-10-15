package com.foodbridge.web;

import com.foodbridge.dto.VolunteerDtos;
import com.foodbridge.security.UserPrincipal;
import com.foodbridge.service.VolunteerService;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/volunteers")
public class VolunteerController {

    private final VolunteerService volunteerService;

    public VolunteerController(VolunteerService volunteerService) {
        this.volunteerService = volunteerService;
    }

    @GetMapping
    public List<VolunteerDtos.VolunteerView> list() {
        return volunteerService.listAll();
    }

    @GetMapping("/me")
    @PreAuthorize("hasRole('VOLUNTEER')")
    public VolunteerDtos.VolunteerView me(@AuthenticationPrincipal UserPrincipal principal) {
        return volunteerService.me(principal.userId());
    }

    @PatchMapping("/me/availability")
    @PreAuthorize("hasRole('VOLUNTEER')")
    public VolunteerDtos.VolunteerView updateAvailability(@AuthenticationPrincipal UserPrincipal principal,
                                                          @RequestBody VolunteerDtos.AvailabilityUpdateRequest request) {
        return volunteerService.updateAvailability(principal.userId(), request);
    }

    @GetMapping("/me/assignments")
    @PreAuthorize("hasRole('VOLUNTEER')")
    public List<VolunteerDtos.AssignmentView> myAssignments(@AuthenticationPrincipal UserPrincipal principal) {
        return volunteerService.myAssignments(principal.userId());
    }

    @PostMapping("/assignments/{assignmentId}/accept")
    @PreAuthorize("hasRole('VOLUNTEER')")
    public VolunteerDtos.AssignmentView accept(@PathVariable Long assignmentId,
                                               @AuthenticationPrincipal UserPrincipal principal) {
        return volunteerService.acceptAssignment(assignmentId, principal.userId());
    }

    @PostMapping("/assignments/{assignmentId}/decline")
    @PreAuthorize("hasRole('VOLUNTEER')")
    public VolunteerDtos.AssignmentView decline(@PathVariable Long assignmentId,
                                                @AuthenticationPrincipal UserPrincipal principal,
                                                @RequestBody(required = false) Map<String, String> body) {
        return volunteerService.declineAssignment(assignmentId, principal.userId(),
                body == null ? null : body.get("reason"));
    }

    @PostMapping("/assignments/{assignmentId}/start")
    @PreAuthorize("hasRole('VOLUNTEER')")
    public VolunteerDtos.AssignmentView start(@PathVariable Long assignmentId,
                                              @AuthenticationPrincipal UserPrincipal principal) {
        return volunteerService.startDelivery(assignmentId, principal.userId());
    }

    @PostMapping("/assignments/{assignmentId}/in-transit")
    @PreAuthorize("hasRole('VOLUNTEER')")
    public VolunteerDtos.AssignmentView inTransit(@PathVariable Long assignmentId,
                                                  @AuthenticationPrincipal UserPrincipal principal) {
        return volunteerService.markInTransit(assignmentId, principal.userId());
    }

    @PostMapping("/assignments/{assignmentId}/delivered")
    @PreAuthorize("hasRole('VOLUNTEER')")
    public VolunteerDtos.AssignmentView delivered(@PathVariable Long assignmentId,
                                                  @AuthenticationPrincipal UserPrincipal principal) {
        return volunteerService.markDelivered(assignmentId, principal.userId());
    }
}
