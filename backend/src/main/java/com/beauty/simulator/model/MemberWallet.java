package com.beauty.simulator.model;

import jakarta.persistence.*;

@Entity
@Table(name = "member_wallets")
public class MemberWallet {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String phone;

    private double walletBalance;
    private double currentMultiplier;
    private int points;
    private String loyaltyLevel;
    private int streak;

    // Profile Details
    private String birthday;
    private String anniversary;
    private String skinType;
    private String hairType;
    private String allergies;

    public MemberWallet() {}

    public MemberWallet(String phone) {
        this.phone = phone;
        this.walletBalance = 1200.0;
        this.currentMultiplier = 2.0;
        this.points = 150;
        this.loyaltyLevel = "Silver";
        this.streak = 3;
        this.birthday = "12 October";
        this.anniversary = "24 February";
        this.skinType = "Normal";
        this.hairType = "Dry";
        this.allergies = "None";
    }

    // Getters and Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getPhone() { return phone; }
    public void setPhone(String phone) { this.phone = phone; }

    public double getWalletBalance() { return walletBalance; }
    public void setWalletBalance(double walletBalance) { this.walletBalance = walletBalance; }

    public double getCurrentMultiplier() { return currentMultiplier; }
    public void setCurrentMultiplier(double currentMultiplier) { this.currentMultiplier = currentMultiplier; }

    public int getPoints() { return points; }
    public void setPoints(int points) { this.points = points; }

    public String getLoyaltyLevel() { return loyaltyLevel; }
    public void setLoyaltyLevel(String loyaltyLevel) { this.loyaltyLevel = loyaltyLevel; }

    public int getStreak() { return streak; }
    public void setStreak(int streak) { this.streak = streak; }

    public String getBirthday() { return birthday; }
    public void setBirthday(String birthday) { this.birthday = birthday; }

    public String getAnniversary() { return anniversary; }
    public void setAnniversary(String anniversary) { this.anniversary = anniversary; }

    public String getSkinType() { return skinType; }
    public void setSkinType(String skinType) { this.skinType = skinType; }

    public String getHairType() { return hairType; }
    public void setHairType(String hairType) { this.hairType = hairType; }

    public String getAllergies() { return allergies; }
    public void setAllergies(String allergies) { this.allergies = allergies; }
}
