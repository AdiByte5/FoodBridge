package com.foodbridge.config;

import com.foodbridge.repo.UserRepository;
import com.foodbridge.service.DataSeeder;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;

@Component
public class DemoDataInitializer implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(DemoDataInitializer.class);

    private final DataSeeder dataSeeder;
    private final UserRepository userRepository;
    private final boolean seedEnabled;

    public DemoDataInitializer(DataSeeder dataSeeder,
                               UserRepository userRepository,
                               @Value("${foodbridge.demo.seed:true}") boolean seedEnabled) {
        this.dataSeeder = dataSeeder;
        this.userRepository = userRepository;
        this.seedEnabled = seedEnabled;
    }

    @Override
    public void run(ApplicationArguments args) {
        if (!seedEnabled) {
            return;
        }
        if (userRepository.count() > 0) {
            log.info("Demo dataset already present ({} users) - skipping seed", userRepository.count());
            return;
        }
        dataSeeder.seedAll();
        log.info("Seeded FoodBridge demo dataset: donors, recipients, volunteers and 2 weeks of history");
    }
}
