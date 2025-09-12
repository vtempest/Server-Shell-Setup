import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

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

export { packageManagers, generateInstallCommand, execAsync } 