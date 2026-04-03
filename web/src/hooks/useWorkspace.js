import { useState, useEffect, useCallback } from 'react';

/**
 * 工作区管理 Hook
 * 负责工作区数据的保存、加载和管理
 */

const WORKSPACE_STORAGE_KEY = 'warpparse_workspace';
const WORKSPACE_MODE_KEY = 'warpparse_workspace_mode';

// 默认工作区数据结构
const DEFAULT_WORKSPACE = {
  log: '',
  wpl: '',
  oml: '',
  // 解析结果
  parseResult: null,
  parseError: null,
  // 转换结果
  transformParseResult: null,
  transformResult: null,
  transformError: null,
  // 其他状态
  selectedExample: null,
  lastSaved: null,
};

export const useWorkspace = () => {
  const [workspaceMode, setWorkspaceMode] = useState('workspace'); // 'workspace' | 'examples'
  const [workspaceData, setWorkspaceData] = useState(DEFAULT_WORKSPACE);

  // 从 localStorage 加载工作区数据
  const loadWorkspace = useCallback(() => {
    try {
      const saved = localStorage.getItem(WORKSPACE_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        setWorkspaceData(parsed);
        return parsed;
      }
    } catch (error) {
      console.error('加载工作区数据失败:', error);
    }
    return DEFAULT_WORKSPACE;
  }, []);

  // 保存工作区数据到 localStorage
  const saveWorkspace = useCallback((data) => {
    try {
      const dataToSave = {
        ...data,
        lastSaved: Date.now(),
      };
      localStorage.setItem(WORKSPACE_STORAGE_KEY, JSON.stringify(dataToSave));
      setWorkspaceData(dataToSave);
      return true;
    } catch (error) {
      console.error('保存工作区数据失败:', error);
      return false;
    }
  }, []);

  // 更新工作区数据（不立即保存）
  const updateWorkspace = useCallback((updates) => {
    setWorkspaceData(prev => ({
      ...prev,
      ...updates,
    }));
  }, []);

  // 清空工作区
  const clearWorkspace = useCallback(() => {
    const cleared = { ...DEFAULT_WORKSPACE, lastSaved: Date.now() };
    localStorage.setItem(WORKSPACE_STORAGE_KEY, JSON.stringify(cleared));
    setWorkspaceData(cleared);
  }, []);

  // 切换模式（工作区/示例区）
  const switchMode = useCallback((mode, currentData) => {
    // 如果从工作区切换到示例区，自动保存当前数据
    if (workspaceMode === 'workspace' && mode === 'examples') {
      saveWorkspace(currentData);
    }
    
    setWorkspaceMode(mode);
    localStorage.setItem(WORKSPACE_MODE_KEY, mode);
    
    // 如果切换回工作区，加载保存的数据
    if (mode === 'workspace') {
      return loadWorkspace();
    }
    
    return null;
  }, [workspaceMode, saveWorkspace, loadWorkspace]);

  // 初始化：默认使用工作区模式，加载保存的数据
  useEffect(() => {
    // 始终默认为工作区模式
    setWorkspaceMode('workspace');
    localStorage.setItem(WORKSPACE_MODE_KEY, 'workspace');
    loadWorkspace();
  }, [loadWorkspace]);

  return {
    workspaceMode,
    workspaceData,
    loadWorkspace,
    saveWorkspace,
    updateWorkspace,
    clearWorkspace,
    switchMode,
  };
};
