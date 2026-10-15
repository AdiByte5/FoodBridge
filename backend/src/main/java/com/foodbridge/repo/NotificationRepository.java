package com.foodbridge.repo;

import com.foodbridge.domain.Notification;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface NotificationRepository extends JpaRepository<Notification, Long> {

    List<Notification> findByUser_UserIdOrderByCreatedAtDesc(Long userId);

    long countByUser_UserIdAndIsReadFalse(Long userId);

    List<Notification> findByUser_UserIdAndIsReadFalseOrderByCreatedAtDesc(Long userId);
}
