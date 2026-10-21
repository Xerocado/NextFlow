package com.nextflow.autenticacao;

import java.nio.charset.StandardCharsets;
import java.security.*;
import java.time.Clock;
import java.time.Duration;
import java.util.Locale;
import java.util.HexFormat;
import com.nextflow.usuario.Usuario;
import com.nextflow.usuario.UsuarioRepository;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class RecuperacaoSenhaService {
    private final UsuarioRepository usuarios;
    private final TokenRecuperacaoRepository tokens;
    private final PasswordEncoder encoder;
    private final EmailRecuperacao email;
    private final Clock clock;
    private final LimiteTentativas limites;
    private final SecureRandom random = new SecureRandom();

    public RecuperacaoSenhaService(UsuarioRepository usuarios, TokenRecuperacaoRepository tokens,
            PasswordEncoder encoder, EmailRecuperacao email, Clock clock, LimiteTentativas limites) {
        this.usuarios = usuarios;
        this.tokens = tokens;
        this.encoder = encoder;
        this.email = email;
        this.clock = clock;
        this.limites = limites;
    }

    @Transactional
    public void solicitar(String endereco) {
        String normalizado = Usuario.normalizarEmail(endereco);
        if (!limites.permitir("recuperacao:" + hash(normalizado), 3)) { return; }
        var encontrado = usuarios.findByEmail(normalizado);
        if (encontrado.isEmpty()) { return; }
        var usuario = usuarios.buscarParaAtualizacao(encontrado.get().getId()).orElseThrow();
        var anterior = tokens.findByUsuarioId(usuario.getId());
        String token;
        do { token = String.format(Locale.ROOT, "%06d", random.nextInt(1_000_000)); }
        while (anterior.isPresent() && encoder.matches(token, anterior.get().getTokenHash()));
        tokens.excluirDoUsuario(usuario.getId());
        tokens.save(new TokenRecuperacao(usuario.getId(), encoder.encode(token),
                clock.instant().plus(Duration.ofMinutes(10))));
        // Falha SMTP desfaz esta transacao. O controller ja respondeu genericamente.
        email.enviar(usuario.getEmail(), token);
    }

    @Transactional(noRollbackFor = CodigoRecuperacaoInvalidoException.class)
    public void redefinir(String endereco, String token, String novaSenha) {
        PoliticaSenha.validar(novaSenha);
        if (token == null || !token.matches("[0-9]{6}")) throw tokenInvalido();
        var candidato = usuarios.findByEmail(Usuario.normalizarEmail(endereco))
                .orElseThrow(RecuperacaoSenhaService::tokenInvalido);
        // Serializa solicitacoes e consumo por usuario, inclusive duas requisicoes simultaneas.
        var usuario = usuarios.buscarParaAtualizacao(candidato.getId())
                .orElseThrow(RecuperacaoSenhaService::tokenInvalido);
        var atual = tokens.findByUsuarioId(usuario.getId()).orElseThrow(RecuperacaoSenhaService::tokenInvalido);
        if (!atual.validoEm(clock.instant()) || atual.bloqueado()) { throw tokenInvalido(); }
        if (!encoder.matches(token, atual.getTokenHash())) {
            // Esta excecao permite commit: os erros precisam permanecer no banco.
            atual.registrarErro();
            throw tokenInvalido();
        }
        if (encoder.matches(novaSenha, usuario.getSenhaHash())) {
            throw new SenhaIgualAtualException();
        }
        usuario.redefinirSenha(encoder.encode(novaSenha));
        tokens.excluirDoUsuario(usuario.getId());
    }

    private static CodigoRecuperacaoInvalidoException tokenInvalido() {
        return new CodigoRecuperacaoInvalidoException();
    }

    static String hash(String token) {
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256")
                    .digest(token.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException exception) {
            throw new IllegalStateException("SHA-256 indisponivel.");
        }
    }
}
