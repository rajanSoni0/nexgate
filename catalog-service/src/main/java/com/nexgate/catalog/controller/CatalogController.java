package com.nexgate.catalog.controller;

import com.nexgate.catalog.dto.CreateProductRequest;
import com.nexgate.catalog.dto.ProductResponse;
import com.nexgate.catalog.service.CatalogService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/catalog")
public class CatalogController {
    private final CatalogService catalogService;

    public CatalogController(CatalogService catalogService) {
        this.catalogService = catalogService;
    }

    @GetMapping("/products")
    public List<ProductResponse> list() {
        return catalogService.findAll();
    }

    @GetMapping("/products/{id}")
    public ProductResponse get(@PathVariable String id) {
        return catalogService.findById(id);
    }

    @PostMapping("/products")
    public ResponseEntity<ProductResponse> create(@Valid @RequestBody CreateProductRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(catalogService.create(request));
    }
}
