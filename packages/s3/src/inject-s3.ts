// Marker decorator — actual injection uses static inject = [S3_TOKEN]
export function InjectS3() {
  return (_target: unknown, _context: ClassFieldDecoratorContext): void => {}
}
