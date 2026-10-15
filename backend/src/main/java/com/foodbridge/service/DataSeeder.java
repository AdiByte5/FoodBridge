package com.foodbridge.service;

import com.foodbridge.domain.*;
import com.foodbridge.dto.EngineDtos;
import com.foodbridge.repo.*;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Random;

/**
 * Seeds a realistic Bengaluru food-rescue scenario so the platform can be
 * demonstrated immediately: 5 donor businesses, 6 recipient organizations,
 * 4 volunteers and two weeks of donation history.
 */
@Service
public class DataSeeder {

    private final UserRepository userRepository;
    private final DonorRepository donorRepository;
    private final RecipientOrganizationRepository recipientRepository;
    private final VolunteerRepository volunteerRepository;
    private final FoodCategoryRepository categoryRepository;
    private final RecipientPreferenceRepository preferenceRepository;
    private final FoodDonationRepository donationRepository;
    private final AllocationRepository allocationRepository;
    private final VolunteerAssignmentRepository assignmentRepository;
    private final DeliveryRepository deliveryRepository;
    private final NotificationRepository notificationRepository;
    private final AuditLogRepository auditLogRepository;
    private final PasswordEncoder passwordEncoder;

    private final Random random = new Random(42);

    public DataSeeder(UserRepository userRepository,
                      DonorRepository donorRepository,
                      RecipientOrganizationRepository recipientRepository,
                      VolunteerRepository volunteerRepository,
                      FoodCategoryRepository categoryRepository,
                      RecipientPreferenceRepository preferenceRepository,
                      FoodDonationRepository donationRepository,
                      AllocationRepository allocationRepository,
                      VolunteerAssignmentRepository assignmentRepository,
                      DeliveryRepository deliveryRepository,
                      NotificationRepository notificationRepository,
                      AuditLogRepository auditLogRepository,
                      PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.donorRepository = donorRepository;
        this.recipientRepository = recipientRepository;
        this.volunteerRepository = volunteerRepository;
        this.categoryRepository = categoryRepository;
        this.preferenceRepository = preferenceRepository;
        this.donationRepository = donationRepository;
        this.allocationRepository = allocationRepository;
        this.assignmentRepository = assignmentRepository;
        this.deliveryRepository = deliveryRepository;
        this.notificationRepository = notificationRepository;
        this.auditLogRepository = auditLogRepository;
        this.passwordEncoder = passwordEncoder;
    }

    private record DonorSeed(String org, OrganizationType type, String address, double lat, double lng,
                             boolean verified, String email, String phone) {
    }

    private record RecipientSeed(String org, OrganizationType type, String address, double lat, double lng,
                                 double capacity, double load, double demand, int beneficiaries,
                                 boolean verified, String email, String phone, List<String> prefs) {
    }

    private record VolunteerSeed(String name, String email, String phone, String vehicle,
                                 AvailabilityStatus status, String location, double lat, double lng) {
    }

    private record DonationSeed(int donorIndex, String category, String food, double quantity, String unit,
                                int daysAgo, int expiryHours, DonationStatus status) {
    }

    @Transactional
    public void seedAll() {
        List<FoodCategory> categories = seedCategories();
        User admin = seedAdmin();
        List<Donor> donors = seedDonors();
        List<RecipientOrganization> recipients = seedRecipients(categories);
        List<Volunteer> volunteers = seedVolunteers();
        seedPreferences(categories);
        seedHistory(donors, recipients, volunteers);
        seedNotifications(admin, donors, recipients, volunteers);
        seedAuditTrail(admin, donors, recipients, volunteers);
    }

    private List<FoodCategory> seedCategories() {
        return List.of(
                category("Cooked Meals", StorageRequirement.HOT_HOLDING, 4),
                category("Bakery & Bread", StorageRequirement.AMBIENT, 24),
                category("Fresh Produce", StorageRequirement.REFRIGERATED, 48),
                category("Dairy & Eggs", StorageRequirement.REFRIGERATED, 12),
                category("Packaged & Dry Goods", StorageRequirement.AMBIENT, 4320),
                category("Sweets & Desserts", StorageRequirement.REFRIGERATED, 24));
    }

    private FoodCategory category(String name, StorageRequirement storage, int shelfLifeHours) {
        return categoryRepository.findByCategoryNameIgnoreCase(name).orElseGet(() -> categoryRepository.save(
                FoodCategory.builder()
                        .categoryName(name)
                        .recommendedStorage(storage)
                        .shelfLifeHours(shelfLifeHours)
                        .build()));
    }

    private User seedAdmin() {
        return upsertUser("Adithyan S Nair", "admin@foodbridge.org", "Admin@123",
                "+91 98450 00001", UserRole.ADMIN, LocalDateTime.now().minusDays(30));
    }

    private List<Donor> seedDonors() {
        List<DonorSeed> seeds = List.of(
                new DonorSeed("Spice Route Restaurant", OrganizationType.RESTAURANT,
                        "12, 100 Feet Road, Indiranagar, Bengaluru", 12.9784, 77.6408, true,
                        "donor@foodbridge.org", "+91 98450 10001"),
                new DonorSeed("Grand Meridian Hotel", OrganizationType.HOTEL,
                        "MG Road, Bengaluru", 12.9756, 77.6068, true,
                        "hotel@foodbridge.org", "+91 98450 10002"),
                new DonorSeed("FreshMart Supermarket", OrganizationType.SUPERMARKET,
                        "5th Block, Koramangala, Bengaluru", 12.9352, 77.6245, true,
                        "supermarket@foodbridge.org", "+91 98450 10003"),
                new DonorSeed("Golden Crust Bakery", OrganizationType.BAKERY,
                        "4th Block, Jayanagar, Bengaluru", 12.9308, 77.5838, true,
                        "bakery@foodbridge.org", "+91 98450 10004"),
                new DonorSeed("Royal Feast Caterers", OrganizationType.CATERING,
                        "ITPL Main Road, Whitefield, Bengaluru", 12.9698, 77.7500, false,
                        "catering@foodbridge.org", "+91 98450 10005"),
                new DonorSeed("Nikhil Rao", OrganizationType.INDIVIDUAL,
                        "Malleshwaram, Bengaluru", 13.0035, 77.5709, true,
                        "nikhil@foodbridge.org", "+91 98450 10006"));

        List<Donor> donors = new ArrayList<>();
        for (DonorSeed seed : seeds) {
            User user = upsertUser(seed.org(), seed.email(), "Donor@123", seed.phone(),
                    UserRole.DONOR, LocalDateTime.now().minusDays(28));
            Donor donor = donorRepository.findByUser_UserId(user.getUserId())
                    .orElseGet(() -> Donor.builder().user(user).build());
            donor.setOrganizationName(seed.org());
            donor.setOrganizationType(seed.type());
            donor.setAddress(seed.address());
            donor.setLatitude(seed.lat());
            donor.setLongitude(seed.lng());
            donor.setVerified(seed.verified());
            donors.add(donorRepository.save(donor));
        }
        return donors;
    }

    private List<RecipientOrganization> seedRecipients(List<FoodCategory> categories) {
        List<RecipientSeed> seeds = List.of(
                new RecipientSeed("Akshaya Patra Community Kitchen", OrganizationType.NGO,
                        "Yeshwanthpur Industrial Area, Bengaluru", 13.0280, 77.5540, 400, 120, 150, 1200, true,
                        "recipient@foodbridge.org", "+91 98450 20001",
                        List.of("Cooked Meals", "Bakery & Bread", "Fresh Produce", "Packaged & Dry Goods")),
                new RecipientSeed("Sneha Sadan Orphanage", OrganizationType.ORPHANAGE,
                        "8th Block, Koramangala, Bengaluru", 12.9380, 77.6290, 120, 35, 60, 180, true,
                        "orphanage@foodbridge.org", "+91 98450 20002",
                        List.of("Cooked Meals", "Bakery & Bread", "Sweets & Desserts", "Dairy & Eggs")),
                new RecipientSeed("Bengaluru Food Bank", OrganizationType.FOOD_BANK,
                        "Okalipuram, Bengaluru", 12.9850, 77.5560, 600, 210, 260, 2500, true,
                        "foodbank@foodbridge.org", "+91 98450 20003", List.of()),
                new RecipientSeed("Anand Ashram Shelter", OrganizationType.SHELTER,
                        "9th Block, Jayanagar, Bengaluru", 12.9250, 77.5838, 90, 20, 70, 120, true,
                        "shelter@foodbridge.org", "+91 98450 20004",
                        List.of("Cooked Meals", "Bakery & Bread", "Sweets & Desserts")),
                new RecipientSeed("Sanjeevini Community Kitchen", OrganizationType.NGO,
                        "Rajajinagar, Bengaluru", 12.9900, 77.5520, 200, 60, 90, 500, true,
                        "kitchen@foodbridge.org", "+91 98450 20005",
                        List.of("Cooked Meals", "Fresh Produce", "Dairy & Eggs")),
                new RecipientSeed("Hope Foundation Trust", OrganizationType.NGO,
                        "Electronics City, Bengaluru", 12.8452, 77.6602, 150, 0, 110, 300, false,
                        "hope@foodbridge.org", "+91 98450 20006",
                        List.of("Cooked Meals", "Packaged & Dry Goods")));

        List<RecipientOrganization> recipients = new ArrayList<>();
        for (RecipientSeed seed : seeds) {
            User user = upsertUser(seed.org(), seed.email(), "Recipient@123", seed.phone(),
                    UserRole.RECIPIENT, LocalDateTime.now().minusDays(26));
            RecipientOrganization recipient = recipientRepository.findByUser_UserId(user.getUserId())
                    .orElseGet(() -> RecipientOrganization.builder().user(user).build());
            recipient.setOrganizationName(seed.org());
            recipient.setOrganizationType(seed.type());
            recipient.setAddress(seed.address());
            recipient.setLatitude(seed.lat());
            recipient.setLongitude(seed.lng());
            recipient.setStorageCapacityKg(seed.capacity());
            recipient.setCurrentLoadKg(seed.load());
            recipient.setDemandKg(seed.demand());
            recipient.setBeneficiaries(seed.beneficiaries());
            recipient.setVerified(seed.verified());
            recipient = recipientRepository.save(recipient);
            preferenceRepository.deleteByRecipient_RecipientId(recipient.getRecipientId());
            for (String pref : seed.prefs()) {
                FoodCategory category = categories.stream()
                        .filter(c -> c.getCategoryName().equals(pref)).findFirst().orElseThrow();
                preferenceRepository.save(RecipientPreference.builder()
                        .id(new RecipientPreferenceId(recipient.getRecipientId(), category.getCategoryId()))
                        .recipient(recipient)
                        .category(category)
                        .build());
            }
            recipients.add(recipient);
        }
        return recipients;
    }

    private List<Volunteer> seedVolunteers() {
        List<VolunteerSeed> seeds = List.of(
                new VolunteerSeed("Ravi Kumar", "volunteer@foodbridge.org", "+91 98450 30001",
                        "Bike", AvailabilityStatus.AVAILABLE, "Indiranagar, Bengaluru", 12.9719, 77.6412),
                new VolunteerSeed("Priya Sharma", "priya@foodbridge.org", "+91 98450 30002",
                        "Scooter", AvailabilityStatus.AVAILABLE, "Koramangala, Bengaluru", 12.9352, 77.6245),
                new VolunteerSeed("Arjun Mehta", "arjun@foodbridge.org", "+91 98450 30003",
                        "Car", AvailabilityStatus.AVAILABLE, "MG Road, Bengaluru", 12.9756, 77.6068),
                new VolunteerSeed("Fatima Begum", "fatima@foodbridge.org", "+91 98450 30004",
                        "Bike", AvailabilityStatus.OFFLINE, "Whitefield, Bengaluru", 12.9698, 77.7500));

        List<Volunteer> volunteers = new ArrayList<>();
        for (VolunteerSeed seed : seeds) {
            User user = upsertUser(seed.name(), seed.email(), "Volunteer@123", seed.phone(),
                    UserRole.VOLUNTEER, LocalDateTime.now().minusDays(24));
            Volunteer volunteer = volunteerRepository.findByUser_UserId(user.getUserId())
                    .orElseGet(() -> Volunteer.builder().user(user).build());
            volunteer.setVehicleType(seed.vehicle());
            volunteer.setAvailabilityStatus(seed.status());
            volunteer.setCurrentLocation(seed.location());
            volunteer.setLatitude(seed.lat());
            volunteer.setLongitude(seed.lng());
            volunteer.setCompletedDeliveries(0);
            volunteer.setActiveDeliveries(0);
            volunteers.add(volunteerRepository.save(volunteer));
        }
        return volunteers;
    }

    private User upsertUser(String fullName, String email, String password, String phone,
                            UserRole role, LocalDateTime createdAt) {
        User user = userRepository.findByEmailIgnoreCase(email)
                .orElseGet(() -> User.builder().email(email.toLowerCase()).build());
        user.setFullName(fullName);
        user.setPhoneNumber(phone);
        user.setRole(role);
        user.setAccountStatus(AccountStatus.ACTIVE);
        user.setPasswordHash(passwordEncoder.encode(password));
        if (user.getCreatedAt() == null) {
            user.setCreatedAt(createdAt);
        }
        return userRepository.save(user);
    }

    private void seedPreferences(List<FoodCategory> categories) {
        // preferences are created inline while seeding recipients
    }

    private void seedHistory(List<Donor> donors, List<RecipientOrganization> recipients, List<Volunteer> volunteers) {
        List<RecipientOrganization> verified = recipients.stream()
                .filter(r -> Boolean.TRUE.equals(r.getVerified())).toList();
        List<Volunteer> activeVolunteers = volunteers.stream()
                .filter(v -> v.getAvailabilityStatus() == AvailabilityStatus.AVAILABLE).toList();

        List<DonationSeed> seeds = List.of(
                new DonationSeed(0, "Cooked Meals", "Veg Biryani & Raita", 24, "kg", 12, 5, DonationStatus.COMPLETED),
                new DonationSeed(2, "Bakery & Bread", "Whole Wheat Bread Loaves", 30, "kg", 11, 22, DonationStatus.COMPLETED),
                new DonationSeed(2, "Fresh Produce", "Mixed Vegetables", 45, "kg", 10, 36, DonationStatus.COMPLETED),
                new DonationSeed(1, "Cooked Meals", "Buffet Surplus - Paneer & Rice", 40, "kg", 9, 4, DonationStatus.COMPLETED),
                new DonationSeed(3, "Sweets & Desserts", "Assorted Pastries", 12, "kg", 8, 20, DonationStatus.COMPLETED),
                new DonationSeed(4, "Cooked Meals", "Wedding Buffet Surplus", 55, "kg", 7, 5, DonationStatus.COMPLETED),
                new DonationSeed(0, "Cooked Meals", "South Indian Meals", 35, "kg", 6, 4, DonationStatus.COMPLETED),
                new DonationSeed(2, "Packaged & Dry Goods", "Rice Bags & Pulses", 120, "kg", 5, 400, DonationStatus.COMPLETED),
                new DonationSeed(1, "Cooked Meals", "Banquet Surplus - Roti & Curry", 45, "kg", 0, 5, DonationStatus.DELIVERED),
                new DonationSeed(0, "Cooked Meals", "Veg Pulao & Dal", 22, "kg", 0, 3, DonationStatus.PICKED_UP),
                new DonationSeed(2, "Fresh Produce", "Leafy Vegetables", 40, "kg", 0, 26, DonationStatus.ALLOCATED),
                new DonationSeed(5, "Cooked Meals", "Family Function Surplus", 8, "kg", 3, 4, DonationStatus.COMPLETED),
                new DonationSeed(3, "Bakery & Bread", "Morning Bakery Surplus", 26, "kg", 0, 18, DonationStatus.PENDING),
                new DonationSeed(4, "Cooked Meals", "Catering Excess - Veg Pulao", 30, "kg", 0, 6, DonationStatus.PENDING),
                new DonationSeed(1, "Cooked Meals", "Expired Buffet Tray", 15, "kg", 4, 3, DonationStatus.EXPIRED),
                new DonationSeed(0, "Dairy & Eggs", "Cancelled Pickup - Curd", 12, "kg", 2, 10, DonationStatus.CANCELLED));

        LocalDateTime now = LocalDateTime.now();
        int index = 0;
        for (DonationSeed seed : seeds) {
            Donor donor = donors.get(seed.donorIndex());
            FoodCategory category = categoryRepository.findByCategoryNameIgnoreCase(seed.category()).orElseThrow();
            LocalDateTime createdAt = now.minusDays(seed.daysAgo()).minusHours(2 + random.nextInt(5)).minusMinutes(random.nextInt(50));
            // Historical donations keep their original safe window; donations that are
            // still moving through the pipeline stay comfortably inside a future window.
            boolean live = switch (seed.status()) {
                case PENDING, ALLOCATED, PICKED_UP, DELIVERED -> true;
                default -> false;
            };
            LocalDateTime expiry = live ? now.plusHours(seed.expiryHours()) : createdAt.plusHours(seed.expiryHours());

            FoodDonation donation = donationRepository.save(FoodDonation.builder()
                    .donor(donor)
                    .category(category)
                    .foodName(seed.food())
                    .quantity(seed.quantity())
                    .unit(seed.unit())
                    .expiryTime(expiry)
                    .pickupAddress(donor.getAddress())
                    .pickupStart(createdAt.plusMinutes(30))
                    .pickupEnd(createdAt.plusHours(2))
                    .storageRequirement(category.getRecommendedStorage())
                    .status(seed.status())
                    .createdAt(createdAt)
                    .notes(index % 3 == 0 ? "Surplus from today's service - packed for immediate pickup." : null)
                    .build());

            switch (seed.status()) {
                case COMPLETED, DELIVERED -> {
                    RecipientOrganization recipient = verified.get(index % verified.size());
                    Volunteer volunteer = activeVolunteers.get(index % activeVolunteers.size());
                    completeChain(donation, recipient, volunteer, createdAt, seed.status() == DonationStatus.DELIVERED);
                }
                case PICKED_UP -> {
                    RecipientOrganization recipient = verified.get(index % verified.size());
                    Volunteer volunteer = activeVolunteers.get(index % activeVolunteers.size());
                    inFlightChain(donation, recipient, volunteer, createdAt);
                }
                case ALLOCATED -> {
                    RecipientOrganization recipient = verified.get(index % verified.size());
                    proposedAllocation(donation, recipient, createdAt);
                }
                default -> {
                }
            }
            index++;
        }
    }

    private void completeChain(FoodDonation donation, RecipientOrganization recipient, Volunteer volunteer,
                               LocalDateTime createdAt, boolean awaitingConfirmation) {
        double distance = GeoUtils.round(GeoUtils.distanceKm(donation.getDonor().getLatitude(),
                donation.getDonor().getLongitude(), recipient.getLatitude(), recipient.getLongitude()), 2);
        double score = 70 + random.nextDouble() * 24;
        List<EngineDtos.FactorScore> factors = historicalFactors(score, distance, donation.getQuantity());
        double total = factors.stream().mapToDouble(EngineDtos.FactorScore::contribution).sum();

        Allocation allocation = allocationRepository.save(Allocation.builder()
                .donation(donation)
                .recipient(recipient)
                .priorityScore(GeoUtils.round(total, 1))
                .decisionExplanation(historicalExplanation(recipient, factors, distance))
                .factorBreakdown(FactorCodec.encode(factors))
                .allocationTime(createdAt.plusMinutes(25 + random.nextInt(20)))
                .allocationStatus(awaitingConfirmation ? AllocationStatus.ACCEPTED : AllocationStatus.COMPLETED)
                .build());

        VolunteerAssignment assignment = assignmentRepository.save(VolunteerAssignment.builder()
                .allocation(allocation)
                .volunteer(volunteer)
                .assignedTime(allocation.getAllocationTime().plusMinutes(10))
                .matchScore(GeoUtils.round(72 + random.nextDouble() * 22, 1))
                .matchExplanation(volunteer.getUser().getFullName() + " was the closest available volunteer for this pickup.")
                .assignmentStatus(awaitingConfirmation ? AssignmentStatus.ACCEPTED : AssignmentStatus.COMPLETED)
                .build());

        LocalDateTime pickup = createdAt.plusHours(1);
        deliveryRepository.save(Delivery.builder()
                .assignment(assignment)
                .pickupTime(pickup)
                .deliveryTime(pickup.plusMinutes(35 + random.nextInt(40)))
                .deliveryStatus(DeliveryStatus.DELIVERED)
                .distanceKm(distance)
                .route(donation.getPickupAddress() + " -> " + recipient.getAddress())
                .build());

        if (awaitingConfirmation) {
            volunteer.setActiveDeliveries((volunteer.getActiveDeliveries() == null ? 0 : volunteer.getActiveDeliveries()) + 1);
            volunteerRepository.save(volunteer);
        } else {
            volunteer.setCompletedDeliveries((volunteer.getCompletedDeliveries() == null ? 0 : volunteer.getCompletedDeliveries()) + 1);
            volunteerRepository.save(volunteer);
        }
    }

    private void inFlightChain(FoodDonation donation, RecipientOrganization recipient, Volunteer volunteer,
                               LocalDateTime createdAt) {
        double distance = GeoUtils.round(GeoUtils.distanceKm(donation.getDonor().getLatitude(),
                donation.getDonor().getLongitude(), recipient.getLatitude(), recipient.getLongitude()), 2);
        List<EngineDtos.FactorScore> factors = historicalFactors(91, distance, donation.getQuantity());
        double total = factors.stream().mapToDouble(EngineDtos.FactorScore::contribution).sum();

        Allocation allocation = allocationRepository.save(Allocation.builder()
                .donation(donation)
                .recipient(recipient)
                .priorityScore(GeoUtils.round(total, 1))
                .decisionExplanation(historicalExplanation(recipient, factors, distance))
                .factorBreakdown(FactorCodec.encode(factors))
                .allocationTime(createdAt.plusMinutes(20))
                .allocationStatus(AllocationStatus.ACCEPTED)
                .build());
        VolunteerAssignment assignment = assignmentRepository.save(VolunteerAssignment.builder()
                .allocation(allocation)
                .volunteer(volunteer)
                .assignedTime(createdAt.plusMinutes(35))
                .matchScore(88.4)
                .matchExplanation(volunteer.getUser().getFullName() + " is 1.8 km from the pickup point and had no active deliveries.")
                .assignmentStatus(AssignmentStatus.ACCEPTED)
                .build());
        deliveryRepository.save(Delivery.builder()
                .assignment(assignment)
                .pickupTime(LocalDateTime.now().minusMinutes(35))
                .deliveryStatus(DeliveryStatus.IN_TRANSIT)
                .distanceKm(distance)
                .route(donation.getPickupAddress() + " -> " + recipient.getAddress())
                .build());
        volunteer.setActiveDeliveries((volunteer.getActiveDeliveries() == null ? 0 : volunteer.getActiveDeliveries()) + 1);
        volunteerRepository.save(volunteer);
    }

    private void proposedAllocation(FoodDonation donation, RecipientOrganization recipient, LocalDateTime createdAt) {
        double distance = GeoUtils.round(GeoUtils.distanceKm(donation.getDonor().getLatitude(),
                donation.getDonor().getLongitude(), recipient.getLatitude(), recipient.getLongitude()), 2);
        List<EngineDtos.FactorScore> factors = historicalFactors(86, distance, donation.getQuantity());
        double total = factors.stream().mapToDouble(EngineDtos.FactorScore::contribution).sum();
        allocationRepository.save(Allocation.builder()
                .donation(donation)
                .recipient(recipient)
                .priorityScore(GeoUtils.round(total, 1))
                .decisionExplanation(historicalExplanation(recipient, factors, distance))
                .factorBreakdown(FactorCodec.encode(factors))
                .allocationTime(createdAt.plusMinutes(30))
                .allocationStatus(AllocationStatus.PROPOSED)
                .build());
    }

    private List<EngineDtos.FactorScore> historicalFactors(double score, double distance, double quantity) {
        double base = Math.min(96, Math.max(55, score));
        double expiry = clamp(base + 8);
        double demand = clamp(base - 4 + random.nextDouble() * 10);
        double storage = clamp(base - 6 + random.nextDouble() * 12);
        double proximity = clamp(100 * Math.exp(-Math.max(distance, 0.4) / 6.0));
        double preference = random.nextDouble() > 0.25 ? 100 : 70;
        double fairness = clamp(base - 10 + random.nextDouble() * 20);
        return List.of(
                new EngineDtos.FactorScore("expiry", "Expiry Urgency", GeoUtils.round(expiry, 1), 25,
                        GeoUtils.round(expiry * 25 / 100, 2), "Donation handled well inside the safe consumption window"),
                new EngineDtos.FactorScore("demand", "Demand Match", GeoUtils.round(demand, 1), 20,
                        GeoUtils.round(demand * 20 / 100, 2), "Donation size matched the registered demand profile"),
                new EngineDtos.FactorScore("storage", "Storage Fit", GeoUtils.round(storage, 1), 15,
                        GeoUtils.round(storage * 15 / 100, 2), "Intake fitted comfortably within remaining capacity"),
                new EngineDtos.FactorScore("proximity", "Proximity", GeoUtils.round(proximity, 1), 15,
                        GeoUtils.round(proximity * 15 / 100, 2), GeoUtils.round(distance, 2) + " km from the pickup point"),
                new EngineDtos.FactorScore("preference", "Food Preference", preference, 15,
                        GeoUtils.round(preference * 15 / 100, 2), "Category accepted by the organization"),
                new EngineDtos.FactorScore("fairness", "Fair Distribution", GeoUtils.round(fairness, 1), 10,
                        GeoUtils.round(fairness * 10 / 100, 2), "Balanced against recent allocation history"));
    }

    private double clamp(double value) {
        return Math.max(5, Math.min(100, value));
    }

    private String historicalExplanation(RecipientOrganization recipient, List<EngineDtos.FactorScore> factors,
                                         double distance) {
        double total = factors.stream().mapToDouble(EngineDtos.FactorScore::contribution).sum();
        return recipient.getOrganizationName() + " scored " + GeoUtils.round(Math.min(total, 100), 1)
                + "/100. Recommended because expiry urgency, demand match and proximity all scored highly ("
                + GeoUtils.round(distance, 2) + " km pickup).";
    }

    private void seedNotifications(User admin, List<Donor> donors, List<RecipientOrganization> recipients,
                                   List<Volunteer> volunteers) {
        LocalDateTime now = LocalDateTime.now();
        notification(admin, "Welcome to FoodBridge",
                "Your administrator workspace is ready.", NotificationType.SYSTEM, true, now.minusDays(2));
        notification(admin, "Organization awaiting verification",
                "Hope Foundation Trust is pending verification.",
                NotificationType.SYSTEM, false, now.minusHours(5));

        notification(donors.get(0).getUser(), "Donation completed - thank you!",
                "Akshaya Patra Community Kitchen confirmed receipt of your Veg Biryani & Raita.",
                NotificationType.DELIVERY, true, now.minusDays(1).minusHours(3));
        notification(donors.get(0).getUser(), "Expiry alert",
                "One of your donations expires in under 3 hours.",
                NotificationType.EXPIRY_ALERT, false, now.minusMinutes(40));

        notification(recipients.get(0).getUser(), "New allocation recommended",
                "22 kg of Cooked Meals from Spice Route Restaurant is available for you.",
                NotificationType.ALLOCATION, false, now.minusMinutes(90));

        notification(volunteers.get(0).getUser(), "New pickup task assigned",
                "You have been matched to deliver Veg Pulao & Dal (22 kg) from Spice Route Restaurant.",
                NotificationType.ASSIGNMENT, false, now.minusMinutes(50));
    }

    private void notification(User user, String title, String message, NotificationType type,
                              boolean read, LocalDateTime createdAt) {
        notificationRepository.save(Notification.builder()
                .user(user)
                .title(title)
                .message(message)
                .notificationType(type)
                .isRead(read)
                .createdAt(createdAt)
                .build());
    }

    private void seedAuditTrail(User admin, List<Donor> donors, List<RecipientOrganization> recipients,
                                List<Volunteer> volunteers) {
        LocalDateTime now = LocalDateTime.now();
        audit(admin, "SYSTEM", "PLATFORM_INITIALISED", "Sample dataset loaded", now.minusDays(13));
        audit(admin, "ADMIN", "ORGANIZATION_VERIFIED", "Verified Bengaluru Food Bank",
                now.minusDays(12).minusHours(4));
        audit(donors.get(0).getUser(), "DONATION", "DONATION_CREATED",
                "Spice Route Restaurant registered Veg Biryani & Raita (24 kg)", now.minusDays(12));
        audit(null, "ALLOCATION", "ENGINE_ALLOCATED",
                "Engine allocated donation #1 to Akshaya Patra Community Kitchen", now.minusDays(12).plusMinutes(20));
        audit(volunteers.get(0).getUser(), "DELIVERY", "RECEIPT_CONFIRMED",
                "Delivery of donation #1 confirmed", now.minusDays(12).plusHours(2));
        audit(admin, "SYSTEM", "EXPIRY_SWEEP", "Automated sweep marked 1 donation as expired", now.minusDays(4));
        audit(recipients.get(3).getUser(), "RECIPIENT", "DEMAND_UPDATED",
                "Anand Ashram Shelter updated its demand to 70 kg", now.minusDays(2));
    }

    private void audit(User user, String module, String action, String description, LocalDateTime timestamp) {
        auditLogRepository.save(AuditLog.builder()
                .user(user)
                .module(module)
                .action(action)
                .description(description)
                .timestamp(timestamp)
                .build());
    }
}
