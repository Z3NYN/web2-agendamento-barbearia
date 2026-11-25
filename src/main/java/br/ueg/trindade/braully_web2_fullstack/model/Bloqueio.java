package br.ueg.trindade.braully_web2_fullstack.model;

import java.time.LocalDateTime;
import jakarta.persistence.*;

@Entity
public class Bloqueio {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    public Long id;
    @ManyToOne(optional = false, fetch = FetchType.LAZY) public Barbearia barbearia;
    @ManyToOne(fetch = FetchType.LAZY) public Barbeiro barbeiro;
    public LocalDateTime inicio;
    public LocalDateTime fim;
    public String motivo;

}
