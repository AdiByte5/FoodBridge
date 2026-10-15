package com.foodbridge.repo;

import com.foodbridge.domain.AssignmentStatus;
import com.foodbridge.domain.VolunteerAssignment;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface VolunteerAssignmentRepository extends JpaRepository<VolunteerAssignment, Long> {

    Optional<VolunteerAssignment> findByAllocation_AllocationId(Long allocationId);

    List<VolunteerAssignment> findByVolunteer_VolunteerIdOrderByAssignedTimeDesc(Long volunteerId);

    List<VolunteerAssignment> findAllByOrderByAssignedTimeDesc();

    long countByAssignmentStatus(AssignmentStatus status);

    long countByVolunteer_VolunteerIdAndAssignmentStatusIn(Long volunteerId, List<AssignmentStatus> statuses);
}
