package com.iaspring.backspring.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.iaspring.backspring.entity.Utilisateur;

@Repository
public interface UtilisateurRepository extends JpaRepository<Utilisateur, Long> {
    
    // Pour la connexion (vérifier si l'email existe)
    Optional<Utilisateur> findByEmail(String email);
    
    boolean existsByEmail(String email);
}