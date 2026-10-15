package com.foodbridge.repo;

import com.foodbridge.domain.Delivery;
import com.foodbridge.domain.DeliveryStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface DeliveryRepository extends JpaRepository<Delivery, Long> {

    Optional<Delivery> findByAssignment_AssignmentId(Long assignmentId);

    List<Delivery> findAllByOrderByDeliveryTimeDesc();

    long countByDeliveryStatus(DeliveryStatus status);
}
