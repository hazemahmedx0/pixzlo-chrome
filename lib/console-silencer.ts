// Silences non-critical console output across the extension.
// Keeps console.error intact for unexpected failures.
const silence = (): void => {
  const noop = (): void => undefined
  const methods: Array<keyof Console> = [
    "log",
    "info",
    "debug",
    "warn",
    "trace"
  ]
  methods.forEach((method) => {
    try {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore - runtime reassignment is intentional
      console[method] = noop
    } catch {
      // ignore if console is read-only in a given environment
    }
  })
}

silence()
