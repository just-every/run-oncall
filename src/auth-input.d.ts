declare module '*modules/operator-auth/input.mjs' {
 export function readInput(request:Request):Promise<Record<string,unknown>>
}
