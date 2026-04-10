package com.iaspring.backspring.services;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import com.iaspring.backspring.dto.ChatRequest;
import com.iaspring.backspring.dto.ChatResponse;

@Service
public class IaRelayService {

    private final RestClient restClient;

    // On injecte l'URL du Python depuis le fichier properties
    public IaRelayService(@Value("${python.api.url}") String pythonApiUrl) {
        this.restClient = RestClient.builder()
                .baseUrl(pythonApiUrl)
                .build();
    }

    public ChatResponse sendToPython(ChatRequest request) {
        // Le RestClient s'occupe de transformer le Record Java en JSON automatiquement
        return restClient.post()
                .body(request)
                .retrieve()
                .body(ChatResponse.class);
    }
}