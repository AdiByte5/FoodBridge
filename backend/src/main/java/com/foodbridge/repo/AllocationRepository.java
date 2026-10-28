package com.foodbridge.repo;

import com.foodbridge.domain.Allocation;
import com.foodbridge.domain.AllocationStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface AllocationRepository extends JpaRepository<Allocation, Long> {

    /**
     * The decision that currently represents a donation. A donation can carry more than one
     * decision record over its life (a re-run after a rejection, an override, a change of
     * details), so the newest row is the authoritative one.
     */
    Optional<Allocation> findTopByDonation_DonationIdOrderByAllocationIdDesc(Long donationId);

    List<Allocation> findByDonation_DonationIdOrderByAllocationTimeDesc(Long donationId);

    List<Allocation> findByRecipient_RecipientIdOrderByAllocationTimeDesc(Long recipientId);

    List<Allocation> findAllByOrderByAllocationTimeDesc();

    long countByAllocationStatus(AllocationStatus status);

    long countByAllocationTimeAfter(LocalDateTime time);

    List<Allocation> findByRecipient_RecipientIdAndAllocationTimeAfter(Long recipientId, LocalDateTime time);

    @Query("""
            select a.recipient.recipientId, a.recipient.organizationName,
                   coalesce(sum(a.donation.quantity), 0)
            from Allocation a
            where a.allocationStatus in (com.foodbridge.domain.AllocationStatus.ACCEPTED,
                                         com.foodbridge.domain.AllocationStatus.COMPLETED)
            group by a.recipient.recipientId, a.recipient.organizationName
            order by coalesce(sum(a.donation.quantity), 0) desc
            """)
    List<Object[]> distributionByRecipient();

    @Query("""
            select a.recipient.recipientId, coalesce(sum(a.donation.quantity), 0)
            from Allocation a
            where a.allocationTime >= :from
              and a.allocationStatus in (com.foodbridge.domain.AllocationStatus.ACCEPTED,
                                         com.foodbridge.domain.AllocationStatus.COMPLETED)
            group by a.recipient.recipientId
            """)
    List<Object[]> receivedSince(@Param("from") LocalDateTime from);
}
