import { MODULE_METADATA } from '../metadata-keys'
export function Module(metadata) {
  return (_target, context) => {
    context.metadata[MODULE_METADATA] = metadata
  }
}
