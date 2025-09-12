import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { swaggerUI } from '@hono/swagger-ui'
import { InstallPackagesRequest } from './openapi.js'
import { installPackages } from './packageManager.js'
import { readFileSync } from 'fs'
import { join } from 'path'

const app = new Hono()

// Load OpenAPI specification
const openApiSpec = JSON.parse(
  readFileSync(join(process.cwd(), 'src', 'openapi.json'), 'utf-8')
)

// Serve Swagger UI
app.get('/swagger', swaggerUI({ url: '/api-docs' }))

// Serve OpenAPI specification
app.get('/api-docs', (c) => {
  return c.json(openApiSpec)
})


// Health check endpoint
app.get('/', (c) => {
  return c.json({
    status: 'ok',
    message: 'System Operations API is running',
    version: '1.0.0'
  })
})


// Install packages endpoint
app.post('/install', async (c) => {
  try {
    const body = await c.req.json()
    const { packages } = InstallPackagesRequest.parse(body)

    const results = await installPackages(packages)
    const success = results.every((r: { status: string }) => r.status === 'success')

    return c.json({
      success,
      message: success ? 'All packages installed successfully' : 'Some packages failed to install',
      details: results
    })
  } catch (error) {
    if (error instanceof Error) {
      return c.json({ error: error.message }, 400)
    }
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// Start the server
const port = process.env.PORT || 3001
console.log(`Server is running on port ${port}`)

serve({
  fetch: app.fetch,
  port: Number(port)
}) 