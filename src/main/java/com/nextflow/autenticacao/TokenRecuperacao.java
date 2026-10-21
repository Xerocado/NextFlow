package com.nextflow.autenticacao;

import java.time.Instant;
import java.util.UUID;
import jakarta.persistence.*;

@Entity
@Table(name = "tokens_recuperacao_senha")
public class TokenRecuperacao {
    @Id
    private UUID id;
    @Column(name = "usuario_id", nullable = false)
    private UUID usuarioId;
    @Column(name = "token_hash", nullable = false, unique = true, length = 64)
    private String tokenHash;
    @Column(name = "expira_em", nullable = false)
    private Instant expiraEm;
    @Column(name = "tentativas_invalidas", nullable = false)
    private int tentativasInvalidas;

    protected TokenRecuperacao() { }

    public TokenRecuperacao(UUID usuarioId, String tokenHash, Instant expiraEm) {
        this.id = UUID.randomUUID();
        this.usuarioId = usuarioId;
        this.tokenHash = tokenHash;
        this.expiraEm = expiraEm;
    }

    public UUID getUsuarioId() { return usuarioId; }
    String getTokenHash() { return tokenHash; }
    public boolean bloqueado() { return tentativasInvalidas >= 5; }
    public void registrarErro() { if (!bloqueado()) tentativasInvalidas++; }
    public boolean validoEm(Instant agora) { return expiraEm.isAfter(agora); }
}
