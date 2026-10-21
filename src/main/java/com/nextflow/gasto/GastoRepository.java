package com.nextflow.gasto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;
import org.springframework.data.domain.*;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;

public interface GastoRepository extends JpaRepository<Gasto, UUID> {
    Page<Gasto> findByEstabelecimentoIdAndDataOrderByCriadoEmDescIdDesc(UUID estabelecimentoId, LocalDate data, Pageable pagina);

    @Query("select coalesce(sum(g.valor), 0) from Gasto g where g.estabelecimentoId = :empresa and g.data = :data")
    BigDecimal totalDoDia(@Param("empresa") UUID empresa, @Param("data") LocalDate data);
}
