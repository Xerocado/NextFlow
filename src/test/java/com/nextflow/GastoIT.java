package com.nextflow;

import java.math.BigDecimal;
import java.time.*;
import java.util.UUID;
import com.nextflow.estabelecimento.*;
import com.nextflow.gasto.*;
import com.nextflow.usuario.*;
import com.nextflow.autenticacao.UsuarioAutenticado;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.test.web.servlet.MockMvc;
import org.testcontainers.junit.jupiter.*;
import org.testcontainers.postgresql.PostgreSQLContainer;
import static org.assertj.core.api.Assertions.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@Testcontainers
class GastoIT {
    @Container @ServiceConnection
    static final PostgreSQLContainer postgres = new PostgreSQLContainer("postgres:16-alpine");
    @Autowired GastoService gastos;
    @Autowired EstabelecimentoService empresas;
    @Autowired UsuarioRepository usuarios;
    @Autowired MockMvc mvc;

    private Usuario usuario() {
        return usuarios.saveAndFlush(new Usuario("Exemplo", UUID.randomUUID() + "@example.test", "hash-ficticio", Instant.EPOCH));
    }

    @Test void persisteCentavosFiltraDiaEmpresaEPaginacao() {
        var dono = usuario();
        var empresa = empresas.criar(dono.getId(), "Empresa A");
        var outraEmpresa = empresas.criar(dono.getId(), "Empresa B");
        var dia = LocalDate.of(2026, 10, 17);
        for (var valor : new String[]{"0.10", "0.20"}) gastos.criar(dono.getId(), empresa.id(),
                new GastoEntrada("Transporte", new BigDecimal(valor), dia, null, null));
        gastos.criar(dono.getId(), empresa.id(), new GastoEntrada("Outro dia", BigDecimal.TEN, dia.minusDays(1), null, null));
        gastos.criar(dono.getId(), outraEmpresa.id(), new GastoEntrada("Outra empresa", BigDecimal.TEN, dia, null, null));
        var pagina = gastos.listar(dono.getId(), empresa.id(), dia, 0, 1);
        assertThat(pagina.totalGasto()).isEqualByComparingTo("0.30");
        assertThat(pagina.total()).isEqualTo(2);
        assertThat(pagina.itens()).hasSize(1);
        assertThat(gastos.listar(dono.getId(), empresa.id(), dia, 1, 1).itens().getFirst().id())
                .isNotEqualTo(pagina.itens().getFirst().id());
    }

    @Test void httpIsolaLeituraEscritaETotalMesmoComIdentidadeForjada() throws Exception {
        var dono = usuario();
        var outro = usuario();
        var empresa = empresas.criar(dono.getId(), "Privada");
        var caminho = "/api/estabelecimentos/" + empresa.id() + "/gastos";
        var corpo = "{\"descricao\":\"Material\",\"valor\":\"12.34\",\"data\":\"2026-10-17\",\"usuarioId\":\"" + dono.getId() + "\"}";
        mvc.perform(post(caminho).with(user(new UsuarioAutenticado(outro))).with(csrf())
                .contentType("application/json").content(corpo)).andExpect(status().isNotFound());
        mvc.perform(get(caminho).with(user(new UsuarioAutenticado(outro))).param("data", "2026-10-17")
                .param("usuarioId", dono.getId().toString())).andExpect(status().isNotFound());
        mvc.perform(post(caminho).with(user(new UsuarioAutenticado(dono))).contentType("application/json").content(corpo))
                .andExpect(status().isForbidden());
        assertThat(gastos.listar(dono.getId(), empresa.id(), LocalDate.of(2026, 10, 17), 0, 20).total()).isZero();
        mvc.perform(post(caminho).with(user(new UsuarioAutenticado(dono))).with(csrf())
                .contentType("application/json").content(corpo)).andExpect(status().isCreated());
        mvc.perform(get(caminho).with(user(new UsuarioAutenticado(dono))).param("data", "2026-10-17"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.total").value(1)).andExpect(jsonPath("$.totalGasto").value(12.34));
    }
}
