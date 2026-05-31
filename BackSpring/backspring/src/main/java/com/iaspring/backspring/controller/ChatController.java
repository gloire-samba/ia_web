package com.iaspring.backspring.controller;

import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.iaspring.backspring.dto.ChatRequest;
import com.iaspring.backspring.dto.ChatResponse;
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

    @PostMapping
    public ChatResponse processChat(@RequestBody ChatRequest request) {
        // On reçoit d'Angular, on passe au Service (qui envoie à Python), et on renvoie le résultat
        return iaRelayService.sendToPython(request);
    }
}