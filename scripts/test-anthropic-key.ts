/**
 * Test script to verify ANTHROPIC_API_KEY is working
 * This script tests direct Anthropic API access (not via OpenRouter)
 */

import { readFileSync } from 'fs'
import { resolve } from 'path'

// Load environment variables from .env.local or .env
function loadEnv() {
  const envFiles = ['.env.local', '.env']
  for (const file of envFiles) {
    try {
      const content = readFileSync(resolve(process.cwd(), file), 'utf-8')
      const lines = content.split('\n')
      for (const line of lines) {
        const trimmed = line.trim()
        if (trimmed && !trimmed.startsWith('#')) {
          const [key, ...valueParts] = trimmed.split('=')
          if (key && valueParts.length > 0) {
            const value = valueParts.join('=').trim().replace(/^["']|["']$/g, '')
            process.env[key.trim()] = value
          }
        }
      }
      break
    } catch (e) {
      // File doesn't exist, try next
    }
  }
}

loadEnv()

async function testAnthropicKey() {
  const apiKey = process.env.ANTHROPIC_API_KEY

  console.log('='.repeat(60))
  console.log('ANTHROPIC_API_KEY Test')
  console.log('='.repeat(60))
  console.log()

  if (!apiKey) {
    console.log('❌ ANTHROPIC_API_KEY is NOT SET')
    console.log()
    console.log('To set it:')
    console.log('1. Add ANTHROPIC_API_KEY to your .env.local file')
    console.log('2. Get your key from: https://console.anthropic.com/')
    console.log()
    return
  }

  console.log('✅ ANTHROPIC_API_KEY is SET')
  console.log(`   Key preview: ${apiKey.substring(0, 10)}...${apiKey.substring(apiKey.length - 4)}`)
  console.log()

  // Test the API key by making a simple request
  console.log('Testing API key with a simple request...')
  console.log()

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-3-haiku-20240307',
        max_tokens: 10,
        messages: [
          {
            role: 'user',
            content: 'Say "test"'
          }
        ]
      })
    })

    if (response.ok) {
      const data = await response.json()
      console.log('✅ ANTHROPIC_API_KEY is WORKING!')
      console.log()
      console.log('Response:', data.content[0]?.text || 'Success')
      console.log()
      console.log('You can use ANTHROPIC_API_KEY directly in your code.')
      console.log('However, your current codebase uses OpenRouter instead.')
    } else {
      const errorText = await response.text()
      console.log('❌ ANTHROPIC_API_KEY test FAILED')
      console.log(`   Status: ${response.status}`)
      console.log(`   Error: ${errorText}`)
      console.log()
      console.log('Possible issues:')
      console.log('- Invalid API key')
      console.log('- Insufficient credits')
      console.log('- API key expired')
    }
  } catch (error) {
    console.log('❌ ANTHROPIC_API_KEY test FAILED')
    console.log(`   Error: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }

  console.log()
  console.log('='.repeat(60))
  console.log()
  console.log('Note: Your codebase currently uses OPENROUTER_API_KEY')
  console.log('      to access Anthropic models via OpenRouter.')
  console.log('      To use ANTHROPIC_API_KEY directly, you would need')
  console.log('      to modify the API routes to use Anthropic SDK instead.')
}

testAnthropicKey().catch(console.error)

