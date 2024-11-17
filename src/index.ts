import fs from "fs";
import path from "path";
import express, { Express } from "express";
import cors from "cors";
import swaggerUi from "swagger-ui-express";
import swaggerJsDoc from "swagger-jsdoc";
import { components } from "./components";
import { spawn } from "child_process";
// import "./ROS/roboeROS`"
import wsClient from "./websocket/websocketClient"

const isDevelopment = process.env.NODE_ENV !== "production";
const fileExtension = isDevelopment ? "ts" : "js";

const app: Express = express();
app.use(cors());
app.use(express.json({
  limit: "50mb",
  type: "application/json",
}));
app.use(express.urlencoded({
  limit: "50mb",
  extended: true
}));

// Swagger Setting
const swaggerOptions = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Robot API",
      version: "1.0.0",
      description: "A simple Express Robot API",
    },
    components,
    security: {
      Authorization: [],
    },
  },
  apis: [
    path.resolve(__dirname, `./routes/*.${fileExtension}`),
  ],
};

const swaggerDocs = swaggerJsDoc(swaggerOptions);
app.use("/api", swaggerUi.serve, swaggerUi.setup(swaggerDocs));
app.get("/api-json", (req, res) => {
  res.setHeader("Content-Type", "application/json");
  res.send(swaggerDocs);
});

fs.readdirSync(path.join(__dirname, "routes")).forEach((file) => {
  const routePath = path.join(__dirname, "routes", file);
  app.use("/", require(routePath));
});


// Start the server
const PORT: string | number = process.env.PORT || 8000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);

  wsClient;

  try {
    // Run update_server.py
    const pythonProcess = spawn('python3', ['src/update_server/update_server.py']);

    pythonProcess.stdout.on('data', (data) => {
      console.error(`Python stdout: ${data.toString()}`);
    });

    pythonProcess.stderr.on('data', (data) => {
      console.error(`Python stderr: ${data.toString()}`);
    });

    pythonProcess.on('close', (code) => {
      console.error(`Python script exited with code ${code?.toString}`);
    });
  } catch (err) {
    console.error(`Error while starting update service`);
  }
});

export default app;