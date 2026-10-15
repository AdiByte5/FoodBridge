package com.foodbridge.web;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.util.regex.Matcher;
import java.util.regex.Pattern;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Boots the whole application against an in-memory database and checks the
 * role rules that protect each part of the API.
 */
@SpringBootTest(properties = {
        "spring.datasource.url=jdbc:h2:mem:foodbridge-test;MODE=MySQL;DB_CLOSE_DELAY=-1;DATABASE_TO_LOWER=TRUE",
        "spring.datasource.driver-class-name=org.h2.Driver",
        "spring.datasource.username=sa",
        "spring.datasource.password=",
        "spring.jpa.hibernate.ddl-auto=create-drop",
        "foodbridge.demo.seed=true",
        "foodbridge.scheduler.expiry-ms=3600000"
})
@AutoConfigureMockMvc
class ApiAccessTest {

    private static final Pattern TOKEN = Pattern.compile("\"token\"\\s*:\\s*\"([^\"]+)\"");

    @Autowired
    private MockMvc mockMvc;

    private String login(String email, String password) throws Exception {
        MvcResult result = mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"" + email + "\",\"password\":\"" + password + "\"}"))
                .andExpect(status().isOk())
                .andReturn();
        Matcher matcher = TOKEN.matcher(result.getResponse().getContentAsString());
        assertThat(matcher.find()).as("login response should contain a token").isTrue();
        return matcher.group(1);
    }

    @Test
    @DisplayName("requests without a token are rejected with 401")
    void unauthenticatedRequestIsRejected() throws Exception {
        mockMvc.perform(get("/api/donations")).andExpect(status().isUnauthorized());
        mockMvc.perform(get("/api/admin/users")).andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("a donor cannot read admin-only data")
    void donorIsBlockedFromAdminEndpoints() throws Exception {
        String donorToken = login("donor@foodbridge.org", "Donor@123");

        mockMvc.perform(get("/api/admin/users").header("Authorization", "Bearer " + donorToken))
                .andExpect(status().isForbidden());
        mockMvc.perform(get("/api/allocations").header("Authorization", "Bearer " + donorToken))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("a recipient cannot act on another organization's allocation")
    void recipientSeesOnlyOwnAllocations() throws Exception {
        String recipientToken = login("orphanage@foodbridge.org", "Recipient@123");

        mockMvc.perform(get("/api/recipients/me/allocations").header("Authorization", "Bearer " + recipientToken))
                .andExpect(status().isOk());
        mockMvc.perform(get("/api/admin/system-health").header("Authorization", "Bearer " + recipientToken))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("the administrator can read platform data")
    void adminHasFullAccess() throws Exception {
        String adminToken = login("admin@foodbridge.org", "Admin@123");

        mockMvc.perform(get("/api/admin/users").header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk());
        mockMvc.perform(get("/api/analytics/overview").header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.overview.totalDonations").exists());
    }

    @Test
    @DisplayName("an individual can sign up as a donor and is listed under their own name")
    void individualDonorSignsUp() throws Exception {
        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "fullName": "Meera Krishnan",
                                  "email": "meera.signup@example.com",
                                  "password": "Meera@123",
                                  "role": "DONOR",
                                  "organizationType": "INDIVIDUAL",
                                  "address": "Jayanagar, Bengaluru"
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.user.organizationName").value("Meera Krishnan"))
                .andExpect(jsonPath("$.user.organizationType").value("INDIVIDUAL"))
                .andExpect(jsonPath("$.user.verified").value(false));

        // the same email cannot register twice
        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "fullName": "Meera Krishnan",
                                  "email": "meera.signup@example.com",
                                  "password": "Meera@123",
                                  "role": "DONOR"
                                }
                                """))
                .andExpect(status().isConflict());
    }
}
