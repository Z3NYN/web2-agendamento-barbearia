package br.ueg.trindade.braully_web2_fullstack.controller;

import java.util.List;
import jakarta.validation.Valid;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import br.ueg.trindade.braully_web2_fullstack.security.Identidade;
import br.ueg.trindade.braully_web2_fullstack.service.UsuarioService;

@RestController
@RequestMapping("/api/usuarios")
@CrossOrigin(origins = "http://localhost:5173")
public class UsuarioController {
    private final UsuarioService usuarios;

    public UsuarioController(UsuarioService usuarios) { this.usuarios = usuarios; }

    @GetMapping
    @PreAuthorize("hasAnyAuthority('PERM_USUARIOS_GERENCIAR','PERM_ACESSOS_ATRIBUIR')")
    public List<UsuarioService.Resumo> listar() { return usuarios.listarTodos(); }

    @GetMapping("/clientes")
    @PreAuthorize("hasAnyAuthority('PERM_CLIENTES_GERENCIAR','PERM_AGENDAMENTOS_GERENCIAR','PERM_FIDELIDADE_ADMINISTRAR')")
    public List<UsuarioService.Resumo> listarClientes() { return usuarios.listarClientes(); }

    @GetMapping("/clientes/{id}")
    @PreAuthorize("hasAnyAuthority('PERM_CLIENTES_GERENCIAR','PERM_FIDELIDADE_ADMINISTRAR')")
    public UsuarioService.Resumo buscarCliente(@PathVariable Long id) { return usuarios.buscarClientePorId(id); }

    @GetMapping("/barbeiros")
    @PreAuthorize("hasAuthority('PERM_PROFISSIONAIS_GERENCIAR')")
    public List<UsuarioService.Resumo> listarBarbeiros() { return usuarios.listarContasBarbeiro(); }

    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('PERM_USUARIOS_GERENCIAR')")
    public UsuarioService.Resumo buscar(@PathVariable Long id) { return usuarios.buscarPorId(id); }

    @GetMapping("/{id}/permissoes")
    @PreAuthorize("hasAnyAuthority('PERM_USUARIOS_GERENCIAR','PERM_ACESSOS_ATRIBUIR')")
    public UsuarioService.Resumo buscarPermissoes(@PathVariable Long id) { return usuarios.buscarPorId(id); }

    @PostMapping
    @PreAuthorize("hasAuthority('PERM_USUARIOS_GERENCIAR')")
    public UsuarioService.Resumo criar(@Valid @RequestBody UsuarioService.Entrada entrada) { return usuarios.criar(entrada); }

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('PERM_USUARIOS_GERENCIAR')")
    public UsuarioService.Resumo editar(@PathVariable Long id, @Valid @RequestBody UsuarioService.Entrada entrada,
                                        Authentication auth) {
        return usuarios.atualizar(id, entrada, auth);
    }

    @PutMapping("/{id}/ativar")
    @PreAuthorize("hasAuthority('PERM_USUARIOS_GERENCIAR')")
    public UsuarioService.Resumo ativar(@PathVariable Long id, Authentication auth) { return usuarios.ativar(id, auth); }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('PERM_USUARIOS_GERENCIAR')")
    public void excluir(@PathVariable Long id, Authentication auth) { usuarios.excluir(id, auth); }

    @PutMapping("/{id}/permissoes")
    @PreAuthorize("hasAuthority('PERM_ACESSOS_ATRIBUIR')")
    public UsuarioService.Resumo atribuir(@PathVariable Long id, @RequestBody List<Long> ids, Authentication auth) {
        return usuarios.atribuirPermissoes(id, ids, auth);
    }
}
