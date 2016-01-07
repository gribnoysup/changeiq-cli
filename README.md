### > changeiq

A command line tool for an automatic change of the q. c. state of multiple interviews in a specific survey.

Nfield domain, username and password arguments are required, as well as the survey id and the path to tsv file with two columns: INTNR and State Code.

Default state codes are as follows:

| Code | State       |
|------|-------------|
| 0    | Not checked |
| 1    | Approved    |
| 2    | Unverified  |
| 3    | Rejected    |

Custom states codes can be provided with the following arguments:

    -C, --not-checked <code>          custom code for the 'not checked' state
    -a, --approved <code>             custom code for the 'approved' state
    -U, --unverified <code>           custom code for the 'unverified' state
    -r, --rejected <code>             custom code for the 'rejected' state

##### Install with npm:

    npm install changeiq-cli --global

##### Use:

    changeiq -d <domain> -u <username> -p <password> -f <path> -s <survey id> [-a <code>] [-r <code>] [-U <code>] [-C <code>] [-P <proxy>]

##### Options:

    -h, --help                        output usage information
    -V, --version                     output the version number
    -d, --nfield-domain <domain>      nfield domain
    -u, --nfield-username <username>  nfield username
    -p, --nfield-password <password>  nfield password
    -f, --path-to-file <path>         path to tsv file with two colums: INTNR and new state code
    -s, --survey-id <survey id>       nfield Survey ID
    -C, --not-checked <code>          custom code for the 'not checked' state
    -a, --approved <code>             custom code for the 'approved' state
    -U, --unverified <code>           custom code for the 'unverified' state
    -r, --rejected <code>             custom code for the 'rejected' state
    -P, --proxy <proxy string>        proxy string

##### Example:

First we need to create a valid file with an interviews list to pass to the CLI. Let's name it `interviews.txt` and fill it with some data:

    65	3
    86	3
    98	1
    123	1
    
The first column is the INTNR; the second is the new state code (default codes are used for this example); columns are tab separated; empty or NaN cells are ignored by the CLI.

Then we run the `changeiq` command replacing `-d`, `-u,`, `-p`, `-f`, `-s` with valid data:

    changeiq -d DMN -u Username -p p455w0rD -f interviews.txt -s real-survey-id
    
If all goes well, something like this will appear in your terminal:

    
      starting to process 4 interviews...
    
      1 of 4 changed status of interview 00000123 to approved
      2 of 4 changed status of interview 00000098 to approved
      3 of 4 changed status of interview 00000086 to rejected
      4 of 4 changed status of interview 00000065 to rejected
    
      finished in 0.9s
    
If the interviews list is generated with some fieldwork software and state codes differ from those that are used in Nfield, you can provide your custom codes in arguments without changing them in the file.

For example, if our `interviews.txt` looked something like this from the start:

    65	19
    86	19
    98	18
    123	18
    
where 19 is rejected and 18 is approved, we could run `changeiq` with the following additional `-a` and `-r` arguments:

    changeiq -d DMN -u Username -p p455w0rD -f interviews.txt -s real-survey-id -a 18 -r 19
