import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'app.housesphere.twa',
  appName: 'HouseSphere',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
}

export default config
