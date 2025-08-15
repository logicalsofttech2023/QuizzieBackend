const express = require('express');
const dbConnect = require('./config/db_connect');
const bodyParser = require('body-parser');
const app = express();
const dotenv = require('dotenv').config();
const authRouter = require('./routes/auth_routes');
const adminRoutes = require('./routes/adminRoutes');
const morgan = require('morgan');
const cors = require("cors");
const path = require('path');
const swaggerUi = require("swagger-ui-express");
const swaggerJsdoc = require("swagger-jsdoc");

const PORT = process.env.PORT || 4444;
dbConnect();

// Enhanced CORS configuration
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(morgan('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

// Make uploads folder publicly accessible
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.use(
  "/ColorTestImages",
  express.static(path.join(__dirname, "ColorTestImages"))
);

// Routes
app.use('/api/user', authRouter);
app.use('/api/admin', adminRoutes);

// Swagger configuration
const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Quiz App API Documentation",
      version: "1.0.0",
      description: "API documentation for Quiz Application"
    },
    servers: [
      {
        url: `http://localhost:${PORT}`, // Use localhost for development
        description: "Development server"
      },
      {
        url: process.env.BASE_URL || `http://your-production-url.com`, // Fallback if BASE_URL not set
        description: "Production server"
      }
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
  apis: ["./routes/*.js"], // Make sure this path is correct
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

app.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
  console.log(`Swagger docs available at http://localhost:${PORT}/api-docs`);
});