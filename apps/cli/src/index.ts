#!/usr/bin/env bun
import { defineCommand, runMain } from 'citty'
import { type GenerateType, generateFile } from './commands/generate'
import { scaffoldProject } from './commands/new'

const newCommand = defineCommand({
  meta: {
    name: 'new',
    description: 'Scaffold a new Banhmi project',
  },
  args: {
    name: {
      type: 'positional',
      description: 'Project name',
      required: false,
    },
  },
  async run({ args }) {
    let name = args.name as string | undefined

    if (!name) {
      const { isCancel, text } = await import('@clack/prompts')
      const input = await text({
        message: 'Project name:',
        placeholder: 'my-banhmi-app',
        validate: (val) => (!val ? 'Name is required' : undefined),
      })
      if (isCancel(input)) {
        process.exit(0)
      }
      name = input as string
    }

    console.log(`\nScaffolding project "${name}"...`)
    await scaffoldProject({ name })
    console.log(`\n✓ Project "${name}" created.\n`)
    console.log(`  cd ${name}`)
    console.log('  bun install')
    console.log('  bun dev\n')
  },
})

const generateCommand = defineCommand({
  meta: {
    name: 'generate',
    description: 'Generate a controller, service, module, or gateway',
  },
  args: {
    type: {
      type: 'positional',
      description: 'Type: controller | service | module | gateway',
      required: true,
    },
    name: {
      type: 'positional',
      description: 'Name',
      required: true,
    },
  },
  async run({ args }) {
    const validTypes: GenerateType[] = [
      'controller',
      'service',
      'module',
      'gateway',
    ]
    const type = args.type as string

    if (!validTypes.includes(type as GenerateType)) {
      console.error(
        `Unknown type "${type}". Valid types: ${validTypes.join(', ')}`,
      )
      process.exit(1)
    }

    await generateFile({
      type: type as GenerateType,
      name: args.name as string,
    })
    console.log(`✓ Generated ${type}: ${args.name}`)
  },
})

const main = defineCommand({
  meta: {
    name: 'banhmi',
    version: '1.0.0',
    description: 'Banhmi framework CLI',
  },
  subCommands: {
    g: generateCommand,
    generate: generateCommand,
    new: newCommand,
  },
})

runMain(main)
