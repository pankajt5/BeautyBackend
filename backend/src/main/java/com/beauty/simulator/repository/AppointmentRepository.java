package com.beauty.simulator.repository;

import com.beauty.simulator.model.Appointment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface AppointmentRepository extends JpaRepository<Appointment, Long> {
    List<Appointment> findByPhoneOrderByCreatedDateDesc(String phone);
}
