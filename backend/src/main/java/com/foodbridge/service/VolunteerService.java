package com.foodbridge.service;

import com.foodbridge.common.ApiException;
import com.foodbridge.domain.AssignmentStatus;
import com.foodbridge.domain.AvailabilityStatus;
import com.foodbridge.domain.Volunteer;
import com.foodbridge.domain.VolunteerAssignment;
import com.foodbridge.dto.VolunteerDtos;
import com.foodbridge.repo.VolunteerAssignmentRepository;
import com.foodbridge.repo.VolunteerRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class VolunteerService {

    private final VolunteerRepository volunteerRepository;
    private final VolunteerAssignmentRepository assignmentRepository;
    private final NotificationService notificationService;
    private final AuditService auditService;
    private final ViewMapper viewMapper;
    private final DeliveryService deliveryService;
    private final AllocationEngineService engineService;

    public VolunteerService(VolunteerRepository volunteerRepository,
                            VolunteerAssignmentRepository assignmentRepository,
                            NotificationService notificationService,
                            AuditService auditService,
                            ViewMapper viewMapper,
                            DeliveryService deliveryService,
                            AllocationEngineService engineService) {
        this.volunteerRepository = volunteerRepository;
        this.assignmentRepository = assignmentRepository;
        this.notificationService = notificationService;
        this.auditService = auditService;
        this.viewMapper = viewMapper;
        this.deliveryService = deliveryService;
        this.engineService = engineService;
    }

    @Transactional(readOnly = true)
    public List<VolunteerDtos.VolunteerView> listAll() {
        return volunteerRepository.findAllByOrderByCompletedDeliveriesDesc().stream()
                .map(viewMapper::volunteerView)
                .toList();
    }

    @Transactional(readOnly = true)
    public VolunteerDtos.VolunteerView me(Long userId) {
        return viewMapper.volunteerView(ownedVolunteer(userId));
    }

    @Transactional
    public VolunteerDtos.VolunteerView updateAvailability(Long userId, VolunteerDtos.AvailabilityUpdateRequest request) {
        Volunteer volunteer = ownedVolunteer(userId);
        if (request.availabilityStatus() != null) {
            volunteer.setAvailabilityStatus(request.availabilityStatus());
        }
        if (request.currentLocation() != null) {
            volunteer.setCurrentLocation(request.currentLocation());
        }
        if (request.latitude() != null) {
            volunteer.setLatitude(request.latitude());
        }
        if (request.longitude() != null) {
            volunteer.setLongitude(request.longitude());
        }
        if (request.vehicleType() != null) {
            volunteer.setVehicleType(request.vehicleType());
        }
        volunteerRepository.save(volunteer);
        auditService.record(volunteer.getUser(), "VOLUNTEER", "AVAILABILITY_UPDATED",
                volunteer.getUser().getFullName() + " is now " + volunteer.getAvailabilityStatus());
        return viewMapper.volunteerView(volunteer);
    }

    @Transactional(readOnly = true)
    public List<VolunteerDtos.AssignmentView> myAssignments(Long userId) {
        Volunteer volunteer = ownedVolunteer(userId);
        return assignmentRepository.findByVolunteer_VolunteerIdOrderByAssignedTimeDesc(volunteer.getVolunteerId())
                .stream()
                .map(viewMapper::assignmentView)
                .toList();
    }

    @Transactional
    public VolunteerDtos.AssignmentView acceptAssignment(Long assignmentId, Long userId) {
        VolunteerAssignment assignment = ownedAssignment(assignmentId, userId);
        if (assignment.getAssignmentStatus() != AssignmentStatus.PENDING) {
            throw ApiException.badRequest("Only pending assignments can be accepted");
        }
        assignment.setAssignmentStatus(AssignmentStatus.ACCEPTED);
        assignmentRepository.save(assignment);
        notificationService.notify(assignment.getAllocation().getDonation().getDonor().getUser(), "Volunteer confirmed pickup",
                assignment.getVolunteer().getUser().getFullName() + " accepted the pickup for \""
                        + assignment.getAllocation().getDonation().getFoodName() + "\".",
                com.foodbridge.domain.NotificationType.ASSIGNMENT);
        notificationService.notify(assignment.getAllocation().getRecipient().getUser(), "Pickup confirmed",
                assignment.getVolunteer().getUser().getFullName() + " will collect and deliver your allocation.",
                com.foodbridge.domain.NotificationType.ASSIGNMENT);
        auditService.record(assignment.getVolunteer().getUser(), "VOLUNTEER", "ASSIGNMENT_ACCEPTED",
                "Assignment #" + assignmentId + " accepted");
        return viewMapper.assignmentView(assignment);
    }

    @Transactional
    public VolunteerDtos.AssignmentView declineAssignment(Long assignmentId, Long userId, String reason) {
        VolunteerAssignment assignment = ownedAssignment(assignmentId, userId);
        if (assignment.getAssignmentStatus() != AssignmentStatus.PENDING) {
            throw ApiException.badRequest("Only pending assignments can be declined");
        }
        assignment.setAssignmentStatus(AssignmentStatus.DECLINED);
        assignment.setMatchExplanation(assignment.getMatchExplanation() + " | Declined: "
                + (reason == null || reason.isBlank() ? "not available" : reason));
        assignmentRepository.save(assignment);

        Volunteer volunteer = assignment.getVolunteer();
        volunteer.setActiveDeliveries(Math.max(0, (volunteer.getActiveDeliveries() == null ? 1 : volunteer.getActiveDeliveries()) - 1));
        volunteer.setAvailabilityStatus(AvailabilityStatus.AVAILABLE);
        volunteerRepository.save(volunteer);

        notificationService.notifyAdmins("Assignment declined",
                volunteer.getUser().getFullName() + " declined assignment #" + assignmentId + ". Re-run volunteer matching.",
                com.foodbridge.domain.NotificationType.ASSIGNMENT);
        auditService.record(volunteer.getUser(), "VOLUNTEER", "ASSIGNMENT_DECLINED",
                "Assignment #" + assignmentId + " declined");
        return viewMapper.assignmentView(assignment);
    }

    @Transactional
    public VolunteerDtos.AssignmentView startDelivery(Long assignmentId, Long userId) {
        return deliveryService.startPickup(assignmentId, userId);
    }

    @Transactional
    public VolunteerDtos.AssignmentView markInTransit(Long assignmentId, Long userId) {
        return deliveryService.markInTransit(assignmentId, userId);
    }

    @Transactional
    public VolunteerDtos.AssignmentView markDelivered(Long assignmentId, Long userId) {
        return deliveryService.markDelivered(assignmentId, userId);
    }

    @Transactional(readOnly = true)
    public List<com.foodbridge.dto.EngineDtos.VolunteerCandidate> matchPreview(Long allocationId) {
        return engineService.matchVolunteers(allocationId).ranked();
    }

    private Volunteer ownedVolunteer(Long userId) {
        return volunteerRepository.findByUser_UserId(userId)
                .orElseThrow(() -> ApiException.forbidden("Only volunteer accounts have this profile"));
    }

    private VolunteerAssignment ownedAssignment(Long assignmentId, Long userId) {
        VolunteerAssignment assignment = assignmentRepository.findById(assignmentId)
                .orElseThrow(() -> ApiException.notFound("Assignment not found"));
        if (!assignment.getVolunteer().getUser().getUserId().equals(userId)) {
            throw ApiException.forbidden("This assignment belongs to another volunteer");
        }
        return assignment;
    }
}
