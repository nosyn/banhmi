// Marker decorator — actual injection uses static inject = [DATABASE_TOKEN]
export function InjectDatabase() {
  return (_target, _context) => {}
}
export { DATABASE_TOKEN as INJECT_DATABASE } from './tokens'
