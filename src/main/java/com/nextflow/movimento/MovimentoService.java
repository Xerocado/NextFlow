package com.nextflow.movimento;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import com.nextflow.entrega.*;
import com.nextflow.estabelecimento.*;
import com.nextflow.gasto.GastoRepository;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;

@Service
public class MovimentoService {
    private final EstabelecimentoRepository empresas;
    private final EntregaRepository entregas;
    private final PagamentoRepository pagamentos;
    private final GastoRepository gastos;

    public MovimentoService(EstabelecimentoRepository empresas, EntregaRepository entregas,
            PagamentoRepository pagamentos, GastoRepository gastos) {
        this.empresas = empresas;
        this.entregas = entregas;
        this.pagamentos = pagamentos;
        this.gastos = gastos;
    }

    @Transactional(readOnly = true, isolation = Isolation.REPEATABLE_READ)
    public Dia consultar(UUID usuario, UUID empresa, LocalDate data, int pagina, int tamanho) {
        empresas.buscarDoUsuario(usuario, empresa).orElseThrow(EstabelecimentoNaoEncontradoException::new);
        if (data == null || pagina < 0 || tamanho < 1 || tamanho > 100) {
            throw new IllegalArgumentException("Informe data, pagina a partir de zero e tamanho entre 1 e 100.");
        }
        var resumo = entregas.resumirDia(empresa, data);
        var recebidos = pagamentos.totalDoDia(empresa, data);
        var saidas = gastos.totalDoDia(empresa, data);
        var itens = pagamentos.listarDia(empresa, data, PageRequest.of(pagina, tamanho));
        return new Dia(data, resumo.getQuantidade(), resumo.getLitros(), resumo.getValor(), recebidos, saidas,
                recebidos.subtract(saidas), new Recebimentos(itens.map(p -> new Recebimento(p.getId(), p.getEntregaId(),
                        p.getData(), p.getValor(), p.getIdentificacao(), p.getDataEntrega())).getContent(), pagina, tamanho, itens.getTotalElements()));
    }

    public record Recebimento(UUID id, UUID entregaId, LocalDate data, BigDecimal valor, String identificacao, LocalDate dataEntrega) { }
    public record Recebimentos(List<Recebimento> itens, int pagina, int tamanho, long total) { }
    public record Dia(LocalDate data, long quantidadeEntregas, long totalLitros, BigDecimal totalEntregas,
            BigDecimal totalRecebido, BigDecimal totalGasto, BigDecimal saldoDoDia, Recebimentos recebimentos) { }
}
