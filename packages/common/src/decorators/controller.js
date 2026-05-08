import { CONTROLLER_METADATA } from '../metadata-keys'
export function Controller(prefix = '') {
  return (_target, context) => {
    context.metadata[CONTROLLER_METADATA] = {
      prefix,
    }
  }
}
