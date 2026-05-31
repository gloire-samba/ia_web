package com.iaspring.backspring.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "UTILISATEUR")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Utilisateur {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true, nullable = false, length = 100)
    private String email;

    // Le mot de passe peut être nul pour ceux qui se connectent via Google/Github
    @Column(name = "mot_de_passe", nullable = true)
    private String motDePasse;

    @Builder.Default
    @Column(nullable = false)
    private String role = "ROLE_USER";

    // Pour savoir comment l'utilisateur s'est inscrit (LOCAL, GOOGLE ou GITHUB)
    @Builder.Default
    @Column(name = "auth_provider")
    private String authProvider = "LOCAL";

    @Column(name = "date_inscription")
    private LocalDateTime dateInscription;

    @PrePersist
    protected void onCreate() {
        if (dateInscription == null) {
            dateInscription = LocalDateTime.now();
        }
    }
}