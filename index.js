require("dotenv").config();

const { MongoClient } = require("mongodb");
const { createApp } = require("./src/app");
const todoValidator = require("./models/todoValidator");

const port = Number.parseInt(process.env.PORT ?? "5000", 10);
const mongoUri = process.env.MONGODB_URI;

if (!mongoUri) {
  console.error("MONGODB_URI 환경변수를 설정해 주세요.");
  process.exit(1);
}

let mongoClient;
let database;
let retryTimer;
let shuttingDown = false;

const server = createApp({ getDatabase: () => database });

async function initializeDatabase() {
  const activeDatabase = mongoClient.db();
  const collectionExists = await activeDatabase
    .listCollections({ name: "todos" }, { nameOnly: true })
    .hasNext();

  if (collectionExists) {
    await activeDatabase.command({
      collMod: "todos",
      validator: todoValidator,
      validationLevel: "strict",
      validationAction: "error",
    });
  } else {
    await activeDatabase.createCollection("todos", {
      validator: todoValidator,
      validationLevel: "strict",
      validationAction: "error",
    });
  }

  await activeDatabase.collection("todos").createIndex({ createdAt: -1 });
  console.log("todos 컬렉션 준비 완료");
  return activeDatabase;
}

async function connectDatabase() {
  try {
    mongoClient = new MongoClient(mongoUri, { serverSelectionTimeoutMS: 10000 });
    await mongoClient.connect();
    await mongoClient.db().command({ ping: 1 });
    database = await initializeDatabase();
    console.log("MongoDB 연결 성공");
  } catch (error) {
    database = undefined;
    console.error("MongoDB 연결 실패, 5초 후 다시 시도합니다:", error.message);
    await mongoClient?.close().catch(() => {});
    if (!shuttingDown) retryTimer = setTimeout(connectDatabase, 5000);
  }
}

server.listen(port, () => {
  console.log(`프론트엔드: http://localhost:${port}`);
});

connectDatabase();

async function shutdown() {
  shuttingDown = true;
  clearTimeout(retryTimer);

  if (server.listening) {
    await new Promise((resolve) => server.close(resolve));
  }

  await mongoClient?.close();
  process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
