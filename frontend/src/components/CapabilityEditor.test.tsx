import React from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import CapabilityEditor from './CapabilityEditor';

describe('CapabilityEditor', () => {
  const predefinedCapabilities = ['learning', 'testing', 'optimization'];

  it('renders correctly with initial props', () => {
    render(
      <CapabilityEditor
        capabilities={['learning']}
        setCapabilities={() => {}}
        predefinedCapabilities={predefinedCapabilities}
        label="Test Capabilities"
        placeholder="Add a test capability"
      />
    );

    expect(screen.getByText('Test Capabilities')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Add a test capability')).toBeInTheDocument();

    const selected = screen.getByTestId('selected-capabilities');
    expect(within(selected).getByText('learning')).toBeInTheDocument();

    const suggestions = screen.getByTestId('suggested-capabilities');
    expect(within(suggestions).getByText('testing')).toBeInTheDocument();
  });

  it('displays an empty state message when no capabilities are provided', () => {
    render(
      <CapabilityEditor
        capabilities={[]}
        setCapabilities={() => {}}
        predefinedCapabilities={predefinedCapabilities}
      />
    );
    const selected = screen.getByTestId('selected-capabilities');
    expect(within(selected).getByText('No capabilities added yet.')).toBeInTheDocument();
  });

  it('calls setCapabilities when adding a new capability via button click', async () => {
    const user = userEvent.setup();
    const setCapabilities = vi.fn();
    render(
      <CapabilityEditor
        capabilities={[]}
        setCapabilities={setCapabilities}
        predefinedCapabilities={predefinedCapabilities}
      />
    );

    const input = screen.getByPlaceholderText('Add capability...');
    const addButton = screen.getByRole('button', { name: /add/i });

    await user.type(input, 'new_skill');
    await user.click(addButton);

    expect(setCapabilities).toHaveBeenCalledWith(['new_skill']);
  });

  it('calls setCapabilities when adding a new capability via Enter key', async () => {
    const user = userEvent.setup();
    const setCapabilities = vi.fn();
    render(
      <CapabilityEditor
        capabilities={[]}
        setCapabilities={setCapabilities}
        predefinedCapabilities={predefinedCapabilities}
      />
    );

    const input = screen.getByPlaceholderText('Add capability...');
    await user.type(input, 'another_skill{enter}');

    expect(setCapabilities).toHaveBeenCalledWith(['another_skill']);
  });

  it('calls setCapabilities when removing a capability', async () => {
    const user = userEvent.setup();
    const setCapabilities = vi.fn();
    render(
      <CapabilityEditor
        capabilities={['learning', 'testing']}
        setCapabilities={setCapabilities}
        predefinedCapabilities={predefinedCapabilities}
      />
    );

    const selected = screen.getByTestId('selected-capabilities');
    const removeButton = within(selected).getByRole('button', { name: /remove testing/i });

    await user.click(removeButton);

    expect(setCapabilities).toHaveBeenCalledWith(['learning']);
  });

  it('toggles a predefined capability on click', async () => {
    const user = userEvent.setup();
    const setCapabilities = vi.fn();

    // Use a fresh render for each action to isolate the mock calls
    const { rerender } = render(
      <CapabilityEditor
        capabilities={['learning']}
        setCapabilities={setCapabilities}
        predefinedCapabilities={predefinedCapabilities}
      />
    );

    const suggestions = screen.getByTestId('suggested-capabilities');
    const testingSuggestion = within(suggestions).getByText('testing');
    await user.click(testingSuggestion);
    expect(setCapabilities).toHaveBeenCalledWith(['learning', 'testing']);

    // Rerender with the new state to test toggling off
    rerender(
      <CapabilityEditor
        capabilities={['learning', 'testing']}
        setCapabilities={setCapabilities}
        predefinedCapabilities={predefinedCapabilities}
      />
    );

    const suggestionsAfterAdd = screen.getByTestId('suggested-capabilities');
    const learningSuggestion = within(suggestionsAfterAdd).getByText('learning');
    await user.click(learningSuggestion);
    expect(setCapabilities).toHaveBeenCalledWith(['testing']);
  });

  it('does not add empty or duplicate capabilities', async () => {
    const user = userEvent.setup();
    const setCapabilities = vi.fn();
    render(
      <CapabilityEditor
        capabilities={['learning']}
        setCapabilities={setCapabilities}
        predefinedCapabilities={predefinedCapabilities}
      />
    );

    const input = screen.getByPlaceholderText('Add capability...');
    const addButton = screen.getByRole('button', { name: /add/i });

    // Try to add empty string
    await user.click(addButton);
    expect(setCapabilities).not.toHaveBeenCalled();

    // Try to add existing capability
    await user.type(input, 'learning');
    await user.click(addButton);
    expect(setCapabilities).not.toHaveBeenCalled();
  });
});
