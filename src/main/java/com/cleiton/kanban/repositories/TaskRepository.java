package com.cleiton.kanban.repositories;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.cleiton.kanban.entities.Task;

public interface TaskRepository extends JpaRepository<Task, Long> {
    List<Task> findAllByOwner_Id(Long ownerId);
    Optional<Task> findByIdAndOwner_Id(Long id, Long ownerId);
}
