//  @ts-check

import { tanstackConfig } from '@tanstack/eslint-config'

const customConfig = {
  rules: {
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/no-unnecessary-condition': 'warn',
  },
}

export default [...tanstackConfig, customConfig]
