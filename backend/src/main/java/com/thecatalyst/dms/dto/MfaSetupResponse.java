package com.thecatalyst.dms.dto;

public record MfaSetupResponse(
        String qrCodeUri,
        String manualCode
) {}
