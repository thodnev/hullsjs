// TODO:
// + make constructor accept DB name with optional version, or connection
// - change 'keys' to primary key
//   confirmation:
//   - https://developer.mozilla.org/en-US/docs/Web/API/IDBCursor#idbcursor.primarykey
//   - https://stackoverflow.com/a/37972028/27797966
// - add constraints
// - (!) versions can never be downgraded, account for that. Per:
//   https://developer.mozilla.org/en-US/docs/Web/API/IDBRequest/error#versionerror

import * as USE from './defines'
import './polyfills'
import { HullsError } from './errors'
import { is_string, objarr2obj, JArray } from './utils'

function wrap_request(request: IDBOpenDBRequest | IDBRequest<any>): Promise<any> {
    return new Promise((resolve, reject) => {
        try {
            // other callbacks (i.e. onblocked, onupgradeneeded)
            // should be attached by the caller in the outer scope
            request.onsuccess = (_: any) => resolve(request.result)
            request.onerror = (_: any) => reject(HullsError.from_cause(request.error))
        } catch (err) {
            reject(HullsError.from_cause(err))
        }
    })
}

/**
 * @typedef XOR - Mutually exclusive type
 *
 * Takes two record types `T` and `U`, and produces a new type that allows only
 * the keys of T without U or the keys of U without T.
 */
type XOR<T, U> = (T | U) extends object 
  ? (T extends U ? never : T) | (U extends T ? never : U)
  : T | U

/** Autoincrement symbol used in table description notations */
export const AUTOINC: symbol = Symbol.for('hulls.AUTOINC')

/** Instructions used by oplist */
export const OP = {
    add_table: 'add_table',
    drop_table: 'drop_table'
}

interface HullsDBInterface {

}

/**
 * Keyword-arguments used by {@link HullsDB._open}
 * pseudo-private class method
 * 
 * @param db_version - optional db version, as per {@link indexedDB.open}
 */
interface HullsOpenOptions {
    readonly db_version?: number
}

// A key can be: string, date, float, a binary blob, and array.
// https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API/Basic_Terminology#key


type HullsTableKey = string | typeof AUTOINC | (Array<string | typeof AUTOINC>) 

type HullsTableOptions = {
    pkey?: HullsTableKey
    autoinc?: boolean
}

type HullsCreateTableOptions = Record<'name', string> & HullsTableOptions
// type HullsCreateTableOptions = HullsTableOptions & {
//     name: string
// }

// type HullsCreateTableItem = Record<string, Required<HullsTableOptions>['pkey']>

export class HullsDB implements HullsDBInterface, Disposable {
    // type the constructor, workaround per:
    // https://github.com/Microsoft/TypeScript/issues/3841#issuecomment-2381594311
    declare ['constructor']: typeof HullsDB

    connection: IDBDatabase | undefined      /** holds connection object */
    #__name: string | undefined
    #__version: number | undefined

    /** list of table operations to execute on a connection */
    oplist: JArray<any> | Array<any> = USE.INTROSPECT ? new JArray() : []


    /** 
     * Creates empty instance meaning the connection parameters should be added afterwards
     */
    constructor()

    /**
     * 
     * @param db_name - name of the DB to work with
     * @param options - optional DB parameters (like version)
     */
    constructor(db_name: string, options?: HullsOpenOptions)

    /**
     * Wrap an existing connection to DB
     * 
     * @remarks
     * To open a new connection, an {@link open} function should 
     * normally be used as a uniform wrapper.
     * Or, as an alternative, you may use the {@link HullsDB._open}
     * pseudo-private static method for this specific DB interface.
     * 
     * @param connection - an existing {@link IDBDatabase} to wrap
     */
    constructor(connection: IDBDatabase)

    // Implementation for the constructor variants above
    constructor(db_name_or_connection?: any, options?: any) {
        if ((undefined === db_name_or_connection) && (undefined === options)) {
            // constructor called empty -> connection parameters are to be filled later
            return
        }

        if (!is_string(db_name_or_connection) && (undefined === options)) {
            // connection object was passed
            this.connection = db_name_or_connection
            return
        }

        // below: means we're dealing with a DB passed as db_name & options
    }

    /**
     * Utility method used internally to verify that connection is not open
     * before performing some manipulations on DB
     */
    protected _ensure_connection_is(state: boolean) {
        if ((this.connection !== undefined) !== state) {
            const st = state ? 'not' : 'already'
            throw new HullsError(`Connection is ${st} open`)
        }
    }

    /**
     * Retrieves information on all existing databases
     * 
     * @remarks
     * This is a pseudo-private method with common logic abstracted.
     * One should use {@link HullsDB.get_databases} method instead.
     * @todo TODO:
     * Make type inferred : proper objarr2obj typing required
     * 
     * @returns Object of the form {db_name: db_version}
     */
    protected static async _get_dbs(): Promise<Record<string, number>> {
        const dbsarr = await indexedDB.databases()
        return objarr2obj(dbsarr, {key: 'name', value: 'version'})
    }

    /**
     * Performs lookup for current DB version given its name
     * @param db_name - name of the database
     * @returns db_version or null (when given db was not found)
     */
    protected static async _find_db_ver(db_name: string) {
        const dbs = await this._get_dbs()
        return db_name in dbs ? dbs[db_name] : null
    }

    // Opens connection to database
    static async _open(db_name: string, options: HullsOpenOptions = {}) {
        const {db_version = 1} = options
    
        //return indexedDB.open(db_name, db_version)
        const open = indexedDB.open.bind(indexedDB)
        const conn = await wrap_req(open, db_name, db_version)
        
        return new this(conn)
    }

    get db_name() {
        // try getting name from connection,
        // falling back to _name if connection not yet open
        // @ts-ignore 2322 Type 'string | undefined' is not assignable to type 'string'.
        return this.connection?.name ?? this.#__name
    }

    set db_name(value: string) {
OPTOUT: this._ensure_connection_is(false)
        this.#__name = value
    }

    get db_version() {
        // same as for db_name
        // @ts-ignore 2322 Type 'number | undefined' is not assignable to type 'number'.
        return this.connection?.version ?? this.#__version
    }

    set db_version(value: number) {
OPTOUT: this._ensure_connection_is(false)
OPTOUT: if (!Number.isInteger(value) || (value < 1)) {
            throw new HullsError("'db_version' should be int >= 1")
        }
        this.#__version = value
    }

    /** Provides useful and introspectable name for objects */
    get [Symbol.toStringTag]() {
        let ret = this.constructor.name
        ret += (this.db_name !== undefined) ? `('${this.db_name}')` : ''
        return ret
    }

    /**
     * Forcefully closes a connection to DB
     * 
     * @remarks
     * For simplicity, it does not check whether the connection 
     * was previously open or not
     */
    close() {
        this.connection?.close()
        this.connection = undefined
    }

    /**
     * Destructor, used with TC39 explicit resource management
     * https://github.com/tc39/proposal-explicit-resource-management
     * 
     * Try it with the new `using` syntax:
     * @example
     * using db = open('MyDB')
     * // ...
     */
    [Symbol.dispose]() {
        this.close()
    }

    /**
     * Removes whole database with the name provided.
     * Database existence is not checked before proceeding.
     * So the method ensures no DB with the name provided exists
     * after it is being called
     * 
     * @remarks
     * Firefox has obscure behavior of delayed db removal
     * So to trigger state change, we need to request something
     * from the database
     * @param db_name - name of the database to remove
     * @throws HullsError when the DB engine can't proceed with the removal
     */
    static async remove_database(db_name: string) {
        const req = indexedDB.deleteDatabase(db_name)
        await wrap_request(req)
    }

    /**
     * Retrieves all ...
     * @todo TODO:
     * - provide better typing for ret obj
     * - refactor obj structure
     * - ?? how do we make sure user does not forget
     *   to call await on functions
     * - ?? should we return proxy to HullsDB instances instead?
     * @returns 
     */
    static async get_databases() {
        const cls = this
        const dbs = await this._get_dbs()

        // use empty object
        // const ret = Object.create(null)

        // use introspectable object
        // const ret: any = {
        //     get [Symbol.toStringTag]() {return 'Hulls:Databases'}
        // }

        const ret = (!USE.INTROSPECT ? Object.create(null) : {
            get [Symbol.toStringTag]() {return 'Hulls:Databases'}
        })
       
        for (const [name, version] of Object.entries(dbs)) {
            ret[name] = {
                db_version: version,
                open(options: HullsOpenOptions = {db_version: version}) {
                    return cls._open(name, options)
                },
                remove() {
                    return cls.remove_database(name)
                }
            }
        }
        return ret
    }

    // TODO: add ability to set key: AUTOINC
    protected _prepare_tableopts<T extends HullsTableOptions> (tableopts: T, tablename?: string) {
        if (!tableopts.pkey || is_string(tableopts.pkey)) {
            // Table is a string or an object storage with no keys -> do nothing
            return
        }

        if (tableopts.pkey === AUTOINC) {
            delete tableopts.pkey
        } else {
            // key is Array-like
            // -> try finding AUTOINC element in array
            // if found, set flag properly
            const pkey = tableopts.pkey.filter((val) => val !== AUTOINC)
            if (pkey.length === tableopts.pkey.length) {
                return              // AUTOINC not found
            }
            // AUTOINC found and was filtered-out -> set new key list
            tableopts.pkey = pkey
        }

        // This check is to be optimized-out for production builds
OPTOUT: if ((tableopts.autoinc !== undefined) && !tableopts.autoinc) {
            const msg = "AUTOINC can't be true and false simultaneously"
            throw HullsError.at_table(msg, tablename)
        }

        tableopts.autoinc = true
    }

    // Table creation logic
    create_table(name: string, tableopts?: HullsTableOptions) : void
    create_table({name, ...tableopts}: HullsCreateTableOptions) : void
    create_table(name_or_obj: string | HullsCreateTableOptions,
                 opts?: HullsTableOptions) : void {

        // This check will be optimized-out on production builds
OPTOUT: this._ensure_connection_is(false)

        let rec
        if (is_string(name_or_obj)) {
            // args passed separately -> make it object
            rec = {name: name_or_obj, ...opts}
        } else {
            // args already passed as object -> create copy
            rec = Object.assign({}, name_or_obj)
        }

        this._prepare_tableopts(rec, rec.name)  // modify in-place

        const entry = { [OP.add_table]: rec }
OPTOUT: Object.seal(entry)      // prevent further modifications

        this.oplist.push(entry)
    }

    create_tables(tables: Record<string, HullsTableKey>) {
        for (const [name, pkey] of Object.entries(tables)) {
            const rec: HullsCreateTableOptions = {'name': name, 'pkey': pkey}
            this.create_table(rec)
        }
    }

    // Table removal logic
    drop_table(name: string) {
        // Make sure connection is not open before continuing
        // This check will be optimized-out for production builds
OPTOUT: this._ensure_connection_is(false)

        const entry = {[OP.drop_table]: name}
OPTOUT: Object.seal(entry)      // prevent further modifications

        this.oplist.push(entry)
    }

    drop_tables(names: Iterable<string>) {
        for (const name of names) {
            this.drop_table(name)
        }
    }

    // onupgradeneeded handler
    // it should always be attached as bound, i.e.
    // req.onupgradeneeded = this._hdl_upgrade.bind(this)
    // Note: Surprisingly, bound method is faster than ordinary function
    //       per https://jsperf.app/qefuyi
    protected _hdl_upgrade(event: IDBVersionChangeEvent) {
        // get values from event
        const db = (event.target as IDBOpenDBRequest).result
        const [oldver, newver] = [event.oldVersion, event.newVersion]

        // apply changes to tables
        while (this.oplist.length) {
            const entry = this.oplist.shift()

            if (OP.drop_table in entry) {
                // it's a removal entry -> drop table and that's it
                const table_name = entry[OP.drop_table]
                db.deleteObjectStore(table_name)
                continue
            }

            if (OP.add_table in entry) {
                // it's an add table entry
                const record = entry[OP.add_table]
                db.createObjectStore(record.name, {
                    keyPath: record.keys,
                    autoIncrement: record.autoinc
                })
                continue
            }

            // TODO: add index entry processing

            // it's an unknown entry
            // won't happen unless user messes with oplist
            // no preliminary checks needed for lib size economy
        }
        // ...
    }

    async open() {
        // opening a connection that is already open should result in an error
        // But this check is to be removed in production runtime
OPTOUT: this._ensure_connection_is(false)

        // db_name must be set beforehand one way or another
        // This check is also removed from production runtime builds
        const db_name = this.db_name
OPTOUT: if (db_name === undefined) {
            throw new HullsError('db_name not defined')
        }

        // Try searching for a DB with a name provided.
        // - we can't create a DB that does not exist unless CREATE flag is provided
        // - we can't update existing DB unless MODIFY flag is provided
        // - we can't open non-existing DB
        // Simplified version of the above statements:
        // - Allow opening existing DBs (applying or not applying the table
        //   modifications - assume the dev knows what he is doing);
        // - Allow creating new DBs only when table structure is defined beforehand;
        // - Disallow creating empty DBs with no tables (as completely useless)
        
        const found_ver = this.constructor._find_db_ver(db_name)
        if (found_ver === null) {
            // ...
        }
    }
}

// Methods below are defined on HullsDB if not optimized-out for production runtime
// OPTOUT: {
//     Object.defineProperty(HullsDB, 'someprop', {
//         get: function() { 
//             // ...
//         }
//     })
// }

/**
 * Keyword-arguments used by {@link open} function
 * @param implementation - optional class implementing DB interface,
 *                         i.e {@link HullsDB}
 */
type OpenOptions = HullsOpenOptions & {
    readonly implementation?: HullsDBInterface
}

export function open(connection: string, options: OpenOptions = {}) {
    const {implementation: cls = HullsDB, ...restopts} = options
    // LOG('Open args: ', connection, options)
    // LOG('Transformed: ', cls, restopts)

    return cls._open(connection, restopts)
}


function LOG(...args) {
    console.log('HULLS: ', ...args)
    return true
}