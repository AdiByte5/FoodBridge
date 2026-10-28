package com.foodbridge.web;

import com.jayway.jsonpath.JsonPath;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * End-to-end check of how a donation actually travels through the platform:
 * registration triggers the engine automatically, and the administrator can
 * replace the engine's choice while nothing has been collected yet.
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
class AllocationFlowTest {

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

    private long categoryId(String name) throws Exception {
        String body = mockMvc.perform(get("/api/public/categories"))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        for (Map<String, Object> category : JsonPath.<List<Map<String, Object>>>read(body, "$")) {
            if (category.get("categoryName").equals(name)) {
                return ((Number) category.get("categoryId")).longValue();
            }
        }
        throw new IllegalStateException("Category not seeded: " + name);
    }

    /** Reads one numeric field out of a JSON response. */
    private static long number(String body, String path) {
        return ((Number) JsonPath.read(body, path)).longValue();
    }

    /** Registers a donation exactly as the donor dashboard does and returns the created record. */
    private String register(String donorToken, String foodName, double quantity, int hoursToExpiry) throws Exception {
        String expiry = LocalDateTime.now().plusHours(hoursToExpiry).truncatedTo(ChronoUnit.SECONDS).toString();
        MvcResult result = mockMvc.perform(post("/api/donations")
                        .header("Authorization", "Bearer " + donorToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "foodName": "%s",
                                  "categoryId": %d,
                                  "quantity": %s,
                                  "unit": "kg",
                                  "expiryTime": "%s",
                                  "pickupAddress": "12, 2nd Avenue, Anna Nagar, Chennai",
                                  "storageRequirement": "HOT_HOLDING"
                                }
                                """.formatted(foodName, categoryId("Cooked Meals"), quantity, expiry)))
                .andReturn();
        assertThat(result.getResponse().getStatus())
                .as("donation registration failed: " + result.getResponse().getContentAsString())
                .isEqualTo(201);
        return result.getResponse().getContentAsString();
    }

    @Test
    @DisplayName("registering a donation matches it with a recipient automatically, with no administrator step")
    void registrationAllocatesAutomatically() throws Exception {
        String donorToken = login("donor@foodbridge.org", "Donor@123");

        String donation = register(donorToken, "Veg Biryani & Raita (automatic match)", 10, 4);

        assertThat((String) JsonPath.read(donation, "$.status")).isEqualTo("ALLOCATED");
        assertThat((String) JsonPath.read(donation, "$.allocationStatus")).isEqualTo("PROPOSED");
        assertThat((String) JsonPath.read(donation, "$.recipientName")).isNotBlank();
        assertThat(((Number) JsonPath.read(donation, "$.priorityScore")).doubleValue()).isBetween(0.0, 100.0);
        assertThat((String) JsonPath.read(donation, "$.decisionExplanation")).contains("/100");
    }

    @Test
    @DisplayName("a donation no organization can take is left in the queue instead of being forced onto one")
    void unplaceableDonationStaysPending() throws Exception {
        String donorToken = login("donor@foodbridge.org", "Donor@123");

        String donation = register(donorToken, "Bulk Rice Bags (far above any free storage)", 2500, 24);

        assertThat((String) JsonPath.read(donation, "$.status")).isEqualTo("PENDING");
        assertThat((Object) JsonPath.read(donation, "$.recipientName")).isNull();
        assertThat((Object) JsonPath.read(donation, "$.allocationId")).isNull();
    }

    @Test
    @DisplayName("the administrator can replace the engine's recipient and the record shows the override")
    void administratorOverridesTheRecommendation() throws Exception {
        String donorToken = login("donor@foodbridge.org", "Donor@123");
        String adminToken = login("admin@foodbridge.org", "Admin@123");

        String donation = register(donorToken, "Buffet Surplus (override check)", 12, 4);
        long allocationId = number(donation, "$.allocationId");
        long engineChoice = number(donation, "$.recipientId");

        String preview = mockMvc.perform(
                        post("/api/allocations/engine/" + number(donation, "$.donationId") + "/preview")
                                .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();

        Map<String, Object> alternative = null;
        for (Map<String, Object> candidate : JsonPath.<List<Map<String, Object>>>read(preview, "$.ranked")) {
            if (Boolean.FALSE.equals(candidate.get("excluded"))
                    && ((Number) candidate.get("recipientId")).longValue() != engineChoice) {
                alternative = candidate;
            }
        }
        assertThat(alternative).as("at least one other eligible organization exists").isNotNull();
        long alternativeId = ((Number) alternative.get("recipientId")).longValue();
        String alternativeName = (String) alternative.get("organizationName");

        mockMvc.perform(post("/api/allocations/" + allocationId + "/override")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"recipientId\":" + alternativeId + ",\"reason\":\"Closer to the pickup point\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.allocationId").value(allocationId))
                .andExpect(jsonPath("$.recipientName").value(alternativeName))
                .andExpect(jsonPath("$.allocationStatus").value("PROPOSED"))
                .andExpect(jsonPath("$.decisionExplanation").value(org.hamcrest.Matchers.containsString("Overridden by the administrator")))
                .andExpect(jsonPath("$.decisionExplanation").value(org.hamcrest.Matchers.containsString("Closer to the pickup point")));

        // the same organization twice is refused, and an unverified organization cannot be forced in
        mockMvc.perform(post("/api/allocations/" + allocationId + "/override")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"recipientId\":" + alternativeId + "}"))
                .andExpect(status().isBadRequest());

        String unverifiedId = null;
        for (Map<String, Object> candidate : JsonPath.<List<Map<String, Object>>>read(preview, "$.ranked")) {
            if (candidate.get("organizationName").equals("Hope Foundation Trust")) {
                unverifiedId = String.valueOf(((Number) candidate.get("recipientId")).longValue());
            }
        }
        assertThat(unverifiedId).isNotNull();
        mockMvc.perform(post("/api/allocations/" + allocationId + "/override")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"recipientId\":" + unverifiedId + "}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("a waiting donation is matched as soon as an organization frees enough storage")
    void waitingDonationIsMatchedWhenCapacityChanges() throws Exception {
        String donorToken = login("donor@foodbridge.org", "Donor@123");
        String foodBankToken = login("foodbank@foodbridge.org", "Recipient@123");

        String donation = register(donorToken, "Bulk Vegetable Crates (waiting for storage)", 700, 24);
        long donationId = number(donation, "$.donationId");
        assertThat((String) JsonPath.read(donation, "$.status")).isEqualTo("PENDING");

        // the food bank records a larger store; the queue is retried without anyone pressing a button
        mockMvc.perform(patch("/api/recipients/me/demand")
                        .header("Authorization", "Bearer " + foodBankToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"storageCapacityKg\": 1200}"))
                .andExpect(status().isOk());

        String list = mockMvc.perform(get("/api/donations").header("Authorization", "Bearer " + donorToken))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        Map<String, Object> match = JsonPath.<List<Map<String, Object>>>read(list, "$").stream()
                .filter(row -> ((Number) row.get("donationId")).longValue() == donationId)
                .findFirst().orElseThrow();
        assertThat((String) match.get("status")).isEqualTo("ALLOCATED");
        assertThat((String) match.get("recipientName")).isNotBlank();
    }

    @Test
    @DisplayName("the administrator can hand an allocation to the best available volunteer")
    void administratorAssignsVolunteer() throws Exception {
        String donorToken = login("donor@foodbridge.org", "Donor@123");
        String adminToken = login("admin@foodbridge.org", "Admin@123");

        String donation = register(donorToken, "Packed Lunch Boxes (volunteer check)", 15, 5);
        long allocationId = number(donation, "$.allocationId");

        mockMvc.perform(post("/api/allocations/" + allocationId + "/assign-volunteer")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.assignmentId").exists())
                .andExpect(jsonPath("$.volunteerName").isNotEmpty())
                .andExpect(jsonPath("$.deliveryStatus").value("PENDING"));
    }

    @Test
    @DisplayName("only the administrator can override a decision")
    void overrideIsAdminOnly() throws Exception {
        String donorToken = login("donor@foodbridge.org", "Donor@123");
        String recipientToken = login("orphanage@foodbridge.org", "Recipient@123");

        String donation = register(donorToken, "Snack Boxes (override permission check)", 8, 5);
        long allocationId = number(donation, "$.allocationId");

        mockMvc.perform(post("/api/allocations/" + allocationId + "/override")
                        .header("Authorization", "Bearer " + recipientToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"recipientId\":1}"))
                .andExpect(status().isForbidden());
        mockMvc.perform(post("/api/allocations/" + allocationId + "/override")
                        .header("Authorization", "Bearer " + donorToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"recipientId\":1}"))
                .andExpect(status().isForbidden());
    }
}
