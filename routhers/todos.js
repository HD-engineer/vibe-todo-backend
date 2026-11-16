const { ObjectId } = require("mongodb");

const MAX_BODY_SIZE = 1024 * 1024;

function sendJson(response, statusCode, body) {
  response.writeHead(statusCode);
  response.end(JSON.stringify(body));
}

async function readJsonBody(request) {
  let body = "";

  for await (const chunk of request) {
    body += chunk;

    if (Buffer.byteLength(body) > MAX_BODY_SIZE) {
      const error = new Error("요청 본문은 1MB를 초과할 수 없습니다.");
      error.statusCode = 413;
      throw error;
    }
  }

  if (!body.trim()) {
    const error = new Error("요청 본문이 필요합니다.");
    error.statusCode = 400;
    throw error;
  }

  try {
    return JSON.parse(body);
  } catch {
    const error = new Error("올바른 JSON 형식이 아닙니다.");
    error.statusCode = 400;
    throw error;
  }
}

async function handleTodoRoutes(request, response, database) {
  const { pathname } = new URL(request.url, "http://localhost");
  const todoIdMatch = pathname.match(/^\/todos\/([^/]+)$/);
  const isCollectionRoute = pathname === "/todos";
  const isSupportedCollectionMethod =
    isCollectionRoute && (request.method === "GET" || request.method === "POST");
  const isUpdateRoute = todoIdMatch && request.method === "PATCH";
  const isDeleteRoute = todoIdMatch && request.method === "DELETE";

  if (!isSupportedCollectionMethod && !isUpdateRoute && !isDeleteRoute) {
    return false;
  }

  if (!database) {
    sendJson(response, 503, { message: "데이터베이스에 연결되지 않았습니다." });
    return true;
  }

  try {
    if (isDeleteRoute) {
      const todoId = todoIdMatch[1];

      if (!ObjectId.isValid(todoId)) {
        sendJson(response, 400, { message: "올바른 할 일 ID가 아닙니다." });
        return true;
      }

      const result = await database.collection("todos").deleteOne({
        _id: new ObjectId(todoId),
      });

      if (result.deletedCount === 0) {
        sendJson(response, 404, { message: "할 일을 찾을 수 없습니다." });
        return true;
      }

      sendJson(response, 200, {
        _id: todoId,
        message: "할 일이 삭제되었습니다.",
      });
      return true;
    }

    if (isUpdateRoute) {
      const todoId = todoIdMatch[1];

      if (!ObjectId.isValid(todoId)) {
        sendJson(response, 400, { message: "올바른 할 일 ID가 아닙니다." });
        return true;
      }

      const body = await readJsonBody(request);
      const updates = {};

      if (Object.hasOwn(body, "title")) {
        const title = typeof body.title === "string" ? body.title.trim() : "";

        if (!title || title.length > 500) {
          sendJson(response, 400, {
            message: "할 일 내용은 1자 이상 500자 이하로 입력해 주세요.",
          });
          return true;
        }

        updates.title = title;
      }

      if (Object.hasOwn(body, "completed")) {
        if (typeof body.completed !== "boolean") {
          sendJson(response, 400, { message: "완료 여부는 boolean 값이어야 합니다." });
          return true;
        }

        updates.completed = body.completed;
      }

      if (Object.keys(updates).length === 0) {
        sendJson(response, 400, { message: "수정할 내용을 입력해 주세요." });
        return true;
      }

      updates.updatedAt = new Date();
      const updatedTodo = await database.collection("todos").findOneAndUpdate(
        { _id: new ObjectId(todoId) },
        { $set: updates },
        { returnDocument: "after" },
      );

      if (!updatedTodo) {
        sendJson(response, 404, { message: "할 일을 찾을 수 없습니다." });
        return true;
      }

      sendJson(response, 200, updatedTodo);
      return true;
    }

    if (request.method === "GET") {
      const todos = await database
        .collection("todos")
        .find({})
        .sort({ createdAt: -1 })
        .toArray();

      sendJson(response, 200, todos);
      return true;
    }

    const body = await readJsonBody(request);
    const title = typeof body.title === "string" ? body.title.trim() : "";

    if (!title) {
      sendJson(response, 400, { message: "할 일 내용을 입력해 주세요." });
      return true;
    }

    if (title.length > 500) {
      sendJson(response, 400, { message: "할 일은 500자 이하로 입력해 주세요." });
      return true;
    }

    const now = new Date();
    const todo = {
      title,
      completed: false,
      createdAt: now,
      updatedAt: now,
    };
    const result = await database.collection("todos").insertOne(todo);

    sendJson(response, 201, {
      _id: result.insertedId.toString(),
      ...todo,
    });
    return true;
  } catch (error) {
    if (error.statusCode) {
      sendJson(response, error.statusCode, { message: error.message });
      return true;
    }

    throw error;
  }
}

module.exports = { handleTodoRoutes };
