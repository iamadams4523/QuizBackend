// Import required modules
const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const cors = require('cors');
const morgan = require('morgan');
const fileUpload = require('express-fileupload');
const PORT = process.env.PORT || 3000;
require('dotenv').config();

// Initialize the app
const app = express();

// Middleware configuration
app.use(cors()); // Enable CORS
app.use(bodyParser.json()); // Parse incoming requests with JSON payloads
app.use(morgan('combined')); // Log HTTP request

app.use(fileUpload());

mongoose
  .connect(
    'mongodb+srv://iamadams4523:NNtoPPhSCexRl0Wp@quiz.cmsnt.mongodb.net/?retryWrites=true&w=majority&appName=quiz'
  )
  .then(() => {
    console.log('Connected to database successfully');
    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('Connection Failed', err);
  });

// // Route to handle PDF upload
app.post('/api/upload-questions', async (req, res) => {
  try {
    // Check if the file is uploaded
    if (!req.files || !req.files.pdfFile) {
      return res.status(400).json({ message: 'No pdf file uploaded' });
    }

    // Parse PDF content to extract questions and options
    const parsePdf = async (pdfBuffer) => {
      const pdfData = await pdfParse(pdfBuffer);
      const text = pdfData.text;

      const questions = [];
      const options = [];

      // Regex patterns for parsing questions and options
      const questionRegex =
        /(?:Q\d+|^\d+)[.:]\s*(.*?)(?=(?:Q\d+|^\d+)[.:]|$)/gms; // Questions start with "Q1", "Q2", etc.
      const optionRegex = /[A-D][).]\s*(.*?)(?=\s*[A-D][).]|$)/g; // Options start with "A.", "B.", etc.

      let questionMatch;
      while ((questionMatch = questionRegex.exec(text)) !== null) {
        const questionText = questionMatch[1].trim();

        // Find options within the question text
        const questionOptions = [];
        let optionMatch;
        while ((optionMatch = optionRegex.exec(questionText)) !== null) {
          questionOptions.push(optionMatch[1].trim());
        }

        // Clean question text and add to JSON structures
        const cleanQuestionText = questionText.replace(optionRegex, '').trim();
        questions.push({ question: cleanQuestionText });
        options.push({ options: questionOptions });
      }

      return { questions, options };
    };

    // Parse the uploaded PDF file buffer
    const { questions, options } = await parsePdf(req.files.pdfFile.data);

    // Send the parsed data as a JSON response
    res.status(200).json({
      message: 'PDF content parsed successfully',
      questions,
      options,
    });
  } catch (error) {
    console.error('Error parsing PDF:', error);
    res.status(500).json({ message: 'Error processing PDF file' });
  }
});
