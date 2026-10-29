package com.cleiton.kanban.services;

import java.nio.charset.StandardCharsets;
import java.util.Locale;
import java.util.regex.Pattern;

import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.server.ResponseStatusException;

import com.cleiton.kanban.entities.KanbanUser;
import com.cleiton.kanban.repositories.KanbanUserRepository;

@Service
public class RegistrationService {

    private static final Pattern USERNAME_PATTERN = Pattern.compile("^[a-zA-Z0-9._-]{3,50}$");

    private final KanbanUserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public RegistrationService(KanbanUserRepository userRepository, PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    public void register(String rawUsername, String rawPassword) {
        String username = rawUsername == null ? "" : rawUsername.trim();

        if (!USERNAME_PATTERN.matcher(username).matches()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "O usuário deve ter de 3 a 50 caracteres: letras, números, ponto, hífen ou sublinhado.");
        }

        if (!StringUtils.hasText(rawPassword) || rawPassword.length() < 12
                || rawPassword.getBytes(StandardCharsets.UTF_8).length > 72) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "A senha deve ter entre 12 e 72 caracteres.");
        }

        if (userRepository.existsByUsernameIgnoreCase(username)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Não foi possível criar a conta com esses dados.");
        }

        try {
            userRepository.save(new KanbanUser(username.toLowerCase(Locale.ROOT),
                    passwordEncoder.encode(rawPassword)));
        } catch (DataIntegrityViolationException exception) {
            // Também cobre tentativas concorrentes de cadastrar o mesmo usuário.
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Não foi possível criar a conta com esses dados.");
        }
    }
}
