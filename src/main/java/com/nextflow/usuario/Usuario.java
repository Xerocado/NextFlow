package com.nextflow.usuario;

import java.time.Instant;
import java.util.Locale;
import java.util.UUID;
import jakarta.persistence.*;

@Entity
@Table(name = "usuarios")
public class Usuario {
    @Id
    private UUID id;
    @Column(nullable = false, length = 120)
    private String nome;
    @Column(nullable = false, unique = true, length = 254)
    private String email;
    @Column(name = "senha_hash", nullable = false, length = 100)
    private String senhaHash;
    @Column(name = "versao_credencial", nullable = false)
    private long versaoCredencial;
    @Column(name = "criado_em", nullable = false)
    private Instant criadoEm;

    protected Usuario() { }

    public Usuario(String nome, String email, String senhaHash, Instant criadoEm) {
        this.id = UUID.randomUUID();
        this.nome = nome.trim();
        this.email = normalizarEmail(email);
        this.senhaHash = senhaHash;
        this.criadoEm = criadoEm;
    }

    public static String normalizarEmail(String email) {
        return email.trim().toLowerCase(Locale.ROOT);
    }

    public void redefinirSenha(String hash) {
        senhaHash = hash;
        versaoCredencial++;
    }

    public UUID getId() { return id; }
    public String getNome() { return nome; }
    public String getEmail() { return email; }
    public String getSenhaHash() { return senhaHash; }
    public long getVersaoCredencial() { return versaoCredencial; }
}
