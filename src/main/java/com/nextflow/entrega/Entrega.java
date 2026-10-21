package com.nextflow.entrega;
import java.math.*;
import java.time.*;
import java.util.UUID;
import jakarta.persistence.*;
@Entity @Table(name="entregas")
public class Entrega {
    @Id private UUID id;
    @Column(name="estabelecimento_id", nullable=false) private UUID estabelecimentoId;
    @Column(name="cliente_id") private UUID clienteId;
    @Column(length=120) private String identificacao;
    @Column(nullable=false) private LocalDate data;
    @Column(nullable=false) private int litros;
    @Column(name="valor_total", nullable=false, precision=14, scale=2) private BigDecimal valorTotal;
    @Column(name="valor_pago", nullable=false, precision=14, scale=2) private BigDecimal valorPago;
    @Column(name="sem_cobranca", nullable=false) private boolean semCobranca;
    @Column(length=500) private String motivo;
    @Column(name="criado_em", nullable=false) private Instant criadoEm;
    protected Entrega() { }
    Entrega(UUID empresa, EntregaEntrada e, String identificacao, Instant agora) {
        id=UUID.randomUUID(); estabelecimentoId=empresa; clienteId=e.clienteId();
        this.identificacao=identificacao; data=e.data(); litros=e.litros().intValueExact();
        valorTotal=e.valorTotal().setScale(2, RoundingMode.UNNECESSARY);
        valorPago=new BigDecimal("0.00"); semCobranca=e.semCobranca();
        motivo=e.motivo()==null || e.motivo().isBlank()?null:e.motivo().strip(); criadoEm=agora;
    }
    void receber(PagamentoEntrada e, LocalDate hoje) {
        if(e.data().isAfter(hoje))
            throw new IllegalArgumentException("Pagamento nao pode ter data futura.");
        if(semCobranca || e.valor().compareTo(saldo())>0)
            throw new IllegalArgumentException("Pagamento supera o saldo pendente; nao gera credito.");
        valorPago=valorPago.add(e.valor()).setScale(2, RoundingMode.UNNECESSARY);
    }
    BigDecimal saldo() { return semCobranca?new BigDecimal("0.00"):valorTotal.subtract(valorPago); }
    UUID id() { return id; }
    public Resposta resposta() { return new Resposta(id, clienteId, identificacao, data, litros, valorTotal, valorPago, saldo(), semCobranca, motivo); }
    public record Resposta(UUID id, UUID clienteId, String identificacao, LocalDate data, int litros,
            BigDecimal valorTotal, BigDecimal valorPago, BigDecimal saldoPendente, boolean semCobranca, String motivo) { }
}
