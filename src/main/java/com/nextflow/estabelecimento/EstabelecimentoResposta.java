package com.nextflow.estabelecimento;

import java.util.UUID;

public record EstabelecimentoResposta(UUID id, String nome, boolean ativo, String moeda, String fuso, DadosEmpresa dados) {
    public EstabelecimentoResposta(UUID id, String nome, boolean ativo, String moeda, String fuso) {
        this(id, nome, ativo, moeda, fuso, null);
    }
    static EstabelecimentoResposta de(Estabelecimento estabelecimento) {
        return new EstabelecimentoResposta(estabelecimento.getId(), estabelecimento.getNome(),
                estabelecimento.isAtivo(), estabelecimento.getMoeda(), estabelecimento.getFuso(), estabelecimento.getDados());
    }
}
