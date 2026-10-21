package com.nextflow.entrega;
import java.time.*;
import java.util.*;
import com.nextflow.cliente.*;
import com.nextflow.estabelecimento.*;
import jakarta.validation.Validator;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
@Service
public class EntregaService {
    private final EntregaRepository entregas;
    private final PagamentoRepository pagamentos;
    private final ClienteRepository clientes;
    private final EstabelecimentoRepository empresas;
    private final Validator validator;
    private final Clock clock;
    public EntregaService(EntregaRepository entregas, PagamentoRepository pagamentos, ClienteRepository clientes,
            EstabelecimentoRepository empresas, Validator validator, Clock clock) {
        this.entregas=entregas; this.pagamentos=pagamentos; this.clientes=clientes;
        this.empresas=empresas; this.validator=validator; this.clock=clock;
    }
    private void autorizar(UUID usuario, UUID empresa, boolean escrita) {
        if(escrita) empresas.buscarDoProprietario(usuario, empresa, VinculoEstabelecimento.Papel.PROPRIETARIO)
                .orElseThrow(EstabelecimentoNaoEncontradoException::new);
        else empresas.buscarDoUsuario(usuario, empresa).orElseThrow(EstabelecimentoNaoEncontradoException::new);
    }
    private void validar(Object entrada) {
        if(entrada==null || !validator.validate(entrada).isEmpty()) throw new IllegalArgumentException("Verifique os campos informados.");
    }
    @Transactional
    public Entrega.Resposta criar(UUID usuario, UUID empresa, EntregaEntrada e) {
        autorizar(usuario, empresa, true); validar(e);
        if(!e.semCobranca() && e.valorTotal().signum()==0) throw new IllegalArgumentException("Informe valor positivo ou selecione sem cobranca.");
        if(e.clienteId()!=null && e.identificacaoAvulso()!=null && !e.identificacaoAvulso().isBlank())
            throw new IllegalArgumentException("Escolha cliente cadastrado ou identificacao avulsa.");
        String nome=e.identificacaoAvulso()==null || e.identificacaoAvulso().isBlank()?null:e.identificacaoAvulso().strip();
        if(e.clienteId()!=null) nome=clientes.findByIdAndEstabelecimentoId(e.clienteId(), empresa)
                .orElseThrow(ClienteNaoEncontradoException::new).resposta().nome();
        return entregas.save(new Entrega(empresa,e,nome,clock.instant())).resposta();
    }
    @Transactional
    public Pagamento.Resposta receber(UUID usuario, UUID empresa, UUID id, PagamentoEntrada e) {
        autorizar(usuario,empresa,true); validar(e);
        var entrega=entregas.bloquear(id,empresa).orElseThrow(EntregaNaoEncontradaException::new);
        entrega.receber(e,LocalDate.now(clock.withZone(ZoneId.of("America/Sao_Paulo"))));
        return pagamentos.save(new Pagamento(empresa,id,e,clock.instant())).resposta();
    }
    @Transactional(readOnly=true)
    public Detalhe consultar(UUID usuario, UUID empresa, UUID id) {
        autorizar(usuario,empresa,false);
        var entrega=entregas.findByIdAndEstabelecimentoId(id,empresa).orElseThrow(EntregaNaoEncontradaException::new);
        return new Detalhe(entrega.resposta(),pagamentos.findByEstabelecimentoIdAndEntregaIdOrderByDataAscCriadoEmAscIdAsc(empresa,id)
                .stream().map(Pagamento::resposta).toList());
    }
    @Transactional(readOnly=true)
    public Pagina listar(UUID usuario, UUID empresa, LocalDate inicio, LocalDate fim, boolean pendentes, int pagina, int tamanho) {
        autorizar(usuario,empresa,false);
        if(inicio==null || fim==null || inicio.isAfter(fim) || pagina<0 || tamanho<1 || tamanho>100)
            throw new IllegalArgumentException("Informe periodo valido, pagina a partir de zero e tamanho entre 1 e 100.");
        var itens=entregas.listar(empresa,inicio,fim,pendentes,PageRequest.of(pagina,tamanho));
        return new Pagina(itens.map(Entrega::resposta).getContent(),pagina,tamanho,itens.getTotalElements());
    }
    public record Detalhe(Entrega.Resposta entrega,List<Pagamento.Resposta> pagamentos) { }
    public record Pagina(List<Entrega.Resposta> itens,int pagina,int tamanho,long total) { }
}
