package com.foodbridge.service;

import com.foodbridge.dto.EngineDtos;

import java.util.ArrayList;
import java.util.List;

/**
 * Compact, dependency-free encoding for the factor breakdown snapshot that is
 * persisted alongside every allocation decision.
 */
public final class FactorCodec {

    private static final String FIELD = "\u001F";
    private static final String RECORD = "\u001E";

    private FactorCodec() {
    }

    public static String encode(List<EngineDtos.FactorScore> factors) {
        StringBuilder sb = new StringBuilder();
        for (EngineDtos.FactorScore f : factors) {
            sb.append(f.key()).append(FIELD)
                    .append(f.label()).append(FIELD)
                    .append(f.score()).append(FIELD)
                    .append(f.weight()).append(FIELD)
                    .append(f.contribution()).append(FIELD)
                    .append(f.detail() == null ? "" : f.detail())
                    .append(RECORD);
        }
        return sb.toString();
    }

    public static List<EngineDtos.FactorScore> decode(String encoded) {
        List<EngineDtos.FactorScore> factors = new ArrayList<>();
        if (encoded == null || encoded.isBlank()) {
            return factors;
        }
        for (String record : encoded.split(RECORD)) {
            if (record.isBlank()) {
                continue;
            }
            String[] parts = record.split(FIELD, -1);
            if (parts.length < 6) {
                continue;
            }
            factors.add(new EngineDtos.FactorScore(
                    parts[0], parts[1],
                    Double.parseDouble(parts[2]),
                    Double.parseDouble(parts[3]),
                    Double.parseDouble(parts[4]),
                    parts[5]));
        }
        return factors;
    }
}
