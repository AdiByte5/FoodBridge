package com.foodbridge.repo;

import com.foodbridge.domain.DonationStatus;
import com.foodbridge.domain.FoodDonation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;

public interface FoodDonationRepository extends JpaRepository<FoodDonation, Long> {

    List<FoodDonation> findByDonor_DonorIdOrderByCreatedAtDesc(Long donorId);

    List<FoodDonation> findAllByOrderByCreatedAtDesc();

    List<FoodDonation> findByStatusIn(List<DonationStatus> statuses);

    long countByStatus(DonationStatus status);

    List<FoodDonation> findByStatusAndExpiryTimeBefore(DonationStatus status, LocalDateTime time);

    long countByCreatedAtAfter(LocalDateTime time);

    @Query("select coalesce(sum(d.quantity), 0) from FoodDonation d where d.status in :statuses")
    Double sumQuantityByStatuses(@Param("statuses") List<DonationStatus> statuses);

    @Query("select coalesce(sum(d.quantity), 0) from FoodDonation d where d.createdAt >= :from")
    Double sumQuantityCreatedAfter(@Param("from") LocalDateTime from);

    @Query("select d.category.categoryName, count(d), coalesce(sum(d.quantity),0) from FoodDonation d group by d.category.categoryName")
    List<Object[]> categoryDistribution();

    List<FoodDonation> findByStatusOrderByExpiryTimeAsc(DonationStatus status);
}
