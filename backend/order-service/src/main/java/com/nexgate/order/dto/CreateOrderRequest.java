package com.nexgate.order.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;

import java.util.List;

public record CreateOrderRequest(
        @NotBlank @Size(max = 100) String customerId,
        @NotEmpty List<@Valid OrderItemRequest> items,
        @Size(max = 1000) String note
) {
    public record OrderItemRequest(
            @NotBlank @Size(max = 100) String productId,
            @Min(1) int quantity
    ) {}
}
