package com.iaspring.backspring.config;

import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

import com.iaspring.backspring.entity.Visage;
import com.iaspring.backspring.repository.VisageRepository;

import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.Base64;
import java.util.List;
import java.util.Map;

@Component
public class VisageDataSeeder implements CommandLineRunner {

    private final VisageRepository visageRepository;
    private final Path dossierStockage = Paths.get("uploads/visages");
    
    private final RestTemplate restTemplate = new RestTemplate();
    private final String PYTHON_API_URL = "https://elgronaldo-web-ia.hf.space/api/visages/ajouter";

    public VisageDataSeeder(VisageRepository visageRepository) {
        this.visageRepository = visageRepository;
    }

    @Override
    public void run(String... args) throws Exception {
        if (visageRepository.count() > 0) {
            System.out.println("✅ Base de données Visages déjà initialisée.");
            return;
        }

        System.out.println("🌱 Démarrage de l'auto-amorçage : Téléchargement dynamique de 50 visages...");
        Files.createDirectories(dossierStockage);

        try {
            // 👉 AJOUT DE "&nat=fr,us,gb" POUR ÉVITER LES CARACTÈRES NON-LATINS
            String url = "https://randomuser.me/api/?results=50&inc=name,picture&nat=fr,us,gb";
            
            // 👉 UTILISATION DE Map.class AU LIEU DE JsonNode (Zéro bug de conversion)
            @SuppressWarnings("unchecked")
            Map<String, Object> response = restTemplate.getForObject(url, Map.class);
            
            if (response != null && response.containsKey("results")) {
                @SuppressWarnings("unchecked")
                List<Map<String, Object>> results = (List<Map<String, Object>>) response.get("results");
                
                for (Map<String, Object> user : results) {
                    @SuppressWarnings("unchecked")
                    Map<String, String> nameObj = (Map<String, String>) user.get("name");
                    String prenom = nameObj.get("first");
                    String nomFamille = nameObj.get("last");
                    String nomComplet = prenom + " " + nomFamille;

                    @SuppressWarnings("unchecked")
                    Map<String, String> picObj = (Map<String, String>) user.get("picture");
                    String imageUrl = picObj.get("large");

                    String nomFichier = nomComplet.toLowerCase().replace(" ", "_") + ".jpg";
                    Path cheminCible = dossierStockage.resolve(nomFichier);

                    byte[] imageBytes = restTemplate.getForObject(imageUrl, byte[].class);
                    if (imageBytes != null) {
                        Files.write(cheminCible, imageBytes);

                        Visage v = new Visage();
                        v.setNom(nomComplet);
                        v.setCheminImage(cheminCible.toAbsolutePath().toString());
                        Visage visageSauvegarde = visageRepository.save(v);
                        
                        try {
                            String base64Image = Base64.getEncoder().encodeToString(imageBytes);
                            Map<String, Object> requestBody = Map.of(
                                "id_visage", visageSauvegarde.getId(),
                                "image_base64", base64Image, 
                                "nom_personne", nomComplet
                            );
                            restTemplate.postForEntity(PYTHON_API_URL, requestBody, String.class);
                            System.out.println("➕ Visage téléchargé et encodé : " + nomComplet);
                        } catch (Exception e) {
                            System.err.println("⚠️ Erreur FAISS pour " + nomComplet + " : " + e.getMessage());
                        }
                    }
                }
                System.out.println("✅ 50 visages ont été téléchargés et synchronisés !");
            }
        } catch (Exception e) {
            System.err.println("⚠️ Erreur réseau lors du téléchargement : " + e.getMessage());
        }
    }
}