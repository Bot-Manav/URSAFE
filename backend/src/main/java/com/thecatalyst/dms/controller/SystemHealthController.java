package com.thecatalyst.dms.controller;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.io.File;
import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/health")
public class SystemHealthController {

    private final String storageBasePath;

    public SystemHealthController(@Value("${app.storage.base-path}") String storageBasePath) {
        this.storageBasePath = storageBasePath;
    }

    @GetMapping("/ping")
    public ResponseEntity<Map<String, String>> ping() {
        return ResponseEntity.ok(Map.of(
                "status", "UP",
                "message", "DMS Backend is operational"
        ));
    }

    @PreAuthorize("hasAnyRole('ADMIN', 'SUPERVISOR')")
    @GetMapping("/storage")
    public ResponseEntity<Map<String, Object>> storageHealth() {
        File storageDir = new File(storageBasePath);
        if (!storageDir.exists()) {
            storageDir.mkdirs();
        }

        long totalSpace = storageDir.getTotalSpace();
        long freeSpace = storageDir.getFreeSpace();
        long usedSpace = totalSpace - freeSpace;
        
        double usedPercentage = totalSpace > 0 ? ((double) usedSpace / totalSpace) * 100 : 0;

        Map<String, Object> metrics = new HashMap<>();
        metrics.put("status", "OK");
        metrics.put("storagePath", storageDir.getAbsolutePath());
        metrics.put("totalSpaceBytes", totalSpace);
        metrics.put("usedSpaceBytes", usedSpace);
        metrics.put("freeSpaceBytes", freeSpace);
        metrics.put("usedPercentage", Math.round(usedPercentage * 100.0) / 100.0);
        
        return ResponseEntity.ok(metrics);
    }
}
