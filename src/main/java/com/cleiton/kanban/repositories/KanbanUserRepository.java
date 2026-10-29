package com.cleiton.kanban.repositories;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.cleiton.kanban.entities.KanbanUser;

public interface KanbanUserRepository extends JpaRepository<KanbanUser, Long> {
    Optional<KanbanUser> findByUsernameIgnoreCase(String username);
    boolean existsByUsernameIgnoreCase(String username);
}
