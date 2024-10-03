// TODO: rewrite it as a Jest test
//       with Puppeteer to test in a proper browser environment
// argos-ci/jest-puppeteer, etroynov/esbuild-jest || kulshekhar/ts-jest, 

import h from '..'

const db = new h.HullsDB('mydb');
db.create_table({name: 'nokey'});
db.create_table({name: 'nokeynoinc', autoinc: false});
db.create_table({name: 'nokey+inc', autoinc: true});
db.create_table({name: 'str', key: 'noinchere'});
db.create_table({name: 'strnoinc', key: 'dontincme', autoinc: false});
db.create_table({name: 'str+inc', key: 'incme', autoinc: true});
db.create_table({name: 'arr[]', key: []});
db.create_table({name: 'arr[..]', key: ['one', 'two']});
db.create_table({name: 'arr[..]+inc', key: ['one', 'two'], autoinc: true});
db.create_table({name: 'arr[.., AUTOINC]', key: ['one', 'two', h.AUTOINC]});
db.create_table({name: 'AUTOINC', key: h.AUTOINC});
//db.create_table({name: 'errAUTOINC', key: h.AUTOINC, autoinc: false});
//db.create_table({name: 'errarr[.., AUTOINC]', key: ['one', 'two', h.AUTOINC], autoinc: false});
console.log(`Result:\n${db.oplist}`);
console.table(db.oplist);
