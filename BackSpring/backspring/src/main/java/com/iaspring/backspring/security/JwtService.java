package com.iaspring.backspring.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import jakarta.annotation.PostConstruct;
import java.security.Key;
import java.util.Date;
import com.iaspring.backspring.entity.Utilisateur;

@Service
public class JwtService {
    
    // Spring va chercher la variable jwt.secret.key dans tes fichiers properties
    @Value("${jwt.secret}")
    private String secretString;
    
    private Key secretKey;
    private static final long EXPIRATION_TIME = 86400000; // 24 heures

    // Cette méthode s'exécute juste après l'initialisation pour créer la clé
    @PostConstruct
    public void init() {
        this.secretKey = Keys.hmacShaKeyFor(secretString.getBytes());
    }

    public String genererToken(Utilisateur utilisateur) {
        return Jwts.builder()
                .setSubject(utilisateur.getEmail())
                .claim("role", utilisateur.getRole())
                .claim("id", utilisateur.getId())
                .setIssuedAt(new Date())
                .setExpiration(new Date(System.currentTimeMillis() + EXPIRATION_TIME))
                .signWith(secretKey)
                .compact();
    }

    public Claims extraireClaims(String token) {
        return Jwts.parserBuilder()
                .setSigningKey(secretKey)
                .build()
                .parseClaimsJws(token)
                .getBody();
    }
}