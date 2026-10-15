package com.foodbridge.repo;

import com.foodbridge.domain.User;
import com.foodbridge.domain.UserRole;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long> {

    Optional<User> findByEmailIgnoreCase(String email);

    boolean existsByEmailIgnoreCase(String email);

    List<User> findAllByRole(UserRole role);

    long countByRole(UserRole role);
}
