import { HullsError } from '../errors'


describe('HullsError tests', () => {
    test('basic use', () => {
        expect(new HullsError()).toBeInstanceOf(Error)

        const msg = {hulls: 'Some message', cause: 'This Error is the cause'}
      
        const causing_err = new Error(msg.cause)
        const hulls_err = new HullsError(msg.hulls, { cause: causing_err })
      
        // Check if instance of both HullsError and Error
        expect(hulls_err).toBeInstanceOf(HullsError)
        expect(hulls_err).toBeInstanceOf(Error)
      
        // Check if message and cause are set correctly
        expect(hulls_err.message).toEqual(msg.hulls)
        expect(hulls_err.cause).toBe(causing_err)
      
        // Check if prototype chain is restored
        expect(Object.getPrototypeOf(hulls_err)).toBe(HullsError.prototype)
        try {
            throw hulls_err
        } catch(e) {
            expect(e).toBeInstanceOf(Error)
            expect(e).toBeInstanceOf(HullsError)
        }
      })
})