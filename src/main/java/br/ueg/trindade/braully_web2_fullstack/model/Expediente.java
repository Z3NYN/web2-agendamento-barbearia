package br.ueg.trindade.braully_web2_fullstack.model;

import java.time.DayOfWeek;
import java.time.LocalTime;
import jakarta.persistence.*;

@Entity
public class Expediente {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    public Long id;
    @ManyToOne(optional = false, fetch = FetchType.LAZY) public Barbearia barbearia;
    @ManyToOne(fetch = FetchType.LAZY) public Barbeiro barbeiro;
    @Enumerated(EnumType.STRING) public DayOfWeek dia;
    public LocalTime inicio;
    public LocalTime fim;

}
