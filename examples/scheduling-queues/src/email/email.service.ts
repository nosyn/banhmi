import { Injectable } from 'banhmi'

/**
 * In-memory record of a sent email.
 *
 * @example
 * const record: SentEmail = { id: 'abc', to: 'user@example.com', subject: 'Welcome' }
 */
export type SentEmail = {
  /** Job ID assigned at enqueue time. */
  id: string
  /** Recipient address. */
  to: string
  /** Email subject line. */
  subject: string
}

/**
 * Simple in-memory email store used by {@link EmailQueueProcessor} and
 * {@link EmailController}.
 *
 * In a real application this would persist to a database or call an SMTP
 * service. The in-memory design makes integration tests straightforward.
 */
@Injectable()
export class EmailService {
  private readonly sent: SentEmail[] = []

  /**
   * Record that an email was sent.
   *
   * @param entry - {@link SentEmail} to append to the list.
   */
  record(entry: SentEmail): void {
    this.sent.push(entry)
  }

  /**
   * Return all sent emails in the order they were recorded.
   *
   * @returns A snapshot of the sent-email list.
   */
  listSent(): SentEmail[] {
    return [...this.sent]
  }
}
