package com.cleiton.kanban.controllers;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.cleiton.kanban.entities.Task;
import com.cleiton.kanban.security.KanbanUserDetails;
import com.cleiton.kanban.services.TaskService;

@RestController
@RequestMapping("/tasks")
public class TaskController {

    private final TaskService taskService;

    public TaskController(TaskService taskService) {
        this.taskService = taskService;
    }

    @GetMapping
    public List<Task> findAll(@AuthenticationPrincipal KanbanUserDetails user) {
        return taskService.findAll(user.getId());
    }

    @GetMapping("/{id}")
    public Task findById(@PathVariable Long id, @AuthenticationPrincipal KanbanUserDetails user) {
        return taskService.findById(id, user.getId());
    }

    @PostMapping
    public ResponseEntity<Task> create(@RequestBody Task task, @AuthenticationPrincipal KanbanUserDetails user) {
        Task createdTask = taskService.create(task, user.getId());
        return ResponseEntity.status(HttpStatus.CREATED).body(createdTask);
    }

    @PutMapping("/{id}")
    public Task update(@PathVariable Long id, @RequestBody Task task,
            @AuthenticationPrincipal KanbanUserDetails user) {
        return taskService.update(id, task, user.getId());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id, @AuthenticationPrincipal KanbanUserDetails user) {
        taskService.delete(id, user.getId());
        return ResponseEntity.noContent().build();
    }
}
