package com.nextflow.compartilhado.idempotencia;

import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Clock;
import java.sql.Timestamp;
import java.lang.reflect.InvocationTargetException;
import java.lang.reflect.RecordComponent;
import java.nio.charset.StandardCharsets;
import java.util.UUID;
import java.util.function.Function;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

@Service
public class OperacaoIdempotente {
    private final JdbcTemplate jdbc;
    private final Clock clock;

    public OperacaoIdempotente(JdbcTemplate jdbc, Clock clock) {
        this.jdbc = jdbc;
        this.clock = clock;
    }

    public <T> T executar(UUID empresa, String operacao, UUID chave, Object contexto, Object entrada,
            Function<UUID, T> criar, Function<UUID, T> consultar) {
        if (chave == null) return criar.apply(UUID.randomUUID());
        UUID resultado = UUID.randomUUID();
        String hash = hash(contexto, entrada);
        int inseridas = jdbc.update("""
                INSERT INTO operacoes_idempotentes
                    (estabelecimento_id, operacao, chave, hash_requisicao, resultado_id, criado_em)
                VALUES (?, ?, ?, ?, ?, ?)
                ON CONFLICT (estabelecimento_id, operacao, chave) DO NOTHING
                """, empresa, operacao, chave, hash, resultado, Timestamp.from(clock.instant()));
        if (inseridas == 1) return criar.apply(resultado);

        var registro = jdbc.query("""
                SELECT hash_requisicao, resultado_id FROM operacoes_idempotentes
                WHERE estabelecimento_id = ? AND operacao = ? AND chave = ?
                """, rs -> rs.next() ? new Registro(rs.getString("hash_requisicao"), rs.getObject("resultado_id", UUID.class)) : null,
                empresa, operacao, chave);
        if (registro == null) throw new IllegalStateException("Registro idempotente nao encontrado.");
        if (!MessageDigest.isEqual(hash.getBytes(StandardCharsets.US_ASCII),
                registro.hash().getBytes(StandardCharsets.US_ASCII))) {
            throw new ConflitoIdempotenciaException();
        }
        T resposta = consultar.apply(registro.resultadoId());
        if (resposta == null) throw new IllegalStateException("Resultado idempotente nao encontrado.");
        return resposta;
    }

    private String hash(Object contexto, Object entrada) {
        try {
            byte[] impressao = (canonico(contexto) + canonico(entrada)).getBytes(StandardCharsets.UTF_8);
            return java.util.HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(impressao));
        } catch (NoSuchAlgorithmException exception) {
            throw new IllegalStateException("SHA-256 indisponivel.", exception);
        }
    }

    private String canonico(Object valor) {
        if (valor == null) return "N;";
        Class<?> tipo = valor.getClass();
        if (!tipo.isRecord()) return tipo.getName() + ':' + valor.toString().length() + ':' + valor + ';';
        StringBuilder resultado = new StringBuilder(tipo.getName()).append('{');
        for (RecordComponent campo : tipo.getRecordComponents()) {
            resultado.append(campo.getName()).append('=').append(canonico(valorDo(campo, valor)));
        }
        return resultado.append("};").toString();
    }

    private Object valorDo(RecordComponent campo, Object registro) {
        try {
            return campo.getAccessor().invoke(registro);
        } catch (IllegalAccessException | InvocationTargetException exception) {
            throw new IllegalStateException("Nao foi possivel identificar a requisicao.", exception);
        }
    }

    private record Registro(String hash, UUID resultadoId) { }
}
