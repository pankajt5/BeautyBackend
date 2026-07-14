package com.beauty.simulator.repository;

import com.beauty.simulator.model.MemberWallet;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.Optional;

@Repository
public interface MemberWalletRepository extends JpaRepository<MemberWallet, Long> {
    Optional<MemberWallet> findByPhone(String phone);
}
