package com.foodbridge.domain;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "food_category")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class FoodCategory {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "category_id")
    private Long categoryId;

    @Column(name = "category_name", nullable = false, unique = true)
    private String categoryName;

    @Enumerated(EnumType.STRING)
    @Column(name = "recommended_storage")
    private StorageRequirement recommendedStorage;

    /** Hours the category typically stays safe once prepared. */
    @Column(name = "shelf_life_hours")
    private Integer shelfLifeHours;
}
