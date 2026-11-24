package com.nexgate.order.dto;

import java.time.Instant;
import java.util.List;

public record OrderResponse(String id, String customerId, List<Item> items, String note,
                            String status, Instant createdAt) {
    public record Item(String productId, int quantity) {}
}
