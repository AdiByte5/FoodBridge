package com.foodbridge.web;

import com.foodbridge.dto.AuthDtos;
import com.foodbridge.security.UserPrincipal;
import com.foodbridge.service.AuthService;
import jakarta.validation.Valid;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/register")
    public AuthDtos.AuthResponse register(@Valid @RequestBody AuthDtos.RegisterRequest request) {
        return authService.register(request);
    }

    @PostMapping("/login")
    public AuthDtos.AuthResponse login(@Valid @RequestBody AuthDtos.LoginRequest request) {
        return authService.login(request);
    }

    @GetMapping("/me")
    public AuthDtos.UserProfile me(@AuthenticationPrincipal UserPrincipal principal) {
        return authService.profile(principal.userId());
    }

    @PatchMapping("/me")
    public AuthDtos.UserProfile updateProfile(@AuthenticationPrincipal UserPrincipal principal,
                                              @RequestBody AuthDtos.UpdateProfileRequest request) {
        return authService.updateProfile(principal.userId(), request);
    }
}
