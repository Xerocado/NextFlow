package com.nextflow.cliente;

import java.time.Instant;
import java.util.UUID;
import jakarta.persistence.*;

@Entity
@Table(name = "clientes")
public class Cliente {
    @Id private UUID id;
    @Column(name = "estabelecimento_id", nullable = false, updatable = false) private UUID estabelecimentoId;
    @Column(nullable = false, length = 120) private String nome;
    @Column(length = 30) private String telefone;
    @Column(length = 500) private String observacao;
    @Column(name = "criado_em", nullable = false, updatable = false) private Instant criadoEm;

    protected Cliente() { }

    public Cliente(UUID estabelecimentoId, ClienteEntrada entrada, Instant criadoEm) {
        this.id = UUID.randomUUID();
        this.estabelecimentoId = estabelecimentoId;
        this.criadoEm = criadoEm;
        atualizar(entrada);
    }

    public void atualizar(ClienteEntrada entrada) {
        this.nome = entrada.nome().strip();
        this.telefone = opcional(entrada.telefone());
        this.observacao = opcional(entrada.observacao());
    }

    private static String opcional(String valor) {
        return valor == null || valor.isBlank() ? null : valor.strip();
    }

    public ClienteResposta resposta() { return new ClienteResposta(id, nome, telefone, observacao); }
}
