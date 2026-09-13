module.exports = {
  preset: 'jest-expo',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
    '^react-native/src/setup-env(\\.js)?$': '<rootDir>/node_modules/react-native/index.js',
  },
  testPathIgnorePatterns: ['/node_modules/', '/.expo/'],
};
