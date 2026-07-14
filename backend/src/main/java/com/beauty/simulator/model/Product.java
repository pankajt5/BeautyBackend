package com.beauty.simulator.model;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;

@Entity
public class Product {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    private String name;
    private double purchaseCost;
    private double quantity; // in units (e.g. 5.0 kits, 10.0 bottles)
    private String unitType; // "Kits", "Bottles", "Threads", "ml", "grams"
    private double capacityPerUnit; // Number of customers it can serve per 1.0 unit (e.g. 20 customers for a kit)

    public Product() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public double getPurchaseCost() { return purchaseCost; }
    public void setPurchaseCost(double purchaseCost) { this.purchaseCost = purchaseCost; }

    public double getQuantity() { return quantity; }
    public void setQuantity(double quantity) { this.quantity = quantity; }

    public String getUnitType() { return unitType; }
    public void setUnitType(String unitType) { this.unitType = unitType; }

    public double getCapacityPerUnit() { return capacityPerUnit; }
    public void setCapacityPerUnit(double capacityPerUnit) { this.capacityPerUnit = capacityPerUnit; }
}
