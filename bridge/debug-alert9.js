import { evaluate, getClient } from '../src/connection.js';
import * as capture from '../src/core/capture.js';
import * as data from '../src/core/data.js';

const wait = ms => new Promise(r => setTimeout(r, ms));
const client = await getClient();

// First, let's see what the indicator actually outputs - to understand what outputs should be in the dropdown
console.log('=== Checking indicator outputs ===');
const studyVals = await data.getStudyValues();
console.log(JSON.stringify(studyVals, null, 2));

process.exit(0);
