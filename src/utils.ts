/** Utility functions to extract common logic */

import { HullsError } from "./errors"

/**
 * Checks whether object is a string or of its subtype
 * @param obj object to run check on
 * @returns true or false based on check result
 */
export function is_string(obj: any) {
    return (typeof obj === 'string') || (obj instanceof String)
}


/**
 * Converts array of key-value objects into one object
 * @todo TODO: add proper typing
 * 
 * @param arr - input array of objects of the form [{key: 'k1', value: 'v1'}, ...]
 * @param options
 * @param options.key - name of the key property in each input object
 * @param options.value - name of the value property in each input object
 * @returns Object of the form {k1: v1, k2: v2, ...}
 */
export function objarr2obj(arr: Object[],
                           {key, value}: {key: string, value: string}) {
    const res = {}
    for (const obj of arr) {
        // @ts-ignore 7053
        res[obj[key]] = obj[value]
    }
    return res
    // Tested, it was slower: https://jsperf.app/zudosi
    // const redfunc = (obj, item) => (obj[item[key]] = item[value], obj)
	// return arr.reduce(redfunc, {})
}


/**
 * Dummy JSONifier for compact Python-like JSON representation.
 * @remarks
 * Designed to be more concise than inspect-js/object-inspect,
 * not the most correct one
 * 
 * @param obj - object to JSONify
 * @returns String containing JSON representation
 */
function to_json(obj: any) {
    // provide stringification for symbols as well
    const replace = (_: any, v: any) => {
        if (typeof v !== 'symbol') {
            return v
        }
        // strip 'hulls.' from symbols
        // return '<' + v.description?.replace(/^hulls\./g, '') + '>'
        
        return `<🏷️ ${v.description}>`
    }

    const r = JSON.stringify(obj, replace, '\n')
    return r.replaceAll(',\n', ', ').replaceAll('\n', '')
}


/**
 * Verbose Array having string representation as JSON string
 */
export class JArray<T> extends Array<T> {
    toString() {
        const ret = this.map(to_json).join(',\n ')
        return '[' + ret + ']'
    }
}


type LazyObjectFunc = (key: string | symbol) => any

export function LazyObject(keys: Iterable<any>,
                           value_func: LazyObjectFunc,
                           allow_unset_keys: boolean = false) {
    const obj = Object.create(null)     // this one is holding values
    for (const key of keys)   obj[key] = undefined

    function get(_target: any, property: Parameters<LazyObjectFunc>[0], _receiver: any) {
        if (!(property in obj) && !allow_unset_keys) {
            throw new HullsError(`undefined key '${String(property)}'`)
        }

        if (obj[property] === undefined) {
            obj[property] = value_func(property)
        }

        return obj[property]
    }

    return new Proxy(obj, {get: get})
}


export class LazyObjectCls {
    obj = Object.create(null)     // this one is holding values
    proxy: typeof Proxy
    __func: LazyObjectFunc
    __allow_unset_keys: boolean

    constructor(keys: Iterable<any>,
                value_func: LazyObjectFunc,
                allow_unset_keys: boolean = false) {
        for (const key of keys) {
            this.obj[key] = undefined
        }

        this.__func = value_func
        this.__allow_unset_keys = allow_unset_keys

        this.proxy = new Proxy(this.obj, this)
    }

    get(_target: any, property: Parameters<LazyObjectFunc>[0], _receiver: any) {
        if (!(property in this.obj) && !this.__allow_unset_keys) {
            throw new HullsError(`undefined key '${String(property)}'`)
        }

        if (this.obj[property] === undefined) {
            this.obj[property] = this.__func(property)
        }

        return this.obj[property]
    }
}