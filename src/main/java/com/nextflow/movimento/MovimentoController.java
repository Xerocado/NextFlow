package com.nextflow.movimento;

import java.time.LocalDate;
import java.util.UUID;
import com.nextflow.autenticacao.UsuarioAutenticado;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/estabelecimentos/{empresaId}/movimento")
public class MovimentoController {
    private final MovimentoService service;
    public MovimentoController(MovimentoService service) { this.service = service; }

    @GetMapping
    public MovimentoService.Dia consultar(@AuthenticationPrincipal UsuarioAutenticado usuario, @PathVariable UUID empresaId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate data,
            @RequestParam(defaultValue = "0") int pagina, @RequestParam(defaultValue = "20") int tamanho) {
        return service.consultar(usuario.getId(), empresaId, data, pagina, tamanho);
    }
}
