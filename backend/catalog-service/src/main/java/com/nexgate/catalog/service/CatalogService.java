package com.nexgate.catalog.service;

import com.nexgate.catalog.dto.CreateProductRequest;
import com.nexgate.catalog.dto.ProductResponse;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class CatalogService {
    private final Map<String, ProductResponse> products = new ConcurrentHashMap<>();

    public CatalogService() {
        products.put("p-100", new ProductResponse("p-100", "Wireless Mouse", "Compact wireless mouse", java.math.BigDecimal.valueOf(29.99), 50));
        products.put("p-200", new ProductResponse("p-200", "Mechanical Keyboard", "Compact mechanical keyboard", java.math.BigDecimal.valueOf(89.99), 25));
    }

    public List<ProductResponse> findAll() {
        return products.values().stream().sorted(java.util.Comparator.comparing(ProductResponse::id)).toList();
    }

    public ProductResponse findById(String id) {
        ProductResponse product = products.get(id);
        if (product == null) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Product not found");
        return product;
    }

    public ProductResponse create(CreateProductRequest request) {
        String id = "p-" + UUID.randomUUID().toString().substring(0, 8);
        ProductResponse product = new ProductResponse(id, request.name(), request.description(), request.price(), request.stock());
        products.put(id, product);
        return product;
    }
}
