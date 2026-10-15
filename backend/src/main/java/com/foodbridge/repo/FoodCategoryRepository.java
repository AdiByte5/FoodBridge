package com.foodbridge.repo;

import com.foodbridge.domain.FoodCategory;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface FoodCategoryRepository extends JpaRepository<FoodCategory, Long> {

    Optional<FoodCategory> findByCategoryNameIgnoreCase(String categoryName);
}
