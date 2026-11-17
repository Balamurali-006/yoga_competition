import { fireEvent, render, screen } from '@testing-library/react';
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
  expect(screen.getByRole('link', { name: /Admin login/i })).toHaveAttribute('href', '/admin/login');
});

test('opens and closes the developer popup', () => {
  render(<App />);

  fireEvent.click(screen.getByRole('button', { name: /View developers/i }));

  expect(screen.getByRole('dialog', { name: /Meet the developers/i })).toBeInTheDocument();
  expect(screen.getByText('Bala Murali')).toBeInTheDocument();
  expect(screen.getByText('Deepitha')).toBeInTheDocument();

  fireEvent.keyDown(document, { key: 'Escape' });

  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
});
