### > changeiq

A command line tool for an automatic change of the q. c. state of multiple interviews in a specific survey.

Nfield domain, username and password arguments are required, as well as the survey id and the path to tsv file with two columns: INTNR and New State.

#### Install with npm:

    npm install changeiq-cli --global

#### Usage:

    changeiq -d <domain> -u <username> -p <password> -f <path> -s <survey id> [-a <list>] [-r <list>] [-U <list>] [-C <list>] [-c] [-m [count]] [-t <ms>]

#### Options:

    -h, --help                        output usage information
    -V, --version                     output the version number
    -d, --nfield-domain <domain>      nfield domain
    -u, --nfield-username <username>  nfield username
    -p, --nfield-password <password>  nfield password
    -f, --path-to-file <path>         path to tsv file with two colums: INTNR and new state code
    -s, --survey-id <survey id>       nfield Survey ID
    -m, --max-requests [count]        serializes requests to API to groups of [count], defaults to 10 if argument provided with no value
    -t, --timeout <ms>                sets a timeout between API request 'blocks' made with --max-requests
    -c, --change-unmapped             change state for unmapped codes to 'not checked'
    -C, --not-checked <list>          comma-separated list of custom mappings for the 'not checked' state
    -a, --approved <list>             comma-separated list of custom mappings for the 'approved' state
    -U, --unverified <list>           comma-separated list of custom mappings for the 'unverified' state
    -r, --rejected <list>             comma-separated list of custom mappings for the 'rejected' state

#### Example:

First we need to create a valid file with an interviews list to pass to the CLI. 
Let's name it `interviews.txt` and fill it with some data:

    65	3
    86	3
    98	1
    123	1
    
The first column is the INTNR; the second is the new state code (default codes 
are used for this example); columns are tab separated; empty or NaN cells are 
ignored by the CLI.

Then we run the `changeiq` command replacing `-d`, `-u,`, `-p`, `-f`, `-s` values
with valid data:

    changeiq -d DMN -u Username -p p455w0rD -f interviews.txt -s real-survey-id
    
If all goes well, something like this will appear in your terminal:

    
      starting to process 4 interviews...
    
      1 of 4 changed status of interview 00000123 to approved
      2 of 4 changed status of interview 00000098 to approved
      3 of 4 changed status of interview 00000086 to rejected
      4 of 4 changed status of interview 00000065 to rejected
    
      finished in 0.9s

#### Changing state code mapping:

By default `changeiq` looks for this standart Nfield codes (or their labels) in the 
provided tsv file to send ['state change' request][1] to Nfield API. This codes are as follows:

| Code | Label       |
|------|-------------|
| 0    | Not checked |
| 1    | Approved    |
| 2    | Unverified  |
| 3    | Rejected    |

So if provided file looks something like this: 

    1	SUCCESS
    6	FAIL
    7	true
    8	false
    9	-1
    10	10
    
You will get just a bunch of errors, trying to pass it to the `changeiq` as is:

      1 of 6 ERR skipping interview 00000001: state code SUCCESS is mapped to undefined
      2 of 6 ERR skipping interview 00000006: state code FAIL is mapped to undefined
      3 of 6 ERR skipping interview 00000007: state code true is mapped to undefined
      4 of 6 ERR skipping interview 00000008: state code false is mapped to undefined
      5 of 6 ERR skipping interview 00000009: state code -1 is mapped to undefined
      6 of 6 ERR skipping interview 00000010: state code 10 is mapped to undefined

This could be changed with the following arguments:

    -C, --not-checked <list>          comma-separated list of custom mappings for the 'not checked' state
    -a, --approved <list>             comma-separated list of custom mappings for the 'approved' state
    -U, --unverified <list>           comma-separated list of custom mappings for the 'unverified' state
    -r, --rejected <list>             comma-separated list of custom mappings for the 'rejected' state
    
They accept a list of comma-separated values (or just one value) that is parsed to 
an array of unique case-sensitive values that will be used to map state codes to the 
['state change' request][1]. So for this bizzare example of a file that is provided 
above, you could run `changeiq` like this:

    changeiq -d DMN -u Username -p p455w0rD -f interviews.txt -s real-survey-id -a SUCCESS,true,10 -r FAIL,false -U -1
    
and change states of all this interviews with no errors

      1 of 6 changed state of interview 00000008 to rejected
      2 of 6 changed state of interview 00000001 to approved
      3 of 6 changed state of interview 00000010 to approved
      4 of 6 changed state of interview 00000006 to rejected
      5 of 6 changed state of interview 00000009 to unverified
      6 of 6 changed state of interview 00000007 to approved

#### Changing unmapped codes:

By defaults all interviews from the provided tsv file with codes that does not 
correspond to default state codes or custom codes (if they are passed to the arguments) 
will be skipped by the CLI and log an error message:

      starting to process 11 interviews...
    
      1 of 11 ERR skipping interview 00000004: state code 4 is mapped to undefined
      2 of 11 ERR skipping interview 00000005: state code 5 is mapped to undefined
      
But because Nfield API allows to pass any value to the NewState parameter of the ['state change' request][1] 
and interprets it as 'not checked' state, you can allow this behaviour with `--change-unmapped` flag. 
With this flag all interviews with unmapped state codes will be changed to 'not checked' state. 
In the logs you will see something like this:

      11 of 11 WARN state code 123 is mapped to undefined
      11 of 11 changed state of interview 00000065 to not checked
      
#### Limiting maximum request rate:

By default `changeiq` collects all 'state update' requests to an array and calls 
them with Promise.all, waiting for all of them to finish async at once, but sometimes 
it is not possible: for example when you need to handle a lot of data and your proxy limit request 
rate to some `count` in `time`. You can serialize all requests with 
`--max-requests [--timeout <ms>]` like this:

    changeiq -d DMN -u Username -p p455w0rD -f interviews.txt -s real-survey-id -m 1000 -t 60000
    
This will limit request rate of the CLI to 1000 requests in one minute (60000ms).

For example, here I run CLI, limiting requests to 1 in 30 seconds:

    changeiq -d DMN -u Username -p p455w0rD -f interviews.txt -s real-survey-id -m 1 -t 30000
    
and get an expected result of 152 seconds, taking in the account that first serialized
request fires immidiately and ~2 secs goes to network delays
    
      starting to process 6 interviews...
    
      1 of 6 changed state of interview 00000001 to rejected
      2 of 6 changed state of interview 00000006 to rejected
      3 of 6 changed state of interview 00000007 to approved
      4 of 6 changed state of interview 00000008 to rejected
      5 of 6 changed state of interview 00000009 to rejected
      6 of 6 changed state of interview 00000010 to approved
    
      finished in 152.86s

[1]:https://api.nfieldmr.com/help/api/put-v1-surveys-surveyid-interviewquality