package com.foodbridge.repo;

import com.foodbridge.domain.Donor;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface DonorRepository extends JpaRepository<Donor, Long> {

    Optional<Donor> findByUser_UserId(Long userId);

    List<Donor> findAllByVerifiedTrue();

    List<Donor> findAllByOrderByOrganizationNameAsc();
}
