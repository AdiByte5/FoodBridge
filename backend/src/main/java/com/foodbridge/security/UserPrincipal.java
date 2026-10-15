package com.foodbridge.security;

import com.foodbridge.domain.User;
import com.foodbridge.domain.UserRole;

/**
 * Lightweight authenticated principal attached to every request.
 */
public record UserPrincipal(Long userId, String email, UserRole role, String fullName) {

    public static UserPrincipal from(User user) {
        return new UserPrincipal(user.getUserId(), user.getEmail(), user.getRole(), user.getFullName());
    }
}
