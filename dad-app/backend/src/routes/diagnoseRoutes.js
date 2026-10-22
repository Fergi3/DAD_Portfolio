// diagnoseRoutes.js
// Maps URL endpoints to controller functions.
// All routes here are prefixed with /api (configured in server.js).
// Keep route definitions short — no logic belongs here.

const express    = require('express');
const router     = express.Router();
const controller = require('../controllers/diagnoseController');

// GET  /api/questions/:problemType  — fetch diagnostic questions
router.get('/questions/:problemType', controller.getQuestions);

// POST /api/diagnose                — submit answers and get a diagnosis
router.post('/diagnose', controller.getDiagnosis);

// POST /api/clarify                 - create follow-up questions for custom issues
router.post('/clarify', controller.getClarificationQuestions);

module.exports = router;
