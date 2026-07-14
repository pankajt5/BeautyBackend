package com.beauty.simulator;

import com.beauty.simulator.model.*;
import com.beauty.simulator.service.SimulationEngine;
import org.junit.jupiter.api.Test;
import java.util.ArrayList;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

public class SimulationEngineTest {

    private final SimulationEngine simEngine = new SimulationEngine();

    @Test
    public void testSimulationRun() {
        // 1. Setup Shop
        ShopScenario shop = new ShopScenario();
        shop.setName("Test Parlour");
        shop.setLocationType("City");
        shop.setWorkingHoursStart("09:00");
        shop.setWorkingHoursEnd("18:00");
        shop.setChairs(2);
        shop.setFacialBeds(1);
        shop.setHairStations(1);
        shop.setMehndiTables(1);
        shop.setWaitingAreaCapacity(5);
        shop.setMonthlyRent(15000);
        shop.setMonthlyElectricity(3000);

        // 2. Setup Staff
        List<Staff> staffList = new ArrayList<>();
        Staff s1 = new Staff();
        s1.setName("Rani");
        s1.setRole("Beautician");
        s1.setSalary(15000);
        s1.setWorkingHoursStart("09:00");
        s1.setWorkingHoursEnd("18:00");
        s1.setBreakHoursStart("13:00");
        s1.setBreakHoursEnd("14:00");
        s1.setSpeedMultiplier(1.0);
        s1.setCanDoThreading(true);
        s1.setCanDoFacial(true);
        staffList.add(s1);

        // 3. Setup Services
        List<com.beauty.simulator.model.Service> serviceList = new ArrayList<>();
        com.beauty.simulator.model.Service threading = new com.beauty.simulator.model.Service();
        threading.setName("Eyebrow Threading");
        threading.setCategory("Threading");
        threading.setDuration(10);
        threading.setMinDuration(8);
        threading.setMaxDuration(12);
        threading.setSellingPrice(50);
        threading.setRequiredEquipment("Chair");
        threading.setRequiredSkill("Threading");
        threading.setProductConsumptionJson("{\"Threading Thread\":0.02}");
        threading.setMembershipEligible(true);
        serviceList.add(threading);

        // 4. Setup Products
        List<Product> productList = new ArrayList<>();
        Product thread = new Product();
        thread.setName("Threading Thread");
        thread.setPurchaseCost(100);
        thread.setQuantity(5.0);
        thread.setUnitType("Threads");
        thread.setCapacityPerUnit(50.0);
        productList.add(thread);

        // 5. Setup Membership Plans
        List<MembershipPlan> planList = new ArrayList<>();
        MembershipPlan gold = new MembershipPlan();
        gold.setName("Gold");
        gold.setPrice(499);
        gold.setRulesJson("{\"Eyebrow Threading\":{\"type\":\"UNLIMITED\"}}");
        planList.add(gold);

        // 6. Setup Customer configuration
        CustomerConfig customerConfig = new CustomerConfig();
        customerConfig.setName("Test Profile");
        customerConfig.setTotalMembers(100);
        customerConfig.setNonMembersDaily(10);
        customerConfig.setArrivalPattern("UNIFORM");
        customerConfig.setServicePreferenceJson("{\"Threading\":100.0}");
        customerConfig.setHeavyUserPct(20.0);
        customerConfig.setNormalUserPct(60.0);
        customerConfig.setLowUserPct(20.0);

        // Execute simulation
        SimulationEngine.SimulationResult result = simEngine.runSimulation(
                shop, staffList, serviceList, productList, planList, customerConfig, 7, false
        );

        // Assertions
        assertNotNull(result);
        assertTrue(result.totalCustomersServed >= 0, "Should complete simulation days");
        assertTrue(result.totalRevenue >= 0, "Revenue should be positive or zero");
        assertTrue(result.totalExpenses > 0, "Expenses should include rent, salaries, power");
        assertNotNull(result.staffUtilization);
        assertTrue(result.staffUtilization.containsKey("Rani"));
        assertNotNull(result.equipmentUtilization);
    }
}
