import { create } from 'zustand';
import { orderApi } from '@/lib/api';
import { OrderInfo, OrderTimeline, PaginatedResponse, TableFilterParams } from '@/types';
import { PAGINATION_CONFIG, ORDER_STATUS, PAYMENT_STATUS } from '@/lib/constants';
import { message } from 'antd';
import dayjs from 'dayjs';

interface OrderFilters {
  search: string;
  status: 'all' | 'pending' | 'paid' | 'cancelled' | 'refunded' | 'expired';
  paymentMethod: 'all' | 'alipay' | 'wechat';
  dateRange?: [string, string];
  amountRange?: [number | null, number | null];
}

interface OrderStats {
  total: number;
  pending: number;
  paid: number;
  cancelled: number;
  refunded: number;
  todayOrders: number;
  todayRevenue: number;
  successRate: number;
  avgAmount: number;
}

interface OrderState {
  // 状态数据
  orders: OrderInfo[];
  selectedOrder: OrderInfo | null;
  orderTimeline: OrderTimeline[];
  loading: boolean;
  error: string | null;
  
  // 统计数据
  stats: OrderStats | null;
  
  // 分页数据
  pagination: {
    current: number;
    pageSize: number;
    total: number;
  };
  
  // 筛选条件
  filters: OrderFilters;
  
  // 操作方法
  fetchOrders: () => Promise<void>;
  fetchOrderDetail: (orderNo: string) => Promise<OrderInfo | null>;
  fetchOrderTimeline: (orderNo: string) => Promise<void>;
  fetchOrderStats: () => Promise<void>;
  confirmOrder: (orderNo: string) => Promise<void>;
  cancelOrder: (orderNo: string, reason?: string) => Promise<void>;
  refundOrder: (orderNo: string, amount: number, reason: string) => Promise<void>;
  addOrderNote: (orderNo: string, note: string) => Promise<void>;
  exportOrders: (format: string) => Promise<void>;
  
  // 分页控制
  setPagination: (pagination: Partial<typeof OrderState.prototype.pagination>) => void;
  setFilters: (filters: Partial<OrderFilters>) => void;
  resetFilters: () => void;
  
  // 内部方法
  setOrders: (orders: OrderInfo[]) => void;
  setSelectedOrder: (order: OrderInfo | null) => void;
  setOrderTimeline: (timeline: OrderTimeline[]) => void;
  setStats: (stats: OrderStats) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

export const useOrderStore = create<OrderState>((set, get) => ({
  // 初始状态
  orders: [],
  selectedOrder: null,
  orderTimeline: [],
  loading: false,
  error: null,
  stats: null,
  
  pagination: {
    current: PAGINATION_CONFIG.DEFAULT_PAGE,
    pageSize: PAGINATION_CONFIG.DEFAULT_PAGE_SIZE,
    total: 0,
  },
  
  filters: {
    search: '',
    status: 'all',
    paymentMethod: 'all',
    dateRange: undefined,
    amountRange: [null, null],
  },

  // 获取订单列表
  fetchOrders: async () => {
    const { pagination, filters } = get();
    set({ loading: true, error: null });
    
    try {
      const params: TableFilterParams = {
        current: pagination.current,
        pageSize: pagination.pageSize,
        ...filters,
      };
      
      const response: PaginatedResponse<OrderInfo> = await orderApi.getOrders(params);
      
      set({
        orders: response.data,
        pagination: {
          ...pagination,
          total: response.pagination.total,
        },
        loading: false,
      });
    } catch (error: any) {
      set({
        error: error.message || '获取订单列表失败',
        loading: false,
      });
      message.error(error.message || '获取订单列表失败');
    }
  },

  // 获取订单详情
  fetchOrderDetail: async (orderNo: string) => {
    try {
      const order = await orderApi.getOrderDetail(orderNo);
      set({ selectedOrder: order });
      return order;
    } catch (error: any) {
      message.error(error.message || '获取订单详情失败');
      return null;
    }
  },

  // 获取订单时间线
  fetchOrderTimeline: async (orderNo: string) => {
    try {
      const timeline = await orderApi.getTimeline(orderNo);
      set({ orderTimeline: timeline });
    } catch (error: any) {
      message.error(error.message || '获取订单时间线失败');
    }
  },

  // 获取订单统计
  fetchOrderStats: async () => {
    try {
      const stats = await orderApi.getOrderStats();
      set({ stats });
    } catch (error: any) {
      console.error('获取订单统计失败:', error);
    }
  },

  // 确认订单
  confirmOrder: async (orderNo: string) => {
    try {
      await orderApi.confirmOrder(orderNo);
      message.success('订单确认成功');
      get().fetchOrders(); // 刷新列表
      
      // 如果是当前选中订单，刷新详情
      const { selectedOrder } = get();
      if (selectedOrder && selectedOrder.order_no === orderNo) {
        get().fetchOrderDetail(orderNo);
        get().fetchOrderTimeline(orderNo);
      }
    } catch (error: any) {
      message.error(error.message || '订单确认失败');
      throw error;
    }
  },

  // 取消订单
  cancelOrder: async (orderNo: string, reason?: string) => {
    try {
      await orderApi.cancelOrder(orderNo, reason);
      message.success('订单取消成功');
      get().fetchOrders(); // 刷新列表
      
      // 如果是当前选中订单，刷新详情
      const { selectedOrder } = get();
      if (selectedOrder && selectedOrder.order_no === orderNo) {
        get().fetchOrderDetail(orderNo);
        get().fetchOrderTimeline(orderNo);
      }
    } catch (error: any) {
      message.error(error.message || '订单取消失败');
      throw error;
    }
  },

  // 申请退款
  refundOrder: async (orderNo: string, amount: number, reason: string) => {
    try {
      await orderApi.refundOrder(orderNo, { amount, reason });
      message.success('退款申请提交成功');
      get().fetchOrders(); // 刷新列表
      
      // 如果是当前选中订单，刷新详情
      const { selectedOrder } = get();
      if (selectedOrder && selectedOrder.order_no === orderNo) {
        get().fetchOrderDetail(orderNo);
        get().fetchOrderTimeline(orderNo);
      }
    } catch (error: any) {
      message.error(error.message || '退款申请失败');
      throw error;
    }
  },

  // 添加订单备注
  addOrderNote: async (orderNo: string, note: string) => {
    try {
      await orderApi.addNote(orderNo, note);
      message.success('备注添加成功');
      get().fetchOrderTimeline(orderNo); // 刷新时间线
    } catch (error: any) {
      message.error(error.message || '备注添加失败');
      throw error;
    }
  },

  // 导出订单数据
  exportOrders: async (format: string) => {
    try {
      const { filters } = get();
      await orderApi.exportOrders(format, filters);
      message.success('数据导出成功');
    } catch (error: any) {
      message.error(error.message || '数据导出失败');
      throw error;
    }
  },

  // 设置分页
  setPagination: (newPagination) => {
    set(state => ({
      pagination: { ...state.pagination, ...newPagination }
    }));
  },

  // 设置筛选条件
  setFilters: (newFilters) => {
    set(state => ({
      filters: { ...state.filters, ...newFilters },
      pagination: { ...state.pagination, current: 1 }, // 重置到第一页
    }));
  },

  // 重置筛选条件
  resetFilters: () => {
    set({
      filters: {
        search: '',
        status: 'all',
        paymentMethod: 'all',
        dateRange: undefined,
        amountRange: [null, null],
      },
      pagination: {
        current: PAGINATION_CONFIG.DEFAULT_PAGE,
        pageSize: PAGINATION_CONFIG.DEFAULT_PAGE_SIZE,
        total: 0,
      },
    });
  },

  // 内部方法
  setOrders: (orders) => set({ orders }),
  setSelectedOrder: (order) => set({ selectedOrder: order }),
  setOrderTimeline: (timeline) => set({ orderTimeline: timeline }),
  setStats: (stats) => set({ stats }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
}));

// 订单管理相关工具函数
export const orderUtils = {
  // 获取订单状态配置
  getStatusConfig: (status: string) => {
    const configs: Record<string, { color: string; text: string }> = {
      [ORDER_STATUS.PENDING]: { color: 'orange', text: '待支付' },
      [ORDER_STATUS.PAID]: { color: 'green', text: '已支付' },
      [ORDER_STATUS.CANCELLED]: { color: 'red', text: '已取消' },
      [ORDER_STATUS.REFUNDED]: { color: 'purple', text: '已退款' },
      [ORDER_STATUS.EXPIRED]: { color: 'gray', text: '已过期' },
    };
    return configs[status] || { color: 'default', text: status };
  },

  // 获取支付状态配置
  getPaymentStatusConfig: (status: string) => {
    const configs: Record<string, { color: string; text: string }> = {
      [PAYMENT_STATUS.PENDING]: { color: 'orange', text: '待支付' },
      [PAYMENT_STATUS.SUCCESS]: { color: 'green', text: '支付成功' },
      [PAYMENT_STATUS.FAILED]: { color: 'red', text: '支付失败' },
    };
    return configs[status] || { color: 'default', text: status };
  },

  // 获取套餐类型显示
  getPlanTypeDisplay: (planType: string) => {
    const types: Record<string, string> = {
      monthly: '月度套餐',
      quarterly: '季度套餐',
      yearly: '年度套餐',
    };
    return types[planType] || planType;
  },

  // 获取支付方式显示
  getPaymentMethodDisplay: (method: string) => {
    const methods: Record<string, string> = {
      alipay: '支付宝',
      wechat: '微信支付',
    };
    return methods[method] || method;
  },

  // 计算订单状态进度
  getOrderProgress: (order: OrderInfo) => {
    const steps = [
      { title: '订单创建', status: 'finish' },
      { title: '等待支付', status: 'wait' },
      { title: '支付完成', status: 'wait' },
    ];

    switch (order.status) {
      case ORDER_STATUS.PENDING:
        steps[1].status = 'process';
        break;
      case ORDER_STATUS.PAID:
        steps[1].status = 'finish';
        steps[2].status = 'finish';
        break;
      case ORDER_STATUS.CANCELLED:
        steps[1].status = 'error';
        break;
      case ORDER_STATUS.EXPIRED:
        steps[1].status = 'error';
        break;
      case ORDER_STATUS.REFUNDED:
        steps[1].status = 'finish';
        steps[2].status = 'finish';
        steps.push({ title: '已退款', status: 'finish' });
        break;
    }

    return steps;
  },

  // 判断订单是否可以操作
  canPerformAction: (order: OrderInfo, action: string) => {
    switch (action) {
      case 'confirm':
        return order.status === ORDER_STATUS.PENDING;
      case 'cancel':
        return order.status === ORDER_STATUS.PENDING;
      case 'refund':
        return order.status === ORDER_STATUS.PAID;
      default:
        return false;
    }
  },

  // 计算订单剩余时间
  getOrderRemainingTime: (order: OrderInfo) => {
    if (order.status !== ORDER_STATUS.PENDING) return null;
    
    const now = dayjs();
    const expiredAt = dayjs(order.expired_at);
    const diffInMinutes = expiredAt.diff(now, 'minute');
    
    if (diffInMinutes <= 0) return '已过期';
    if (diffInMinutes < 60) return `${diffInMinutes}分钟`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}小时`;
    return `${Math.floor(diffInMinutes / 1440)}天`;
  },

  // 生成订单统计数据
  generateOrderStats: (orders: OrderInfo[]) => {
    const total = orders.length;
    const pending = orders.filter(o => o.status === ORDER_STATUS.PENDING).length;
    const paid = orders.filter(o => o.status === ORDER_STATUS.PAID).length;
    const cancelled = orders.filter(o => o.status === ORDER_STATUS.CANCELLED).length;
    const refunded = orders.filter(o => o.status === ORDER_STATUS.REFUNDED).length;
    
    const today = dayjs().format('YYYY-MM-DD');
    const todayOrders = orders.filter(o => 
      dayjs(o.created_at).format('YYYY-MM-DD') === today
    ).length;
    
    const todayRevenue = orders
      .filter(o => 
        dayjs(o.created_at).format('YYYY-MM-DD') === today && 
        o.status === ORDER_STATUS.PAID
      )
      .reduce((sum, o) => sum + o.amount, 0);
    
    const completedOrders = orders.filter(o => 
      o.status === ORDER_STATUS.PAID || o.status === ORDER_STATUS.CANCELLED
    ).length;
    const successRate = completedOrders > 0 ? (paid / completedOrders * 100) : 0;
    
    const totalAmount = orders
      .filter(o => o.status === ORDER_STATUS.PAID)
      .reduce((sum, o) => sum + o.amount, 0);
    const avgAmount = paid > 0 ? totalAmount / paid : 0;

    return {
      total,
      pending,
      paid,
      cancelled,
      refunded,
      todayOrders,
      todayRevenue,
      successRate: parseFloat(successRate.toFixed(1)),
      avgAmount: parseFloat(avgAmount.toFixed(2)),
    };
  },

  // 订单数据验证
  validateOrderData: (orderData: any) => {
    const errors: string[] = [];

    if (!orderData.user_id) {
      errors.push('请选择用户');
    }

    if (!orderData.plan_type) {
      errors.push('请选择套餐类型');
    }

    if (!orderData.amount || orderData.amount <= 0) {
      errors.push('订单金额必须大于0');
    }

    if (!orderData.payment_method) {
      errors.push('请选择支付方式');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  },

  // 格式化订单时间线
  formatOrderTimeline: (timeline: OrderTimeline[]) => {
    return timeline.map(item => ({
      ...item,
      displayTime: dayjs(item.created_at).format('YYYY-MM-DD HH:mm:ss'),
      relativeTime: dayjs(item.created_at).fromNow(),
    }));
  },

  // 计算退款金额建议
  getRefundAmountSuggestion: (order: OrderInfo) => {
    const paymentTime = dayjs(order.paid_at);
    const now = dayjs();
    const diffInDays = now.diff(paymentTime, 'day');

    // 根据支付后的天数给出退款建议
    if (diffInDays <= 7) {
      return {
        amount: order.amount,
        reason: '7天内全额退款',
      };
    } else if (diffInDays <= 30) {
      return {
        amount: order.amount * 0.8,
        reason: '30天内80%退款',
      };
    } else {
      return {
        amount: order.amount * 0.5,
        reason: '超过30天50%退款',
      };
    }
  },
};