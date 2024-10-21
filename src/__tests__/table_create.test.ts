// TODO: add Puppeteer to test in a proper browser environment (argos-ci/jest-puppeteer)

import { describe, expect, beforeAll, test } from 'vitest'
import * as h from '../hulls'
import { OP } from '../hulls'


describe('Create tables', () => {
    let db: h.HullsDB

    function last_entry() {
        const arr = db.oplist
        return arr.length ? arr[arr.length - 1] : null
    }

    function entry_equals(obj) {
        const last = last_entry()
        return expect(last).toStrictEqual(obj)
    }

    function with_autoinc(obj, autoinc?) {
        if (autoinc != undefined) {
            obj['autoinc'] = autoinc
        }
        return obj
    }

    function add(obj) {
        return {[OP.add_table]: obj}
    }

    beforeAll(() => {
        db = new h.HullsDB('testdb')
        return db
    })

    test('oplist after instantiation', () => {
        expect(db.oplist).toHaveLength(0)
    })

    test('last_entry helper correctly set', () => {
        expect(last_entry()).toBeNull()
    })

    test('add table with only name provided', () => {
        db.create_table({name: 'onlyname'})
        entry_equals(add({name: 'onlyname'}))
    })

    test.each([true, false])
             ('create table with name and autoinc %s', (ainc) => {
        const ent = {name: `name+inc${ainc}`, autoinc: ainc}
        // this calls don't change added entry yet
        db.create_table(ent)
        entry_equals(add(ent))
    })

    test.each([undefined, true, false])
             ('create table with string key and autoinc %s', (ainc) => {
        const entry = with_autoinc({name: `strkey+${ainc}`, pkey: 'astring'}, ainc)
        db.create_table(entry)
        entry_equals(add(entry))
    })

    test('create table with AUTOINC key', () => {
        const entry = {name: 'AUTOINC', pkey: h.AUTOINC}
        db.create_table(entry)
        entry_equals(add({name: entry.name, autoinc: true}))
    })

    test.each([undefined, true, false])
             ('create table with empty array key and autoinc %s', (ainc) => {
        const entry = with_autoinc({name: `[]key+${ainc}`}, ainc)
        db.create_table(entry)
        entry_equals(add(entry))
    })

    test.todo('create table with array key and *separate* autoinc %s')

    test.each([undefined, true])
             ('create table with key: array *containing* AUTOINC and separate autoinc %s', (ainc) => {
        const tname = '[..., AUTOINC]'
        const keys = ['one', 'two']
        // here AUTOINC should get removed from keys
        const entry = with_autoinc({name: tname, pkey: [...keys, h.AUTOINC]}, ainc)
        db.create_table(entry)
        entry_equals(add({name: tname, pkey: keys, autoinc: true}))
    })

    // TODO: test & ensure that .autoinc always gets set when it was provided
    //       (no matter how exactly)
})
// const db = new h.HullsDB('mydb');
// db.create_table({name: 'nokey'});
// db.create_table({name: 'nokeynoinc', autoinc: false});
// db.create_table({name: 'nokey+inc', autoinc: true});
// db.create_table({name: 'str', key: 'noinchere'});
// db.create_table({name: 'strnoinc', key: 'dontincme', autoinc: false});
// db.create_table({name: 'str+inc', key: 'incme', autoinc: true});
// db.create_table({name: 'arr[]', key: []});
// db.create_table({name: 'arr[..]', key: ['one', 'two']});
// db.create_table({name: 'arr[..]+inc', key: ['one', 'two'], autoinc: true});
// db.create_table({name: 'arr[.., AUTOINC]', key: ['one', 'two', h.AUTOINC]});
// db.create_table({name: 'AUTOINC', key: h.AUTOINC});
//db.create_table({name: 'errAUTOINC', key: h.AUTOINC, autoinc: false});
//db.create_table({name: 'errarr[.., AUTOINC]', key: ['one', 'two', h.AUTOINC], autoinc: false});
//console.log(`Result:\n${db.oplist}`);
//console.table(db.oplist);
