package br.ueg.trindade.braully_web2_fullstack.service;

import br.ueg.trindade.braully_web2_fullstack.model.Barbearia;
import br.ueg.trindade.braully_web2_fullstack.repository.BarbeariaRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

@Service
public class InstalacaoService {
    private final BarbeariaRepository barbearias;

    public InstalacaoService(BarbeariaRepository barbearias) {
        this.barbearias = barbearias;
    }

    public Barbearia atual() {
        return barbearias.findFirstByOrderByIdAsc().orElseThrow(Regra::inexistente);
    }

    // A mesma linha serializa escritas de agenda, catálogo e fidelidade por instalação.
    @Transactional(propagation = Propagation.MANDATORY)
    public Barbearia bloquear() {
        Long id = barbearias.idInstalacao().orElseThrow(Regra::inexistente);
        return barbearias.bloquear(id).orElseThrow(Regra::inexistente);
    }
}
