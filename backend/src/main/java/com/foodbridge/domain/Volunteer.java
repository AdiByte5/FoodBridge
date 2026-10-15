package com.foodbridge.domain;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "volunteer")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Volunteer {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "volunteer_id")
    private Long volunteerId;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", unique = true)
    private User user;

    @Column(name = "vehicle_type")
    private String vehicleType;

    @Enumerated(EnumType.STRING)
    @Column(name = "availability_status")
    private AvailabilityStatus availabilityStatus;

    @Column(name = "current_location")
    private String currentLocation;

    private Double latitude;

    private Double longitude;

    @Column(name = "completed_deliveries")
    private Integer completedDeliveries;

    @Column(name = "active_deliveries")
    private Integer activeDeliveries;
}
