package com.iaspring.backspring.dto;

import java.time.LocalDateTime;

public record UtilisateurDto(
    Long id,
    String email,
    String role,
    String authProvider,
    LocalDateTime dateInscription
) {}