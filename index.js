// Import required modules
const express = require('express');
const mongoose = require('mongoose');
const fs = require('fs');
const multer = require('multer');
const cors = require('cors');
const morgan = require('morgan');
const pdfParse = require('pdf-parse');
const dotenv = require('dotenv');
dotenv.config();

// Initialize the app and configure multer for file uploads
const app = express();
const upload = multer({ dest: 'uploads/' });
const PORT = process.env.PORT || 3000;

// Middleware configuration
app.use(cors());
app.use(morgan('dev'));

// Connect to MongoDB
mongoose
  .connect(
    'mongodb+srv://iamadams4523:NNtoPPhSCexRl0Wp@quiz.cmsnt.mongodb.net/?retryWrites=true&w=majority&appName=quiz'
  )
  .then(() => {
    console.log('Connected to database successfully');
    app.listen(PORT, () => console.log(`Server is running on port ${PORT}`));
  })
  .catch((err) => console.error('Connection Failed', err));

const quizSchema = new mongoose.Schema({
  sessionID: Number,
  quizData: [
    {
      id: Number,
      question: String,
      options: [String],
      answer: String,
    },
  ],
});

const Quiz = mongoose.model('Quiz', quizSchema);

// Helper function to generate a random 6-digit session ID
const generateSessionID = () => Math.floor(100000 + Math.random() * 900000);

// Helper function to parse questions and options from the text
const parseQuestions = (text) => {
  const questions = [];
  const questionBlocks = text.split(/\d+\.\s+/).slice(1); // Split on digits followed by dot and space

  questionBlocks.forEach((block) => {
    const lines = block.split('\n').filter((line) => line.trim()); // Remove empty lines
    const questionText = lines[0].trim();
    const options = lines
      .slice(1)
      .map((line) => line.replace(/^[•\s]*[A-D]\)\s*/, '').trim())
      .slice(0, 4); // Limit to first 4 options

    questions.push({ question: questionText, options });
  });

  return questions;
};

// Helper function to parse answers from the text
const parseAnswers = (text) => {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.match(/^\d+\.\s*(.+)/))
    .map((line) => line.match(/^\d+\.\s*(.+)/)[1]); // Extract answer part
};

// Combined route to handle both question and answer PDFs upload, parse, and save quiz data
app.post(
  '/api/upload-quiz',
  upload.fields([
    { name: 'questionFile', maxCount: 1 },
    { name: 'answerFile', maxCount: 1 },
  ]),
  async (req, res) => {
    try {
      console.log('Received a PDF upload request.');

      // Ensure both files are uploaded
      if (!req.files || !req.files.questionFile || !req.files.answerFile) {
        return res.status(400).json({
          message: 'Both question and answer PDF files are required.',
        });
      }

      // Read files from temporary storage
      const questionPdfPath = req.files.questionFile[0].path;
      const answerPdfPath = req.files.answerFile[0].path;

      // Parse PDF contents for questions and answers
      const parsedQuestionText = (
        await pdfParse(fs.readFileSync(questionPdfPath))
      ).text.replace(/\n+/g, '\n');
      const parsedAnswerText = (
        await pdfParse(fs.readFileSync(answerPdfPath))
      ).text.replace(/\n+/g, '\n');

      const questionsArray = parseQuestions(parsedQuestionText);
      const answersArray = parseAnswers(parsedAnswerText);

      // Combine questions and answers, adding an incremental ID and random session ID
      const quizData = questionsArray.map((q, index) => ({
        id: index + 1,
        question: q.question,
        options: q.options,
        answer: answersArray[index] || 'No answer provided',
      }));
      const sessionID = generateSessionID();

      // Save parsed quiz data in MongoDB
      const quizDocument = new Quiz({ sessionID, quizData });
      await quizDocument.save();

      res.json({ id: quizDocument._id, sessionID, quizData });
    } catch (error) {
      console.error('Error processing PDF files:', error);
      res.status(500).json({ message: 'Error processing PDF files' });
    } finally {
      // Cleanup uploaded files from server storage
      [req.files.questionFile[0].path, req.files.answerFile[0].path].forEach(
        (filePath) => {
          fs.unlink(filePath, (err) => {
            if (err) console.error('Error deleting file:', err);
          });
        }
      );
    }
  }
);

// Get all quiz data
app.get('/api/quizdata', async (req, res) => {
  try {
    const quizData = await Quiz.find({});
    res.status(200).json(quizData);
  } catch (error) {
    console.error('Error fetching quiz data:', error);
    res.status(500).json({ message: 'Error fetching quiz data' });
  }
});

// Get specific quiz data by sessionID
app.get('/api/quizdata/:sessionID', async (req, res) => {
  try {
    const sessionID = parseInt(req.params.sessionID, 10);
    if (isNaN(sessionID)) {
      return res.status(400).json({ message: 'Invalid session ID format' });
    }

    const quizData = await Quiz.findOne({ sessionID });
    if (!quizData) {
      return res.status(404).json({ message: 'Quiz data not found' });
    }
    res.json(quizData);
  } catch (error) {
    console.error('Error fetching quiz data:', error);
    res.status(500).json({ message: 'Error fetching quiz data' });
  }
});
