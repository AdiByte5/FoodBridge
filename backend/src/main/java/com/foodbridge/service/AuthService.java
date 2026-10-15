package com.foodbridge.service;

import com.foodbridge.common.ApiException;
import com.foodbridge.domain.*;
import com.foodbridge.dto.AuthDtos;
import com.foodbridge.repo.*;
import com.foodbridge.security.JwtService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Service
public class AuthService {

    private final UserRepository userRepository;
    private final DonorRepository donorRepository;
    private final RecipientOrganizationRepository recipientRepository;
    private final VolunteerRepository volunteerRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final long expirationMinutes;
    private final AuditService auditService;
    private final NotificationService notificationService;

    public AuthService(UserRepository userRepository,
                       DonorRepository donorRepository,
                       RecipientOrganizationRepository recipientRepository,
                       VolunteerRepository volunteerRepository,
                       PasswordEncoder passwordEncoder,
                       JwtService jwtService,
                       @Value("${foodbridge.jwt.expiration-minutes:720}") long expirationMinutes,
                       AuditService auditService,
                       NotificationService notificationService) {
        this.userRepository = userRepository;
        this.donorRepository = donorRepository;
        this.recipientRepository = recipientRepository;
        this.volunteerRepository = volunteerRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
        this.expirationMinutes = expirationMinutes;
        this.auditService = auditService;
        this.notificationService = notificationService;
    }

    @Transactional
    public AuthDtos.AuthResponse register(AuthDtos.RegisterRequest request) {
        if (request.role() == UserRole.ADMIN) {
            throw ApiException.forbidden("Administrator accounts are provisioned by the platform team");
        }
        if (userRepository.existsByEmailIgnoreCase(request.email())) {
            throw ApiException.conflict("An account with this email already exists");
        }

        User user = userRepository.save(User.builder()
                .fullName(request.fullName())
                .email(request.email().toLowerCase())
                .passwordHash(passwordEncoder.encode(request.password()))
                .phoneNumber(request.phoneNumber())
                .role(request.role())
                .accountStatus(AccountStatus.ACTIVE)
                .createdAt(LocalDateTime.now())
                .build());

        String organizationLabel;
        switch (request.role()) {
            case DONOR -> {
                OrganizationType donorType = request.organizationType() == null
                        ? OrganizationType.RESTAURANT : request.organizationType();
                Donor donor = donorRepository.save(Donor.builder()
                        .user(user)
                        // individuals donate under their own name; organizations use their business name
                        .organizationName(orDefault(request.organizationName(), request.fullName()))
                        .organizationType(donorType)
                        .address(request.address())
                        .latitude(request.latitude())
                        .longitude(request.longitude())
                        .verified(false)
                        .build());
                organizationLabel = donor.getOrganizationName();
            }
            case RECIPIENT -> {
                RecipientOrganization recipient = recipientRepository.save(RecipientOrganization.builder()
                        .user(user)
                        .organizationName(orDefault(request.organizationName(), request.fullName()))
                        .organizationType(request.organizationType() == null ? OrganizationType.NGO : request.organizationType())
                        .address(request.address())
                        .storageCapacityKg(request.storageCapacityKg() == null ? 250.0 : request.storageCapacityKg())
                        .currentLoadKg(0.0)
                        .demandKg(request.demandKg() == null ? 100.0 : request.demandKg())
                        .beneficiaries(request.beneficiaries() == null ? 100 : request.beneficiaries())
                        .latitude(request.latitude())
                        .longitude(request.longitude())
                        .verified(false)
                        .build());
                organizationLabel = recipient.getOrganizationName();
                notificationService.notifyAdmins("New recipient organization registered",
                        recipient.getOrganizationName() + " is awaiting verification.", NotificationType.SYSTEM);
            }
            case VOLUNTEER -> {
                Volunteer volunteer = volunteerRepository.save(Volunteer.builder()
                        .user(user)
                        .vehicleType(orDefault(request.vehicleType(), "Bike"))
                        .availabilityStatus(AvailabilityStatus.AVAILABLE)
                        .currentLocation(request.address())
                        .latitude(request.latitude())
                        .longitude(request.longitude())
                        .completedDeliveries(0)
                        .activeDeliveries(0)
                        .build());
                organizationLabel = volunteer.getVehicleType();
            }
            default -> throw ApiException.badRequest("Unsupported role");
        }

        auditService.record(user, "AUTH", "REGISTER",
                user.getFullName() + " registered as " + user.getRole() + " (" + organizationLabel + ")");

        return new AuthDtos.AuthResponse(jwtService.generateToken(user), expirationMinutes, toProfile(user));
    }

    @Transactional
    public AuthDtos.AuthResponse login(AuthDtos.LoginRequest request) {
        User user = userRepository.findByEmailIgnoreCase(request.email())
                .orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "Invalid email or password"));
        if (!passwordEncoder.matches(request.password(), user.getPasswordHash())) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "Invalid email or password");
        }
        if (user.getAccountStatus() == AccountStatus.SUSPENDED) {
            throw ApiException.forbidden("This account has been suspended. Contact the administrator.");
        }
        user.setLastLogin(LocalDateTime.now());
        userRepository.save(user);
        auditService.record(user, "AUTH", "LOGIN", user.getFullName() + " signed in");
        return new AuthDtos.AuthResponse(jwtService.generateToken(user), expirationMinutes, toProfile(user));
    }

    @Transactional(readOnly = true)
    public AuthDtos.UserProfile profile(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> ApiException.notFound("User not found"));
        return toProfile(user);
    }

    @Transactional
    public AuthDtos.UserProfile updateProfile(Long userId, AuthDtos.UpdateProfileRequest request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> ApiException.notFound("User not found"));
        if (request.fullName() != null && !request.fullName().isBlank()) {
            user.setFullName(request.fullName());
        }
        if (request.phoneNumber() != null) {
            user.setPhoneNumber(request.phoneNumber());
        }
        userRepository.save(user);

        switch (user.getRole()) {
            case DONOR -> donorRepository.findByUser_UserId(userId).ifPresent(donor -> {
                if (request.address() != null) donor.setAddress(request.address());
                if (request.latitude() != null) donor.setLatitude(request.latitude());
                if (request.longitude() != null) donor.setLongitude(request.longitude());
                donorRepository.save(donor);
            });
            case RECIPIENT -> recipientRepository.findByUser_UserId(userId).ifPresent(recipient -> {
                if (request.address() != null) recipient.setAddress(request.address());
                if (request.latitude() != null) recipient.setLatitude(request.latitude());
                if (request.longitude() != null) recipient.setLongitude(request.longitude());
                if (request.storageCapacityKg() != null) recipient.setStorageCapacityKg(request.storageCapacityKg());
                if (request.demandKg() != null) recipient.setDemandKg(request.demandKg());
                if (request.beneficiaries() != null) recipient.setBeneficiaries(request.beneficiaries());
                recipientRepository.save(recipient);
            });
            case VOLUNTEER -> volunteerRepository.findByUser_UserId(userId).ifPresent(volunteer -> {
                if (request.vehicleType() != null) volunteer.setVehicleType(request.vehicleType());
                if (request.address() != null) volunteer.setCurrentLocation(request.address());
                if (request.latitude() != null) volunteer.setLatitude(request.latitude());
                if (request.longitude() != null) volunteer.setLongitude(request.longitude());
                volunteerRepository.save(volunteer);
            });
            default -> {
            }
        }
        auditService.record(user, "AUTH", "PROFILE_UPDATED", user.getFullName() + " updated their profile");
        return toProfile(user);
    }

    public AuthDtos.UserProfile toProfile(User user) {
        AuthDtos.UserProfile profile = new AuthDtos.UserProfile(
                user.getUserId(), user.getFullName(), user.getEmail(), user.getPhoneNumber(), user.getRole(),
                user.getAccountStatus(), user.getCreatedAt(), user.getLastLogin(),
                null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null);

        return switch (user.getRole()) {
            case DONOR -> donorRepository.findByUser_UserId(user.getUserId())
                    .map(d -> withOrganization(profile, d.getDonorId(), d.getOrganizationName(), d.getOrganizationType(),
                            d.getAddress(), d.getLatitude(), d.getLongitude(), d.getVerified()))
                    .orElse(profile);
            case RECIPIENT -> recipientRepository.findByUser_UserId(user.getUserId())
                    .map(r -> withRecipient(profile, r))
                    .orElse(profile);
            case VOLUNTEER -> volunteerRepository.findByUser_UserId(user.getUserId())
                    .map(v -> withVolunteer(profile, v))
                    .orElse(profile);
            default -> profile;
        };
    }

    private AuthDtos.UserProfile withOrganization(AuthDtos.UserProfile p, Long id, String name,
                                                  OrganizationType type, String address, Double lat,
                                                  Double lng, Boolean verified) {
        return new AuthDtos.UserProfile(p.userId(), p.fullName(), p.email(), p.phoneNumber(), p.role(),
                p.accountStatus(), p.createdAt(), p.lastLogin(), id, name, type, address, lat, lng, verified,
                null, null, null, null, null, null, null, null, null);
    }

    private AuthDtos.UserProfile withRecipient(AuthDtos.UserProfile p, RecipientOrganization r) {
        return new AuthDtos.UserProfile(p.userId(), p.fullName(), p.email(), p.phoneNumber(), p.role(),
                p.accountStatus(), p.createdAt(), p.lastLogin(), r.getRecipientId(), r.getOrganizationName(),
                r.getOrganizationType(), r.getAddress(), r.getLatitude(), r.getLongitude(), r.getVerified(),
                r.getStorageCapacityKg(), r.getCurrentLoadKg(), r.getDemandKg(), r.getBeneficiaries(),
                null, null, null, null, null);
    }

    private AuthDtos.UserProfile withVolunteer(AuthDtos.UserProfile p, Volunteer v) {
        return new AuthDtos.UserProfile(p.userId(), p.fullName(), p.email(), p.phoneNumber(), p.role(),
                p.accountStatus(), p.createdAt(), p.lastLogin(), v.getVolunteerId(), null, null,
                v.getCurrentLocation(), v.getLatitude(), v.getLongitude(), true,
                null, null, null, null, v.getVehicleType(), v.getAvailabilityStatus(),
                v.getCurrentLocation(), v.getCompletedDeliveries(), v.getActiveDeliveries());
    }

    private String orDefault(String value, String fallback) {
        return value == null || value.isBlank() ? fallback : value;
    }

}
