// Common OS commands mapped to platform-specific implementations
const commandMap = {
  'list-files': {
    linux: (params = {}) => `ls ${params.all ? '-la' : ''} ${params.dir || '.'}`,
    macos: (params = {}) => `ls ${params.all ? '-la' : ''} ${params.dir || '.'}`,
    windows: (params = {}) => `dir ${params.dir || '.'}`
  },
  'disk-usage': {
    linux: (params = {}) => `df ${params.human ? '-h' : ''} ${params.path || '.'}`,
    macos: (params = {}) => `df ${params.human ? '-h' : ''} ${params.path || '.'}`,
    windows: (params = {}) => `fsutil volume diskfree ${params.path || 'C:'}`,
  },
  'memory-usage': {
    linux: () => 'free -m',
    macos: () => 'vm_stat',
    windows: () => 'systeminfo | findstr /C:"Total Physical Memory" /C:"Available Physical Memory"',
  },
  'cpu-info': {
    linux: () => 'lscpu',
    macos: () => 'sysctl -n machdep.cpu.brand_string && sysctl -a | grep cpu',
    windows: () => 'wmic cpu get caption, deviceid, name, numberofcores, maxclockspeed',
  },
  'process-list': {
    linux: () => 'ps aux',
    macos: () => 'ps aux',
    windows: () => 'tasklist',
  },
  'find-file': {
    linux: (params = {}) => `find ${params.dir || '.'} -name "${params.name || '*'}"`,
    macos: (params = {}) => `find ${params.dir || '.'} -name "${params.name || '*'}"`,
    windows: (params = {}) => `dir /s /b ${params.dir || '.'} | findstr "${params.name || '*'}"`,
  },
  'network-connections': {
    linux: () => 'netstat -tuln',
    macos: () => 'netstat -tuln',
    windows: () => 'netstat -ano',
  },
  'check-port': {
    linux: (params = {}) => `netstat -tuln | grep ${params.port || ''}`,
    macos: (params = {}) => `netstat -tuln | grep ${params.port || ''}`,
    windows: (params = {}) => `netstat -ano | findstr ${params.port || ''}`,
  },
  'create-directory': {
    linux: (params = {}) => `mkdir -p ${params.path || 'new_directory'}`,
    macos: (params = {}) => `mkdir -p ${params.path || 'new_directory'}`,
    windows: (params = {}) => `mkdir ${params.path || 'new_directory'}`,
  },
  'remove-directory': {
    linux: (params = {}) => `rm -rf ${params.path || './directory_to_remove'}`,
    macos: (params = {}) => `rm -rf ${params.path || './directory_to_remove'}`,
    windows: (params = {}) => `rmdir /s /q ${params.path || 'directory_to_remove'}`,
  },
  'copy-file': {
    linux: (params = {}) => `cp ${params.source || ''} ${params.destination || ''}`,
    macos: (params = {}) => `cp ${params.source || ''} ${params.destination || ''}`,
    windows: (params = {}) => `copy ${params.source || ''} ${params.destination || ''}`,
  },
  'move-file': {
    linux: (params = {}) => `mv ${params.source || ''} ${params.destination || ''}`,
    macos: (params = {}) => `mv ${params.source || ''} ${params.destination || ''}`,
    windows: (params = {}) => `move ${params.source || ''} ${params.destination || ''}`,
  }
}

// system-api.js
// Hono API with OpenAPI documentation for system operations
import { Hono } from 'hono'
import { swaggerUI } from '@hono/swagger-ui'
import { secureHeaders } from 'hono/secure-headers'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { exec } from 'child_process'
import { promisify } from 'util'
import fs from 'fs'

const execAsync = promisify(exec)

// Initialize Hono app
const app = new Hono()

// Middleware
app.use('*', logger())
app.use('*', secureHeaders())
app.use('*', cors())

// OpenAPI documentation
const swagger = {
  openapi: '3.0.0',
  info: {
    title: 'System Operations API',
    version: '1.0.0',
    description: 'API for common system operations and package installations'
  },
  paths: {
    '/install': {
      post: {
        summary: 'Install applications',
        description: 'Install specified applications on the system',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  apps: {
                    type: 'array',
                    items: {
                      type: 'string'
                    },
                    description: 'List of application names to install'
                  },
                  platform: {
                    type: 'string',
                    enum: ['ubuntu', 'debian', 'fedora', 'centos', 'arch', 'macos'],
                    description: 'Target platform for installation'
                  }
                },
                required: ['apps', 'platform']
              }
            }
          }
        },
        responses: {
          '200': {
            description: 'Installation completed successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: {
                      type: 'boolean'
                    },
                    message: {
                      type: 'string'
                    },
                    details: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          app: {
                            type: 'string'
                          },
                          status: {
                            type: 'string'
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          },
          '400': {
            description: 'Invalid request parameters'
          },
          '500': {
            description: 'Server error during installation'
          }
        }
      }
    },
    '/command': {
      post: {
        summary: 'Execute system command',
        description: 'Execute a common OS command translated to the appropriate platform-specific command',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  command: {
                    type: 'string',
                    description: 'Common command name (e.g., "list-files", "disk-usage")'
                  },
                  params: {
                    type: 'object',
                    description: 'Optional parameters for the command'
                  },
                  platform: {
                    type: 'string',
                    enum: ['linux', 'macos', 'windows'],
                    description: 'Platform to execute the command on'
                  }
                },
                required: ['command', 'platform']
              }
            }
          }
        },
        responses: {
          '200': {
            description: 'Command executed successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: {
                      type: 'boolean'
                    },
                    output: {
                      type: 'string'
                    },
                    command: {
                      type: 'string',
                      description: 'The actual command that was executed'
                    }
                  }
                }
              }
            }
          },
          '400': {
            description: 'Invalid command or parameters'
          },
          '500': {
            description: 'Error executing command'
          }
        }
      }
    }
  }
}

// Package managers for different platforms
const packageManagers = {
  ubuntu: 'apt-get',
  debian: 'apt-get',
  fedora: 'dnf',
  centos: 'yum',
  arch: 'pacman',
  macos: 'brew'
}

// Command generation based on package manager
const generateInstallCommand = (platform, apps) => {
  const pm = packageManagers[platform]
  if (!pm) throw new Error(`Unsupported platform: ${platform}`)

  switch (platform) {
    case 'ubuntu':
    case 'debian':
      return `sudo ${pm} update && sudo ${pm} install -y ${apps.join(' ')}`
    case 'fedora':
    case 'centos':
      return `sudo ${pm} install -y ${apps.join(' ')}`
    case 'arch':
      return `sudo ${pm} -S ${apps.join(' ')}`
    case 'macos':
      return `${pm} install ${apps.join(' ')}`
    default:
      throw new Error(`No installation command defined for platform: ${platform}`)
  }
}

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
export { commandMap } 