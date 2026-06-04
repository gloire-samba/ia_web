package com.iaspring.backspring.controller;


import java.util.List;
import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import com.iaspring.backspring.entity.Visage;
import com.iaspring.backspring.service.VisageService;

@RestController
@RequestMapping("/api/visages")
@CrossOrigin(origins = "*") // Autorise Angular et React
public class VisageController {

    private final VisageService visageService;

    public VisageController(VisageService visageService) {
        this.visageService = visageService;
    }

    // 1. Récupérer toute la galerie
    @GetMapping
    public ResponseEntity<List<Visage>> listerVisages() {
        return ResponseEntity.ok(visageService.obtenirTousLesVisages());
    }

    // 2. Ajouter un nouveau visage (Upload multipart)
    @PostMapping("/ajouter")
    public ResponseEntity<?> ajouterVisage(
            @RequestParam("nom") String nom,
            @RequestParam("image") MultipartFile image) {
        try {
            Visage visage = visageService.ajouterVisage(nom, image);
            return ResponseEntity.status(HttpStatus.CREATED).body(visage);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("Erreur : " + e.getMessage());
        }
    }

    // 3. Supprimer un visage
    @DeleteMapping("/{id}")
    public ResponseEntity<?> supprimerVisage(@PathVariable Long id) {
        try {
            visageService.supprimerVisage(id);
            return ResponseEntity.ok("Visage supprimé avec succès.");
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("Erreur : " + e.getMessage());
        }
    }

    // 4. Modifier un visage (Nom et Chemin)
    @PutMapping("/{id}")
    public ResponseEntity<?> modifierVisage(@PathVariable Long id, @RequestBody Map<String, String> payload) {
        try {
            Visage visage = visageService.modifierVisage(id, payload.get("nom"), payload.get("chemin_image"));
            return ResponseEntity.ok(visage);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("Erreur : " + e.getMessage());
        }
    }
}