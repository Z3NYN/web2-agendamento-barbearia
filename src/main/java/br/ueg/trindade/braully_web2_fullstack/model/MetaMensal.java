package br.ueg.trindade.braully_web2_fullstack.model;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import jakarta.persistence.*;

@Entity
@Table(name = "meta_mensal", uniqueConstraints = @UniqueConstraint(columnNames = {"ano", "mes"}))
public class MetaMensal {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private int ano;

    @Column(nullable = false)
    private int mes;

    private Integer metaAtendimentosConcluidos;

    @Column(precision = 12, scale = 2)
    private BigDecimal metaValorConcluidos;

    private Integer metaClientesUnicos;

    private Integer metaNovosCadastros;

    @Column(precision = 5, scale = 1)
    private BigDecimal metaOcupacaoPercentual;

    @Column(nullable = false)
    private LocalDateTime criadaEm;

    @Column(nullable = false)
    private LocalDateTime atualizadaEm;

    public Long getId() { return id; }
    public int getAno() { return ano; }
    public void setAno(int ano) { this.ano = ano; }
    public int getMes() { return mes; }
    public void setMes(int mes) { this.mes = mes; }
    public Integer getMetaAtendimentosConcluidos() { return metaAtendimentosConcluidos; }
    public void setMetaAtendimentosConcluidos(Integer metaAtendimentosConcluidos) { this.metaAtendimentosConcluidos = metaAtendimentosConcluidos; }
    public BigDecimal getMetaValorConcluidos() { return metaValorConcluidos; }
    public void setMetaValorConcluidos(BigDecimal metaValorConcluidos) { this.metaValorConcluidos = metaValorConcluidos; }
    public Integer getMetaClientesUnicos() { return metaClientesUnicos; }
    public void setMetaClientesUnicos(Integer metaClientesUnicos) { this.metaClientesUnicos = metaClientesUnicos; }
    public Integer getMetaNovosCadastros() { return metaNovosCadastros; }
    public void setMetaNovosCadastros(Integer metaNovosCadastros) { this.metaNovosCadastros = metaNovosCadastros; }
    public BigDecimal getMetaOcupacaoPercentual() { return metaOcupacaoPercentual; }
    public void setMetaOcupacaoPercentual(BigDecimal metaOcupacaoPercentual) { this.metaOcupacaoPercentual = metaOcupacaoPercentual; }
    public LocalDateTime getCriadaEm() { return criadaEm; }
    public void setCriadaEm(LocalDateTime criadaEm) { this.criadaEm = criadaEm; }
    public LocalDateTime getAtualizadaEm() { return atualizadaEm; }
    public void setAtualizadaEm(LocalDateTime atualizadaEm) { this.atualizadaEm = atualizadaEm; }
}
