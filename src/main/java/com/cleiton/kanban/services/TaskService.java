package com.cleiton.kanban.services;

import java.time.LocalDate;
import java.util.List;
import java.util.Locale;
import java.util.Set;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.server.ResponseStatusException;

import com.cleiton.kanban.entities.KanbanUser;
import com.cleiton.kanban.entities.Task;
import com.cleiton.kanban.repositories.KanbanUserRepository;
import com.cleiton.kanban.repositories.TaskRepository;

@Service
public class TaskService {

    private static final Set<String> VALID_STATUSES = Set.of("TODO", "IN_PROGRESS", "DONE");
    private static final Set<String> VALID_PRIORITIES = Set.of("BAIXA", "MEDIA", "ALTA");

    private final TaskRepository taskRepository;
    private final KanbanUserRepository userRepository;

    public TaskService(TaskRepository taskRepository, KanbanUserRepository userRepository) {
        this.taskRepository = taskRepository;
        this.userRepository = userRepository;
    }

    public List<Task> findAll(Long ownerId) {
        return taskRepository.findAllByOwner_Id(ownerId);
    }

    public Task findById(Long id, Long ownerId) {
        return taskRepository.findByIdAndOwner_Id(id, ownerId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Tarefa não encontrada."));
    }

    public Task create(Task task, Long ownerId) {
        validateAndNormalize(task);
        KanbanUser owner = userRepository.findById(ownerId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Sessão inválida."));
        task.setOwner(owner);
        applyDatesForCreation(task);
        return taskRepository.save(task);
    }

    public Task update(Long id, Task input, Long ownerId) {
        Task existing = findById(id, ownerId);
        validateAndNormalize(input);
        String previousStatus = existing.getStatus();

        existing.setTitle(input.getTitle());
        existing.setDescription(input.getDescription());
        existing.setPriority(input.getPriority());
        existing.setStatus(input.getStatus());

        applyDatesForStatusChange(existing, previousStatus);
        return taskRepository.save(existing);
    }

    public void delete(Long id, Long ownerId) {
        taskRepository.delete(findById(id, ownerId));
    }

    private void validateAndNormalize(Task task) {
        if (task == null || !StringUtils.hasText(task.getTitle())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "O título da tarefa é obrigatório.");
        }

        task.setTitle(task.getTitle().trim());

        if (task.getTitle().length() > 120) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "O título deve ter no máximo 120 caracteres.");
        }
        if (task.getDescription() != null && task.getDescription().length() > 1000) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "A descrição deve ter no máximo 1000 caracteres.");
        }

        String status = StringUtils.hasText(task.getStatus())
                ? task.getStatus().trim().toUpperCase(Locale.ROOT) : "TODO";
        String priority = StringUtils.hasText(task.getPriority())
                ? task.getPriority().trim().toUpperCase(Locale.ROOT) : "MEDIA";

        if (!VALID_STATUSES.contains(status)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Status inválido.");
        }
        if (!VALID_PRIORITIES.contains(priority)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Prioridade inválida.");
        }

        task.setStatus(status);
        task.setPriority(priority);
    }

    private void applyDatesForCreation(Task task) {
        LocalDate today = LocalDate.now();
        if ("IN_PROGRESS".equals(task.getStatus())) {
            task.setStartDate(today);
        } else if ("DONE".equals(task.getStatus())) {
            task.setStartDate(today);
            task.setCompletionDate(today);
        } else {
            task.setStartDate(null);
            task.setCompletionDate(null);
        }
    }

    private void applyDatesForStatusChange(Task task, String previousStatus) {
        String currentStatus = task.getStatus();
        LocalDate today = LocalDate.now();

        if ("IN_PROGRESS".equals(currentStatus)) {
            if (!"IN_PROGRESS".equals(previousStatus) || task.getStartDate() == null) {
                task.setStartDate(today);
            }
            task.setCompletionDate(null);
            return;
        }

        if ("DONE".equals(currentStatus)) {
            if (task.getStartDate() == null) task.setStartDate(today);
            if (!"DONE".equals(previousStatus) || task.getCompletionDate() == null) {
                task.setCompletionDate(today);
            }
            return;
        }

        task.setStartDate(null);
        task.setCompletionDate(null);
    }
}
