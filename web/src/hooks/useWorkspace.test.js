import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import { useWorkspace } from './useWorkspace';

describe('useWorkspace', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('should initialize with default workspace mode', () => {
    const { result } = renderHook(() => useWorkspace());
    expect(result.current.workspaceMode).toBe('workspace');
  });

  it('should save and load workspace data including parse results', () => {
    const { result } = renderHook(() => useWorkspace());
    
    const testData = {
      log: 'test log',
      wpl: 'test wpl',
      oml: 'test oml',
      parseResult: { fields: [{ name: 'test', value: 'value' }] },
      parseError: null,
      transformResult: { fields: [{ name: 'transform', value: 'result' }] },
      selectedExample: 'nginx',
    };

    act(() => {
      result.current.saveWorkspace(testData);
    });

    expect(result.current.workspaceData.log).toBe('test log');
    expect(result.current.workspaceData.wpl).toBe('test wpl');
    expect(result.current.workspaceData.oml).toBe('test oml');
    expect(result.current.workspaceData.parseResult).toEqual({ fields: [{ name: 'test', value: 'value' }] });
    expect(result.current.workspaceData.transformResult).toEqual({ fields: [{ name: 'transform', value: 'result' }] });
    expect(result.current.workspaceData.selectedExample).toBe('nginx');
  });

  it('should update workspace data including parse results', () => {
    const { result } = renderHook(() => useWorkspace());

    act(() => {
      result.current.updateWorkspace({ 
        log: 'new log',
        wpl: 'new wpl',
        oml: 'new oml',
        parseResult: { fields: [{ name: 'new', value: 'result' }] },
        parseError: { message: 'parse error' },
      });
    });

    expect(result.current.workspaceData.log).toBe('new log');
    expect(result.current.workspaceData.parseResult).toEqual({ fields: [{ name: 'new', value: 'result' }] });
    expect(result.current.workspaceData.parseError).toEqual({ message: 'parse error' });
  });

  it('should switch between workspace and examples mode with parse results', () => {
    const { result } = renderHook(() => useWorkspace());

    const testData = {
      log: 'test log',
      wpl: 'test wpl',
      oml: 'test oml',
      parseResult: { fields: [{ name: 'test', value: 'value' }] },
      transformResult: { fields: [{ name: 'transform', value: 'result' }] },
    };

    act(() => {
      result.current.switchMode('examples', testData);
    });

    expect(result.current.workspaceMode).toBe('examples');

    act(() => {
      const loadedData = result.current.switchMode('workspace', {});
      expect(loadedData.parseResult).toEqual({ fields: [{ name: 'test', value: 'value' }] });
      expect(loadedData.transformResult).toEqual({ fields: [{ name: 'transform', value: 'result' }] });
    });

    expect(result.current.workspaceMode).toBe('workspace');
  });

  it('should clear workspace data including parse results', () => {
    const { result } = renderHook(() => useWorkspace());

    act(() => {
      result.current.updateWorkspace({ 
        log: 'test log',
        wpl: 'test wpl', 
        oml: 'test oml',
        parseResult: { fields: [{ name: 'test', value: 'value' }] },
        transformResult: { fields: [{ name: 'transform', value: 'result' }] },
      });
      result.current.clearWorkspace();
    });

    expect(result.current.workspaceData.log).toBe('');
    expect(result.current.workspaceData.wpl).toBe('');
    expect(result.current.workspaceData.oml).toBe('');
    expect(result.current.workspaceData.parseResult).toBe(null);
    expect(result.current.workspaceData.transformResult).toBe(null);
    expect(result.current.workspaceData.selectedExample).toBe(null);
  });

  it('should handle partial updates correctly with parse results', () => {
    const { result } = renderHook(() => useWorkspace());

    act(() => {
      result.current.updateWorkspace({ 
        log: 'initial log',
        parseResult: { fields: [{ name: 'initial', value: 'result' }] },
      });
    });

    expect(result.current.workspaceData.log).toBe('initial log');
    expect(result.current.workspaceData.parseResult).toEqual({ fields: [{ name: 'initial', value: 'result' }] });
    expect(result.current.workspaceData.wpl).toBe('');
    expect(result.current.workspaceData.oml).toBe('');

    act(() => {
      result.current.updateWorkspace({ 
        oml: 'new oml',
        transformResult: { fields: [{ name: 'new', value: 'transform' }] },
      });
    });

    expect(result.current.workspaceData.log).toBe('initial log');
    expect(result.current.workspaceData.oml).toBe('new oml');
    expect(result.current.workspaceData.parseResult).toEqual({ fields: [{ name: 'initial', value: 'result' }] });
    expect(result.current.workspaceData.transformResult).toEqual({ fields: [{ name: 'new', value: 'transform' }] });
  });
});
