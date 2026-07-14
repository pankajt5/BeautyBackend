package com.beauty.simulator.repository;

import com.beauty.simulator.model.ShopScenario;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface ShopScenarioRepository extends JpaRepository<ShopScenario, Long> {
    Optional<ShopScenario> findByActiveDefaultIsTrue();
}
