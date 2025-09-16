import React from 'react';
import { Form, Input, Select, Switch, DatePicker, Row, Col, FormInstance } from 'antd';
import { UserOutlined, PhoneOutlined, MailOutlined } from '@ant-design/icons';

const { Option } = Select;
const { TextArea } = Input;

interface UserFormProps {
  form: FormInstance;
  initialValues?: any;
  isEdit?: boolean;
  onFinish?: (values: any) => void;
  loading?: boolean;
}

const UserForm: React.FC<UserFormProps> = ({
  form,
  initialValues,
  isEdit = false,
  onFinish,
  loading = false,
}) => {
  return (
    <Form
      form={form}
      layout="vertical"
      initialValues={initialValues}
      onFinish={onFinish}
      autoComplete="off"
    >
      <Row gutter={16}>
        <Col span={12}>
          <Form.Item
            name="username"
            label="用户名"
            rules={[
              { required: true, message: '请输入用户名' },
              { min: 3, max: 20, message: '用户名长度为3-20个字符' },
              { pattern: /^[a-zA-Z0-9_]+$/, message: '用户名只能包含字母、数字和下划线' },
            ]}
          >
            <Input 
              prefix={<UserOutlined />}
              placeholder="请输入用户名"
              disabled={isEdit}
            />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item
            name="nickname"
            label="昵称"
          >
            <Input placeholder="请输入昵称" />
          </Form.Item>
        </Col>
      </Row>

      <Row gutter={16}>
        <Col span={12}>
          <Form.Item
            name="phone"
            label="手机号"
            rules={[
              { required: true, message: '请输入手机号' },
              { pattern: /^1[3-9]\d{9}$/, message: '请输入正确的手机号' },
            ]}
          >
            <Input 
              prefix={<PhoneOutlined />}
              placeholder="请输入手机号"
            />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item
            name="email"
            label="邮箱"
            rules={[
              { required: true, message: '请输入邮箱' },
              { type: 'email', message: '请输入正确的邮箱格式' },
            ]}
          >
            <Input 
              prefix={<MailOutlined />}
              placeholder="请输入邮箱"
            />
          </Form.Item>
        </Col>
      </Row>

      <Row gutter={16}>
        <Col span={12}>
          <Form.Item
            name="gender"
            label="性别"
          >
            <Select placeholder="请选择性别">
              <Option value="male">男</Option>
              <Option value="female">女</Option>
              <Option value="unknown">保密</Option>
            </Select>
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item
            name="birthday"
            label="生日"
          >
            <DatePicker 
              style={{ width: '100%' }} 
              placeholder="请选择生日"
            />
          </Form.Item>
        </Col>
      </Row>

      <Form.Item
        name="region"
        label="地区"
      >
        <Input placeholder="请输入地区" />
      </Form.Item>

      <Form.Item
        name="bio"
        label="个人简介"
      >
        <TextArea 
          rows={3} 
          placeholder="请输入个人简介"
          maxLength={200}
          showCount
        />
      </Form.Item>

      {!isEdit && (
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              name="password"
              label="密码"
              rules={[
                { required: true, message: '请输入密码' },
                { min: 6, message: '密码至少6个字符' },
              ]}
            >
              <Input.Password placeholder="请输入密码" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              name="confirmPassword"
              label="确认密码"
              dependencies={['password']}
              rules={[
                { required: true, message: '请确认密码' },
                ({ getFieldValue }) => ({
                  validator(_, value) {
                    if (!value || getFieldValue('password') === value) {
                      return Promise.resolve();
                    }
                    return Promise.reject(new Error('两次输入的密码不一致'));
                  },
                }),
              ]}
            >
              <Input.Password placeholder="请确认密码" />
            </Form.Item>
          </Col>
        </Row>
      )}

      <Form.Item
        name="status"
        label="用户状态"
        valuePropName="checked"
        initialValue={true}
      >
        <Switch checkedChildren="启用" unCheckedChildren="禁用" />
      </Form.Item>
    </Form>
  );
};

export default UserForm;