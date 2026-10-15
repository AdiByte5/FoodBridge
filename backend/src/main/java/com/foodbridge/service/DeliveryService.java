package com.foodbridge.service;

import com.foodbridge.common.ApiException;
import com.foodbridge.domain.*;
import com.foodbridge.dto.RecipientDtos;
import com.foodbridge.dto.VolunteerDtos;
import com.foodbridge.repo.AllocationRepository;
import com.foodbridge.repo.DeliveryRepository;
import com.foodbridge.repo.FoodDonationRepository;
import com.foodbridge.repo.RecipientOrganizationRepository;
import com.foodbridge.repo.VolunteerAssignmentRepository;
import com.foodbridge.repo.VolunteerRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.LocalDateTime;

@Service
public class DeliveryService {

    private final VolunteerAssignmentRepository assignmentRepository;
    private final DeliveryRepository deliveryRepository;
    private final VolunteerRepository volunteerRepository;
    private final RecipientOrganizationRepository recipientRepository;
    private final FoodDonationRepository donationRepository;
    private final AllocationRepository allocationRepository;
    private final NotificationService notificationService;
    private final AuditService auditService;
    private final ViewMapper viewMapper;

    public DeliveryService(VolunteerAssignmentRepository assignmentRepository,
                           DeliveryRepository deliveryRepository,
                           VolunteerRepository volunteerRepository,
                           RecipientOrganizationRepository recipientRepository,
                           FoodDonationRepository donationRepository,
                           AllocationRepository allocationRepository,
                           NotificationService notificationService,
                           AuditService auditService,
                           ViewMapper viewMapper) {
        this.assignmentRepository = assignmentRepository;
        this.deliveryRepository = deliveryRepository;
        this.volunteerRepository = volunteerRepository;
        this.recipientRepository = recipientRepository;
        this.donationRepository = donationRepository;
        this.allocationRepository = allocationRepository;
        this.notificationService = notificationService;
        this.auditService = auditService;
        this.viewMapper = viewMapper;
    }

    @Transactional
    public VolunteerDtos.AssignmentView startPickup(Long assignmentId, Long volunteerUserId) {
        VolunteerAssignment assignment = ownedAssignment(assignmentId, volunteerUserId);
        if (assignment.getAssignmentStatus() != AssignmentStatus.ACCEPTED) {
            throw ApiException.badRequest("Accept the assignment before starting the pickup");
        }
        Delivery delivery = deliveryOf(assignment);
        if (delivery.getDeliveryStatus() != DeliveryStatus.PENDING) {
            throw ApiException.badRequest("Delivery has already progressed");
        }
        delivery.setDeliveryStatus(DeliveryStatus.PICKED_UP);
        delivery.setPickupTime(LocalDateTime.now());
        deliveryRepository.save(delivery);

        FoodDonation donation = assignment.getAllocation().getDonation();
        donation.setStatus(DonationStatus.PICKED_UP);
        donationRepository.save(donation);

        notificationService.notify(assignment.getAllocation().getRecipient().getUser(), "Food picked up",
                assignment.getVolunteer().getUser().getFullName() + " picked up \"" + donation.getFoodName()
                        + "\" and is heading your way.", NotificationType.DELIVERY);
        notificationService.notify(donation.getDonor().getUser(), "Donation collected",
                "Your donation \"" + donation.getFoodName() + "\" has been picked up by "
                        + assignment.getVolunteer().getUser().getFullName() + ".", NotificationType.DELIVERY);
        auditService.record(assignment.getVolunteer().getUser(), "DELIVERY", "PICKUP_STARTED",
                "Volunteer picked up donation #" + donation.getDonationId() + " for allocation #"
                        + assignment.getAllocation().getAllocationId());
        return viewMapper.assignmentView(assignment);
    }

    @Transactional
    public VolunteerDtos.AssignmentView markInTransit(Long assignmentId, Long volunteerUserId) {
        VolunteerAssignment assignment = ownedAssignment(assignmentId, volunteerUserId);
        Delivery delivery = deliveryOf(assignment);
        if (delivery.getDeliveryStatus() != DeliveryStatus.PICKED_UP) {
            throw ApiException.badRequest("Delivery must be picked up before marking it in transit");
        }
        delivery.setDeliveryStatus(DeliveryStatus.IN_TRANSIT);
        deliveryRepository.save(delivery);
        auditService.record(assignment.getVolunteer().getUser(), "DELIVERY", "IN_TRANSIT",
                "Delivery #" + delivery.getDeliveryId() + " is in transit");
        return viewMapper.assignmentView(assignment);
    }

    @Transactional
    public VolunteerDtos.AssignmentView markDelivered(Long assignmentId, Long volunteerUserId) {
        VolunteerAssignment assignment = ownedAssignment(assignmentId, volunteerUserId);
        Delivery delivery = deliveryOf(assignment);
        if (delivery.getDeliveryStatus() != DeliveryStatus.IN_TRANSIT && delivery.getDeliveryStatus() != DeliveryStatus.PICKED_UP) {
            throw ApiException.badRequest("Delivery is not in a state that can be completed");
        }
        delivery.setDeliveryStatus(DeliveryStatus.DELIVERED);
        delivery.setDeliveryTime(LocalDateTime.now());
        deliveryRepository.save(delivery);

        FoodDonation donation = assignment.getAllocation().getDonation();
        donation.setStatus(DonationStatus.DELIVERED);
        donationRepository.save(donation);

        notificationService.notify(assignment.getAllocation().getRecipient().getUser(), "Delivery arrived - please confirm",
                "\"" + donation.getFoodName() + "\" has been delivered by "
                        + assignment.getVolunteer().getUser().getFullName() + ". Please confirm receipt to close the loop.",
                NotificationType.DELIVERY);
        notificationService.notify(donation.getDonor().getUser(), "Donation delivered",
                "Your donation \"" + donation.getFoodName() + "\" reached "
                        + assignment.getAllocation().getRecipient().getOrganizationName()
                        + ". Awaiting recipient confirmation.", NotificationType.DELIVERY);
        auditService.record(assignment.getVolunteer().getUser(), "DELIVERY", "DELIVERED",
                "Delivery #" + delivery.getDeliveryId() + " completed by volunteer");
        return viewMapper.assignmentView(assignment);
    }

    /**
     * Recipient confirms receipt: closes the allocation, updates the volunteer's
     * record, updates storage load and notifies everyone involved.
     */
    @Transactional
    public void confirmReceipt(Allocation allocation, User actor) {
        VolunteerAssignment assignment = assignmentRepository.findByAllocation_AllocationId(allocation.getAllocationId())
                .orElseThrow(() -> ApiException.badRequest("No volunteer assignment exists for this allocation"));
        Delivery delivery = deliveryOf(assignment);
        if (delivery.getDeliveryStatus() != DeliveryStatus.DELIVERED) {
            throw ApiException.badRequest("Delivery has not been completed yet");
        }
        FoodDonation donation = allocation.getDonation();

        allocation.setAllocationStatus(AllocationStatus.COMPLETED);
        allocationRepository.save(allocation);
        assignment.setAssignmentStatus(AssignmentStatus.COMPLETED);
        assignmentRepository.save(assignment);
        donation.setStatus(DonationStatus.COMPLETED);
        donationRepository.save(donation);

        Volunteer volunteer = assignment.getVolunteer();
        volunteer.setCompletedDeliveries((volunteer.getCompletedDeliveries() == null ? 0 : volunteer.getCompletedDeliveries()) + 1);
        volunteer.setActiveDeliveries(Math.max(0, (volunteer.getActiveDeliveries() == null ? 1 : volunteer.getActiveDeliveries()) - 1));
        if (volunteer.getActiveDeliveries() == 0 && volunteer.getAvailabilityStatus() == AvailabilityStatus.BUSY) {
            volunteer.setAvailabilityStatus(AvailabilityStatus.AVAILABLE);
        }
        volunteerRepository.save(volunteer);

        RecipientOrganization recipient = allocation.getRecipient();
        recipient.setCurrentLoadKg((recipient.getCurrentLoadKg() == null ? 0 : recipient.getCurrentLoadKg()) + donation.getQuantity());
        recipient.setDemandKg(Math.max(0, (recipient.getDemandKg() == null ? 0 : recipient.getDemandKg()) - donation.getQuantity()));
        recipientRepository.save(recipient);

        notificationService.notify(donation.getDonor().getUser(), "Donation completed - thank you!",
                allocation.getRecipient().getOrganizationName() + " confirmed receipt of \"" + donation.getFoodName()
                        + "\" (" + donation.getQuantity() + " " + donation.getUnit() + "). You have rescued food that would otherwise be wasted.",
                NotificationType.DELIVERY);
        notificationService.notify(volunteer.getUser(), "Assignment completed",
                "Delivery for \"" + donation.getFoodName() + "\" was confirmed. Great work!", NotificationType.DELIVERY);
        notificationService.notifyAdmins("Food rescue completed",
                donation.getQuantity() + " " + donation.getUnit() + " of \"" + donation.getFoodName()
                        + "\" rescued via " + allocation.getRecipient().getOrganizationName(),
                NotificationType.SYSTEM);
        auditService.record(actor, "DELIVERY", "RECEIPT_CONFIRMED",
                "Recipient " + recipient.getOrganizationName() + " confirmed delivery of donation #"
                        + donation.getDonationId() + "; allocation #" + allocation.getAllocationId() + " completed");
    }

    @Transactional(readOnly = true)
    public java.util.List<RecipientDtos.AllocationView> inFlight() {
        return allocationRepository.findAllByOrderByAllocationTimeDesc().stream()
                .filter(a -> a.getAllocationStatus() == AllocationStatus.ACCEPTED)
                .map(viewMapper::allocationView)
                .toList();
    }

    public static Double hoursBetween(LocalDateTime from, LocalDateTime to) {
        if (from == null || to == null) {
            return null;
        }
        return GeoUtils.round(Duration.between(from, to).toMinutes() / 60.0, 2);
    }

    private VolunteerAssignment ownedAssignment(Long assignmentId, Long volunteerUserId) {
        VolunteerAssignment assignment = assignmentRepository.findById(assignmentId)
                .orElseThrow(() -> ApiException.notFound("Assignment not found"));
        if (!assignment.getVolunteer().getUser().getUserId().equals(volunteerUserId)) {
            throw ApiException.forbidden("This assignment belongs to another volunteer");
        }
        return assignment;
    }

    private Delivery deliveryOf(VolunteerAssignment assignment) {
        return deliveryRepository.findByAssignment_AssignmentId(assignment.getAssignmentId())
                .orElseThrow(() -> ApiException.notFound("Delivery record not found"));
    }
}
