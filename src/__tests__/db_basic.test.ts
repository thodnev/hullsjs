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
        const names = ['these', 'are', 'test', 'databases']
        await create_empty_dbs(names)

        const dbs = await h.HullsDB.get_databases()
        expect(Object.keys(dbs)).toHaveLength(names.length)

        // TODO: test names and structure conformity
    })

    test.todo('verify that version is always int and >= 1')

    afterAll(clean_dbs)
})