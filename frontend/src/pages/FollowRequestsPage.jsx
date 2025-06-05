import React from 'react';
import { Typography, Card, Divider } from 'antd';
import { UserAddOutlined } from '@ant-design/icons';
import FollowRequestsPanel from '../components/Notifications/FollowRequestsPanel';

const { Title } = Typography;

const FollowRequestsPage = () => {
  return (
    <div className="follow-requests-page">
      <Card className="requests-container">
        <Title level={2}>
          <UserAddOutlined /> Takip İstekleri
        </Title>
        <Divider />
        <p className="requests-description">
          Size gönderilen takip isteklerini burada görüntüleyebilir, kabul edebilir veya reddedebilirsiniz.
        </p>
        <FollowRequestsPanel />
      </Card>
    </div>
  );
};

export default FollowRequestsPage; 