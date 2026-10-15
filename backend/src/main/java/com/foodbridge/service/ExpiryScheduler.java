package com.foodbridge.service;

import com.foodbridge.domain.DonationStatus;
import com.foodbridge.domain.FoodDonation;
import com.foodbridge.domain.NotificationType;
import com.foodbridge.repo.FoodDonationRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Watches the donation lifecycle: expires stale donations and raises
 * time-critical alerts for food that is close to expiring.
 */
@Component
public class ExpiryScheduler {

    private static final Logger log = LoggerFactory.getLogger(ExpiryScheduler.class);

    private final FoodDonationRepository donationRepository;
    private final NotificationService notificationService;
    private final AuditService auditService;
    private final Set<Long> alerted = ConcurrentHashMap.newKeySet();

    public ExpiryScheduler(FoodDonationRepository donationRepository,
                           NotificationService notificationService,
                           AuditService auditService) {
        this.donationRepository = donationRepository;
        this.notificationService = notificationService;
        this.auditService = auditService;
    }

    @Scheduled(initialDelay = 45_000, fixedDelayString = "${foodbridge.scheduler.expiry-ms:120000}")
    @Transactional
    public void sweep() {
        LocalDateTime now = LocalDateTime.now();

        List<FoodDonation> overdue = donationRepository.findByStatusIn(
                List.of(DonationStatus.PENDING, DonationStatus.ALLOCATED)).stream()
                .filter(d -> d.getExpiryTime() != null && d.getExpiryTime().isBefore(now))
                .toList();
        for (FoodDonation donation : overdue) {
            donation.setStatus(DonationStatus.EXPIRED);
            donationRepository.save(donation);
            notificationService.notify(donation.getDonor().getUser(), "Donation expired",
                    "\"" + donation.getFoodName() + "\" passed its safe consumption window before delivery and was marked expired.",
                    NotificationType.EXPIRY_ALERT);
            notificationService.notifyAdmins("Donation expired",
                    "Donation #" + donation.getDonationId() + " \"" + donation.getFoodName() + "\" expired without delivery.",
                    NotificationType.EXPIRY_ALERT);
            auditService.record(null, "SYSTEM", "DONATION_EXPIRED",
                    "Donation #" + donation.getDonationId() + " automatically marked as EXPIRED");
        }

        List<FoodDonation> critical = donationRepository.findByStatusIn(
                List.of(DonationStatus.PENDING, DonationStatus.ALLOCATED)).stream()
                .filter(d -> d.getExpiryTime() != null
                        && d.getExpiryTime().isAfter(now)
                        && d.getExpiryTime().isBefore(now.plusHours(3)))
                .toList();
        for (FoodDonation donation : critical) {
            if (alerted.add(donation.getDonationId())) {
                notificationService.notify(donation.getDonor().getUser(), "Expiry alert",
                        "\"" + donation.getFoodName() + "\" expires within 3 hours. The allocation engine prioritises it automatically.",
                        NotificationType.EXPIRY_ALERT);
            }
        }
        if (!overdue.isEmpty() || !critical.isEmpty()) {
            log.info("Expiry sweep: {} expired, {} critical alerts", overdue.size(), critical.size());
        }
    }
}
