package com.iaspring.backspring.controller;

import com.iaspring.backspring.entity.Utilisateur;
import com.iaspring.backspring.repository.UtilisateurRepository;
import com.iaspring.backspring.security.JwtService;
import jakarta.servlet.http.HttpServletResponse;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import jakarta.servlet.http.Cookie;
import java.io.IOException;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class AuthRestController {

    private final UtilisateurRepository utilisateurRepository;
    private final JwtService jwtService;

    @Data
    public static class LoginRequest {
        private String email;
        private String motDePasse;
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody LoginRequest request) {
        Optional<Utilisateur> optUser = utilisateurRepository.findByEmail(request.getEmail());

        if (optUser.isPresent() && optUser.get().getMotDePasse() != null && optUser.get().getMotDePasse().equals(request.getMotDePasse())) {
            Utilisateur u = optUser.get();
            String token = jwtService.genererToken(u);
            
            Map<String, String> response = new HashMap<>();
            response.put("token", token);
            response.put("role", u.getRole());
            response.put("email", u.getEmail());
            response.put("utilisateurId", String.valueOf(u.getId()));
            return ResponseEntity.ok(response);
        }
        return ResponseEntity.status(401).body(Map.of("error", "Identifiants incorrects"));
    }

    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody Map<String, String> payload) {
        String email = payload.get("email");
        String password = payload.get("motDePasse");

        if (utilisateurRepository.findByEmail(email).isPresent()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Email déjà utilisé."));
        }

        Utilisateur u = Utilisateur.builder()
                .email(email)
                .motDePasse(password)
                .role("ROLE_USER")
                .authProvider("LOCAL")
                .build();
        utilisateurRepository.save(u);

        // Optionnel : Lier un service de mail ici si besoin plus tard

        return ResponseEntity.ok(Map.of("message", "Inscription réussie !"));
    }

    @PostMapping("/reset-password")
    public ResponseEntity<?> resetPassword(@RequestBody Map<String, String> payload) {
        String email = payload.get("email");
        String newPassword = payload.get("newPassword");

        return utilisateurRepository.findByEmail(email).map(user -> {
            user.setMotDePasse(newPassword);
            utilisateurRepository.save(user);
            return ResponseEntity.ok().build();
        }).orElseGet(() -> ResponseEntity.notFound().build());
    }

    @GetMapping("/init-social")
    public void initSocialLogin(@RequestParam String fournisseur, @RequestParam(defaultValue = "angular") String frontend, HttpServletResponse response) throws IOException {
        Cookie cookie = new Cookie("oauth_frontend_origin", frontend);
        cookie.setPath("/");
        cookie.setMaxAge(300); // 5 minutes
        response.addCookie(cookie);
        
        response.sendRedirect("/oauth2/authorization/" + fournisseur);
    }
}