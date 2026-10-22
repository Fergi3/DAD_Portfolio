// questions.js
// Diagnostic questions for each supported problem type.
// The key must match the problem type ID used in the frontend.
// Each question has: id, text, and an array of options.

const questions = {

  'leaky-sink': [
    {
      id: 'q1',
      text: 'Where do you see the water?',
      options: ['Under the sink', 'Around the faucet', 'From the drain', 'Not sure'],
    },
    {
      id: 'q2',
      text: 'Does it leak only when the water is running?',
      options: ['Yes', 'No', 'Not sure'],
    },
    {
      id: 'q3',
      text: 'Is water dripping from the curved pipe under the sink?',
      options: ['Yes', 'No', 'Not sure'],
    },
    {
      id: 'q4',
      text: 'Do any pipe connections feel loose?',
      options: ['Yes', 'No', "I haven't checked"],
    },
    {
      id: 'q5',
      text: 'Is there corrosion, cracking, or a strong smell?',
      options: ['Yes', 'No', 'Not sure'],
    },
  ],

  'running-toilet': [
    {
      id: 'q1',
      text: 'What does the running sound like?',
      options: ['Water trickling into bowl constantly', 'Gurgling or intermittent refilling', 'A hissing sound from the tank'],
    },
    {
      id: 'q2',
      text: 'Does the toilet flush normally?',
      options: ['Yes, flushes fine but keeps running', 'Weak flush', "Doesn't flush at all"],
    },
    {
      id: 'q3',
      text: 'How long has this been happening?',
      options: ['Just started today', 'A few days', 'Weeks or longer'],
    },
  ],

  'clogged-disposal': [
    {
      id: 'q1',
      text: 'What happens when you turn the disposal on?',
      options: ['Nothing at all — no sound', 'Humming sound but no spinning', 'Makes a grinding/crunching noise', 'Trips off and needs reset'],
    },
    {
      id: 'q2',
      text: 'Is there standing water in the sink?',
      options: ["Yes — it won't drain", 'Drains slowly', 'No standing water'],
    },
  ],

  'tripped-breaker': [
    {
      id: 'q1',
      text: 'What was happening when the breaker tripped?',
      options: ['I turned on an appliance', 'Nothing obvious — it just tripped', 'A storm or power surge', 'Running multiple things at once'],
    },
    {
      id: 'q2',
      text: 'Has this same breaker tripped before?',
      options: ['First time this has happened', 'Trips occasionally', 'Trips frequently'],
    },
    {
      id: 'q3',
      text: 'What does the breaker panel look like?',
      options: ['One breaker is in the middle (tripped) position', 'Multiple breakers tripped', 'Everything looks normal but still no power'],
    },
  ],

  'thermostat-issues': [
    {
      id: 'q1',
      text: 'What is the thermostat currently doing?',
      options: ['Blank screen / no display', "Set temp but system won't turn on", "Runs but doesn't reach set temperature", 'Runs constantly without shutting off'],
    },
    {
      id: 'q2',
      text: 'What type of thermostat is it?',
      options: ['Basic dial or slide thermostat', 'Programmable thermostat', 'Smart thermostat (Nest, Ecobee, etc.)'],
    },
    {
      id: 'q3',
      text: 'When did this problem start?',
      options: ['After changing batteries', 'After a power outage', 'Randomly with no clear cause'],
    },
  ],

  'dishwasher-not-draining': [
    {
      id: 'q1',
      text: 'Where is the standing water located?',
      options: ['Pooled at the bottom of the dishwasher', 'Backed up into the sink', 'Both the dishwasher and sink'],
    },
    {
      id: 'q2',
      text: 'When did this start?',
      options: ['After a recent wash cycle', 'Gradually got worse over time', 'After a recent installation or move'],
    },
    {
      id: 'q3',
      text: 'Have you cleaned the dishwasher filter recently?',
      options: ['Yes, recently cleaned', 'No, never cleaned it', "Didn't know there was a filter"],
    },
  ],

  'dryer-not-heating': [
    {
      id: 'q1',
      text: 'What is the dryer doing?',
      options: ['Tumbles normally but produces no heat', "Won't turn on at all", 'Starts then shuts off mid-cycle'],
    },
    {
      id: 'q2',
      text: 'What type of dryer is it?',
      options: ['Electric dryer', 'Gas dryer'],
    },
    {
      id: 'q3',
      text: 'How was the lint trap before this run?',
      options: ['I just cleaned it', 'It was full or clogged', 'I never check the lint trap'],
    },
  ],

  'door-hardware': [
    {
      id: 'q1',
      text: 'What is the specific problem?',
      options: ["Lock won't turn or is very stiff", "Door won't latch / close properly", 'Hinge is loose or squeaky', 'Door sticks or drags on the floor'],
    },
    {
      id: 'q2',
      text: 'Is this an interior or exterior door?',
      options: ['Interior door', 'Exterior / entry door'],
    },
  ],

  'washer-leaking': [
    {
      id: 'q1',
      text: 'Where is the water coming from?',
      options: ['Front of the machine', 'Back or sides (around hoses)', 'Underneath the machine', "Not sure"],
    },
    {
      id: 'q2',
      text: 'When does the leak happen?',
      options: ['During fill cycle', 'During the wash cycle', 'During spin or drain cycle', 'Anytime water is present'],
    },
    {
      id: 'q3',
      text: 'Is it a top-load or front-load washer?',
      options: ['Top-load washer', 'Front-load washer'],
    },
  ],

  'hvac-maintenance': [
    {
      id: 'q1',
      text: 'What is the main issue or reason for maintenance?',
      options: ['Reduced airflow from vents', 'System is louder than usual', 'Higher than normal energy bills', 'Just doing routine maintenance'],
    },
    {
      id: 'q2',
      text: 'When was the air filter last replaced?',
      options: ['Within the last month', '1–3 months ago', 'More than 3 months ago', 'Never or unknown'],
    },
    {
      id: 'q3',
      text: 'When was the last professional HVAC service?',
      options: ['Within the last year', '1–2 years ago', 'More than 2 years ago', 'Never'],
    },
  ],

};

module.exports = questions;
