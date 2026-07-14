package com.beauty.simulator.repository;

import com.beauty.simulator.model.CustomerConfig;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface CustomerConfigRepository extends JpaRepository<CustomerConfig, Long> {
    Optional<CustomerConfig> findByActiveDefaultIsTrue();
}
