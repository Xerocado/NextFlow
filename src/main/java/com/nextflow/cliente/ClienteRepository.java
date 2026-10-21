package com.nextflow.cliente;

import java.util.Optional;
import java.util.UUID;
import org.springframework.data.domain.*;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ClienteRepository extends JpaRepository<Cliente, UUID> {
    Page<Cliente> findByEstabelecimentoIdOrderByNomeAscIdAsc(UUID estabelecimentoId, Pageable pagina);
    Optional<Cliente> findByIdAndEstabelecimentoId(UUID id, UUID estabelecimentoId);
}
