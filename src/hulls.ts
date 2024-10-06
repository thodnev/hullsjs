// (upgrade) - make changes to existing DB bumping DB version
// *modify - change something in a DB
//           [we want to modify db tables]
//           [with or without bumping version]
// open - open existing DB without changing its tables
// create - make new DB (that haven't existed before)
//          [we want to define tables here]
// update
// maintain
// manage
// handle
// TODO:
// - make constructor accept DB name with optional version, or connection

import * as USE from './defines'
import './polyfills'
import { HullsError } from './errors'
import { is_string, objarr2obj, JArray } from './utils'

function wrap_req(func: Function, ...args: any[]): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
        try {
            //LOG('GOT FOR PROMISE', func, args)
            const req = func(...args)
            // attach callbacks ASAP, here we have:
            // onsuccess, onerror, onblocked, onupgradeneeded
            req.onsuccess = (_: any) => resolve(req.result)
            req.onerror = (_: any) => reject(HullsError.from_cause(req.error))
        } catch (err) {
            reject(HullsError.from_cause(err))
        }
    })
}

/** Autoincrement symbol used in table description notations */
export const AUTOINC: symbol = Symbol.for('hulls.AUTOINC')

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

type HullsTableKey = string | typeof AUTOINC | (Array<string | typeof AUTOINC>) 

type HullsTableOptions = {
    key?: HullsTableKey,
    autoinc?: boolean
}

type HullsCreateTableOptions = Record<'name', string> & HullsTableOptions
// type HullsCreateTableOptions = HullsTableOptions & {
//     name: string
// }

// type HullsCreateTableItem = Record<string, Required<HullsTableOptions>['key']>

export class HullsDB implements HullsDBInterface, Disposable {
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
     * 
     * @returns Object of the form {db_name: db_version}
     */
    protected static async _get_dbs() {
        const dbsarr = await indexedDB.databases()
        return objarr2obj(dbsarr, {key: 'name', value: 'version'})
    }

    /**
     * Performs lookup for current DB version given its name
     * @param db_name - name of the database
     * @returns db_version or null (when given db was not found)
     */
    protected static async _find_db_ver(db_name: string): Promise<number | null> {
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
        if (undefined !== this.connection) {
            throw HullsError.cantset_open('db_name')
        }
        this.#__name = value
    }

    get db_version() {
        // same as for db_name
        // @ts-ignore 2322 Type 'number | undefined' is not assignable to type 'number'.
        return this.connection?.version ?? this.#__version
    }

    set db_version(value: number) {
        if (undefined !== this.connection) {
            throw HullsError.cantset_open('db_version')
        }
        this.#__version = value
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
        const deldb = indexedDB.deleteDatabase.bind(indexedDB)
        await wrap_req(deldb, db_name)
    }

    /**
     * Retrieves all ...
     * @returns 
     */
    static async get_databases() {
        const cls = this
        const dbs = await this._get_dbs()

        // use empty object
        // TODO: implement proper type for it
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
        if (!tableopts.key || is_string(tableopts.key)) {
            // Table is a string or an object storage with no keys -> do nothing
            return
        }

        if (tableopts.key === AUTOINC) {
            delete tableopts.key
        } else {
            // key is Array-like
            // -> try finding AUTOINC element in array
            // if found, set flag properly
            const key = tableopts.key.filter((val) => val !== AUTOINC)
            if (key.length === tableopts.key.length) {
                return              // AUTOINC not found
            }
            // AUTOINC found and was filtered-out -> set new key list
            tableopts.key = key
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

        const entry = { add: rec }
OPTOUT: Object.seal(entry)      // prevent further modifications

        this.oplist.push(entry)
    }

    create_tables(tables: Record<string, HullsTableKey>) {
        for (const [name, key] of Object.entries(tables)) {
            const rec: HullsCreateTableOptions = {'name': name, 'key': key}
            this.create_table(rec)
        }
    }

    // Table removal logic
    drop_table(name: string) {
        // Make sure connection is not open before continuing
        // This check will be optimized-out for production builds
OPTOUT: this._ensure_connection_is(false)

        const entry = {del: name}
OPTOUT: Object.seal(entry)      // prevent further modifications

        this.oplist.push(entry)
    }

    drop_tables(names: Iterable<string>) {
        for (const name of names) {
            this.drop_table(name)
        }
    }
}

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