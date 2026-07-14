package com.beauty.simulator.controller;

import com.beauty.simulator.model.*;
import com.beauty.simulator.repository.*;
import com.beauty.simulator.service.SimulationEngine;
import com.beauty.simulator.service.RecommendationService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/simulation")
public class SimulationController {

    @Autowired private ShopScenarioRepository shopRepo;
    @Autowired private StaffRepository staffRepo;
    @Autowired private ServiceRepository serviceRepo;
    @Autowired private ProductRepository productRepo;
    @Autowired private MembershipPlanRepository planRepo;
    @Autowired private CustomerConfigRepository customerRepo;
    @Autowired private SimulationRunRepository runRepo;

    @Autowired private SimulationEngine simEngine;
    @Autowired private RecommendationService recommendationService;

    private final ObjectMapper objectMapper = new ObjectMapper();

    // Helper to retrieve configurations for simulation
    private Map<String, Object> loadCurrentConfig(Long shopId, Long customerConfigId) {
        Map<String, Object> config = new HashMap<>();
        
        ShopScenario shop = (shopId != null) ? 
                shopRepo.findById(shopId).orElseThrow(() -> new IllegalArgumentException("Shop scenario not found")) :
                shopRepo.findByActiveDefaultIsTrue().orElseGet(() -> shopRepo.findAll().stream().findFirst().orElse(null));

        CustomerConfig customer = (customerConfigId != null) ?
                customerRepo.findById(customerConfigId).orElseThrow(() -> new IllegalArgumentException("Customer config not found")) :
                customerRepo.findByActiveDefaultIsTrue().orElseGet(() -> customerRepo.findAll().stream().findFirst().orElse(null));

        List<Staff> staff = staffRepo.findAll().stream()
                .filter(s -> s.getEnabled() == null || s.getEnabled()).toList();
        List<com.beauty.simulator.model.Service> services = serviceRepo.findAll().stream()
                .filter(s -> s.getEnabled() == null || s.getEnabled()).toList();
        List<Product> products = productRepo.findAll();
        List<MembershipPlan> plans = planRepo.findAll();

        config.put("shop", shop);
        config.put("customer", customer);
        config.put("staff", staff);
        config.put("services", services);
        config.put("products", products);
        config.put("plans", plans);
        
        return config;
    }

    @PostMapping("/run")
    public ResponseEntity<?> run(
            @RequestParam(required = false, defaultValue = "30") int days,
            @RequestParam(required = false) Long shopId,
            @RequestParam(required = false) Long customerConfigId
    ) {
        try {
            Map<String, Object> cfg = loadCurrentConfig(shopId, customerConfigId);
            ShopScenario shop = (ShopScenario) cfg.get("shop");
            CustomerConfig customer = (CustomerConfig) cfg.get("customer");
            List<Staff> staff = (List<Staff>) cfg.get("staff");
            List<com.beauty.simulator.model.Service> services = (List<com.beauty.simulator.model.Service>) cfg.get("services");
            List<Product> products = (List<Product>) cfg.get("products");
            List<MembershipPlan> plans = (List<MembershipPlan>) cfg.get("plans");

            if (shop == null || customer == null) {
                return ResponseEntity.badRequest().body("Shop or Customer configuration is missing.");
            }

            // Generate timeline logs only for a 1-day simulation to keep payload light,
            // otherwise compute just aggregates.
            boolean saveTimeline = (days == 1);
            SimulationEngine.SimulationResult result = simEngine.runSimulation(shop, staff, services, products, plans, customer, days, saveTimeline);

            return ResponseEntity.ok(result);
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body("Error running simulation: " + e.getMessage());
        }
    }

    @GetMapping("/runs")
    public List<SimulationRun> getRuns() {
        return runRepo.findAll();
    }

    @PostMapping("/save")
    public SimulationRun saveRun(@RequestBody SimulationRun run) {
        run.setRunTime(LocalDateTime.now());
        return runRepo.save(run);
    }

    @DeleteMapping("/runs/{id}")
    public ResponseEntity<Void> deleteRun(@PathVariable Long id) {
        if (runRepo.existsById(id)) {
            runRepo.deleteById(id);
            return ResponseEntity.ok().build();
        }
        return ResponseEntity.notFound().build();
    }

    // --- AI Recommendations / Consulting endpoints ---
    
    @GetMapping("/recommendations/staff")
    public ResponseEntity<?> getStaffRecommendation(
            @RequestParam int targetMembers,
            @RequestParam(required = false) Long shopId,
            @RequestParam(required = false) Long customerConfigId
    ) {
        try {
            Map<String, Object> cfg = loadCurrentConfig(shopId, customerConfigId);
            ShopScenario shop = (ShopScenario) cfg.get("shop");
            CustomerConfig customer = (CustomerConfig) cfg.get("customer");
            List<Staff> staff = (List<Staff>) cfg.get("staff");
            List<com.beauty.simulator.model.Service> services = (List<com.beauty.simulator.model.Service>) cfg.get("services");
            List<Product> products = (List<Product>) cfg.get("products");

            List<RecommendationService.StaffRequirement> reqs = recommendationService.recommendStaff(
                    targetMembers, shop, staff, services, products, customer
            );
            return ResponseEntity.ok(reqs);
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(e.getMessage());
        }
    }

    @GetMapping("/recommendations/plans")
    public ResponseEntity<?> getPlansRecommendation(
            @RequestParam(required = false) Long shopId,
            @RequestParam(required = false) Long customerConfigId
    ) {
        try {
            Map<String, Object> cfg = loadCurrentConfig(shopId, customerConfigId);
            ShopScenario shop = (ShopScenario) cfg.get("shop");
            CustomerConfig customer = (CustomerConfig) cfg.get("customer");
            List<Staff> staff = (List<Staff>) cfg.get("staff");
            List<com.beauty.simulator.model.Service> services = (List<com.beauty.simulator.model.Service>) cfg.get("services");
            List<Product> products = (List<Product>) cfg.get("products");
            List<MembershipPlan> plans = (List<MembershipPlan>) cfg.get("plans");

            List<RecommendationService.PlanProfitability> eval = recommendationService.evaluatePlans(
                    shop, staff, services, products, plans, customer
            );
            return ResponseEntity.ok(eval);
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(e.getMessage());
        }
    }

    @GetMapping("/recommendations/bottlenecks")
    public ResponseEntity<?> getBottleneckRecommendation(
            @RequestParam(required = false) Long shopId,
            @RequestParam(required = false) Long customerConfigId
    ) {
        try {
            Map<String, Object> cfg = loadCurrentConfig(shopId, customerConfigId);
            ShopScenario shop = (ShopScenario) cfg.get("shop");
            CustomerConfig customer = (CustomerConfig) cfg.get("customer");
            List<Staff> staff = (List<Staff>) cfg.get("staff");
            List<com.beauty.simulator.model.Service> services = (List<com.beauty.simulator.model.Service>) cfg.get("services");
            List<Product> products = (List<Product>) cfg.get("products");
            List<MembershipPlan> plans = (List<MembershipPlan>) cfg.get("plans");

            // Run a 30-day simulation to extract active metric patterns
            SimulationEngine.SimulationResult simResult = simEngine.runSimulation(shop, staff, services, products, plans, customer, 30, false);
            RecommendationService.BottleneckReport report = recommendationService.analyzeBottlenecks(simResult, shop);
            
            return ResponseEntity.ok(report);
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(e.getMessage());
        }
    }
}
