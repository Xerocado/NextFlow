package com.nextflow.gasto;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;
import jakarta.persistence.*;

@Entity
@Table(name = "gastos")
public class Gasto {
    @Id private UUID id;
    @Column(name = "estabelecimento_id", nullable = false) private UUID estabelecimentoId;
    @Column(nullable = false, length = 120) private String descricao;
    @Column(nullable = false, precision = 14, scale = 2) private BigDecimal valor;
    @Column(nullable = false) private LocalDate data;
    @Column(length = 60) private String categoria;
    @Column(length = 500) private String observacao;
    @Column(name = "criado_em", nullable = false) private Instant criadoEm;

    protected Gasto() { }

    public Gasto(UUID estabelecimentoId, GastoEntrada entrada, Instant criadoEm) {
        this(UUID.randomUUID(), estabelecimentoId, entrada, criadoEm);
    }

    public Gasto(UUID id, UUID estabelecimentoId, GastoEntrada entrada, Instant criadoEm) {
        this.id = id;
        this.estabelecimentoId = estabelecimentoId;
        this.descricao = entrada.descricao().strip();
        this.valor = entrada.valor().setScale(2, RoundingMode.UNNECESSARY);
        this.data = entrada.data();
        this.categoria = opcional(entrada.categoria());
        this.observacao = opcional(entrada.observacao());
        this.criadoEm = criadoEm;
    }

    private static String opcional(String valor) { return valor == null || valor.isBlank() ? null : valor.strip(); }

    public GastoResposta resposta() { return new GastoResposta(id, descricao, valor, data, categoria, observacao); }
}
