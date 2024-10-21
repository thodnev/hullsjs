// Basic DB manipulations to test some logic
import { afterAll, beforeAll, describe, expect, test } from 'vitest'

import h from '..'

async function clean_dbs() {
    const entries = await indexedDB.databases()
    if (!entries) {
        return
    }

    for (const {name, version: _ver} of entries) {
        const prom = new Promise((resolve, reject) => {
            const del = indexedDB.deleteDatabase(name as string)
            del.onsuccess = (_ev) => resolve(del.result)
            del.onerror = (_ev) => reject(del.error)
        })
        await prom
    }
}

async function create_empty_dbs(iterable: Iterable<string>) {
    const names = new Array(...iterable)
    for (const [version, name] of names.entries()) {
        const prom: Promise<IDBDatabase> = new Promise((resolve, reject) => {
            const opn = indexedDB.open(name, version + 1)
            opn.onsuccess = (_ev) => resolve(opn.result)
            opn.onerror = (_ev) => reject(opn.error)
        })

        const db = await prom
        db.close()
    }
}

// Erase all DBs
beforeAll(clean_dbs)

test('DBs are empty before testing', async () => {
    const dbs = await indexedDB.databases()
    expect(dbs).toHaveLength(0)
})

describe('Basic DB manipulations', () => {
    test('get_databases', async () => {
        let names = ['these', 'are', 'test', 'databases']
        await create_empty_dbs(names)

        let dbs = await h.HullsDB.get_databases()
        expect(Object.keys(dbs)).toHaveLength(names.length)
        expect(new Set(Object.keys(dbs))).toEqual(new Set(names))

        // TODO: test structure conformity
        // ? do we need to remove key from object on remove call?

        // remove 'test' database
        await dbs.test.remove_database()
        dbs = await h.HullsDB.get_databases()
        names.splice(names.indexOf('test'), 1)      // from names too
        expect(Object.values(dbs)).toHaveLength(names.length)
        expect(new Set(Object.keys(dbs))).toEqual(new Set(names))
    })

    test('db_version must always be int >= 1', () => {
        const smth = new h.HullsDB('smth')
        expect(smth.db_version).toBeUndefined()

        function try_ver(ver: any) {
            smth.db_version = ver
            expect(smth.db_version).toStrictEqual(ver)
        }
        function fail_ver(ver: any) {
            expect(() => {
                smth.db_version = ver
            }).toThrowError(h.HullsError)
        }
        // These should work ok
        try_ver(123)
        try_ver(1)
        try_ver(88)
        // These should raise error
        fail_ver(-1)        // negative
        fail_ver(0)         // zero
        fail_ver(1.05)      // non-integer
        fail_ver('150')     // non-number
    })

    test.todo('basic db open - first use', async () => {
        const db = new h.HullsDB('testdb') 
        db.create_table('mytab')
        db.create_table('person', {pkey: 'full_name', autoinc: true})

        db.drop_tables(['person', 'mytab'])
    })

    afterAll(clean_dbs)
})