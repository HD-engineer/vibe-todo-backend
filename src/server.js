const { createApp } = require("./app");

const port = Number.parseInt(process.env.PORT ?? "3000", 10);
const server = createApp();

server.listen(port, () => {
  console.log(`Todo backend is running at http://localhost:${port}`);
});
