package com.foodbridge.web;

import com.foodbridge.dto.AdminDtos;
import com.foodbridge.security.UserPrincipal;
import com.foodbridge.service.DemoService;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/scenario")
@PreAuthorize("hasRole('ADMIN')")
public class DemoController {

    private final DemoService demoService;

    public DemoController(DemoService demoService) {
        this.demoService = demoService;
    }

    @PostMapping("/reset")
    public Map<String, Object> reset() {
        return demoService.resetDemo();
    }

    @PostMapping("/run")
    public AdminDtos.DemoScenarioResponse run(@AuthenticationPrincipal UserPrincipal principal) {
        return demoService.runScenario(principal.userId());
    }
}
