import { readdirSync, readFileSync } from 'fs';
import { join, resolve } from 'path';
import type { Config } from '@jest/types';


const labDir = resolve('./');
const projects: Config.InitialOptions['projects'] = 
  readdirSync(labDir, {withFileTypes: true})
  .filter(dirent => dirent.isDirectory() && dirent.name.startsWith('lab'))
  .map(dirent => {
    const packageJsonPath = join(labDir, dirent.name, 'package.json');
    const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
    return { dirent, packageJson };
  })
  .filter(({ packageJson }) => !!packageJson.jest)
  .map(({ dirent, packageJson }) => ({
    ...packageJson.jest,
    rootDir: join(labDir, dirent.name),
    displayName: dirent.name,
    moduleNameMapper: {
      '^@/(.*)$': '<rootDir>/src/$1',
      ...packageJson.jest.moduleNameMapper, // preserve existing mappers if any
    },
    transform: {'^.+\\.(t)s?$': 'ts-jest'},
    testEnvironment: 'node',
    testRegex: '/tests/.*\\.(test|spec)?\\.(ts|tsx)$',
    moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  }));

const config: Config.InitialOptions = {
  projects,
};

export default config;
