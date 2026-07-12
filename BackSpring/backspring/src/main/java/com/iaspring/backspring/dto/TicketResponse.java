package com.iaspring.backspring.dto;

public record TicketResponse(
    String ticket_id,
    String status,
    String message
) {}