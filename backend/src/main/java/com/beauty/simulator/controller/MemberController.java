package com.beauty.simulator.controller;

import com.beauty.simulator.model.*;
import com.beauty.simulator.repository.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/api")
public class MemberController {

    @Autowired private MemberWalletRepository walletRepo;
    @Autowired private WalletTransactionRepository txRepo;
    @Autowired private AppointmentRepository apptRepo;
    @Autowired private FamilyMemberRepository familyRepo;

    // Retrieve or initialize Member Wallet Profile
    @GetMapping("/members/{phone}")
    public ResponseEntity<MemberWallet> getOrCreateMember(@PathVariable String phone) {
        Optional<MemberWallet> opt = walletRepo.findByPhone(phone);
        if (opt.isPresent()) {
            return ResponseEntity.ok(opt.get());
        }
        // Initialize new member with starting balance and multiplier
        MemberWallet newWallet = new MemberWallet(phone);
        MemberWallet saved = walletRepo.save(newWallet);
        
        // Log starting balance transaction
        txRepo.save(new WalletTransaction(phone, "credit", 1200.0, 0.0, "Welcome Gift Credit Balance"));
        
        return ResponseEntity.ok(saved);
    }

    // Save profile changes (Birthday, Skin Type, Hair Type)
    @PutMapping("/members/{phone}")
    public ResponseEntity<MemberWallet> updateMemberProfile(@PathVariable String phone, @RequestBody MemberWallet profile) {
        Optional<MemberWallet> opt = walletRepo.findByPhone(phone);
        if (opt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        MemberWallet wallet = opt.get();
        wallet.setBirthday(profile.getBirthday());
        wallet.setAnniversary(profile.getAnniversary());
        wallet.setSkinType(profile.getSkinType());
        wallet.setHairType(profile.getHairType());
        wallet.setAllergies(profile.getAllergies());
        
        // Recalculate Loyalty Level
        if (wallet.getPoints() >= 500) {
            wallet.setLoyaltyLevel("Platinum");
        } else if (wallet.getPoints() >= 250) {
            wallet.setLoyaltyLevel("Gold");
        } else {
            wallet.setLoyaltyLevel("Silver");
        }

        MemberWallet saved = walletRepo.save(wallet);
        return ResponseEntity.ok(saved);
    }

    // Recharge Wallet with Multiplier
    @PostMapping("/members/{phone}/recharge")
    public ResponseEntity<MemberWallet> rechargeWallet(
            @PathVariable String phone,
            @RequestParam double amount,
            @RequestParam double multiplier
    ) {
        Optional<MemberWallet> opt = walletRepo.findByPhone(phone);
        if (opt.isEmpty()) return ResponseEntity.notFound().build();

        MemberWallet wallet = opt.get();
        double bonus = amount * (multiplier - 1.0);
        double totalCredit = amount * multiplier;

        wallet.setWalletBalance(wallet.getWalletBalance() + totalCredit);
        wallet.setPoints(wallet.getPoints() + (int)(amount * 0.1)); // 10% points reward

        walletRepo.save(wallet);

        // Record Transaction
        txRepo.save(new WalletTransaction(
                phone, "credit", amount, bonus,
                "Wallet Recharge via UPI (" + multiplier + "x Multiplier Bonus)"
        ));

        return ResponseEntity.ok(wallet);
    }

    // List transactions
    @GetMapping("/members/{phone}/transactions")
    public ResponseEntity<List<WalletTransaction>> getTransactions(@PathVariable String phone) {
        return ResponseEntity.ok(txRepo.findByPhoneOrderByDateDesc(phone));
    }

    // Book Appointment
    @PostMapping("/members/{phone}/appointments")
    public ResponseEntity<?> bookAppointment(
            @PathVariable String phone,
            @RequestParam Long staffId,
            @RequestParam String staffName,
            @RequestParam String date,
            @RequestParam String time,
            @RequestParam(required = false) String familyMember,
            @RequestBody String servicesJson
    ) {
        Optional<MemberWallet> opt = walletRepo.findByPhone(phone);
        if (opt.isEmpty()) return ResponseEntity.notFound().build();

        MemberWallet wallet = opt.get();
        
        // Calculate total price based on service catalog parsing or accept cost input.
        // We'll record a checkout transaction
        Appointment appt = new Appointment(phone, servicesJson, staffId, staffName, date, time, familyMember);
        Appointment savedAppt = apptRepo.save(appt);

        return ResponseEntity.ok(savedAppt);
    }

    // Deduct Wallet balance (Self-service checkout)
    @PostMapping("/members/{phone}/deduct")
    public ResponseEntity<MemberWallet> deductWallet(
            @PathVariable String phone,
            @RequestParam double amount,
            @RequestParam String description
    ) {
        Optional<MemberWallet> opt = walletRepo.findByPhone(phone);
        if (opt.isEmpty()) return ResponseEntity.notFound().build();

        MemberWallet wallet = opt.get();
        wallet.setWalletBalance(wallet.getWalletBalance() - amount);
        wallet.setPoints(wallet.getPoints() + (int)(amount * 0.05)); // 5% visit points reward
        
        walletRepo.save(wallet);

        // Record Debit
        txRepo.save(new WalletTransaction(phone, "debit", amount, 0.0, description));

        return ResponseEntity.ok(wallet);
    }

    // Cancel Appointment (Refund wallet balance)
    @PostMapping("/appointments/{id}/cancel")
    public ResponseEntity<?> cancelAppointment(@PathVariable Long id, @RequestParam double refundAmount) {
        Optional<Appointment> opt = apptRepo.findById(id);
        if (opt.isEmpty()) return ResponseEntity.notFound().build();

        Appointment appt = opt.get();
        if ("cancelled".equals(appt.getStatus())) {
            return ResponseEntity.badRequest().body("Appointment already cancelled");
        }

        appt.setStatus("cancelled");
        apptRepo.save(appt);

        // Refund wallet
        Optional<MemberWallet> walletOpt = walletRepo.findByPhone(appt.getPhone());
        if (walletOpt.isPresent()) {
            MemberWallet wallet = walletOpt.get();
            wallet.setWalletBalance(wallet.getWalletBalance() + refundAmount);
            walletRepo.save(wallet);

            // Record Refund credit
            txRepo.save(new WalletTransaction(
                    appt.getPhone(), "credit", refundAmount, 0.0,
                    "Refund: Cancelled Appointment #" + id
            ));
        }

        return ResponseEntity.ok(appt);
    }

    // List member bookings
    @GetMapping("/members/{phone}/appointments")
    public ResponseEntity<List<Appointment>> getAppointments(@PathVariable String phone) {
        return ResponseEntity.ok(apptRepo.findByPhoneOrderByCreatedDateDesc(phone));
    }

    // Family group listing
    @GetMapping("/members/{phone}/family")
    public ResponseEntity<List<FamilyMember>> getFamily(@PathVariable String phone) {
        return ResponseEntity.ok(familyRepo.findByPhone(phone));
    }

    // Add Family member
    @PostMapping("/members/{phone}/family")
    public ResponseEntity<FamilyMember> addFamily(
            @PathVariable String phone,
            @RequestParam String name,
            @RequestParam String relationship
    ) {
        FamilyMember fm = new FamilyMember(phone, name, relationship);
        FamilyMember saved = familyRepo.save(fm);
        return ResponseEntity.ok(saved);
    }

    // Delete Family member
    @DeleteMapping("/family/{id}")
    public ResponseEntity<Void> removeFamily(@PathVariable Long id) {
        familyRepo.deleteById(id);
        return ResponseEntity.ok().build();
    }
}
