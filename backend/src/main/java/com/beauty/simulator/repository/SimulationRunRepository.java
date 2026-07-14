package com.beauty.simulator.repository;

import com.beauty.simulator.model.SimulationRun;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SimulationRunRepository extends JpaRepository<SimulationRun, Long> {
}
