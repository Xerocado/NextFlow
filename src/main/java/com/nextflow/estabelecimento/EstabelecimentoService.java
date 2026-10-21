package com.nextflow.estabelecimento;

import java.time.Clock;
import java.util.*;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class EstabelecimentoService {
    private final EstabelecimentoRepository estabelecimentos;
    private final VinculoEstabelecimentoRepository vinculos;
    private final Clock clock;

    public EstabelecimentoService(EstabelecimentoRepository estabelecimentos,
            VinculoEstabelecimentoRepository vinculos, Clock clock) {
        this.estabelecimentos = estabelecimentos;
        this.vinculos = vinculos;
        this.clock = clock;
    }

    @Transactional
    public EstabelecimentoResposta criar(UUID usuarioId, String nome) {
        var agora = clock.instant();
        var estabelecimento = estabelecimentos.save(new Estabelecimento(nome, agora));
        vinculos.save(new VinculoEstabelecimento(usuarioId, estabelecimento, agora));
        return EstabelecimentoResposta.de(estabelecimento);
    }

    @Transactional(readOnly = true)
    public Pagina listar(UUID usuarioId, int pagina, int tamanho) {
        if (pagina < 0 || tamanho < 1 || tamanho > 100) {
            throw new IllegalArgumentException("Use pagina a partir de zero e tamanho entre 1 e 100.");
        }
        var resultado = estabelecimentos.listarDoUsuario(usuarioId, PageRequest.of(pagina, tamanho));
        return new Pagina(resultado.getContent().stream().map(EstabelecimentoResposta::de).toList(),
                pagina, tamanho, resultado.getTotalElements());
    }

    @Transactional(readOnly = true)
    public EstabelecimentoResposta consultar(UUID usuarioId, UUID id) {
        return EstabelecimentoResposta.de(estabelecimentos.buscarDoUsuario(usuarioId, id)
                .orElseThrow(EstabelecimentoNaoEncontradoException::new));
    }

    public record Pagina(List<EstabelecimentoResposta> itens, int pagina, int tamanho, long total) { }

    @Transactional
    public EstabelecimentoResposta renomear(UUID usuarioId, UUID id, String nome) {
        var estabelecimento = estabelecimentos.buscarDoProprietario(usuarioId, id, VinculoEstabelecimento.Papel.PROPRIETARIO)
                .orElseThrow(EstabelecimentoNaoEncontradoException::new);
        estabelecimento.renomear(nome);
        return EstabelecimentoResposta.de(estabelecimento);
    }
    @Transactional
    public EstabelecimentoResposta atualizarDados(UUID usuarioId, UUID id, DadosEmpresa dados) {
        var estabelecimento = estabelecimentos.buscarDoProprietario(usuarioId, id, VinculoEstabelecimento.Papel.PROPRIETARIO)
                .orElseThrow(EstabelecimentoNaoEncontradoException::new);
        estabelecimento.atualizarDados(dados);
        return EstabelecimentoResposta.de(estabelecimento);
    }
}
