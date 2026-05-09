/**
 * Options accepted by `classValidator()`.
 */
export type ValidatorOptions = {
  /**
   * When `true`, properties not decorated with any rule are stripped from the
   * parsed value. Defaults to `false` (passthrough).
   *
   * @example
   * const v = classValidator(Dto, { stripUnknown: true })
   */
  stripUnknown?: boolean
}
