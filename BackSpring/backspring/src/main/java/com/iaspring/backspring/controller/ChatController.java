package com.iaspring.backspring.controller;

import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.iaspring.backspring.dto.ChatRequest;
import com.iaspring.backspring.dto.StatusResponse;
import com.iaspring.backspring.dto.TicketResponse;
import com.iaspring.backspring.service.IaRelayService;

@RestController
@RequestMapping("/api/chat")
// INDISPENSABLE : Autorise Angular ET React à communiquer
@CrossOrigin(origins = {"http://localhost:4200", "http://localhost:5173"})
public class ChatController {

    private final IaRelayService iaRelayService;

    public ChatController(IaRelayService iaRelayService) {
        this.iaRelayService = iaRelayService;
    }

    /**
     * ÉTAPE 1 : Reçoit la demande d'Angular/React, lance l'IA et renvoie un TICKET instantanément.
     * Route : POST http://localhost:8080/api/chat
     */
    @PostMapping
    public TicketResponse processChat(@RequestBody ChatRequest request) {
        return iaRelayService.startIaTask(request);
    }

    /**
     * ÉTAPE 2 : Guichet de vérification interrogé par Angular/React toutes les 4 secondes.
     * Route : GET http://localhost:8080/api/chat/status/{ticketId}
     */
    @GetMapping("/status/{ticketId}")
    public StatusResponse getTaskStatus(@PathVariable String ticketId) {
        return iaRelayService.checkTaskStatus(ticketId);
    }
}