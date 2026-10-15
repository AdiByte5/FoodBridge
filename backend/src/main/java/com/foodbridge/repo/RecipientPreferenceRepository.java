package com.foodbridge.repo;

import com.foodbridge.domain.RecipientPreference;
import com.foodbridge.domain.RecipientPreferenceId;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface RecipientPreferenceRepository extends JpaRepository<RecipientPreference, RecipientPreferenceId> {

    List<RecipientPreference> findByRecipient_RecipientId(Long recipientId);

    void deleteByRecipient_RecipientId(Long recipientId);
}
