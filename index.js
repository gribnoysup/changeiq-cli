#!/usr/bin/env node

'use strict';

var startTime, endTime;

var program = require('commander');
var colors = require('colors/safe');

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

var missingArgs = [];

var labels = {
  WARN : colors.bgYellow.black('WARN'),
  ERR : colors.bgRed.white('ERR')
};

function parseOptionAsInt (opt) {
  var int = parseInt(opt, 10);
  if (isNaN(int)) exit(`\'${opt}\' is not a number`, 1);
  return int;
}

function parseOptionAsArray (value) {
  var unique = [];
  value.split(',').map(e => e.trim()).forEach(e => {
    if (unique.indexOf(e) === -1) unique.push(e);
  });
  return unique;
}

function exit (msg, code, warn) {
  if (code === 1) msg = colors.red(msg);
  if (warn === 'warn') msg = colors.yellow(msg);
  if (warn === 'help') {
    console.log('\n' + '  ' + msg);
    program.help(); 
  } else {
    console.log('\n' + '  ' + msg + '\n');
  }
  process.exit(code);
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

function getStateCode (value) {
  var code = -1;
  
  for (var i = 0; i < codesMapping.length; i++) {
    if (codesMapping[i].indexOf(value) !== -1) {
      code = i;
      break;
    }
  }
  
  return code;
}

program
  .version('0.3.0')
  .usage('-d <domain> -u <username> -p <password> -f <path> -s <survey id> [-a <list>] [-r <list>] [-U <list>] [-C <list>] [-c] [-m [count]] [-t <ms>]');
  
program
  .option('-d, --nfield-domain <domain>', 'nfield domain')
  .option('-u, --nfield-username <username>', 'nfield username')
  .option('-p, --nfield-password <password>', 'nfield password')
  .option('-f, --path-to-file <path>', 'path to tsv file with two colums: INTNR and new state code')
  .option('-s, --survey-id <survey id>', 'nfield Survey ID')
  .option('-m, --max-requests [count]', 'serializes requests to API to groups of [count], defaults to 10 if argument provided with no value', parseOptionAsInt)
  .option('-t, --timeout <ms>', 'sets a timeout between API request \'blocks\' made with --max-requests', parseOptionAsInt)
  .option('-c, --change-unmapped', 'change state for unmapped codes to \'not checked\'')
  
  .option('-C, --not-checked <list>', 'comma-separated list of custom mappings for the \'not checked\' state', parseOptionAsArray, ['0', 'Not checked'])
  .option('-a, --approved <list>', 'comma-separated list of custom mappings for the \'approved\' state', parseOptionAsArray, ['1', 'Approved'])
  .option('-U, --unverified <list>', 'comma-separated list of custom mappings for the \'unverified\' state', parseOptionAsArray, ['2', 'Unverified'])
  .option('-r, --rejected <list>', 'comma-separated list of custom mappings for the \'rejected\' state', parseOptionAsArray, ['3', 'Rejected']);
  
program.parse(process.argv);

codesMapping = [program.notChecked, program.approved, program.unverified, program.rejected];

if (typeof program.nfieldDomain === 'undefined') missingArgs.push('--nfield-domain');
if (typeof program.nfieldUsername === 'undefined') missingArgs.push('--nfield-username');
if (typeof program.nfieldPassword === 'undefined') missingArgs.push('--nfield-password');
if (typeof program.pathToFile === 'undefined') missingArgs.push('--path-to-file');
if (typeof program.surveyId === 'undefined') missingArgs.push('--survey-id');

if (missingArgs.length > 0) {
  exit('missing argument(s): ' + missingArgs.join(', '), 1, 'help');
}

if (program.maxRequests === true) program.maxRequests = 10;

if (typeof program.maxRequests === 'undefined' && typeof program.timeout !== 'undefined') {
  console.log(`\n  ${labels.WARN} --timeout applied only with --max-requests, argument will be ignored`);
}

if (typeof program.timeout === 'undefined') program.timeout = 0;

startTime = process.hrtime();

fs.readFile(program.pathToFile, 'utf-8', function (err, file) {
  
  if (err) return exit(err.message, 1);
  
  var interviews = file.replace(/\r?\n/, '\n').split('\n').map(e => e.split('\t').map(function (n) { return n.trim() } ));
  var total = 0;
  var done = 0;
  
  interviews = interviews.filter(function (e) {
    return e && e.length >= 2 && !isNaN(e[0]);
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

      console.log(`\n  starting to process ${total} interviews...\n`);
      
      for (let i = 0; i < total; i++) {
        let interview = interviews[i];
        let stateCode = getStateCode(interview[1]);
        
        if (stateCode === -1 && program.changeUnmapped !== true) {
          console.log(`  ${colors.red(addLeadingZeroes(++done, total.toString().length, ' ') + ' of ' + total)} ${labels.ERR} skipping interview ${colors.cyan(addLeadingZeroes(interview[0], 8))}: state code ${colors.cyan(interview[1])} is mapped to ${colors.cyan('undefined')}`);
          interviews[i] = null;
          continue;
        }
        
      }
      
      return connectedClient;
    })
    .then(function (connectedClient) {
      
      var all = interviews.slice(0);
      var spliced = [];
      var promises = [];
      var promise = Promise.resolve();
      
      function changeStatus (client, param) {
        
        if (param === null) return;
        
        var stateCode = getStateCode(param[1]);
        
        return client.InterviewQuality
          .update({
            SurveyId : program.surveyId,
            InterviewId : addLeadingZeroes(param[0], 8),
            NewState : stateCode == -1 ? 0 : stateCode
          })
          .then(function (result) {
            var order = addLeadingZeroes(++done, total.toString().length, ' ') + ' of ' + total;
            var interviewNumber = addLeadingZeroes(param[0], 8);
            var statusLabel = codeLabels[ stateCode ];
            
            if (result[0].statusCode !== 200) {
              console.log(`  ${colors.red(order)} ${labels.ERR} interview ${colors.cyan(interviewNumber)} wasn't processed: ${colors.cyan(result[0].statusCode + ' ' + result[0].statusMessage)}`);
            } else if (typeof statusLabel === 'undefined') {
              console.log(`  ${colors.yellow(order)} ${labels.WARN} state code ${colors.cyan(param[1])} is mapped to ${colors.cyan('undefined')}`);
              console.log(`  ${colors.green(order)} changed state of interview ${colors.cyan(interviewNumber)} to ${colors.cyan(codeLabels[0])}`); 
            } else {
              console.log(`  ${colors.green(order)} changed state of interview ${colors.cyan(interviewNumber)} to ${colors.cyan(statusLabel)}`);  
            }
          });
      }
      
      function generateRequests (array, i) {
        var resolvedPromise = new Promise(function (resolve, reject) {
          setTimeout(function () {
            var promises = [];
            while (array.length > 0) {
              promises.push(changeStatus(connectedClient, array.shift()));
            }
            resolve(Promise.all(promises));
          }, i == 0 ? 0 : program.timeout);
        });
        
        return resolvedPromise;
      }
      
      if (typeof program.maxRequests !== 'undefined' && all.length > program.maxRequests) {
        
        while (all.length > 0) {
          spliced.push(all.splice(0, program.maxRequests));
        }
        
        for (let i = 0; i < spliced.length; i++) {
          promise = promise.then(function () {
            return generateRequests(spliced[i], i);
          });
        }
        
        return promise;
        
      } else {
        
        while (all.length > 0) {
          promises.push(
            changeStatus(connectedClient, all.shift())
          );
        }
        
        return Promise.all(promises);
      }
      
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
    
    exit(`no interviews found to update, ensure that file ${colors.bold(path.basename(program.pathToFile))} is valid`, 0, 'warn');
    
  }
  
});
