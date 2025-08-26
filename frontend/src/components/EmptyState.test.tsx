import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import EmptyState from './EmptyState';
import { PackagePlus } from 'lucide-react';

describe('EmptyState', () => {
  it('renders the title and description', () => {
    render(<EmptyState title="No Data" description="There is no data to display." />);

    expect(screen.getByText('No Data')).toBeInTheDocument();
    expect(screen.getByText('There is no data to display.')).toBeInTheDocument();
  });

  it('renders an icon if provided', () => {
    // We can't easily test for the specific icon component, but we can check if an SVG is rendered.
    // A better way is to add a test-id to the icon. Let's assume for now we just check for its presence.
    const { container } = render(
      <EmptyState title="No Data" description="Desc" Icon={PackagePlus} />
    );
    expect(container.querySelector('svg')).toBeInTheDocument();
  });

  it('does not render an action button if no action is provided', () => {
    render(<EmptyState title="No Data" description="Desc" />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('renders an action button and calls the onClick handler when clicked', async () => {
    const user = userEvent.setup();
    const handleClick = vi.fn();
    render(
      <EmptyState
        title="No Data"
        description="Desc"
        action={{ label: 'Create New', onClick: handleClick }}
      />
    );

    const button = screen.getByRole('button', { name: 'Create New' });
    expect(button).toBeInTheDocument();

    await user.click(button);
    expect(handleClick).toHaveBeenCalledTimes(1);
  });
});
