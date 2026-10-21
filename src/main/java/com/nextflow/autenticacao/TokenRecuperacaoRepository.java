package com.nextflow.autenticacao;

import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;

public interface TokenRecuperacaoRepository extends JpaRepository<TokenRecuperacao, UUID> {
    Optional<TokenRecuperacao> findByUsuarioId(UUID usuarioId);

    @Modifying
    @Query("delete from TokenRecuperacao t where t.usuarioId = :usuarioId")
    void excluirDoUsuario(@Param("usuarioId") UUID usuarioId);
}
