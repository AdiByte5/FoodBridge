package com.foodbridge.domain;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "donor")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Donor {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "donor_id")
    private Long donorId;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", unique = true)
    private User user;

    @Column(name = "organization_name", nullable = false)
    private String organizationName;

    @Enumerated(EnumType.STRING)
    // stored as VARCHAR so new donor types can be added without a schema migration
    @Column(name = "organization_type", columnDefinition = "varchar(32)")
    private OrganizationType organizationType;

    @Column(columnDefinition = "TEXT")
    private String address;

    private Double latitude;

    private Double longitude;

    @Column(nullable = false)
    private Boolean verified;
}
