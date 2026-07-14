package com.beauty.simulator.service;

import com.beauty.simulator.model.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Service;

import java.util.*;

@Service
public class RecommendationService {

    private final ObjectMapper objectMapper = new ObjectMapper();

    public static class StaffRequirement {
        public String role;
        public int recommendedCount;
        public String rationale;
    }

    public static class PlanProfitability {
        public String planName;
        public double price;
        public double expectedMonthlyCostPerMember;
        public double netMarginPerMember;
        public String status; // "highly_profitable", "profitable", "loss_making"
        public String advice;
        public int breakEvenMembers;
    }

    public static class BottleneckReport {
        public List<String> primaryBottlenecks = new ArrayList<>();
        public List<String> secondaryBottlenecks = new ArrayList<>();
        public String summaryText;
        public String actionPlan;
    }

    // Recommendation 1: Calculate staff requirements for a target member count
    public List<StaffRequirement> recommendStaff(
            int targetMembers,
            ShopScenario shop,
            List<Staff> currentStaff,
            List<com.beauty.simulator.model.Service> services,
            List<Product> products,
            CustomerConfig config
    ) {
        List<StaffRequirement> recommendations = new ArrayList<>();
        if (services.isEmpty()) return recommendations;

        // Calculate average service duration and frequency
        double heavyPct = config.getHeavyUserPct() / 100.0;
        double normalPct = config.getNormalUserPct() / 100.0;
        double lowPct = config.getLowUserPct() / 100.0;

        // Total visits per month for target members
        // Heavy: 3 visits/month, Normal: 1 visit/month, Low: 0.2 visits/month
        double monthlyVisitsPerHeavy = 3.0;
        double monthlyVisitsPerNormal = 1.0;
        double monthlyVisitsPerLow = 0.2;

        double heavyMembers = targetMembers * heavyPct;
        double normalMembers = targetMembers * normalPct;
        double lowMembers = targetMembers * lowPct;

        double totalMonthlyVisits = (heavyMembers * monthlyVisitsPerHeavy) +
                                    (normalMembers * monthlyVisitsPerNormal) +
                                    (lowMembers * monthlyVisitsPerLow);
        
        double dailyVisits = totalMonthlyVisits / 30.0;
        
        // Add non-member walk-ins
        dailyVisits += config.getNonMembersDaily();

        // Calculate minutes of service required per category per day
        Map<String, Double> categoryMinutesPerDay = new HashMap<>();
        Map<String, Double> categoryFrequency = new HashMap<>();
        try {
            categoryFrequency = objectMapper.readValue(config.getServicePreferenceJson(), Map.class);
        } catch (Exception e) {
            // fallback
            categoryFrequency.put("Threading", 40.0);
            categoryFrequency.put("Facial", 20.0);
            categoryFrequency.put("Hair", 20.0);
            categoryFrequency.put("Mehndi", 10.0);
            categoryFrequency.put("Nails", 10.0);
        }

        // Sum up total weight
        double totalWeight = 0;
        for (double w : categoryFrequency.values()) {
            totalWeight += w;
        }
        if (totalWeight == 0) totalWeight = 100.0;

        // Calculate minutes required per category
        for (com.beauty.simulator.model.Service s : services) {
            double categoryWeight = categoryFrequency.getOrDefault(s.getCategory(), 10.0);
            double categoryProbability = categoryWeight / totalWeight;
            double dailyCategoryVisits = dailyVisits * categoryProbability;
            
            double duration = s.getDuration();
            double minutesNeeded = dailyCategoryVisits * duration;
            
            categoryMinutesPerDay.put(s.getCategory(), categoryMinutesPerDay.getOrDefault(s.getCategory(), 0.0) + minutesNeeded);
        }

        // Available working minutes per staff per day (average 9:00 - 18:00 minus 1 hr break = 8 hours = 480 mins)
        double staffWorkingMinutesPerDay = 480.0;

        // Group categories into roles
        // Beautician: Threading, Facial, Nails, Makeup
        // Hair Stylist: Hair
        // Mehndi Artist: Mehndi
        double beauticianMinsNeeded = categoryMinutesPerDay.getOrDefault("Threading", 0.0) +
                                      categoryMinutesPerDay.getOrDefault("Facial", 0.0) +
                                      categoryMinutesPerDay.getOrDefault("Nails", 0.0) +
                                      categoryMinutesPerDay.getOrDefault("Makeup", 0.0);

        double hairMinsNeeded = categoryMinutesPerDay.getOrDefault("Hair", 0.0);
        double mehndiMinsNeeded = categoryMinutesPerDay.getOrDefault("Mehndi", 0.0);

        // Staff count calculation with 1.3x buffer for peak hours distribution
        double buffer = 1.3;
        int beauticians = (int) Math.ceil((beauticianMinsNeeded / staffWorkingMinutesPerDay) * buffer);
        int hairStylists = (int) Math.ceil((hairMinsNeeded / staffWorkingMinutesPerDay) * buffer);
        int mehndiArtists = (int) Math.ceil((mehndiMinsNeeded / staffWorkingMinutesPerDay) * buffer);

        // Limit lower bounds to at least 1 if there's substantial demand
        if (beauticianMinsNeeded > 30 && beauticians == 0) beauticians = 1;
        if (hairMinsNeeded > 30 && hairStylists == 0) hairStylists = 1;
        if (mehndiMinsNeeded > 30 && mehndiArtists == 0) mehndiArtists = 1;

        // Add Beauticians
        StaffRequirement req1 = new StaffRequirement();
        req1.role = "Beautician (Threading, Facial, Nails, Makeup)";
        req1.recommendedCount = Math.max(1, beauticians);
        req1.rationale = String.format("Based on %.1f daily visits needing threading/facials/nails. Requires %.1f minutes of work daily.", 
                dailyVisits * ((categoryFrequency.getOrDefault("Threading", 0.0) + categoryFrequency.getOrDefault("Facial", 0.0) + categoryFrequency.getOrDefault("Nails", 0.0) + categoryFrequency.getOrDefault("Makeup", 0.0)) / totalWeight), 
                beauticianMinsNeeded);
        recommendations.add(req1);

        // Add Hair Stylist
        StaffRequirement req2 = new StaffRequirement();
        req2.role = "Hair Stylist";
        req2.recommendedCount = Math.max(1, hairStylists);
        req2.rationale = String.format("Based on %.1f daily hair service visits. Requires %.1f minutes of work daily.", 
                dailyVisits * (categoryFrequency.getOrDefault("Hair", 0.0) / totalWeight), 
                hairMinsNeeded);
        recommendations.add(req2);

        // Add Mehndi Artist
        StaffRequirement req3 = new StaffRequirement();
        req3.role = "Mehndi Artist";
        req3.recommendedCount = Math.max(1, mehndiArtists);
        req3.rationale = String.format("Based on %.1f daily mehndi visits. Requires %.1f minutes of work daily.", 
                dailyVisits * (categoryFrequency.getOrDefault("Mehndi", 0.0) / totalWeight), 
                mehndiMinsNeeded);
        recommendations.add(req3);

        return recommendations;
    }

    // Recommendation 2: Evaluate membership plan profitability
    public List<PlanProfitability> evaluatePlans(
            ShopScenario shop,
            List<Staff> staff,
            List<com.beauty.simulator.model.Service> services,
            List<Product> products,
            List<MembershipPlan> plans,
            CustomerConfig config
    ) {
        List<PlanProfitability> reports = new ArrayList<>();
        if (plans.isEmpty()) return reports;

        // Total fixed expenses per month
        double fixedExpensesMonthly = shop.getMonthlyRent() + shop.getMonthlyElectricity();
        for (Staff s : staff) {
            fixedExpensesMonthly += s.getSalary();
        }

        // Product inventory cost lookup
        Map<String, Product> productLookup = new HashMap<>();
        for (Product p : products) {
            productLookup.put(p.getName(), p);
        }

        double heavyPct = config.getHeavyUserPct() / 100.0;
        double normalPct = config.getNormalUserPct() / 100.0;
        double lowPct = config.getLowUserPct() / 100.0;

        // Average service frequency of members:
        // Heavy visits 3 times/month, Normal 1 time/month, Low 0.2 times/month
        // Weighted average monthly visits = 3.0 * heavyPct + 1.0 * normalPct + 0.2 * lowPct
        double avgMonthlyVisits = (3.0 * heavyPct) + (1.0 * normalPct) + (0.2 * lowPct);

        Map<String, Double> categoryFrequency = new HashMap<>();
        try {
            categoryFrequency = objectMapper.readValue(config.getServicePreferenceJson(), Map.class);
        } catch (Exception e) {
            categoryFrequency.put("Threading", 40.0);
            categoryFrequency.put("Facial", 20.0);
            categoryFrequency.put("Hair", 20.0);
            categoryFrequency.put("Mehndi", 10.0);
            categoryFrequency.put("Nails", 10.0);
        }

        double totalWeight = 0;
        for (double w : categoryFrequency.values()) {
            totalWeight += w;
        }
        if (totalWeight == 0) totalWeight = 100.0;

        for (MembershipPlan plan : plans) {
            double expectedMonthlyProductCost = 0;
            
            // Parse plan rules
            Map<String, Map<String, Object>> rules = new HashMap<>();
            try {
                rules = objectMapper.readValue(plan.getRulesJson(), Map.class);
            } catch (Exception e) {
                // empty rules
            }

            // Estimate average cost of services consumed per month by a single member
            for (com.beauty.simulator.model.Service s : services) {
                if (!s.isMembershipEligible()) continue;

                // Probability of selecting this service when visiting
                double categoryWeight = categoryFrequency.getOrDefault(s.getCategory(), 10.0);
                double serviceProbability = categoryWeight / totalWeight;
                
                // Number of times member tries to visit for this service per month
                double attemptedVisits = avgMonthlyVisits * serviceProbability;

                // How many of these visits are actually covered as free/discounted under rules
                double coveredVisits = attemptedVisits;
                if (rules.containsKey(s.getName())) {
                    Map<String, Object> rule = rules.get(s.getName());
                    String type = (String) rule.get("type");
                    if ("MONTHLY_LIMIT".equalsIgnoreCase(type)) {
                        int limit = ((Number) rule.get("limit")).intValue();
                        coveredVisits = Math.min(attemptedVisits, limit);
                    }
                }

                // Product cost for this service
                double productCostForService = 0;
                if (s.getProductConsumptionJson() != null) {
                    try {
                        Map<String, Double> cons = objectMapper.readValue(s.getProductConsumptionJson(), Map.class);
                        for (Map.Entry<String, Double> entry : cons.entrySet()) {
                            Product p = productLookup.get(entry.getKey());
                            if (p != null) {
                                productCostForService += entry.getValue() * p.getPurchaseCost();
                            }
                        }
                    } catch (Exception e) {
                        // ignore
                    }
                }

                // Expected product consumption cost per month
                expectedMonthlyProductCost += coveredVisits * productCostForService;
            }

            PlanProfitability report = new PlanProfitability();
            report.planName = plan.getName();
            report.price = plan.getPrice();
            report.expectedMonthlyCostPerMember = expectedMonthlyProductCost;
            report.netMarginPerMember = plan.getPrice() - expectedMonthlyProductCost;

            if (report.netMarginPerMember > plan.getPrice() * 0.5) {
                report.status = "highly_profitable";
                report.advice = "This plan has excellent margins. Recommend marketing heavily to increase subscription count.";
            } else if (report.netMarginPerMember > 0) {
                report.status = "profitable";
                report.advice = "Plan is profitable, but keep an eye on product price inflation. Suggest capping premium service rules.";
            } else {
                report.status = "loss_making";
                report.advice = "WARNING: Plan costs more in product consumption than subscription price! Increase price, or set strict monthly caps (e.g. limit facials to 1/month).";
            }

            // Break even members count = Fixed Costs / Net Margin per member
            if (report.netMarginPerMember > 0) {
                report.breakEvenMembers = (int) Math.ceil(fixedExpensesMonthly / report.netMarginPerMember);
            } else {
                report.breakEvenMembers = 99999; // unattainable
            }

            reports.add(report);
        }

        return reports;
    }

    // Recommendation 3: Identify bottlenecks from a simulation run
    public BottleneckReport analyzeBottlenecks(SimulationEngine.SimulationResult lastResult, ShopScenario shop) {
        BottleneckReport report = new BottleneckReport();

        // 1. Check Staff utilization
        for (Map.Entry<String, Double> entry : lastResult.staffUtilization.entrySet()) {
            if (entry.getValue() > 85.0) {
                report.primaryBottlenecks.add(String.format("Staff Member: %s is overloaded (%.1f%% utilization).", entry.getKey(), entry.getValue()));
            } else if (entry.getValue() > 70.0) {
                report.secondaryBottlenecks.add(String.format("Staff Member: %s is highly loaded (%.1f%% utilization).", entry.getKey(), entry.getValue()));
            }
        }

        // 2. Check Equipment utilization
        for (Map.Entry<String, Double> entry : lastResult.equipmentUtilization.entrySet()) {
            if (entry.getValue() > 85.0) {
                report.primaryBottlenecks.add(String.format("Equipment: %s capacity is saturated (%.1f%% utilization).", entry.getKey(), entry.getValue()));
            } else if (entry.getValue() > 70.0) {
                report.secondaryBottlenecks.add(String.format("Equipment: %s is highly utilized (%.1f%% utilization).", entry.getKey(), entry.getValue()));
            }
        }

        // 3. Check Waiting Time / Walk-away
        double walkAwayPct = lastResult.totalCustomersServed > 0 ? 
                (lastResult.walkAwayCount / (double) (lastResult.totalCustomersServed + lastResult.walkAwayCount)) * 100.0 : 0.0;
        
        if (walkAwayPct > 20.0) {
            report.primaryBottlenecks.add(String.format("Losing Customers: %.1f%% of potential customers walk away without service due to queue delays or waiting lounge capacity.", walkAwayPct));
        } else if (walkAwayPct > 5.0) {
            report.secondaryBottlenecks.add(String.format("Customer Wait Times: %.1f%% of customers walk away.", walkAwayPct));
        }

        if (lastResult.avgWaitingTime > 30.0) {
            report.primaryBottlenecks.add(String.format("High Average Wait Time: Customers wait on average %.1f minutes. Target should be < 15 minutes.", lastResult.avgWaitingTime));
        } else if (lastResult.avgWaitingTime > 15.0) {
            report.secondaryBottlenecks.add(String.format("Moderately High Wait: Average customer waits %.1f minutes.", lastResult.avgWaitingTime));
        }

        // 4. Inventory Stockouts
        if (lastResult.stockoutCount > 0) {
            report.primaryBottlenecks.add(String.format("Inventory Shortage: %d services failed because necessary product stock depleted.", lastResult.stockoutCount));
        }

        // 5. Compile summary text & action plan
        if (report.primaryBottlenecks.isEmpty() && report.secondaryBottlenecks.isEmpty()) {
            report.summaryText = "The beauty parlour is operating efficiently with minimal wait times, healthy utilization levels, and no stockouts.";
            report.actionPlan = "No actions required. You have configured an optimal balance of staff and stations.";
        } else {
            StringBuilder sb = new StringBuilder();
            sb.append("We identified the following major constraints in your business:\n");
            for (String b : report.primaryBottlenecks) {
                sb.append("- ").append(b).append("\n");
            }
            if (!report.secondaryBottlenecks.isEmpty()) {
                sb.append("\nMinor concerns include:\n");
                for (String b : report.secondaryBottlenecks) {
                    sb.append("- ").append(b).append("\n");
                }
            }
            report.summaryText = sb.toString();

            // Formulate Action Plan
            StringBuilder plan = new StringBuilder();
            plan.append("### Recommended Action Plan:\n");
            boolean needsStaff = false;
            boolean needsBeds = false;
            boolean needsInventory = false;

            for (String b : report.primaryBottlenecks) {
                if (b.contains("Staff")) needsStaff = true;
                if (b.contains("Facial Bed") || b.contains("Chair") || b.contains("Station")) needsBeds = true;
                if (b.contains("Inventory") || b.contains("failed because necessary")) needsInventory = true;
            }

            if (needsStaff) {
                plan.append("1. **Hire staff**: Hire additional staff for the overloaded roles. Look at utilizing part-time workers during peak lunch/evening hours.\n");
            }
            if (needsBeds) {
                plan.append("2. **Expand Physical Space**: Buy more equipment/stations to address hardware bottlenecks. For example, add another Facial Bed if customers are queuing up for facials.\n");
            }
            if (needsInventory) {
                plan.append("3. **Replenish Stock**: Increase initial quantities or purchase cycles for products with high stockout frequencies.\n");
            }
            if (walkAwayPct > 20.0) {
                plan.append("4. **Extend Waiting Lounge**: Increase your waiting lounge chairs capacity to prevent customers from walking away instantly.\n");
            }

            report.actionPlan = plan.toString();
        }

        return report;
    }
}
