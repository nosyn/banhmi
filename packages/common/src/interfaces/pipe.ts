export interface PipeTransform<T = unknown, R = unknown> {
  transform(value: T, metadata: PipeMetadata): R | Promise<R>
}

export interface PipeMetadata {
  type: 'param' | 'query' | 'body' | 'custom'
  data?: string
}
