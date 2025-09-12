// system-api.js
// Hono API with OpenAPI documentation for system operations
import { Hono } from 'hono'
import { swaggerUI } from '@hono/swagger-ui'
import { secureHeaders } from 'hono/secure-headers'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { packageManagers, generateInstallCommand, execAsync } from './services/packageManager.js'
import { commandMap } from './services/commandService.js'
import swagger from './openapi.json'

// Initialize Hono app
const app = new Hono()

// Middleware
app.use('*', logger())
app.use('*', secureHeaders())
app.use('*', cors())

// Install applications endpoint
app.post('/install', async (c) => {
  try {
    const { apps, platform } = await c.req.json()
    
    if (!apps || !Array.isArray(apps) || apps.length === 0) {
      return c.json({ success: false, message: 'Invalid or empty apps array' }, 400)
    }
    
    if (!platform || !packageManagers[platform]) {
      return c.json({ 
        success: false, 
        message: `Invalid platform. Supported platforms: ${Object.keys(packageManagers).join(', ')}` 
      }, 400)
    }
    
    const installCommand = generateInstallCommand(platform, apps)
    
    try {
      const { stdout, stderr } = await execAsync(installCommand)
      
      return c.json({
        success: true,
        message: 'Installation completed',
        details: apps.map(app => ({
          app,
          status: 'installed'
        })),
        output: stdout,
        error: stderr || null
      })
    } catch (error) {
      return c.json({
        success: false,
        message: 'Installation failed',
        error: error.message
      }, 500)
    }
  } catch (error) {
    return c.json({
      success: false,
      message: 'Invalid request format',
      error: error.message
    }, 400)
  }
})

// Execute command endpoint
app.post('/command', async (c) => {
  try {
    const { command, params, platform } = await c.req.json()
    
    if (!command || !commandMap[command]) {
      return c.json({ 
        success: false, 
        message: `Invalid or unsupported command. Supported commands: ${Object.keys(commandMap).join(', ')}` 
      }, 400)
    }
    
    if (!platform || !commandMap[command][platform]) {
      return c.json({ 
        success: false, 
        message: `Invalid platform. Supported platforms: ${Object.keys(commandMap[command]).join(', ')}` 
      }, 400)
    }
    
    const execCommand = commandMap[command][platform](params)
    
    try {
      const { stdout, stderr } = await execAsync(execCommand)
      
      return c.json({
        success: true,
        command: execCommand,
        output: stdout,
        error: stderr || null
      })
    } catch (error) {
      return c.json({
        success: false,
        command: execCommand,
        message: 'Command execution failed',
        error: error.message
      }, 500)
    }
  } catch (error) {
    return c.json({
      success: false,
      message: 'Invalid request format',
      error: error.message
    }, 400)
  }
})

// Serve OpenAPI documentation
app.get('/docs', swaggerUI({ url: '/openapi.json' }))
app.get('/openapi.json', (c) => {
  return c.json(swagger)
})

// Health check endpoint
app.get('/', (c) => {
  return c.json({
    status: 'ok',
    message: 'System Operations API is running',
    version: '1.0.0'
  })
})

// Start the server
const port = process.env.PORT || 3000
console.log(`Server is running on port ${port}`)

export default app