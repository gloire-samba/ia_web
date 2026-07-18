package com.iaspring.backspring.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.multipart.MultipartFile;

import com.iaspring.backspring.entity.Visage;
import com.iaspring.backspring.repository.VisageRepository;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.Base64;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Service
public class VisageService {

    private final VisageRepository visageRepository;
    private final Path dossierStockage = Paths.get("uploads/visages");
    private final RestTemplate restTemplate = new RestTemplate();
    
    // 👉 NOUVEAU : On stocke l'URL dynamique nettoyée
    private final String iaBaseUrl; 

    // 👉 CORRECTION : On injecte l'URL depuis application.properties
    public VisageService(VisageRepository visageRepository, @Value("${python.api.url}") String pythonApiUrl) {
        this.visageRepository = visageRepository;
        try {
            Files.createDirectories(dossierStockage);
        } catch (IOException e) {
            throw new RuntimeException("Impossible de créer le dossier Visages.", e);
        }
        
        // Nettoyage de l'URL pour pointer sur la racine de l'IA
        String baseUrl = pythonApiUrl;
        if (pythonApiUrl.endsWith("/api/chat")) {
            baseUrl = pythonApiUrl.replace("/api/chat", "");
        }
        this.iaBaseUrl = baseUrl;
    }

    // ==============================================================================
    // 🔄 SYNCHRONISATION AUTOMATIQUE AU DÉMARRAGE
    // ==============================================================================
    @EventListener(ApplicationReadyEvent.class)
    public void synchroniserFaissAuDemarrage() {
        List<Visage> visages = visageRepository.findAll();
        
        if (visages.isEmpty()) {
            System.out.println("ℹ️ Aucun visage en base de données. L'IA restera vide.");
            return;
        }

        System.out.println("🔄 Démarrage de la synchronisation de " + visages.size() + " visage(s) vers l'IA...");

        for (Visage visage : visages) {
            try {
                Path cheminCible = Paths.get(visage.getCheminImage());
                
                if (Files.exists(cheminCible)) {
                    byte[] fileContent = Files.readAllBytes(cheminCible);
                    String base64Image = Base64.getEncoder().encodeToString(fileContent);

                    Map<String, Object> requestBody = Map.of(
                        "id_visage", visage.getId(),
                        "image_base64", base64Image,
                        "nom_personne", visage.getNom()
                    );
                    
                    // 👉 CORRECTION : Utilisation de iaBaseUrl
                    restTemplate.postForEntity(iaBaseUrl + "/api/visages/ajouter", requestBody, String.class);
                    System.out.println("✅ Synchronisé : " + visage.getNom());
                } else {
                    System.err.println("⚠️ Image physique introuvable pour : " + visage.getNom());
                }
            } catch (Exception e) {
                System.err.println("❌ Échec de la synchro pour " + visage.getNom() + " : " + e.getMessage());
            }
        }
        System.out.println("🚀 Synchronisation FAISS terminée avec succès !");
    }

    // ==============================================================================
    // MÉTHODES CRUD CLASSIQUES
    // ==============================================================================

    public List<Visage> obtenirTousLesVisages() {
        return visageRepository.findAll();
    }

    public Visage ajouterVisage(String nom, MultipartFile fichier) throws IOException {
        if (fichier.isEmpty()) throw new IllegalArgumentException("Le fichier est vide.");

        String nomFichier = nom.toLowerCase().replace(" ", "_") + ".jpg";
        Path cheminCible = dossierStockage.resolve(nomFichier);
        Files.copy(fichier.getInputStream(), cheminCible, StandardCopyOption.REPLACE_EXISTING);
        
        // 1. On sauvegarde dans Spring
        Visage nouveauVisage = new Visage();
        nouveauVisage.setNom(nom);
        nouveauVisage.setCheminImage(cheminCible.toAbsolutePath().toString());
        Visage visageSauvegarde = visageRepository.save(nouveauVisage);

        // 2. On encode en Base64 et on envoie à l'IA
        try {
            byte[] fileContent = Files.readAllBytes(cheminCible);
            String base64Image = Base64.getEncoder().encodeToString(fileContent);

            Map<String, Object> requestBody = Map.of(
                "id_visage", visageSauvegarde.getId(),
                "image_base64", base64Image,
                "nom_personne", nom
            );
            // 👉 CORRECTION : Utilisation de iaBaseUrl
            restTemplate.postForEntity(iaBaseUrl + "/api/visages/ajouter", requestBody, String.class);
        } catch (Exception e) {
            System.err.println("⚠️ Erreur FAISS lors de l'ajout : " + e.getMessage());
        }

        return visageSauvegarde;
    }

    public void supprimerVisage(Long id) {
        Optional<Visage> visageOpt = visageRepository.findById(id);
        if (visageOpt.isPresent()) {
            try {
                Files.deleteIfExists(Paths.get(visageOpt.get().getCheminImage()));
            } catch (IOException e) {
                System.err.println("Erreur suppression fichier physique : " + e.getMessage());
            }
            
            visageRepository.deleteById(id);
            
            try {
                // 👉 CORRECTION : Utilisation de iaBaseUrl
                restTemplate.delete(iaBaseUrl + "/api/visages/supprimer/" + id);
                System.out.println("✅ Vecteur ID " + id + " supprimé de l'IA avec succès.");
            } catch (Exception e) {
                System.err.println("⚠️ Erreur FAISS lors de la suppression : " + e.getMessage());
            }
        }
    }

    public Visage modifierVisage(Long id, String nouveauNom, String nouveauChemin) {
        Visage visage = visageRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("Visage introuvable"));
            
        if (nouveauNom != null && !nouveauNom.isEmpty()) visage.setNom(nouveauNom);
        if (nouveauChemin != null && !nouveauChemin.isEmpty()) visage.setCheminImage(nouveauChemin);
        
        return visageRepository.save(visage);
    }
}