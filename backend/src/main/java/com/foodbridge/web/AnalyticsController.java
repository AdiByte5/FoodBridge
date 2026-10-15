package com.foodbridge.web;

import com.foodbridge.dto.AnalyticsDtos;
import com.foodbridge.service.AnalyticsService;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.nio.charset.StandardCharsets;
import java.time.LocalDate;

@RestController
@RequestMapping("/api/analytics")
public class AnalyticsController {

    private final AnalyticsService analyticsService;

    public AnalyticsController(AnalyticsService analyticsService) {
        this.analyticsService = analyticsService;
    }

    @GetMapping("/overview")
    public AnalyticsDtos.AnalyticsResponse overview() {
        return analyticsService.overview();
    }

    @GetMapping("/export/donations.csv")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<byte[]> exportDonations() {
        byte[] csv = analyticsService.exportDonationsCsv().getBytes(StandardCharsets.UTF_8);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        "attachment; filename=foodbridge-donations-" + LocalDate.now() + ".csv")
                .contentType(new MediaType("text", "csv"))
                .body(csv);
    }
}
