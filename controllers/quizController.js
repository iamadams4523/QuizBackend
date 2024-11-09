const fs = require('fs');
const pdfParse = require('pdf-parse');
const Quiz = require('../model/quizModel');

// Helper function to generate a random 6-digit session ID
const generateSessionID = () => Math.floor(100000 + Math.random() * 900000);

// Helper function to parse questions and options from the text
const parseQuestions = (text) => {
  const questions = [];
  const questionBlocks = text.split(/\d+\.\s+/).slice(1);

  questionBlocks.forEach((block) => {
    const lines = block.split('\n').filter((line) => line.trim());
    const questionText = lines[0].trim();
    const options = lines
      .slice(1)
      .map((line) => line.replace(/^[•\s]*[A-D]\)\s*/, '').trim())
      .slice(0, 4);

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
    .map((line) => line.match(/^\d+\.\s*(.+)/)[1]);
};

// Upload and parse quiz PDF files
const uploadQuiz = async (req, res) => {
  try {
    if (!req.files || !req.files.questionFile || !req.files.answerFile) {
      return res.status(400).json({
        message: 'Both question and answer PDF files are required.',
      });
    }

    const questionPdfPath = req.files.questionFile[0].path;
    const answerPdfPath = req.files.answerFile[0].path;

    const parsedQuestionText = (
      await pdfParse(fs.readFileSync(questionPdfPath))
    ).text.replace(/\n+/g, '\n');
    const parsedAnswerText = (
      await pdfParse(fs.readFileSync(answerPdfPath))
    ).text.replace(/\n+/g, '\n');

    const questionsArray = parseQuestions(parsedQuestionText);
    const answersArray = parseAnswers(parsedAnswerText);

    const quizData = questionsArray.map((q, index) => ({
      id: index + 1,
      question: q.question,
      options: q.options,
      answer: answersArray[index] || 'No answer provided',
    }));
    const sessionID = generateSessionID();

    const quizDocument = new Quiz({ sessionID, quizData });
    await quizDocument.save();

    res.json({ id: quizDocument._id, sessionID, quizData });
  } catch (error) {
    console.error('Error processing PDF files:', error);
    res.status(500).json({ message: 'Error processing PDF files' });
  } finally {
    [req.files.questionFile[0].path, req.files.answerFile[0].path].forEach(
      (filePath) => {
        fs.unlink(filePath, (err) => {
          if (err) console.error('Error deleting file:', err);
        });
      }
    );
  }
};

// Fetch all quiz data
const getAllQuizzes = async (req, res) => {
  try {
    const quizData = await Quiz.find({});
    res.status(200).json(quizData);
  } catch (error) {
    console.error('Error fetching quiz data:', error);
    res.status(500).json({ message: 'Error fetching quiz data' });
  }
};

// Fetch quiz data by sessionID
const getQuizBySessionID = async (req, res) => {
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
};

module.exports = { uploadQuiz, getAllQuizzes, getQuizBySessionID };
