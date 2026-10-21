package com.nextflow;

import java.time.Instant;
import java.util.UUID;
import com.nextflow.estabelecimento.*;
import com.nextflow.usuario.*;
import com.nextflow.autenticacao.UsuarioAutenticado;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.dao.DataIntegrityViolationException;
import org.testcontainers.junit.jupiter.*;
import org.testcontainers.postgresql.PostgreSQLContainer;
import static org.assertj.core.api.Assertions.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@Testcontainers
class EstabelecimentoIT {
    @Test
    void renomeiaPersisteEImpedeAlteracaoPorOutroUsuario() {
        var a = usuario();
        var b = usuario();
        var negocio = service.criar(a, "Nome anterior");
        service.renomear(a, negocio.id(), "Nome atualizado");
        assertThat(service.consultar(a, negocio.id()).nome()).isEqualTo("Nome atualizado");
        assertThatThrownBy(() -> service.renomear(b, negocio.id(), "Intruso"))
                .isInstanceOf(EstabelecimentoNaoEncontradoException.class);
        assertThat(service.consultar(a, negocio.id()).nome()).isEqualTo("Nome atualizado");
    }
    @Container @ServiceConnection
    static final PostgreSQLContainer postgres = new PostgreSQLContainer("postgres:16-alpine");
    @Autowired EstabelecimentoService service;
    @Autowired UsuarioRepository usuarios;
    @Autowired JdbcTemplate jdbc;
    @Autowired MockMvc mvc;

    @Test
    void httpIsolaLeituraListagemEAlteracoesMesmoComIdentidadeForjada() throws Exception {
        var a = usuario();
        var b = usuario();
        var principalA = new UsuarioAutenticado(usuarios.findById(a).orElseThrow());
        var principalB = new UsuarioAutenticado(usuarios.findById(b).orElseThrow());
        var negocio = service.criar(a, "Empresa privada");
        var proprio = service.criar(b, "Empresa do segundo usuario");
        var dados = new DadosEmpresa("servicos", "(00) 00000-0000", null, "Rua privada", null, null, null, null, null, true);
        service.atualizarDados(a, negocio.id(), dados);
        var caminho = "/api/estabelecimentos/" + negocio.id();

        mvc.perform(get("/api/estabelecimentos").param("usuarioId", a.toString()).with(user(principalB)))
                .andExpect(status().isOk()).andExpect(jsonPath("$.total").value(1))
                .andExpect(jsonPath("$.itens.length()").value(1))
                .andExpect(jsonPath("$.itens[0].id").value(proprio.id().toString()));
        mvc.perform(get(caminho).param("usuarioId", a.toString()).with(user(principalB)))
                .andExpect(status().isNotFound()).andExpect(jsonPath("$.detail").value("Estabelecimento nao encontrado."));
        mvc.perform(put(caminho + "/nome").with(user(principalB)).with(csrf()).contentType("application/json")
                .content("{\"nome\":\"Intruso\",\"usuarioId\":\"" + a + "\"}"))
                .andExpect(status().isNotFound());
        mvc.perform(put(caminho + "/dados").with(user(principalB)).with(csrf()).contentType("application/json")
                .content("{\"atividade\":\"produtos\",\"semNumero\":true,\"usuarioId\":\"" + a + "\"}"))
                .andExpect(status().isNotFound());
        mvc.perform(get(caminho).with(user(principalA)))
                .andExpect(status().isOk()).andExpect(jsonPath("$.nome").value("Empresa privada"))
                .andExpect(jsonPath("$.dados.logradouro").value("Rua privada"))
                .andExpect(jsonPath("$.dados.atividade").value("servicos"));
        assertThat(service.consultar(a, negocio.id()).dados()).isEqualTo(dados);
    }

    @Test
    void httpRejeitaCsrfInvalidoEPayloadInvalidoSemPersistir() throws Exception {
        var idUsuario = usuario();
        var principal = new UsuarioAutenticado(usuarios.findById(idUsuario).orElseThrow());
        var negocio = service.criar(idUsuario, "Original");
        var caminho = "/api/estabelecimentos/" + negocio.id();
        for (var csrfInvalido : new boolean[]{false, true}) {
            var pedido = put(caminho + "/nome").with(user(principal)).contentType("application/json")
                    .content("{\"nome\":\"Nao deve salvar\"}");
            if (csrfInvalido) pedido.with(csrf().useInvalidToken());
            mvc.perform(pedido).andExpect(status().isForbidden());
        }
        mvc.perform(put(caminho + "/dados").with(user(principal)).with(csrf()).contentType("application/json")
                .content("{\"atividade\":\"servicos\",\"semNumero\":true,\"cep\":\"invalido\"}"))
                .andExpect(status().isBadRequest());
        assertThat(service.consultar(idUsuario, negocio.id()).nome()).isEqualTo("Original");
        assertThat(service.consultar(idUsuario, negocio.id()).dados()).isNull();
    }

    private UUID usuario() {
        return usuarios.saveAndFlush(new Usuario("Teste", UUID.randomUUID() + "@example.test", "hash-teste", Instant.EPOCH)).getId();
    }

    @Test
    void doisUsuariosSoEnxergamSeusNegociosInclusiveContagem() {
        var a = usuario();
        var b = usuario();
        var primeiro = service.criar(a, "Primeiro");
        var segundo = service.criar(a, "Segundo");
        var terceiro = service.criar(b, "Terceiro");
        assertThat(service.listar(a, 0, 1).total()).isEqualTo(2);
        assertThat(service.listar(a, 0, 20).itens()).extracting(EstabelecimentoResposta::id)
                .containsExactly(primeiro.id(), segundo.id());
        assertThat(service.listar(b, 0, 20).itens()).extracting(EstabelecimentoResposta::id).containsExactly(terceiro.id());
        assertThat(service.consultar(a, primeiro.id()).id()).isEqualTo(primeiro.id());
        assertThatThrownBy(() -> service.consultar(b, primeiro.id())).isInstanceOf(EstabelecimentoNaoEncontradoException.class);
        assertThatThrownBy(() -> service.consultar(b, UUID.randomUUID())).isInstanceOf(EstabelecimentoNaoEncontradoException.class);
    }

    @Test
    void falhaNoVinculoDesfazEstabelecimento() {
        long antes = jdbc.queryForObject("select count(*) from estabelecimentos", Long.class);
        assertThatThrownBy(() -> service.criar(UUID.randomUUID(), "Nao deve persistir"))
                .isInstanceOf(DataIntegrityViolationException.class);
        assertThat(jdbc.queryForObject("select count(*) from estabelecimentos", Long.class)).isEqualTo(antes);
    }

    @Test
    void bancoImpedeVinculoDuplicadoESegundoProprietario() {
        var a = usuario();
        var b = usuario();
        var negocio = service.criar(a, "Teste integridade");
        for (var usuarioId : new UUID[]{a, b}) {
            assertThatThrownBy(() -> jdbc.update("insert into vinculos_estabelecimento (id, usuario_id, estabelecimento_id, papel, criado_em) values (?, ?, ?, 'PROPRIETARIO', current_timestamp)",
                    UUID.randomUUID(), usuarioId, negocio.id())).isInstanceOf(DataIntegrityViolationException.class);
        }
    }
    @Test
    void dadosPersistemSemAlterarNomeEIsolamUsuarios() {
        var a = usuario();
        var b = usuario();
        var negocio = service.criar(a, "Empresa teste");
        assertThat(service.consultar(a, negocio.id()).dados()).isNull();
        var dados = new DadosEmpresa("produtos", "(00) 00000-0000", "12345-678", "Rua exemplo", "10", "Sala", "Centro", "Cidade teste", "SP", false);
        service.atualizarDados(a, negocio.id(), dados);
        assertThat(service.consultar(a, negocio.id()).dados()).isEqualTo(dados);
        assertThat(service.consultar(a, negocio.id()).nome()).isEqualTo("Empresa teste");
        assertThatThrownBy(() -> service.atualizarDados(b, negocio.id(), dados)).isInstanceOf(EstabelecimentoNaoEncontradoException.class);
        assertThatThrownBy(() -> service.consultar(b, negocio.id())).isInstanceOf(EstabelecimentoNaoEncontradoException.class);
        var semNumero = new DadosEmpresa("ambos", "", "", "", null, "", "", "", "", true);
        service.atualizarDados(a, negocio.id(), semNumero);
        assertThat(service.consultar(a, negocio.id()).dados()).isEqualTo(semNumero);
    }
}
