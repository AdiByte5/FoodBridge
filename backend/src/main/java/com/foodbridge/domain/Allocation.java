package com.foodbridge.domain;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "allocation")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Allocation {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "allocation_id")
    private Long allocationId;

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "donation_id", unique = true)
    private FoodDonation donation;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "recipient_id", nullable = false)
    private RecipientOrganization recipient;

    @Column(name = "priority_score")
    private Double priorityScore;

    @Column(name = "decision_explanation", columnDefinition = "TEXT")
    private String decisionExplanation;

    /** JSON snapshot of the per-factor scoring breakdown, kept for transparency. */
    @Column(name = "factor_breakdown", columnDefinition = "TEXT")
    private String factorBreakdown;

    @Column(name = "allocation_time")
    private LocalDateTime allocationTime;

    @Enumerated(EnumType.STRING)
    @Column(name = "allocation_status", nullable = false)
    private AllocationStatus allocationStatus;
}
