package com.iaspring.backspring.dto;

public record ChatRequest(
    String prompt,
    String file_name,
    String file_base64
) {}