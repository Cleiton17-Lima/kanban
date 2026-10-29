package com.cleiton.kanban.controllers;

import java.util.Map;

import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.cleiton.kanban.security.KanbanUserDetails;
import com.cleiton.kanban.services.RegistrationService;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final RegistrationService registrationService;

    public AuthController(RegistrationService registrationService) {
        this.registrationService = registrationService;
    }

    @GetMapping("/csrf")
    public Map<String, String> csrf(CsrfToken token) {
        return Map.of("headerName", token.getHeaderName(), "token", token.getToken());
    }

    @PostMapping("/register")
    public Map<String, String> register(@Valid @RequestBody RegistrationRequest request) {
        registrationService.register(request.username(), request.password());
        return Map.of("message", "Conta criada. Entre com seu usuário e senha.");
    }

    @GetMapping("/me")
    public Map<String, Object> me(@AuthenticationPrincipal KanbanUserDetails user) {
        return Map.of("id", user.getId(), "username", user.getUsername());
    }

    public record RegistrationRequest(
            @NotBlank @Size(min = 3, max = 50) String username,
            @NotBlank @Size(min = 12, max = 72) String password) {
    }
}
