// A successful intermediate read writes nothing and is not a separate finished read.
const steps = new WeakSet<D1Database>()
export const markMoveInReadStep = (database: D1Database) => steps.add(database)
export const isMoveInReadStep = (database: D1Database) => steps.has(database)
