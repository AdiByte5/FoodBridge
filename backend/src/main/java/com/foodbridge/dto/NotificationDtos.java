package com.foodbridge.dto;

import java.time.LocalDateTime;

public final class NotificationDtos {

    private NotificationDtos() {
    }

    public record NotificationView(
            Long notificationId,
            String title,
            String message,
            String notificationType,
            Boolean isRead,
            LocalDateTime createdAt) {
    }
}
