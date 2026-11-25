package br.ueg.trindade.braully_web2_fullstack.model;

import java.time.LocalDateTime;
import jakarta.persistence.*;

@Entity
@Table(uniqueConstraints = @UniqueConstraint(columnNames = {"tipo", "agendamento_id"}))
public class MovimentoFidelidade {
    public enum Tipo { CREDITO, RECOMPENSA }

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    public Long id;
    @ManyToOne(optional = false, fetch = FetchType.LAZY) public Usuario cliente;
    @ManyToOne(fetch = FetchType.LAZY) public Agendamento agendamento;
    @Enumerated(EnumType.STRING) public Tipo tipo;
    public LocalDateTime criadoEm;
    public int quantidade;
    @ManyToOne(fetch = FetchType.LAZY) public Servico premio;
    public String nomePremio;
    public LocalDateTime resgatadoEm;

}
