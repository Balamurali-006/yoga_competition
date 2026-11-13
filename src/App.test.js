import { render, screen } from '@testing-library/react';
import App from './App';

jest.mock('./firebase/auth', () => ({
  subscribeToAuth: (callback) => {
    callback(null);
    return () => {};
  },
}));

test('renders the home page content', () => {
  render(<App />);

  expect(
    screen.getByRole('heading', { name: /Ekadhma Yoga Competition 2025/i })
  ).toBeInTheDocument();
  expect(screen.getByRole('link', { name: /Register Now/i })).toBeInTheDocument();
});
