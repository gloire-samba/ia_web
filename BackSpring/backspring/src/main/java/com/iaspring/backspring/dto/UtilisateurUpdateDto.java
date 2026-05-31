package com.iaspring.backspring.dto;

public record UtilisateurUpdateDto(
    String email,
    String motDePasse,
    String role
) {}