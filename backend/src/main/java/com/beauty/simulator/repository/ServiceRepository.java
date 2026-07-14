package com.beauty.simulator.repository;

import com.beauty.simulator.model.Service;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ServiceRepository extends JpaRepository<Service, Long> {
}
