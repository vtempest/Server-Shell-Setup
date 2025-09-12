import { z } from 'zod'

// Request schema for package installation
export const InstallPackagesRequest = z.object({
  packages: z.array(z.string()).min(1).describe('Array of package names to install')
}) 