package com.thecatalyst.dms.dto;

import jakarta.validation.constraints.NotBlank;

public record CreateCaseNoteRequest(
    @NotBlank(message = "Note body cannot be empty")
    String body
) {}
