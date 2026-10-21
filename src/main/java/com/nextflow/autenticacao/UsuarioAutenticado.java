package com.nextflow.autenticacao;

import java.util.List;
import java.util.UUID;
import com.nextflow.usuario.Usuario;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.User;

public class UsuarioAutenticado extends User {
    private final UUID id;
    private final long versaoCredencial;

    public UsuarioAutenticado(Usuario usuario) {
        super(usuario.getEmail(), usuario.getSenhaHash(), List.of(new SimpleGrantedAuthority("ROLE_USUARIO")));
        id = usuario.getId();
        versaoCredencial = usuario.getVersaoCredencial();
    }

    public UUID getId() { return id; }
    public long getVersaoCredencial() { return versaoCredencial; }
}
