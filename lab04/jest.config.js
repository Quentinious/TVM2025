/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',          // Используем ts-jest для трансформации TS
  testEnvironment: 'node',    // Node.js окружение
  roots: ['<rootDir>/tests'], // Папка с тестами
  transform: {
    '^.+\\.tsx?$': 'ts-jest', // Все TS/TSX файлы через ts-jest
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'json', 'node'],
};