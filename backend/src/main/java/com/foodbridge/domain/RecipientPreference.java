package com.foodbridge.domain;

import jakarta.persistence.*;
import lombok.*;

/**
 * Bridge entity resolving the M:N relationship between
 * Recipient Organization and Food Category.
 */
@Entity
@Table(name = "recipient_preference")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RecipientPreference {

    @EmbeddedId
    private RecipientPreferenceId id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @MapsId("recipientId")
    @JoinColumn(name = "recipient_id")
    private RecipientOrganization recipient;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @MapsId("categoryId")
    @JoinColumn(name = "category_id")
    private FoodCategory category;
}
