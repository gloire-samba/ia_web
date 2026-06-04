package com.iaspring.backspring.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.iaspring.backspring.entity.Visage;

@Repository
public interface VisageRepository extends JpaRepository<Visage, Long> {
    boolean existsByNom(String nom);
}