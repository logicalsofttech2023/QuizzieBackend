const express = require('express');
const dbConnect = require('./config/db_connect');
const bodyParser = require('body-parser');
const app = express();
const dotenv = require('dotenv').config();
const authRouter = require('./routes/auth_routes');
const adminRoutes = require('./routes/adminRoutes');
const dashboardRouter = require('./routes/dashboard_router');
const avatarRouter = require('./routes/avatar_routes');
const { notFound, errorHandler } = require('./middlewares/error_handler');
const morgan = require('morgan');
const cors = require("cors");
const path = require('path');
const swaggerUi = require("swagger-ui-express");
const swaggerSpec = require("./swagger/swaggerConfig");


const PORT = process.env.PORT || 4444;
dbConnect();

app.use(cors());
app.use(morgan('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

// This disables the Content-Security-Policy
// and X-Download-Options headers.
// app.use(
//   helmet({
//     contentSecurityPolicy: false,
//     xDownloadOptions: false,
//   })
// );

app.use('/api/user', authRouter);
app.use('/api/admin', adminRoutes);


app.use('/api', dashboardRouter);
app.use('/api/avatar', avatarRouter);

// sweger api
app.use(
  "/api-docs",
  swaggerUi.serve,
  swaggerUi.setup(swaggerSpec, {
    swaggerOptions: {
      persistAuthorization: true,
    },
  })
);

// Serve React build
app.use(express.static(path.join(__dirname, './client/build')));

// React routing fallback
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, './client/build', 'index.html'));
});

// app.use(notFound);
// app.use(errorHandler);



app.listen(PORT, () => {
  console.log(`Server is running at ${PORT}`);
});

