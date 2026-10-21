package com.nextflow.estabelecimento;

import java.util.Optional;
import java.util.UUID;
import org.springframework.data.domain.*;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;

public interface EstabelecimentoRepository extends JpaRepository<Estabelecimento, UUID> {
    @Query("select e from VinculoEstabelecimento v join v.estabelecimento e where v.usuarioId = :usuarioId order by e.nome, e.id")
    Page<Estabelecimento> listarDoUsuario(@Param("usuarioId") UUID usuarioId, Pageable pageable);

    @Query("select e from VinculoEstabelecimento v join v.estabelecimento e where v.usuarioId = :usuarioId and e.id = :id")
    Optional<Estabelecimento> buscarDoUsuario(@Param("usuarioId") UUID usuarioId, @Param("id") UUID id);

    @Query("select e from VinculoEstabelecimento v join v.estabelecimento e where v.usuarioId = :usuarioId and e.id = :id and v.papel = :papel")
    Optional<Estabelecimento> buscarDoProprietario(@Param("usuarioId") UUID usuarioId, @Param("id") UUID id,
            @Param("papel") VinculoEstabelecimento.Papel papel);
}
