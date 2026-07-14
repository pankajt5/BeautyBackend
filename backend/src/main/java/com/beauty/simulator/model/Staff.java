package com.beauty.simulator.model;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;

@Entity
public class Staff {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    private String name;
    private String role; // "Beautician", "Hair Stylist", etc.
    private double salary; // Monthly salary
    private String workingHoursStart; // "09:00"
    private String workingHoursEnd; // "18:00"
    private String breakHoursStart; // "13:00"
    private String breakHoursEnd; // "14:00"
    private String skillLevel; // "Junior", "Senior", "Expert"
    private double speedMultiplier; // 1.0 is default. 1.2 is 20% faster, 0.8 is 20% slower.

    // Skills represented as booleans for simplicity
    private boolean canDoThreading;
    private boolean canDoFacial;
    private boolean canDoHair;
    private boolean canDoMakeup;
    private boolean canDoMehndi;
    private boolean canDoNails;

    private Boolean enabled = true;

    public Staff() {
        this.enabled = true;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getRole() { return role; }
    public void setRole(String role) { this.role = role; }

    public double getSalary() { return salary; }
    public void setSalary(double salary) { this.salary = salary; }

    public String getWorkingHoursStart() { return workingHoursStart; }
    public void setWorkingHoursStart(String workingHoursStart) { this.workingHoursStart = workingHoursStart; }

    public String getWorkingHoursEnd() { return workingHoursEnd; }
    public void setWorkingHoursEnd(String workingHoursEnd) { this.workingHoursEnd = workingHoursEnd; }

    public String getBreakHoursStart() { return breakHoursStart; }
    public void setBreakHoursStart(String breakHoursStart) { this.breakHoursStart = breakHoursStart; }

    public String getBreakHoursEnd() { return breakHoursEnd; }
    public void setBreakHoursEnd(String breakHoursEnd) { this.breakHoursEnd = breakHoursEnd; }

    public String getSkillLevel() { return skillLevel; }
    public void setSkillLevel(String skillLevel) { this.skillLevel = skillLevel; }

    public double getSpeedMultiplier() { return speedMultiplier; }
    public void setSpeedMultiplier(double speedMultiplier) { this.speedMultiplier = speedMultiplier; }

    public boolean isCanDoThreading() { return canDoThreading; }
    public void setCanDoThreading(boolean canDoThreading) { this.canDoThreading = canDoThreading; }

    public boolean isCanDoFacial() { return canDoFacial; }
    public void setCanDoFacial(boolean canDoFacial) { this.canDoFacial = canDoFacial; }

    public boolean isCanDoHair() { return canDoHair; }
    public void setCanDoHair(boolean canDoHair) { this.canDoHair = canDoHair; }

    public boolean isCanDoMakeup() { return canDoMakeup; }
    public void setCanDoMakeup(boolean canDoMakeup) { this.canDoMakeup = canDoMakeup; }

    public boolean isCanDoMehndi() { return canDoMehndi; }
    public void setCanDoMehndi(boolean canDoMehndi) { this.canDoMehndi = canDoMehndi; }

    public boolean isCanDoNails() { return canDoNails; }
    public void setCanDoNails(boolean canDoNails) { this.canDoNails = canDoNails; }

    public Boolean getEnabled() { return enabled; }
    public void setEnabled(Boolean enabled) { this.enabled = enabled; }
}
