package com.iaspring.backspring.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestClient;

import com.iaspring.backspring.dto.ChatRequest;
import com.iaspring.backspring.dto.StatusResponse;
import com.iaspring.backspring.dto.TicketResponse;

@Service
public class IaRelayService {

    private final RestClient restClient;

    // On injecte l'URL du Python depuis le fichier properties
    public IaRelayService(@Value("${python.api.url}") String pythonApiUrl) {
        
        // 👉 CORRECTION ICI : On nettoie l'URL pour éviter "/api/chat/api/status/..."
        String baseUrl = pythonApiUrl;
        if (pythonApiUrl.endsWith("/api/chat")) {
            baseUrl = pythonApiUrl.replace("/api/chat", "");
        }

        this.restClient = RestClient.builder()
                .baseUrl(baseUrl)
                .build();
    }

    /**
     * 1. LANCE LA TÂCHE : Envoie le prompt et le fichier à Python et reçoit le ticket en < 0.5 seconde.
     */
    public TicketResponse startIaTask(ChatRequest request) {
        try {
            return restClient.post()
                    .uri("/api/chat")
                    .body(request)
                    .retrieve()
                    .body(TicketResponse.class);
        } catch (Exception e) {
            return new TicketResponse(
                "error", 
                "erreur", 
                "Erreur de communication au démarrage avec le microservice IA : " + e.getMessage()
            );
        }
    }

    /**
     * 2. VÉRIFIE LE STATUT (Anti-Rage Quit) : Appelée toutes les 4 secondes par Angular/React.
     */
    public StatusResponse checkTaskStatus(String ticketId) {
        try {
            return restClient.get()
                    .uri("/api/status/" + ticketId)
                    .retrieve()
                    .body(StatusResponse.class);
                    
        } catch (HttpClientErrorException.NotFound e) {
            // ❌ Erreur 404 : Le conteneur HF a redémarré et perdu la tâche en mémoire RAM.
            return new StatusResponse(
                ticketId, 
                "erreur", 
                null, null, null, 
                "Le serveur IA a redémarré pendant le traitement et a perdu la tâche. Veuillez relancer votre demande."
            );
            
        } catch (Exception e) {
            // ⏳ Autres erreurs (Timeout, 503, coupure réseau) : On force le front à ATTENDRE !
            return new StatusResponse(
                ticketId, 
                "en_cours", // 👈 C'est ce mot magique qui empêche le rage-quit d'Angular/React !
                "Connexion temporairement ralentie avec le Cloud IA...", 
                null, null, null
            );
        }
    }
}