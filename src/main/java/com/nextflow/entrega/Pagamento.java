package com.nextflow.entrega;
import java.math.BigDecimal;
import java.time.*;
import java.util.UUID;
import jakarta.persistence.*;
@Entity @Table(name="pagamentos_entrega")
public class Pagamento {
    @Id private UUID id;
    @Column(name="estabelecimento_id", nullable=false) private UUID estabelecimentoId;
    @Column(name="entrega_id", nullable=false) private UUID entregaId;
    @Column(nullable=false) private LocalDate data;
    @Column(nullable=false, precision=14, scale=2) private BigDecimal valor;
    @Column(name="criado_em", nullable=false) private Instant criadoEm;
    protected Pagamento() { }
    Pagamento(UUID empresa, UUID entrega, PagamentoEntrada e, Instant agora) {
        id=UUID.randomUUID(); estabelecimentoId=empresa; entregaId=entrega;
        data=e.data(); valor=e.valor().setScale(2); criadoEm=agora;
    }
    public Resposta resposta() { return new Resposta(id, entregaId, data, valor); }
    public record Resposta(UUID id, UUID entregaId, LocalDate data, BigDecimal valor) { }
}
