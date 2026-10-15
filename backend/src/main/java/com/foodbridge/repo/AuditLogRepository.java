package com.foodbridge.repo;

import com.foodbridge.domain.AuditLog;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDateTime;
import java.util.List;

public interface AuditLogRepository extends JpaRepository<AuditLog, Long> {

    List<AuditLog> findAllByOrderByTimestampDesc();

    List<AuditLog> findTop100ByOrderByTimestampDesc();

    long countByTimestampAfter(LocalDateTime time);

    List<AuditLog> findTop6ByOrderByTimestampDesc();
}
