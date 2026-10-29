
package com.cleiton.kanban.services;

import java.util.List;

import org.springframework.stereotype.Service;

import com.cleiton.kanban.entities.Task;
import com.cleiton.kanban.repositories.TaskRepository;

@Service
public class TaskService {

    private final TaskRepository taskRepository;

    public TaskService(TaskRepository taskRepository) {
        this.taskRepository = taskRepository;
    }

    public List<Task> findAll() {
        return taskRepository.findAll();
    }

    public Task findById(Long id) {
        return taskRepository.findById(id)
                .orElseThrow(() ->
                    new RuntimeException("Tarefa não encontrada: " + id));
    }

    public Task save(Task task) {
        return taskRepository.save(task);
    }

    public void delete(Long id) {
        Task task = findById(id);
        taskRepository.delete(task);
    }
}
