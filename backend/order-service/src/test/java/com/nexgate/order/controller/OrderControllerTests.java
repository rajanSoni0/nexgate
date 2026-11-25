package com.nexgate.order.controller;

import com.nexgate.order.service.OrderService;
import org.junit.jupiter.api.Test;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class OrderControllerTests {
    private final MockMvc mvc = MockMvcBuilders.standaloneSetup(
            new OrderController(new OrderService())).build();

    @Test
    void createsAndListsOrders() throws Exception {
        mvc.perform(post("/api/orders")
                        .contentType("application/json")
                        .content("{\"customerId\":\"customer-1\",\"note\":\"Demo\",\"items\":[{\"productId\":\"p-100\",\"quantity\":2}]}"))
                .andExpect(status().isCreated());
        mvc.perform(get("/api/orders")).andExpect(status().isOk());
    }

    @Test
    void validatesMissingCustomerAndQuantityAndRejectsUnknownOrder() throws Exception {
        mvc.perform(post("/api/orders")
                        .contentType("application/json")
                        .content("{\"customerId\":\"\",\"items\":[{\"productId\":\"p-100\",\"quantity\":0}]}"))
                .andExpect(status().isBadRequest());
        mvc.perform(get("/api/orders/missing")).andExpect(status().isNotFound());
    }
}
