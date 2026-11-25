package com.nexgate.order.service;

import com.nexgate.order.dto.CreateOrderRequest;
import com.nexgate.order.dto.OrderResponse;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class OrderService {
    private final Map<String, OrderResponse> orders = new ConcurrentHashMap<>();

    public OrderResponse create(CreateOrderRequest request) {
        String id = "order-" + UUID.randomUUID().toString().substring(0, 8);
        List<OrderResponse.Item> items = request.items().stream()
                .map(item -> new OrderResponse.Item(item.productId(), item.quantity()))
                .toList();
        OrderResponse order = new OrderResponse(id, request.customerId(), items, request.note(), "CREATED", Instant.now());
        orders.put(id, order);
        return order;
    }

    public OrderResponse findById(String id) {
        OrderResponse order = orders.get(id);
        if (order == null) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Order not found");
        return order;
    }

    public List<OrderResponse> findAll() {
        return orders.values().stream().sorted(java.util.Comparator.comparing(OrderResponse::createdAt).reversed()).toList();
    }
}
