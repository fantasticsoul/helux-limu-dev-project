// @ts-nocheck
import React from 'react';
import { render, screen } from '@testing-library/react';
import App from '.';

test('renders learn react link', () => {
  render(<App />);
  const linkElement = screen.getByText(/learn react/i);
  expect(linkElement).toBeInTheDocument();
});
// "typeRoots": [
//   "nodule_modules/@types",
//   "nodule_modules/@types/jest",
//   "src/helux/src-core",
//   "src/helux/src"
// ]