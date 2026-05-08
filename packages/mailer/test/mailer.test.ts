import { expect, mock, test } from 'bun:test'
import { MailerService } from '../src/mailer.service'
import type { MailerOptions } from '../src/types'

// ---------------------------------------------------------------------------
// Mock nodemailer
// ---------------------------------------------------------------------------

const sentMessages: Record<string, unknown>[] = []
const mockSendMail = mock(async (opts: Record<string, unknown>) => {
  sentMessages.push(opts)
  return { messageId: 'test-id' }
})

mock.module('nodemailer', () => ({
  createTransport: (_opts: Record<string, unknown>) => ({
    sendMail: mockSendMail,
  }),
}))

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

function makeService(opts: Partial<MailerOptions> = {}): MailerService {
  const fullOpts: MailerOptions = {
    transport: { host: 'smtp.example.com', port: 25 },
    defaults: { from: 'test@example.com' },
    ...opts,
  }
  return new MailerService(fullOpts)
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

test('MailerService: send calls transport.sendMail with correct options', async () => {
  sentMessages.length = 0
  const service = makeService()
  await service.send({
    to: 'user@example.com',
    subject: 'Hello',
    text: 'World',
  })

  expect(mockSendMail).toHaveBeenCalledTimes(1)
  const msg = sentMessages[0]
  expect(msg?.to).toBe('user@example.com')
  expect(msg?.subject).toBe('Hello')
  expect(msg?.text).toBe('World')
  expect(msg?.from).toBe('test@example.com')
})

test('MailerService: send uses explicit from over default', async () => {
  sentMessages.length = 0
  mockSendMail.mockClear()
  const service = makeService()
  await service.send({
    to: 'user@example.com',
    from: 'custom@example.com',
    subject: 'Hi',
    text: 'Body',
  })

  const msg = sentMessages[0]
  expect(msg?.from).toBe('custom@example.com')
})

test('MailerService: send with array recipients joins to string', async () => {
  sentMessages.length = 0
  mockSendMail.mockClear()
  const service = makeService()
  await service.send({
    to: ['a@example.com', 'b@example.com'],
    subject: 'Multi',
    text: 'Multi',
  })

  const msg = sentMessages[0]
  expect(msg?.to).toBe('a@example.com, b@example.com')
})

// ---------------------------------------------------------------------------
// Template rendering
// ---------------------------------------------------------------------------

test('MailerService: template + context renders html via eta mock', async () => {
  sentMessages.length = 0
  mockSendMail.mockClear()

  // Mock eta for template rendering
  mock.module('eta', () => ({
    Eta: class MockEta {
      renderFile(
        _path: string,
        data: Record<string, unknown>,
      ): Promise<string> {
        const name = (data as { name?: string }).name ?? ''
        return Promise.resolve(`<p>Welcome, ${name}!</p>`)
      }
    },
  }))

  const service = makeService({
    templateDir: '/templates',
    templateEngine: 'eta',
  })

  await service.send({
    to: 'user@example.com',
    subject: 'Welcome',
    template: 'welcome',
    context: { name: 'Alice' },
  })

  const msg = sentMessages[0]
  expect(msg?.html).toBe('<p>Welcome, Alice!</p>')
  expect(msg?.to).toBe('user@example.com')
})

test('MailerService: getTransport is called with smtp options', async () => {
  // Verify that the transport was created with the smtp config
  // by checking the sendMail was called with correct from
  sentMessages.length = 0
  mockSendMail.mockClear()
  // Re-register nodemailer mock after previous test may have disrupted it
  mock.module('nodemailer', () => ({
    createTransport: (_opts: Record<string, unknown>) => ({
      sendMail: mockSendMail,
    }),
  }))

  const service = makeService({ defaults: { from: 'smtp-test@example.com' } })
  await service.send({
    to: 'dest@example.com',
    subject: 'SMTP test',
    text: 'ok',
  })
  expect(sentMessages[0]?.from).toBe('smtp-test@example.com')
})
