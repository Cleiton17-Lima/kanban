
const API_URL = "/tasks";

const taskModal = document.getElementById("task-modal");
const taskForm = document.getElementById("task-form");
const notification = document.getElementById("notification");

const modalTitle = document.getElementById("modal-title");
const saveTaskButton = document.getElementById("save-task-button");

const statusConfig = {
    TODO: {
        listId: "todo-list",
        countId: "count-todo"
    },
    IN_PROGRESS: {
        listId: "progress-list",
        countId: "count-progress"
    },
    DONE: {
        listId: "done-list",
        countId: "count-done"
    }
};

let editingTaskId = null;
let draggedTaskId = null;
let notificationTimeout;

async function request(url, options = {}) {
    const response = await fetch(url, options);

    if (!response.ok) {
        const message = await response.text();
        throw new Error(message || `Erro HTTP ${response.status}`);
    }

    if (response.status === 204) {
        return null;
    }

    const contentType = response.headers.get("content-type") || "";

    if (contentType.includes("application/json")) {
        return response.json();
    }

    return null;
}

function showNotification(message) {
    notification.textContent = message;
    notification.classList.add("show");

    clearTimeout(notificationTimeout);

    notificationTimeout = setTimeout(() => {
        notification.classList.remove("show");
    }, 3000);
}

function normalizeStatus(status) {
    const value = String(status || "TODO").toUpperCase();

    if (value === "IN_PROGRESS" || value === "IN PROGRESS") {
        return "IN_PROGRESS";
    }

    if (
        value === "DONE" ||
        value === "CONCLUIDO" ||
        value === "CONCLUÍDO"
    ) {
        return "DONE";
    }

    return "TODO";
}

function normalizePriority(priority) {
    const value = String(priority || "MEDIA").toUpperCase();

    if (value === "BAIXA" || value === "LOW") {
        return "BAIXA";
    }

    if (value === "ALTA" || value === "HIGH") {
        return "ALTA";
    }

    return "MEDIA";
}

function createTaskCard(task) {
    const card = document.createElement("article");
    card.className = "task-card";
    card.draggable = true;
    card.dataset.id = task.id;

    const title = document.createElement("h4");
    title.textContent = task.title || "Sem título";

    const description = document.createElement("p");
    description.className = "task-description";
    description.textContent = task.description || "Sem descrição";

    const footer = document.createElement("div");
    footer.className = "task-footer";

    const priority = normalizePriority(task.priority);

    const priorityLabels = {
        BAIXA: "Baixa",
        MEDIA: "Média",
        ALTA: "Alta"
    };

    const priorityBadge = document.createElement("span");
    priorityBadge.className = `priority priority-${priority}`;
    priorityBadge.textContent = priorityLabels[priority];

    const taskId = document.createElement("span");
    taskId.className = "task-id";
    taskId.textContent = `#${task.id}`;

    footer.append(priorityBadge, taskId);

    const actions = document.createElement("div");
    actions.className = "task-actions";

    const editButton = document.createElement("button");
    editButton.type = "button";
    editButton.className = "btn-icon";
    editButton.textContent = "Editar";
    editButton.setAttribute("aria-label", `Editar tarefa ${task.title}`);
    editButton.addEventListener("click", () => openEditModal(task));

    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.className = "btn-icon btn-delete";
    deleteButton.textContent = "Excluir";
    deleteButton.setAttribute("aria-label", `Excluir tarefa ${task.title}`);
    deleteButton.addEventListener("click", () => deleteTask(task));

    actions.append(editButton, deleteButton);

    card.append(title, description, footer, actions);

    card.addEventListener("dragstart", event => {
        draggedTaskId = task.id;
        card.classList.add("dragging");

        event.dataTransfer.setData("text/plain", String(task.id));
        event.dataTransfer.effectAllowed = "move";
    });

    card.addEventListener("dragend", () => {
        draggedTaskId = null;
        card.classList.remove("dragging");

        document.querySelectorAll(".kanban-column").forEach(column => {
            column.classList.remove("drag-over");
        });
    });

    return card;
}

function renderTasks(tasks) {
    Object.values(statusConfig).forEach(config => {
        document.getElementById(config.listId).replaceChildren();
    });

    let total = 0;
    const counts = {
        TODO: 0,
        IN_PROGRESS: 0,
        DONE: 0
    };

    tasks.forEach(task => {
        const status = normalizeStatus(task.status);
        const config = statusConfig[status];
        const list = document.getElementById(config.listId);

        list.appendChild(createTaskCard(task));

        counts[status]++;
        total++;
    });

    Object.entries(statusConfig).forEach(([status, config]) => {
        const list = document.getElementById(config.listId);

        if (list.children.length === 0) {
            const emptyMessage = document.createElement("p");
            emptyMessage.className = "empty-message";
            emptyMessage.textContent = "Nenhuma tarefa por aqui.";
            list.appendChild(emptyMessage);
        }

        document.getElementById(config.countId).textContent = counts[status];
    });

    document.getElementById("task-counter").textContent =
        `${total} ${total === 1 ? "tarefa" : "tarefas"}`;
}

async function loadTasks() {
    try {
        const tasks = await request(API_URL);
        renderTasks(tasks);
    } catch (error) {
        console.error("Erro ao carregar tarefas:", error);
        showNotification("Não foi possível carregar as tarefas.");
    }
}

function resetTaskForm() {
    taskForm.reset();
    editingTaskId = null;

    document.getElementById("priority").value = "MEDIA";
    document.getElementById("status").value = "TODO";

    modalTitle.textContent = "Nova tarefa";
    saveTaskButton.textContent = "Salvar tarefa";
}

document.getElementById("open-task-modal").addEventListener("click", () => {
    resetTaskForm();
    taskModal.showModal();
});

function openEditModal(task) {
    editingTaskId = task.id;

    document.getElementById("title").value = task.title || "";
    document.getElementById("description").value = task.description || "";
    document.getElementById("priority").value = normalizePriority(task.priority);
    document.getElementById("status").value = normalizeStatus(task.status);

    modalTitle.textContent = "Editar tarefa";
    saveTaskButton.textContent = "Salvar alterações";

    taskModal.showModal();
}

function closeTaskModal() {
    taskModal.close();
}

document.getElementById("close-task-modal").addEventListener("click", closeTaskModal);
document.getElementById("cancel-task").addEventListener("click", closeTaskModal);

taskForm.addEventListener("submit", async event => {
    event.preventDefault();

    const task = {
        title: document.getElementById("title").value.trim(),
        description: document.getElementById("description").value.trim(),
        priority: document.getElementById("priority").value,
        status: document.getElementById("status").value
    };

    if (!task.title) {
        showNotification("Informe o título da tarefa.");
        return;
    }

    const isEditing = editingTaskId !== null;

    const url = isEditing
        ? `${API_URL}/${editingTaskId}`
        : API_URL;

    const method = isEditing ? "PUT" : "POST";

    try {
        await request(url, {
            method,
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(task)
        });

        closeTaskModal();
        resetTaskForm();

        await loadTasks();

        showNotification(
            isEditing
                ? "Tarefa atualizada com sucesso!"
                : "Tarefa cadastrada com sucesso!"
        );
    } catch (error) {
        console.error("Erro ao salvar tarefa:", error);

        showNotification("Não foi possível salvar a tarefa.");
    }
});

async function deleteTask(task) {
    const confirmed = window.confirm(
        `Deseja realmente excluir a tarefa "${task.title}"?`
    );

    if (!confirmed) {
        return;
    }

    try {
        await request(`${API_URL}/${task.id}`, {
            method: "DELETE"
        });

        await loadTasks();
        showNotification("Tarefa excluída com sucesso!");
    } catch (error) {
        console.error("Erro ao excluir tarefa:", error);
        showNotification("Não foi possível excluir a tarefa.");
    }
}

document.querySelectorAll(".kanban-column").forEach(column => {
    column.addEventListener("dragover", event => {
        event.preventDefault();
        event.dataTransfer.dropEffect = "move";
        column.classList.add("drag-over");
    });

    column.addEventListener("dragleave", event => {
        if (!column.contains(event.relatedTarget)) {
            column.classList.remove("drag-over");
        }
    });

    column.addEventListener("drop", async event => {
        event.preventDefault();
        column.classList.remove("drag-over");

        const taskId = Number(
            event.dataTransfer.getData("text/plain") || draggedTaskId
        );

        const newStatus = column.dataset.status;

        if (!taskId || !statusConfig[newStatus]) {
            return;
        }

        try {
            const tasks = await request(API_URL);
            const task = tasks.find(item => item.id === taskId);

            if (!task) {
                showNotification("Tarefa não encontrada.");
                await loadTasks();
                return;
            }

            if (normalizeStatus(task.status) === newStatus) {
                return;
            }

            const updatedTask = {
                title: task.title,
                description: task.description,
                priority: task.priority,
                status: newStatus
            };

            await request(`${API_URL}/${taskId}`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(updatedTask)
            });

            await loadTasks();
            showNotification("Status da tarefa atualizado!");
        } catch (error) {
            console.error("Erro ao mover tarefa:", error);
            showNotification("Erro ao mover tarefa. Tente novamente.");
            await loadTasks();
        }
    });
});

loadTasks();
