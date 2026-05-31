package com.iaspring.backspring.service;

import java.util.List;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;

import com.iaspring.backspring.dto.UtilisateurCreateDto;
import com.iaspring.backspring.dto.UtilisateurDto;
import com.iaspring.backspring.dto.UtilisateurUpdateDto;
import com.iaspring.backspring.entity.Utilisateur;
import com.iaspring.backspring.repository.UtilisateurRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class UtilisateurService {

    private final UtilisateurRepository utilisateurRepository;

    // --- MÉTHODE UTILITAIRE POUR CONVERTIR ENTITÉ -> DTO ---
    private UtilisateurDto convertToDto(Utilisateur utilisateur) {
        return new UtilisateurDto(
            utilisateur.getId(),
            utilisateur.getEmail(),
            utilisateur.getRole(),
            utilisateur.getAuthProvider(),
            utilisateur.getDateInscription()
        );
    }

    // CREATE
    public UtilisateurDto creer(UtilisateurCreateDto dto) {
        if (utilisateurRepository.existsByEmail(dto.email())) {
            throw new RuntimeException("Cet email est déjà utilisé.");
        }
        
        Utilisateur utilisateur = Utilisateur.builder()
            .email(dto.email())
            .motDePasse(dto.motDePasse())
            .role("ROLE_USER")
            .authProvider("LOCAL")
            .build();
            
        Utilisateur savedUser = utilisateurRepository.save(utilisateur);
        return convertToDto(savedUser);
    }

    // READ ALL
    public List<UtilisateurDto> recupererTous() {
        return utilisateurRepository.findAll().stream()
                .map(this::convertToDto)
                .collect(Collectors.toList());
    }

    // READ ONE
    public UtilisateurDto recupererParId(Long id) {
        Utilisateur utilisateur = utilisateurRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Utilisateur non trouvé avec l'id : " + id));
        return convertToDto(utilisateur);
    }

    // UPDATE
    public UtilisateurDto modifier(Long id, UtilisateurUpdateDto dto) {
        Utilisateur utilisateur = utilisateurRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Utilisateur non trouvé avec l'id : " + id));
        
        if (dto.email() != null && !dto.email().isEmpty()) {
            utilisateur.setEmail(dto.email());
        }
        if (dto.motDePasse() != null && !dto.motDePasse().isEmpty()) {
            utilisateur.setMotDePasse(dto.motDePasse());
        }
        if (dto.role() != null && !dto.role().isEmpty()) {
            utilisateur.setRole(dto.role());
        }
        
        Utilisateur updatedUser = utilisateurRepository.save(utilisateur);
        return convertToDto(updatedUser);
    }

    // DELETE
    public void supprimer(Long id) {
        utilisateurRepository.deleteById(id);
    }
}