package com.nextflow.cliente;

import java.time.Clock;
import java.util.List;
import java.util.UUID;
import com.nextflow.estabelecimento.*;
import jakarta.validation.Validator;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ClienteService {
    private final ClienteRepository clientes;
    private final EstabelecimentoRepository empresas;
    private final Validator validator;
    private final Clock clock;

    public ClienteService(ClienteRepository clientes, EstabelecimentoRepository empresas, Validator validator, Clock clock) {
        this.clientes = clientes;
        this.empresas = empresas;
        this.validator = validator;
        this.clock = clock;
    }

    @Transactional
    public ClienteResposta criar(UUID usuario, UUID empresa, ClienteEntrada entrada) {
        autorizarEscrita(usuario, empresa);
        validar(entrada);
        return clientes.save(new Cliente(empresa, entrada, clock.instant())).resposta();
    }

    @Transactional(readOnly = true)
    public Pagina listar(UUID usuario, UUID empresa, int pagina, int tamanho) {
        autorizarLeitura(usuario, empresa);
        if (pagina < 0 || tamanho < 1 || tamanho > 100) {
            throw new IllegalArgumentException("Use pagina a partir de zero e tamanho entre 1 e 100.");
        }
        var resultado = clientes.findByEstabelecimentoIdOrderByNomeAscIdAsc(empresa, PageRequest.of(pagina, tamanho));
        return new Pagina(resultado.map(Cliente::resposta).getContent(), pagina, tamanho, resultado.getTotalElements());
    }

    @Transactional(readOnly = true)
    public ClienteResposta consultar(UUID usuario, UUID empresa, UUID id) {
        autorizarLeitura(usuario, empresa);
        return buscar(empresa, id).resposta();
    }

    @Transactional
    public ClienteResposta atualizar(UUID usuario, UUID empresa, UUID id, ClienteEntrada entrada) {
        autorizarEscrita(usuario, empresa);
        var cliente = buscar(empresa, id);
        validar(entrada);
        cliente.atualizar(entrada);
        return cliente.resposta();
    }

    private Cliente buscar(UUID empresa, UUID id) {
        return clientes.findByIdAndEstabelecimentoId(id, empresa).orElseThrow(ClienteNaoEncontradoException::new);
    }

    private void autorizarLeitura(UUID usuario, UUID empresa) {
        empresas.buscarDoUsuario(usuario, empresa).orElseThrow(EstabelecimentoNaoEncontradoException::new);
    }

    private void autorizarEscrita(UUID usuario, UUID empresa) {
        empresas.buscarDoProprietario(usuario, empresa, VinculoEstabelecimento.Papel.PROPRIETARIO)
                .orElseThrow(EstabelecimentoNaoEncontradoException::new);
    }

    private void validar(ClienteEntrada entrada) {
        if (entrada == null || !validator.validate(entrada).isEmpty()) {
            throw new IllegalArgumentException("Verifique os campos do cliente.");
        }
    }

    public record Pagina(List<ClienteResposta> itens, int pagina, int tamanho, long total) { }
}
