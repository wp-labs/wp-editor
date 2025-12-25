import React, { useMemo, useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import httpRequest from '@/services/request';

/**
 * 顶部导航组件
 * 功能：
 * 1. 显示品牌 Logo 和导航菜单
 * 2. 显示连接状态和用户信息
 * 3. 提供用户登出功能
 * 4. 登录页不显示导航
 * 对应原型：pages/views/*.html 中的 main-header
 */
function Navigation({ children }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef(null);
  const [refreshKey, setRefreshKey] = useState(0); // 用于强制重新渲染
  const [versionInfo, setVersionInfo] = useState({ wpEditer: '', warpEngine: '' });

  // 调试：添加默认版本信息，确保元素能显示
  useEffect(() => {
    // 如果API请求失败或返回空值，使用默认值
    if (!versionInfo.wpEditer && !versionInfo.warpEngine) {
      console.log('Using default version info for display');
      // 不实际设置状态，只在渲染时使用默认值
    }
  }, [versionInfo]);

  // 监听 sessionStorage 变化，以便在连接状态变化时更新显示
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === 'connectedIP' || e.key === 'username') {
        setRefreshKey((prev) => prev + 1);
      }
    };

    // 监听同窗口的 storage 事件（通过自定义事件）
    window.addEventListener('storage', handleStorageChange);
    
    // 由于同窗口的 sessionStorage 变化不会触发 storage 事件，我们需要监听自定义事件
    const handleCustomStorageChange = () => {
      setRefreshKey((prev) => prev + 1);
    };
    
    window.addEventListener('connectedIPChanged', handleCustomStorageChange);
    window.addEventListener('usernameChanged', handleCustomStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('connectedIPChanged', handleCustomStorageChange);
      window.removeEventListener('usernameChanged', handleCustomStorageChange);
      window.removeEventListener('connectedPortChanged', handleCustomStorageChange);
    };
  }, []);

  // 计算连接状态和用户名显示文本
  // 根据是否为 file:// 协议和是否有连接 IP 决定显示内容
  const { connectionLabel, usernameLabel, connectionColor } = useMemo(() => {
    const isFileProtocol = window.location.protocol === 'file:';
    const connectedIP = window.sessionStorage.getItem('connectedIP') || '';
    const connectedPort = window.sessionStorage.getItem('connectedPort') || '';
    const username = window.sessionStorage.getItem('username') || '';

    // 计算连接状态显示文本
    let connectionLabelText = '—';
    let connectionTextColor = '';
    if (connectedIP) {
      // 显示为 IP:端口，如果没有端口则仅显示 IP
      connectionLabelText = connectedPort ? `${connectedIP}:${connectedPort}` : connectedIP;
    } else if (isFileProtocol) {
      connectionLabelText = '演示模式';
      connectionTextColor = '#faad14';
    }

    // 计算用户名显示文本
    let userText = username;
    if (!userText && isFileProtocol) {
      userText = '访客';
    }

    return {
      connectionLabel: connectionLabelText,
      usernameLabel: userText,
      connectionColor: connectionTextColor,
    };
  }, [location.pathname, refreshKey]); // 当路由变化或 refreshKey 变化时重新计算

  // 获取版本信息：wp-editer 与 warp-parse
  useEffect(() => {
    const fetchVersion = async () => {
      try {
        const response = await httpRequest.get('/version');
        setVersionInfo({
          wpEditer: response?.wp_editer || '',
          warpEngine: response?.warp_engine || '',
        });
      } catch (error) {
        // 忽略版本获取失败，不影响主流程
      }
    };

    fetchVersion();
  }, []);

  // 调试：设置默认版本信息以便测试显示
  // useEffect(() => {
  //   // 模拟版本信息
  //   setVersionInfo({
  //     wpEditer: '1.0.0',
  //     warpEngine: '2.0.0',
  //   });
  // }, []);

  const menuItems = [
    { path: '/simulate-debug', name: '模拟调试', page: 'simulate-debug' },
  ];

  /**
   * 判断导航菜单项是否激活
   * @param {string} path - 菜单项路径
   * @returns {boolean} 是否激活
   */
  const isActive = (path) => {
    return location.pathname === path || location.pathname.startsWith(`${path}/`);
  };

  /**
   * 处理用户登出
   * 清除会话信息并跳转到登录页
   */
  const handleLogout = () => {
    // 清除会话信息
    window.sessionStorage.clear();
    // 触发自定义事件通知其他组件
    window.dispatchEvent(new Event('connectedIPChanged'));
    window.dispatchEvent(new Event('usernameChanged'));
  };

  /**
   * 处理切换连接
   */
  const handleSwitchConnection = () => {
    // 切换连接功能已移除
    // navigate('/connections');
  };

  /**
   * 处理用户菜单切换
   */
  const handleUserMenuToggle = (e) => {
    e.stopPropagation();
    setUserMenuOpen(!userMenuOpen);
  };

  // 点击外部关闭用户菜单
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setUserMenuOpen(false);
      }
    };

    if (userMenuOpen) {
      document.addEventListener('click', handleClickOutside);
    }

    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [userMenuOpen]);

  // 登录页不显示导航
  if (location.pathname === '/login') {
    return <>{children}</>;
  }

  return (
    // 应用整体布局：头部固定在上方，下面内容区域单独滚动
    <div className="app-shell">
      <header className="main-header">
        <div style={{ display: 'block', width: '100%', zIndex: 100 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <img src="/assets/images/index.png" alt="WpEditer" style={{ height: '70px', display: 'inline-block' }} />
            <span style={{ color: '#fff', fontSize: '20px' }}>|</span>
            <span style={{ color: '#fff', fontSize: '20px', fontWeight: 'bold' }}>Wp Editor</span>
          </div>
          <div style={{ 
            color: '#fff', 
            fontSize: '14px', 
            marginTop: '5px',
            backgroundColor: 'rgba(255,255,255,0.2)',
            padding: '8px',
            borderRadius: '4px',
            display: 'inline-block'
          }}>
            <div>wp-editer: {versionInfo.wpEditer || '1.0.0'}</div>
            <div>warp-engine: {versionInfo.warpEngine || '2.0.0'}</div>
          </div>
        </div>
        <nav className="top-nav">
          {menuItems.map((menuItem) => (
            <button
              key={menuItem.path}
              type="button"
              className={`nav-item ${isActive(menuItem.path) ? 'is-active' : ''}`}
              data-page={menuItem.page}
              onClick={() => navigate(menuItem.path)}
            >
              {menuItem.name}
            </button>
          ))}
        </nav>
        <div className="header-actions">
          <div className="connection-info" id="connection-info">
            <span className="connection-label">已连接：</span>
            <span
              className="connection-ip"
              id="connected-ip"
              style={{ color: connectionColor || '' }}
            >
              {connectionLabel}
            </span>
          </div>
          <button
            type="button"
            className="switch-connection-btn"
            id="switch-connection"
            onClick={handleSwitchConnection}
          >
            切换连接
          </button>
          <div className={`user-menu ${userMenuOpen ? 'active' : ''}`} id="user-menu" ref={userMenuRef}>
            <button
              type="button"
              className="user-trigger"
              id="user-trigger"
              onClick={handleUserMenuToggle}
            >
              <span className="user-icon">👤</span>
              <span className="user-name" id="user-name">
                {usernameLabel}
              </span>
            </button>
            <div className="user-dropdown">
              <button
                type="button"
                className="user-dropdown-item"
                id="logout-btn"
                onClick={handleLogout}
              >
                登出
              </button>
            </div>
          </div>
        </div>
      </header>
      <div className="app-shell-body">
        <div
          className={
            ['/features', '/system-release'].some((path) =>
              location.pathname === path || location.pathname.startsWith(`${path}/`)
            )
              ? 'main-content no-side-nav'
              : 'main-content'
          }
        >
          {children}
        </div>
      </div>
    </div>
  );
}

export default Navigation;
