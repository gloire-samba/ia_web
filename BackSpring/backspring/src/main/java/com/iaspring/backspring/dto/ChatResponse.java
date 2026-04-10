package com.iaspring.backspring.dto;

public record ChatResponse(
    String text,
    String output_file_name,
    String output_file_base64
) {}
