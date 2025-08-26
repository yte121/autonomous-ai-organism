import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import ErrorState from './ErrorState';

describe('ErrorState', () => {
  it('renders the title and message', () => {
    render(<ErrorState title="Error Occurred" message="Something went wrong." />);

    expect(screen.getByText('Error Occurred')).toBeInTheDocument();
    expect(screen.getByText('Something went wrong.')).toBeInTheDocument();
  });

  it('always renders the AlertTriangle icon', () => {
    const { container } = render(<ErrorState title="Error" message="msg" />);
    expect(container.querySelector('svg')).toBeInTheDocument();
  });

  it('does not render a retry button if onRetry is not provided', () => {
    render(<ErrorState title="Error" message="msg" />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('renders a retry button and calls onRetry when clicked', async () => {
    const user = userEvent.setup();
    const handleRetry = vi.fn();
    render(
      <ErrorState
        title="Error"
        message="msg"
        onRetry={handleRetry}
      />
    );

    const button = screen.getByRole('button', { name: 'Retry' });
    expect(button).toBeInTheDocument();

    await user.click(button);
    expect(handleRetry).toHaveBeenCalledTimes(1);
  });
});
