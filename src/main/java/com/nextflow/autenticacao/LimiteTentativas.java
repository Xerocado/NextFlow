package com.nextflow.autenticacao;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.HashMap;
import java.util.Map;
import org.springframework.stereotype.Component;

@Component
public class LimiteTentativas {
    private static final Duration JANELA = Duration.ofMinutes(15);
    private final Map<String, Janela> tentativas = new HashMap<>();
    private final Clock clock;

    public LimiteTentativas(Clock clock) { this.clock = clock; }

    public synchronized boolean permitir(String chave, int limite) {
        Instant agora = clock.instant();
        tentativas.entrySet().removeIf(entry -> !entry.getValue().fim.isAfter(agora));
        Janela janela = tentativas.get(chave);
        if (janela == null) {
            if (tentativas.size() >= 5000) { return false; }
            janela = new Janela(agora.plus(JANELA));
            tentativas.put(chave, janela);
        }
        return ++janela.quantidade <= limite;
    }

    private static class Janela {
        private final Instant fim;
        private int quantidade;
        Janela(Instant fim) { this.fim = fim; }
    }
}
