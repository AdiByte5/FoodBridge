package com.foodbridge.dto;

public final class CommonDtos {

    private CommonDtos() {
    }

    public record CategoryView(Long categoryId, String categoryName, String recommendedStorage, Integer shelfLifeHours) {
    }

    public record MessageResponse(String message) {
    }
}
