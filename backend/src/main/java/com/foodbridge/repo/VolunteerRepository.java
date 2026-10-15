package com.foodbridge.repo;

import com.foodbridge.domain.AvailabilityStatus;
import com.foodbridge.domain.Volunteer;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface VolunteerRepository extends JpaRepository<Volunteer, Long> {

    Optional<Volunteer> findByUser_UserId(Long userId);

    List<Volunteer> findAllByAvailabilityStatus(AvailabilityStatus status);

    List<Volunteer> findAllByOrderByCompletedDeliveriesDesc();
}
