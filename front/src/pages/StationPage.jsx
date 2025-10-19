import React, { useEffect } from 'react';
import Layout from '../components/Layout';
import { useParams, useNavigate } from 'react-router-dom';
import { useAppState, useAppDispatch } from '../context/AppContext';
import StationChart from '../components/StationChart';
import CallyRangePicker from '../components/CallyRangePicker';

const StationPage = () => {
  const { label } = useParams();
  const { stations, selectedStation, isLoading } = useAppState();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  // Effect to ensure selectedStation state is correct upon page load/refresh
  useEffect(() => {
    if (isLoading) return;

    if (!selectedStation || selectedStation.label!== label) {
      const station = stations.find(s => s.label === label);
      if (station) {
        dispatch({ type: 'SELECT_STATION', payload: station });
      } else {
        // If station doesn't exist, redirect to the main page
        navigate('/');
      }
    }
  },);

  if (isLoading ||!selectedStation || selectedStation.label!== label) {
    return (
        <Layout>
            <div className="flex justify-center items-center h-96">
                <span className="loading loading-spinner loading-lg"></span>
            </div>
        </Layout>
    );
  }

  return (
    <Layout>
      <div className="flex flex-col gap-6">
        {/* Header and Subheader driven by global state [Image 2] */}
        <h1 className="text-3xl font-bold">
          Header: {selectedStation.label}
        </h1>
        <h2 className="text-xl text-gray-600">
          Subheader: Latest Read ({selectedStation.date_time.toString() || 'N/A'})
        </h2>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Panel: Line Chart */}
          <div className="lg:col-span-2">
            {/* <StationChart /> */}
            Station Chart
          </div>

          {/* Right Panel: Calendar */}
          <div className="lg:col-span-1">
            <CallyRangePicker />
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default StationPage;