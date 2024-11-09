const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const morgan = require('morgan');
const dotenv = require('dotenv');
const quizRoutes = require('./Routes/quizRoutes');

dotenv.config();
const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(morgan('dev'));

mongoose
  .connect(process.env.MONGODB_URL)
  .then(() => {
    console.log('Connected to database successfully');
    app.listen(PORT, () => console.log(`Server is running on port ${PORT}`));
  })
  .catch((err) => console.error('Connection Failed', err));

app.use('/api', quizRoutes);
