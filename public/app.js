const form = document.querySelector("#todo-form");
const input = document.querySelector("#todo-input");
const list = document.querySelector("#todo-list");
const emptyState = document.querySelector("#empty-state");
const remaining = document.querySelector("#remaining");
const message = document.querySelector("#message");

document.querySelector("#today").textContent = new Intl.DateTimeFormat("ko-KR", {
  month: "long",
  day: "numeric",
  weekday: "long",
}).format(new Date());

function showError(text) {
  message.textContent = text;
  message.hidden = false;
}

function render(todos) {
  list.replaceChildren();
  emptyState.hidden = todos.length > 0;
  const activeCount = todos.filter((todo) => !todo.completed).length;
  remaining.textContent = todos.length ? `남은 할 일 ${activeCount}개` : "오늘은 여유로운 하루예요";

  for (const todo of todos) {
    const item = document.createElement("li");
    item.className = `todo-item${todo.completed ? " completed" : ""}`;

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = todo.completed;
    checkbox.setAttribute("aria-label", `${todo.title} 완료 상태 변경`);
    checkbox.addEventListener("change", () => updateTodo(todo._id, checkbox.checked));

    const title = document.createElement("span");
    title.className = "todo-title";
    title.textContent = todo.title;

    const remove = document.createElement("button");
    remove.className = "delete-button";
    remove.type = "button";
    remove.textContent = "×";
    remove.setAttribute("aria-label", `${todo.title} 삭제`);
    remove.addEventListener("click", () => deleteTodo(todo._id));

    item.append(checkbox, title, remove);
    list.append(item);
  }
}

async function request(url, options) {
  const response = await fetch(url, options);
  const body = await response.json();
  if (!response.ok) throw new Error(body.message || "요청을 처리하지 못했습니다.");
  return body;
}

async function loadTodos() {
  message.hidden = true;
  try { render(await request("/todos")); }
  catch (error) { showError(error.message); }
}

async function updateTodo(id, completed) {
  try {
    await request(`/todos/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ completed }),
    });
    await loadTodos();
  } catch (error) { showError(error.message); await loadTodos(); }
}

async function deleteTodo(id) {
  try { await request(`/todos/${id}`, { method: "DELETE" }); await loadTodos(); }
  catch (error) { showError(error.message); }
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const title = input.value.trim();
  if (!title) return;
  try {
    await request("/todos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title }),
    });
    form.reset();
    input.focus();
    await loadTodos();
  } catch (error) { showError(error.message); }
});

document.querySelector("#refresh").addEventListener("click", loadTodos);
loadTodos();
