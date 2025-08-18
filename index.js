// server.js
const express = require("express");
const dbConnect = require("./config/db_connect");
const bodyParser = require("body-parser");
const dotenv = require("dotenv").config();
const authRouter = require("./routes/auth_routes");
const adminRoutes = require("./routes/adminRoutes");
const morgan = require("morgan");
const cors = require("cors");
const path = require("path");
const swaggerUi = require("swagger-ui-express");
const swaggerJsdoc = require("swagger-jsdoc");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const PORT = process.env.PORT || 4444;

dbConnect();

// Enhanced CORS configuration
app.use(
  cors({
    origin: ["http://localhost:3000", "http://157.66.191.24:4441"],
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);

app.use(morgan("dev"));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

// Create HTTP server
const server = http.createServer(app);

// Socket.io setup
const io = new Server(server, {
  cors: {
    origin: ["http://localhost:3000", "http://157.66.191.24:4441"],
    methods: ["GET", "POST"],
    credentials: true,
  },
});

// Socket connection handler
io.on("connection", (socket) => {
  console.log(`🔌 New client connected: ${socket.id}`);

  // Example event
  socket.on("sendMessage", (data) => {
    console.log("Message received:", data);
    io.emit("receiveMessage", data); // broadcast to all clients
  });

  socket.on("disconnect", () => {
    console.log(`❌ Client disconnected: ${socket.id}`);
  });
});

// Attach io to app (so controllers can use it via req.app.get("io"))
app.set("io", io);

// Make uploads folder publicly accessible
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.use(
  "/ColorTestImages",
  express.static(path.join(__dirname, "ColorTestImages"))
);

// Routes
app.use("/api/user", authRouter);
app.use("/api/admin", adminRoutes);

// Swagger configuration
const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Quiz App API Documentation",
      version: "1.0.0",
      description: "API documentation for Quiz Application",
    },
    servers: [
      {
        url: `http://localhost:${PORT}`,
        description: "Development server",
      },
      {
        url: process.env.BASE_URL || `http://your-production-url.com`,
        description: "Production server",
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
  },
  apis: ["./routes/*.js"],
};

const swaggerSpec = swaggerJsdoc(options);

// Swagger UI setup
app.use(
  "/api-docs",
  swaggerUi.serve,
  swaggerUi.setup(swaggerSpec, {
    explorer: true,
    swaggerOptions: {
      persistAuthorization: true,
    },
  })
);

// Serve React frontend from root-level dist folder
app.use(express.static(path.join(__dirname, "/dist")));
app.get("*", (req, res) => {
  res.sendFile(path.resolve(__dirname, "dist", "index.html"));
});

// Start server
server.listen(PORT, () => {
  console.log(`🚀 Server is running at http://localhost:${PORT}`);
  console.log(`📖 Swagger docs available at http://localhost:${PORT}/api-docs`);
});
