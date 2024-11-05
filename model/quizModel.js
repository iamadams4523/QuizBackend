const mongoose = require('mongoose');

// Counter schema to manage the sequence
const counterSchema = new mongoose.Schema({
  name: { type: String, required: true },
  seq: { type: Number, default: 0 },
});

const Counter = mongoose.model('Counter', counterSchema);

// Quiz schema
const quizSchema = new mongoose.Schema({
  id: Number, // this will be auto-incremented
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

// Pre-save hook to auto-increment the id field
quizSchema.pre('save', async function (next) {
  const doc = this;

  // Fetch and increment the counter value for 'quizId'
  const counter = await Counter.findOneAndUpdate(
    { name: 'quizId' },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );

  doc.id = counter.seq;
  next();
});

const Quiz = mongoose.model('Quiz', quizSchema);

module.exports = { Quiz, Counter };
