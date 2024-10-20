import * as hulls from './hulls'
import { HullsError } from './errors'

let exports = Object.assign(Object.create(null), {
    ...hulls,
    HullsError
})
delete exports['OP']

export default exports