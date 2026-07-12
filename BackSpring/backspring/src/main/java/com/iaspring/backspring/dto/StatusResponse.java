package com.iaspring.backspring.dto;

public record StatusResponse(
    String ticket_id,
    String status,
    String text,
    String output_file_name,
    String output_file_base64,
    String error
) {}