package com.beauty.simulator.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "appointments")
public class Appointment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String phone;

    @Column(columnDefinition = "TEXT")
    private String servicesJson; // Serialized list of services booked

    private Long staffId;
    private String staffName;

    private String date; // YYYY-MM-DD
    private String time; // HH:MM AM/PM
    private String familyMember;
    private String status; // booked, completed, cancelled
    
    private LocalDateTime createdDate;

    public Appointment() {}

    public Appointment(String phone, String servicesJson, Long staffId, String staffName, String date, String time, String familyMember) {
        this.phone = phone;
        this.servicesJson = servicesJson;
        this.staffId = staffId;
        this.staffName = staffName;
        this.date = date;
        this.time = time;
        this.familyMember = familyMember;
        this.status = "booked";
        this.createdDate = LocalDateTime.now();
    }

    // Getters and Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getPhone() { return phone; }
    public void setPhone(String phone) { this.phone = phone; }

    public String getServicesJson() { return servicesJson; }
    public void setServicesJson(String servicesJson) { this.servicesJson = servicesJson; }

    public Long getStaffId() { return staffId; }
    public void setStaffId(Long staffId) { this.staffId = staffId; }

    public String getStaffName() { return staffName; }
    public void setStaffName(String staffName) { this.staffName = staffName; }

    public String getDate() { return date; }
    public void setDate(String date) { this.date = date; }

    public String getTime() { return time; }
    public void setTime(String time) { this.time = time; }

    public String getFamilyMember() { return familyMember; }
    public void setFamilyMember(String familyMember) { this.familyMember = familyMember; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public LocalDateTime getCreatedDate() { return createdDate; }
    public void setCreatedDate(LocalDateTime createdDate) { this.createdDate = createdDate; }
}
