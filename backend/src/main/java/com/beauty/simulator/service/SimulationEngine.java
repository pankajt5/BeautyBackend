package com.beauty.simulator.service;

import com.beauty.simulator.model.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.*;

@Service
public class SimulationEngine {

    private final ObjectMapper objectMapper = new ObjectMapper();

    public static class SimulationResult {
        public double totalRevenue;
        public double totalExpenses;
        public double netProfit;
        public double avgWaitingTime;
        public int totalCustomersServed;
        public int walkAwayCount;
        public Map<String, Double> staffUtilization = new HashMap<>();
        public Map<String, Double> equipmentUtilization = new HashMap<>();
        public Map<String, Integer> servicePopularity = new HashMap<>();
        public Map<String, Double> remainingInventory = new HashMap<>();
        public List<Map<String, Object>> timeline = new ArrayList<>();
        public List<Map<String, Object>> dailyReports = new ArrayList<>();
        public double membershipRevenue;
        public double serviceRevenue;
        public double salaryExpense;
        public double rentExpense;
        public double electricityExpense;
        public double productExpense;
        public int stockoutCount = 0;
    }

    public SimulationResult runSimulation(
            ShopScenario shop,
            List<Staff> staffList,
            List<com.beauty.simulator.model.Service> serviceList,
            List<Product> productList,
            List<MembershipPlan> planList,
            CustomerConfig customerConfig,
            int daysToSimulate
    ) {
        SimulationResult result = new SimulationResult();

        List<StaffWrapper> staffWrappers = new ArrayList<>();
        for (Staff s : staffList) {
            staffWrappers.add(new StaffWrapper(s));
        }

        // 1. Parse operational hours
        int startMin = parseTimeToMinutes(shop.getWorkingHoursStart());
        int endMin = parseTimeToMinutes(shop.getWorkingHoursEnd());
        int totalMinutes = endMin - startMin;
        if (totalMinutes <= 0) totalMinutes = 720; // 12 hours fallback

        // 2. Setup inventory lookup and initial stock
        Map<String, Double> productStock = new HashMap<>();
        Map<String, Product> productLookup = new HashMap<>();
        for (Product p : productList) {
            productStock.put(p.getName(), p.getQuantity());
            productLookup.put(p.getName(), p);
        }

        // 3. Setup membership plan lookup
        Map<String, MembershipPlan> planLookup = new HashMap<>();
        for (MembershipPlan plan : planList) {
            planLookup.put(plan.getName(), plan);
        }

        // 4. Track statistics over the entire run
        double totalRev = 0;
        double totalExp = 0;
        double totalWait = 0;
        int servedCount = 0;
        int walkAway = 0;
        int stockouts = 0;

        double sumSalaryExpense = 0;
        double sumRentExpense = 0;
        double sumElectricityExpense = 0;
        double sumProductExpense = 0;
        double sumMembershipRevenue = 0;
        double sumServiceRevenue = 0;

        Map<String, Integer> serviceCountMap = new HashMap<>();
        Map<String, Integer> staffBusyMinutes = new HashMap<>();
        Map<String, Integer> equipmentBusyMinutes = new HashMap<>();

        for (Staff s : staffList) {
            staffBusyMinutes.put(s.getName(), 0);
        }
        equipmentBusyMinutes.put("Chair", 0);
        equipmentBusyMinutes.put("Facial Bed", 0);
        equipmentBusyMinutes.put("Hair Station", 0);
        equipmentBusyMinutes.put("Mehndi Table", 0);

        Random rand = new Random(42); // Seeded for deterministic runs

        // Simulated customer history (usage of benefits) for members
        // MemberName -> ServiceName -> Count this month
        Map<String, Map<String, Integer>> memberUsageHistory = new HashMap<>();

        // Generate names for customers
        String[] firstNames = {"Priya", "Neha", "Aisha", "Anjali", "Kiran", "Kabir", "Rohan", "Siddharth", "Pooja", "Ritu", "Sneha", "Aditi", "Meera", "Varun", "Rahul", "Preeti", "Divya", "Jyoti", "Amit", "Karan"};
        String[] lastNames = {"Sharma", "Verma", "Patel", "Gupta", "Singh", "Joshi", "Mehta", "Reddy", "Nair", "Rao", "Kumar", "Iyer", "Choudhury", "Das", "Sen"};

        // Loop daily
        for (int day = 1; day <= daysToSimulate; day++) {
            double dailyServiceRev = 0;
            int dailyServed = 0;
            int dailyWalkAway = 0;
            double dailyProductCost = 0;

            // Daily active items
            // Queue: customers currently waiting
            List<SimCustomer> queue = new ArrayList<>();
            // Active Services: services currently in progress
            List<ActiveService> activeServices = new ArrayList<>();

            // Generate arrivals for the day
            List<SimCustomer> arrivals = new ArrayList<>();
            
            // Member arrivals
            int membersCount = customerConfig.getTotalMembers();
            double heavyPct = customerConfig.getHeavyUserPct() / 100.0;
            double normalPct = customerConfig.getNormalUserPct() / 100.0;
            double lowPct = customerConfig.getLowUserPct() / 100.0;

            int heavyMembers = (int) (membersCount * heavyPct);
            int normalMembers = (int) (membersCount * normalPct);
            int lowMembers = (int) (membersCount * lowPct);

            // Daily probability of visit based on user type
            // Heavy: visit 3x / month = ~10% daily probability
            // Normal: visit 1x / month = ~3.3% daily probability
            // Low: visit 0.2x / month = ~0.7% daily probability
            
            // Generate member customers who visit today
            int memberArrivalsToday = 0;
            for (int i = 0; i < heavyMembers; i++) {
                if (rand.nextDouble() < 0.10) memberArrivalsToday++;
            }
            for (int i = 0; i < normalMembers; i++) {
                if (rand.nextDouble() < 0.033) memberArrivalsToday++;
            }
            for (int i = 0; i < lowMembers; i++) {
                if (rand.nextDouble() < 0.007) memberArrivalsToday++;
            }

            // Non-member walk-ins
            int nonMembersToday = customerConfig.getNonMembersDaily();
            // Add some variance to walk-ins (+/- 20%)
            int walkinsToday = (int) (nonMembersToday * (0.8 + rand.nextDouble() * 0.4));

            // Generate member objects
            for (int i = 0; i < memberArrivalsToday; i++) {
                String name = firstNames[rand.nextInt(firstNames.length)] + " " + lastNames[rand.nextInt(lastNames.length)] + " (Member)";
                String type = drawUserType(rand, heavyPct, normalPct, lowPct);
                
                // Select membership plan
                String planName = planList.isEmpty() ? "None" : planList.get(rand.nextInt(planList.size())).getName();
                arrivals.add(new SimCustomer(name, type, true, planName, selectPreferredService(rand, serviceList, customerConfig)));
            }

            // Generate non-member objects
            for (int i = 0; i < walkinsToday; i++) {
                String name = firstNames[rand.nextInt(firstNames.length)] + " " + lastNames[rand.nextInt(lastNames.length)];
                arrivals.add(new SimCustomer(name, "Normal", false, "None", selectPreferredService(rand, serviceList, customerConfig)));
            }

            // Distribute arrival times throughout the day
            for (SimCustomer cust : arrivals) {
                if ("PEAK_HOURS".equals(customerConfig.getArrivalPattern())) {
                    cust.arrivalTimeMinute = drawPeakHourMinute(rand, startMin, endMin);
                } else {
                    cust.arrivalTimeMinute = startMin + rand.nextInt(totalMinutes);
                }
            }

            // Sort arrivals by time
            arrivals.sort(Comparator.comparingInt(c -> c.arrivalTimeMinute));

            // Step minute-by-minute
            for (int min = startMin; min < endMin; min++) {
                // A. Check completed active services
                Iterator<ActiveService> activeIt = activeServices.iterator();
                while (activeIt.hasNext()) {
                    ActiveService active = activeIt.next();
                    if (min >= active.completionTimeMinute) {
                        // Service completed!
                        active.staff.busyUntil = 0; // Free staff
                        activeIt.remove();

                        // Add completion event for timeline (Day 1 only to keep logs small)
                        if (day == 1) {
                            Map<String, Object> ev = new HashMap<>();
                            ev.put("time", formatMinutesToTime(min));
                            ev.put("minute", min);
                            ev.put("type", "SERVICE_END");
                            ev.put("customer", active.customer.name);
                            ev.put("service", active.service.getName());
                            ev.put("staff", active.staff.staff.getName());
                            ev.put("revenue", active.pricePaid);
                            result.timeline.add(ev);
                        }

                        dailyServed++;
                        servedCount++;
                    } else {
                        // Track busy minutes for utilization
                        staffBusyMinutes.put(active.staff.staff.getName(), staffBusyMinutes.get(active.staff.staff.getName()) + 1);
                        String eq = active.service.getRequiredEquipment();
                        if (eq != null && !eq.equalsIgnoreCase("None") && equipmentBusyMinutes.containsKey(eq)) {
                            equipmentBusyMinutes.put(eq, equipmentBusyMinutes.get(eq) + 1);
                        }
                    }
                }

                // B. Add new arrivals to queue
                for (SimCustomer cust : arrivals) {
                    if (cust.arrivalTimeMinute == min) {
                        // Check if waiting area is full
                        if (queue.size() >= shop.getWaitingAreaCapacity()) {
                            dailyWalkAway++;
                            walkAway++;
                            if (day == 1) {
                                Map<String, Object> ev = new HashMap<>();
                                ev.put("time", formatMinutesToTime(min));
                                ev.put("minute", min);
                                ev.put("type", "WALK_AWAY");
                                ev.put("customer", cust.name);
                                ev.put("reason", "Waiting lounge full");
                                result.timeline.add(ev);
                            }
                        } else {
                            queue.add(cust);
                            cust.queueEntryTime = min;
                            if (day == 1) {
                                Map<String, Object> ev = new HashMap<>();
                                ev.put("time", formatMinutesToTime(min));
                                ev.put("minute", min);
                                ev.put("type", "CUSTOMER_ARRIVE");
                                ev.put("customer", cust.name);
                                ev.put("service", cust.preferredService.getName());
                                result.timeline.add(ev);
                            }
                        }
                    }
                }

                // C. Check queue patience (customers leaving if waited too long)
                Iterator<SimCustomer> queueIt = queue.iterator();
                while (queueIt.hasNext()) {
                    SimCustomer cust = queueIt.next();
                    int waited = min - cust.queueEntryTime;
                    int patienceLimit = cust.getPatienceLimit();
                    if (waited >= patienceLimit) {
                        queueIt.remove();
                        dailyWalkAway++;
                        walkAway++;
                        if (day == 1) {
                            Map<String, Object> ev = new HashMap<>();
                            ev.put("time", formatMinutesToTime(min));
                            ev.put("minute", min);
                            ev.put("type", "WALK_AWAY");
                            ev.put("customer", cust.name);
                            ev.put("reason", "Wait time exceeded limit");
                            result.timeline.add(ev);
                        }
                    }
                }

                // D. Try to allocate staff/equipment to customers in queue
                queueIt = queue.iterator();
                while (queueIt.hasNext()) {
                    SimCustomer cust = queueIt.next();
                    com.beauty.simulator.model.Service svc = cust.preferredService;

                    // 1. Check equipment availability
                    if (!isEquipmentAvailable(svc, activeServices, shop)) {
                        continue; // Equipment occupied, skip to next customer
                    }

                    // 2. Find eligible staff
                    StaffWrapper selectedStaff = findAvailableStaff(svc, staffWrappers, min);
                    if (selectedStaff == null) {
                        continue; // No free staff with this skill, skip
                    }

                    // 3. Check and consume products
                    Map<String, Double> reqProducts = parseProductConsumption(svc.getProductConsumptionJson());
                    boolean stockAvailable = true;
                    String stockoutProduct = "";
                    for (Map.Entry<String, Double> entry : reqProducts.entrySet()) {
                        double currentStock = productStock.getOrDefault(entry.getKey(), 0.0);
                        if (currentStock < entry.getValue()) {
                            stockAvailable = false;
                            stockoutProduct = entry.getKey();
                            break;
                        }
                    }

                    if (!stockAvailable) {
                        // Product stockout! Customer walks away
                        queueIt.remove();
                        dailyWalkAway++;
                        walkAway++;
                        stockouts++;
                        result.stockoutCount++;
                        if (day == 1) {
                            Map<String, Object> ev = new HashMap<>();
                            ev.put("time", formatMinutesToTime(min));
                            ev.put("minute", min);
                            ev.put("type", "STOCKOUT");
                            ev.put("customer", cust.name);
                            ev.put("product", stockoutProduct);
                            result.timeline.add(ev);
                        }
                        continue;
                    }

                    // Deplete product stock
                    for (Map.Entry<String, Double> entry : reqProducts.entrySet()) {
                        double currentStock = productStock.get(entry.getKey());
                        productStock.put(entry.getKey(), currentStock - entry.getValue());
                        
                        // Calculate cost of product used
                        Product p = productLookup.get(entry.getKey());
                        if (p != null) {
                            double costOfDepletion = entry.getValue() * p.getPurchaseCost();
                            dailyProductCost += costOfDepletion;
                            sumProductExpense += costOfDepletion;
                        }
                    }

                    // 4. Calculate actual duration (scaled by staff speed)
                    int baseDuration = svc.getDuration();
                    // Add some variance (+/- 10%)
                    double variance = 0.9 + rand.nextDouble() * 0.2;
                    int actualDuration = (int) Math.max(svc.getMinDuration(), 
                            Math.min(svc.getMaxDuration(), (baseDuration * variance) / selectedStaff.staff.getSpeedMultiplier()));

                    // 5. Calculate billing price (check membership plan rules)
                    double pricePaid = svc.getSellingPrice();
                    if (cust.isMember && svc.isMembershipEligible() && planLookup.containsKey(cust.membershipPlanName)) {
                        MembershipPlan plan = planLookup.get(cust.membershipPlanName);
                        boolean isFree = checkPlanRulesAndApply(cust.name, svc.getName(), plan.getRulesJson(), memberUsageHistory);
                        if (isFree) {
                            pricePaid = 0.0;
                        }
                    }

                    // Start service
                    selectedStaff.busyUntil = min + actualDuration;
                    int finalCompletion = min + actualDuration;
                    activeServices.add(new ActiveService(cust, svc, selectedStaff, min, finalCompletion, pricePaid));

                    // Add start event for timeline
                    if (day == 1) {
                        Map<String, Object> ev = new HashMap<>();
                        ev.put("time", formatMinutesToTime(min));
                        ev.put("minute", min);
                        ev.put("type", "SERVICE_START");
                        ev.put("customer", cust.name);
                        ev.put("service", svc.getName());
                        ev.put("staff", selectedStaff.staff.getName());
                        ev.put("duration", actualDuration);
                        ev.put("price", pricePaid);
                        result.timeline.add(ev);
                    }

                    // Track wait times
                    int waited = min - cust.queueEntryTime;
                    totalWait += waited;
                    
                    // Increment service count
                    serviceCountMap.put(svc.getName(), serviceCountMap.getOrDefault(svc.getName(), 0) + 1);

                    // Add revenue
                    dailyServiceRev += pricePaid;
                    sumServiceRevenue += pricePaid;

                    // Remove from queue
                    queueIt.remove();
                }
            }

            // End of day calculations
            // Daily expenses (rent, electricity, salaries)
            double dailyRent = shop.getMonthlyRent() / 30.0;
            double dailyElectricity = shop.getMonthlyElectricity() / 30.0;
            double dailySalaries = 0;
            for (Staff s : staffList) {
                dailySalaries += s.getSalary() / 30.0;
            }

            double dailyExp = dailyRent + dailyElectricity + dailySalaries + dailyProductCost;
            sumRentExpense += dailyRent;
            sumElectricityExpense += dailyElectricity;
            sumSalaryExpense += dailySalaries;

            // Daily membership revenue
            double dailyMembershipRev = 0;
            if (day == 1 || day % 30 == 0) {
                // Standard monthly memberships billing
                dailyMembershipRev = membersCount * (planList.isEmpty() ? 0.0 : planList.get(0).getPrice());
                // Prorate it daily in general reports, or bill it once a month.
                // Let's prorate it daily so the profit graph is smooth!
            }
            double proratedMembershipRev = (membersCount * (planList.isEmpty() ? 0.0 : planList.get(0).getPrice())) / 30.0;
            sumMembershipRevenue += proratedMembershipRev;

            double dailyRevenue = dailyServiceRev + proratedMembershipRev;
            double dailyProfit = dailyRevenue - dailyExp;

            totalRev += dailyRevenue;
            totalExp += dailyExp;

            // Add daily metrics for the charts
            Map<String, Object> dayReport = new HashMap<>();
            dayReport.put("day", day);
            dayReport.put("revenue", dailyRevenue);
            dayReport.put("expenses", dailyExp);
            dayReport.put("profit", dailyProfit);
            dayReport.put("served", dailyServed);
            dayReport.put("walkAway", dailyWalkAway);
            result.dailyReports.add(dayReport);

            // Reset monthly membership usage history every 30 days
            if (day % 30 == 0) {
                memberUsageHistory.clear();
            }
        }

        // 5. Final Compilation of results
        result.totalRevenue = totalRev;
        result.totalExpenses = totalExp;
        result.netProfit = totalRev - totalExp;
        result.avgWaitingTime = servedCount > 0 ? (totalWait / servedCount) : 0.0;
        result.totalCustomersServed = servedCount;
        result.walkAwayCount = walkAway;

        result.membershipRevenue = sumMembershipRevenue;
        result.serviceRevenue = sumServiceRevenue;
        result.rentExpense = sumRentExpense;
        result.electricityExpense = sumElectricityExpense;
        result.salaryExpense = sumSalaryExpense;
        result.productExpense = sumProductExpense;

        // Staff utilization %
        double totalDaysMinutes = daysToSimulate * totalMinutes;
        for (Staff s : staffList) {
            // Staff availability minutes = working hours minus break hours
            int shiftMin = parseTimeToMinutes(s.getWorkingHoursEnd()) - parseTimeToMinutes(s.getWorkingHoursStart());
            int breakMin = parseTimeToMinutes(s.getBreakHoursEnd()) - parseTimeToMinutes(s.getBreakHoursStart());
            double availDailyMin = Math.max(0, shiftMin - breakMin);
            double totalAvailMinutes = daysToSimulate * availDailyMin;
            
            double busy = staffBusyMinutes.getOrDefault(s.getName(), 0);
            double util = totalAvailMinutes > 0 ? (busy / totalAvailMinutes) * 100.0 : 0.0;
            result.staffUtilization.put(s.getName(), Math.min(100.0, util));
        }

        // Equipment utilization %
        if (daysToSimulate > 0) {
            double totalDaySec = daysToSimulate * totalMinutes;
            result.equipmentUtilization.put("Chairs", Math.min(100.0, (equipmentBusyMinutes.get("Chair") / (double)(shop.getChairs() * totalDaySec)) * 100.0));
            result.equipmentUtilization.put("Facial Beds", Math.min(100.0, (equipmentBusyMinutes.get("Facial Bed") / (double)(shop.getFacialBeds() * totalDaySec)) * 100.0));
            result.equipmentUtilization.put("Hair Stations", Math.min(100.0, (equipmentBusyMinutes.get("Hair Station") / (double)(shop.getHairStations() * totalDaySec)) * 100.0));
            result.equipmentUtilization.put("Mehndi Tables", Math.min(100.0, (equipmentBusyMinutes.get("Mehndi Table") / (double)(shop.getMehndiTables() * totalDaySec)) * 100.0));
        }

        result.servicePopularity = serviceCountMap;

        for (Map.Entry<String, Double> entry : productStock.entrySet()) {
            result.remainingInventory.put(entry.getKey(), entry.getValue());
        }

        return result;
    }

    private int parseTimeToMinutes(String hhmm) {
        if (hhmm == null || !hhmm.contains(":")) return 0;
        try {
            String[] parts = hhmm.split(":");
            int hrs = Integer.parseInt(parts[0]);
            int mins = Integer.parseInt(parts[1]);
            return hrs * 60 + mins;
        } catch (Exception e) {
            return 0;
        }
    }

    private String formatMinutesToTime(int totalMins) {
        int hrs = (totalMins / 60) % 24;
        int mins = totalMins % 60;
        String ampm = hrs >= 12 ? "PM" : "AM";
        int displayHrs = hrs % 12;
        if (displayHrs == 0) displayHrs = 12;
        return String.format("%02d:%02d %s", displayHrs, mins, ampm);
    }

    private String drawUserType(Random rand, double heavy, double normal, double low) {
        double r = rand.nextDouble();
        if (r < heavy) return "Heavy";
        if (r < heavy + normal) return "Normal";
        return "Low";
    }

    private com.beauty.simulator.model.Service selectPreferredService(
            Random rand,
            List<com.beauty.simulator.model.Service> serviceList,
            CustomerConfig config
    ) {
        if (serviceList.isEmpty()) return null;
        try {
            Map<String, Double> prefs = objectMapper.readValue(config.getServicePreferenceJson(), Map.class);
            
            // Build random selector
            double totalWeight = 0;
            List<com.beauty.simulator.model.Service> weightedServices = new ArrayList<>();
            List<Double> weights = new ArrayList<>();

            for (com.beauty.simulator.model.Service s : serviceList) {
                double weight = prefs.getOrDefault(s.getCategory(), 5.0); // Default preference if not configured
                totalWeight += weight;
                weightedServices.add(s);
                weights.add(totalWeight);
            }

            if (totalWeight == 0) return serviceList.get(rand.nextInt(serviceList.size()));

            double draw = rand.nextDouble() * totalWeight;
            for (int i = 0; i < weights.size(); i++) {
                if (draw <= weights.get(i)) {
                    return weightedServices.get(i);
                }
            }
        } catch (Exception e) {
            // Fallback
        }
        return serviceList.get(rand.nextInt(serviceList.size()));
    }

    private int drawPeakHourMinute(Random rand, int startMin, int endMin) {
        // Simple double peak model: Lunch peak (12:00 - 14:00) and Evening peak (17:00 - 20:00)
        // Convert to minutes:
        // Lunch: 720 to 840
        // Evening: 1020 to 1200
        double r = rand.nextDouble();
        if (r < 0.35) { // 35% during lunch peak
            return 720 + rand.nextInt(120);
        } else if (r < 0.75) { // 40% during evening peak
            return 1020 + rand.nextInt(180);
        } else { // 25% during off-peak
            return startMin + rand.nextInt(endMin - startMin);
        }
    }

    private boolean isEquipmentAvailable(com.beauty.simulator.model.Service svc, List<ActiveService> activeList, ShopScenario shop) {
        String eq = svc.getRequiredEquipment();
        if (eq == null || eq.equalsIgnoreCase("None")) return true;

        int capacity = 0;
        if (eq.equalsIgnoreCase("Chair")) capacity = shop.getChairs();
        else if (eq.equalsIgnoreCase("Facial Bed")) capacity = shop.getFacialBeds();
        else if (eq.equalsIgnoreCase("Hair Station")) capacity = shop.getHairStations();
        else if (eq.equalsIgnoreCase("Mehndi Table")) capacity = shop.getMehndiTables();
        else return true;

        // Count how many are currently active
        int activeCount = 0;
        for (ActiveService active : activeList) {
            if (active.service.getRequiredEquipment().equalsIgnoreCase(eq)) {
                activeCount++;
            }
        }
        return activeCount < capacity;
    }


    private StaffWrapper findAvailableStaff(
            com.beauty.simulator.model.Service svc,
            List<StaffWrapper> wrappers,
            int currentMin
    ) {
        String reqSkill = svc.getRequiredSkill();
        StaffWrapper bestStaff = null;

        for (StaffWrapper w : wrappers) {
            // Check if busy
            if (currentMin < w.busyUntil) continue;

            // Check shift
            int shiftStart = parseTimeToMinutes(w.staff.getWorkingHoursStart());
            int shiftEnd = parseTimeToMinutes(w.staff.getWorkingHoursEnd());
            if (currentMin < shiftStart || currentMin >= shiftEnd) continue;

            // Check break
            int breakStart = parseTimeToMinutes(w.staff.getBreakHoursStart());
            int breakEnd = parseTimeToMinutes(w.staff.getBreakHoursEnd());
            if (currentMin >= breakStart && currentMin < breakEnd) continue;

            // Check skill
            boolean hasSkill = false;
            if (reqSkill.equalsIgnoreCase("Threading")) hasSkill = w.staff.isCanDoThreading();
            else if (reqSkill.equalsIgnoreCase("Facial")) hasSkill = w.staff.isCanDoFacial();
            else if (reqSkill.equalsIgnoreCase("Hair")) hasSkill = w.staff.isCanDoHair();
            else if (reqSkill.equalsIgnoreCase("Makeup")) hasSkill = w.staff.isCanDoMakeup();
            else if (reqSkill.equalsIgnoreCase("Mehndi")) hasSkill = w.staff.isCanDoMehndi();
            else if (reqSkill.equalsIgnoreCase("Nails")) hasSkill = w.staff.isCanDoNails();
            else hasSkill = true; // Generic

            if (hasSkill) {
                // Prefer higher speedMultiplier or skill level
                if (bestStaff == null || w.staff.getSpeedMultiplier() > bestStaff.staff.getSpeedMultiplier()) {
                    bestStaff = w;
                }
            }
        }
        return bestStaff;
    }

    private Map<String, Double> parseProductConsumption(String json) {
        Map<String, Double> result = new HashMap<>();
        if (json == null || json.isEmpty()) return result;
        try {
            return objectMapper.readValue(json, Map.class);
        } catch (Exception e) {
            // Ignore
        }
        return result;
    }

    private boolean checkPlanRulesAndApply(
            String customerName,
            String serviceName,
            String rulesJson,
            Map<String, Map<String, Integer>> history
    ) {
        if (rulesJson == null || rulesJson.isEmpty()) return false;
        try {
            Map<String, Map<String, Object>> rules = objectMapper.readValue(rulesJson, Map.class);
            if (!rules.containsKey(serviceName)) return false;

            Map<String, Object> rule = rules.get(serviceName);
            String type = (String) rule.get("type"); // "UNLIMITED", "MONTHLY_LIMIT", etc.
            
            if ("UNLIMITED".equalsIgnoreCase(type)) {
                return true;
            } else if ("MONTHLY_LIMIT".equalsIgnoreCase(type)) {
                int limit = ((Number) rule.get("limit")).intValue();
                
                Map<String, Integer> custUsage = history.computeIfAbsent(customerName, k -> new HashMap<>());
                int currentUsage = custUsage.getOrDefault(serviceName, 0);
                if (currentUsage < limit) {
                    custUsage.put(serviceName, currentUsage + 1);
                    return true;
                }
            }
        } catch (Exception e) {
            // Ignore
        }
        return false;
    }

    // Helper classes for simulation execution state
    private static class SimCustomer {
        String name;
        String userType;
        boolean isMember;
        String membershipPlanName;
        com.beauty.simulator.model.Service preferredService;
        int arrivalTimeMinute;
        int queueEntryTime;

        SimCustomer(String name, String userType, boolean isMember, String membershipPlanName, com.beauty.simulator.model.Service preferredService) {
            this.name = name;
            this.userType = userType;
            this.isMember = isMember;
            this.membershipPlanName = membershipPlanName;
            this.preferredService = preferredService;
        }

        int getPatienceLimit() {
            if ("Heavy".equalsIgnoreCase(userType)) return 90;
            if ("Low".equalsIgnoreCase(userType)) return 30;
            return 60; // Normal user patience
        }
    }

    private static class StaffWrapper {
        Staff staff;
        int busyUntil = 0;

        StaffWrapper(Staff s) {
            this.staff = s;
        }
    }

    private static class ActiveService {
        SimCustomer customer;
        com.beauty.simulator.model.Service service;
        StaffWrapper staff;
        int startTimeMinute;
        int completionTimeMinute;
        double pricePaid;

        ActiveService(SimCustomer customer, com.beauty.simulator.model.Service service, StaffWrapper staff, int start, int end, double price) {
            this.customer = customer;
            this.service = service;
            this.staff = staff;
            this.startTimeMinute = start;
            this.completionTimeMinute = end;
            this.pricePaid = price;
        }
    }

    // Main API entry wrapped caller
    public SimulationResult runSimulation(
            ShopScenario shop,
            List<Staff> staffList,
            List<com.beauty.simulator.model.Service> serviceList,
            List<Product> productList,
            List<MembershipPlan> planList,
            CustomerConfig customerConfig,
            int daysToSimulate,
            boolean saveTimeline
    ) {
        // Initialize Staff wrappers to track busy status
        List<StaffWrapper> wrappers = new ArrayList<>();
        for (Staff s : staffList) {
            wrappers.add(new StaffWrapper(s));
        }

        SimulationResult result = runSimulationInternal(shop, wrappers, serviceList, productList, planList, customerConfig, daysToSimulate, saveTimeline);
        return result;
    }

    private SimulationResult runSimulationInternal(
            ShopScenario shop,
            List<StaffWrapper> staffWrappers,
            List<com.beauty.simulator.model.Service> serviceList,
            List<Product> productList,
            List<MembershipPlan> planList,
            CustomerConfig customerConfig,
            int daysToSimulate,
            boolean saveTimeline
    ) {
        SimulationResult result = new SimulationResult();

        int startMin = parseTimeToMinutes(shop.getWorkingHoursStart());
        int endMin = parseTimeToMinutes(shop.getWorkingHoursEnd());
        int totalMinutes = endMin - startMin;
        if (totalMinutes <= 0) totalMinutes = 720;

        Map<String, Double> productStock = new HashMap<>();
        Map<String, Product> productLookup = new HashMap<>();
        for (Product p : productList) {
            productStock.put(p.getName(), p.getQuantity());
            productLookup.put(p.getName(), p);
        }

        Map<String, MembershipPlan> planLookup = new HashMap<>();
        for (MembershipPlan plan : planList) {
            planLookup.put(plan.getName(), plan);
        }

        double totalRev = 0;
        double totalExp = 0;
        double totalWait = 0;
        int servedCount = 0;
        int walkAway = 0;

        double sumSalaryExpense = 0;
        double sumRentExpense = 0;
        double sumElectricityExpense = 0;
        double sumProductExpense = 0;
        double sumMembershipRevenue = 0;
        double sumServiceRevenue = 0;

        Map<String, Integer> serviceCountMap = new HashMap<>();
        Map<String, Integer> staffBusyMinutes = new HashMap<>();
        Map<String, Integer> equipmentBusyMinutes = new HashMap<>();

        for (StaffWrapper sw : staffWrappers) {
            staffBusyMinutes.put(sw.staff.getName(), 0);
        }
        equipmentBusyMinutes.put("Chair", 0);
        equipmentBusyMinutes.put("Facial Bed", 0);
        equipmentBusyMinutes.put("Hair Station", 0);
        equipmentBusyMinutes.put("Mehndi Table", 0);

        Random rand = new Random(42);
        Map<String, Map<String, Integer>> memberUsageHistory = new HashMap<>();

        String[] firstNames = {"Priya", "Neha", "Aisha", "Anjali", "Kiran", "Kabir", "Rohan", "Siddharth", "Pooja", "Ritu", "Sneha", "Aditi", "Meera", "Varun", "Rahul", "Preeti", "Divya", "Jyoti", "Amit", "Karan"};
        String[] lastNames = {"Sharma", "Verma", "Patel", "Gupta", "Singh", "Joshi", "Mehta", "Reddy", "Nair", "Rao", "Kumar", "Iyer", "Choudhury", "Das", "Sen"};

        for (int day = 1; day <= daysToSimulate; day++) {
            double dailyServiceRev = 0;
            int dailyServed = 0;
            int dailyWalkAway = 0;
            double dailyProductCost = 0;

            List<SimCustomer> queue = new ArrayList<>();
            List<ActiveService> activeServices = new ArrayList<>();
            List<SimCustomer> arrivals = new ArrayList<>();
            
            int membersCount = customerConfig.getTotalMembers();
            double heavyPct = customerConfig.getHeavyUserPct() / 100.0;
            double normalPct = customerConfig.getNormalUserPct() / 100.0;
            double lowPct = customerConfig.getLowUserPct() / 100.0;

            int heavyMembers = (int) (membersCount * heavyPct);
            int normalMembers = (int) (membersCount * normalPct);
            int lowMembers = (int) (membersCount * lowPct);

            int memberArrivalsToday = 0;
            for (int i = 0; i < heavyMembers; i++) {
                if (rand.nextDouble() < 0.10) memberArrivalsToday++;
            }
            for (int i = 0; i < normalMembers; i++) {
                if (rand.nextDouble() < 0.033) memberArrivalsToday++;
            }
            for (int i = 0; i < lowMembers; i++) {
                if (rand.nextDouble() < 0.007) memberArrivalsToday++;
            }

            int nonMembersToday = customerConfig.getNonMembersDaily();
            int walkinsToday = (int) (nonMembersToday * (0.8 + rand.nextDouble() * 0.4));

            for (int i = 0; i < memberArrivalsToday; i++) {
                String name = firstNames[rand.nextInt(firstNames.length)] + " " + lastNames[rand.nextInt(lastNames.length)] + " (Member)";
                String type = drawUserType(rand, heavyPct, normalPct, lowPct);
                String planName = planList.isEmpty() ? "None" : planList.get(rand.nextInt(planList.size())).getName();
                arrivals.add(new SimCustomer(name, type, true, planName, selectPreferredService(rand, serviceList, customerConfig)));
            }

            for (int i = 0; i < walkinsToday; i++) {
                String name = firstNames[rand.nextInt(firstNames.length)] + " " + lastNames[rand.nextInt(lastNames.length)];
                arrivals.add(new SimCustomer(name, "Normal", false, "None", selectPreferredService(rand, serviceList, customerConfig)));
            }

            for (SimCustomer cust : arrivals) {
                if ("PEAK_HOURS".equals(customerConfig.getArrivalPattern())) {
                    cust.arrivalTimeMinute = drawPeakHourMinute(rand, startMin, endMin);
                } else {
                    cust.arrivalTimeMinute = startMin + rand.nextInt(totalMinutes);
                }
            }

            arrivals.sort(Comparator.comparingInt(c -> c.arrivalTimeMinute));

            for (int min = startMin; min < endMin; min++) {
                // A. Completion checks
                Iterator<ActiveService> activeIt = activeServices.iterator();
                while (activeIt.hasNext()) {
                    ActiveService active = activeIt.next();
                    if (min >= active.completionTimeMinute) {
                        active.staff.busyUntil = 0;
                        activeIt.remove();

                        if (saveTimeline && day == 1) {
                            Map<String, Object> ev = new HashMap<>();
                            ev.put("time", formatMinutesToTime(min));
                            ev.put("minute", min);
                            ev.put("type", "SERVICE_END");
                            ev.put("customer", active.customer.name);
                            ev.put("service", active.service.getName());
                            ev.put("staff", active.staff.staff.getName());
                            ev.put("revenue", active.pricePaid);
                            result.timeline.add(ev);
                        }

                        dailyServed++;
                        servedCount++;
                    } else {
                        staffBusyMinutes.put(active.staff.staff.getName(), staffBusyMinutes.get(active.staff.staff.getName()) + 1);
                        String eq = active.service.getRequiredEquipment();
                        if (eq != null && !eq.equalsIgnoreCase("None") && equipmentBusyMinutes.containsKey(eq)) {
                            equipmentBusyMinutes.put(eq, equipmentBusyMinutes.get(eq) + 1);
                        }
                    }
                }

                // B. Queue check
                for (SimCustomer cust : arrivals) {
                    if (cust.arrivalTimeMinute == min) {
                        if (queue.size() >= shop.getWaitingAreaCapacity()) {
                            dailyWalkAway++;
                            walkAway++;
                            if (saveTimeline && day == 1) {
                                Map<String, Object> ev = new HashMap<>();
                                ev.put("time", formatMinutesToTime(min));
                                ev.put("minute", min);
                                ev.put("type", "WALK_AWAY");
                                ev.put("customer", cust.name);
                                ev.put("reason", "Waiting lounge full");
                                result.timeline.add(ev);
                            }
                        } else {
                            queue.add(cust);
                            cust.queueEntryTime = min;
                            if (saveTimeline && day == 1) {
                                Map<String, Object> ev = new HashMap<>();
                                ev.put("time", formatMinutesToTime(min));
                                ev.put("minute", min);
                                ev.put("type", "CUSTOMER_ARRIVE");
                                ev.put("customer", cust.name);
                                ev.put("service", cust.preferredService.getName());
                                result.timeline.add(ev);
                            }
                        }
                    }
                }

                // C. Patience limit check
                Iterator<SimCustomer> queueIt = queue.iterator();
                while (queueIt.hasNext()) {
                    SimCustomer cust = queueIt.next();
                    int waited = min - cust.queueEntryTime;
                    int patienceLimit = cust.getPatienceLimit();
                    if (waited >= patienceLimit) {
                        queueIt.remove();
                        dailyWalkAway++;
                        walkAway++;
                        if (saveTimeline && day == 1) {
                            Map<String, Object> ev = new HashMap<>();
                            ev.put("time", formatMinutesToTime(min));
                            ev.put("minute", min);
                            ev.put("type", "WALK_AWAY");
                            ev.put("customer", cust.name);
                            ev.put("reason", "Wait time exceeded limit");
                            result.timeline.add(ev);
                        }
                    }
                }

                // D. Allocation
                queueIt = queue.iterator();
                while (queueIt.hasNext()) {
                    SimCustomer cust = queueIt.next();
                    com.beauty.simulator.model.Service svc = cust.preferredService;

                    if (!isEquipmentAvailable(svc, activeServices, shop)) {
                        continue;
                    }

                    StaffWrapper selectedStaff = findAvailableStaff(svc, staffWrappers, min);
                    if (selectedStaff == null) {
                        continue;
                    }

                    Map<String, Double> reqProducts = parseProductConsumption(svc.getProductConsumptionJson());
                    boolean stockAvailable = true;
                    String stockoutProduct = "";
                    for (Map.Entry<String, Double> entry : reqProducts.entrySet()) {
                        double currentStock = productStock.getOrDefault(entry.getKey(), 0.0);
                        if (currentStock < entry.getValue()) {
                            stockAvailable = false;
                            stockoutProduct = entry.getKey();
                            break;
                        }
                    }

                    if (!stockAvailable) {
                        queueIt.remove();
                        dailyWalkAway++;
                        walkAway++;
                        result.stockoutCount++;
                        if (saveTimeline && day == 1) {
                            Map<String, Object> ev = new HashMap<>();
                            ev.put("time", formatMinutesToTime(min));
                            ev.put("minute", min);
                            ev.put("type", "STOCKOUT");
                            ev.put("customer", cust.name);
                            ev.put("product", stockoutProduct);
                            result.timeline.add(ev);
                        }
                        continue;
                    }

                    for (Map.Entry<String, Double> entry : reqProducts.entrySet()) {
                        double currentStock = productStock.get(entry.getKey());
                        productStock.put(entry.getKey(), currentStock - entry.getValue());
                        Product p = productLookup.get(entry.getKey());
                        if (p != null) {
                            double costOfDepletion = entry.getValue() * p.getPurchaseCost();
                            dailyProductCost += costOfDepletion;
                            sumProductExpense += costOfDepletion;
                        }
                    }

                    int baseDuration = svc.getDuration();
                    double variance = 0.9 + rand.nextDouble() * 0.2;
                    int actualDuration = (int) Math.max(svc.getMinDuration(), 
                            Math.min(svc.getMaxDuration(), (baseDuration * variance) / selectedStaff.staff.getSpeedMultiplier()));

                    double pricePaid = svc.getSellingPrice();
                    if (cust.isMember && svc.isMembershipEligible() && planLookup.containsKey(cust.membershipPlanName)) {
                        MembershipPlan plan = planLookup.get(cust.membershipPlanName);
                        boolean isFree = checkPlanRulesAndApply(cust.name, svc.getName(), plan.getRulesJson(), memberUsageHistory);
                        if (isFree) {
                            pricePaid = 0.0;
                        }
                    }

                    selectedStaff.busyUntil = min + actualDuration;
                    int finalCompletion = min + actualDuration;
                    activeServices.add(new ActiveService(cust, svc, selectedStaff, min, finalCompletion, pricePaid));

                    if (saveTimeline && day == 1) {
                        Map<String, Object> ev = new HashMap<>();
                        ev.put("time", formatMinutesToTime(min));
                        ev.put("minute", min);
                        ev.put("type", "SERVICE_START");
                        ev.put("customer", cust.name);
                        ev.put("service", svc.getName());
                        ev.put("staff", selectedStaff.staff.getName());
                        ev.put("duration", actualDuration);
                        ev.put("price", pricePaid);
                        result.timeline.add(ev);
                    }

                    int waited = min - cust.queueEntryTime;
                    totalWait += waited;
                    serviceCountMap.put(svc.getName(), serviceCountMap.getOrDefault(svc.getName(), 0) + 1);
                    dailyServiceRev += pricePaid;
                    sumServiceRevenue += pricePaid;
                    queueIt.remove();
                }
            }

            double dailyRent = shop.getMonthlyRent() / 30.0;
            double dailyElectricity = shop.getMonthlyElectricity() / 30.0;
            double dailySalaries = 0;
            for (StaffWrapper sw : staffWrappers) {
                dailySalaries += sw.staff.getSalary() / 30.0;
            }

            double dailyExp = dailyRent + dailyElectricity + dailySalaries + dailyProductCost;
            sumRentExpense += dailyRent;
            sumElectricityExpense += dailyElectricity;
            sumSalaryExpense += dailySalaries;

            double proratedMembershipRev = (membersCount * (planList.isEmpty() ? 0.0 : planList.get(0).getPrice())) / 30.0;
            sumMembershipRevenue += proratedMembershipRev;

            double dailyRevenue = dailyServiceRev + proratedMembershipRev;
            double dailyProfit = dailyRevenue - dailyExp;

            totalRev += dailyRevenue;
            totalExp += dailyExp;

            Map<String, Object> dayReport = new HashMap<>();
            dayReport.put("day", day);
            dayReport.put("revenue", dailyRevenue);
            dayReport.put("expenses", dailyExp);
            dayReport.put("profit", dailyProfit);
            dayReport.put("served", dailyServed);
            dayReport.put("walkAway", dailyWalkAway);
            result.dailyReports.add(dayReport);

            if (day % 30 == 0) {
                memberUsageHistory.clear();
            }
        }

        result.totalRevenue = totalRev;
        result.totalExpenses = totalExp;
        result.netProfit = totalRev - totalExp;
        result.avgWaitingTime = servedCount > 0 ? (totalWait / servedCount) : 0.0;
        result.totalCustomersServed = servedCount;
        result.walkAwayCount = walkAway;

        result.membershipRevenue = sumMembershipRevenue;
        result.serviceRevenue = sumServiceRevenue;
        result.rentExpense = sumRentExpense;
        result.electricityExpense = sumElectricityExpense;
        result.salaryExpense = sumSalaryExpense;
        result.productExpense = sumProductExpense;

        double totalDaysMinutes = daysToSimulate * totalMinutes;
        for (StaffWrapper sw : staffWrappers) {
            int shiftMin = parseTimeToMinutes(sw.staff.getWorkingHoursEnd()) - parseTimeToMinutes(sw.staff.getWorkingHoursStart());
            int breakMin = parseTimeToMinutes(sw.staff.getBreakHoursEnd()) - parseTimeToMinutes(sw.staff.getBreakHoursStart());
            double availDailyMin = Math.max(0, shiftMin - breakMin);
            double totalAvailMinutes = daysToSimulate * availDailyMin;
            
            double busy = staffBusyMinutes.getOrDefault(sw.staff.getName(), 0);
            double util = totalAvailMinutes > 0 ? (busy / totalAvailMinutes) * 100.0 : 0.0;
            result.staffUtilization.put(sw.staff.getName(), Math.min(100.0, util));
        }

        if (daysToSimulate > 0) {
            double totalDaySec = daysToSimulate * totalMinutes;
            result.equipmentUtilization.put("Chairs", Math.min(100.0, (equipmentBusyMinutes.get("Chair") / (double)(shop.getChairs() * totalDaySec)) * 100.0));
            result.equipmentUtilization.put("Facial Beds", Math.min(100.0, (equipmentBusyMinutes.get("Facial Bed") / (double)(shop.getFacialBeds() * totalDaySec)) * 100.0));
            result.equipmentUtilization.put("Hair Stations", Math.min(100.0, (equipmentBusyMinutes.get("Hair Station") / (double)(shop.getHairStations() * totalDaySec)) * 100.0));
            result.equipmentUtilization.put("Mehndi Tables", Math.min(100.0, (equipmentBusyMinutes.get("Mehndi Table") / (double)(shop.getMehndiTables() * totalDaySec)) * 100.0));
        }

        result.servicePopularity = serviceCountMap;
        for (Map.Entry<String, Double> entry : productStock.entrySet()) {
            result.remainingInventory.put(entry.getKey(), entry.getValue());
        }

        return result;
    }
}
