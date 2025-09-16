import React, { useState } from 'react';
import {
  Table,
  TableProps,
  Space,
  Button,
  Input,
  Tooltip,
  Popconfirm,
  Dropdown,
  Checkbox,
  Row,
  Col,
  Card,
} from 'antd';
import {
  SearchOutlined,
  ReloadOutlined,
  SettingOutlined,
  DownloadOutlined,
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  EyeOutlined,
  MoreOutlined,
  FilterOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { cn } from '@/lib/utils';

const { Search } = Input;

interface DataTableProps<T = any> extends Omit<TableProps<T>, 'columns'> {
  // 表格数据
  columns: ColumnsType<T>;
  data?: T[];
  
  // 加载状态
  loading?: boolean;
  
  // 分页配置
  pagination?: {
    current: number;
    pageSize: number;
    total: number;
    showSizeChanger?: boolean;
    showQuickJumper?: boolean;
    showTotal?: (total: number, range: [number, number]) => string;
    onChange: (page: number, pageSize: number) => void;
  };
  
  // 选择配置
  rowSelection?: {
    selectedRowKeys: React.Key[];
    onChange: (selectedRowKeys: React.Key[], selectedRows: T[]) => void;
    getCheckboxProps?: (record: T) => { disabled?: boolean };
  };
  
  // 操作配置
  actions?: {
    create?: {
      text?: string;
      onClick: () => void;
      disabled?: boolean;
    };
    batchDelete?: {
      text?: string;
      onClick: (selectedRows: T[]) => void;
      disabled?: boolean;
    };
    export?: {
      text?: string;
      onClick: () => void;
      disabled?: boolean;
    };
    refresh?: {
      text?: string;
      onClick: () => void;
      disabled?: boolean;
    };
    custom?: Array<{
      key: string;
      text: string;
      icon?: React.ReactNode;
      onClick: (selectedRows: T[]) => void;
      disabled?: boolean;
    }>;
  };
  
  // 搜索配置
  searchConfig?: {
    placeholder?: string;
    onSearch: (value: string) => void;
    allowClear?: boolean;
  };
  
  // 筛选配置
  filterConfig?: {
    filters: React.ReactNode;
    onReset: () => void;
  };
  
  // 表格配置
  tableConfig?: {
    size?: 'small' | 'middle' | 'large';
    bordered?: boolean;
    showHeader?: boolean;
    sticky?: boolean;
    scroll?: { x?: number; y?: number };
  };
  
  // 列设置
  columnSettings?: {
    enabled?: boolean;
    defaultHiddenColumns?: string[];
    onColumnsChange?: (visibleColumns: string[]) => void;
  };
  
  // 标题和描述
  title?: string;
  description?: string;
  
  // 样式
  className?: string;
  cardProps?: any;
}

const DataTable = <T extends Record<string, any>>({
  columns,
  data = [],
  loading = false,
  pagination,
  rowSelection,
  actions,
  searchConfig,
  filterConfig,
  tableConfig = {},
  columnSettings,
  title,
  description,
  className,
  cardProps,
  ...tableProps
}: DataTableProps<T>) => {
  const [visibleColumns, setVisibleColumns] = useState<string[]>(
    columns
      .filter(col => !columnSettings?.defaultHiddenColumns?.includes(col.key as string))
      .map(col => col.key as string)
  );

  // 处理列显示/隐藏
  const handleColumnVisibilityChange = (columnKey: string, visible: boolean) => {
    const newVisibleColumns = visible
      ? [...visibleColumns, columnKey]
      : visibleColumns.filter(key => key !== columnKey);
    
    setVisibleColumns(newVisibleColumns);
    columnSettings?.onColumnsChange?.(newVisibleColumns);
  };

  // 过滤可见列
  const filteredColumns = columns.filter(col => 
    visibleColumns.includes(col.key as string)
  );

  // 列设置下拉菜单
  const columnSettingsMenu = {
    items: columns.map(col => ({
      key: col.key as string,
      label: (
        <Checkbox
          checked={visibleColumns.includes(col.key as string)}
          onChange={(e) => handleColumnVisibilityChange(col.key as string, e.target.checked)}
        >
          {col.title as string}
        </Checkbox>
      ),
    })),
  };

  // 批量操作菜单
  const batchActionMenu = {
    items: [
      ...(actions?.batchDelete ? [{
        key: 'batchDelete',
        label: (
          <Popconfirm
            title="确认删除"
            description={`确定要删除选中的 ${rowSelection?.selectedRowKeys?.length || 0} 项吗？`}
            onConfirm={() => {
              const selectedRows = data.filter(item => 
                rowSelection?.selectedRowKeys?.includes(item[tableProps.rowKey as string] || item.id)
              );
              actions?.batchDelete?.onClick(selectedRows);
            }}
            okText="确认"
            cancelText="取消"
          >
            <span className="text-red-500">
              <DeleteOutlined className="mr-1" />
              {actions.batchDelete.text || '批量删除'}
            </span>
          </Popconfirm>
        ),
      }] : []),
      ...(actions?.custom?.map(action => ({
        key: action.key,
        label: (
          <span onClick={() => {
            const selectedRows = data.filter(item => 
              rowSelection?.selectedRowKeys?.includes(item[tableProps.rowKey as string] || item.id)
            );
            action.onClick(selectedRows);
          }}>
            {action.icon && <span className="mr-1">{action.icon}</span>}
            {action.text}
          </span>
        ),
        disabled: action.disabled,
      })) || []),
    ],
  };

  // 表格工具栏
  const renderToolbar = () => (
    <div className="mb-4 space-y-4">
      {/* 标题和描述 */}
      {(title || description) && (
        <div>
          {title && <h3 className="text-lg font-semibold mb-1">{title}</h3>}
          {description && <p className="text-sm text-gray-600">{description}</p>}
        </div>
      )}

      {/* 筛选器 */}
      {filterConfig && (
        <Card size="small" className="bg-gray-50">
          <Row gutter={[16, 16]} align="middle">
            <Col flex="auto">
              {filterConfig.filters}
            </Col>
            <Col>
              <Button
                icon={<FilterOutlined />}
                onClick={filterConfig.onReset}
                size="small"
              >
                重置
              </Button>
            </Col>
          </Row>
        </Card>
      )}

      {/* 操作栏 */}
      <Row justify="space-between" align="middle">
        <Col>
          <Space>
            {/* 搜索 */}
            {searchConfig && (
              <Search
                placeholder={searchConfig.placeholder || '搜索...'}
                allowClear={searchConfig.allowClear}
                onSearch={searchConfig.onSearch}
                onChange={(e) => !e.target.value && searchConfig.onSearch('')}
                style={{ width: 250 }}
              />
            )}

            {/* 批量操作 */}
            {rowSelection && rowSelection.selectedRowKeys.length > 0 && (
              <div className="flex items-center space-x-2 px-3 py-1 bg-blue-50 rounded-lg border border-blue-200">
                <span className="text-sm text-blue-600">
                  已选择 {rowSelection.selectedRowKeys.length} 项
                </span>
                {(actions?.batchDelete || actions?.custom) && (
                  <Dropdown menu={batchActionMenu} trigger={['click']}>
                    <Button size="small" type="link">
                      批量操作 <MoreOutlined />
                    </Button>
                  </Dropdown>
                )}
              </div>
            )}
          </Space>
        </Col>

        <Col>
          <Space>
            {/* 刷新 */}
            {actions?.refresh && (
              <Tooltip title={actions.refresh.text || '刷新'}>
                <Button
                  icon={<ReloadOutlined />}
                  onClick={actions.refresh.onClick}
                  disabled={actions.refresh.disabled || loading}
                  loading={loading}
                />
              </Tooltip>
            )}

            {/* 导出 */}
            {actions?.export && (
              <Button
                icon={<DownloadOutlined />}
                onClick={actions.export.onClick}
                disabled={actions.export.disabled}
              >
                {actions.export.text || '导出'}
              </Button>
            )}

            {/* 列设置 */}
            {columnSettings?.enabled && (
              <Dropdown menu={columnSettingsMenu} trigger={['click']} placement="bottomRight">
                <Button icon={<SettingOutlined />} />
              </Dropdown>
            )}

            {/* 新建 */}
            {actions?.create && (
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={actions.create.onClick}
                disabled={actions.create.disabled}
              >
                {actions.create.text || '新建'}
              </Button>
            )}
          </Space>
        </Col>
      </Row>
    </div>
  );

  const tableElement = (
    <Table<T>
      {...tableProps}
      columns={filteredColumns}
      dataSource={data}
      loading={loading}
      pagination={pagination ? {
        current: pagination.current,
        pageSize: pagination.pageSize,
        total: pagination.total,
        showSizeChanger: pagination.showSizeChanger ?? true,
        showQuickJumper: pagination.showQuickJumper ?? true,
        showTotal: pagination.showTotal ?? ((total, range) =>
          `第 ${range[0]}-${range[1]} 条，共 ${total} 条`
        ),
        onChange: pagination.onChange,
        onShowSizeChange: pagination.onChange,
      } : false}
      rowSelection={rowSelection}
      size={tableConfig.size || 'middle'}
      bordered={tableConfig.bordered}
      showHeader={tableConfig.showHeader}
      sticky={tableConfig.sticky}
      scroll={tableConfig.scroll}
      className={cn('ant-table-wrapper', className)}
    />
  );

  if (cardProps !== false) {
    return (
      <Card {...cardProps} className={cn('card-shadow', cardProps?.className)}>
        {renderToolbar()}
        {tableElement}
      </Card>
    );
  }

  return (
    <div className={className}>
      {renderToolbar()}
      {tableElement}
    </div>
  );
};

// 预设的操作列组件
export const ActionColumn = <T,>({
  record,
  actions,
}: {
  record: T;
  actions: {
    view?: (record: T) => void;
    edit?: (record: T) => void;
    delete?: (record: T) => void;
    custom?: Array<{
      key: string;
      label: string;
      icon?: React.ReactNode;
      onClick: (record: T) => void;
      danger?: boolean;
      disabled?: boolean;
    }>;
  };
}) => {
  const items = [
    ...(actions.view ? [{
      key: 'view',
      label: '查看',
      icon: <EyeOutlined />,
      onClick: () => actions.view!(record),
    }] : []),
    ...(actions.edit ? [{
      key: 'edit',
      label: '编辑',
      icon: <EditOutlined />,
      onClick: () => actions.edit!(record),
    }] : []),
    ...(actions.custom || []).map(action => ({
      key: action.key,
      label: action.label,
      icon: action.icon,
      onClick: () => action.onClick(record),
      danger: action.danger,
      disabled: action.disabled,
    })),
    ...(actions.delete ? [{
      key: 'delete',
      label: (
        <Popconfirm
          title="确认删除"
          description="确定要删除这项数据吗？"
          onConfirm={() => actions.delete!(record)}
          okText="确认"
          cancelText="取消"
        >
          <span className="text-red-500">删除</span>
        </Popconfirm>
      ),
      icon: <DeleteOutlined />,
      danger: true,
    }] : []),
  ];

  if (items.length <= 2) {
    return (
      <Space size="small">
        {items.map(item => (
          <Button
            key={item.key}
            type="link"
            size="small"
            icon={item.icon}
            onClick={item.onClick}
            danger={item.danger}
            disabled={item.disabled}
          >
            {typeof item.label === 'string' ? item.label : null}
          </Button>
        ))}
      </Space>
    );
  }

  return (
    <Dropdown
      menu={{
        items: items.map(item => ({
          ...item,
          label: typeof item.label === 'string' ? (
            <span onClick={item.onClick}>
              {item.icon && <span className="mr-2">{item.icon}</span>}
              {item.label}
            </span>
          ) : item.label,
        })),
      }}
      trigger={['click']}
    >
      <Button type="link" size="small" icon={<MoreOutlined />} />
    </Dropdown>
  );
};

export default DataTable;