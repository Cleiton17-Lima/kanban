
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

let currentTasks = [];
let editingTaskId = null;
let draggedTaskId = null;
let notificationTimeout;

function readCookie(name) {
    const prefix = name + "=";
    const item = document.cookie.split("; ").find(value => value.startsWith(prefix));
    return item ? decodeURIComponent(item.substring(prefix.length)) : null;
}

async function prepareCsrf() {
    const response = await fetch("/api/auth/csrf", { credentials: "same-origin" });
    if (!response.ok) throw new Error("Não foi possível preparar a proteção da sessão.");
    return response.json();
}

async function request(url, options = {}) {
    const method = (options.method || "GET").toUpperCase();
    const requestOptions = { ...options, credentials: "same-origin" };

    if (["POST", "PUT", "PATCH", "DELETE"].includes(method)) {
        await prepareCsrf();
        const token = readCookie("XSRF-TOKEN");
        if (!token) throw new Error("A proteção da sessão expirou. Atualize a página.");
        requestOptions.headers = {
            ...(options.headers || {}),
            "X-XSRF-TOKEN": token
        };
    }

    const response = await fetch(url, requestOptions);

    if (response.redirected && response.url.includes("/login.html")) {
        window.location.assign("/login.html");
        throw new Error("Sua sessão expirou. Entre novamente.");
    }

    if (!response.ok) {
        const message = await response.text();
        throw new Error(message || `Erro HTTP ${response.status}`);
    }

    if (response.status === 204) return null;

    const contentType = response.headers.get("content-type") || "";
    if (contentType.includes("application/json")) return response.json();
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
    const priority = normalizePriority(task.priority);

    const card = document.createElement("article");
    card.className = `task-card task-priority-${priority}`;
    card.draggable = true;
    card.dataset.id = task.id;

    const title = document.createElement("h4");
    title.textContent = task.title || "Sem título";

    const description = document.createElement("p");
    description.className = "task-description";
    description.textContent = task.description || "Sem descrição";

    const dates = document.createElement("div");
    dates.className = "task-dates";

    const formatDate = value => {
        if (!value) return null;
        const parts = String(value).split("-").map(Number);
        if (parts.length !== 3 || parts.some(Number.isNaN)) return value;
        return new Date(parts[0], parts[1] - 1, parts[2]).toLocaleDateString("pt-BR");
    };

    const startDate = formatDate(task.startDate);
    const completionDate = formatDate(task.completionDate);
    if (startDate) {
        const start = document.createElement("span");
        start.textContent = `Início: ${startDate}`;
        dates.appendChild(start);
    }
    if (completionDate) {
        const completed = document.createElement("span");
        completed.textContent = `Concluída: ${completionDate}`;
        dates.appendChild(completed);
    }

    const footer = document.createElement("div");
    footer.className = "task-footer";

    const priorityLabels = {
        BAIXA: "Baixa",
        MEDIA: "Média",
        ALTA: "Alta"
    };

    const priorityBadge = document.createElement("span");
    priorityBadge.className = `priority priority-${priority}`;
    priorityBadge.textContent = priorityLabels[priority];

    const cardHeader = document.createElement("div");
    cardHeader.className = "task-card-header";
    cardHeader.append(title, priorityBadge);

    const taskId = document.createElement("span");
    taskId.className = "task-id";
    taskId.textContent = `#${task.id}`;

    footer.appendChild(taskId);

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

    card.append(cardHeader, description);
    if (dates.childElementCount > 0) card.appendChild(dates);
    card.append(footer, actions);

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

function hasActiveFilters() {
    return Boolean(
        document.getElementById("task-search").value.trim()
        || document.getElementById("priority-filter").value !== "ALL"
        || document.getElementById("status-filter").value !== "ALL"
    );
}

function getFilteredTasks(tasks) {
    const searchTerm = document.getElementById("task-search").value.trim().toLocaleLowerCase("pt-BR");
    const selectedPriority = document.getElementById("priority-filter").value;
    const selectedStatus = document.getElementById("status-filter").value;

    return tasks.filter(task => {
        const title = String(task.title || "").toLocaleLowerCase("pt-BR");
        const description = String(task.description || "").toLocaleLowerCase("pt-BR");
        const matchesSearch = !searchTerm || title.includes(searchTerm) || description.includes(searchTerm);
        const matchesPriority = selectedPriority === "ALL" || normalizePriority(task.priority) === selectedPriority;
        const matchesStatus = selectedStatus === "ALL" || normalizeStatus(task.status) === selectedStatus;
        return matchesSearch && matchesPriority && matchesStatus;
    });
}

function renderTasks(tasks) {
    const allTasks = tasks;
    const priorityOrder = { ALTA: 0, MEDIA: 1, BAIXA: 2 };
    tasks = getFilteredTasks(allTasks).sort((a, b) =>
        priorityOrder[normalizePriority(a.priority)] - priorityOrder[normalizePriority(b.priority)]
        || String(a.title || "").localeCompare(String(b.title || ""), "pt-BR")
    );
    document.getElementById("clear-filters").disabled = !hasActiveFilters();
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
            emptyMessage.textContent = hasActiveFilters()
                ? "Nenhuma tarefa corresponde aos filtros."
                : "Nenhuma tarefa por aqui.";
            list.appendChild(emptyMessage);
        }

        document.getElementById(config.countId).textContent = counts[status];
    });

    const totalTasks = currentTasks.length;
    document.getElementById("task-counter").textContent = hasActiveFilters()
        ? `${total} de ${totalTasks} tarefas`
        : `${totalTasks} ${totalTasks === 1 ? "tarefa" : "tarefas"}`;
}

async function loadTasks() {
    try {
        currentTasks = await request(API_URL);
        if (!Array.isArray(currentTasks)) currentTasks = [];
        renderTasks(currentTasks);
    } catch (error) {
        console.error("Erro ao carregar tarefas:", error);
        showNotification(error.message || "Não foi possível carregar as tarefas.");
    }
}

async function loadAccount() {
    try {
        const [account, csrf] = await Promise.all([
            request("/api/auth/me"),
            prepareCsrf()
        ]);
        document.getElementById("account-name").textContent = account.username;
        document.getElementById("logout-csrf").value = csrf.token;
    } catch (error) {
        console.error("Erro ao carregar conta:", error);
        window.location.assign("/login.html");
    }
}

document.getElementById("logout-form").addEventListener("submit", async event => {
    event.preventDefault();
    try {
        await request("/logout", { method: "POST" });
        window.location.assign("/login.html?logout");
    } catch (error) {
        showNotification("Não foi possível encerrar a sessão. Tente novamente.");
    }
});

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

function applyFilters() {
    renderTasks(currentTasks);
}

document.getElementById("task-search").addEventListener("input", applyFilters);
document.getElementById("priority-filter").addEventListener("change", applyFilters);
document.getElementById("status-filter").addEventListener("change", applyFilters);

document.getElementById("clear-filters").addEventListener("click", () => {
    document.getElementById("task-search").value = "";
    document.getElementById("priority-filter").value = "ALL";
    document.getElementById("status-filter").value = "ALL";
    applyFilters();
});

loadAccount();
loadTasks();
