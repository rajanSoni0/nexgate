package com.nexgate.catalog.controller;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class CatalogSlowController {
    @GetMapping("/api/catalog/delay")
    public String delay(@RequestParam(defaultValue = "1500") long ms) throws InterruptedException {
        long safeMs = Math.max(0, Math.min(ms, 30_000));
        Thread.sleep(safeMs);
        return "Delayed " + safeMs + "ms";
    }
}
