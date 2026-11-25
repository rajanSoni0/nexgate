package com.nexgate.catalog.controller;

import com.nexgate.catalog.service.CatalogService;
import org.junit.jupiter.api.Test;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class CatalogControllerTests {
    private final MockMvc mvc = MockMvcBuilders.standaloneSetup(
            new CatalogController(new CatalogService())).build();

    @Test
    void listsProductsAndGetsKnownProduct() throws Exception {
        mvc.perform(get("/api/catalog/products")).andExpect(status().isOk());
        mvc.perform(get("/api/catalog/products/p-100")).andExpect(status().isOk());
    }

    @Test
    void unknownProductReturns404AndInvalidCreateReturns400() throws Exception {
        mvc.perform(get("/api/catalog/products/missing")).andExpect(status().isNotFound());
        mvc.perform(post("/api/catalog/products")
                        .contentType("application/json")
                        .content("{\"name\":\"\",\"price\":-1,\"stock\":-1}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void createsProduct() throws Exception {
        mvc.perform(post("/api/catalog/products")
                        .contentType("application/json")
                        .content("{\"name\":\"USB Hub\",\"description\":\"Four ports\",\"price\":19.99,\"stock\":10}"))
                .andExpect(status().isCreated());
    }
}
