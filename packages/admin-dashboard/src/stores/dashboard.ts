import { create } from 'zustand';
import { DashboardStats, TrendData, ChartData } from '@/types';
import { dashboardApi, analyticsApi } from '@/lib/api';
import dayjs from 'dayjs';

interface DashboardState {
  // 状态数据
  stats: DashboardStats | null;
  trends: TrendData | null;
  realtime: any | null;
  isLoading: boolean;
  error: string | null;
  lastUpdated: string | null;

  // 图表数据
  userGrowthChart: ChartData | null;
  revenueChart: ChartData | null;
  subscriptionChart: ChartData | null;
  planDistributionChart: ChartData | null;

  // 操作方法
  fetchStats: () => Promise<void>;
  fetchTrends: (dateRange?: [string, string]) => Promise<void>;
  fetchRealtime: () => Promise<void>;
  fetchChartData: (type: string, params?: any) => Promise<void>;
  refreshAll: () => Promise<void>;
  
  // 内部方法
  setStats: (stats: DashboardStats) => void;
  setTrends: (trends: TrendData) => void;
  setRealtime: (realtime: any) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setChartData: (type: string, data: ChartData) => void;
}

export const useDashboardStore = create<DashboardState>((set, get) => ({
  // 初始状态
  stats: null,
  trends: null,
  realtime: null,
  isLoading: false,
  error: null,
  lastUpdated: null,
  userGrowthChart: null,
  revenueChart: null,
  subscriptionChart: null,
  planDistributionChart: null,

  // 获取概览统计
  fetchStats: async () => {
    set({ isLoading: true, error: null });
    try {
      const stats = await dashboardApi.getStats();
      set({ 
        stats, 
        isLoading: false, 
        lastUpdated: dayjs().format('YYYY-MM-DD HH:mm:ss') 
      });
    } catch (error: any) {
      set({ 
        error: error.message || '获取统计数据失败', 
        isLoading: false 
      });
    }
  },

  // 获取趋势数据
  fetchTrends: async (dateRange) => {
    set({ isLoading: true, error: null });
    try {
      const trends = await dashboardApi.getTrends({ dateRange });
      set({ trends, isLoading: false });
      
      // 处理图表数据
      get().processChartData(trends);
    } catch (error: any) {
      set({ 
        error: error.message || '获取趋势数据失败', 
        isLoading: false 
      });
    }
  },

  // 获取实时数据
  fetchRealtime: async () => {
    try {
      const realtime = await dashboardApi.getRealtime();
      set({ realtime });
    } catch (error: any) {
      console.error('获取实时数据失败:', error);
    }
  },

  // 获取图表数据
  fetchChartData: async (type, params = {}) => {
    try {
      let data;
      switch (type) {
        case 'users':
          data = await analyticsApi.getUserAnalytics(params);
          get().setChartData('userGrowthChart', data);
          break;
        case 'revenue':
          data = await analyticsApi.getRevenueAnalytics(params);
          get().setChartData('revenueChart', data);
          break;
        case 'subscriptions':
          data = await analyticsApi.getSubscriptionAnalytics(params);
          get().setChartData('subscriptionChart', data);
          break;
      }
    } catch (error: any) {
      console.error(`获取${type}图表数据失败:`, error);
    }
  },

  // 刷新所有数据
  refreshAll: async () => {
    const { fetchStats, fetchTrends, fetchRealtime } = get();
    await Promise.all([
      fetchStats(),
      fetchTrends(),
      fetchRealtime(),
    ]);
  },

  // 内部方法
  setStats: (stats) => set({ stats }),
  setTrends: (trends) => set({ trends }),
  setRealtime: (realtime) => set({ realtime }),
  setLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error }),
  setChartData: (type, data) => set({ [type]: data }),

  // 处理图表数据
  processChartData: (trends: TrendData) => {
    // 用户增长图表
    const userGrowthData = trends.userRegistrations.map(item => ({
      date: item.date,
      新增用户: item.count,
      累计用户: trends.userRegistrations
        .filter(u => u.date <= item.date)
        .reduce((sum, u) => sum + u.count, 0),
    }));

    const userGrowthChart: ChartData = {
      data: userGrowthData,
      config: {
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
        legend: {
          position: 'top',
        },
        tooltip: {
          shared: true,
          showCrosshairs: true,
        },
      },
    };

    // 收入分析图表
    const revenueData = trends.revenue.map(item => ({
      date: item.date,
      收入: item.amount,
      订单数: item.orders,
    }));

    const revenueChart: ChartData = {
      data: revenueData,
      config: {
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
      },
    };

    // 订阅趋势图表
    const subscriptionData = trends.subscriptions.map(item => ({
      date: item.date,
      新增: item.new,
      续费: item.renewed,
      取消: item.cancelled,
    }));

    const subscriptionChart: ChartData = {
      data: subscriptionData,
      config: {
        xField: 'date',
        yField: 'value',
        seriesField: 'type',
        smooth: true,
        color: ['#52c41a', '#1890ff', '#ff4d4f'],
        legend: {
          position: 'top',
        },
        tooltip: {
          shared: true,
          showCrosshairs: true,
        },
      },
    };

    set({
      userGrowthChart,
      revenueChart,
      subscriptionChart,
    });
  },
} as DashboardState));

// Dashboard相关工具函数
export const dashboardUtils = {
  // 格式化数字显示
  formatNumber: (num: number): string => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  },

  // 格式化金额显示
  formatMoney: (amount: number): string => {
    return new Intl.NumberFormat('zh-CN', {
      style: 'currency',
      currency: 'CNY',
      minimumFractionDigits: 2,
    }).format(amount);
  },

  // 计算增长率
  calculateGrowthRate: (current: number, previous: number): number => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous) * 100;
  },

  // 格式化增长率显示
  formatGrowthRate: (rate: number): string => {
    const sign = rate >= 0 ? '+' : '';
    return `${sign}${rate.toFixed(1)}%`;
  },

  // 获取增长率颜色
  getGrowthRateColor: (rate: number): string => {
    if (rate > 0) return '#52c41a';
    if (rate < 0) return '#ff4d4f';
    return '#666666';
  },

  // 生成默认日期范围
  getDefaultDateRange: (days: number = 30): [string, string] => {
    const end = dayjs();
    const start = end.subtract(days, 'day');
    return [start.format('YYYY-MM-DD'), end.format('YYYY-MM-DD')];
  },

  // 生成图表配置
  generateChartConfig: (type: string, data: any[]) => {
    const baseConfig = {
      data,
      height: 300,
      autoFit: true,
      padding: 'auto',
    };

    switch (type) {
      case 'line':
        return {
          ...baseConfig,
          xField: 'date',
          yField: 'value',
          seriesField: 'category',
          smooth: true,
          point: {
            size: 3,
            shape: 'circle',
          },
        };
      
      case 'column':
        return {
          ...baseConfig,
          xField: 'date',
          yField: 'value',
          seriesField: 'category',
          isGroup: true,
          columnWidthRatio: 0.8,
        };
      
      case 'pie':
        return {
          ...baseConfig,
          angleField: 'value',
          colorField: 'category',
          radius: 0.8,
          label: {
            type: 'outer',
            content: '{name}: {percentage}%',
          },
          legend: {
            position: 'bottom',
          },
        };
      
      default:
        return baseConfig;
    }
  },

  // 获取状态标签配置
  getStatusConfig: (status: string) => {
    const configs: Record<string, { color: string; text: string }> = {
      active: { color: 'green', text: '正常' },
      inactive: { color: 'red', text: '禁用' },
      pending: { color: 'orange', text: '待处理' },
      expired: { color: 'gray', text: '已过期' },
      cancelled: { color: 'red', text: '已取消' },
    };
    return configs[status] || { color: 'default', text: status };
  },
};
