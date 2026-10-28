package com.nextflow.gasto;

import java.time.LocalDate;
import java.util.UUID;
import com.nextflow.autenticacao.UsuarioAutenticado;
import jakarta.validation.Valid;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/estabelecimentos/{empresaId}/gastos")
public class GastoController {
    private final GastoService service;
    public GastoController(GastoService service) { this.service = service; }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public GastoResposta criar(@AuthenticationPrincipal UsuarioAutenticado usuario, @PathVariable UUID empresaId,
            @Valid @RequestBody GastoEntrada entrada,
            @RequestHeader(value = "Idempotency-Key", required = false) UUID chave) {
        return service.criar(usuario.getId(), empresaId, entrada, chave);
    }

    @GetMapping
    public GastoService.Dia listar(@AuthenticationPrincipal UsuarioAutenticado usuario, @PathVariable UUID empresaId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate data,
            @RequestParam(defaultValue = "0") int pagina, @RequestParam(defaultValue = "20") int tamanho) {
        return service.listar(usuario.getId(), empresaId, data, pagina, tamanho);
    }
}
