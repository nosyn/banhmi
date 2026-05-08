import { INJECTABLE_WATERMARK } from '../metadata-keys'
export function Injectable() {
  return (_target, context) => {
    context.metadata[INJECTABLE_WATERMARK] = true
  }
}
