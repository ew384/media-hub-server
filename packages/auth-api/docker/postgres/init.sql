-- 创建扩展
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 设置时区
SET timezone = 'Asia/Shanghai';

-- 创建数据库用户权限
GRANT ALL PRIVILEGES ON DATABASE auth_db TO auth_user;