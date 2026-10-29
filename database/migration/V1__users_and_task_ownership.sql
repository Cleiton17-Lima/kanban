-- Migração manual para MySQL 8.0+.
-- Faça backup antes de executar. Pode ser executada em banco novo ou existente.
-- Tarefas antigas ficam sem proprietário até serem atribuídas explicitamente.

CREATE TABLE IF NOT EXISTS tb_user (
    id BIGINT NOT NULL AUTO_INCREMENT,
    username VARCHAR(50) NOT NULL,
    password_hash VARCHAR(100) NOT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uk_tb_user_username (username)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS tb_task (
    id BIGINT NOT NULL AUTO_INCREMENT,
    title VARCHAR(120) NOT NULL,
    description VARCHAR(1000) NULL,
    status VARCHAR(255) NULL,
    priority VARCHAR(255) NULL,
    start_date DATE NULL,
    completion_date DATE NULL,
    user_id BIGINT NULL,
    PRIMARY KEY (id),
    KEY idx_tb_task_user_id (user_id),
    CONSTRAINT fk_tb_task_user FOREIGN KEY (user_id) REFERENCES tb_user(id)
) ENGINE=InnoDB;

-- Adiciona user_id quando a tabela de tarefas já existia antes da autenticação.
SET @has_user_id = (
    SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'tb_task' AND COLUMN_NAME = 'user_id'
);
SET @sql = IF(@has_user_id = 0,
    'ALTER TABLE tb_task ADD COLUMN user_id BIGINT NULL',
    'SELECT 1');
PREPARE kanban_stmt FROM @sql;
EXECUTE kanban_stmt;
DEALLOCATE PREPARE kanban_stmt;

-- Adiciona índice se a tabela existente ainda não o possui.
SET @has_user_index = (
    SELECT COUNT(*) FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'tb_task' AND INDEX_NAME = 'idx_tb_task_user_id'
);
SET @sql = IF(@has_user_index = 0,
    'CREATE INDEX idx_tb_task_user_id ON tb_task(user_id)',
    'SELECT 1');
PREPARE kanban_stmt FROM @sql;
EXECUTE kanban_stmt;
DEALLOCATE PREPARE kanban_stmt;

-- Adiciona a chave estrangeira se ainda não existir.
SET @has_user_fk = (
    SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS
    WHERE CONSTRAINT_SCHEMA = DATABASE() AND TABLE_NAME = 'tb_task'
      AND CONSTRAINT_NAME = 'fk_tb_task_user' AND CONSTRAINT_TYPE = 'FOREIGN KEY'
);
SET @sql = IF(@has_user_fk = 0,
    'ALTER TABLE tb_task ADD CONSTRAINT fk_tb_task_user FOREIGN KEY (user_id) REFERENCES tb_user(id)',
    'SELECT 1');
PREPARE kanban_stmt FROM @sql;
EXECUTE kanban_stmt;
DEALLOCATE PREPARE kanban_stmt;

-- Alinha os tamanhos das colunas aos limites validados pela aplicação.
ALTER TABLE tb_task MODIFY COLUMN title VARCHAR(120) NOT NULL;
ALTER TABLE tb_task MODIFY COLUMN description VARCHAR(1000) NULL;
