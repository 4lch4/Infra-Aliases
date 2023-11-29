#!/usr/bin/env bun

import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

const SCRIPT_STARTER = '#!/usr/bin/env bash'
const OUT_DIR = join(__dirname, '..', 'out')

console.log(`[INFO]: OUT_DIR is ${OUT_DIR}`)

async function updateAliases(aliases: string[]) {
  try {
    console.debug(`[DEBUG][saveAliases]: Successfully downloaded ${aliases.length} aliases.`)

    const scriptContent = `${SCRIPT_STARTER}\n\n${aliases.join('\n')}\n`
    const scriptPath = join(OUT_DIR, 'aliases.sh')

    const file = Bun.file(scriptPath)
    if (await file.exists()) {
      const content = await file.text()

      if (content === scriptContent) {
        console.log('[SUCCESS][saveAliases]: Aliases are up to date!')
        return
      }
    }

    const outRes = await Bun.write(scriptPath, scriptContent)

    if (outRes) {
      console.log(
        `[SUCCESS][saveAliases]: Successfully wrote aliases to aliases.sh w/ ${outRes} bytes written.`
      )
    } else console.error(`[ERROR][saveAliases]: Failed to write aliases to aliases.sh.`)
  } catch (error) {
    console.error(`[ERROR][saveAliases]: Failed to save aliases to aliases.sh.`)
    console.error(error)
  }
}

async function updateVariables(variables: string[]) {
  try {
    console.debug(`[DEBUG][saveVariables]: Successfully downloaded ${variables.length} variables.`)
    const scriptContent = `${SCRIPT_STARTER}\n\n${variables.join('\n')}\n`
    const scriptPath = join(OUT_DIR, 'variables.sh')

    const file = Bun.file(scriptPath)

    if (await file.exists()) {
      const content = await file.text()

      if (content === scriptContent) {
        console.log('[SUCCESS][saveVariables]: Variables are up to date!')
        return
      }
    }

    const outRes = await Bun.write(scriptPath, scriptContent)

    if (outRes) {
      console.log(
        `[SUCCESS][saveVariables]: Successfully wrote variables to variables.sh w/ ${outRes} bytes written.`
      )
    } else console.error(`[ERROR][saveVariables]: Failed to write variables to variables.sh.`)
  } catch (error) {
    console.error(`[ERROR][saveVariables]: Failed to save variables to variables.sh.`)
    console.error(error)
  }
}

async function getDopplerJson() {
  try {
    const downloadCmd = [
      'doppler',
      'secrets',
      'download',
      '-p',
      'devices',
      '-c',
      'aliases',
      '--no-file',
    ]

    const proc = Bun.spawn(downloadCmd)

    const stderr = await new Response(proc.stderr).text()

    if (stderr) {
      console.error('[ERROR]: Failed to download aliases!')
      console.error(stderr)
    }

    return new Response(proc.stdout).json<{ [key: string]: string }>()
  } catch (error) {
    throw error
  }
}

async function getScriptDetails() {
  const aliases: string[] = []
  const variables: string[] = []

  try {
    const json = await getDopplerJson()

    if (json) {
      // Iterate over each key in the object to create their alias commands.
      for (const key of Object.keys(json)) {
        // If the key starts with doppler_ then it's actually an environment variable of Doppler data.
        if (key.toLowerCase().startsWith('doppler_')) {
          variables.push(`export ${key.toUpperCase()}='${json[key]}'`)
        } else aliases.push(`alias ${key.toLowerCase()}='${json[key]}'`)
      }
    } else console.error('[ERROR][main]: Failed to download doppler json!')
  } catch (error) {
    console.error(`[ERROR][getDopplerDetails]: Failed to get Doppler details!`)
    console.error(error)
  }

  return { aliases, variables }
}

async function main() {
  try {
    const { aliases, variables } = await getScriptDetails()

    await updateAliases(aliases)
    await updateVariables(variables)
  } catch (error) {
    console.error(`[ERROR][main]: Failed to download aliases!`)
    console.error(error)
  }
}

main()
  .then(() => console.log('Execution complete!'))
  .catch(err => {
    console.error(`[ERROR][main]: Failed to execute main function!`)
    console.error(err)
  })
