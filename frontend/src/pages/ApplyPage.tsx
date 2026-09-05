import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ApplicationFormModal } from '../components/ApplicationFormModal';

export const ApplyPage: React.FC = () => {
  const navigate = useNavigate();

  const handleTabChange = (tabId: string) => {
    const clean = tabId.replace('#', '');
    if (!clean || clean === 'home') {
      navigate('/');
    } else if (clean === 'customer') {
      navigate('/customer');
    } else {
      navigate(`/${clean}`);
    }
  };

  return (
    <div className="apply-page">
      <div className="container">
        <ApplicationFormModal onTabChange={handleTabChange} />
      </div>
    </div>
  );
};

export default ApplyPage;
