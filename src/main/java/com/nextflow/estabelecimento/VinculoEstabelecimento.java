package com.nextflow.estabelecimento;

import java.time.Instant;
import java.util.UUID;
import jakarta.persistence.*;

@Entity
@Table(name = "vinculos_estabelecimento",
        uniqueConstraints = @UniqueConstraint(columnNames = {"usuario_id", "estabelecimento_id"}))
public class VinculoEstabelecimento {
    public enum Papel { PROPRIETARIO }

    @Id private UUID id;
    @Column(name = "usuario_id", nullable = false) private UUID usuarioId;
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "estabelecimento_id", nullable = false)
    private Estabelecimento estabelecimento;
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30) private Papel papel;
    @Column(name = "criado_em", nullable = false) private Instant criadoEm;

    protected VinculoEstabelecimento() { }

    public VinculoEstabelecimento(UUID usuarioId, Estabelecimento estabelecimento, Instant criadoEm) {
        this.id = UUID.randomUUID();
        this.usuarioId = usuarioId;
        this.estabelecimento = estabelecimento;
        this.papel = Papel.PROPRIETARIO;
        this.criadoEm = criadoEm;
    }
}
