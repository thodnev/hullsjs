/** A common denominator for all derived exception hierarchy */

type ErrorCause<T extends Error> = {
    cause?: T | Error
}

export class HullsError extends Error {
    constructor(message?: string, cause?: ErrorCause<any>) {
        super(message, cause)          // 'Error' breaks prototype chain here
        // restore prototype chain
        Object.setPrototypeOf(this, new.target.prototype)
    }

    static from_cause(cause: any, message?: string) {
        return new this(message, {cause: cause})
    }
    
    // helpers for concrete errors
    static cantset_open(varname: string = '') {
        varname = varname ? (` '${varname}'`) : varname
        return new this(`Can not set${varname}. Connection already open`)
    }

    static at_table(msg: string = '', tablename?: string) {
        let txt = 'Table' + (tablename ? ` '${tablename}'` : '')
        txt += msg ? `: ${msg}` : ''
        return new this(txt)
    }
}