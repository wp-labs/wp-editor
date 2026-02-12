import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import InstanceSelector from './index';

// Mock i18n
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key) => {
      const translations = {
        'multipleInstances.addInstance': 'Add Instance',
        'multipleInstances.confirmDelete': 'Are you sure you want to delete this instance?',
        'multipleInstances.deleteWarning': 'All data in this instance will be permanently lost',
        'multipleInstances.maxInstancesReached': 'Maximum number of instances reached (10)',
        'common.confirm': 'Confirm',
        'common.cancel': 'Cancel',
      };
      return translations[key] || key;
    },
  }),
}));

// Mock antd Modal
vi.mock('antd', async () => {
  const actual = await vi.importActual('antd');
  return {
    ...actual,
    Modal: {
      confirm: vi.fn(({ onOk }) => {
        // Simulate immediate confirmation for testing
        if (onOk) onOk();
      }),
    },
  };
});

describe('InstanceSelector Component', () => {
  const mockInstances = [
    {
      id: '1',
      name: 'Instance 1',
      log: 'test log',
      wpl: '',
      oml: '',
      parseResult: null,
      parseError: null,
      transformResult: null,
      transformError: null,
    },
    {
      id: '2',
      name: 'Instance 2',
      log: '',
      wpl: '',
      oml: '',
      parseResult: { data: 'parsed' },
      parseError: null,
      transformResult: null,
      transformError: null,
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders all instances', () => {
    render(
      <InstanceSelector
        instances={mockInstances}
        activeIndex={0}
        maxInstances={10}
        onSwitch={vi.fn()}
        onAdd={vi.fn()}
        onRemove={vi.fn()}
        onRename={vi.fn()}
      />
    );

    expect(screen.getByText('Instance 1')).toBeDefined();
    expect(screen.getByText('Instance 2')).toBeDefined();
  });

  it('highlights active instance', () => {
    const { container } = render(
      <InstanceSelector
        instances={mockInstances}
        activeIndex={0}
        maxInstances={10}
        onSwitch={vi.fn()}
        onAdd={vi.fn()}
        onRemove={vi.fn()}
        onRename={vi.fn()}
      />
    );

    const tabs = container.querySelectorAll('[class*="instanceTab"]');
    expect(tabs[0].className).toContain('active');
    expect(tabs[1].className).not.toContain('active');
  });

  it('calls onSwitch when clicking an instance', () => {
    const onSwitch = vi.fn();
    render(
      <InstanceSelector
        instances={mockInstances}
        activeIndex={0}
        maxInstances={10}
        onSwitch={onSwitch}
        onAdd={vi.fn()}
        onRemove={vi.fn()}
        onRename={vi.fn()}
      />
    );

    fireEvent.click(screen.getByText('Instance 2'));
    expect(onSwitch).toHaveBeenCalledWith(1);
  });

  it('calls onAdd when clicking add button', () => {
    const onAdd = vi.fn();
    render(
      <InstanceSelector
        instances={mockInstances}
        activeIndex={0}
        maxInstances={10}
        onSwitch={vi.fn()}
        onAdd={onAdd}
        onRemove={vi.fn()}
        onRename={vi.fn()}
      />
    );

    fireEvent.click(screen.getByText('Add Instance'));
    expect(onAdd).toHaveBeenCalled();
  });

  it('disables add button when max instances reached', () => {
    const onAdd = vi.fn();
    const maxedInstances = Array.from({ length: 10 }, (_, i) => ({
      id: `${i}`,
      name: `Instance ${i + 1}`,
      log: '',
      wpl: '',
      oml: '',
      parseResult: null,
      parseError: null,
      transformResult: null,
      transformError: null,
    }));

    render(
      <InstanceSelector
        instances={maxedInstances}
        activeIndex={0}
        maxInstances={10}
        onSwitch={vi.fn()}
        onAdd={onAdd}
        onRemove={vi.fn()}
        onRename={vi.fn()}
      />
    );

    const addButton = screen.getByText('Add Instance').closest('button');
    expect(addButton.disabled).toBe(true);
  });

  it('shows correct status icons', () => {
    const instancesWithStatus = [
      {
        id: '1',
        name: 'Empty Instance',
        log: '',
        wpl: '',
        oml: '',
        parseResult: null,
        parseError: null,
        transformResult: null,
        transformError: null,
      },
      {
        id: '2',
        name: 'Has Data',
        log: 'some log',
        wpl: '',
        oml: '',
        parseResult: null,
        parseError: null,
        transformResult: null,
        transformError: null,
      },
      {
        id: '3',
        name: 'Parsed',
        log: '',
        wpl: '',
        oml: '',
        parseResult: { data: 'parsed' },
        parseError: null,
        transformResult: null,
        transformError: null,
      },
      {
        id: '4',
        name: 'Error',
        log: '',
        wpl: '',
        oml: '',
        parseResult: null,
        parseError: 'error',
        transformResult: null,
        transformError: null,
      },
    ];

    const { container } = render(
      <InstanceSelector
        instances={instancesWithStatus}
        activeIndex={0}
        maxInstances={10}
        onSwitch={vi.fn()}
        onAdd={vi.fn()}
        onRemove={vi.fn()}
        onRename={vi.fn()}
      />
    );

    const icons = container.querySelectorAll('[class*="statusIcon"]');
    // Empty instance has no icon, so we expect 3 icons
    expect(icons.length).toBeGreaterThanOrEqual(3);
  });

  it('enters edit mode on double click', async () => {
    render(
      <InstanceSelector
        instances={mockInstances}
        activeIndex={0}
        maxInstances={10}
        onSwitch={vi.fn()}
        onAdd={vi.fn()}
        onRemove={vi.fn()}
        onRename={vi.fn()}
      />
    );

    const instanceName = screen.getByText('Instance 1');
    fireEvent.doubleClick(instanceName);

    await waitFor(() => {
      const input = screen.getByDisplayValue('Instance 1');
      expect(input).toBeDefined();
    });
  });

  it('calls onRename when saving edited name', async () => {
    const onRename = vi.fn();
    render(
      <InstanceSelector
        instances={mockInstances}
        activeIndex={0}
        maxInstances={10}
        onSwitch={vi.fn()}
        onAdd={vi.fn()}
        onRemove={vi.fn()}
        onRename={onRename}
      />
    );

    const instanceName = screen.getByText('Instance 1');
    fireEvent.doubleClick(instanceName);

    await waitFor(() => {
      const input = screen.getByDisplayValue('Instance 1');
      fireEvent.change(input, { target: { value: 'New Name' } });
      fireEvent.keyDown(input, { key: 'Enter' });
    });

    expect(onRename).toHaveBeenCalledWith(0, 'New Name');
  });

  it('cancels editing on Escape key', async () => {
    const onRename = vi.fn();
    render(
      <InstanceSelector
        instances={mockInstances}
        activeIndex={0}
        maxInstances={10}
        onSwitch={vi.fn()}
        onAdd={vi.fn()}
        onRemove={vi.fn()}
        onRename={onRename}
      />
    );

    const instanceName = screen.getByText('Instance 1');
    fireEvent.doubleClick(instanceName);

    await waitFor(() => {
      const input = screen.getByDisplayValue('Instance 1');
      fireEvent.change(input, { target: { value: 'New Name' } });
      fireEvent.keyDown(input, { key: 'Escape' });
    });

    expect(onRename).not.toHaveBeenCalled();
    expect(screen.getByText('Instance 1')).toBeDefined();
  });
});
