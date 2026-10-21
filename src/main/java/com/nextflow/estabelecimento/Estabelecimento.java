package com.nextflow.estabelecimento;

import java.time.Instant;
import java.util.UUID;
import jakarta.persistence.*;

@Entity
@Table(name = "estabelecimentos")
public class Estabelecimento {
    @Id private UUID id;
    @Column(nullable = false, length = 120) private String nome;
    @Column(nullable = false) private boolean ativo;
    @Column(nullable = false, length = 3) private String moeda;
    @Column(nullable = false, length = 60) private String fuso;
    @Column(name = "criado_em", nullable = false) private Instant criadoEm;

    @Column(length = 30) private String atividade;
    @Column(length = 30) private String telefone;
    @Column(length = 9) private String cep;
    @Column(length = 150) private String logradouro;
    @Column(length = 20) private String numero;
    @Column(length = 100) private String complemento;
    @Column(length = 100) private String bairro;
    @Column(length = 100) private String cidade;
    @Column(length = 2) private String uf;
    @Column(name = "sem_numero", nullable = false) private boolean semNumero;

    protected Estabelecimento() { }

    public Estabelecimento(String nome, Instant criadoEm) {
        if (nome == null || nome.isBlank() || nome.length() > 120) {
            throw new IllegalArgumentException("Informe um nome com ate 120 caracteres.");
        }
        this.id = UUID.randomUUID();
        this.nome = nome.strip();
        this.ativo = true;
        this.moeda = "BRL";
        this.fuso = "America/Sao_Paulo";
        this.criadoEm = criadoEm;
    }

    public void atualizarDados(DadosEmpresa dados) {
        this.atividade = dados.atividade() == null ? null : dados.atividade().strip();
        this.telefone = dados.telefone() == null ? null : dados.telefone().strip();
        this.cep = dados.cep() == null ? null : dados.cep().strip();
        this.logradouro = dados.logradouro() == null ? null : dados.logradouro().strip();
        this.numero = dados.numero() == null ? null : dados.numero().strip();
        this.complemento = dados.complemento() == null ? null : dados.complemento().strip();
        this.bairro = dados.bairro() == null ? null : dados.bairro().strip();
        this.cidade = dados.cidade() == null ? null : dados.cidade().strip();
        this.uf = dados.uf() == null ? null : dados.uf().strip();
        this.semNumero = dados.semNumero();
        if (semNumero) this.numero = null;
    }

    public DadosEmpresa getDados() {
        return atividade == null ? null : new DadosEmpresa(atividade, telefone, cep, logradouro, numero, complemento, bairro, cidade, uf, semNumero);
    }

    public UUID getId() { return id; }
    public void renomear(String nome) {
        if (nome == null || nome.isBlank() || nome.length() > 120) {
            throw new IllegalArgumentException("Informe um nome com ate 120 caracteres.");
        }
        this.nome = nome.strip();
    }
    public String getNome() { return nome; }
    public boolean isAtivo() { return ativo; }
    public String getMoeda() { return moeda; }
    public String getFuso() { return fuso; }
}
