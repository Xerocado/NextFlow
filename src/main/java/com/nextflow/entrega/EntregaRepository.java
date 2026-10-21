package com.nextflow.entrega;
import java.time.LocalDate;
import java.math.BigDecimal;
import java.util.*;
import jakarta.persistence.LockModeType;
import org.springframework.data.domain.*;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;
public interface EntregaRepository extends JpaRepository<Entrega, UUID> {
    interface ResumoDia {
        long getQuantidade();
        long getLitros();
        BigDecimal getValor();
    }

    @Query("select count(e) as quantidade, coalesce(sum(e.litros), 0) as litros, "
            + "coalesce(sum(case when e.semCobranca = false then e.valorTotal else 0 end), 0) as valor "
            + "from Entrega e where e.estabelecimentoId = :empresa and e.data = :data")
    ResumoDia resumirDia(@Param("empresa") UUID empresa, @Param("data") LocalDate data);

    Optional<Entrega> findByIdAndEstabelecimentoId(UUID id, UUID empresa);
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select e from Entrega e where e.id=:id and e.estabelecimentoId=:empresa")
    Optional<Entrega> bloquear(@Param("id") UUID id, @Param("empresa") UUID empresa);
    @Query("select e from Entrega e where e.estabelecimentoId=:empresa and e.data between :inicio and :fim and (:pendentes=false or (e.semCobranca=false and e.valorTotal>e.valorPago)) order by e.data desc, e.criadoEm desc, e.id desc")
    Page<Entrega> listar(@Param("empresa") UUID empresa, @Param("inicio") LocalDate inicio,
            @Param("fim") LocalDate fim, @Param("pendentes") boolean pendentes, Pageable pagina);
}
