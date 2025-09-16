'use client';

import React, { useState, useEffect } from 'react';
import {
  Card,
  Row,
  Col,
  DatePicker,
  Select,
  Button,
  Space,
  Typography,
  Statistic,
  Progress,
  Table,
  Tag,
  Tooltip,
} from 'antd';
import {
  BarChartOutlined,
  LineChartOutlined,
  PieChartOutlined,
  DownloadOutlined,
  ReloadOutlined,
  TrendingUpOutlined,
  TrendingDownOutlined,
} from '@ant-design/icons';
import { Line, Column, Pie, Area } from '@ant-design/charts';
import { analyticsApi } from '@/lib/api';
import { usePermissions } from '@/hooks/useAuth';
import { formatMoney, formatNumber, formatPercentage } from '@/lib/utils';
import dayjs from 'dayjs';

const { RangePicker } = DatePicker;
const { Option } = Select;
const { Title, Text } = Typography;

export default function AnalyticsPage() {
  const [loading, setLoading] = useState(false);
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs]>([
    dayjs().subtract(30, 'day'),
    dayjs(),
  ]);
  const [selectedMetric, setSelectedMetric] = useState('revenue');

  const { checkPermission } = usePermissions();
  const canRead = checkPermission('analytics:read');

  // 模拟数据
  const [analyticsData, setAnalyticsData] = useState({
    overview: {
      totalRevenue: 156800,
      revenueGrowth: 12.5,
      totalUsers: 2840,
      userGrowth: 8.3,
      totalOrders: 1256,
      orderGrowth: -2.1,
      conversionRate: 3.8,
      conversionGrowth: 0.5,
    },
    userTrends: [
      { date: '2024-11-01', 新增用户: 45, 活跃用户: 180 },
      { date: '2024-11-02', 新增用户: 52, 活跃用户: 195 },
      { date: '2024-11-03', 新增用户: 38, 活跃用户: 168 },
      { date: '2024-11-04', 新增用户: 61, 活跃用户: 220 },
      { date: '2024-11-05', 新增用户: 49, 活跃用户: 185 },
      { date: '2024-11-06', 新增用户: 55, 活跃用户: 210 },
      { date: '2024-11-07', 新增用户: 43, 活跃用户: 175 },
    ],
    revenueTrends: [
      { date: '2024-11-01', 收入: 4500, 订单数: 23 },
      { date: '2024-11-02', 收入: 5200, 订单数: 28 },
      { date: '2024-11-03', 收入: 3800, 订单数: 19 },
      { date: '2024-11-04', 收入: 6100, 订单数: 31 },
      { date: '2024-11-05', 收入: 4900, 订单数: 25 },
      { date: '2024-11-06', 收入: 5500, 订单数: 29 },
      { date: '2024-11-07', 收入: 4300, 订单数: 22 },
    ],
    planDistribution: [
      { type: '月度套餐', value: 35, percentage: 35 },
      { type: '季度套餐', value: 45, percentage: 45 },
      { type: '年度套餐', value: 20, percentage: 20 },
    ],
    paymentMethods: [
      { type: '支付宝', value: 65, percentage: 65 },
      { type: '微信支付', value: 35, percentage: 35 },
    ],
    topUsers: [
      { id: 1, username: 'zhangsan', totalSpent: 2999, orders: 5, lastOrder: '2024-12-01' },
      { id: 2, username: 'lisi', totalSpent: 1899, orders: 3, lastOrder: '2024-11-28' },
      { id: 3, username: 'wangwu', totalSpent: 1599, orders: 4, lastOrder: '2024-11-25' },
      { id: 4, username: 'zhaoliu', totalSpent: 1299, orders: 2, lastOrder: '2024-11-22' },
      { id: 5, username: 'qianqi', totalSpent: 999, orders: 1, lastOrder: '2024-11-20' },
    ],
  });

  // 获取分析数据
  const fetchAnalyticsData = async () => {
    if (!canRead) return;
    
    setLoading(true);
    try {
      // const response = await analyticsApi.getAnalyticsData({
      //   dateRange: [dateRange[0].format('YYYY-MM-DD'), dateRange[1].format('YYYY-MM-DD')],
      //   metric: selectedMetric,
      // });
      // setAnalyticsData(response);
      
      // 模拟延迟
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
      console.error('获取分析数据失败:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalyticsData();
  }, [dateRange, selectedMetric]);

  // 导出数据
  const handleExport = async (format: string) => {
    try {
      // await analyticsApi.exportAnalytics(format, {
      //   dateRange: [dateRange[0].format('YYYY-MM-DD'), dateRange[1].format('YYYY-MM-DD')],
      //   metric: selectedMetric,
      // });
      console.log(`导出${format}格式数据`);
    } catch (error) {
      console.error('导出失败:', error);
    }
  };

  // 图表配置
  const userTrendsConfig = {
    data: analyticsData.userTrends,
    xField: 'date',
    yField: 'value',
    seriesField: 'type',
    smooth: true,
    animation: {
      appear: {
        animation: 'path-in',
        duration: 1000,
      },
    },
    color: ['#1890ff', '#52c41a'],
    point: {
      size: 3,
      shape: 'circle',
    },
    legend: {
      position: 'top',
    },
    tooltip: {
      shared: true,
      showCrosshairs: true,
    },
  };

  const revenueTrendsConfig = {
    data: analyticsData.revenueTrends,
    isGroup: true,
    xField: 'date',
    yField: 'value',
    seriesField: 'type',
    color: ['#1890ff', '#52c41a'],
    columnWidthRatio: 0.8,
    legend: {
      position: 'top',
    },
    tooltip: {
      shared: true,
    },
  };

  const planDistributionConfig = {
    data: analyticsData.planDistribution,
    angleField: 'value',
    colorField: 'type',
    radius: 0.8,
    label: {
      type: 'outer',
      content: '{name}: {percentage}%',
    },
    legend: {
      position: 'bottom',
    },
    color: ['#1890ff', '#52c41a', '#faad14'],
    interactions: [{ type: 'element-active' }],
  };

  const paymentMethodsConfig = {
    data: analyticsData.paymentMethods,
    angleField: 'value',
    colorField: 'type',
    radius: 0.8,
    label: {
      type: 'outer',
      content: '{name}: {percentage}%',
    },
    legend: {
      position: 'bottom',
    },
    color: ['#1890ff', '#52c41a'],
    interactions: [{ type: 'element-active' }],
  };

  // 高价值用户表格列
  const topUsersColumns = [
    {
      title: '排名',
      key: 'rank',
      width: 60,
      render: (_: any, __: any, index: number) => (
        <div className="text-center font-bold">
          {index + 1}
        </div>
      ),
    },
    {
      title: '用户名',
      dataIndex: 'username',
      key: 'username',
      render: (text: string) => (
        <Text className="font-medium">{text}</Text>
      ),
    },
    {
      title: '总消费',
      dataIndex: 'totalSpent',
      key: 'totalSpent',
      render: (amount: number) => (
        <Text className="font-medium text-green-600">
          {formatMoney(amount)}
        </Text>
      ),
    },
    {
      title: '订单数',
      dataIndex: 'orders',
      key: 'orders',
      render: (count: number) => (
        <Tag color="blue">{count}笔</Tag>
      ),
    },
    {
      title: '最近订单',
      dataIndex: 'lastOrder',
      key: 'lastOrder',
      render: (date: string) => (
        <Text type="secondary">
          {dayjs(date).format('MM-DD')}
        </Text>
      ),
    },
  ];

  // 获取增长率图标和颜色
  const getGrowthDisplay = (growth: number) => {
    const isPositive = growth >= 0;
    return {
      icon: isPositive ? <TrendingUpOutlined /> : <TrendingDownOutlined />,
      color: isPositive ? '#52c41a' : '#ff4d4f',
      text: `${isPositive ? '+' : ''}${growth.toFixed(1)}%`,
    };
  };

  return (
    <div className="space-y-6">
      {/* 页面标题和控制 */}
      <div className="flex items-center justify-between">
        <div>
          <Title level={2} className="!mb-2">
            数据分析
          </Title>
          <Text type="secondary">
            查看业务数据趋势和用户行为分析
          </Text>
        </div>
        <Space>
          <RangePicker
            value={dateRange}
            onChange={(dates) => {
              if (dates) {
                setDateRange(dates as [dayjs.Dayjs, dayjs.Dayjs]);
              }
            }}
            format="YYYY-MM-DD"
          />
          <Select
            value={selectedMetric}
            onChange={setSelectedMetric}
            style={{ width: 120 }}
          >
            <Option value="revenue">收入分析</Option>
            <Option value="users">用户分析</Option>
            <Option value="orders">订单分析</Option>
          </Select>
          <Button
            icon={<ReloadOutlined />}
            onClick={fetchAnalyticsData}
            loading={loading}
          >
            刷新
          </Button>
          <Button
            icon={<DownloadOutlined />}
            onClick={() => handleExport('excel')}
          >
            导出
          </Button>
        </Space>
      </div>

      {/* 概览统计 */}
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={6}>
          <Card className="card-shadow">
            <Statistic
              title="总收入"
              value={analyticsData.overview.totalRevenue}
              formatter={(value) => formatMoney(Number(value))}
              suffix={
                <div className="flex items-center text-xs ml-2">
                  {(() => {
                    const growth = getGrowthDisplay(analyticsData.overview.revenueGrowth);
                    return (
                      <span style={{ color: growth.color }}>
                        {growth.icon} {growth.text}
                      </span>
                    );
                  })()}
                </div>
              }
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        
        <Col xs={24} sm={6}>
          <Card className="card-shadow">
            <Statistic
              title="总用户数"
              value={analyticsData.overview.totalUsers}
              formatter={(value) => formatNumber(Number(value))}
              suffix={
                <div className="flex items-center text-xs ml-2">
                  {(() => {
                    const growth = getGrowthDisplay(analyticsData.overview.userGrowth);
                    return (
                      <span style={{ color: growth.color }}>
                        {growth.icon} {growth.text}
                      </span>
                    );
                  })()}
                </div>
              }
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        
        <Col xs={24} sm={6}>
          <Card className="card-shadow">
            <Statistic
              title="总订单数"
              value={analyticsData.overview.totalOrders}
              formatter={(value) => formatNumber(Number(value))}
              suffix={
                <div className="flex items-center text-xs ml-2">
                  {(() => {
                    const growth = getGrowthDisplay(analyticsData.overview.orderGrowth);
                    return (
                      <span style={{ color: growth.color }}>
                        {growth.icon} {growth.text}
                      </span>
                    );
                  })()}
                </div>
              }
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
        
        <Col xs={24} sm={6}>
          <Card className="card-shadow">
            <Statistic
              title="转化率"
              value={analyticsData.overview.conversionRate}
              suffix="%"
              precision={1}
              suffix={
                <div className="flex items-center text-xs ml-2">
                  %
                  {(() => {
                    const growth = getGrowthDisplay(analyticsData.overview.conversionGrowth);
                    return (
                      <span style={{ color: growth.color }} className="ml-1">
                        {growth.icon} {growth.text}
                      </span>
                    );
                  })()}
                </div>
              }
              valueStyle={{ color: '#722ed1' }}
            />
            <Progress
              percent={analyticsData.overview.conversionRate}
              size="small"
              showInfo={false}
              strokeColor="#722ed1"
              className="mt-2"
            />
          </Card>
        </Col>
      </Row>

      {/* 趋势图表 */}
      <Row gutter={[16, 16]}>
        <Col xs={24} lg={12}>
          <Card 
            title={
              <Space>
                <LineChartOutlined />
                用户趋势
              </Space>
            }
            className="card-shadow"
          >
            <Line {...userTrendsConfig} height={300} />
          </Card>
        </Col>
        
        <Col xs={24} lg={12}>
          <Card 
            title={
              <Space>
                <BarChartOutlined />
                收入趋势
              </Space>
            }
            className="card-shadow"
          >
            <Column {...revenueTrendsConfig} height={300} />
          </Card>
        </Col>
      </Row>

      {/* 分布图表 */}
      <Row gutter={[16, 16]}>
        <Col xs={24} lg={8}>
          <Card 
            title={
              <Space>
                <PieChartOutlined />
                套餐分布
              </Space>
            }
            className="card-shadow"
          >
            <Pie {...planDistributionConfig} height={250} />
          </Card>
        </Col>
        
        <Col xs={24} lg={8}>
          <Card 
            title={
              <Space>
                <PieChartOutlined />
                支付方式分布
              </Space>
            }
            className="card-shadow"
          >
            <Pie {...paymentMethodsConfig} height={250} />
          </Card>
        </Col>
        
        <Col xs={24} lg={8}>
          <Card 
            title="高价值用户 TOP5"
            className="card-shadow"
          >
            <Table
              columns={topUsersColumns}
              dataSource={analyticsData.topUsers}
              rowKey="id"
              pagination={false}
              size="small"
              className="mt-2"
            />
          </Card>
        </Col>
      </Row>

      {/* 详细指标 */}
      <Card title="详细指标" className="card-shadow">
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={8}>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-500">
                {formatMoney(analyticsData.overview.totalRevenue / analyticsData.overview.totalUsers)}
              </div>
              <div className="text-gray-500 text-sm">ARPU (每用户平均收入)</div>
            </div>
          </Col>
          
          <Col xs={24} sm={8}>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-500">
                {formatMoney(analyticsData.overview.totalRevenue / analyticsData.overview.totalOrders)}
              </div>
              <div className="text-gray-500 text-sm">AOV (平均订单价值)</div>
            </div>
          </Col>
          
          <Col xs={24} sm={8}>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-500">
                {(analyticsData.overview.totalOrders / analyticsData.overview.totalUsers).toFixed(2)}
              </div>
              <div className="text-gray-500 text-sm">每用户平均订单数</div>
            </div>
          </Col>
        </Row>
      </Card>
    </div>
  );
}