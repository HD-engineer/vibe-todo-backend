require("dotenv").config();

const { MongoClient } = require("mongodb");
const { createApp } = require("./src/app");

const port = Number.parseInt(process.env.PORT ?? "5000", 10);
const mongoUri = process.env.MONGODB_URI;

if (!mongoUri) {
  console.error("MONGODB_URI 환경변수를 설정해 주세요.");
  process.exit(1);
}

const mongoClient = new MongoClient(mongoUri);
const server = createApp();

async function startServer() {
  try {
    await mongoClient.connect();
    await mongoClient.db().command({ ping: 1 });
    console.log("몽고디비 연결 성공");

    server.listen(port, () => {
      console.log(`서버가 http://localhost:${port} 에서 실행 중입니다.`);
    });
  } catch (error) {
    console.error("몽고디비 연결 실패:", error.message);
    await mongoClient.close();
    process.exit(1);
  }
}

async function shutdown() {
  server.close();
  await mongoClient.close();
  process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

startServer();
