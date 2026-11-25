package com.nexgate.catalog.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;

public record CreateProductRequest(
        @NotBlank @Size(max = 200) String name,
        @Size(max = 1000) String description,
        @DecimalMin("0.01") BigDecimal price,
        @Min(0) int stock
) {}
