package com.foodbridge.repo;

import com.foodbridge.domain.RecipientOrganization;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface RecipientOrganizationRepository extends JpaRepository<RecipientOrganization, Long> {

    Optional<RecipientOrganization> findByUser_UserId(Long userId);

    List<RecipientOrganization> findAllByVerifiedTrue();

    List<RecipientOrganization> findAllByOrderByOrganizationNameAsc();

    long countByVerifiedTrue();
}
