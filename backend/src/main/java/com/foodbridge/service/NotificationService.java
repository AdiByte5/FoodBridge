package com.foodbridge.service;

import com.foodbridge.common.ApiException;
import com.foodbridge.domain.Notification;
import com.foodbridge.domain.NotificationType;
import com.foodbridge.domain.User;
import com.foodbridge.domain.UserRole;
import com.foodbridge.dto.NotificationDtos;
import com.foodbridge.repo.NotificationRepository;
import com.foodbridge.repo.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
public class NotificationService {

    private final NotificationRepository notificationRepository;
    private final UserRepository userRepository;

    public NotificationService(NotificationRepository notificationRepository, UserRepository userRepository) {
        this.notificationRepository = notificationRepository;
        this.userRepository = userRepository;
    }

    @Transactional
    public void notify(User user, String title, String message, NotificationType type) {
        if (user == null) {
            return;
        }
        notificationRepository.save(Notification.builder()
                .user(user)
                .title(title)
                .message(message)
                .notificationType(type)
                .isRead(false)
                .createdAt(LocalDateTime.now())
                .build());
    }

    @Transactional
    public void notifyAdmins(String title, String message, NotificationType type) {
        userRepository.findAllByRole(UserRole.ADMIN).forEach(admin -> notify(admin, title, message, type));
    }

    @Transactional(readOnly = true)
    public List<NotificationDtos.NotificationView> listForUser(Long userId) {
        return notificationRepository.findByUser_UserIdOrderByCreatedAtDesc(userId).stream()
                .map(this::toView)
                .toList();
    }

    @Transactional(readOnly = true)
    public long unreadCount(Long userId) {
        return notificationRepository.countByUser_UserIdAndIsReadFalse(userId);
    }

    @Transactional
    public NotificationDtos.NotificationView markRead(Long notificationId, Long userId) {
        Notification notification = notificationRepository.findById(notificationId)
                .orElseThrow(() -> ApiException.notFound("Notification not found"));
        if (!notification.getUser().getUserId().equals(userId)) {
            throw ApiException.forbidden("This notification does not belong to you");
        }
        notification.setIsRead(true);
        return toView(notificationRepository.save(notification));
    }

    @Transactional
    public int markAllRead(Long userId) {
        List<Notification> unread = notificationRepository.findByUser_UserIdAndIsReadFalseOrderByCreatedAtDesc(userId);
        unread.forEach(n -> n.setIsRead(true));
        notificationRepository.saveAll(unread);
        return unread.size();
    }

    private NotificationDtos.NotificationView toView(Notification n) {
        return new NotificationDtos.NotificationView(
                n.getNotificationId(),
                n.getTitle(),
                n.getMessage(),
                n.getNotificationType() == null ? null : n.getNotificationType().name(),
                n.getIsRead(),
                n.getCreatedAt());
    }
}
