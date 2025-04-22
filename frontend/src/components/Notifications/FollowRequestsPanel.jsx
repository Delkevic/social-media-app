import React, { useState, useEffect } from 'react';
import { List, Avatar, Button, Empty, message, Spin, Card, Typography } from 'antd';
import { UserAddOutlined, CloseOutlined, CheckOutlined } from '@ant-design/icons';
import axios from 'axios';
import { API_URL } from '../../config/constants';
import { Link } from 'react-router-dom';

const { Title, Text } = Typography;

const FollowRequestsPanel = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  // Takip isteklerini getir
  const fetchFollowRequests = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/follow-requests/pending`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      setRequests(response.data.requests || []);
    } catch (error) {
      console.error('Takip istekleri alınırken hata:', error);
      message.error('Takip istekleri alınırken bir sorun oluştu.');
    } finally {
      setLoading(false);
    }
  };

  // Sayfa yüklendiğinde istekleri getir
  useEffect(() => {
    fetchFollowRequests();
  }, []);

  // Takip isteğini kabul et
  const handleAccept = async (requestId) => {
    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `${API_URL}/follow-requests/${requestId}/accept`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      // Kabul edilen isteği listeden çıkar
      setRequests(requests.filter(request => request.id !== requestId));
      message.success('Takip isteği kabul edildi.');
    } catch (error) {
      console.error('Takip isteği kabul edilirken hata:', error);
      message.error('Takip isteği kabul edilirken bir sorun oluştu.');
    }
  };

  // Takip isteğini reddet
  const handleReject = async (requestId) => {
    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `${API_URL}/follow-requests/${requestId}/reject`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      // Reddedilen isteği listeden çıkar
      setRequests(requests.filter(request => request.id !== requestId));
      message.success('Takip isteği reddedildi.');
    } catch (error) {
      console.error('Takip isteği reddedilirken hata:', error);
      message.error('Takip isteği reddedilirken bir sorun oluştu.');
    }
  };

  // Tarih formatını düzenle
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString('tr-TR');
  };

  if (loading) {
    return (
      <div className="follow-requests-loading">
        <Spin size="large" />
        <p>Takip istekleri yükleniyor...</p>
      </div>
    );
  }

  return (
    <Card className="follow-requests-panel">
      <Title level={4} className="requests-title">
        <UserAddOutlined /> Takip İstekleri
      </Title>

      {requests.length === 0 ? (
        <Empty 
          description="Bekleyen takip isteği yok" 
          image={Empty.PRESENTED_IMAGE_SIMPLE} 
        />
      ) : (
        <List
          itemLayout="horizontal"
          dataSource={requests}
          renderItem={request => (
            <List.Item
              actions={[
                <Button
                  type="primary"
                  icon={<CheckOutlined />}
                  size="small"
                  onClick={() => handleAccept(request.id)}
                >
                  Kabul Et
                </Button>,
                <Button
                  danger
                  icon={<CloseOutlined />}
                  size="small"
                  onClick={() => handleReject(request.id)}
                >
                  Reddet
                </Button>,
              ]}
            >
              <List.Item.Meta
                avatar={
                  <Link to={`/profile/${request.follower.username}`}>
                    <Avatar src={request.follower.profileImage || 'https://via.placeholder.com/40'} size={40} />
                  </Link>
                }
                title={
                  <Link to={`/profile/${request.follower.username}`}>
                    {request.follower.fullName} <Text type="secondary">@{request.follower.username}</Text>
                  </Link>
                }
                description={`İstek tarihi: ${formatDate(request.createdAt)}`}
              />
            </List.Item>
          )}
        />
      )}

      {requests.length > 0 && (
        <div className="follow-requests-info">
          <Text type="secondary">
            Toplam {requests.length} takip isteği mevcut.
          </Text>
        </div>
      )}
    </Card>
  );
};

export default FollowRequestsPanel; 