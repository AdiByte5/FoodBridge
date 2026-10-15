package com.foodbridge.web;

import com.foodbridge.dto.NotificationDtos;
import com.foodbridge.security.UserPrincipal;
import com.foodbridge.service.NotificationService;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/notifications")
public class NotificationController {

    private final NotificationService notificationService;

    public NotificationController(NotificationService notificationService) {
        this.notificationService = notificationService;
    }

    @GetMapping
    public List<NotificationDtos.NotificationView> list(@AuthenticationPrincipal UserPrincipal principal) {
        return notificationService.listForUser(principal.userId());
    }

    @GetMapping("/unread-count")
    public Map<String, Long> unreadCount(@AuthenticationPrincipal UserPrincipal principal) {
        return Map.of("unread", notificationService.unreadCount(principal.userId()));
    }

    @PostMapping("/{notificationId}/read")
    public NotificationDtos.NotificationView markRead(@PathVariable Long notificationId,
                                                      @AuthenticationPrincipal UserPrincipal principal) {
        return notificationService.markRead(notificationId, principal.userId());
    }

    @PostMapping("/read-all")
    public Map<String, Integer> markAllRead(@AuthenticationPrincipal UserPrincipal principal) {
        return Map.of("updated", notificationService.markAllRead(principal.userId()));
    }
}
