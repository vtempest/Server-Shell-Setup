import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

type InstallationResult = {
  package: string
  status: string
  error?: string
}
 
/**
 * Detects the package manager based on the operating system
 * @returns {Promise<string>} The package manager command
 */
async function detectPackageManager(): Promise<string> {
  const osMap: Record<string, string> = {
    '/etc/debian_version': 'apt install -y',
    '/etc/alpine-release': 'apk add',
    '/etc/redhat-release': 'yum install -y',
    '/etc/arch-release': 'pacman -S --noconfirm',
    '/etc/fedora-release': 'dnf install -y'
  }

  // Check if we're in a container
  const isContainer = process.env.CONTAINER === 'true' || process.env.DOCKER === 'true'

  // Check OS-specific files
  for (const [file, command] of Object.entries(osMap)) {
    try {
      await execAsync(`test -f ${file}`)
      // Don't use sudo in containers
      return isContainer ? command : `sudo ${command}`
    } catch {
      continue
    }
  }

  // Special cases
  const { stdout: osName } = await execAsync('uname -s')
  if (osName.trim() === 'Darwin') {
    return 'brew install'
  }

  if (process.env.TERMUX_VERSION) {
    return 'pkg install -y'
  }

  throw new Error('Unsupported operating system')
}

/**
 * Installs packages using the detected package manager
 * @param {string[]} packages - Array of package names to install
 * @returns {Promise<InstallationResult[]>} Installation results
 */
export async function installPackages(packages: string[]): Promise<InstallationResult[]> {
  const pkgManager = await detectPackageManager()
  const results: InstallationResult[] = []

  for (const pkg of packages) {
    try {
      await execAsync(`${pkgManager} ${pkg}`)
      results.push({
        package: pkg,
        status: 'success'
      })
    } catch (error) {
      results.push({
        package: pkg,
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }

  return results
} 