package com.iaspring.backspring.config;


import java.util.Locale;

import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

import com.github.javafaker.Faker;
import com.iaspring.backspring.entity.Utilisateur;
import com.iaspring.backspring.repository.UtilisateurRepository;

@Component
public class UtilisateurDataSeeder implements CommandLineRunner {

    private final UtilisateurRepository utilisateurRepository;

    public UtilisateurDataSeeder(UtilisateurRepository utilisateurRepository) {
        this.utilisateurRepository = utilisateurRepository;
    }

    @Override
    public void run(String... args) throws Exception {
        // 1. Création de l'Administrateur
        if (utilisateurRepository.findByEmail("admin@ia.com").isEmpty()) {
            Utilisateur admin = new Utilisateur();
            admin.setEmail("admin@ia.com");
            admin.setMotDePasse("admin123"); // Pense à l'encoder avec BCrypt si tu as mis en place la sécurité
            admin.setRole("ROLE_ADMIN");
            utilisateurRepository.save(admin);
            System.out.println("👑 Compte Administrateur (admin@ia.com) créé !");
        }

        // 2. Création de 100 faux utilisateurs si la base est presque vide
        if (utilisateurRepository.count() <= 1) {
            System.out.println("🌱 Génération de 100 utilisateurs fictifs avec Faker...");
            Faker faker = new Faker(new Locale("fr"));

            for (int i = 0; i < 100; i++) {
                Utilisateur fakeUser = new Utilisateur();
                // Génère un email du type: prenom.nom@gmail.com
                String prenom = faker.name().firstName().toLowerCase();
                String nom = faker.name().lastName().toLowerCase().replaceAll(" ", "");
                
                fakeUser.setEmail(prenom + "." + nom + "@" + faker.internet().domainName());
                fakeUser.setMotDePasse("password123");
                fakeUser.setRole("ROLE_USER");
                
                utilisateurRepository.save(fakeUser);
            }
            System.out.println("✅ 100 faux utilisateurs ajoutés.");
        }
    }
}