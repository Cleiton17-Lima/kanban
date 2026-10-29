package com.cleiton.kanban.security;

import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

import com.cleiton.kanban.entities.KanbanUser;
import com.cleiton.kanban.repositories.KanbanUserRepository;

@Service
public class KanbanUserDetailsService implements UserDetailsService {

    private final KanbanUserRepository userRepository;

    public KanbanUserDetailsService(KanbanUserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @Override
    public UserDetails loadUserByUsername(String username) throws UsernameNotFoundException {
        KanbanUser user = userRepository.findByUsernameIgnoreCase(username.trim())
                .orElseThrow(() -> new UsernameNotFoundException("Credenciais inválidas."));

        return new KanbanUserDetails(user.getId(), user.getUsername(), user.getPasswordHash());
    }
}
