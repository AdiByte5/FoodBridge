package com.foodbridge.domain;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "recipient_organization")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RecipientOrganization {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "recipient_id")
    private Long recipientId;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", unique = true)
    private User user;

    @Column(name = "organization_name", nullable = false)
    private String organizationName;

    @Enumerated(EnumType.STRING)
    @Column(name = "organization_type", columnDefinition = "varchar(32)")
    private OrganizationType organizationType;

    @Column(columnDefinition = "TEXT")
    private String address;

    /** Total cold/dry storage available to hold rescued food, in kg. */
    @Column(name = "storage_capacity_kg")
    private Double storageCapacityKg;

    /** Current on-hand load, in kg. */
    @Column(name = "current_load_kg")
    private Double currentLoadKg;

    /** Food still needed by the organization's beneficiaries, in kg. */
    @Column(name = "demand_kg")
    private Double demandKg;

    /** Number of people the organization serves. */
    @Column(name = "beneficiaries")
    private Integer beneficiaries;

    private Double latitude;

    private Double longitude;

    @Column(nullable = false)
    private Boolean verified;
}
