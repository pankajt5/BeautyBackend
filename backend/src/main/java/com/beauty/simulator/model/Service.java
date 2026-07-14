package com.beauty.simulator.model;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Lob;

@Entity
public class Service {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    private String name;
    private String category; // "Threading", "Facial", "Hair", "Makeup", "Mehndi", "Nails"
    private int duration; // in minutes
    private int minDuration;
    private int maxDuration;
    
    @Lob
    private String productConsumptionJson; // e.g. {"Facial Kit": 0.05, "Threading Thread": 1.0}
    
    private String requiredSkill; // "Threading", "Facial", "Hair", "Makeup", "Mehndi", "Nails"
    private String requiredEquipment; // "Chair", "Facial Bed", "Hair Station", "Mehndi Table", "None"
    private double sellingPrice;
    private boolean membershipEligible;

    private Boolean enabled = true;

    public Service() {
        this.enabled = true;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getCategory() { return category; }
    public void setCategory(String category) { this.category = category; }

    public int getDuration() { return duration; }
    public void setDuration(int duration) { this.duration = duration; }

    public int getMinDuration() { return minDuration; }
    public void setMinDuration(int minDuration) { this.minDuration = minDuration; }

    public int getMaxDuration() { return maxDuration; }
    public void setMaxDuration(int maxDuration) { this.maxDuration = maxDuration; }

    public String getProductConsumptionJson() { return productConsumptionJson; }
    public void setProductConsumptionJson(String productConsumptionJson) { this.productConsumptionJson = productConsumptionJson; }

    public String getRequiredSkill() { return requiredSkill; }
    public void setRequiredSkill(String requiredSkill) { this.requiredSkill = requiredSkill; }

    public String getRequiredEquipment() { return requiredEquipment; }
    public void setRequiredEquipment(String requiredEquipment) { this.requiredEquipment = requiredEquipment; }

    public double getSellingPrice() { return sellingPrice; }
    public void setSellingPrice(double sellingPrice) { this.sellingPrice = sellingPrice; }

    public boolean isMembershipEligible() { return membershipEligible; }
    public void setMembershipEligible(boolean membershipEligible) { this.membershipEligible = membershipEligible; }

    public Boolean getEnabled() { return enabled; }
    public void setEnabled(Boolean enabled) { this.enabled = enabled; }
}
