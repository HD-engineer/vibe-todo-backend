const assert = require("node:assert/strict");
const { after, before, test } = require("node:test");
const { createApp } = require("../src/app");

let baseUrl;
let server;
let insertedTodo;
let todoSort;
let updateCall;
let deletedTodoId;

const savedTodos = [
  {
    _id: "todo-2",
    title: "운동하기",
    completed: false,
    createdAt: new Date("2026-11-03T02:00:00.000Z"),
    updatedAt: new Date("2026-11-03T02:00:00.000Z"),
  },
  {
    _id: "todo-1",
    title: "장보기",
    completed: true,
    createdAt: new Date("2026-11-03T01:00:00.000Z"),
    updatedAt: new Date("2026-11-03T01:30:00.000Z"),
  },
];

const database = {
  collection(name) {
    assert.equal(name, "todos");

    return {
      find(query) {
        assert.deepEqual(query, {});

        return {
          sort(sort) {
            todoSort = sort;
            return {
              async toArray() {
                return savedTodos;
              },
            };
          },
        };
      },
      async insertOne(todo) {
        insertedTodo = todo;
        return { insertedId: { toString: () => "todo-id" } };
      },
      async findOneAndUpdate(filter, update, options) {
        updateCall = { filter, update, options };
        return {
          _id: filter._id.toString(),
          title: update.$set.title ?? "장보기",
          completed: update.$set.completed ?? false,
          createdAt: new Date("2026-11-03T01:00:00.000Z"),
          updatedAt: update.$set.updatedAt,
        };
      },
      async deleteOne(filter) {
        deletedTodoId = filter._id.toString();
        return {
          deletedCount: deletedTodoId === "690952d8f7d9ae40aa000000" ? 0 : 1,
        };
      },
    };
  },
};

before(async () => {
  server = createApp({ database });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address();
  baseUrl = `http://127.0.0.1:${port}`;
});

after(async () => {
  await new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
});

test("GET /health returns the service status", async () => {
  const response = await fetch(`${baseUrl}/health`);

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { status: "ok" });
});

test("GET / serves the frontend", async () => {
  const response = await fetch(`${baseUrl}/`);
  const body = await response.text();

  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type"), /^text\/html/);
  assert.match(body, /오늘의 할 일/);
});

test("unknown routes return 404", async () => {
  const response = await fetch(`${baseUrl}/missing`);

  assert.equal(response.status, 404);
  assert.deepEqual(await response.json(), { message: "Not Found" });
});

test("GET /todos returns todos in newest-first order", async () => {
  const response = await fetch(`${baseUrl}/todos`);
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.deepEqual(todoSort, { createdAt: -1 });
  assert.equal(body.length, 2);
  assert.equal(body[0].title, "운동하기");
  assert.equal(body[1].title, "장보기");
});

test("POST /todos creates a todo", async () => {
  const response = await fetch(`${baseUrl}/todos`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title: "  장보기  " }),
  });
  const body = await response.json();

  assert.equal(response.status, 201);
  assert.equal(body._id, "todo-id");
  assert.equal(body.title, "장보기");
  assert.equal(body.completed, false);
  assert.equal(insertedTodo.title, "장보기");
  assert.equal(insertedTodo.completed, false);
  assert.ok(insertedTodo.createdAt instanceof Date);
  assert.ok(insertedTodo.updatedAt instanceof Date);
});

test("POST /todos rejects an empty title", async () => {
  const response = await fetch(`${baseUrl}/todos`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title: "   " }),
  });

  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), {
    message: "할 일 내용을 입력해 주세요.",
  });
});

test("PATCH /todos/:id updates a todo", async () => {
  const todoId = "690952d8f7d9ae40aa123456";
  const response = await fetch(`${baseUrl}/todos/${todoId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title: "  운동하기  ", completed: true }),
  });
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body._id, todoId);
  assert.equal(body.title, "운동하기");
  assert.equal(body.completed, true);
  assert.equal(updateCall.filter._id.toString(), todoId);
  assert.equal(updateCall.update.$set.title, "운동하기");
  assert.equal(updateCall.update.$set.completed, true);
  assert.ok(updateCall.update.$set.updatedAt instanceof Date);
  assert.deepEqual(updateCall.options, { returnDocument: "after" });
});

test("PATCH /todos/:id rejects an invalid id", async () => {
  const response = await fetch(`${baseUrl}/todos/not-an-id`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ completed: true }),
  });

  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), {
    message: "올바른 할 일 ID가 아닙니다.",
  });
});

test("DELETE /todos/:id deletes a todo", async () => {
  const todoId = "690952d8f7d9ae40aa123456";
  const response = await fetch(`${baseUrl}/todos/${todoId}`, {
    method: "DELETE",
  });

  assert.equal(response.status, 200);
  assert.equal(deletedTodoId, todoId);
  assert.deepEqual(await response.json(), {
    _id: todoId,
    message: "할 일이 삭제되었습니다.",
  });
});

test("DELETE /todos/:id rejects an invalid id", async () => {
  const response = await fetch(`${baseUrl}/todos/not-an-id`, {
    method: "DELETE",
  });

  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), {
    message: "올바른 할 일 ID가 아닙니다.",
  });
});

test("DELETE /todos/:id returns 404 when the todo does not exist", async () => {
  const response = await fetch(
    `${baseUrl}/todos/690952d8f7d9ae40aa000000`,
    { method: "DELETE" },
  );

  assert.equal(response.status, 404);
  assert.deepEqual(await response.json(), {
    message: "할 일을 찾을 수 없습니다.",
  });
});
