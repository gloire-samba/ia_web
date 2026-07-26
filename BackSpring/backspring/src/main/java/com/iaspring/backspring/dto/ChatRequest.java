package com.iaspring.backspring.dto;

import java.util.List;

public record ChatRequest(
    String prompt,
    List<AttachedFile> fichiers
) {
    public record AttachedFile(
        String file_name,
        String file_base64
    ) {}
}