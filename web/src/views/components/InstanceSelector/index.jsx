import { useLayoutEffect, useRef, useState } from 'react';
import { Button, Select, App as AntdApp } from 'antd';
import { CloseOutlined, EditOutlined, FileTextOutlined, CheckCircleOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import styles from './InstanceSelector.module.css';

/**
 * InstanceSelector Component
 * 实例选择器组件，用于管理和切换多个编辑器实例
 * 
 * @param {Object} props - 组件属性
 * @param {Array} props.instances - 实例列表
 * @param {number} props.activeIndex - 当前激活实例的索引
 * @param {number} props.maxInstances - 最大实例数量
 * @param {Function} props.onSwitch - 切换实例的回调函数
 * @param {Function} props.onAdd - 添加实例的回调函数
 * @param {Function} props.onRemove - 删除实例的回调函数
 * @param {Function} props.onRename - 重命名实例的回调函数
 * @param {boolean} props.showAddButton - 是否展示“添加实例”按钮
 * @param {number} props.collapseThreshold - 启用自动折叠：实例列表超出可用宽度时改为下拉（仅 inline 生效）
 */
function InstanceSelector({
  instances = [],
  activeIndex = 0,
  maxInstances = 10,
  onSwitch,
  onAdd,
  onRemove,
  onRename,
  inline = false,
  inlineMaxWidth,
  showAddButton = true,
  collapseThreshold = 0,
}) {
  const { t } = useTranslation();
  const { modal } = AntdApp.useApp();
  
  // 编辑状态：记录正在编辑的实例索引
  const [editingIndex, setEditingIndex] = useState(null);
  const [editingName, setEditingName] = useState('');
  const [selectOpen, setSelectOpen] = useState(false);
  const wrapperRef = useRef(null);
  const measureRef = useRef(null);

  // 计算实例状态
  const getInstanceStatus = (instance) => {
    // 如果有错误，状态为 ERROR
    if (instance.parseError || instance.transformError) {
      return 'error';
    }
    // 如果有转换结果，状态为 TRANSFORMED
    if (instance.transformResult) {
      return 'transformed';
    }
    // 如果有解析结果，状态为 PARSED
    if (instance.parseResult) {
      return 'parsed';
    }
    // 如果有数据（日志、WPL或OML），状态为 HAS_DATA
    if (instance.log || instance.wpl || instance.oml) {
      return 'has_data';
    }
    // 否则状态为 EMPTY
    return 'empty';
  };

  // 获取状态图标
  const getStatusIcon = (status) => {
    switch (status) {
      case 'error':
        return <ExclamationCircleOutlined className={styles.statusIconError} />;
      case 'transformed':
        return <CheckCircleOutlined className={styles.statusIconSuccess} />;
      case 'parsed':
        return <CheckCircleOutlined className={styles.statusIconSuccess} />;
      case 'has_data':
        return <FileTextOutlined className={styles.statusIconData} />;
      case 'empty':
      default:
        return null;
    }
  };

  // 处理实例切换
  const handleSwitch = (index) => {
    if (index !== activeIndex && onSwitch) {
      onSwitch(index);
    }
  };

  // 处理添加实例
  const handleAdd = () => {
    if (onAdd && instances.length < maxInstances) {
      onAdd();
    }
  };

  // 处理删除实例
  const handleRemove = (index, e) => {
    e.stopPropagation(); // 阻止事件冒泡，避免触发切换
    
    modal.confirm({
      title: t('multipleInstances.confirmDelete'),
      content: t('multipleInstances.deleteWarning'),
      okText: t('common.confirm'),
      cancelText: t('common.cancel'),
      onOk: () => {
        if (onRemove) {
          onRemove(index);
        }
      },
    });
  };

  // 开始编辑实例名称
  const startEditing = (index, currentName, e) => {
    e.stopPropagation(); // 阻止事件冒泡
    setEditingIndex(index);
    setEditingName(currentName);
  };

  // 保存编辑
  const saveEditing = () => {
    if (editingIndex !== null && onRename) {
      onRename(editingIndex, editingName);
    }
    setEditingIndex(null);
    setEditingName('');
  };

  const openRename = (index, name, e) => {
    e.stopPropagation();
    setSelectOpen(true);
    setEditingIndex(index);
    setEditingName(name);
  };

  // 取消编辑
  const cancelEditing = () => {
    setEditingIndex(null);
    setEditingName('');
  };

  // 处理键盘事件
  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      saveEditing();
    } else if (e.key === 'Escape') {
      cancelEditing();
    }
  };

  // 计算是否可以添加实例
  const canAddInstance = instances.length < maxInstances;

  const [shouldCollapse, setShouldCollapse] = useState(false);
  const shouldAutoCollapse = inline && collapseThreshold > 0;

  useLayoutEffect(() => {
    if (!shouldAutoCollapse) {
      setShouldCollapse(false);
      return;
    }
    const wrapper = wrapperRef.current;
    const measure = measureRef.current;
    if (!wrapper || !measure) {
      return;
    }
    const resolveAvailableWidth = () => {
      if (!inlineMaxWidth) {
        return wrapper.clientWidth;
      }
      if (typeof inlineMaxWidth === 'number') {
        return inlineMaxWidth;
      }
      const match = String(inlineMaxWidth).trim().match(/^(\d+(?:\.\d+)?)px$/);
      return match ? Number(match[1]) : wrapper.clientWidth;
    };
    const update = () => {
      const available = resolveAvailableWidth();
      const needed = measure.scrollWidth;
      const next = needed > available;
      setShouldCollapse((prev) => (prev === next ? prev : next));
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(wrapper);
    observer.observe(measure);
    return () => observer.disconnect();
  }, [shouldAutoCollapse, inlineMaxWidth, instances, editingName]);
  const instanceTabs = instances.map((instance, index) => {
    const isActive = index === activeIndex;
    const isEditing = editingIndex === index;
    const status = getInstanceStatus(instance);
    const statusIcon = getStatusIcon(status);

    return (
      <div
        key={instance.id}
        className={`${styles.instanceTab} ${isActive ? styles.active : ''}`}
        onClick={() => handleSwitch(index)}
      >
        {statusIcon && (
          <span className={styles.statusIcon}>{statusIcon}</span>
        )}
        
        {isEditing ? (
          <input
            type="text"
            className={styles.nameInput}
            value={editingName}
            onChange={(e) => setEditingName(e.target.value)}
            onBlur={saveEditing}
            onKeyDown={handleKeyDown}
            autoFocus
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <span
            className={styles.instanceName}
            onDoubleClick={(e) => startEditing(index, instance.name, e)}
          >
            {instance.name}
          </span>
        )}

        {instances.length > 1 && (
          <CloseOutlined
            className={styles.deleteButton}
            onClick={(e) => handleRemove(index, e)}
          />
        )}
      </div>
    );
  });

  const instanceListStyle = inline && inlineMaxWidth ? { maxWidth: inlineMaxWidth } : undefined;
  const instanceList = (
    <div
      className={`${styles.instanceList} ${inline ? styles.inlineList : ''}`}
      style={instanceListStyle}
    >
      {instanceTabs}
    </div>
  );
  const measureList = (
    <div
      ref={measureRef}
      className={`${styles.instanceList} ${inline ? styles.inlineList : ''} ${styles.measureList}`}
      style={instanceListStyle}
    >
      {instanceTabs}
    </div>
  );
  const instanceSelect = (
    <Select
      size="small"
      className={styles.inlineSelect}
      value={activeIndex}
      open={selectOpen}
      onOpenChange={setSelectOpen}
      onChange={(value) => handleSwitch(Number(value))}
      options={instances.map((instance, index) => ({
        value: index,
        label: instance.name,
      }))}
      popupRender={() => (
        <div className={styles.dropdownList}>
          {instances.map((instance, index) => {
            const isActive = index === activeIndex;
            const isEditing = editingIndex === index;
            const status = getInstanceStatus(instance);
            const statusIcon = getStatusIcon(status);

            return (
              <div
                key={instance.id}
                className={`${styles.dropdownItem} ${isActive ? styles.active : ''}`}
                onClick={() => {
                  if (editingIndex !== null) {
                    return;
                  }
                  handleSwitch(index);
                  setSelectOpen(false);
                }}
              >
                {statusIcon && (
                  <span className={styles.statusIcon}>{statusIcon}</span>
                )}
                {isEditing ? (
                  <input
                    type="text"
                    className={styles.nameInput}
                    value={editingName}
                    onChange={(e) => setEditingName(e.target.value)}
                    onBlur={saveEditing}
                    onKeyDown={handleKeyDown}
                    autoFocus
                    onClick={(e) => e.stopPropagation()}
                    onMouseDown={(e) => e.preventDefault()}
                  />
                ) : (
                  <span className={styles.instanceName}>
                    {instance.name}
                  </span>
                )}
                <EditOutlined
                  className={styles.editButton}
                  onClick={(e) => openRename(index, instance.name, e)}
                  onMouseDown={(e) => e.preventDefault()}
                />
                {instances.length > 1 && (
                  <CloseOutlined
                    className={styles.deleteButton}
                    onClick={(e) => handleRemove(index, e)}
                    onMouseDown={(e) => e.preventDefault()}
                  />
                )}
              </div>
            );
          })}
        </div>
      )}
    />
  );

  const addButton = showAddButton
    ? inline ? (
        <button
          type="button"
          className={`btn ghost ${styles.inlineAddButton}`}
          onClick={handleAdd}
          disabled={!canAddInstance}
          title={!canAddInstance ? t('multipleInstances.maxInstancesReached') : t('multipleInstances.addInstance')}
        >
          {t('multipleInstances.addInstance')}
        </button>
      ) : (
        <Button
          type="primary"
          className={styles.addButton}
          onClick={handleAdd}
          disabled={!canAddInstance}
          title={!canAddInstance ? t('multipleInstances.maxInstancesReached') : t('multipleInstances.addInstance')}
        >
          {t('multipleInstances.addInstance')}
        </Button>
      )
    : null;

  if (inline) {
    return (
      <>
        <div ref={wrapperRef} className={styles.inlineWrap}>
          {shouldCollapse ? instanceSelect : instanceList}
          {shouldAutoCollapse ? measureList : null}
        </div>
        {addButton}
      </>
    );
  }

  return (
    <div className={styles.container}>
      {instanceList}
      {addButton}
    </div>
  );
}

export default InstanceSelector;
