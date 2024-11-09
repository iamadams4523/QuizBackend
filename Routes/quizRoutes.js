const express = require('express');
const router = express.Router();
const upload = require('multer')({ dest: 'uploads/' });
const {
  uploadQuiz,
  getAllQuizzes,
  getQuizBySessionID,
} = require('../controllers/quizController.js');

router.post(
  '/upload-quiz',
  upload.fields([
    { name: 'questionFile', maxCount: 1 },
    { name: 'answerFile', maxCount: 1 },
  ]),
  uploadQuiz
);

router.get('/quizdata', getAllQuizzes);
router.get('/quizdata/:sessionID', getQuizBySessionID);

module.exports = router;
