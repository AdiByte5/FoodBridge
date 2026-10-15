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
@RequestMapping("/api/admin/sample-data")
@PreAuthorize("hasRole('ADMIN')")
public class DemoController {

    private final DemoService demoService;

    public DemoController(DemoService demoService) {
        this.demoService = demoService;
    }

    @PostMapping("/restore")
    public Map<String, Object> reset() {
        return demoService.resetDemo();
    }

    /**
     * Optional utility: replays a complete rescue (donation to confirmed delivery)
     * in one call. Not surfaced in the web app; useful as a fallback for demos.
     */
    @PostMapping("/scenario")
    public AdminDtos.DemoScenarioResponse run(@AuthenticationPrincipal UserPrincipal principal) {
        return demoService.runScenario(principal.userId());
    }
}
