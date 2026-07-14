package com.beauty.simulator.controller;

import com.beauty.simulator.model.*;
import com.beauty.simulator.repository.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/api")
public class ConfigController {

    @Autowired private ShopScenarioRepository shopRepo;
    @Autowired private StaffRepository staffRepo;
    @Autowired private ServiceRepository serviceRepo;
    @Autowired private ProductRepository productRepo;
    @Autowired private MembershipPlanRepository planRepo;
    @Autowired private CustomerConfigRepository customerRepo;

    @EventListener(ApplicationReadyEvent.class)
    public void seedDatabase() {
        // Backfill existing records to enabled = true if they were seeded in a previous session
        staffRepo.findAll().forEach(s -> {
            if (s.getEnabled() == null) {
                s.setEnabled(true);
                staffRepo.save(s);
            }
        });
        serviceRepo.findAll().forEach(s -> {
            if (s.getEnabled() == null) {
                s.setEnabled(true);
                serviceRepo.save(s);
            }
        });

        if (serviceRepo.count() >= 37 && serviceRepo.findAll().stream().anyMatch(s -> s.getName().equals("Nail Polish"))) return; // DB already seeded with new catalog

        // Clear existing old configuration records to prevent duplicates and ensure a clean upgrade
        planRepo.deleteAll();
        serviceRepo.deleteAll();
        productRepo.deleteAll();
        staffRepo.deleteAll();
        shopRepo.deleteAll();
        customerRepo.deleteAll();

        // 1. Seed Shop Scenarios
        ShopScenario villageShop = new ShopScenario();
        villageShop.setName("Small Village Shop");
        villageShop.setLocationType("Village");
        villageShop.setWorkingHoursStart("09:00");
        villageShop.setWorkingHoursEnd("19:00");
        villageShop.setWorkingDays("Monday,Tuesday,Wednesday,Thursday,Friday,Saturday");
        villageShop.setHolidays("");
        villageShop.setChairs(2);
        villageShop.setFacialBeds(1);
        villageShop.setHairStations(1);
        villageShop.setMehndiTables(0);
        villageShop.setWaitingAreaCapacity(4);
        villageShop.setMonthlyRent(5000);
        villageShop.setMonthlyElectricity(1200);
        villageShop.setActiveDefault(false);
        shopRepo.save(villageShop);

        ShopScenario cityShop = new ShopScenario();
        cityShop.setName("Premium City Shop");
        cityShop.setLocationType("City");
        cityShop.setWorkingHoursStart("09:00");
        cityShop.setWorkingHoursEnd("21:00");
        cityShop.setWorkingDays("Monday,Tuesday,Wednesday,Thursday,Friday,Saturday,Sunday");
        cityShop.setHolidays("2026-08-15,2026-10-02");
        cityShop.setChairs(4);
        cityShop.setFacialBeds(2);
        cityShop.setHairStations(2);
        cityShop.setMehndiTables(1);
        cityShop.setWaitingAreaCapacity(10);
        cityShop.setMonthlyRent(28000);
        cityShop.setMonthlyElectricity(7500);
        cityShop.setActiveDefault(true);
        shopRepo.save(cityShop);

        // 2. Seed Staff
        String[][] staffData = {
                {"Rani", "Beautician", "12000", "09:00", "18:00", "13:00", "14:00", "Senior", "1.0", "true", "true", "false", "false", "false", "true"},
                {"Priya", "Expert Beautician", "18000", "10:00", "20:00", "14:00", "15:00", "Expert", "1.35", "true", "true", "false", "true", "false", "true"},
                {"Rohan", "Hair Stylist", "15000", "09:00", "21:00", "13:00", "14:00", "Senior", "1.15", "false", "false", "true", "false", "false", "false"},
                {"Neha", "Mehndi Artist", "10000", "09:00", "18:00", "12:00", "13:00", "Junior", "1.0", "false", "false", "false", "false", "true", "false"}
        };

        for (String[] s : staffData) {
            Staff st = new Staff();
            st.setName(s[0]);
            st.setRole(s[1]);
            st.setSalary(Double.parseDouble(s[2]));
            st.setWorkingHoursStart(s[3]);
            st.setWorkingHoursEnd(s[4]);
            st.setBreakHoursStart(s[5]);
            st.setBreakHoursEnd(s[6]);
            st.setSkillLevel(s[7]);
            st.setSpeedMultiplier(Double.parseDouble(s[8]));
            st.setCanDoThreading(Boolean.parseBoolean(s[9]));
            st.setCanDoFacial(Boolean.parseBoolean(s[10]));
            st.setCanDoHair(Boolean.parseBoolean(s[11]));
            st.setCanDoMakeup(Boolean.parseBoolean(s[12]));
            st.setCanDoMehndi(Boolean.parseBoolean(s[13]));
            st.setCanDoNails(Boolean.parseBoolean(s[14]));
            staffRepo.save(st);
        }

        // 3. Seed Products
        String[][] prodData = {
                {"Threading Thread", "120", "15", "Threads", "50"},
                {"Facial Kit", "1500", "10", "Kits", "20"},
                {"Makeup Kit", "9000", "3", "Kits", "10"},
                {"Shampoo", "600", "12", "Bottles", "30"},
                {"Mehndi Cone", "15", "100", "Cones", "1"},
                {"Waxing Gel", "500", "20", "Tubes", "15"},
                {"Nail Polish Kit", "800", "15", "Kits", "50"},
                {"Mani-Pedi Kit", "1200", "15", "Kits", "25"}
        };
        for (String[] p : prodData) {
            Product pr = new Product();
            pr.setName(p[0]);
            pr.setPurchaseCost(Double.parseDouble(p[1]));
            pr.setQuantity(Double.parseDouble(p[2]));
            pr.setUnitType(p[3]);
            pr.setCapacityPerUnit(Double.parseDouble(p[4]));
            productRepo.save(pr);
        }

        // 4. Seed Services
        String[][] servicesData = {
            // Hair Services
            {"Hair Wash", "Hair", "20", "15", "20", "150", "Hair Station", "Hair", "{\"Shampoo\":0.05}", "true"},
            {"Hair Blow Dry", "Hair", "25", "20", "30", "250", "Hair Station", "Hair", "{\"Shampoo\":0.01}", "true"},
            {"Hair Styling", "Hair", "45", "30", "60", "450", "Hair Station", "Hair", "{\"Shampoo\":0.01}", "true"},
            {"Hair Cut", "Hair", "35", "30", "45", "400", "Hair Station", "Hair", "{\"Shampoo\":0.02}", "true"},
            {"Hair Spa", "Hair", "65", "45", "90", "800", "Hair Station", "Hair", "{\"Shampoo\":0.05}", "true"},
            {"Hair Colouring", "Hair", "120", "60", "180", "1500", "Hair Station", "Hair", "{\"Shampoo\":0.05}", "true"},
            {"Hair Highlights", "Hair", "180", "120", "240", "2500", "Hair Station", "Hair", "{\"Shampoo\":0.05}", "true"},
            {"Hair Smoothening", "Hair", "270", "180", "360", "4000", "Hair Station", "Hair", "{\"Shampoo\":0.1}", "true"},
            {"Hair Straightening", "Hair", "270", "180", "360", "4500", "Hair Station", "Hair", "{\"Shampoo\":0.1}", "true"},

            // Face & Skin Services
            {"Eyebrow Threading", "Threading", "8", "5", "10", "50", "Chair", "Threading", "{\"Threading Thread\":0.02}", "true"},
            {"Upper Lip Threading", "Threading", "5", "5", "5", "30", "Chair", "Threading", "{\"Threading Thread\":0.01}", "true"},
            {"Full Face Threading", "Threading", "20", "15", "30", "150", "Chair", "Threading", "{\"Threading Thread\":0.05}", "true"},
            {"Face Clean-up", "Facial", "35", "30", "45", "350", "Facial Bed", "Facial", "{\"Facial Kit\":0.03}", "true"},
            {"Basic Facial", "Facial", "50", "45", "60", "500", "Facial Bed", "Facial", "{\"Facial Kit\":0.05}", "true"},
            {"Fruit Facial", "Facial", "60", "60", "60", "600", "Facial Bed", "Facial", "{\"Facial Kit\":0.05}", "true"},
            {"Gold Facial", "Facial", "75", "60", "90", "900", "Facial Bed", "Facial", "{\"Facial Kit\":0.05}", "true"},
            {"Premium Facial", "Facial", "90", "90", "90", "1500", "Facial Bed", "Facial", "{\"Facial Kit\":0.08}", "true"},
            {"Face Bleach", "Facial", "25", "20", "30", "300", "Facial Bed", "Facial", "{\"Facial Kit\":0.02}", "true"},
            {"Skin Polishing", "Facial", "75", "60", "90", "1800", "Facial Bed", "Facial", "{\"Facial Kit\":0.08}", "true"},

            // Waxing Services
            {"Underarm Waxing", "Facial", "15", "15", "15", "100", "Facial Bed", "Facial", "{\"Waxing Gel\":0.1}", "true"},
            {"Half Arms Waxing", "Facial", "25", "20", "30", "250", "Facial Bed", "Facial", "{\"Waxing Gel\":0.2}", "true"},
            {"Full Arms Waxing", "Facial", "35", "30", "45", "400", "Facial Bed", "Facial", "{\"Waxing Gel\":0.3}", "true"},
            {"Half Legs Waxing", "Facial", "35", "30", "45", "300", "Facial Bed", "Facial", "{\"Waxing Gel\":0.3}", "true"},
            {"Full Legs Waxing", "Facial", "50", "45", "60", "500", "Facial Bed", "Facial", "{\"Waxing Gel\":0.5}", "true"},
            {"Full Body Waxing", "Facial", "120", "90", "150", "1500", "Facial Bed", "Facial", "{\"Waxing Gel\":1.2}", "true"},

            // Hand & Foot Care
            {"Nail Polish", "Nails", "15", "15", "15", "100", "Chair", "Nails", "{\"Nail Polish Kit\":0.02}", "true"},
            {"Nail Art", "Nails", "45", "30", "60", "300", "Chair", "Nails", "{\"Nail Polish Kit\":0.05}", "true"},
            {"Manicure", "Nails", "50", "45", "60", "400", "Chair", "Nails", "{\"Mani-Pedi Kit\":0.04}", "true"},
            {"Pedicure", "Nails", "75", "60", "90", "550", "Chair", "Nails", "{\"Mani-Pedi Kit\":0.04}", "true"},
            {"Spa Manicure", "Nails", "75", "60", "90", "700", "Chair", "Nails", "{\"Mani-Pedi Kit\":0.06}", "true"},
            {"Spa Pedicure", "Nails", "90", "90", "90", "900", "Chair", "Nails", "{\"Mani-Pedi Kit\":0.08}", "true"},

            // Mehndi Services
            {"Simple Mehndi", "Mehndi", "20", "15", "30", "150", "Mehndi Table", "Mehndi", "{\"Mehndi Cone\":1.0}", "true"},
            {"Arabic Mehndi", "Mehndi", "45", "30", "60", "300", "Mehndi Table", "Mehndi", "{\"Mehndi Cone\":1.5}", "true"},
            {"Full Hand Mehndi", "Mehndi", "90", "60", "120", "700", "Mehndi Table", "Mehndi", "{\"Mehndi Cone\":2.5}", "true"},
            {"Festival Mehndi", "Mehndi", "20", "15", "30", "200", "Mehndi Table", "Mehndi", "{\"Mehndi Cone\":1.0}", "true"},
            {"Bridal Mehndi", "Mehndi", "420", "240", "600", "3500", "Mehndi Table", "Mehndi", "{\"Mehndi Cone\":6.0}", "false"},

            // Makeup Services
            {"Basic Makeup", "Makeup", "50", "45", "60", "1000", "Chair", "Makeup", "{\"Makeup Kit\":0.05}", "true"},
            {"Party Makeup", "Makeup", "90", "60", "120", "2500", "Chair", "Makeup", "{\"Makeup Kit\":0.1}", "true"},
            {"Engagement Makeup", "Makeup", "150", "120", "180", "5000", "Chair", "Makeup", "{\"Makeup Kit\":0.2}", "false"},
            {"Bridal Makeup", "Makeup", "240", "180", "300", "10000", "Chair", "Makeup", "{\"Makeup Kit\":0.3}", "false"},
            {"Hairstyle with Makeup", "Makeup", "45", "30", "60", "1500", "Chair", "Makeup", "{\"Shampoo\":0.02,\"Makeup Kit\":0.02}", "true"},

            // Bridal Packages
            {"Bridal Makeup Trial", "Makeup", "90", "60", "120", "2000", "Chair", "Makeup", "{\"Makeup Kit\":0.05}", "false"},
            {"Pre-Bridal Package", "Makeup", "180", "120", "240", "8000", "Chair", "Makeup", "{\"Facial Kit\":0.2,\"Makeup Kit\":0.1}", "false"},
            {"Bridal Wedding Package", "Makeup", "300", "240", "360", "15000", "Chair", "Makeup", "{\"Makeup Kit\":0.4}", "false"}
        };

        for (String[] s : servicesData) {
            com.beauty.simulator.model.Service srv = new com.beauty.simulator.model.Service();
            srv.setName(s[0]);
            srv.setCategory(s[1]);
            srv.setDuration(Integer.parseInt(s[2]));
            srv.setMinDuration(Integer.parseInt(s[3]));
            srv.setMaxDuration(Integer.parseInt(s[4]));
            srv.setSellingPrice(Double.parseDouble(s[5]));
            srv.setRequiredEquipment(s[6]);
            srv.setRequiredSkill(s[7]);
            srv.setProductConsumptionJson(s[8]);
            srv.setMembershipEligible(Boolean.parseBoolean(s[9]));
            serviceRepo.save(srv);
        }

        // 5. Seed Membership Plans
        MembershipPlan goldPlan = new MembershipPlan();
        goldPlan.setName("Beauty Gold");
        goldPlan.setPrice(499);
        goldPlan.setRulesJson("{\"Eyebrow Threading\":{\"type\":\"UNLIMITED\"},\"Hair Cut\":{\"type\":\"MONTHLY_LIMIT\",\"limit\":2},\"Gold Facial\":{\"type\":\"MONTHLY_LIMIT\",\"limit\":1}}");
        planRepo.save(goldPlan);

        // 6. Seed Customer configurations
        CustomerConfig cConfig = new CustomerConfig();
        cConfig.setName("Standard City Customer Profile");
        cConfig.setTotalMembers(300);
        cConfig.setNonMembersDaily(12);
        cConfig.setArrivalPattern("PEAK_HOURS");
        cConfig.setPeakHoursJson("{\"11:00-13:00\":1.5,\"17:00-20:00\":2.2}");
        cConfig.setServicePreferenceJson("{\"Threading\":40.0,\"Facial\":20.0,\"Hair\":20.0,\"Mehndi\":10.0,\"Nails\":10.0}");
        cConfig.setHeavyUserPct(20.0);
        cConfig.setNormalUserPct(60.0);
        cConfig.setLowUserPct(20.0);
        cConfig.setActiveDefault(true);
        customerRepo.save(cConfig);
    }

    // --- ShopScenario CRUD ---
    @GetMapping("/shops")
    public List<ShopScenario> getShops() { return shopRepo.findAll(); }

    @PostMapping("/shops")
    public ShopScenario createShop(@RequestBody ShopScenario s) { return shopRepo.save(s); }

    @PutMapping("/shops/{id}")
    public ResponseEntity<ShopScenario> updateShop(@PathVariable Long id, @RequestBody ShopScenario details) {
        return shopRepo.findById(id).map(s -> {
            s.setName(details.getName());
            s.setLocationType(details.getLocationType());
            s.setWorkingHoursStart(details.getWorkingHoursStart());
            s.setWorkingHoursEnd(details.getWorkingHoursEnd());
            s.setWorkingDays(details.getWorkingDays());
            s.setHolidays(details.getHolidays());
            s.setChairs(details.getChairs());
            s.setFacialBeds(details.getFacialBeds());
            s.setHairStations(details.getHairStations());
            s.setMehndiTables(details.getMehndiTables());
            s.setWaitingAreaCapacity(details.getWaitingAreaCapacity());
            s.setMonthlyRent(details.getMonthlyRent());
            s.setMonthlyElectricity(details.getMonthlyElectricity());
            s.setActiveDefault(details.isActiveDefault());
            return ResponseEntity.ok(shopRepo.save(s));
        }).orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/shops/{id}")
    public ResponseEntity<Void> deleteShop(@PathVariable Long id) {
        if (shopRepo.existsById(id)) {
            shopRepo.deleteById(id);
            return ResponseEntity.ok().build();
        }
        return ResponseEntity.notFound().build();
    }

    @PostMapping("/shops/{id}/default")
    public ResponseEntity<Void> setDefaultShop(@PathVariable Long id) {
        List<ShopScenario> shops = shopRepo.findAll();
        for (ShopScenario s : shops) {
            s.setActiveDefault(s.getId().equals(id));
            shopRepo.save(s);
        }
        return ResponseEntity.ok().build();
    }

    // --- Staff CRUD ---
    @GetMapping("/staff")
    public List<Staff> getStaff() { return staffRepo.findAll(); }

    @PostMapping("/staff")
    public Staff createStaff(@RequestBody Staff s) { return staffRepo.save(s); }

    @PutMapping("/staff/{id}")
    public ResponseEntity<Staff> updateStaff(@PathVariable Long id, @RequestBody Staff details) {
        return staffRepo.findById(id).map(s -> {
            s.setName(details.getName());
            s.setRole(details.getRole());
            s.setSalary(details.getSalary());
            s.setWorkingHoursStart(details.getWorkingHoursStart());
            s.setWorkingHoursEnd(details.getWorkingHoursEnd());
            s.setBreakHoursStart(details.getBreakHoursStart());
            s.setBreakHoursEnd(details.getBreakHoursEnd());
            s.setSkillLevel(details.getSkillLevel());
            s.setSpeedMultiplier(details.getSpeedMultiplier());
            s.setCanDoThreading(details.isCanDoThreading());
            s.setCanDoFacial(details.isCanDoFacial());
            s.setCanDoHair(details.isCanDoHair());
            s.setCanDoMakeup(details.isCanDoMakeup());
            s.setCanDoMehndi(details.isCanDoMehndi());
            s.setCanDoNails(details.isCanDoNails());
            s.setEnabled(details.getEnabled());
            return ResponseEntity.ok(staffRepo.save(s));
        }).orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/staff/{id}")
    public ResponseEntity<Void> deleteStaff(@PathVariable Long id) {
        if (staffRepo.existsById(id)) {
            staffRepo.deleteById(id);
            return ResponseEntity.ok().build();
        }
        return ResponseEntity.notFound().build();
    }

    // --- Services CRUD ---
    @GetMapping("/services")
    public List<com.beauty.simulator.model.Service> getServices() { return serviceRepo.findAll(); }

    @PostMapping("/services")
    public com.beauty.simulator.model.Service createService(@RequestBody com.beauty.simulator.model.Service s) { return serviceRepo.save(s); }

    @PutMapping("/services/{id}")
    public ResponseEntity<com.beauty.simulator.model.Service> updateService(@PathVariable Long id, @RequestBody com.beauty.simulator.model.Service details) {
        return serviceRepo.findById(id).map(s -> {
            s.setName(details.getName());
            s.setCategory(details.getCategory());
            s.setDuration(details.getDuration());
            s.setMinDuration(details.getMinDuration());
            s.setMaxDuration(details.getMaxDuration());
            s.setSellingPrice(details.getSellingPrice());
            s.setRequiredEquipment(details.getRequiredEquipment());
            s.setRequiredSkill(details.getRequiredSkill());
            s.setProductConsumptionJson(details.getProductConsumptionJson());
            s.setMembershipEligible(details.isMembershipEligible());
            s.setEnabled(details.getEnabled());
            return ResponseEntity.ok(serviceRepo.save(s));
        }).orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/services/{id}")
    public ResponseEntity<Void> deleteService(@PathVariable Long id) {
        if (serviceRepo.existsById(id)) {
            serviceRepo.deleteById(id);
            return ResponseEntity.ok().build();
        }
        return ResponseEntity.notFound().build();
    }

    // --- Products CRUD ---
    @GetMapping("/products")
    public List<Product> getProducts() { return productRepo.findAll(); }

    @PostMapping("/products")
    public Product createProduct(@RequestBody Product p) { return productRepo.save(p); }

    @PutMapping("/products/{id}")
    public ResponseEntity<Product> updateProduct(@PathVariable Long id, @RequestBody Product details) {
        return productRepo.findById(id).map(p -> {
            p.setName(details.getName());
            p.setPurchaseCost(details.getPurchaseCost());
            p.setQuantity(details.getQuantity());
            p.setUnitType(details.getUnitType());
            p.setCapacityPerUnit(details.getCapacityPerUnit());
            return ResponseEntity.ok(productRepo.save(p));
        }).orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/products/{id}")
    public ResponseEntity<Void> deleteProduct(@PathVariable Long id) {
        if (productRepo.existsById(id)) {
            productRepo.deleteById(id);
            return ResponseEntity.ok().build();
        }
        return ResponseEntity.notFound().build();
    }

    // --- MembershipPlans CRUD ---
    @GetMapping("/plans")
    public List<MembershipPlan> getPlans() { return planRepo.findAll(); }

    @PostMapping("/plans")
    public MembershipPlan createPlan(@RequestBody MembershipPlan p) { return planRepo.save(p); }

    @PutMapping("/plans/{id}")
    public ResponseEntity<MembershipPlan> updatePlan(@PathVariable Long id, @RequestBody MembershipPlan details) {
        return planRepo.findById(id).map(p -> {
            p.setName(details.getName());
            p.setPrice(details.getPrice());
            p.setRulesJson(details.getRulesJson());
            return ResponseEntity.ok(planRepo.save(p));
        }).orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/plans/{id}")
    public ResponseEntity<Void> deletePlan(@PathVariable Long id) {
        if (planRepo.existsById(id)) {
            planRepo.deleteById(id);
            return ResponseEntity.ok().build();
        }
        return ResponseEntity.notFound().build();
    }

    // --- CustomerConfigs CRUD ---
    @GetMapping("/customer-configs")
    public List<CustomerConfig> getCustomerConfigs() { return customerRepo.findAll(); }

    @PostMapping("/customer-configs")
    public CustomerConfig saveCustomerConfig(@RequestBody CustomerConfig c) { return customerRepo.save(c); }

    @PutMapping("/customer-configs/{id}")
    public ResponseEntity<CustomerConfig> updateCustomerConfig(@PathVariable Long id, @RequestBody CustomerConfig details) {
        return customerRepo.findById(id).map(c -> {
            c.setName(details.getName());
            c.setTotalMembers(details.getTotalMembers());
            c.setNonMembersDaily(details.getNonMembersDaily());
            c.setArrivalPattern(details.getArrivalPattern());
            c.setPeakHoursJson(details.getPeakHoursJson());
            c.setServicePreferenceJson(details.getServicePreferenceJson());
            c.setHeavyUserPct(details.getHeavyUserPct());
            c.setNormalUserPct(details.getNormalUserPct());
            c.setLowUserPct(details.getLowUserPct());
            c.setActiveDefault(details.isActiveDefault());
            return ResponseEntity.ok(customerRepo.save(c));
        }).orElse(ResponseEntity.notFound().build());
    }

    @PostMapping("/customer-configs/{id}/default")
    public ResponseEntity<Void> setDefaultCustomerConfig(@PathVariable Long id) {
        List<CustomerConfig> configs = customerRepo.findAll();
        for (CustomerConfig c : configs) {
            c.setActiveDefault(c.getId().equals(id));
            customerRepo.save(c);
        }
        return ResponseEntity.ok().build();
    }
}
