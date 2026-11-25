package br.ueg.trindade.braully_web2_fullstack.model;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import jakarta.persistence.*;

@Entity
@Table(indexes = @Index(columnList = "barbeiro_id,inicio,fim"))
public class Agendamento {
    public enum Status { RESERVADO, CONFIRMADO, CONCLUIDO, CANCELADO, FALTOU }

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    public Long id;
    @ManyToOne(optional = false, fetch = FetchType.LAZY) public Usuario cliente;
    @ManyToOne(optional = false, fetch = FetchType.LAZY) public Barbeiro barbeiro;
    @ManyToOne(optional = false, fetch = FetchType.LAZY) public Servico servico;
    public LocalDateTime inicio;
    public LocalDateTime fim;
    @Enumerated(EnumType.STRING) public Status status = Status.RESERVADO;
    public String nomeServico;
    public boolean beneficio;
    public boolean elegivelNaReserva;
    @Column(precision = 10, scale = 2) public BigDecimal preco;
    public Long getId() { return id; }

}
