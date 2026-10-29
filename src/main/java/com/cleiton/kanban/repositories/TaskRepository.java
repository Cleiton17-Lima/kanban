
package com.cleiton.kanban.repositories;

import org.springframework.data.jpa.repository.JpaRepository;

import com.cleiton.kanban.entities.Task;

public interface TaskRepository extends JpaRepository<Task, Long> {

}
