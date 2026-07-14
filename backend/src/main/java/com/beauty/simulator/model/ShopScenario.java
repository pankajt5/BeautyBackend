package com.beauty.simulator.model;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;

@Entity
public class ShopScenario {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    private String name;
    private String locationType = "City"; // "Village" or "City"
    private String workingHoursStart = "09:00"; // "09:00"
    private String workingHoursEnd = "21:00"; // "21:00"
    private String workingDays = "Monday,Tuesday,Wednesday,Thursday,Friday,Saturday,Sunday"; // Comma separated
    private String holidays = ""; // Comma separated dates
    
    private int chairs;
    private int facialBeds;
    private int hairStations;
    private int mehndiTables;
    private int waitingAreaCapacity;
    
    private double monthlyRent;
    private double monthlyElectricity;
    private boolean activeDefault;

    public ShopScenario() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getLocationType() { return locationType; }
    public void setLocationType(String locationType) { this.locationType = locationType; }

    public String getWorkingHoursStart() { return workingHoursStart; }
    public void setWorkingHoursStart(String workingHoursStart) { this.workingHoursStart = workingHoursStart; }

    public String getWorkingHoursEnd() { return workingHoursEnd; }
    public void setWorkingHoursEnd(String workingHoursEnd) { this.workingHoursEnd = workingHoursEnd; }

    public String getWorkingDays() { return workingDays; }
    public void setWorkingDays(String workingDays) { this.workingDays = workingDays; }

    public String getHolidays() { return holidays; }
    public void setHolidays(String holidays) { this.holidays = holidays; }

    public int getChairs() { return chairs; }
    public void setChairs(int chairs) { this.chairs = chairs; }

    public int getFacialBeds() { return facialBeds; }
    public void setFacialBeds(int facialBeds) { this.facialBeds = facialBeds; }

    public int getHairStations() { return hairStations; }
    public void setHairStations(int hairStations) { this.hairStations = hairStations; }

    public int getMehndiTables() { return mehndiTables; }
    public void setMehndiTables(int mehndiTables) { this.mehndiTables = mehndiTables; }

    public int getWaitingAreaCapacity() { return waitingAreaCapacity; }
    public void setWaitingAreaCapacity(int waitingAreaCapacity) { this.waitingAreaCapacity = waitingAreaCapacity; }

    public double getMonthlyRent() { return monthlyRent; }
    public void setMonthlyRent(double monthlyRent) { this.monthlyRent = monthlyRent; }

    public double getMonthlyElectricity() { return monthlyElectricity; }
    public void setMonthlyElectricity(double monthlyElectricity) { this.monthlyElectricity = monthlyElectricity; }

    public boolean isActiveDefault() { return activeDefault; }
    public void setActiveDefault(boolean activeDefault) { this.activeDefault = activeDefault; }
}
