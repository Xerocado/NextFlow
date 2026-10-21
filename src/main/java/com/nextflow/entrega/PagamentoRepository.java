package com.nextflow.entrega;
import java.util.*;
import java.time.LocalDate;
import java.math.BigDecimal;
import org.springframework.data.domain.*;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;
public interface PagamentoRepository extends JpaRepository<Pagamento, UUID> {
    interface RecebimentoDia {
        UUID getId();
        UUID getEntregaId();
        LocalDate getData();
        BigDecimal getValor();
        String getIdentificacao();
        LocalDate getDataEntrega();
    }

    @Query(value = "select p.id as id, p.entregaId as entregaId, p.data as data, p.valor as valor, "
            + "e.identificacao as identificacao, e.data as dataEntrega from Pagamento p join Entrega e "
            + "on e.id = p.entregaId and e.estabelecimentoId = p.estabelecimentoId "
            + "where p.estabelecimentoId = :empresa and p.data = :data order by p.criadoEm desc, p.id desc",
            countQuery = "select count(p) from Pagamento p where p.estabelecimentoId = :empresa and p.data = :data")
    Page<RecebimentoDia> listarDia(@Param("empresa") UUID empresa, @Param("data") LocalDate data, Pageable pagina);

    @Query("select coalesce(sum(p.valor), 0) from Pagamento p where p.estabelecimentoId = :empresa and p.data = :data")
    BigDecimal totalDoDia(@Param("empresa") UUID empresa, @Param("data") LocalDate data);

    List<Pagamento> findByEstabelecimentoIdAndEntregaIdOrderByDataAscCriadoEmAscIdAsc(UUID empresa, UUID entrega);
}
