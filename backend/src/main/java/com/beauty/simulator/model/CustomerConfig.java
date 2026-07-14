package com.beauty.simulator.model;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Lob;

@Entity
public class CustomerConfig {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    private String name;
    private int totalMembers;
    private int nonMembersDaily; // Expected daily walk-in count
    private String arrivalPattern; // "UNIFORM" or "PEAK_HOURS"
    
    @Lob
    private String peakHoursJson; // e.g. {"11:00-13:00": 1.5, "17:00-20:00": 2.0}
    
    @Lob
    private String servicePreferenceJson; // e.g. {"Threading": 40.0, "Facial": 20.0, "Hair": 20.0, "Mehndi": 10.0, "Nails": 10.0}
    
    private double heavyUserPct; // e.g. 20.0
    private double normalUserPct; // e.g. 60.0
    private double lowUserPct; // e.g. 20.0
    
    private boolean activeDefault;

    public CustomerConfig() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public int getTotalMembers() { return totalMembers; }
    public void setTotalMembers(int totalMembers) { this.totalMembers = totalMembers; }

    public int getNonMembersDaily() { return nonMembersDaily; }
    public void setNonMembersDaily(int nonMembersDaily) { this.nonMembersDaily = nonMembersDaily; }

    public String getArrivalPattern() { return arrivalPattern; }
    public void setArrivalPattern(String arrivalPattern) { this.arrivalPattern = arrivalPattern; }

    public String getPeakHoursJson() { return peakHoursJson; }
    public void setPeakHoursJson(String peakHoursJson) { this.peakHoursJson = peakHoursJson; }

    public String getServicePreferenceJson() { return servicePreferenceJson; }
    public void setServicePreferenceJson(String servicePreferenceJson) { this.servicePreferenceJson = servicePreferenceJson; }

    public double getHeavyUserPct() { return heavyUserPct; }
    public void setHeavyUserPct(double heavyUserPct) { this.heavyUserPct = heavyUserPct; }

    public double getNormalUserPct() { return normalUserPct; }
    public void setNormalUserPct(double normalUserPct) { this.normalUserPct = normalUserPct; }

    public double getLowUserPct() { return lowUserPct; }
    public void setLowUserPct(double lowUserPct) { this.lowUserPct = lowUserPct; }

    public boolean isActiveDefault() { return activeDefault; }
    public void setActiveDefault(boolean activeDefault) { this.activeDefault = activeDefault; }
}
