import { expect, test } from 'bun:test'
import { describeOhaCheckPath } from './smoke'

test('smoke runner describes oha path', () => {
  const desc = describeOhaCheckPath('/usr/bin/oha')
  expect(desc).toContain('/usr/bin/oha')
})
