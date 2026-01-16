//  @ts-check

import { tanstackConfig } from '@tanstack/eslint-config'

const customConfig = {
  rules: {
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/no-unnecessary-condition': 'warn',
  },
}

const jsConfig = {
  files: ['**/*.js'],
  languageOptions: {
    parserOptions: {
      project: false, // JavaScript 파일에는 TypeScript 프로젝트 설정 사용 안함
    },
  },
}

export default [...tanstackConfig, customConfig, jsConfig]
