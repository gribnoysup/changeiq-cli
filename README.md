### > changeiq

Command line tool for automatic change of q. c. state of multiple interviews in specific survey

Nfield domain, username and password arguments are required, as the survey id and a path to tsv file with two colums: INTNR and State Code

Default state codes are as follows:

| Code | State       |
|------|-------------|
| 0    | Not checked |
| 1    | Approved    |
| 2    | Unverified  |
| 3    | Rejected    |

Custom codes could be provided for statuses with following flags:

    -C, --not-checked <code>          custom code for status 'not checked'
    -a, --approved <code>             custom code for status 'approved'
    -U, --unverified <code>           custom code for status 'unverified'
    -r, --rejected <code>             custom code for status 'rejected'

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
    -C, --not-checked <code>          custom code for status 'not checked'
    -a, --approved <code>             custom code for status 'approved'
    -U, --unverified <code>           custom code for status 'unverified'
    -r, --rejected <code>             custom code for status 'rejected'
    -P, --proxy <proxy string>        proxy string

##### Example:

First we need to make a valid file with interviews list to pass to CLI. Let's name it `interviews.txt` and fill with some data:

    65	3
    86	3
    98	1
    123	1
    
First column is INTNR, second is the new state code (default codes are used for this example), columns are tab separated, empty or NaN cells are ignored by CLI

Then run command `changeiq` replacing `-d`, `-u,`, `-p`, `-f`, `-s` with valid data

    changeiq -d DMN -u Username -p p455w0rD -f interviews.txt -s real-survey-id
    
If all goes well, you shuld see something like this in your terminal:

    
      starting to process 4 interviews...
    
      1 of 4 changed status of interview 00000123 to approved
      2 of 4 changed status of interview 00000098 to approved
      3 of 4 changed status of interview 00000086 to rejected
      4 of 4 changed status of interview 00000065 to rejected
    
      finished in 0.9s
    
If interviews list is generated with some fieldwork software and state codes differs from those that are used in Nfield, you can provide your custom codes in arguments and not change them in file.

For example if our `interviews.txt` looked something like this from the start

    65	19
    86	19
    98	18
    123	18
    
where 19 is rejected and 18 is approved, we could run changeiq with following additional `-a` and `-r` arguments 

    changeiq -d DMN -u Username -p p455w0rD -f interviews.txt -s real-survey-id -a 18 -r 19
