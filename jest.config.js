module.exports = {
  preset: 'jest-expo',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^react-native/src/setup-env(\\.js)?$': '<rootDir>/node_modules/react-native/index.js',
  },
};
