#!/usr/bin/env node

'use strict';

var startTime, endTime;

var program = require('commander');
var colors = require('colors/safe');
var validUrl = require('valid-url');

var nfieldClient = require('nfield-api').NfieldClient;

var fs = require('fs');
var path = require('path');

var codeLabels = [
  'not checked',
  'approved',
  'unverified',
  'rejected'
];

var codesMapping = [];

function parseOptionAsInt (opt) {
  return parseInt(opt, 10);
}

function exit (msg, code, warn) {
  if (code === 1) msg = colors.red(msg);
  if (warn === true) msg = colors.yellow(msg);
  console.log('\n' + '  ' + msg + '\n');
  process.exit(code);
}

function validateProxyStr (str) {
  if (typeof validUrl.isUri(str) === 'undefined') {
    exit(`--proxy value \'${str}\' is not a valid URL`, 1);
  }
}

function addLeadingZeroes (str, max, symbol) {
  var string = String(str);
  const MAX_ZEROES = max;
  
  symbol = symbol || '0';
  
  for (var i = string.length; i < MAX_ZEROES; i++) {
    string = symbol + string;
  }
  
  return string;
}

program
  .version('0.1.0')
  .usage('-d <domain> -u <username> -p <password> -f <path> -s <survey id> [-a <code>] [-r <code>] [-U <code>] [-C <code>] [-P <proxy>]');
  
program
  .option('-d, --nfield-domain <domain>', 'nfield domain')
  .option('-u, --nfield-username <username>', 'nfield username')
  .option('-p, --nfield-password <password>', 'nfield password')
  .option('-f, --path-to-file <path>', 'path to tsv file with two colums: INTNR and new state code')
  .option('-s, --survey-id <survey id>', 'nfield Survey ID')
  .option('-C, --not-checked <code>', 'custom code for status \'not checked\'', parseOptionAsInt, 0)
  .option('-a, --approved <code>', 'custom code for status \'approved\'', parseOptionAsInt, 1)
  .option('-U, --unverified <code>', 'custom code for status \'unverified\'', parseOptionAsInt, 2)
  .option('-r, --rejected <code>', 'custom code for status \'rejected\'', parseOptionAsInt, 3)
  .option('-P, --proxy <proxy string>', 'proxy string', validateProxyStr);
  
program.parse(process.argv);

codesMapping = [program.notChecked, program.approved, program.unverified, program.rejected];

if (typeof program.nfieldDomain === 'undefined') exit('--nfield-domain missing', 1);
if (typeof program.nfieldUsername === 'undefined') exit('--nfield-username missing', 1);
if (typeof program.nfieldPassword === 'undefined') exit('--nfield-password missing', 1);
if (typeof program.pathToFile === 'undefined') exit('--path-to-file missing', 1);
if (typeof program.surveyId === 'undefined') exit('--survey-id missing', 1);

if (typeof program.proxy !== 'undefined') {
  nfieldClient = nfieldClient.defaults({
    proxy : program.proxy
  });
}

startTime = process.hrtime();

fs.readFile(program.pathToFile, 'utf-8', function (err, file) {
  
  if (err) return exit(err.message, 1);
  
  var interviews = file.replace(/\r?\n/, '\n').split('\n').map(e => e.split('\t').map(function (n) { return parseInt(n.trim(), 10) } ));
  var total = 0;
  var done = 0;
  
  interviews = interviews.filter(function (e) {
    return e && e.length >= 2 && !isNaN(e[0]) && !isNaN(e[1]);
  });
  
  total = interviews.length;

  if (total > 0) {
    
    nfieldClient.connect({
      Domain : program.nfieldDomain,
      Username : program.nfieldUsername,
      Password : program.nfieldPassword
    })
    .then(function (connectedClient) {
      return connectedClient.Surveys.get(program.surveyId).then(function (result) {
        
        if (result[0].statusCode !== 200) {
          throw new Error(`Error while getting survey:\n  ${result[0].statusCode}: ${result[0].statusMessage}`);
        }
        
        return connectedClient;
        
      });
    })
    .then(function (connectedClient) {
      let promises = [];
      
      console.log(`\n  starting to process ${total} interviews...\n`);
      
      for (let i = 0; i < total; i++) {
        let interview = interviews[i];
        promises.push(
          connectedClient.InterviewQuality
            .update({
              SurveyId : program.surveyId,
              InterviewId : addLeadingZeroes(interview[0], 8),
              NewState : codesMapping.indexOf(interview[1])
            })
            .then(function () {
              var order = colors.green(addLeadingZeroes(++done, total.toString().length, ' ') + ' of ' + total);
              var interviewNumber = colors.green(addLeadingZeroes(interview[0], 8));
              var statusLabel = colors.green(codeLabels[ codesMapping.indexOf(interview[1]) ]);
              console.log(`  ${order} changed status of interview ${interviewNumber} to ${statusLabel}`);
            })
        );
      }
      
      return Promise.all(promises);
    })
    .then(function () {
      endTime = process.hrtime(startTime);
      endTime.push(Math.round((endTime[0] + endTime[1] / (1000000 * 1000)) * 100 ) / 100);
      exit(`finished in ${colors.green(endTime[2] + 's')}`, 0);
    })
    .catch(function (error) {
      exit(error.message, 1);
    });
    
  } else {
    
    exit(`no interviews found to update, ensure that file ${colors.bold(path.basename(program.pathToFile))} is valid`, 0, true);
    
  }
  
});
