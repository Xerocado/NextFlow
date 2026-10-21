package com.nextflow.gasto;

import java.math.BigDecimal;
import java.time.*;
import java.util.*;
import com.nextflow.estabelecimento.*;
import jakarta.validation.Validator;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class GastoService {
    private final GastoRepository gastos;
    private final EstabelecimentoRepository empresas;
    private final Validator validator;
    private final Clock clock;

    public GastoService(GastoRepository gastos, EstabelecimentoRepository empresas, Validator validator, Clock clock) {
        this.gastos = gastos; this.empresas = empresas; this.validator = validator; this.clock = clock;
    }

    @Transactional
    public GastoResposta criar(UUID usuario, UUID empresa, GastoEntrada entrada) {
        empresas.buscarDoProprietario(usuario, empresa, VinculoEstabelecimento.Papel.PROPRIETARIO)
                .orElseThrow(EstabelecimentoNaoEncontradoException::new);
        if (!validator.validate(entrada).isEmpty()) throw new IllegalArgumentException("Verifique os campos do gasto.");
        return gastos.save(new Gasto(empresa, entrada, clock.instant())).resposta();
    }

    @Transactional(readOnly = true)
    public Dia listar(UUID usuario, UUID empresa, LocalDate data, int pagina, int tamanho) {
        empresas.buscarDoUsuario(usuario, empresa).orElseThrow(EstabelecimentoNaoEncontradoException::new);
        if (data == null || pagina < 0 || tamanho < 1 || tamanho > 100) {
            throw new IllegalArgumentException("Informe data, pagina a partir de zero e tamanho entre 1 e 100.");
        }
        var resultado = gastos.findByEstabelecimentoIdAndDataOrderByCriadoEmDescIdDesc(empresa, data, PageRequest.of(pagina, tamanho));
        return new Dia(resultado.map(Gasto::resposta).getContent(), pagina, tamanho, resultado.getTotalElements(),
                gastos.totalDoDia(empresa, data));
    }

    public record Dia(List<GastoResposta> itens, int pagina, int tamanho, long total, BigDecimal totalGasto) { }
}
