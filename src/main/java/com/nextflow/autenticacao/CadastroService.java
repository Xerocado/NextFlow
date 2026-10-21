package com.nextflow.autenticacao;

import java.time.Clock;
import com.nextflow.usuario.*;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class CadastroService {
    private final UsuarioRepository usuarios;
    private final PasswordEncoder encoder;
    private final Clock clock;

    public CadastroService(UsuarioRepository usuarios, PasswordEncoder encoder, Clock clock) {
        this.usuarios = usuarios;
        this.encoder = encoder;
        this.clock = clock;
    }

    @Transactional
    public void cadastrar(String nome, String email, String senha) {
        PoliticaSenha.validar(senha);
        usuarios.saveAndFlush(new Usuario(nome, email, encoder.encode(senha), clock.instant()));
    }
}
